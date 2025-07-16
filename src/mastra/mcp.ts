import { MCPClient } from "@mastra/mcp";

// Configure MCPClient to connect to the Playwright server
export const mcp = new MCPClient({
  servers: {
    playwright: {
      command: "npx",
      args: ["@playwright/mcp@latest", "--isolated"],
    },
  },
}); 