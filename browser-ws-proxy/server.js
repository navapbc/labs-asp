#!/usr/bin/env node

/**
 * WebSocket Proxy Server for Browser Streaming
 *
 * This service acts as a secure WebSocket proxy between the HTTPS frontend
 * and the insecure WebSocket browser-streaming service on the VM.
 *
 * Architecture:
 * Browser (wss://) → This Proxy on Cloud Run → VM browser-streaming (ws://)
 *
 * This solves the browser security restriction that prevents insecure WebSocket
 * connections from HTTPS pages.
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;
const BACKEND_HOST = process.env.BROWSER_STREAMING_HOST || 'localhost';
const BACKEND_PORT = process.env.BROWSER_STREAMING_PORT || '8933';
const BACKEND_URL = `ws://${BACKEND_HOST}:${BACKEND_PORT}`;

console.log(`Starting WebSocket Proxy Server`);
console.log(`Port: ${PORT}`);
console.log(`Backend: ${BACKEND_URL}`);

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'browser-ws-proxy',
      backend: BACKEND_URL,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Proxy - Use WebSocket connection\n');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (clientWs, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('sessionId');

  // Require sessionId to prevent session collision
  if (!sessionId) {
    console.error('[browser-ws-proxy] Connection rejected: Missing required sessionId query parameter');
    clientWs.close(1008, 'Missing required sessionId query parameter');
    return;
  }

  console.log(`[${sessionId}] Client connected`);

  let backendWs = null;

  try {
    // Connect to backend browser-streaming service
    backendWs = new WebSocket(BACKEND_URL);

    // Forward messages from client to backend
    clientWs.on('message', (data) => {
      if (backendWs && backendWs.readyState === WebSocket.OPEN) {
        // Convert to string if it's a Buffer
        const message = data instanceof Buffer ? data.toString('utf8') : data;
        backendWs.send(message);
      }
    });

    // Forward messages from backend to client
    backendWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        // Convert to string if it's a Buffer (Node.js ws library receives as Buffer)
        const message = data instanceof Buffer ? data.toString('utf8') : data;
        clientWs.send(message);
      }
    });

    // Handle backend connection open
    backendWs.on('open', () => {
      console.log(`[${sessionId}] Connected to backend`);
    });

    // Handle client disconnect
    clientWs.on('close', (code, reason) => {
      console.log(`[${sessionId}] Client disconnected: ${code} ${reason}`);
      if (backendWs && backendWs.readyState === WebSocket.OPEN) {
        backendWs.close();
      }
    });

    // Handle backend disconnect
    backendWs.on('close', (code, reason) => {
      console.log(`[${sessionId}] Backend disconnected: ${code} ${reason}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });

    // Handle client errors
    clientWs.on('error', (error) => {
      console.error(`[${sessionId}] Client error:`, error.message);
      if (backendWs && backendWs.readyState === WebSocket.OPEN) {
        backendWs.close();
      }
    });

    // Handle backend errors
    backendWs.on('error', (error) => {
      console.error(`[${sessionId}] Backend error:`, error.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, 'Backend connection error');
      }
    });

  } catch (error) {
    console.error(`[${sessionId}] Error setting up proxy:`, error);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, 'Proxy setup error');
    }
  }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket Proxy listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
