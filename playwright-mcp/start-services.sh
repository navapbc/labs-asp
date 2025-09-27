#!/bin/bash

# Install browser streaming dependencies locally
npm install ws chrome-remote-interface

# Start browser streaming service in background
node /app/browser-streaming-server.js &

# Start Playwright MCP server in foreground
exec /usr/local/lib/node_modules/@playwright/mcp/cli.js \
     --port 8931 \
     --host 0.0.0.0 \
     --isolated \
     --browser chromium \
     --no-sandbox \
     --user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
     --viewport-size 1920,1080
