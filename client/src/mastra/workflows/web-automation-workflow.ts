import { createStep, createWorkflow } from '@mastra/core/workflows';
import { PinoLogger } from '@mastra/loggers';
import { z } from 'zod';

// Create a logger instance for this workflow
const logger = new PinoLogger({
  name: 'WebAutomationWorkflow',
  level: 'debug', // Changed from 'info' to 'debug' for better error visibility
});

// Step 1: Initial website navigation and analysis
const navigationStep = createStep({
  id: 'navigation',
  description: 'Navigate to a website and perform initial analysis',
  inputSchema: z.object({
    url: z.string().describe('The URL of the website to navigate to'),
    objective: z.string().describe('The overall objective for this web automation session'),
  }),
  outputSchema: z.object({
    url: z.string(),
    objective: z.string(),
    pageAnalysis: z.string().describe('Analysis of the current page'),
    availableActions: z.array(z.string()).describe('List of possible actions identified on the page'),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      const error = new Error('Input data not found');
      logger.error('Navigation step failed: Input data not found', { error });
      throw error;
    }

    const agent = mastra?.getAgent('webAutomationAgent');
    if (!agent) {
      const error = new Error('Web automation agent not found');
      logger.error('Navigation step failed: Agent not found', { error });
      throw error;
    }

    logger.info(`Starting navigation to URL: ${inputData.url} with objective: ${inputData.objective}`, { url: inputData.url, objective: inputData.objective });

    const prompt = `Navigate to ${inputData.url} and analyze the page for automation opportunities.

    Objective: ${inputData.objective}

    Please:
    1. Navigate to the website
    2. Take a snapshot to understand the page layout
    3. Analyze what actions are possible on this page (forms, buttons, links, etc.)
    4. Identify key elements that could help achieve the objective
    5. List 3-5 specific actions I could take next

    Provide a clear analysis of what you see and what actions are available.`;
    
    try {
      const response = await agent.stream([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      let analysisText = '';
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        analysisText += chunk;
      }

      // Extract available actions (in a real implementation, this could parse the agent's response)
      const availableActions = [
        'Take another snapshot',
        'Click on a specific element',
        'Fill out a form',
        'Search for something',
        'Navigate to another page',
      ];

      logger.info(`Navigation completed for ${inputData.url}. Found ${availableActions.length} actions. Analysis length: ${analysisText.length} chars`);
      
      return {
        url: inputData.url,
        objective: inputData.objective,
        pageAnalysis: analysisText,
        availableActions,
      };
    } catch (error) {
      logger.error(`Navigation step failed for ${inputData.url} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
});

// Step 2: Action planning step that can proceed autonomously or suspend for user input
const actionPlanningStep = createStep({
  id: 'action-planning',
  description: 'Determine next action - proceed automatically for obvious steps or pause for user input',
  inputSchema: z.object({
    url: z.string(),
    objective: z.string(),
    pageAnalysis: z.string(),
    availableActions: z.array(z.string()),
  }),
  outputSchema: z.object({
    url: z.string(),
    objective: z.string(),
    selectedAction: z.string().describe('The action selected by the agent or user'),
    actionDetails: z.string().describe('Additional details for the action'),
  }),
  suspendSchema: z.object({
    pageAnalysis: z.string(),
    availableActions: z.array(z.string()),
  }),
  resumeSchema: z.object({
    selectedAction: z.string().describe('The action to perform'),
    actionDetails: z.string().describe('Additional details for the action'),
  }),
  execute: async ({ inputData, resumeData, suspend, mastra }) => {
    if (resumeData?.selectedAction) {
      logger.info(`Resuming workflow with user-selected action: ${resumeData.selectedAction}`);
      return {
        url: inputData?.url || '',
        objective: inputData?.objective || '',
        selectedAction: resumeData.selectedAction,
        actionDetails: resumeData.actionDetails,
      };
    }

    // Let the agent decide whether to proceed automatically or pause
    const agent = mastra?.getAgent('webAutomationAgent');
    if (!agent) {
      const error = new Error('Web automation agent not found');
      logger.error('Action planning step failed: Agent not found', { error });
      throw error;
    }

    const prompt = `Based on your page analysis, decide whether to proceed automatically or pause for user input.

    Page Analysis: ${inputData?.pageAnalysis}
    Available Actions: ${inputData?.availableActions?.join(', ')}
    Objective: ${inputData?.objective}

    Follow your Autonomous Progression Protocol:
    - PROCEED AUTOMATICALLY for navigation (Next, Continue, Begin buttons, informational pages)
    - PAUSE FOR USER INPUT only when you reach forms requiring user data or decisions

    Key question: Does this page require USER DATA or USER DECISIONS, or is it just navigation?

    Respond in this exact format:
    DECISION: [PROCEED_AUTO or PAUSE_FOR_USER]
    ACTION: [specific action to take if proceeding]
    DETAILS: [any additional details]
    REASON: [brief explanation of your decision]`;

    try {
      const response = await agent.stream([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      let decisionText = '';
      for await (const chunk of response.textStream) {
        decisionText += chunk;
      }

      // Parse the agent's decision
      const shouldProceed = decisionText.includes('DECISION: PROCEED_AUTO');
      
      if (shouldProceed) {
        // Extract action and details from the response
        const actionMatch = decisionText.match(/ACTION: ([^\n]+)/);
        const detailsMatch = decisionText.match(/DETAILS: ([^\n]+)/);
        
        const selectedAction = actionMatch?.[1] || 'Continue with next step';
        const actionDetails = detailsMatch?.[1] || 'Proceeding with obvious next step';
        
        logger.info(`Agent proceeding automatically with action: ${selectedAction} - ${actionDetails}`);
        
        return {
          url: inputData?.url || '',
          objective: inputData?.objective || '',
          selectedAction,
          actionDetails,
        };
      } else {
        logger.info(`Agent pausing for user input. ${inputData?.availableActions?.length || 0} actions available`);
        
        // Suspend to get user input on what action to take
        return suspend({
          pageAnalysis: inputData?.pageAnalysis || '',
          availableActions: inputData?.availableActions || [],
        });
      }
    } catch (error) {
      logger.error(`Action planning step failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
});

// Step 3: Execute the selected action
const actionExecutionStep = createStep({
  id: 'action-execution',
  description: 'Execute the selected web action',
  inputSchema: z.object({
    url: z.string(),
    objective: z.string(),
    selectedAction: z.string(),
    actionDetails: z.string(),
  }),
  outputSchema: z.object({
    actionResult: z.string().describe('Result of the executed action'),
    pageState: z.string().describe('Current state of the page after the action'),
    nextStepNeeded: z.boolean().describe('Whether another action step is needed'),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      const error = new Error('Input data not found');
      logger.error('Action execution step failed: Input data not found', { error });
      throw error;
    }

    const agent = mastra?.getAgent('webAutomationAgent');
    if (!agent) {
      const error = new Error('Web automation agent not found');
      logger.error('Action execution step failed: Agent not found', { error });
      throw error;
    }

    logger.info(`Executing web action: ${inputData.selectedAction} for objective: ${inputData.objective}`);

    const prompt = `Execute this web action:

    Action: ${inputData.selectedAction}
    Details: ${inputData.actionDetails}
    Objective: ${inputData.objective}

    Please:
    1. Perform the requested action
    2. If you're adding an address field and a suggested address is displayed, always select and use the suggested address
    3. When working with forms: focus ONLY on required fields and note any disabled fields without attempting to fill them
    4. Take a snapshot after the action to show the result
    5. Analyze if the action was successful
    6. Determine if we've achieved the objective or if more actions are needed
    7. Describe the current state of the page

    Follow the Address Handling Protocol and Form Field Handling Protocol from your instructions.

    Be precise and report exactly what happened.`;
    
    try {
      const response = await agent.stream([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      let actionResult = '';
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        actionResult += chunk;
      }

      // In a real implementation, you'd parse the response to determine if more steps are needed
      const nextStepNeeded = !actionResult.toLowerCase().includes('objective completed') && 
                             !actionResult.toLowerCase().includes('task finished');

      logger.info(`Action execution completed: ${inputData.selectedAction}. Next step needed: ${nextStepNeeded}. Result length: ${actionResult.length} chars`);
      
      return {
        actionResult,
        pageState: actionResult,
        nextStepNeeded,
      };
    } catch (error) {
      logger.error(`Action execution failed for ${inputData.selectedAction} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
});

// Step 4: Completion assessment that can loop back or finish
const completionStep = createStep({
  id: 'completion',
  description: 'Assess if the objective is complete or if more actions are needed',
  inputSchema: z.object({
    actionResult: z.string(),
    pageState: z.string(),
    nextStepNeeded: z.boolean(),
  }),
  outputSchema: z.object({
    isComplete: z.boolean(),
    summary: z.string().describe('Summary of what was accomplished'),
    nextActions: z.array(z.string()).optional().describe('Suggested next actions if not complete'),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      const error = new Error('Input data not found');
      logger.error('Completion step failed: Input data not found', { error });
      throw error;
    }

    // Simple completion logic - in a real implementation this could be more sophisticated
    const isComplete = !inputData.nextStepNeeded;

    logger.info(`Workflow completion assessment: ${isComplete ? 'Complete' : 'Incomplete'}. Next step needed: ${inputData.nextStepNeeded}. Result length: ${inputData.actionResult.length} chars`);
    
    return {
      isComplete,
      summary: inputData.actionResult,
      nextActions: isComplete ? undefined : ['Continue with more actions', 'Refine the approach', 'Ask for guidance'],
    };
  },
});

export const webAutomationWorkflow = createWorkflow({
  id: 'web-automation-workflow',
  inputSchema: z.object({
    url: z.string().describe('The URL of the website to automate'),
    objective: z.string().describe('The goal you want to achieve on this website'),
  }),
  outputSchema: z.object({
    isComplete: z.boolean(),
    summary: z.string(),
    nextActions: z.array(z.string()).optional(),
  }),
})
  .then(navigationStep)
  .then(actionPlanningStep)
  .then(actionExecutionStep)
  .then(completionStep);

webAutomationWorkflow.commit();

export { actionPlanningStep }; 