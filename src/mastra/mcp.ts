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

// Use stdio transport for Playwright MCP (recommended approach)
export const playwrightMCP = new MCPClient({
  servers: {
    playwright: {
      command: "npx",
      args: [
        "@playwright/mcp@latest", 
        "--browser=chromium",
        // "--headless",
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "--viewport-size=1920,1080",
        // `--output-dir=${outputDir}`,
        // "--save-trace",
        // "--isolated"
        // Note: Removed --save-trace and --save-session for clean browser state on each run
        // Add back --save-session if you want to persist browser state between conversations
        // Note: artifacts will not be saved to the output directory unless the args are uncommented
      ],
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
