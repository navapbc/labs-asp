import { mastra } from '../mastra';
import { createScreenshotSession, generateScreenshotFilename } from '../utils/screenshot-manager';

async function runWebAutomationExamples() {
  console.log('🚀 Starting Web Automation Examples with Playwright MCP\n');

  try {
    // Get the web automation agent
    const agent = mastra.getAgent('webAutomationAgent');
    
    // Example 1: Simple website screenshot and analysis
    console.log('📊 Example 1: Taking a screenshot and analyzing a website...\n');
    
    const analysisResponse = await agent.stream([
      {
        role: 'user',
        content: `Please visit https://example.com, take a screenshot, and analyze what you see. Describe the layout, content, and overall design of the page.`
      }
    ]);

    console.log('Analysis Response:');
    for await (const chunk of analysisResponse.textStream) {
      process.stdout.write(chunk);
    }
    
    console.log('\n\n' + '='.repeat(50) + '\n');

    // Example 2: Data extraction
    console.log('🔍 Example 2: Extracting data from a website...\n');
    
    const extractionResponse = await agent.stream([
      {
        role: 'user',
        content: `Please visit https://news.ycombinator.com and extract the top 5 article headlines. Take a screenshot first to see the page, then extract the headlines and their scores if visible.`
      }
    ]);

    console.log('Extraction Response:');
    for await (const chunk of extractionResponse.textStream) {
      process.stdout.write(chunk);
    }
    
    console.log('\n\n' + '='.repeat(50) + '\n');

    // Example 3: Interactive web task
    console.log('🌐 Example 3: Interactive form filling...\n');
    
    const interactiveResponse = await agent.stream([
      {
        role: 'user',
        content: `Go to https://httpbin.org/forms/post and:
        1. Take a screenshot first to see the form
        2. Fill in the form with test data (use "TestUser" for name and "test@example.com" for email)
        3. Take another screenshot to show the filled form
        4. Submit the form and take a final screenshot of the result
        Please explain each step as you do it.`
      }
    ]);

    console.log('Interactive Response:');
    for await (const chunk of interactiveResponse.textStream) {
      process.stdout.write(chunk);
    }

  } catch (error) {
    console.error('❌ Error running web automation examples:', error);
  }
}

// Helper functions for common web automation tasks
export const webAutomationHelpers = {
  // Take a screenshot of any website with proper file saving
  takeScreenshot: async (url: string, context?: string) => {
    const agent = mastra.getAgent('webAutomationAgent');
    const sessionId = createScreenshotSession();
    const filename = generateScreenshotFilename(sessionId, context || 'screenshot');
    
    return agent.stream([
      {
        role: 'user',
        content: `Please visit ${url} and take a screenshot using EXACTLY this filename: "${filename}". After taking the screenshot, confirm the exact filename where it was saved. Describe what you see on the page.`
      }
    ]);
  },

  // Extract specific data from a website
  extractData: async (url: string, dataDescription: string) => {
    const agent = mastra.getAgent('webAutomationAgent');
    const sessionId = createScreenshotSession();
    const screenshotFilename = generateScreenshotFilename(sessionId, 'data-extraction');
    
    return agent.stream([
      {
        role: 'user',
        content: `Please visit ${url} and extract ${dataDescription}. First take a screenshot using EXACTLY this filename: "${screenshotFilename}" to understand the page layout, then extract the requested data in a structured format. Confirm the screenshot filename in your response.`
      }
    ]);
  },

  // Analyze a website for specific purposes
  analyzeWebsite: async (url: string, analysisType: string) => {
    const agent = mastra.getAgent('webAutomationAgent');
    return agent.stream([
      {
        role: 'user',
        content: `Please visit ${url} and perform a ${analysisType} analysis. Take a screenshot and provide detailed insights based on what you observe.`
      }
    ]);
  },

  // Fill and submit a form
  fillForm: async (url: string, formData: Record<string, string>) => {
    const agent = mastra.getAgent('webAutomationAgent');
    const sessionId = createScreenshotSession();
    const initialScreenshot = generateScreenshotFilename(sessionId, 'form-initial');
    const filledScreenshot = generateScreenshotFilename(sessionId, 'form-filled');
    const resultScreenshot = generateScreenshotFilename(sessionId, 'form-result');
    
    const formDataDescription = Object.entries(formData)
      .map(([key, value]) => `${key}: "${value}"`)
      .join(', ');
    
    return agent.stream([
      {
        role: 'user',
        content: `Please visit ${url} and complete this form automation task with these exact screenshots:
        
        1. Take initial screenshot using EXACTLY this filename: "${initialScreenshot}"
        2. Fill out the form with this data: ${formDataDescription}
        3. Take screenshot of filled form using EXACTLY this filename: "${filledScreenshot}"
        4. Submit the form
        5. Take final result screenshot using EXACTLY this filename: "${resultScreenshot}"
        
        CRITICAL: Use the exact filenames provided above. Do not modify them.
        Confirm each screenshot filename in your response.`
      }
    ]);
  }
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWebAutomationExamples()
    .then(() => {
      console.log('\n✅ Web automation examples completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Examples failed:', error);
      process.exit(1);
    });
} 