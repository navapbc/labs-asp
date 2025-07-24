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
    webAutomationWorkflow,
    dataExtractionWorkflow,
  },
  agents: { 
    weatherAgent,
    webAutomationAgent,
    memoryAgent,
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
