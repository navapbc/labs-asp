import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { createScreenshotSession, generateScreenshotFilename } from '../../utils/screenshot-manager';

const websiteAnalysisStep = createStep({
  id: 'website-analysis',
  description: 'Analyzes a website by taking screenshots and extracting key information',
  inputSchema: z.object({
    url: z.string().describe('The URL of the website to analyze'),
    task: z.string().describe('Specific task or information to extract from the website'),
  }),
  outputSchema: z.object({
    analysis: z.string().describe('Analysis results from the web automation agent'),
    screenshots: z.array(z.string()).describe('Paths to screenshots taken'),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('webAutomationAgent');
    if (!agent) {
      throw new Error('Web automation agent not found');
    }

    // Create a screenshot session for this workflow execution
    const sessionId = createScreenshotSession();
    const screenshotFilename = generateScreenshotFilename(sessionId, 'website-analysis');
    
    const prompt = `Please analyze the website at ${inputData.url} and help me with this task: ${inputData.task}

    Follow these steps:
    1. Navigate to the website
    2. Take a screenshot using EXACTLY this filename: "${screenshotFilename}"
    3. Analyze the page content and structure
    4. Perform any necessary interactions based on the task
    5. If you need additional screenshots, I will provide the exact filenames to use
    6. Provide a summary of what you found and accomplished
    
    CRITICAL: Use EXACTLY this filename for the screenshot: "${screenshotFilename}"
    Do not modify or change this filename in any way.
    
    Be thorough and explain each step you're taking.`;

    console.log(`Starting web automation for: ${inputData.url}`);
    
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

    // Return expected screenshot files
    // In a production implementation, you'd parse the agent's tool calls to extract actual filenames
    const expectedScreenshots = [screenshotFilename];
    
    return {
      analysis: analysisText,
      screenshots: expectedScreenshots,
    };
  },
});



export const webAutomationWorkflow = createWorkflow({
  id: 'web-automation-workflow',
  inputSchema: z.object({
    url: z.string().describe('The URL of the website to work with'),
    task: z.string().describe('The specific task to perform on the website'),
  }),
  outputSchema: z.object({
    analysis: z.string().describe('Analysis results from the web automation agent'),
    screenshots: z.array(z.string()).describe('Paths to screenshots taken'),
  }),
})
  .then(websiteAnalysisStep);

webAutomationWorkflow.commit(); 