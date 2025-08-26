import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { createScreenshotSession, generateScreenshotFilename } from '../../utils/screenshot-manager';

const extractDataStep = createStep({
  id: 'extract-data',
  description: 'Extracts specific data from a website based on user requirements',
  inputSchema: z.object({
    url: z.string().describe('The URL to extract data from'),
    dataType: z.string().describe('Type of data to extract (e.g., "product prices", "article headlines", "contact info")'),
    selectors: z.array(z.string()).optional().describe('Optional CSS selectors to target specific elements'),
  }),
  outputSchema: z.object({
    extractedData: z.string().describe('The extracted data in a structured format'),
    dataCount: z.number().describe('Number of data items extracted'),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('webAutomationAgent');
    if (!agent) {
      throw new Error('Web automation agent not found');
    }

    const sessionId = createScreenshotSession();
    const screenshotFilename = generateScreenshotFilename(sessionId, 'data-extraction');
    
    const selectorsInfo = inputData.selectors 
      ? `Use these CSS selectors if helpful: ${inputData.selectors.join(', ')}`
      : 'Find appropriate selectors for the data type requested.';

    const prompt = `Please extract ${inputData.dataType} from the website at ${inputData.url}.

    Steps to follow:
    1. Navigate to the website
    2. Take a screenshot using EXACTLY this filename: "${screenshotFilename}"
    3. Locate elements containing ${inputData.dataType}
    4. Extract the data systematically
    5. ${selectorsInfo}
    6. Format the extracted data in a clear, structured way
    7. Count how many items were extracted
    
    CRITICAL: Use EXACTLY this filename for the screenshot: "${screenshotFilename}"
    
    Provide the extracted data in a JSON-like format for easy parsing.`;

    console.log(`Extracting ${inputData.dataType} from: ${inputData.url}`);
    
    const response = await agent.stream([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    let extractedText = '';

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      extractedText += chunk;
    }

    // Simple count estimation - in a real implementation, you'd parse the actual extracted data
    const dataCount = Math.max(1, (extractedText.match(/\n/g) || []).length);

    return {
      extractedData: extractedText,
      dataCount,
    };
  },
});

export const dataExtractionWorkflow = createWorkflow({
  id: 'data-extraction-workflow',
  inputSchema: z.object({
    url: z.string().describe('The URL to extract data from'),
    dataType: z.string().describe('Type of data to extract'),
    selectors: z.array(z.string()).optional().describe('Optional CSS selectors'),
  }),
  outputSchema: z.object({
    extractedData: z.string().describe('The extracted data in a structured format'),
    dataCount: z.number().describe('Number of data items extracted'),
  }),
})
  .then(extractDataStep);

dataExtractionWorkflow.commit(); 