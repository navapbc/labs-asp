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
    // Single consolidated Map for all session state
    // Map<sessionId, {ws, client, cdpEndpoint, controlMode, targetId}>
    this.activeSessions = new Map();
    // Track sessions that are currently mid-start to prevent duplicate starts
    this._startingSessionIds = new Set();
    // Mutex to prevent race conditions in target assignment AND session start
    this._targetAssignmentLock = Promise.resolve();
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
        // Clean up sessions for this client — stopBrowserCapture handles all cleanup
        for (const [sessionId, session] of this.activeSessions) {
          if (session.ws === ws) {
            this.stopBrowserCapture(sessionId);
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
        if (!message.sessionId) {
          console.error('start-streaming: Missing required sessionId');
          ws.send(JSON.stringify({ type: 'error', error: 'Missing required sessionId' }));
          return;
        }
        await this.startBrowserCapture(ws, message.sessionId);
        break;

      case 'stop-streaming':
        if (!message.sessionId) {
          console.error('stop-streaming: Missing required sessionId');
          ws.send(JSON.stringify({ type: 'error', error: 'Missing required sessionId' }));
          return;
        }
        await this.stopBrowserCapture(message.sessionId);
        break;

      case 'control-mode':
        if (!message.sessionId) {
          console.error('control-mode: Missing required sessionId');
          ws.send(JSON.stringify({ type: 'error', error: 'Missing required sessionId' }));
          return;
        }
        await this.handleChangeControlMode(ws, message.sessionId, message.data?.mode);
        break;

      case 'user-input':
        if (!message.sessionId) {
          console.error('user-input: Missing required sessionId');
          ws.send(JSON.stringify({ type: 'error', error: 'Missing required sessionId' }));
          return;
        }
        await this.handleUserInput(ws, message.sessionId, message.data);
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

  /**
   * Start browser capture with mutex to prevent duplicate/racing starts.
   * The entire start sequence is serialized to prevent race conditions.
   */
  async startBrowserCapture(ws, sessionId) {
    // Wrap the entire start sequence in the mutex
    const result = await new Promise((resolve) => {
      this._targetAssignmentLock = this._targetAssignmentLock.then(async () => {
        const res = await this._startBrowserCaptureInternal(ws, sessionId);
        resolve(res);
        return res;
      }).catch((error) => {
        console.error('Error in startBrowserCapture lock:', error);
        resolve(null);
        return null;
      });
    });
    return result;
  }

  async _startBrowserCaptureInternal(ws, sessionId) {
    // Deduplication: reject if already active or mid-start
    if (this.activeSessions.has(sessionId)) {
      console.warn(`Session ${sessionId} already active, rejecting duplicate start`);
      ws.send(JSON.stringify({ type: 'error', error: `Session ${sessionId} is already streaming` }));
      return;
    }
    if (this._startingSessionIds.has(sessionId)) {
      console.warn(`Session ${sessionId} is already starting, rejecting duplicate start`);
      ws.send(JSON.stringify({ type: 'error', error: `Session ${sessionId} is already starting` }));
      return;
    }

    this._startingSessionIds.add(sessionId);

    try {
      // Step 1: Discover CDP endpoint with retry logic
      let cdpEndpoint = null;
      let retries = 0;
      const maxRetries = 15;

      while (!cdpEndpoint && retries < maxRetries) {
        // Check if WebSocket closed during retry loop
        if (ws.readyState !== 1) { // !== WebSocket.OPEN
          console.log(`WebSocket closed during CDP discovery for session ${sessionId}, aborting`);
          return;
        }
        cdpEndpoint = await this._getCDPEndpointInternal(sessionId);
        if (!cdpEndpoint) {
          console.log(`Attempt ${retries + 1}/${maxRetries}: Waiting for Playwright browser to be available for session ${sessionId}...`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          retries++;
        }
      }

      if (!cdpEndpoint) {
        const errorMsg = `Could not get CDP endpoint from Playwright MCP server after multiple attempts for session ${sessionId}`;
        console.error(errorMsg);
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'error', error: errorMsg }));
        }
        return;
      }

      // Step 2: Connect CDP and enable domains
      const CDP = require('chrome-remote-interface');
      const client = await CDP({ target: cdpEndpoint });

      const { Page, Runtime } = client;

      await Page.enable();
      await Runtime.enable();

      // Extract targetId from the CDP endpoint URL
      const targetIdMatch = cdpEndpoint.match(/\/devtools\/page\/([^/]+)/);
      const targetId = targetIdMatch ? targetIdMatch[1] : null;

      // Step 3: Store in activeSessions BEFORE starting screencast
      // This ensures the frame handler can always find the session entry
      this.activeSessions.set(sessionId, {
        ws,
        client,
        cdpEndpoint,
        controlMode: 'agent',
        targetId,
      });

      // Step 4: Add CDP disconnect handler for auto-cleanup
      client.on('disconnect', () => {
        console.log(`CDP client disconnected for session ${sessionId}, cleaning up`);
        this.activeSessions.delete(sessionId);
      });

      // Step 5: Start screencast
      await Page.startScreencast({
        format: 'jpeg',
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        everyNthFrame: 1
      });

      // Step 6: Register frame handler — activeSessions.get() will always succeed now
      Page.screencastFrame((params) => {
        try {
          const currentSession = this.activeSessions.get(sessionId);

          if (!currentSession) {
            console.warn(`[SESSION VALIDATION] Session ${sessionId} no longer active, skipping frame`);
            Page.screencastFrameAck({ sessionId: params.sessionId });
            return;
          }

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
        }
      });

      // Notify client that streaming started
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'streaming-started',
          sessionId,
          cdpEndpoint,
          targetId
        }));
      }

      console.log(`Browser capture started for session: ${sessionId} (target: ${targetId})`);

    } catch (error) {
      console.error('Error starting browser capture:', error);
      // Clean up partial state on error
      this.activeSessions.delete(sessionId);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'error',
          error: `Failed to start browser capture: ${errorMessage}`
        }));
      }
    } finally {
      this._startingSessionIds.delete(sessionId);
    }
  }

  async stopBrowserCapture(sessionId) {
    // Atomic removal: delete from activeSessions immediately to prevent races
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      // Idempotent: may be called while start is mid-flight or already stopped
      return;
    }
    this.activeSessions.delete(sessionId);

    try {
      // Stop screencast — don't close the page or browser
      if (session.client && session.client.Page) {
        await session.client.Page.stopScreencast();
      }

      // Close our CDP connection to the target
      if (session.client) {
        await session.client.close();
      }

      if (session.targetId) {
        console.log(`Releasing target ${session.targetId} from session ${sessionId}`);
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

        case 'touchstart':
          // Handle touch as a click for mobile devices
          console.log('Dispatching touch event (touchstart as click):', { x: inputData.x, y: inputData.y });
          await Input.dispatchMouseEvent({
            type: 'mouseMoved',
            x: inputData.x,
            y: inputData.y,
          });

          await Input.dispatchMouseEvent({
            type: 'mousePressed',
            x: inputData.x,
            y: inputData.y,
            button: 'left',
            clickCount: 1,
          });
          break;

        case 'touchmove':
          // Handle touch move as mouse move
          console.log('Dispatching touch event (touchmove as mousemove):', { x: inputData.x, y: inputData.y });
          await Input.dispatchMouseEvent({
            type: 'mouseMoved',
            x: inputData.x,
            y: inputData.y,
          });
          break;

        case 'touchend':
          // Handle touch end as mouse release
          console.log('Dispatching touch event (touchend as release):', { x: inputData.x, y: inputData.y });
          await Input.dispatchMouseEvent({
            type: 'mouseReleased',
            x: inputData.x,
            y: inputData.y,
            button: 'left',
            clickCount: 1,
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

  /**
   * Internal implementation of CDP endpoint discovery.
   * Called within mutex lock to prevent race conditions.
   * Uses only activeSessions (no separate sessionToTarget map).
   */
  async _getCDPEndpointInternal(sessionId) {
    try {
      // Check if this session already has a target via activeSessions
      const existingSession = this.activeSessions.get(sessionId);
      if (existingSession && existingSession.targetId) {
        const targetId = existingSession.targetId;
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
          // Verify this target isn't claimed by another active session
          const claimingSession = Array.from(this.activeSessions.entries())
            .find(([sid, sess]) => sid !== sessionId && sess.targetId === targetId);

          if (claimingSession) {
            console.warn(`Target ${targetId} is now claimed by session ${claimingSession[0]}, clearing mapping for ${sessionId}`);
            // Fall through to find a new target
          } else {
            console.log(`Reconnecting to existing target ${targetId} for session ${sessionId}`);
            this.cdpPort = detectedPort;
            return existingTarget.webSocketDebuggerUrl;
          }
        } else {
          console.warn(`Previously mapped target ${targetId} no longer exists, will select new target`);
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

      // Build claimed-targets set from activeSessions only (single source of truth)
      const claimedTargetIds = new Set(
        Array.from(this.activeSessions.values())
          .map(session => session.targetId)
          .filter(Boolean)
      );

      console.log(`Claimed target IDs by other sessions:`, Array.from(claimedTargetIds));

      // Find the newest unclaimed target
      let availableTarget = null;
      for (let i = 0; i < pageTargets.length; i++) {
        if (!claimedTargetIds.has(pageTargets[i].id)) {
          availableTarget = pageTargets[i];
          break;
        }
      }

      if (!availableTarget) {
        console.error(`[SESSION ISOLATION] No available targets for session ${sessionId}. All ${pageTargets.length} targets are claimed by other sessions.`);
        console.error(`[SESSION ISOLATION] Claimed targets: ${Array.from(claimedTargetIds).join(', ')}`);
        console.error(`[SESSION ISOLATION] This session must wait for a new browser context to be created.`);
        return null;
      }

      console.log(`Assigning unclaimed target ${availableTarget.id} to session ${sessionId}`);

      this.cdpPort = portToTry;

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
