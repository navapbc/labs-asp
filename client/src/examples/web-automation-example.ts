import { mastra } from '../mastra';
import { actionPlanningStep } from '../mastra/workflows/web-automation-workflow';
import { select, input } from '@inquirer/prompts';

async function runWebAutomationWorkflow() {
  console.log('🚀 Starting Web Automation Workflow');
  
  // Get user input for the automation objective
  const url = await input({
    message: 'Enter the website URL to automate:',
    default: 'https://example.com',
  });

  const objective = await input({
    message: 'What do you want to accomplish on this website?',
    default: 'Navigate and explore the website',
  });

  // Get the workflow and create a run
  const workflow = mastra.getWorkflow('webAutomationWorkflow');
  const run = await workflow.createRunAsync();

  console.log(`\n📝 Objective: ${objective}`);
  console.log(`🌐 URL: ${url}\n`);

  // Start the workflow
  const result = await run.start({
    inputData: { url, objective },
  });

  console.log('\n📊 Initial Result:', result.status);

  // Handle the suspend/resume loop
  let currentResult = result;
  let iterationCount = 0;
  const maxIterations = 5; // Prevent infinite loops

  while (currentResult.status === 'suspended' && iterationCount < maxIterations) {
    iterationCount++;
    console.log(`\n🔄 Iteration ${iterationCount} - Workflow suspended, need user input`);

    // Check if this is the action planning step that's suspended
    const suspendedSteps = currentResult.suspended;
    if (suspendedSteps && suspendedSteps.length > 0) {
      const stepId = suspendedSteps[0];
      
      if (stepId.includes('action-planning')) {
        // Get the page analysis from the navigation step
        const navigationStepResult = currentResult.steps?.['navigation'];
        if (navigationStepResult?.status === 'success') {
          const { pageAnalysis, availableActions } = navigationStepResult.output;
          
          console.log('\n📋 Page Analysis:');
          console.log(pageAnalysis);
          
          console.log('\n🎯 Available Actions:');
          availableActions.forEach((action: string, index: number) => {
            console.log(`${index + 1}. ${action}`);
          });

          // Get user input for the next action
          const selectedAction = await select<string>({
            message: 'Choose your next action:',
            choices: availableActions.map((action: string) => ({
              name: action,
              value: action,
            })),
          });

          const actionDetails = await input({
            message: 'Provide any additional details for this action (e.g., text to search, element to click):',
            default: '',
          });

          console.log(`\n🎬 Selected Action: ${selectedAction}`);
          if (actionDetails) {
            console.log(`📝 Details: ${actionDetails}`);
          }

          // Resume the workflow with the user's choice
          currentResult = await run.resume({
            step: actionPlanningStep,
            resumeData: {
              selectedAction,
              actionDetails,
            },
          });

          console.log(`\n✅ Resumed - Status: ${currentResult.status}`);
        }
      }
    }

    // If completed, show final results
    if (currentResult.status === 'success') {
      console.log('\n🎉 Workflow completed successfully!');
      
      const completionStep = currentResult.steps?.['completion'];
      if (completionStep?.status === 'success') {
        const { isComplete, summary, nextActions } = completionStep.output;
        
        console.log('\n📝 Final Summary:');
        console.log(summary);
        
        if (!isComplete && nextActions) {
          console.log('\n🔄 Suggested next actions:');
          nextActions.forEach((action: string, index: number) => {
            console.log(`${index + 1}. ${action}`);
          });
          
          const continueWorkflow = await select({
            message: 'Would you like to continue with more actions?',
            choices: [
              { name: 'Yes, continue automation', value: true },
              { name: 'No, finish here', value: false },
            ],
          });

          if (continueWorkflow) {
            console.log('\n🔄 To continue, you could start a new workflow run or implement looping logic');
          }
        }
      }
      break;
    }

    // Handle failure
    if (currentResult.status === 'failed') {
      console.log('\n❌ Workflow failed');
      console.error(currentResult.error);
      break;
    }
  }

  if (iterationCount >= maxIterations) {
    console.log('\n⚠️ Maximum iterations reached. Workflow may need manual intervention.');
  }

  console.log('\n🏁 Web automation session ended');
}

// Run the example
runWebAutomationWorkflow().catch((error) => {
  console.error('❌ Error running web automation workflow:', error);
});

export { runWebAutomationWorkflow }; 