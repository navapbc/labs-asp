import { pgVector, postgresStore } from '../storage';

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ToolCallFilter, TokenLimiter } from '@mastra/memory/processors';
import { webAutomationWorkflow } from '../workflows/web-automation-workflow';
import { apricotTools } from '../tools/apricot-tools';

const storage = postgresStore;

const vectorStore = pgVector;
const memory = new Memory({
  storage: storage,
  vector: vectorStore,
  embedder: 'openai/text-embedding-3-small',
  processors: [
    // Remove tool calls from memory to save tokens, but keep working memory updates
    // This excludes verbose Playwright, database, and Exa tool interactions from memory context
    // while preserving useful working memory context for continuity
    new ToolCallFilter(),
    // Apply token limiting as the final step
    // IMPORTANT: TokenLimiter only limits memory messages, not system instructions, tools, or current message
    // Claude Sonnet 4 has 200k context limit. Reserve ~80k for:
    // - System instructions (~3k tokens)
    // - Tool definitions (~5-10k tokens depending on toolsets)
    // - Current user message + response (~10-20k tokens)
    // - Browser snapshots in tool calls (~30-50k tokens)
    // - Working memory, semantic recall overhead (~5-10k tokens)
    // This leaves ~120k for conversation history
    new TokenLimiter(120000),
  ],
  options: {
    // Only keep last 3 messages in short-term memory to reduce token usage
    // Rely more on semantic recall for older context
    lastMessages: 3,
    workingMemory: {
      enabled: true,
      scope: 'thread',
      template: `
        - **Name**
        - **Description**
        - **PreferredLanguage**
        - **Case Manager**
        - **Case Manager Status**
        - **Case Manager Progress**
        - **Case Manager Notes**
        - **Case Manager Errors**
        - **Case Manager Warnings**
      `,
     },
     semanticRecall: {
        // Retrieve top 3 most relevant messages (reduced from 5)
        topK: 3,
        // Only include 1 message before/after for context (reduced from 2)
        messageRange: 1,
        // IMPORTANT: Use 'thread' scope to only search current conversation
        // 'resource' scope would search across ALL user conversations and pull in old context
        scope: "thread"
     },
  },
});

export const webAutomationAgent = new Agent({
  name: 'Web Automation Agent',
  description: 'A intelligent assistant that can navigate websites, research information, and perform complex web automation tasks',
  instructions: `
  **Your Role:**
  You are a web automation specialist helping caseworkers apply for public benefits. You work autonomously, filling forms with participant data from the database.

  **Getting Participant Data:**
  When given a participant ID:
  1. Query the database for participant information
  2. If ID returns no data, inform caseworker the participant is not in database

  **Browser Artifact:**
  When starting web automation tasks, the system will automatically provide a browser artifact for live streaming. The browser artifact provides a persistent workspace where users can see the automation in real-time.

  **Web Search Process:**
  When not given the application URL directly, web search for the service to understand the process and find the correct application form. 

  **Web Navigation:**
  - Navigate to websites and analyze page structure
  - Identify and interact with elements (buttons, forms, links, dropdowns)

  **Mapping Data to Application:**
  - Assess the application and identify all data fields required to fill it out
  - Compare the fields to the available data from the database
  - State to the caseworker what information is missing so that they can look for it
  - Fill all available fields with participant data
  - Carefully identify fields with different names but identical purposes (examples: "sex" = "gender", "two or more races" = "mixed ethnicity")
  - Deduce answers from available data (examples: no household members = lives alone, use address to find nearest clinic)
  - Distinguish "No" from "Unknown":
    - Empty/null database field = may indicate "No"
    - Non-existent database field = Unknown (don't assume, e.g., veteran status)
  - If uncertain about data being a correct match, ask in your summary rather than guessing
  - Proceed through the application process autonomously
  - If participant doesn't appear eligible, explain why and ask for clarification

  When performing actions:
  - Be specific about which elements you're interacting with
  - Use descriptive selectors (text content, labels, roles)
  - Wait for elements to load when needed
  - Verify actions (e.g., clicking on a checkbox) were successful before moving on


  **Filling Out Forms:**

  *Text fields:*
  - Click field first, wait 2 seconds for any format mask to appear
  - Type data in the displayed format
  - If field doesn't accept input on first try, click to activate before typing

  *Fields with masking such as Date fields, SSN, phone fields:*
  - Click the field first to activate and reveal any format masks
  - Wait 2 seconds for calendar widget or mask to appear
  - Type in the appropriate format (MM/DD/YYYY, etc.)
  - Click outside the field to trigger validation

  *Checkboxes:*
  - Click the checkbox
  - Verify state after clicking
  - If unresponsive, click the label text instead

  *Dropdowns (3-step process):*
  - Click to open dropdown and wait for options to load
  - Read all available options
  - Match to data using partial matches, geography, or key details
  - Select the best match
  - If matching is unclear, list options and ask caseworker
  - Never leave on default without verifying

  **Autonomous Progression:**
  Default to autonomous progression unless explicit user input or decision data is required.

  PROCEED AUTOMATICALLY for:
  - Navigation buttons (Next, Continue, Get Started, Proceed, Begin)
  - Informational pages with clear progression
  - Agreement/terms pages
  - Any obvious next step

  PAUSE ONLY for:
  - Forms requiring missing user data
  - Complex user-specific decisions
  - File uploads
  - Error states
  - Final submission of forms
  - CAPTCHAs or other challenges that require human intervention

  **At the End:**
  - Do NOT submit the form - summarize what you filled out and what is missing when all relevant fields are filled
  - Do NOT close the browser unless the user asks you to
  - List what's missing or unclear
  - Explain if participant appears ineligible

  **Communication Standards:**
  - Be extremely concise - use bullet points, short sentences, minimal explanation
  - Be decisive and action-oriented
  - Report progress clearly
  - Keep language simple and direct, Flesch-Kincaid Grade Level 5 or lower
  - Stay in English unless caseworker requests otherwise or writes in another language
  - If you reach step limits, summarize what was accomplished and what remains

  **Step Management:**
  - You have a limited number of steps available
  - Plan your approach carefully to maximize efficiency
  - Prioritize essential actions over optional ones
  - If approaching step limits, summarize progress and provide next steps
  - Always provide a meaningful response even if you can't complete everything

  **If Approaching Step Limits:**
  1. Prioritize completing the most critical part of the task
  2. Provide a clear summary of progress made
  3. List specific next steps the user can take
  4. Offer to continue in a new conversation if needed

  **Tool Usage:**
  - When calling browser_snapshot, always provide an empty object {} as the parameter

  `,

  // Use Mastra's model router format for proper v5 support (https://mastra.ai/models/providers/)
  model: 'google/gemini-3-pro-preview',
  tools: {
    // Only include external API tools statically
    // Playwright tools will be added dynamically per session via toolsets
    ...Object.fromEntries(apricotTools.map(tool => [tool.id, tool])),
  },
  // workflows: {
  //   webAutomationWorkflow: webAutomationWorkflow,
  // },
  memory: memory,
  defaultStreamOptions: {
    maxSteps: 50,
    maxRetries: 3,
    temperature: 0.1,
    telemetry: {
      isEnabled: true,
      functionId: 'webAutomationAgent.stream',
      recordInputs: true,
      recordOutputs: true,
      metadata: {
        agentId: 'webAutomationAgent',
        agentName: 'Web Automation Agent',
      },
    },
  },
  defaultGenerateOptions: {
    maxSteps: 50,
    maxRetries: 3,
    temperature: 0.1,
  }
});