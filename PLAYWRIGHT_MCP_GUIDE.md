# Playwright MCP Integration Guide

This guide explains how to use the Playwright MCP (Model Context Protocol) integration in your Mastra test app for web automation tasks.

## What's New

Your Mastra app now includes:

- **Web Automation Agent**: An AI agent that can interact with websites using Playwright
- **MCP Integration**: Connected to the Microsoft Playwright MCP server
- **Web Automation Workflows**: Pre-built workflows for website analysis and data extraction
- **Example Scripts**: Ready-to-use examples demonstrating various capabilities

## Features

The Playwright MCP integration provides these capabilities:

- 📸 **Screenshot capture** of web pages
- 🔍 **Data extraction** from websites
- 📝 **Form filling** and submission
- 🖱️ **Element interaction** (clicking, typing, etc.)
- 🔄 **Page navigation** and monitoring
- 📊 **Website analysis** and reporting

## Getting Started

### 1. Run the Development Server

```bash
pnpm dev
```

### 2. Test the Integration

You can test the Playwright MCP integration by running the example script:

```bash
# Run the examples (when implemented in your dev environment)
node src/examples/web-automation-example.ts
```

### 3. Use the Web Automation Agent

```typescript
import { mastra } from './src/mastra';

const agent = mastra.getAgent('webAutomationAgent');

// Take a screenshot and analyze a website
const response = await agent.stream([
  {
    role: 'user',
    content: 'Please visit https://example.com and take a screenshot. Analyze what you see.'
  }
]);

// Stream the response
for await (const chunk of response.textStream) {
  process.stdout.write(chunk);
}
```

## Available Components

### Agents
- **webAutomationAgent**: Main agent for web automation tasks

### Workflows
- **webAutomationWorkflow**: Website analysis and screenshot workflow
- **dataExtractionWorkflow**: Structured data extraction workflow

### Helper Functions

```typescript
import { webAutomationHelpers } from './src/examples/web-automation-example';

// Take a screenshot
await webAutomationHelpers.takeScreenshot('https://example.com');

// Extract data
await webAutomationHelpers.extractData('https://news.ycombinator.com', 'article headlines');

// Analyze a website
await webAutomationHelpers.analyzeWebsite('https://example.com', 'SEO');

// Fill a form
await webAutomationHelpers.fillForm('https://httpbin.org/forms/post', {
  name: 'TestUser',
  email: 'test@example.com'
});
```

## Use Cases

Here are some practical applications:

### 1. Website Monitoring
Monitor websites for changes, downtime, or updates:

```typescript
const agent = mastra.getAgent('webAutomationAgent');
await agent.stream([
  {
    role: 'user',
    content: 'Visit https://mystartup.com and take a screenshot. Check if the site is working properly and report any issues you notice.'
  }
]);
```

### 2. Competitive Analysis
Analyze competitor websites:

```typescript
await agent.stream([
  {
    role: 'user',
    content: 'Visit https://competitor.com and analyze their pricing page. Extract pricing information and summarize their offerings.'
  }
]);
```

### 3. Data Extraction
Extract structured data from websites:

```typescript
await agent.stream([
  {
    role: 'user',
    content: 'Go to https://news.ycombinator.com and extract the top 10 article headlines with their scores and comment counts.'
  }
]);
```

### 4. Form Automation
Automate form filling and testing:

```typescript
await agent.stream([
  {
    role: 'user',
    content: 'Visit our contact form at https://mysite.com/contact and test it by filling it out with test data and submitting it.'
  }
]);
```

### 5. SEO Analysis
Analyze websites for SEO optimization:

```typescript
await agent.stream([
  {
    role: 'user',
    content: 'Analyze https://mywebsite.com for SEO. Check the title tags, meta descriptions, heading structure, and page performance.'
  }
]);
```

## Tips for Best Results

1. **Be Specific**: Provide clear, detailed instructions to the agent
2. **Use Screenshots**: Always ask for screenshots to understand page context
3. **Break Down Complex Tasks**: Split complex automation into smaller steps
4. **Handle Timeouts**: The agent will wait for elements to load, but be patient
5. **Test Selectors**: If extracting specific data, you can suggest CSS selectors

## Advanced Usage

### Custom Prompts
You can create more sophisticated automation by providing detailed step-by-step instructions:

```typescript
const complexTask = `
Please perform the following steps:
1. Visit https://example-ecommerce.com
2. Take a screenshot of the homepage
3. Search for "wireless headphones"
4. Take a screenshot of the search results
5. Click on the first product
6. Extract the product name, price, and rating
7. Take a final screenshot of the product page
8. Summarize what you found
`;

await agent.stream([{ role: 'user', content: complexTask }]);
```

### Error Handling
The agent is designed to handle common web automation challenges:
- Waiting for elements to load
- Handling popup dialogs
- Dealing with slow-loading pages
- Retrying failed interactions

## Troubleshooting

If you encounter issues:

1. **Check Network Connection**: Ensure you can access the target websites
2. **Verify Playwright Installation**: The MCP server will auto-install Playwright browsers
3. **Review Agent Instructions**: Make sure your prompts are clear and specific
4. **Check for Rate Limiting**: Some websites may block automated requests

## What's Different from Weather App

Unlike the weather-focused demo, this integration provides:

- **Real browser automation** instead of API calls
- **Visual feedback** through screenshots
- **Interactive capabilities** beyond data retrieval
- **Flexible task handling** for any website or web application
- **No API key requirements** for basic web automation

This makes your Mastra app much more versatile for real-world automation tasks! 