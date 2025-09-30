import { postgresStore } from './storage';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { webAutomationAgent } from './agents/web-automation-agent';
import { chatRoute } from '@mastra/ai-sdk';

export const mastra = new Mastra({
  agents: { 
    webAutomationAgent
  },
  storage: postgresStore,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info', // Change from 'info' to 'debug' to capture more error details
  }),

  telemetry: {
    serviceName: 'mastra-test-app',
    enabled: true,
    sampling: {
      type: 'always_on',
    },
    export: {
      type: 'console', // Use console for development; switch to 'otlp' for production
    },
  },

  server: {
    host: '0.0.0.0', // Allow external connections
    port: parseInt(process.env.MASTRA_PORT || '4112'),
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4111', 'http://localhost:4112'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'x-mastra-dev-playground'],
    },
    build: {
      swaggerUI: true,     // Enable Swagger UI in production
      openAPIDocs: true,   // Enable OpenAPI docs in production
    },
    apiRoutes: [
      chatRoute({
        path: '/chat',
        agent: 'webAutomationAgent',
      }),
    ],
  },
});
