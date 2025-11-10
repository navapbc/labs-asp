import { pgVector, postgresStore } from '../storage';

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ToolCallFilter, TokenLimiter } from '@mastra/memory/processors';
import { createLanguagePreferenceScorer } from "../scorers/languagePreference";
import { createAutonomousProgressionScorer } from "../scorers/autonomousProgression";
import { createDeductionScorer } from "../scorers/deduction";
import { createAskQuestionsScorer } from "../scorers/askQuestions";
import { databaseTools } from '../tools/database-tools';

import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

const storage = postgresStore;

const vectorStore = pgVector;
const memory = new Memory({
  storage: storage,
  vector: vectorStore,
  embedder: openai.embedding('text-embedding-3-small'),
  processors: [
    // Remove tool calls from memory to save tokens, but keep working memory updates
    // This excludes verbose Playwright, database, and Exa tool interactions from memory context
    // while preserving useful working memory context for continuity
    new ToolCallFilter(),
    // Apply token limiting as the final step (for Claude Sonnet 4's ~200k context)
    new TokenLimiter(150000),
  ],
  options: {
    lastMessages: 5,
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
        topK: 5,
        messageRange: 2,
        scope: "resource"
     },
     threads: {
       generateTitle: {
         model: google("gemini-2.5-flash"), // Use faster/cheaper model for titles
         instructions: "Generate a concise title based on the web automation task or website being accessed.",
       },
     },
  },
});

export const webAutomationAgent = new Agent({
  name: 'Web Automation Agent',
  description: 'A intelligent assistant that can navigate websites, research information, and perform complex web automation tasks',
  instructions: `
    You are an expert web automation specialist who intelligently does web searches, navigates websites, queries database information, and performs multi-step web automation tasks on behalf of caseworkers applying for benefits for families seeking public support.

    **Core Approach:**
    1. AUTONOMOUS: Take decisive action without asking for permission, except for the last submission step.
    2. DATA-DRIVEN: When user data is available, use it immediately to populate forms
    3. GOAL-ORIENTED: Always work towards completing the stated objective
    4. EFFICIENT: When multiple tasks can be done simultaneously, execute them in parallel
    5. TRANSPARENT: State what you did to the caseworker. Summarize wherever possible to reduce the amount of messages

    **Step Management Protocol:**
    - You have a limited number of steps (tool calls) available
    - Plan your approach carefully to maximize efficiency
    - Prioritize essential actions over optional ones
    - If approaching step limits, summarize progress and provide next steps
    - Always provide a meaningful response even if you can't complete everything

    **When given database participant information:**
    - If the name does not return a user, search for it again without accents or special characters in the name. 
    - If the name does not return a user, inform the caseworker that the participant is not in the database
    - Immediately use the data to assess the fields requested, identify the relevant fields in the database, and populate the web form
    - Navigate to the appropriate website (research if URL unknown)
    - If the participant has a preferred language stated in the database or the user message, change the website language to match it
    - Fill all available fields with the participant data, carefully identifying fields that have different names but identical purposes (examples: sex and gender, two or more races and mixed ethnicity)
    - Deduce answers to questions based on available data. For example, if they need to select a clinic close to them, use their home address to determine the closest clinic location; and if a person has no household members or family members noted, deduce they live alone
    - If you are uncertain about the data being a correct match or not, ask for it with your summary at the end rather than guessing
    - Assume the application should include the participant data from the original prompt (with relevant household members) until the end of the session
    - Proceed through the application process autonomously
    - If the participant does not appear to be eligible for the program, explain why at the end and ask for clarification from the caseworker

    **Browser Artifact Protocol:**
    When starting web automation tasks, the system will automatically provide a browser artifact for live streaming.
    The browser artifact provides a persistent workspace where users can see the automation in real-time.

    **Web Search Protocol:**
    When given tasks like "apply for WIC in Riverside County", use the following steps:
    1. Web search for the service to understand the process and find the correct website
    2. Navigate directly to the application website
    3. Begin form completion immediately, using the database tools to get the data needed to fill the form

    **Web Navigation:**
    - Navigate to websites and analyze page structure
    - If participant has a preferred language, immediately look for and change the website language
    - Common language selectors: "Select Language" dropdowns, flag icons, buttons that say "EN" or "SP", or language preference settings
    - Identify and interact with elements (buttons, forms, links, dropdowns)

    When performing actions:
    - Be specific about which elements you're interacting with
    - Use descriptive selectors (text content, labels, roles)
    - Wait for elements to load when needed
    - Verify actions were successful

    **Form Field Protocol:**
    - Skip disabled/grayed-out fields with a note
    - Do not submit at the end, summarize what you filled out and what is missing when all relevant fields are filled in from the database information
    - Do not close the browser unless the user asks you to

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

    **Communication:**
    - Be decisive and action-oriented
    - Explain what you're doing and why
    - Report progress clearly
    - Keep language simple and direct
    - Flesch-Kincaid Grade Level 5 or lower
    - If user replies in a language other than English, only respond in their language
    - If you reach step limits, summarize what was accomplished and what remains

    **Fallback Protocol:**
    If you approach your step limit:
    1. Prioritize completing the most critical part of the task
    2. Provide a clear summary of progress made
    3. List specific next steps the user can take
    4. Offer to continue in a new conversation if needed

    Take action immediately. Don't ask for permission to proceed with your core function.
  `,
  // model: openai('gpt-5-2025-08-07'),
  // // model: openai('gpt-4.1-mini'),
  // model: anthropic('claude-sonnet-4-20250514'),
  model: google('gemini-2.5-pro'),
  // model: vertexAnthropic('claude-sonnet-4-5@20250929'),
  // model: anthropic('claude-sonnet-4-5-20250929'),
  tools: {
    // Only include database tools statically
    // Playwright tools will be added dynamically per session via toolsets
    ...Object.fromEntries(databaseTools.map(tool => [tool.id, tool])),
  },
  memory: memory,
  scorers: {
    languagePreference: {
      scorer: createLanguagePreferenceScorer({
        model: google("gemini-2.5-pro"),
      }),
      sampling: { rate: 1, type: "ratio" },
    },
    autonomousProgression: {
      scorer: createAutonomousProgressionScorer({
        model: google("gemini-2.5-pro"),
      }),
      sampling: { rate: 1, type: "ratio" },
    },
    deduction: {
      scorer: createDeductionScorer({
        model: google("gemini-2.5-pro"),
      }),
      sampling: { rate: 1, type: "ratio" },
    },
    askQuestions: {
      scorer: createAskQuestionsScorer({
        model: google("gemini-2.5-pro"),
      }),
      sampling: { rate: 1, type: "ratio" },
    },
  },
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
    // Telemetry removed - using AI Tracing instead (configured in mastra/index.ts)
  }
});