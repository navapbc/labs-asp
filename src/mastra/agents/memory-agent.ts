import { LibSQLStore, LibSQLVector } from '@mastra/libsql';

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { openai } from '@ai-sdk/openai';

const vectorStore = new LibSQLVector({ connectionUrl: 'file:../mastra-memory.db' });
// Create a memory instance with workingMemory enabled
const memory = new Memory({
  storage: new LibSQLStore({ url: 'file:../mastra-memory.db' }),
  vector: vectorStore,
  embedder: openai.embedding('text-embedding-3-small'),
  options: {
    lastMessages: 10,
    workingMemory: { 
      enabled: true,
      scope: 'resource',
      template: `
        - **Name**
        - **Description**
        - **Value**
      `,
     },
     semanticRecall: {
        topK: 3,
        messageRange: 2
     }
  },
});

const memoryAgent = new Agent({
  name: 'Memory Agent',
  instructions: `
    You are a helpful assistant with memory. You should remember user preferences such as their preferred language and recall them when asked.
    If the user says something like "My preferred language is Spanish", save that in working memory. If the user asks "What is my preferred language?", recall it from memory.
  `,
  model: openai('gpt-4o-mini'),
  memory: memory,
});

export default memoryAgent;
