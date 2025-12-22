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
    2. Analyze what actions are possible on this page (forms, buttons, links, etc.)
    3. Identify key elements that could help achieve the objective

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
    2. For fields that might have format masks (date fields, SSN, phone fields):
       - Click the field first to activate it and reveal any format masks
       - Then type the data in the appropriate format
    3. If a field doesn't accept input on first try, click it to activate before typing
    4. If you're adding an address field and a suggested address is displayed, always select and use the suggested address
    5. Analyze if the action was successful
    6. Determine if we've achieved the objective or if more actions are needed
    7. If more actions are needed, describe the current state of the page

    Follow the Form Field Protocol from your instructions.

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

// Step 4: Check for missing form data and pause for user input if needed
const formDataCheckStep = createStep({
  id: 'form-data-check',
  description: 'Check if form data is missing and pause for user input if needed',
  inputSchema: z.object({
    actionResult: z.string().describe('Result of the executed action'),
    pageState: z.string().describe('Current state of the page after the action'),
    nextStepNeeded: z.boolean().describe('Whether another action step is needed'),
  }),
  outputSchema: z.object({
    actionResult: z.string().describe('Result of the executed action'),
    pageState: z.string().describe('Current state of the page after the action'),
    nextStepNeeded: z.boolean().describe('Whether another action step is needed'),
    missingFields: z.array(z.string()).optional().describe('List of missing form fields if any'),
    formDataProvided: z.record(z.string()).optional().describe('Form data provided by user'),
  }),
  suspendSchema: z.object({
    missingFields: z.array(z.string()).describe('List of all missing form fields that need user input'),
    pageState: z.string().describe('Current state of the page'),
  }),
  resumeSchema: z.object({
    formData: z.record(z.string()).describe('All form field values provided by the user, keyed by field name'),
  }),
  execute: async ({ inputData, resumeData, suspend, mastra }) => {
    if (!inputData) {
      const error = new Error('Input data not found');
      logger.error('Form data check step failed: Input data not found', { error });
      throw error;
    }

    // If resuming with user-provided data, fill all fields at once
    if (resumeData?.formData && Object.keys(resumeData.formData).length > 0) {
      logger.info(`Resuming workflow with user-provided form data for ${Object.keys(resumeData.formData).length} fields`);
      
      const agent = mastra?.getAgent('webAutomationAgent');
      if (!agent) {
        const error = new Error('Web automation agent not found');
        logger.error('Form data check step failed: Agent not found', { error });
        throw error;
      }

      // Format the form data for the prompt
      const formDataList = Object.entries(resumeData.formData)
        .map(([fieldName, fieldValue]) => `- ${fieldName}: ${fieldValue}`)
        .join('\n');

      // Use the agent to fill in all provided field values
      const fillPrompt = `Fill in all the form fields with the user-provided values:

      Form Fields to Fill:
      ${formDataList}
      
      Current Page State: ${inputData.pageState}

      Please:
      1. Locate each form field on the page
      2. Fill each field with its corresponding value
      3. Check if there are any other missing required fields
      4. Report the updated page state

      Respond in this exact format:
      STATUS: [ALL_FIELDS_FILLED or MORE_FIELDS_NEEDED]
      FIELDS_FILLED: [comma-separated list of all fields that were filled]
      REMAINING_FIELDS: [comma-separated list of any remaining missing fields, or "NONE"]
      PAGE_STATE: [description of current page state]`;

      try {
        const response = await agent.stream([
          {
            role: 'user',
            content: fillPrompt,
          },
        ]);

        let fillResult = '';
        for await (const chunk of response.textStream) {
          process.stdout.write(chunk);
          fillResult += chunk;
        }

        // Parse the response to check for more missing fields
        const hasMoreFields = fillResult.includes('STATUS: MORE_FIELDS_NEEDED');
        const remainingFieldsMatch = fillResult.match(/REMAINING_FIELDS: ([^\n]+)/);
        
        const remainingFields = remainingFieldsMatch?.[1] 
          ? remainingFieldsMatch[1].split(',').map(f => f.trim()).filter(f => f !== 'NONE')
          : [];

        logger.info(`Fields filled: ${Object.keys(resumeData.formData).length}. More fields needed: ${hasMoreFields}. Remaining: ${remainingFields.length}`);

        // If there are more missing fields, suspend again to get all remaining fields
        if (hasMoreFields && remainingFields.length > 0) {
          logger.info(`More missing fields detected. Pausing for ${remainingFields.length} remaining fields`);
          
          return suspend({
            missingFields: remainingFields,
            pageState: fillResult,
          });
        }

        return {
          actionResult: fillResult,
          pageState: fillResult,
          nextStepNeeded: inputData.nextStepNeeded,
          missingFields: remainingFields.length > 0 ? remainingFields : undefined,
          formDataProvided: resumeData.formData,
        };
      } catch (error) {
        logger.error(`Failed to fill form fields - ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }

    // Check if there are missing form fields in the action result
    const agent = mastra?.getAgent('webAutomationAgent');
    if (!agent) {
      const error = new Error('Web automation agent not found');
      logger.error('Form data check step failed: Agent not found', { error });
      throw error;
    }

    logger.info('Checking for missing form data in action result');

    const checkPrompt = `Analyze the action result and page state to determine if there are any missing required form fields that need user input.

    Action Result: ${inputData.actionResult}
    Page State: ${inputData.pageState}

    Please:
    1. Examine the page state and action result carefully
    2. Identify ALL required form fields that are empty or missing data
    3. Determine which fields cannot be automatically filled from available data
    4. List ALL missing fields that need user input (we will ask for all of them at once)

    Respond in this exact format:
    HAS_MISSING_FIELDS: [YES or NO]
    ALL_MISSING_FIELDS: [comma-separated list of ALL missing fields, or "NONE" if no missing fields]

    Be specific about field names (e.g., "Social Security Number", "Date of Birth", "Phone Number").`;

    try {
      const response = await agent.stream([
        {
          role: 'user',
          content: checkPrompt,
        },
      ]);

      let checkResult = '';
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        checkResult += chunk;
      }

      // Parse the agent's response
      const hasMissingFields = checkResult.includes('HAS_MISSING_FIELDS: YES');
      const allFieldsMatch = checkResult.match(/ALL_MISSING_FIELDS: ([^\n]+)/);

      const allMissingFields = allFieldsMatch?.[1]?.trim()
        ? allFieldsMatch[1].split(',').map(f => f.trim()).filter(f => f !== 'NONE')
        : [];

      if (hasMissingFields && allMissingFields.length > 0) {
        logger.info(`Missing form fields detected: ${allMissingFields.length} fields. Pausing for user input (all fields at once).`);
        
        // Suspend the workflow to get user input for all missing fields at once
        return suspend({
          missingFields: allMissingFields,
          pageState: inputData.pageState,
        });
      } else {
        logger.info('No missing form fields detected. Continuing workflow.');
        
        return {
          actionResult: inputData.actionResult,
          pageState: inputData.pageState,
          nextStepNeeded: inputData.nextStepNeeded,
          missingFields: allMissingFields.length > 0 ? allMissingFields : undefined,
        };
      }
    } catch (error) {
      logger.error(`Form data check failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
});

// Step 5: Application summary step - stops with summary when application is finished
const applicationSummaryStep = createStep({
  id: 'application-summary',
  description: 'Generate and display application summary when all required fields are filled',
  inputSchema: z.object({
    actionResult: z.string().describe('Result of the executed action'),
    pageState: z.string().describe('Current state of the page after the action'),
    nextStepNeeded: z.boolean().describe('Whether another action step is needed'),
    missingFields: z.array(z.string()).optional().describe('List of missing form fields if any'),
    formDataProvided: z.record(z.string()).optional().describe('Form data provided by user'),
  }),
  outputSchema: z.object({
    actionResult: z.string().describe('Result of the executed action'),
    pageState: z.string().describe('Current state of the page after the action'),
    nextStepNeeded: z.boolean().describe('Whether another action step is needed'),
    missingFields: z.array(z.string()).optional().describe('List of missing form fields if any'),
    formDataProvided: z.record(z.string()).optional().describe('Form data provided by user'),
    applicationSummary: z.string().optional().describe('Summary of the completed application'),
    isApplicationComplete: z.boolean().describe('Whether the application is complete'),
  }),
  suspendSchema: z.object({
    applicationSummary: z.string().describe('Comprehensive summary of the completed application'),
    pageState: z.string().describe('Final state of the page'),
    filledFields: z.array(z.string()).optional().describe('List of all fields that were filled'),
  }),
  resumeSchema: z.object({
    acknowledged: z.boolean().optional().describe('User acknowledgment that they have reviewed the summary'),
  }),
  execute: async ({ inputData, resumeData, suspend, mastra }) => {
    if (!inputData) {
      const error = new Error('Input data not found');
      logger.error('Application summary step failed: Input data not found', { error });
      throw error;
    }

    // Check if application is finished (all required fields filled)
    const isApplicationComplete = !inputData.nextStepNeeded && 
                                  (!inputData.missingFields || inputData.missingFields.length === 0);

    // If resuming after user reviewed the summary, continue
    if (resumeData?.acknowledged) {
      logger.info('User acknowledged application summary. Continuing workflow.');
      // Use actionResult as the summary since it contains the application state
      return {
        actionResult: inputData.actionResult,
        pageState: inputData.pageState,
        nextStepNeeded: inputData.nextStepNeeded,
        missingFields: inputData.missingFields,
        formDataProvided: inputData.formDataProvided,
        applicationSummary: inputData.actionResult, // Summary was shown to user via suspend
        isApplicationComplete,
      };
    }

    // If application is not complete, continue without summary
    if (!isApplicationComplete) {
      logger.info('Application not yet complete. Missing fields or next step needed. Continuing workflow.');
      return {
        actionResult: inputData.actionResult,
        pageState: inputData.pageState,
        nextStepNeeded: inputData.nextStepNeeded,
        missingFields: inputData.missingFields,
        formDataProvided: inputData.formDataProvided,
        isApplicationComplete: false,
      };
    }

    // Application is complete - generate comprehensive summary
    logger.info('Application is complete. Generating summary...');

    const agent = mastra?.getAgent('webAutomationAgent');
    if (!agent) {
      const error = new Error('Web automation agent not found');
      logger.error('Application summary step failed: Agent not found', { error });
      throw error;
    }

    const summaryPrompt = `Generate a comprehensive summary of the completed application.

    Page State: ${inputData.pageState}
    Action Result: ${inputData.actionResult}
    Form Data Provided: ${inputData.formDataProvided ? JSON.stringify(inputData.formDataProvided, null, 2) : 'None'}

    Please:
    1. Review all form fields that were filled in
    2. Create a comprehensive summary that includes:
       - All fields that were filled and their values (if visible/appropriate)
       - Any important information captured
       - Current status of the application
       - What page/section the application is currently on
       - Any next steps or actions that may be needed (like submission)
    4. Be clear and organized in your summary
    5. Do NOT submit the application - just provide the summary and ask user to review it and complete the CAPTCHA if needed

    Format your summary clearly with sections if helpful. This summary will be shown to the user to review the completed application.`;

    try {
      const response = await agent.stream([
        {
          role: 'user',
          content: summaryPrompt,
        },
      ]);

      let summaryText = '';
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        summaryText += chunk;
      }

      // Extract filled fields from the summary or form data
      const filledFields: string[] = [];
      if (inputData.formDataProvided) {
        filledFields.push(...Object.keys(inputData.formDataProvided));
      }

      logger.info(`Application summary generated. Summary length: ${summaryText.length} chars. Filled fields: ${filledFields.length}`);

      // Suspend with the summary so user can review it
      return suspend({
        applicationSummary: summaryText,
        pageState: inputData.pageState,
        filledFields: filledFields.length > 0 ? filledFields : undefined,
      });
    } catch (error) {
      logger.error(`Failed to generate application summary - ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
});

// Step 6: Completion assessment that can loop back or finish
const completionStep = createStep({
  id: 'completion',
  description: 'Assess if the objective is complete or if more actions are needed',
  inputSchema: z.object({
    actionResult: z.string(),
    pageState: z.string(),
    nextStepNeeded: z.boolean(),
    missingFields: z.array(z.string()).optional(),
    formDataProvided: z.record(z.string()).optional(),
    applicationSummary: z.string().optional(),
    isApplicationComplete: z.boolean(),
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

    // Use application summary if available, otherwise use action result
    const summary = inputData.applicationSummary || inputData.actionResult;
    const isComplete = inputData.isApplicationComplete || 
                      (!inputData.nextStepNeeded && (!inputData.missingFields || inputData.missingFields.length === 0));

    logger.info(`Workflow completion assessment: ${isComplete ? 'Complete' : 'Incomplete'}. Next step needed: ${inputData.nextStepNeeded}. Missing fields: ${inputData.missingFields?.length || 0}. Application complete: ${inputData.isApplicationComplete}`);
    
    return {
      isComplete,
      summary,
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
  .then(formDataCheckStep)
  .then(applicationSummaryStep)
  .then(completionStep);

webAutomationWorkflow.commit();

export { actionPlanningStep, formDataCheckStep, applicationSummaryStep }; 