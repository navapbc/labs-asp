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
    
    // NEW: Persistent session storage for reconnection
    this.persistentSessions = new Map(); // Map<sessionId, {targetId, controlMode, lastActivity, cdpEndpoint}>
    this.sessionToTarget = new Map(); // Map<sessionId, targetId> - tracks which session owns which CDP target
    
    // Mutex to prevent race conditions in target assignment
    this._targetAssignmentLock = Promise.resolve();
    
    // Session expiration - clean up sessions inactive
    // this.sessionExpirationTime = 30 * 60 * 1000; // 30 minutes in milliseconds (production)
    this.sessionExpirationTime = 2 * 60 * 1000; // 2 minutes in milliseconds (testing)
    this.startSessionCleanupTimer();
  }

  /**
   * Periodic cleanup of expired sessions
   */
  startSessionCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.persistentSessions.entries()) {
        if (now - session.lastActivity > this.sessionExpirationTime) {
          console.log(`Expiring inactive session: ${sessionId} (inactive for ${Math.round((now - session.lastActivity) / 60000)} minutes)`);
          this.expireSession(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Completely remove an expired session
   */
  expireSession(sessionId) {
    this.persistentSessions.delete(sessionId);
    this.sessionToTarget.delete(sessionId);
    
    // If still active, stop it
    if (this.activeSessions.has(sessionId)) {
      this.disconnectSession(sessionId);
    }
    
    console.log(`Session ${sessionId} expired and removed`);
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
        // Preserve sessions for reconnection instead of deleting them
        for (const [sessionId, session] of this.activeSessions) {
          if (session.ws === ws) {
            console.log(`WebSocket disconnected for session ${sessionId}, preserving session for reconnection`);
            
            // Update persistent session with latest state
            this.persistentSessions.set(sessionId, {
              targetId: session.targetId,
              controlMode: session.controlMode,
              cdpEndpoint: session.cdpEndpoint,
              lastActivity: Date.now()
            });
            
            // Stop the screencast but preserve session data
            this.disconnectSession(sessionId);
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

  async startBrowserCapture(ws, sessionId) {
    try {
      // Check if this is a reconnection to an existing session
      const existingSession = this.persistentSessions.get(sessionId);
      
      if (existingSession) {
        console.log(`Reconnecting to existing session: ${sessionId} (target: ${existingSession.targetId})`);
        
        // Update last activity
        existingSession.lastActivity = Date.now();
        
        // Try to reconnect to the existing target
        const reconnected = await this.reconnectToExistingTarget(ws, sessionId, existingSession);
        
        if (reconnected) {
          console.log(`Successfully reconnected to session ${sessionId}`);
          return;
        } else {
          console.log(`Could not reconnect to previous target, starting new capture for session ${sessionId}`);
          // Fall through to create new connection
        }
      }
      
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

      // Handle screencast frames with session validation
      Page.screencastFrame((params) => {
        try {
          // SESSION VALIDATION: Verify this session still owns this target
          // This prevents frames from being sent to the wrong session if target was reassigned
          const currentSession = this.activeSessions.get(sessionId);
          const expectedTargetId = this.sessionToTarget.get(sessionId);

          if (!currentSession) {
            console.warn(`[SESSION VALIDATION] Session ${sessionId} no longer active, skipping frame`);
            Page.screencastFrameAck({ sessionId: params.sessionId });
            return;
          }

          if (currentSession.targetId !== expectedTargetId) {
            console.warn(`[SESSION VALIDATION] Target mismatch for session ${sessionId}: active=${currentSession.targetId}, expected=${expectedTargetId}`);
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
        controlMode: existingSession?.controlMode || 'agent', // Use existing control mode if reconnecting
        targetId, // Store the target ID for this session
      });

      // Store in persistent sessions for reconnection support
      this.persistentSessions.set(sessionId, {
        targetId,
        controlMode: existingSession?.controlMode || 'agent',
        cdpEndpoint,
        lastActivity: Date.now()
      });

      // Notify client that streaming started
      ws.send(JSON.stringify({
        type: 'streaming-started',
        sessionId,
        cdpEndpoint,
        targetId,
        reconnected: !!existingSession
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

  /**
   * Reconnect to an existing target from a previous session
   */
  async reconnectToExistingTarget(ws, sessionId, existingSession) {
    try {
      const { targetId, cdpEndpoint, controlMode } = existingSession;
      
      // Check if the target still exists
      const detectedPort = await this.findChromePort();
      if (!detectedPort) {
        console.log('No Chrome process detected for reconnection');
        return false;
      }

      const CDP = require('chrome-remote-interface');
      const targets = await CDP.List({ port: detectedPort });
      const targetExists = targets.find(t => t.id === targetId && t.type === 'page');

      if (!targetExists) {
        console.log(`Target ${targetId} no longer exists, cannot reconnect`);
        return false;
      }

      // Connect to the existing target
      const client = await CDP({ target: targetExists.webSocketDebuggerUrl });
      const { Page, Runtime } = client;

      await Page.enable();
      await Runtime.enable();

      // Start screencast
      await Page.startScreencast({
        format: 'jpeg',
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        everyNthFrame: 1
      });

      // Handle screencast frames
      Page.screencastFrame((params) => {
        try {
          const currentSession = this.activeSessions.get(sessionId);
          const expectedTargetId = this.sessionToTarget.get(sessionId);

          if (!currentSession) {
            console.warn(`[SESSION VALIDATION] Session ${sessionId} no longer active, skipping frame`);
            Page.screencastFrameAck({ sessionId: params.sessionId });
            return;
          }

          if (currentSession.targetId !== expectedTargetId) {
            console.warn(`[SESSION VALIDATION] Target mismatch for session ${sessionId}`);
            Page.screencastFrameAck({ sessionId: params.sessionId });
            return;
          }

          const frame = {
            type: 'frame',
            data: params.data,
            timestamp: Date.now(),
            sessionId
          };

          if (ws.readyState === 1) {
            ws.send(JSON.stringify(frame));
          } else if (ws.readyState === 3) {
            console.log(`WebSocket closed for session ${sessionId}, stopping capture`);
            this.disconnectSession(sessionId);
            return;
          }

          Page.screencastFrameAck({ sessionId: params.sessionId });
        } catch (error) {
          console.error('Error handling screencast frame on reconnection:', error);
        }
      });

      // Restore active session
      this.activeSessions.set(sessionId, {
        ws,
        client,
        cdpEndpoint: targetExists.webSocketDebuggerUrl,
        controlMode,
        targetId,
      });

      // Update persistent session
      existingSession.lastActivity = Date.now();
      existingSession.cdpEndpoint = targetExists.webSocketDebuggerUrl;

      ws.send(JSON.stringify({
        type: 'streaming-started',
        sessionId,
        cdpEndpoint: targetExists.webSocketDebuggerUrl,
        targetId,
        reconnected: true
      }));

      console.log(`Successfully reconnected to target ${targetId} for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error reconnecting to existing target:', error);
      return false;
    }
  }

  /**
   * Disconnect session without deleting persistent data
   */
  async disconnectSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      // Stop screencast
      if (session.client && session.client.Page) {
        await session.client.Page.stopScreencast();
      }

      // Close CDP connection
      if (session.client) {
        await session.client.close();
      }

      // Remove from active sessions (but keep persistent session)
      this.activeSessions.delete(sessionId);

      console.log(`Session ${sessionId} disconnected (persistent data preserved for reconnection)`);

    } catch (error) {
      console.error('Error disconnecting session:', error);
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

      // Update persistent session data for reconnection (keep session-to-target mapping)
      const persistentSession = this.persistentSessions.get(sessionId);
      if (persistentSession) {
        persistentSession.lastActivity = Date.now();
      }

      // Notify client that streaming stopped
      if (session.ws.readyState === 1) { // WebSocket.OPEN
        session.ws.send(JSON.stringify({
          type: 'streaming-stopped',
          sessionId
        }));
      }

      console.log(`Browser capture stopped for session: ${sessionId} (session preserved for reconnection)`);

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
      
      // Update persistent session
      const persistentSession = this.persistentSessions.get(sessionId);
      if (persistentSession) {
        persistentSession.controlMode = newMode;
        persistentSession.lastActivity = Date.now();
      }
      
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

    // Update last activity on user input
    const persistentSession = this.persistentSessions.get(sessionId);
    if (persistentSession) {
      persistentSession.lastActivity = Date.now();
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
   * Get CDP endpoint for a session with mutex to prevent race conditions.
   * This wrapper ensures only one session can claim a target at a time.
   */
  async getCDPEndpoint(sessionId) {
    // Use mutex to serialize target assignment and prevent race conditions
    const result = await new Promise((resolve) => {
      this._targetAssignmentLock = this._targetAssignmentLock.then(async () => {
        const endpoint = await this._getCDPEndpointInternal(sessionId);
        resolve(endpoint);
        return endpoint;
      }).catch((error) => {
        console.error('Error in target assignment lock:', error);
        resolve(null);
        return null;
      });
    });
    return result;
  }

  /**
   * Internal implementation of CDP endpoint discovery.
   * Called within mutex lock to prevent race conditions.
   */
  async _getCDPEndpointInternal(sessionId) {
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
          // Verify this target isn't claimed by another active session
          const claimingSession = Array.from(this.activeSessions.entries())
            .find(([sid, sess]) => sid !== sessionId && sess.targetId === targetId);

          if (claimingSession) {
            console.warn(`Target ${targetId} is now claimed by session ${claimingSession[0]}, clearing mapping for ${sessionId}`);
            this.sessionToTarget.delete(sessionId);
            // Fall through to find a new target
          } else {
            console.log(`Reconnecting to existing target ${targetId} for session ${sessionId}`);
            this.cdpPort = detectedPort;
            return existingTarget.webSocketDebuggerUrl;
          }
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
      // Include both activeSessions AND sessionToTarget to catch in-progress assignments
      const claimedTargetIds = new Set([
        ...Array.from(this.activeSessions.values())
          .map(session => session.targetId)
          .filter(Boolean),
        ...Array.from(this.sessionToTarget.values())
      ]);

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
        // CRITICAL FIX: Do NOT steal targets from other sessions
        // Return null and let the caller handle the error/retry
        console.error(`[SESSION ISOLATION] No available targets for session ${sessionId}. All ${pageTargets.length} targets are claimed by other sessions.`);
        console.error(`[SESSION ISOLATION] Claimed targets: ${Array.from(claimedTargetIds).join(', ')}`);
        console.error(`[SESSION ISOLATION] This session must wait for a new browser context to be created.`);
        return null;
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
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Stop all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.disconnectSession(sessionId);
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
