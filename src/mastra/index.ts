import { postgresStore } from './storage';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { webAutomationAgent } from './agents/web-automation-agent';
import { chatRoute } from '@mastra/ai-sdk';
import { createSessionPlaywrightMCP } from './mcp';

export const mastra = new Mastra({
  agents: { 
    webAutomationAgent
  },
  storage: postgresStore,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug', // Change from 'info' to 'debug' to capture more error details
  }),

  // AI Tracing (replaces deprecated telemetry)
  observability: {
    default: { enabled: true }, // Enables DefaultExporter for Playground access
  },

  server: {
    host: '0.0.0.0', // Allow external connections
    port: parseInt(process.env.MASTRA_PORT || '4112'),
    cors: {
      origin: process.env.CORS_ORIGINS === '*'
        ? '*'
        : (process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4111', 'http://localhost:4112']),
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'x-mastra-dev-playground'],
    },
    build: {
      swaggerUI: true,     // Enable Swagger UI in production
      openAPIDocs: true,   // Enable OpenAPI docs in production
    },
    apiRoutes: [
      {
        method: 'GET',
        path: '/health',
        handler: async (c) => {
          return c.json({ status: 'ok', service: 'mastra-app' }, 200);
        },
      },
      {
        method: 'POST',
        path: '/chat',
        handler: async (c) => {
          try {
            const body = await c.req.json();
            const { messages, threadId, resourceId } = body;

            if (!messages || !Array.isArray(messages) || messages.length === 0) {
              return c.json({ error: 'Messages array is required and must not be empty' }, 400);
            }

            console.log('Received chat request:', {
              messageCount: messages.length,
              threadId,
              resourceId,
              firstMessage: messages[0]
            });

            const agent = c.var.mastra.getAgent('webAutomationAgent');

            try {
              // Create session-specific Playwright MCP client for browser context isolation
              // Each chat session (thread + resource) gets its own browser context
              const sessionId = threadId && resourceId ? `${threadId}-${resourceId}` : `default-${Date.now()}`;
              const sessionPlaywrightMCP = createSessionPlaywrightMCP(sessionId);

              // Get Playwright tools for this session
              const playwrightToolsets = await sessionPlaywrightMCP.getToolsets();

              // Filter out specific browser tools
              // Playwright MCP doesn't support tool filtering at the server level,
              // so we filter after retrieval to prevent the agent from using certain tools
              const filteredToolsets: Record<string, Record<string, any>> = {};
              const excludedTools = ['browser_take_screenshot', 'browser_run_code'];

              for (const [namespace, tools] of Object.entries(playwrightToolsets)) {
                filteredToolsets[namespace] = {};
                for (const [toolName, tool] of Object.entries(tools)) {
                  // Check if tool should be excluded
                  const shouldExclude = excludedTools.some(excludeName =>
                    toolName === excludeName ||
                    toolName.includes(excludeName)
                  );

                  if (!shouldExclude) {
                    filteredToolsets[namespace][toolName] = tool;
                  } else {
                    console.log(`[Chat] Filtered out tool: ${toolName}`);
                  }
                }
              }

              console.log(`[Chat] Streaming for session: ${sessionId}`);
              console.log(`[Chat] Playwright toolsets (filtered):`, JSON.stringify(filteredToolsets, null, 2));

              const stream = await agent.stream(messages, {
                format: 'aisdk',
                memory: threadId && resourceId ? {
                  thread: threadId,
                  resource: resourceId,
                } : undefined,
                // Add session-specific Playwright tools dynamically (filtered)
                toolsets: filteredToolsets,
                maxSteps: 50,
                onError: ({ error }: { error: any }) => {
                  console.error('Error during agent streaming:', error);
                  // The error will be included in the stream
                },
              });

              return stream.toUIMessageStreamResponse();
            } catch (streamError: any) {
              console.error('Error creating stream', streamError);

              // Return a JSON error response instead of a broken stream
              return c.json({
                error: streamError.message || 'Failed to create response stream',
                details: streamError.data || null,
                isRetryable: streamError.isRetryable || false
              }, streamError.statusCode || 500);
            }
          } catch (error: any) {
            console.error('Error in chat handler:', error);

            // Return a proper error response
            const errorMessage = error.message || 'An error occurred while processing your request';
            const statusCode = error.statusCode || 500;

            return c.json({
              error: errorMessage,
              details: error.data || null
            }, statusCode);
          }
        },
      },
    ],
  },
});
