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

const buildPlaywrightArgs = () => {
  
  const args = [
    "@playwright/mcp@latest", 
    "--isolated",
    "--browser=chromium",
    "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "--viewport-size=1920,1080",
    "--no-sandbox",
    `--output-dir=${outputDir}`,
    "--save-session",
    "--save-trace"
  ];
  
  return args;
};

export const playwrightMCP = new MCPClient({
  servers: {
    playwright: {
      command: "npx",
      args: buildPlaywrightArgs(),
      env: {
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1"
      }
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
