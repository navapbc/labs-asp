import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";
import { startArtifactWatcher } from './artifact-watcher';
import { createBrowserStreamingService } from './browser-streaming';
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

// Use HTTP transport for Playwright MCP (connects to containerized server)
export const playwrightMCP = new MCPClient({
  servers: {
    playwright: {
      url: new URL("http://localhost:8931/mcp"),
      requestInit: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      },
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

// Start browser streaming service (connects to Chrome CDP directly)
const browserStreamingService = createBrowserStreamingService(
  parseInt(process.env.BROWSER_STREAMING_PORT || '8933')
);

// Initialize browser streaming
browserStreamingService.start().catch((error) => {
  console.error('Failed to start browser streaming service:', error);
});

// Clean up on exit
process.on('exit', () => {
  browserStreamingService.stop();
});

process.on('SIGINT', () => {
  browserStreamingService.stop().then(() => {
    process.exit(0);
  });
});

// Export browser streaming service for use in client
export { browserStreamingService };
