import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface BrowserFrame {
  type: 'frame';
  data: string; // Base64 encoded image
  timestamp: number;
  sessionId: string;
}

interface BrowserStreamingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'start-streaming' | 'stop-streaming';
  data?: any;
  sessionId?: string;
}

export class BrowserStreamingService extends EventEmitter {
  private wss: WebSocketServer;
  private port: number;
  private activeSessions = new Map<string, {
    ws: WebSocket;
    client: any; // CDP client
    cdpEndpoint: string;
  }>();
  private cdpPort: number;

  constructor(port: number, cdpPort: number = 9222) {
    super();
    this.port = port;
    this.cdpPort = cdpPort; // Chrome DevTools Protocol port (fallback)
    this.wss = new WebSocketServer({ port });
  }



  async start() {
    this.wss.on('connection', (ws: WebSocket, request: any) => {
      console.log('Browser streaming client connected');
      
      ws.on('message', async (message) => {
        try {
          const data: BrowserStreamingMessage = JSON.parse(message.toString());
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error handling browser streaming message:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          ws.send(JSON.stringify({ type: 'error', error: errorMessage }));
        }
      });

      ws.on('close', () => {
        console.log('Browser streaming client disconnected');
        // Clean up any active sessions for this client
        for (const [sessionId, session] of this.activeSessions) {
          if (session.ws === ws) {
            this.stopBrowserCapture(sessionId);
            this.activeSessions.delete(sessionId);
          }
        }
      });

      ws.on('error', (error: any) => {
        console.error('Browser streaming WebSocket error:', error);
      });
    });

    console.log(`Browser streaming service started on port ${this.port}`);
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

  private async handleMessage(ws: WebSocket, message: BrowserStreamingMessage) {
    switch (message.type) {
      case 'start-streaming':
        await this.startBrowserCapture(ws, message.sessionId || 'default');
        break;
      
      case 'stop-streaming':
        await this.stopBrowserCapture(message.sessionId || 'default');
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

  private async startBrowserCapture(ws: WebSocket, sessionId: string) {
    try {
      // Connect to the Playwright MCP server's CDP endpoint with retry logic
      let cdpEndpoint = null;
      let retries = 0;
      const maxRetries = 10;
      
      while (!cdpEndpoint && retries < maxRetries) {
        cdpEndpoint = await this.getCDPEndpoint();
        if (!cdpEndpoint) {
          console.log(`Attempt ${retries + 1}/${maxRetries}: Waiting for Playwright browser to be available...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries++;
        }
      }
      
      if (!cdpEndpoint) {
        throw new Error('Could not get CDP endpoint from Playwright MCP server after multiple attempts');
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

      // Handle screencast frames
      Page.screencastFrame((params: any) => {
        const frame: BrowserFrame = {
          type: 'frame',
          data: params.data, // Base64 encoded JPEG
          timestamp: Date.now(),
          sessionId
        };

        // Send frame to WebSocket client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(frame));
        }

        // Acknowledge the frame
        Page.screencastFrameAck({ sessionId: params.sessionId });
      });

      // Store session info
      this.activeSessions.set(sessionId, {
        ws,
        client,
        cdpEndpoint
      });

      // Notify client that streaming started
      ws.send(JSON.stringify({
        type: 'streaming-started',
        sessionId,
        cdpEndpoint
      }));

      console.log(`Browser capture started for session: ${sessionId}`);
      
    } catch (error) {
      console.error('Error starting browser capture:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ws.send(JSON.stringify({
        type: 'error',
        error: `Failed to start browser capture: ${errorMessage}`
      }));
    }
  }

  private async stopBrowserCapture(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`No active session found for: ${sessionId}`);
      return;
    }

    try {
      // Stop screencast
      await session.client.Page.stopScreencast();
      
      // Close CDP connection
      await session.client.close();
      
      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      
      // Notify client that streaming stopped
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'streaming-stopped',
          sessionId
        }));
      }

      console.log(`Browser capture stopped for session: ${sessionId}`);
      
    } catch (error) {
      console.error('Error stopping browser capture:', error);
    }
  }

  private async findChromePort(): Promise<number | null> {
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
      console.log('Could not detect Playwright Chrome port:', (error as Error).message);
      return null;
    }
  }

  private async getCDPEndpoint(): Promise<string | null> {
    try {
      // First try to find the actual Chrome port used by Playwright MCP
      const detectedPort = await this.findChromePort();
      
      if (!detectedPort) {
        console.log('No Playwright Chrome process detected yet');
        return null;
      }
      
      const portToTry = detectedPort;
      console.log(`Attempting to connect to Chrome CDP on port ${portToTry}`);
      
      // Connect directly to Chrome's CDP port
      const CDP = require('chrome-remote-interface');
      
      // Wait for Chrome to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const targets = await CDP.List({ port: portToTry });
      console.log('Available CDP targets:', targets.map((t: any) => ({ type: t.type, url: t.url, title: t.title })));
      
      // Find the first page target
      const pageTarget = targets.find((target: any) => target.type === 'page');
      
      if (pageTarget) {
        console.log('Found page target:', pageTarget.webSocketDebuggerUrl);
        this.cdpPort = portToTry; // Update our port reference
        return pageTarget.webSocketDebuggerUrl;
      }
      
      console.warn('No page target found, available targets:', targets.map((t: any) => t.type));
      return null;
      
    } catch (error) {
      console.log('Error connecting to CDP (this is normal if browser not ready yet):', (error as Error).message);
      return null;
    }
  }

  private async handleWebRTCSignaling(ws: WebSocket, message: BrowserStreamingMessage) {
    // TODO: Implement WebRTC signaling for even lower latency
    // This would replace the CDP screencast approach with true WebRTC streaming
    console.log('WebRTC signaling not yet implemented:', message.type);
  }
}

export function createBrowserStreamingService(port: number, cdpPort?: number): BrowserStreamingService {
  const streamingPort = port || parseInt(process.env.BROWSER_STREAMING_PORT || '8933');
  const chromePort = cdpPort || parseInt(process.env.CHROME_CDP_PORT || '9222');
  
  return new BrowserStreamingService(streamingPort, chromePort);
}