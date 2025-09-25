import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";
import { startArtifactWatcher } from './artifact-watcher';
import path from 'path';

// Create a unique session-based output directory
const createOutputDir = () => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const outputDir = path.join(process.cwd(), 'artifacts', sessionId);
  
  // Start the artifact watcher for this session
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
