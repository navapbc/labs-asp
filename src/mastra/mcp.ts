import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";
import { startArtifactWatcher } from './artifact-watcher';
import path from 'path';

// ---------- Denylist Policy ----------
const DEFAULT_DENY = [
  "playwright_browser_evaluate",
  "playwright_browser_network_requests",
  "playwright_browser_take_screenshot",
  "playwright_browser_snapshot",
];

const deniedTools = new Set(
  (process.env.MCP_TOOL_DENYLIST ?? DEFAULT_DENY.join(","))
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

// Wrap execute() so even if something slips through, it fails closed.
function guardTool<T extends { name: string; execute: Function }>(tool: T): T {
  return {
    ...tool,
    async execute(input: unknown) {
      if (deniedTools.has(tool.name)) {
        throw new Error(`Tool "${tool.name}" is denied by policy`);
      }
      return tool.execute(input);
    },
  } as T;
}

// ---------- Artifact Session Setup ----------
const createOutputDir = () => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const outputDir = path.join(process.cwd(), 'artifacts', sessionId);
  startArtifactWatcher(outputDir, sessionId);
  return { outputDir, sessionId };
};

const { outputDir } = createOutputDir();

// ---------- MCP Clients (unchanged) ----------
const playwrightMCPUrl = process.env.PLAYWRIGHT_MCP_URL || 'http://localhost:8931/mcp';

export const playwrightMCP = new MCPClient({
  servers: {
    playwright: {
      url: new URL(playwrightMCPUrl),
    },
  },
});

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

/**
 * Fetch tools from the Playwright MCP client, apply the denylist, and return a filtered set.
 *
 * Usage:
 *   const tools = await getFilteredPlaywrightTools();
 *   createAgent({ tools, ... });
 */
export async function getFilteredPlaywrightTools() {
  const allTools = await playwrightMCP.getTools();
  
  // Convert Record<string, Tool> to array and filter
  const toolsArray = Object.entries(allTools).map(([toolId, tool]) => ({
    ...tool,
    name: toolId,
  }));
  
  const filtered = toolsArray
    .filter(t => {
      // Check if tool name matches any denied tool (handle both prefixed and non-prefixed)
      const isDenied = Array.from(deniedTools).some(deniedTool => 
        t.name === deniedTool || 
        t.name.endsWith(`_${deniedTool}`) ||
        t.name.includes(`_${deniedTool}`)
      );
      return !isDenied;
    })
    .map(guardTool);

  if (process.env.NODE_ENV !== "production") {
    const names = toolsArray.map(t => t.name);
    const kept = filtered.map(t => t.name);
    const blocked = names.filter(n => !kept.includes(n));
    console.log("[MCP] discovered:", names);
    console.log("[MCP] allowed:", kept);
    console.log("[MCP] blocked:", blocked);
  }

  // Convert back to Record format for Mastra agent compatibility
  return Object.fromEntries(filtered.map(t => [t.name, t]));
}
