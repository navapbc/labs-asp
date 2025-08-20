import { postgresStore } from './storage';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { webAutomationAgent } from './agents/web-automation-agent';
import { webAutomationWorkflow } from './workflows/web-automation-workflow';
import { dataOpsAgent } from './agents/data-ops-agent';
import { serverMiddleware } from './middleware';

export const mastra = new Mastra({
  workflows: { 
    webAutomationWorkflow
  },
  agents: { 
    webAutomationAgent,
    dataOpsAgent,
  },
  storage: postgresStore,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug', // Change from 'info' to 'debug' to capture more error details
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
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4111,
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['*'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'x-mastra-dev-playground'],
      credentials: true,
    },
    build: {
      swaggerUI: true,     // Enable Swagger UI in production
      openAPIDocs: true,   // Enable OpenAPI docs in production
    },

    middleware: serverMiddleware,
  },
});
