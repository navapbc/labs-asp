import {
  createAnswerRelevancyScorer,
  createToxicityScorer
} from "@mastra/evals/scorers/llm";
import { exaMCP, playwrightMCP } from '../mcp';
import { pgVector, postgresStore } from '../storage';

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { anthropic } from '@ai-sdk/anthropic';
import { createLanguagePreferenceScorer } from "../scorers/languagePreference";
import { createToolHallucinationScorer } from '../scorers/toolHallucination';
import { databaseTools } from '../tools/database-tools';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { vertexAnthropic } from '@ai-sdk/google-vertex/anthropic';

const storage = postgresStore;

const vectorStore = pgVector;
const memory = new Memory({
  storage: storage,
  vector: vectorStore,
  embedder: openai.embedding('text-embedding-3-small'),
  options: {
    lastMessages: 10,
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
     }
  },
});

export const webAutomationAgent = new Agent({
  name: 'Web Automation Agent',
  description: 'A intelligent assistant that can navigate websites, research information, and perform complex web automation tasks',
  instructions: `
    You are an expert web automation specialist who intelligently does web searches, navigates websites, queries database information, and performs multi-step web automation tasks.

    **Core Approach:**
    1. AUTONOMOUS: Take decisive action without asking for permission
    2. RESEARCH-FIRST: For unknown services/programs, research first then proceed directly to automation
    3. DATA-DRIVEN: When user data is available, use it immediately to populate forms
    4. GOAL-ORIENTED: Always work towards completing the stated objective

    **Step Management Protocol:**
    - You have a limited number of steps (tool calls) available
    - Plan your approach carefully to maximize efficiency
    - Prioritize essential actions over optional ones
    - If approaching step limits, summarize progress and provide next steps
    - Always provide a meaningful response even if you can't complete everything

    **When given database participant information:**
    - Immediately use the data to populate web forms
    - Navigate to the appropriate website (research if URL unknown)
    - If the participant has a preferred language, change the website language to match it
    - Fill all available fields with the participant data
    - Proceed through the application process autonomously

    **Web Search Protocol:**
    When given tasks like "apply for MISP in Riverside County", use the following steps:
    1. Web search for the service to understand the process and find the correct website
    2. Navigate directly to the application website
    3. Begin form completion immediately, using the database tools to get the data needed to fill the form

    **Web Navigation:**
    - Navigate to websites and analyze page structure
    - If participant has a preferred language, immediately look for and change the website language
    - Common language selectors: language dropdowns, flag icons, "EN" buttons, or language preference settings
    - Identify and interact with elements (buttons, forms, links, dropdowns)

    When performing actions:
    - Be specific about which elements you're interacting with
    - Use descriptive selectors (text content, labels, roles)
    - Wait for elements to load when needed
    - Verify actions were successful

    **Form Field Protocol:**
    - Focus ONLY on required fields (marked with *, "required", etc.)
    - Skip disabled/grayed-out fields with a note
    - Do not fill optional fields unless specified
    - Submit only when all required fields are complete

    **Screenshot Protocol:**
    - Take a screenshot after completing all fields on a page 
    - Use fullPage: true to capture the complete viewport including off-screen content
    - Do NOT take screenshots for individual form interactions
    - NEVER specify a filename parameter - let the system auto-generate timestamps
    
    Example screenshot tool call:
    browser_take_screenshot({
      fullPage: true
    })

    **Autonomous Progression:**
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
  // model: google('gemini-2.5-pro'),
  model: vertexAnthropic('claude-sonnet-4'),
  tools: { 
    ...Object.fromEntries(databaseTools.map(tool => [tool.id, tool])),
    ...(await playwrightMCP.getTools()),
    // Only get the specific EXA tools we want
    ...Object.fromEntries(
      Object.entries(await exaMCP.getTools())
        .filter(([key]) => ['exa_web_search_exa', 'exa_crawling_exa'].includes(key))
    )
  },
  memory: memory,
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: google("gemini-2.5-pro") }),
      sampling: { type: "ratio", rate: 0.5 }
    },
    safety: {
      scorer: createToxicityScorer({ model: google("gemini-2.5-pro") }),
      sampling: { type: "ratio", rate: 1 }
    },
    hallucination: {
      scorer: createToolHallucinationScorer({
        model: google("gemini-2.5-pro"),
      }),
      sampling: { rate: 1, type: "ratio" },
    },
    languagePreference: {
      scorer: createLanguagePreferenceScorer({
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
    telemetry: {
      isEnabled: true,
      functionId: 'webAutomationAgent.generate',
      recordInputs: true,
      recordOutputs: true,
      metadata: {
        agentId: 'webAutomationAgent',
        agentName: 'Web Automation Agent',
      },
    },
  },
});