import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";

// Create separate clients for different tool sets
// Build Playwright args with environment-aware GCS storage
const buildPlaywrightArgs = () => {
  // Determine output directory based on environment
  let outputDir;
  
  if (process.env.NODE_ENV === 'production' || process.env.GCS_MOUNT_PATH) {
    // Production: Use mounted GCS bucket (Linux with gcsfuse)
    outputDir = process.env.GCS_MOUNT_PATH || '/mnt/playwright-artifacts';
  } else {
    // Development: Use absolute path to project artifacts directory
    const projectRoot = process.cwd().includes('.mastra/output') 
      ? process.cwd().replace('/.mastra/output', '') 
      : process.cwd();
    outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR || `${projectRoot}/artifacts`;
  }
  
  console.log(`Playwright artifacts will be saved to: ${outputDir}`);
  
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