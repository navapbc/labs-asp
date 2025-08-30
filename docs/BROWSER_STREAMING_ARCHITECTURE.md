# Browser Streaming Architecture

## Overview

The browser streaming system provides real-time visualization of web automation tasks by streaming browser screenshots from the Mastra agent to the chat client via WebSocket.

## Architecture Flow

```
Chat Client                      Agent Server                     Browser Automation
    |                                |                                  |
    |-- 1. User sends message ------>|                                  |
    |   (with automation request)    |                                  |
    |                                |--- 2. Start automation --------->|
    |                                |   (Playwright MCP tools)         |
    |                                |                                  |
    |-- 3. Tool detection ---------->|                                  |
    |   triggers browser panel       |<-- 4. Chrome CDP start ----------|
    |                                |   (auto-detect process)          |
    |                                |                                  |
    |-- 5. GET /api/browser-stream ->|                                  |
    |   ?sessionId=chat_id           |                                  |
    |                                |                                  |
    |<- 6. WebSocket URL ------------|                                  |
    |   ws://localhost:8933          |                                  |
    |                                |                                  |
    |-- 7. WebSocket connect ------->|                                  |
    |   to streaming service         |                                  |
    |                                |                                  |
    |-- 8. start-streaming --------->|                                  |
    |   {type: "start-streaming"}    |--- 9. Page.startScreencast ----->|
    |                                |   (CDP command)                  |
    |                                |                                  |
    |<- 10. streaming-started -------|<-- 11. screencast ready ---------|
    |                                |                                  |
    |<- 12. frame data --------------|<-- continuous frames ------------|
    |   {type: "frame",              |   (base64 JPEG)                  |
    |    data: "base64_jpeg"}        |                                  |
    |                                |                                  |
    |-- 13. Canvas render ---------->|                                  |
    |   (HTML5 canvas display)       |                                  |
    |                                |                                  |
    |<- 14. frame data --------------|<-- continuous frames ------------|
    |   (real-time streaming)        |   (1 FPS)                        |
    |                                |                                  |
    |-- 15. stop-streaming --------->|                                  |
    |   (user closes panel)          |--- 16. Page.stopScreencast ----->|
    |                                |                                  |
    |<- 17. streaming-stopped -------|<-- 18. cleanup complete ---------|
    |                                |                                  |
    |-- 19. WebSocket close -------->|                                  |
```

## Components

### Server Side (Agent Repo)

**Browser Streaming Service** (`src/mastra/browser-streaming.ts`)
- WebSocket server on port 8933
- Connects to Playwright's Chrome via DevTools Protocol (CDP)
- Captures screenshots using `Page.startScreencast()`
- Streams base64 JPEG frames to connected clients
- Auto-detects Chrome process and CDP port dynamically

**MCP Integration** (`src/mastra/mcp.ts`)
- Initializes browser streaming service alongside Playwright MCP
- Handles service lifecycle and cleanup

**Web Automation Agent** (`src/mastra/agents/web-automation-agent.ts`)
- Uses Playwright tools for browser automation
- Configured with 50-step limit via `stepCountIs(50)`
- Integrates with memory and database tools

### Client Side (Client Repo)

**Browser Panel** (`client/components/browser-panel.tsx`)
- React component with HTML5 canvas for displaying browser frames
- WebSocket client that connects to streaming service
- Auto-connects when panel becomes visible
- Connection management with error handling

**API Route** (`client/app/api/browser-stream/route.ts`)
- Next.js API endpoint providing WebSocket connection info
- Returns streaming service URL and session details
- Configurable via `BROWSER_STREAMING_PORT` and `BROWSER_STREAMING_HOST`

**Chat Integration** (`client/components/chat.tsx`)
- Detects browser tool usage in message parts
- Auto-shows browser panel when Playwright tools are used
- Split-screen layout: chat on left, browser view on right

**Message Display** (`client/components/message.tsx`)
- Tool name mapping for user-friendly descriptions
- Collapsible sections showing tool inputs/outputs
- Handles both `playwright_browser` and `mcp_playwright_browser` tools

## Data Flow

1. **Tool Detection**: Chat interface monitors messages for browser tool calls
2. **Panel Activation**: Browser panel automatically appears when tools detected
3. **WebSocket Setup**: Panel fetches connection info from API route
4. **CDP Connection**: Streaming service connects to Playwright's Chrome
5. **Frame Capture**: Chrome CDP streams screenshots via `startScreencast()`
6. **WebSocket Streaming**: Frames sent as base64 JPEG to connected clients
7. **Canvas Rendering**: Browser panel displays frames on HTML5 canvas

## Configuration

### Environment Variables

**Agent Repo:**
- `BROWSER_STREAMING_PORT` - WebSocket server port (default: 8933)

**Client Repo:**
- `BROWSER_STREAMING_HOST` - Streaming service host (default: localhost)
- `BROWSER_STREAMING_PORT` - Streaming service port (default: 8933)

### Session Management

- Each chat session gets unique browser streaming session ID
- Multiple concurrent sessions supported
- Automatic cleanup on client disconnect
- Connection retry logic with error handling

## Development Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/navapbc/labs-asp.git
cd labs-asp
git checkout feat/add-browser-websocket

# Agent repo - start streaming service
pnpm install
pnpm dev

# Client repo - start chat interface  
cd client
pnpm install
pnpm dev
```

The browser panel will automatically appear during web automation tasks and stream live browser content in real-time.
