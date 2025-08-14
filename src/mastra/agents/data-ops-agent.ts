import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { databaseTools } from '../tools/database-tools';
import { storageTools } from '../tools/storage-tools';

export const dataOpsAgent = new Agent({
  name: 'Data Ops Agent',
  description: 'Agent specialized in database and Mastra storage queries (participants, threads, messages, traces).',
  instructions: `
    You are a concise data operations assistant. Use the provided tools to:
    - Query and manage participants/household records
    - Inspect Mastra threads, messages, and traces
    - Return small, readable result sets
  `,
//   model: google('gemini-2.5-pro'),
  model: anthropic('claude-sonnet-4-20250514'),
  tools: {
    ...Object.fromEntries(databaseTools.map(t => [t.id, t])),
    ...Object.fromEntries(storageTools.map(t => [t.id, t])),
  },

  defaultStreamOptions: {
    maxSteps: 50,
    maxRetries: 3,
    temperature: 0.1,
    telemetry: {
      isEnabled: true,
      functionId: 'dataOpsAgent.stream',
      recordInputs: true,
      recordOutputs: true,
      metadata: {
        agentId: 'dataOpsAgent',
        agentName: 'Data Ops Agent',
      },
    },
  },
  defaultGenerateOptions: {
    maxSteps: 50,
    maxRetries: 3,
    temperature: 0.1,
    telemetry: {
      isEnabled: true,
      functionId: 'dataOpsAgent.generate',
      recordInputs: true,
      recordOutputs: true,
      metadata: {
        agentId: 'dataOpsAgent',
        agentName: 'Data Ops Agent',
      },
    },
  },
});
