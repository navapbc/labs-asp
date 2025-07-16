import { createStep, createWorkflow } from '@mastra/core/workflows';
import { PinoLogger } from '@mastra/loggers';
import { z } from 'zod';

// Create a logger instance for this workflow
const logger = new PinoLogger({
  name: 'WebAutomationWorkflow',
  level: 'info',
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
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('webAutomationAgent');
    if (!agent) {
      throw new Error('Web automation agent not found');
    }

    logger.info(`Starting navigation to URL: ${inputData.url} with objective: ${inputData.objective}`);

    const prompt = `Navigate to ${inputData.url} and analyze the page for automation opportunities.

    Objective: ${inputData.objective}

    Please:
    1. Navigate to the website
    2. Take a snapshot to understand the page layout
    3. Analyze what actions are possible on this page (forms, buttons, links, etc.)
    4. Identify key elements that could help achieve the objective
    5. List 3-5 specific actions I could take next

    Provide a clear analysis of what you see and what actions are available.`;
    
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

    logger.info(`Navigation and analysis completed successfully for ${inputData.url}. Found ${availableActions.length} available actions`);
    
    return {
      url: inputData.url,
      objective: inputData.objective,
      pageAnalysis: analysisText,
      availableActions,
    };
  },
});

// Step 2: Action planning step that suspends for user input
const actionPlanningStep = createStep({
  id: 'action-planning',
  description: 'Plan the next action based on page analysis',
  inputSchema: z.object({
    url: z.string(),
    objective: z.string(),
    pageAnalysis: z.string(),
    availableActions: z.array(z.string()),
  }),
  outputSchema: z.object({
    url: z.string(),
    objective: z.string(),
    selectedAction: z.string().describe('The action selected by the user'),
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
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData?.selectedAction) {
      logger.info(`Suspending workflow to await user action selection. ${inputData?.availableActions?.length || 0} actions available`);

      // Suspend to get user input on what action to take
      return suspend({
        pageAnalysis: inputData?.pageAnalysis || '',
        availableActions: inputData?.availableActions || [],
      });
    }

    logger.info(`Resuming workflow with user-selected action: ${resumeData.selectedAction}`);

    return {
      url: inputData?.url || '',
      objective: inputData?.objective || '',
      selectedAction: resumeData.selectedAction,
      actionDetails: resumeData.actionDetails,
    };
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
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('webAutomationAgent');
    if (!agent) {
      throw new Error('Web automation agent not found');
    }

    logger.info(`Executing web action: ${inputData.selectedAction} for objective: ${inputData.objective}`);

    const prompt = `Execute this web action:

    Action: ${inputData.selectedAction}
    Details: ${inputData.actionDetails}
    Objective: ${inputData.objective}

    Please:
    1. Perform the requested action
    2. Take a snapshot after the action to show the result
    3. Analyze if the action was successful
    4. Determine if we've achieved the objective or if more actions are needed
    5. Describe the current state of the page

    Be precise and report exactly what happened.`;
    
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

    logger.info(`Action execution completed: ${inputData.selectedAction}. Next step needed: ${nextStepNeeded}`);
    
    return {
      actionResult,
      pageState: actionResult,
      nextStepNeeded,
    };
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
      throw new Error('Input data not found');
    }

    // Simple completion logic - in a real implementation this could be more sophisticated
    const isComplete = !inputData.nextStepNeeded;

    logger.info(`Workflow completion assessment: ${isComplete ? 'Complete' : 'Incomplete'}. Next step needed: ${inputData.nextStepNeeded}`);
    
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