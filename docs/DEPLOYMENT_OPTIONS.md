# Mastra Test App - Deployment Options

## Overview
Your mastra-test-app can be deployed on multiple platforms with both headless and headed browser support for Playwright MCP.

## Deployment Platforms

### Platform 1: Google Compute Engine (Full Control)
Traditional VM deployment with complete infrastructure control.

### Platform 2: Vercel + Cloud Browser (Recommended)
Serverless deployment with external browser services for optimal scalability.

## Deployment Options

### Option 1: Headless Only (Recommended)
Your current MCP config uses `--isolated` which runs headless by default:
```typescript
args: ["@playwright/mcp@latest", "--isolated"]
```

**Benefits:**
- Works out-of-the-box on GCE
- Lower resource requirements
- No GUI dependencies needed
- Perfect for automated testing/scraping

### Option 2: Cloud Browser Service
For headed browser needs, use a hosted service instead of local GUI:

```typescript
// Replace local MCP with remote browser service
export const remoteBrowserMCP = new MCPClient({
  servers: {
    playwright: {
      command: "npx", 
      args: ["@playwright/mcp@latest", "--browser-ws-endpoint=wss://chrome.browserless.io?token=YOUR_TOKEN"]
    }
  }
});
```

**Popular Services:**
- **Browserless** - `wss://chrome.browserless.io`
- **BrowserCat** - WebSocket endpoints for Playwright
- **Selenium Grid** - For cross-browser testing

### Option 3: VNC Setup (If Local GUI Required)
Only if you need actual headed browsers on the server:

```bash
# Install X11 and VNC
sudo apt-get install -y xvfb x11vnc fluxbox
sudo apt-get install -y chromium-browser

# Setup virtual display
export DISPLAY=:1
Xvfb :1 -screen 0 1920x1080x24 &
x11vnc -display :1 -bg -forever -nopw -quiet -listen localhost -rfbport 5900

# Install websockify for web-based VNC access
sudo apt-get install -y websockify

# Bridge VNC to WebSocket (for web clients)
websockify --web=/usr/share/novnc 6080 localhost:5900 &
```

#### VNC Access Options

**Desktop VNC Clients:**
```bash
# Connect from your local machine to the GCE instance
vncviewer your-gce-instance-ip:5900
```

**Web-based VNC Viewers (Embeddable):**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Browser Automation View</title>
    <script src="https://cdn.jsdelivr.net/npm/novnc@1.4.0/app/ui.js"></script>
</head>
<body>
    <div id="noVNC_container">
        <canvas id="noVNC_canvas"></canvas>
    </div>
    
    <script>
        // Connect to your GCE instance VNC server
        const rfb = new RFB(document.getElementById('noVNC_canvas'), 
                           'ws://your-gce-instance:6080/websockify');
    </script>
</body>
</html>
```

**Alternative embeddable VNC clients:**
- **guacamole-client**: Full-featured web VNC client
- **html5-vnc**: Lightweight HTML5 VNC viewer
- **noVNC**: Most popular JavaScript VNC client

#### VNC Architecture
```
[Your Web App] → [noVNC Client] → [WebSocket] → [GCE Instance] → [VNC Server] → [X11 Display] → [Headed Browser]
                                                                                                        ↑
                                                                               [Mastra Agent] → [Playwright MCP]
```

#### Use Cases for Embedded VNC
- **Real-time monitoring dashboard** - Watch your Mastra agents navigate websites
- **Debugging interface** - See exactly what the browser is doing during automation
- **Demo/presentation tool** - Show live browser automation to stakeholders
- **Training data collection** - Record browser interactions for ML training
- **Customer support** - Show users how automation works on their behalf

#### VNC Benefits
- ✅ Visual monitoring of browser automation
- ✅ Real-time debugging capabilities  
- ✅ Can embed in any web application
- ✅ No changes needed to your Mastra MCP config
- ✅ Full browser functionality (headed mode)

#### VNC Considerations
- 🔄 Additional complexity and resource usage
- 🔄 Network latency for remote viewing
- 🔄 Security considerations (VNC access)
- 🔄 Higher memory/CPU requirements for GUI
- 🔄 Requires proper firewall configuration

### Option 4: WebRTC Streaming (Modern Alternative)
For real-time browser streaming with lower latency and better performance than VNC:

```typescript
// webrtc-server.ts - On your GCE instance
import { WebSocketServer } from 'ws';
import { RTCPeerConnection } from 'wrtc';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', async (ws) => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  // Capture browser via Playwright CDP
  const videoTrack = await captureBrowserWithCDP();
  pc.addTrack(videoTrack);
  
  // Handle WebRTC signaling
  ws.on('message', async (message) => {
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
  });
  
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    }
  };
});
```

```typescript
// Browser capture via Playwright CDP
async function captureBrowserWithCDP(page) {
  const cdp = await page.context().newCDPSession(page);
  
  await cdp.send('Page.enable');
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080
  });
  
  const pc = new RTCPeerConnection();
  
  cdp.on('Page.screencastFrame', async (params) => {
    const frameData = params.data; // Base64 image
    await sendFrameViaWebRTC(pc, frameData);
    await cdp.send('Page.screencastFrameAck', {
      sessionId: params.sessionId
    });
  });
  
  return pc;
}
```

#### WebRTC Client Integration
```html
<!DOCTYPE html>
<html>
<head>
    <title>Real-time Browser Automation</title>
