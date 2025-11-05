import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";

// Environment-based MCP URL configuration
const playwrightMCPUrl = process.env.PLAYWRIGHT_MCP_URL || 'http://localhost:8931/mcp';

/**
 * Creates a session-specific Playwright MCP client
 *
 * This function creates a NEW MCP client for each chat session (thread/resource).
 * According to Playwright MCP docs, HTTP transport mode creates a separate browser
 * context for each MCP client connection, ensuring session isolation.
 *
 * @param sessionId - Unique identifier for the chat session (e.g., "thread-abc-resource-123")
 * @returns MCPClient instance with session-specific browser context
 */
export function createSessionPlaywrightMCP(sessionId: string): MCPClient {
  console.log(`[MCP] Creating new Playwright MCP client for session: ${sessionId}`);

  return new MCPClient({
    // Use sessionId as unique ID to prevent memory leak warnings
    id: `playwright-${sessionId}`,
    servers: {
      playwright: {
        url: new URL(playwrightMCPUrl),
        // Each HTTP connection gets its own isolated browser context automatically
        // No need for special headers - isolation happens at connection level
      },
    },
  });
}

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
