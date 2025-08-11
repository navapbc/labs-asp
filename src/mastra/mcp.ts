import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";

// Create separate clients for different tool sets
// Build Playwright args with optional proxy support
const buildPlaywrightArgs = () => {
  const args = [
    "@playwright/mcp@latest", 
    "--isolated",
    "--browser=chromium",
    "--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "--viewport-size=1920,1080",
    "--no-sandbox"
  ];
  
  // Add proxy if configured
  if (process.env.HTTP_PROXY || process.env.PROXY_SERVER) {
    const proxy = process.env.HTTP_PROXY || process.env.PROXY_SERVER;
    args.push(`--proxy-server=${proxy}`);
    
    // Add proxy bypass if configured
    if (process.env.PROXY_BYPASS) {
      args.push(`--proxy-bypass=${process.env.PROXY_BYPASS}`);
    }
  }
  
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

// Combined client for agents that need all tools
export const mcp = new MCPClient({
  servers: {
    playwright: {
      command: "npx",
      args: buildPlaywrightArgs(),
      env: {
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1"
      }
    },
    exa: {
      command: "npx",
      args: ["-y", "exa-mcp-server"],
      env: {
        EXA_API_KEY: process.env.EXA_API_KEY!
      },
    },
  },
}); 