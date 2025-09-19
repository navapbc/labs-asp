# Client Architecture Documentation

## Overview

The `client` folder contains a Next.js 15 application that serves as the frontend for an AI-powered web automation platform. This application integrates with Vercel's infrastructure and provides a sophisticated chat interface with real-time browser automation capabilities.


## Web Automation Agent Architecture

### Core Components

#### 1. Mastra Integration
The application integrates with Mastra, an AI agent framework, to provide web automation capabilities:

```typescript
// Import the built Mastra app from local client build
import { ft as builtMastra } from '../../.mastra/output/mastra.mjs';

export const mastra = builtMastra;
```

#### 2. Browser Artifact System

**Client-side (`client.tsx`)**:
- Real-time browser frame streaming via WebSocket
- Interactive canvas for user input (click, type, scroll)
- Control mode switching (agent vs user control)
- Live frame rendering with 16:9 aspect ratio support

**Server-side (`server.ts`)**:
- Document creation and management for browser sessions
- Session metadata handling
- Content streaming for browser automation descriptions

#### 3. Browser Streaming API

Provides WebSocket connection information for real-time browser streaming:

```typescript
export async function GET(request: NextRequest) {
  const streamingPort = process.env.BROWSER_STREAMING_PORT || '8933';
  const streamingHost = process.env.BROWSER_STREAMING_HOST || 'localhost';
  
  return new Response(JSON.stringify({
    type: 'websocket-info',
    url: `ws://${streamingHost}:${streamingPort}`,
    sessionId,
    message: 'Connect to this WebSocket URL for browser streaming'
  }));
}
```

### Web Automation Flow

#### 1. Model Selection
Users can select the "Web Automation Agent" model from the chat interface:

```typescript
{
  id: 'web-automation-model',
  name: 'Web Automation Agent',
  description: 'AI agent for web navigation and automation tasks',
}
```

#### 2. Chat API Integration

When the web automation model is selected, the system:

1. **Retrieves the Mastra agent**:
   ```typescript
   const webAutomationAgent = mastra.getAgent('webAutomationAgent');
   ```

2. **Converts messages to Mastra format**:
   ```typescript
   const mastraMessages = uiMessages.map((msg) => ({
     role: msg.role,
     content: msg.parts.map(part => part.type === 'text' ? part.text : '').join('\n')
   }));
   ```

3. **Streams the agent response**:
   ```typescript
   const stream = await webAutomationAgent.streamVNext(mastraMessages, {
     format: 'aisdk', // Enable AI SDK v5 compatibility
     memory: {
       thread: id, // Use the chat ID as the thread ID
       resource: session.user.id, // Use the user ID as the resource ID
     }
   });
   ```

#### 3. Browser Panel Integration

The browser panel provides:

- **Real-time frame streaming**: Receives base64-encoded browser screenshots
- **Interactive controls**: Click, type, scroll, and keyboard input
- **Control mode switching**: Toggle between agent and user control
- **Connection management**: Auto-connect/disconnect functionality
- **Error handling**: Robust error states and retry mechanisms

### Vercel Integration

#### 1. Deployment Configuration

The application is configured for Vercel deployment with:

- **Next.js 15** with App Router
- **Vercel Functions** for serverless API routes
- **Vercel Postgres** for database storage
- **Vercel Blob** for file storage
- **Vercel Analytics** for usage tracking

#### 2. Environment Variables

Key environment variables for Vercel deployment:

```bash
# Database
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...

# Authentication
AUTH_SECRET=your-secret-key
AUTH_TRUST_HOST=true

# AI Providers
OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...

# Browser Streaming
BROWSER_STREAMING_PORT=8933
BROWSER_STREAMING_HOST=localhost

# Vercel
VERCEL_URL=your-app.vercel.app
```

#### 3. Build Process

The build process includes:

```json
{
  "scripts": {
    "build": "pnpm mastra:build && tsx lib/db/migrate && next build",
    "mastra:build": "npx mastra build --dir ../src/mastra"
  }
}
```

1. **Mastra build**: Compiles the AI agent configuration
2. **Database migration**: Runs pending database migrations
3. **Next.js build**: Builds the React application

#### 4. API Routes

The application exposes several API endpoints:

- **`/api/chat`**: Main chat streaming endpoint
- **`/api/browser-stream`**: Browser streaming WebSocket info
- **`/api/document`**: Document management
- **`/api/files`**: File upload/download
- **`/api/history`**: Chat history retrieval
- **`/api/suggestions`**: AI-powered suggestions
- **`/api/vote`**: Message voting system

### Database Schema

The application uses PostgreSQL with the following key tables:

- **`User`**: User accounts and authentication
- **`Chat`**: Chat sessions with visibility settings
- **`Message`**: Individual messages with parts and attachments
- **`Document`**: Artifacts including browser sessions
- **`Suggestion`**: AI-generated suggestions for documents
- **`Vote`**: User voting on messages

### Testing Infrastructure

#### 1. Playwright Configuration (`playwright.config.ts`)

- **End-to-end testing** with Playwright
- **Multiple browser support** (Chrome, Firefox, Safari)
- **Mobile testing** capabilities
- **Parallel test execution**
- **Trace collection** for debugging


### Key Features

#### 1. Real-time Browser Automation
- Live browser frame streaming
- Interactive user controls
- Agent vs user control modes
- Session management

#### 2. AI Integration
- Multiple AI model support
- Reasoning capabilities
- Tool calling for automation
- Memory management

#### 3. Artifact System
- Document creation and editing
- Code generation and execution
- Spreadsheet creation
- Browser session management

#### 4. User Experience
- Responsive design with Tailwind CSS
- Dark/light theme support
- Accessibility features
- Mobile-friendly interface

### Security Considerations

1. **Authentication**: Auth.js integration with secure session management
2. **Rate limiting**: Message limits per user type
3. **Input validation**: Zod schema validation for all inputs
4. **CORS configuration**: Proper CORS headers for API routes
5. **Environment variables**: Secure handling of sensitive data

### Performance Optimizations

1. **Streaming responses**: Real-time data streaming for better UX
2. **Image optimization**: Next.js Image component for efficient image handling
3. **Code splitting**: Dynamic imports for better bundle size
4. **Caching**: Strategic caching for database queries
5. **WebSocket optimization**: Efficient frame streaming with throttling

### Monitoring and Observability

1. **Vercel Analytics**: Built-in usage tracking
2. **Error handling**: Comprehensive error states and logging
3. **Performance monitoring**: Built-in Next.js performance metrics
4. **Database monitoring**: Query performance tracking
5. **WebSocket monitoring**: Connection health tracking

This architecture provides a robust foundation for AI-powered web automation with real-time capabilities, seamless Vercel integration, and a modern user experience.
