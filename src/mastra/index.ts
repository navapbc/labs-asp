import { LibSQLStore } from '@mastra/libsql';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { dataExtractionWorkflow } from './workflows/data-extraction-workflow';
import memoryAgent from './agents/memory-agent';
import { weatherAgent } from './agents/weather-agent';
import { weatherWorkflow } from './workflows/weather-workflow';
import { webAutomationAgent } from './agents/web-automation-agent';
import { webAutomationWorkflow } from './workflows/web-automation-workflow';

export const mastra = new Mastra({
  workflows: { 
    weatherWorkflow,
    webAutomationWorkflow
  },
  agents: { 
    weatherAgent,
    webAutomationAgent,
    memoryAgent,
  },
  storage: new LibSQLStore({
    url: "file:../mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug', // Changed from 'info' to 'debug' to capture more error details
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
});
