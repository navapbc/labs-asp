import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";

const buildPlaywrightArgs = () => {
  
  const args = [
    "@playwright/mcp@latest", 
    "--isolated",
    "--browser=chromium",
    "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "--viewport-size=1920,1080",
    "--no-sandbox",
    "--output-dir=artifacts/",
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
