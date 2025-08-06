# Logging Setup for Mastra Playground

This document explains the minimal logging improvements made to better surface errors between agent and workflow steps.

## What Was Changed

### 1. Enhanced Mastra Core Logging (`src/mastra/index.ts`)
- **Log Level**: Changed from `info` to `debug` to capture more detailed error information
- **Telemetry**: Added OpenTelemetry configuration for better error tracking and visibility
- **Service Name**: Set to 'mastra-test-app' for easier identification in logs

### 2. MCP Client Configuration (`src/mastra/mcp.ts`)
- **Server Timeouts**: Configured appropriate timeouts (60s for Playwright, 30s for Exa)
- **Clean Setup**: Minimal configuration without excessive custom logging

### 3. Workflow Error Handling (`src/mastra/workflows/web-automation-workflow.ts`)
- **Debug Level**: Changed workflow logger from `info` to `debug`
- **Structured Error Logging**: Added try-catch blocks around all agent interactions
- **Context Information**: Each log includes relevant context (URLs, actions, error details)
- **Step-by-Step Tracking**: Better visibility into each workflow step's execution

## How to Use

### Option 1: Standard Logging
Run your development server as usual:
```bash
npm run dev
```

### Option 2: Pretty Formatted Logs (Recommended)
Use the new script for better formatted, colorized logs:
```bash
npm run dev:pretty
```

The pretty format includes:
- Color-coded log levels
- Readable timestamps
- Clear message formatting
- Error object expansion

## What You'll See

### MCP Connection Logs
Built-in MCP logging will show:
```
[MCP] Successfully connected to MCP server
[MCP] Tool execution failed: timeout
```

### Workflow Step Errors
```
2024-01-15 10:30:46 ERROR - Navigation step failed for https://example.com - Timeout waiting for element
```

### Agent Interaction Tracking
```
2024-01-15 10:30:47 DEBUG - Action execution completed: Take screenshot. Next step needed: true. Result length: 1245 chars
```

## Debugging Tips

1. **Focus on essentials**: The setup captures debug-level information without excessive noise
2. **Check MCP timeouts**: Playwright operations timeout after 60s, Exa after 30s
3. **Look for error patterns**: Errors are consistently formatted with context
4. **Monitor telemetry**: OpenTelemetry console output provides additional execution tracing
5. **MCP built-ins**: Let MCPClient handle its own logging - it's already pretty good

## Monitoring Error Patterns

Common error patterns to watch for:
- **Tool timeout errors**: Usually indicate network or browser issues
- **Agent decision errors**: Check if decision parsing is working correctly
- **Form interaction errors**: Look for element selection or input validation issues
- **Navigation errors**: Usually indicate page loading or URL access problems

## Key Benefits

This minimal approach provides:
- **Essential error visibility**: See what matters without log spam
- **Standard MCP logging**: Built-in MCPClient logging works well
- **Workflow error tracking**: Clear visibility into step failures
- **Simple maintenance**: Less custom code to maintain

## Production Considerations

For production deployment:
1. Change telemetry export from 'console' to 'otlp' with proper endpoint
2. Consider using structured log aggregation (e.g., ELK stack, Datadog)
3. Set appropriate log retention policies
4. Monitor error rates and patterns
5. The simple setup will be easier to maintain and debug

## Environment Variables

No additional environment variables are required for the logging setup, but you can customize:
- `NODE_ENV=production` will affect log formatting
- `LOG_LEVEL=debug` can override the default log level

## MCP Error Visibility

The key insight: **MCPClient already provides good error logging**. You'll naturally see:
- Connection failures
- Tool execution timeouts
- Server communication errors

Combined with the enhanced Mastra core logging and workflow error handling, this gives you the visibility you need without unnecessary complexity. 