#!/usr/bin/env node

/**
 * Standalone browser streaming server for Docker container
 * 
 * This service provides real-time browser frame streaming via WebSockets using Chrome DevTools Protocol (CDP).
 * It connects to Playwright-managed Chrome instances and streams screencast frames to connected clients.
 * 
 * The service supports:
 * - Real-time browser frame streaming
 * - User input handling (mouse, keyboard, scroll)
 * - Control mode switching (agent vs user control)
 * - WebRTC signaling (for future implementation)
 */
const { WebSocketServer } = require('ws');
const { EventEmitter } = require('events');

/**
 * @typedef {Object} BrowserFrame
 * @property {'frame'} type - Message type identifier
 * @property {string} data - Base64 encoded image data (JPEG format)
 * @property {number} timestamp - Frame timestamp in milliseconds
 * @property {string} sessionId - Session identifier
 */

/**
 * @typedef {Object} BrowserStreamingMessage
 * @property {'offer'|'answer'|'ice-candidate'|'start-streaming'|'stop-streaming'|'control-mode'|'user-input'} type - Message type
 * @property {*} [data] - Optional message data (structure varies by message type)
 * @property {string} [sessionId] - Optional session identifier
 * 
 * Message type details:
 * - 'start-streaming': Begin browser frame capture for a session
 * - 'stop-streaming': Stop browser frame capture for a session  
 * - 'control-mode': Switch between 'agent' and 'user' control modes
 * - 'user-input': Send user input events (click, mousemove, keydown, keyup, scroll)
 * - 'offer'/'answer'/'ice-candidate': WebRTC signaling (future feature)
 */

class BrowserStreamingService extends EventEmitter {
  constructor(port, cdpPort = 9222) {
    super();
    this.port = port;
    this.cdpPort = cdpPort; // Chrome DevTools Protocol port (fallback)
    this.wss = new WebSocketServer({ port });
    this.activeSessions = new Map(); // Map<sessionId, {ws, client, cdpEndpoint, controlMode, targetId}>
    this.sessionToTarget = new Map(); // Map<sessionId, targetId> - tracks which session owns which CDP target
  }

