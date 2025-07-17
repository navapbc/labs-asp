import 'dotenv/config';
import { MCPClient } from "@mastra/mcp";

// Configure MCPClient to connect to the Playwright server
export const mcp = new MCPClient({
  servers: {
    playwright: {
      command: "npx",
      args: ["@playwright/mcp@latest", "--isolated"],
    },
    exa: {
      command: "npx",
      args: [
        "-y",
        "mcp-remote",
        `https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`
      ],
    },
  },
}); 