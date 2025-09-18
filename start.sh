#!/bin/bash
set -e

echo "Starting Playwright MCP server..."
npx @playwright/mcp@latest --port 8931 --isolated --browser chromium --no-sandbox \
  --user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
  --viewport-size "1920,1080" &
PLAYWRIGHT_PID=$!

echo "Waiting for Playwright MCP server to be ready..."
sleep 5

echo "Starting Mastra dev server..."
cd /app && npx mastra dev &
MASTRA_PID=$!

echo "All services started. PIDs: Playwright=$PLAYWRIGHT_PID, Mastra=$MASTRA_PID"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