  async start() {
    this.wss.on('connection', (ws) => {
      console.log('Browser streaming client connected');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error handling browser streaming message:', error);
          ws.send(JSON.stringify({ type: 'error', error: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('Browser streaming client disconnected');
        // Clean up sessions for this client
        for (const [sessionId, session] of this.activeSessions) {
          if (session.ws === ws) {
            this.stopBrowserCapture(sessionId);
            this.activeSessions.delete(sessionId);
          }
        }
      });

      ws.on('error', (error) => {
        console.error('Browser streaming WebSocket error:', error);
      });
    });

    console.log(`Browser streaming service started on port ${this.port}`);
  }

  /**
   * Handle incoming WebSocket messages
   * @param {WebSocket} ws - WebSocket connection
   * @param {BrowserStreamingMessage} message - Parsed message from client
   */
  async handleMessage(ws, message) {
    switch (message.type) {
      case 'start-streaming':
        await this.startBrowserCapture(ws, message.sessionId || 'default');
        break;
      
      case 'stop-streaming':
        await this.stopBrowserCapture(message.sessionId || 'default');
        break;
      
      case 'control-mode':
        await this.handleChangeControlMode(ws, message.sessionId || 'default', message.data?.mode);
        break;

      case 'user-input':
        await this.handleUserInput(ws, message.sessionId || 'default', message.data);
        break;
      
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // Handle WebRTC signaling (for future WebRTC implementation)
        await this.handleWebRTCSignaling(ws, message);
        break;
      
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  async startBrowserCapture(ws, sessionId) {
    try {
      // Connect to the Playwright MCP server's CDP endpoint with retry logic
      let cdpEndpoint = null;
      let retries = 0;
      const maxRetries = 15; // Increased retries for better reliability

      while (!cdpEndpoint && retries < maxRetries) {
        cdpEndpoint = await this.getCDPEndpoint(sessionId); // Pass sessionId to get correct target
        if (!cdpEndpoint) {
          console.log(`Attempt ${retries + 1}/${maxRetries}: Waiting for Playwright browser to be available for session ${sessionId}...`);
          await new Promise(resolve => setTimeout(resolve, 1500)); // Slightly faster retry
          retries++;
        }
      }

      if (!cdpEndpoint) {
        const errorMsg = `Could not get CDP endpoint from Playwright MCP server after multiple attempts for session ${sessionId}`;
        console.error(errorMsg);
        ws.send(JSON.stringify({
          type: 'error',
          error: errorMsg
        }));
        return;
      }

      // Connect to CDP and start screencast
      const CDP = require('chrome-remote-interface');
      const client = await CDP({ target: cdpEndpoint });

      const { Page, Runtime } = client;

      await Page.enable();
      await Runtime.enable();

      // Start screencast
      await Page.startScreencast({
        format: 'jpeg',
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        everyNthFrame: 1 // Capture every frame for smooth streaming
      });

      // Handle screencast frames with better error handling
      Page.screencastFrame((params) => {
        try {
          /** @type {BrowserFrame} */
          const frame = {
            type: 'frame',
            data: params.data, // Base64 encoded JPEG
            timestamp: Date.now(),
            sessionId
          };

          // Send frame to WebSocket client with connection check
          if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(frame));
          } else if (ws.readyState === 3) { // WebSocket.CLOSED
            console.log(`WebSocket closed for session ${sessionId}, stopping capture`);
            this.stopBrowserCapture(sessionId);
            return;
          }

          // Acknowledge the frame
          Page.screencastFrameAck({ sessionId: params.sessionId });
        } catch (error) {
          console.error('Error handling screencast frame:', error);
          // Don't stop the entire capture for frame errors, just log them
        }
      });

      // Extract target ID from the CDP endpoint
      const targetId = this.sessionToTarget.get(sessionId);

      // Store session info including the target ID
      this.activeSessions.set(sessionId, {
        ws,
        client,
        cdpEndpoint,
        controlMode: 'agent', // Default to agent control
        targetId, // Store the target ID for this session
      });

      // Notify client that streaming started
      ws.send(JSON.stringify({
        type: 'streaming-started',
        sessionId,
        cdpEndpoint,
        targetId
      }));

      console.log(`Browser capture started for session: ${sessionId} (target: ${targetId})`);
      
    } catch (error) {
      console.error('Error starting browser capture:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ws.send(JSON.stringify({
        type: 'error',
        error: `Failed to start browser capture: ${errorMessage}`
      }));
    }
  }

  async stopBrowserCapture(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`No active session found for: ${sessionId}`);
      return;
    }

    try {
      // ONLY stop screencast, don't close the page or browser
      // This allows the Chrome process to stay alive for agent control
      if (session.client && session.client.Page) {
        await session.client.Page.stopScreencast();
      }

      // Close our CDP connection to the target
      // This disconnects our stream but leaves Chrome running
      if (session.client) {
        await session.client.close();
      }

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      // Clean up session-to-target mapping
      // NOTE: We keep the target alive for agent control, but release the claim
      if (this.sessionToTarget.has(sessionId)) {
        const targetId = this.sessionToTarget.get(sessionId);
        console.log(`Releasing target ${targetId} from session ${sessionId}`);
        this.sessionToTarget.delete(sessionId);
      }

      // Notify client that streaming stopped
      if (session.ws.readyState === 1) { // WebSocket.OPEN
        session.ws.send(JSON.stringify({
          type: 'streaming-stopped',
          sessionId
        }));
      }

      console.log(`Browser capture stopped for session: ${sessionId} (Chrome process remains alive)`);

    } catch (error) {
      console.error('Error stopping browser capture:', error);
    }
  }

  async handleChangeControlMode(ws, sessionId, newMode) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`No active session found for control mode change: ${sessionId}`);
      return;
    }

    if (newMode === 'agent' || newMode === 'user') {
      session.controlMode = newMode;
      console.log(`Control mode for session ${sessionId} changed to: ${newMode}`);

      // Notify the client of the change
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify({
          type: 'control-mode-changed',
          sessionId,
          data: { mode: newMode }
        }));
      }
    } else {
      console.warn(`Invalid control mode received: ${newMode}`);
    }
  }

  async handleUserInput(ws, sessionId, inputData) {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.controlMode !== 'user') {
      // Ignore user input if not in user control mode
      return;
    }

    try {
      const { Input } = session.client;

      switch (inputData.type) {
        case 'click':
          console.log('Dispatching mouse event (click):', { x: inputData.x, y: inputData.y, button: inputData.button });
          // Move to the click position first to ensure hover/focus events are triggered
          await Input.dispatchMouseEvent({
            type: 'mouseMoved',
            x: inputData.x,
            y: inputData.y,
          });
          
          await Input.dispatchMouseEvent({
            type: 'mousePressed',
            x: inputData.x,
            y: inputData.y,
            button: inputData.button,
            clickCount: 1,
          });
          await Input.dispatchMouseEvent({
            type: 'mouseReleased',
            x: inputData.x,
            y: inputData.y,
            button: inputData.button,
            clickCount: 1,
          });
          break;

        case 'mousemove':
          await Input.dispatchMouseEvent({
            type: 'mouseMoved',
            x: inputData.x,
            y: inputData.y,
          });
          break;

        case 'keydown':
        case 'keyup':
          await Input.dispatchKeyEvent({
            type: inputData.type === 'keydown' ? 'keyDown' : 'keyUp',
            key: inputData.key,
            code: inputData.code,
            text: inputData.text,
          });
          break;

        case 'scroll':
          await Input.dispatchMouseEvent({
            type: 'mouseWheel',
            x: inputData.x,
            y: inputData.y,
            deltaX: inputData.deltaX,
            deltaY: inputData.deltaY,
          });
          break;

        default:
          console.warn('Unknown user input type:', inputData.type);
      }
    } catch (error) {
      console.error('Error handling user input:', error);
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify({ type: 'error', error: 'Failed to process user input' }));
      }
    }
  }

  async findChromePort() {
    try {
      // Use ps to find Playwright Chromium process with remote-debugging-port
      const { execSync } = require('child_process');
      const output = execSync('ps aux | grep "ms-playwright" | grep "remote-debugging-port"', { encoding: 'utf8' });
      
      console.log('Playwright process search output:', output);
      
      // Extract the port from the --remote-debugging-port argument
      const match = output.match(/--remote-debugging-port[=\s]+(\d+)/);
      if (match) {
        const port = parseInt(match[1]);
        console.log(`Found Playwright Chrome CDP port: ${port}`);
        return port;
      }
      
      return null;
    } catch (error) {
      console.log('Could not detect Playwright Chrome port:', error.message);
      return null;
    }
  }

  async getCDPEndpoint(sessionId) {
    try {
      // Check if this session already has a mapped target
      if (this.sessionToTarget.has(sessionId)) {
        const targetId = this.sessionToTarget.get(sessionId);
        console.log(`Session ${sessionId} already mapped to target ${targetId}`);

        // Re-fetch targets to get current WebSocket URL
        const detectedPort = await this.findChromePort();
        if (!detectedPort) {
          console.log('No Playwright Chrome process detected yet');
          return null;
        }

        const CDP = require('chrome-remote-interface');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const targets = await CDP.List({ port: detectedPort });
        const existingTarget = targets.find(t => t.id === targetId && t.type === 'page');

        if (existingTarget) {
          console.log(`Reconnecting to existing target ${targetId} for session ${sessionId}`);
          this.cdpPort = detectedPort;
          return existingTarget.webSocketDebuggerUrl;
        } else {
          console.warn(`Previously mapped target ${targetId} no longer exists, will select new target`);
          this.sessionToTarget.delete(sessionId);
        }
      }

      // First try to find the actual Chrome port used by Playwright MCP
      const detectedPort = await this.findChromePort();

      if (!detectedPort) {
        console.log('No Playwright Chrome process detected yet');
        return null;
      }

      const portToTry = detectedPort;
      console.log(`Attempting to connect to Chrome CDP on port ${portToTry} for session ${sessionId}`);

      // Connect directly to Chrome's CDP port
      const CDP = require('chrome-remote-interface');

      // Wait for Chrome to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const targets = await CDP.List({ port: portToTry });
      console.log('Available CDP targets:', targets.map(t => ({ type: t.type, url: t.url, title: t.title, id: t.id })));

      // Get all page targets
      const pageTargets = targets.filter(target => target.type === 'page');

      if (pageTargets.length === 0) {
        console.warn('No page targets found');
        return null;
      }

      // Get target IDs already claimed by other active sessions
      const claimedTargetIds = new Set(
        Array.from(this.activeSessions.values())
          .map(session => session.targetId)
          .filter(Boolean)
      );

      console.log(`Claimed target IDs by other sessions:`, Array.from(claimedTargetIds));

      // Find the newest unclaimed target
      // CDP returns targets in newest-to-oldest order, so iterate from index 0 (newest) forward
      let availableTarget = null;
      for (let i = 0; i < pageTargets.length; i++) {
        if (!claimedTargetIds.has(pageTargets[i].id)) {
          availableTarget = pageTargets[i];
          break;
        }
      }

      if (!availableTarget) {
        console.warn('All page targets are already claimed by other sessions');
        // Fall back to the newest target (index 0 since CDP returns newest-first)
        const newestTarget = pageTargets[0];
        console.log(`Falling back to newest target: ${newestTarget.id}`);
        this.sessionToTarget.set(sessionId, newestTarget.id);
        this.cdpPort = portToTry;
        return newestTarget.webSocketDebuggerUrl;
      }

      console.log(`Assigning unclaimed target ${availableTarget.id} to session ${sessionId}`);

      // Store the session-to-target mapping
      this.sessionToTarget.set(sessionId, availableTarget.id);
      this.cdpPort = portToTry; // Update our port reference

      return availableTarget.webSocketDebuggerUrl;

    } catch (error) {
      console.log('Error connecting to CDP (this is normal if browser not ready yet):', error.message);
      return null;
    }
  }

  async handleWebRTCSignaling(ws, message) {
    // TODO: Implement WebRTC signaling for even lower latency
    // This would replace the CDP screencast approach with true WebRTC streaming
    console.log('WebRTC signaling not yet implemented:', message.type);
  }

  async stop() {
    // Stop all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.stopBrowserCapture(sessionId);
    }
    this.activeSessions.clear();

    // Close WebSocket server
    this.wss.close();
    console.log('Browser streaming service stopped');
  }
}

function createBrowserStreamingService(port, cdpPort) {
  const streamingPort = port || parseInt(process.env.BROWSER_STREAMING_PORT || '8933');
  const chromePort = cdpPort || parseInt(process.env.CHROME_CDP_PORT || '9222');
  
  return new BrowserStreamingService(streamingPort, chromePort);
}

// Start the service
const port = process.env.BROWSER_STREAMING_PORT || 8933;
const cdpPort = process.env.CHROME_CDP_PORT || 9222;
const service = createBrowserStreamingService(port, cdpPort);

service.start().catch(console.error);

// Handle shutdown
process.on('SIGTERM', () => service.stop().then(() => process.exit(0)));
process.on('SIGINT', () => service.stop().then(() => process.exit(0)));
