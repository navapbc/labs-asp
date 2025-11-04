import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";
import { startArtifactWatcher } from './artifact-watcher';
import path from 'path';

// ---------- Excluded Tools ----------
const EXCLUDED_TOOLS = [
  "playwright_browser_evaluate",
  "playwright_browser_network_requests",
  "playwright_browser_take_screenshot",
  "playwright_browser_snapshot",
];

const excludedTools = new Set(
  EXCLUDED_TOOLS.join(",")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

// Wrap execute() so even if something slips through, it fails closed.
function guardTool<T extends { name: string; execute: Function }>(tool: T): T {
  return {
    ...tool,
    async execute(input: unknown) {
      if (excludedTools.has(tool.name)) {
        throw new Error(`Tool "${tool.name}" is excluded by policy`);
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

// Environment-based MCP URL configuration
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
 * Fetch tools from the Playwright MCP client, apply the excluded tools, and return a filtered set.
 *
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
      const isExcluded = Array.from(excludedTools).some(excludedTool => 
        t.name === excludedTool || 
        t.name.endsWith(`_${excludedTool}`) ||
        t.name.includes(`_${excludedTool}`)
      );
      return !isExcluded;
    })
    .map(guardTool);

  if (process.env.NODE_ENV !== "production") {
    const names = toolsArray.map(t => t.name);
    const kept = filtered.map(t => t.name);
    const blocked = names.filter(n => !kept.includes(n));
    // console.log("[MCP] discovered:", names);
    // console.log("[MCP] allowed:", kept);
    // console.log("[MCP] blocked:", blocked);
  }

  // Convert back to Record format for Mastra agent compatibility
  return Object.fromEntries(filtered.map(t => [t.name, t]));
}