</head>
<body>
    <video id="browserStream" autoplay controls></video>
    
    <script>
        class BrowserViewer {
            async connect() {
                const ws = new WebSocket('ws://your-gce-instance:8080');
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                
                // Receive video stream
                pc.ontrack = (event) => {
                    document.getElementById('browserStream').srcObject = event.streams[0];
                };
                
                // WebRTC signaling
                ws.onmessage = async (event) => {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'answer') {
                        await pc.setRemoteDescription(data.answer);
                    }
                    
                    if (data.type === 'ice-candidate') {
                        await pc.addIceCandidate(data.candidate);
                    }
                };
                
                // Create offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({ type: 'offer', offer }));
                
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        ws.send(JSON.stringify({
                            type: 'ice-candidate',
                            candidate: event.candidate
                        }));
                    }
                };
            }
        }
        
        // Initialize connection
        new BrowserViewer().connect();
    </script>
</body>
</html>
```

#### WebRTC Setup Dependencies
```bash
# Install WebRTC dependencies
npm install ws wrtc simple-peer

# For production-grade streaming (optional)
npm install mediasoup mediasoup-client
```

#### WebRTC Architecture
```
[Playwright Browser] → [CDP Screencast] → [WebRTC Stream] → [Client Web App]
                                                ↑                    ↑
                                        [Signaling Server]    [Native Video Player]
```

#### Alternative WebRTC Implementation Options

**1. Direct Screen Capture:**
```bash
# Capture X11 display with ffmpeg + WebRTC
ffmpeg -f x11grab -r 30 -s 1920x1080 -i :1.0 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -f rtp rtp://localhost:5004
```

**2. Simple-Peer (Easier Implementation):**
```typescript
import SimplePeer from 'simple-peer';

const peer = new SimplePeer({ 
  initiator: true,
  stream: browserCaptureStream 
});
// Simplified signaling process
```

**3. MediaSoup (Enterprise-grade):**
```typescript
// Production streaming solution used by Google Meet, Discord
import mediasoup from 'mediasoup';
// Supports multiple viewers, recording, transcoding
```

#### WebRTC Benefits
- ✅ **Ultra-low latency** (50-100ms vs 200-500ms for VNC)
- ✅ **Adaptive quality** (automatically adjusts to network)
- ✅ **Native browser support** (no plugins required)
- ✅ **Mobile-friendly** (works on phones/tablets)
- ✅ **Bandwidth optimized** (smart compression)
- ✅ **P2P capable** (can work without server relay)
- ✅ **Modern standard** (actively maintained)

#### WebRTC Considerations
- 🔄 More complex signaling setup
- 🔄 Requires WebSocket server for coordination
- 🔄 Network traversal complexity (NAT/firewall)
- 🔄 Browser compatibility variations
- 🔄 Debugging can be challenging

#### WebRTC vs VNC Comparison
| Feature | WebRTC | VNC |
|---------|--------|-----|
| **Latency** | 50-100ms | 200-500ms |
| **Quality** | Adaptive HD | Fixed resolution |
| **Browser Support** | Native | Requires client |
| **Bandwidth** | Optimized | Higher |
| **Setup Complexity** | Medium | Low |
| **Mobile Support** | Excellent | Poor |
| **P2P Capable** | Yes | No |
| **Production Ready** | Yes | Limited |

## Quick GCE Setup

### 1. Create Instance
```bash
gcloud compute instances create mastra-app \
  --zone=us-central1-a \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud
```

### 2. Install Dependencies
```bash
# Node.js and pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm

# Playwright dependencies  
sudo apt-get install -y libnss3 libnspr4 libdbus-1-3 libatk1.0-0
npx playwright install
```

### 3. Deploy App
```bash
git clone https://github.com/navapbc/labs-asp-experiments.git
cd labs-asp-experiments/mastra-test-app
pnpm install
# Add .env with your API keys
pnpm start
```

### 4. Configure Firewall
```bash
# Allow Mastra app port
gcloud compute firewall-rules create allow-mastra \
  --allow tcp:4111 --source-ranges 0.0.0.0/0

# Allow VNC port (for desktop VNC clients)
gcloud compute firewall-rules create allow-vnc \
  --allow tcp:5900 --source-ranges 0.0.0.0/0

# Allow web VNC port (for embedded web viewers)
gcloud compute firewall-rules create allow-web-vnc \
  --allow tcp:6080 --source-ranges 0.0.0.0/0

# Allow WebRTC signaling server port
gcloud compute firewall-rules create allow-webrtc-signaling \
  --allow tcp:8080 --source-ranges 0.0.0.0/0
```

## Environment Variables
```env
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key  
EXA_API_KEY=your_key
DATABASE_URL=your_cloud_db_url
NODE_ENV=production
```

## Monitoring
```bash
# Check service status
sudo systemctl status mastra-app

