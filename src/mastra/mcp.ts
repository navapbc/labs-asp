import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";

// Environment-based MCP URL configuration
const playwrightMCPUrl = process.env.PLAYWRIGHT_MCP_URL || 'http://localhost:8931/mcp';

interface CachedMCPClient {
  client: MCPClient;
  lastAccessedAt: number;
  cleanupTimer: ReturnType<typeof setTimeout>;
}

// MCP client cache: reuses clients per session to prevent orphaned browser contexts
const mcpClientCache = new Map<string, CachedMCPClient>();
const MCP_CLIENT_TTL_MS = 10 * 60 * 1000; // 10 min inactivity

/**
 * Gets or creates a session-specific Playwright MCP client.
 *
 * Caches clients per sessionId with a TTL-based eviction policy.
 * This prevents spawning duplicate browser contexts on rapid retries.
 *
 * @param sessionId - Unique identifier for the chat session (e.g., "thread-abc-resource-123")
 * @returns MCPClient instance with session-specific browser context
 */
export function getOrCreateSessionPlaywrightMCP(sessionId: string): MCPClient {
  const cached = mcpClientCache.get(sessionId);
  if (cached) {
    console.log(`[MCP] Reusing cached Playwright MCP client for session: ${sessionId}`);
    cached.lastAccessedAt = Date.now();
    // Reset the TTL timer
    clearTimeout(cached.cleanupTimer);
    cached.cleanupTimer = setTimeout(() => evictMCPClient(sessionId), MCP_CLIENT_TTL_MS);
    return cached.client;
  }

  console.log(`[MCP] Creating new Playwright MCP client for session: ${sessionId}`);

  const client = new MCPClient({
    id: `playwright-${sessionId}`,
    servers: {
      playwright: {
        url: new URL(playwrightMCPUrl),
      },
    },
  });

  const cleanupTimer = setTimeout(() => evictMCPClient(sessionId), MCP_CLIENT_TTL_MS);

  mcpClientCache.set(sessionId, {
    client,
    lastAccessedAt: Date.now(),
    cleanupTimer,
  });

  return client;
}

/**
 * Evicts a cached MCP client, disconnecting it and freeing resources.
 */
export function evictMCPClient(sessionId: string): void {
  const cached = mcpClientCache.get(sessionId);
  if (!cached) return;

  console.log(`[MCP] Evicting cached Playwright MCP client for session: ${sessionId}`);
  clearTimeout(cached.cleanupTimer);
  mcpClientCache.delete(sessionId);

  try {
    cached.client.disconnect();
  } catch (err) {
    console.error(`[MCP] Error disconnecting client for session ${sessionId}:`, err);
  }
}

// Disconnect all cached clients on shutdown
process.on('SIGTERM', () => {
  console.log('[MCP] SIGTERM: disconnecting all cached MCP clients');
  for (const [sessionId] of mcpClientCache) {
    evictMCPClient(sessionId);
  }
});

// Keep Exa MCP as global singleton (doesn't need session isolation)
export const exaMCP = new MCPClient({
  servers: {
    exa: {
      command: "npx",
      args: ["-y", "exa-mcp-server"],
      env: {
        EXA_API_KEY: process.env.EXA_API_KEY!
      },
    },
  },
});
