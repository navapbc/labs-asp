#!/bin/bash

# Browser Pool Startup Script
# This script sets up Docker MCP Gateway with persistent browser processes

set -e

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/startup.log
}

log "Starting browser pool instance setup..."

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $(whoami)
fi

# Install Google Cloud Ops Agent for monitoring
log "Installing Google Cloud Ops Agent..."
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install

# Create application directory
mkdir -p /opt/browser-pool
cd /opt/browser-pool

# Install VNC and WebRTC dependencies
log "Installing VNC and streaming dependencies..."
apt-get update
apt-get install -y \
  xvfb \
  x11vnc \
  fluxbox \
  websockify \
  chromium-browser \
  ffmpeg \
  nodejs \
  npm

# Install noVNC for web-based VNC access
log "Installing noVNC..."
cd /opt
git clone https://github.com/novnc/noVNC.git
cd /opt/browser-pool

# Create docker-compose.yml for MCP Gateway with VNC support
log "Creating Docker Compose configuration with VNC support..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # X11 Display Server
  xvfb:
    image: jlesage/firefox:latest
    environment:
      - DISPLAY_WIDTH=1920
      - DISPLAY_HEIGHT=1080
      - VNC_PASSWORD=
    ports:
      - "5900:5900"  # VNC port
      - "5800:5800"  # noVNC web interface
    volumes:
      - /tmp/.X11-unix:/tmp/.X11-unix:rw
      - browser_data:/config
    restart: unless-stopped

  # MCP Gateway with browser automation
  mcp-gateway:
    image: docker/mcp-gateway:latest
    command:
      - --transport=sse
      - --servers=playwright-official
      - --tools=navigate,screenshot,click,type,wait_for_selector,get_page_content,fill_form,extract_data
    ports:
      - "8811:8811"
    environment:
      - NODE_ENV=production
      - DISPLAY=:1
    volumes:
      - /tmp/playwright-data:/tmp/playwright
      - /tmp/.X11-unix:/tmp/.X11-unix:rw
    depends_on:
      - xvfb
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8811/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Browser Stream Server (WebRTC + VNC proxy)
  stream-server:
    image: ${container_image}
    ports:
      - "8080:8080"  # WebRTC signaling
      - "6080:6080"  # noVNC web interface
    environment:
      - ENVIRONMENT=${environment}
      - MCP_GATEWAY_URL=http://mcp-gateway:8811/sse
      - VNC_SERVER=xvfb:5900
    depends_on:
      - mcp-gateway
      - xvfb
    restart: unless-stopped
    command: ["node", "scripts/stream-server.js"]
    volumes:
      - /opt/noVNC:/opt/noVNC:ro

  # Browser Instance Manager API
  browser-api:
    image: ${container_image}
    ports:
      - "3000:3000"
    environment:
      - ENVIRONMENT=${environment}
      - MCP_GATEWAY_URL=http://mcp-gateway:8811/sse
      - STREAM_SERVER_URL=http://stream-server:8080
    depends_on:
      - mcp-gateway
      - stream-server
    restart: unless-stopped
    command: ["node", "scripts/browser-api.js"]

volumes:
  browser_data:

networks:
  default:
    name: browser-pool-network
EOF

# Create stream server script
log "Creating WebRTC stream server script..."
cat > stream-server.js << 'EOF'
const express = require('express');
const { WebSocketServer } = require('ws');
const { RTCPeerConnection } = require('wrtc');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(express.static('/opt/noVNC'));

// Serve noVNC client
app.get('/vnc', (req, res) => {
  res.sendFile(path.join('/opt/noVNC', 'vnc.html'));
});

// WebRTC signaling server
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('WebRTC client connected');
  
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  // Capture browser screen with ffmpeg
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'x11grab',
    '-r', '30',
    '-s', '1920x1080',
    '-i', ':1.0',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-f', 'rtp',
    'rtp://127.0.0.1:5004'
  ]);

  // Handle WebRTC signaling
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'offer') {
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', answer }));
      }
      
      if (data.type === 'ice-candidate') {
        await pc.addIceCandidate(data.candidate);
      }
    } catch (error) {
      console.error('Signaling error:', error);
    }
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    }
  };

  ws.on('close', () => {
    console.log('WebRTC client disconnected');
    ffmpeg.kill();
    pc.close();
  });
});

// Start VNC WebSocket proxy
const websockify = spawn('websockify', [
  '--web=/opt/noVNC',
  '6080',
  process.env.VNC_SERVER || 'localhost:5900'
]);

console.log('Stream server running on port 8080');
console.log('noVNC available at http://localhost:6080/vnc.html');
EOF

# Create browser API script
log "Creating browser instance API..."
cat > browser-api.js << 'EOF'
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// In-memory instance tracking
let instances = new Map();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// List instances
app.get('/instances', (req, res) => {
  const instanceList = Array.from(instances.values());
  res.json(instanceList);
});

// Create instance
app.post('/instances', (req, res) => {
  const instance = {
    id: uuidv4(),
    status: 'active',
    currentUrl: 'about:blank',
    lastActivity: new Date(),
    capabilities: ['screenshots', 'vnc', 'webrtc', 'interactions']
  };
  
  instances.set(instance.id, instance);
  res.json(instance);
});

// Get instance
app.get('/instances/:id', (req, res) => {
  const instance = instances.get(req.params.id);
  if (!instance) {
    return res.status(404).json({ error: 'Instance not found' });
  }
  res.json(instance);
});

// Delete instance
app.delete('/instances/:id', (req, res) => {
  const deleted = instances.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Instance not found' });
  }
  res.sendStatus(204);
});

// Screenshot endpoint
app.get('/instances/:id/screenshot', async (req, res) => {
  // This would integrate with MCP Gateway to take screenshots
  res.setHeader('Content-Type', 'image/png');
  // Return placeholder for now
  res.sendStatus(501);
});

// Interaction endpoint
app.post('/instances/:id/interact', (req, res) => {
  const { type, coordinates, key, delta } = req.body;
  // This would send interactions to the browser via MCP Gateway
  console.log('Interaction:', type, req.body);
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', instances: instances.size });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Browser API running on port ${PORT}`);
});
EOF

# Create health check endpoint
log "Creating health check script..."
cat > health-check.sh << 'EOF'
#!/bin/bash
# Simple health check for the browser pool

# Check if MCP Gateway is responding
if curl -f -s http://localhost:8811/health > /dev/null; then
    echo "OK"
    exit 0
else
    echo "FAIL"
    exit 1
fi
EOF

chmod +x health-check.sh

# Start the services
log "Starting MCP Gateway and browser services..."
docker-compose up -d

# Wait for services to be ready
log "Waiting for services to be ready..."
sleep 30

# Verify services are running
if docker-compose ps | grep -q "Up"; then
    log "Browser pool services started successfully"
else
    log "ERROR: Services failed to start"
    docker-compose logs
    exit 1
fi

# Create systemd service for auto-restart
log "Creating systemd service..."
cat > /etc/systemd/system/browser-pool.service << EOF
[Unit]
Description=Browser Pool MCP Gateway
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/browser-pool
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable browser-pool.service
systemctl daemon-reload

log "Browser pool instance setup completed successfully!"

# Final health check
./health-check.sh
if [ $? -eq 0 ]; then
    log "Final health check passed - instance is ready"
else
    log "WARNING: Final health check failed - instance may need manual intervention"
fi