# View logs
sudo journalctl -u mastra-app -f
```

---

## Platform 2: Vercel + Cloud Browser (Recommended)

### Benefits
- ✅ **Serverless**: Pay only for actual usage
- ✅ **Zero maintenance**: No server management needed
- ✅ **Auto-scaling**: Handles traffic spikes automatically
- ✅ **Global CDN**: Fast worldwide performance
- ✅ **Simple deployment**: Git-based deployment workflow

### Architecture
```typescript
// Modified MCP config for Vercel + Browserless
export const cloudMCP = new MCPClient({
  servers: {
    playwright: {
      command: "npx",
      args: [
        "@playwright/mcp@latest", 
        "--browser-ws-endpoint=wss://production-sfo.browserless.io/chromium/playwright?token=YOUR_TOKEN"
      ]
    },
    exa: {
      command: "npx",
      args: ["-y", "mcp-remote", `https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`]
    }
  }
});
```

### Vercel Deployment Steps

#### 1. Prepare for Vercel
```bash
# Your app is already Vercel-ready since it's Node.js
# No additional configuration needed for basic deployment
```

#### 2. Environment Variables
Set these in Vercel Dashboard → Settings → Environment Variables:
```env
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key  
EXA_API_KEY=your_key
DATABASE_URL=your_cloud_db_url
BROWSERLESS_TOKEN=your_browserless_token
NODE_ENV=production
```

#### 3. Deploy to Vercel
```bash
# Option A: GitHub integration (recommended)
# Connect your repo in Vercel dashboard - auto-deploys on push

# Option B: Direct deployment
npm i -g vercel
vercel --prod
```

#### 4. Browser Service Setup
Choose a cloud browser provider:

**Browserless** (Most popular):
```typescript
// Update your MCP config
args: ["@playwright/mcp@latest", "--browser-ws-endpoint=wss://production-sfo.browserless.io/chromium/playwright?token=" + process.env.BROWSERLESS_TOKEN]
```

**BrowserCat**:
```typescript
args: ["@playwright/mcp@latest", "--browser-ws-endpoint=wss://api.browsercat.com?token=" + process.env.BROWSERCAT_TOKEN]
```

### Limitations
- **Function timeout**: 300s default (800s max on Pro/Enterprise)
- **Function size**: 250MB limit (shouldn't be an issue for your app)
- **No persistent sessions**: Browser sessions reset between function calls

---

## Understanding Playwright MCP

### How It Works
The **Playwright MCP server** acts as a bridge between your Mastra agents and browser automation:

```
[Mastra Agent] → [Playwright MCP Server] → [Browser Engine]
     ↑                    ↑                      ↑
   AI Logic         Protocol Bridge        Actual Browser
```

### Local vs Remote Execution

**When you run locally:**
```typescript
args: ["@playwright/mcp@latest", "--isolated"]
```
- MCP server runs on your machine
- Browser launches on your machine (headless)
- AI agents control the local browser via MCP

**When you use cloud browsers:**
```typescript
args: ["@playwright/mcp@latest", "--browser-ws-endpoint=wss://browserless.io/..."]
```
- MCP server still runs locally/on Vercel
- Browser runs on cloud service (Browserless)
- AI agents control the remote browser via WebSocket

### Why This Works for Headless
1. **MCP Server**: Lightweight Node.js process that translates AI commands
2. **Browser Engine**: Can be local OR remote - MCP doesn't care where it is
3. **Accessibility Tree**: MCP uses structured page data, not pixels
4. **WebSocket Protocol**: Allows browser to be anywhere on the internet

The key insight: **MCP isn't the browser** - it's the translator that tells browsers what to do.

---

## Platform Comparison

| Feature | GCE | Vercel + Cloud Browser |
|---------|-----|----------------------|
| Setup Complexity | High | Low |
| Maintenance | Manual | Automatic |
| Scaling | Manual | Automatic |
| Cost (Low Usage) | Higher | Lower |
| Cost (High Usage) | Lower | Higher |
| Browser Control | Full | API-limited |
| Custom Dependencies | Full | Limited |

## Recommendations

### **For Real-time Browser Visualization:**

1. **WebRTC (Recommended)**: Best performance, modern standard
   - Use for production applications needing real-time monitoring
   - Lower latency, better quality, mobile-friendly
   - More complex setup but superior user experience

2. **VNC**: Simpler setup, universal compatibility  
   - Good for development/debugging environments
   - Works with any VNC client, easier to troubleshoot
   - Higher latency but more straightforward implementation

3. **Hybrid approach**: Start with VNC for proof-of-concept, migrate to WebRTC for production

### **For General Deployment:**

1. **Start with Vercel + Browserless** for rapid deployment and testing
2. **Move to GCE** if you need:
   - Custom browser configurations  
   - Very high usage (cost optimization)
   - Specific security requirements
   - Full infrastructure control
   - Real-time browser visualization (VNC/WebRTC)

3. **Production architecture**: Use Vercel for the main app + dedicated GCE instance for browser-heavy workloads