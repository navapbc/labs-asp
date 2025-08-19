# Labs ASP - AI Agent Platform

A production-ready Mastra-based AI agent platform with browser-in-browser visualization and cloud-native deployment.

## ✨ Features

- 🤖 **Multi-Agent System**: Web automation, data extraction, and research agents
- 🖥️ **Browser-in-Browser**: Real-time visualization of agent actions (VNC, WebRTC, Screenshots)
- ☁️ **Cloud-Native**: Hybrid Cloud Run + GCE architecture for optimal performance
- 🔒 **Secure**: Private networking, secret management, and encrypted connections
- 📊 **Scalable**: Auto-scaling web app with persistent browser pools
- 🚀 **CI/CD Ready**: GitHub Actions with preview environments

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloud Run     │    │  GCE Browser     │    │  Cloud SQL      │
│   (Web App)     │ -> │  Pool (MCP)      │ -> │  (Database)     │
│                 │    │                  │    │                 │
│ • Serverless    │    │ • Persistent     │    │ • Private       │
│ • Auto-scaling  │    │ • VNC/WebRTC     │    │ • Encrypted     │
│ • Preview URLs  │    │ • Playwright     │    │ • Backed up     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Google Cloud Project with billing enabled
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed
- [Terraform](https://developer.hashicorp.com/terraform/downloads) v1.5+
- [Docker](https://docs.docker.com/get-docker/) installed

### 1. Deploy Infrastructure

```bash
# Clone and setup
git clone <your-repo-url>
cd labs-asp

# Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# Deploy everything (takes 10-15 minutes)
./scripts/deploy-infrastructure.sh
```

This will:
- ✅ Enable required GCP APIs
- ✅ Deploy VPC, Cloud SQL, and networking
- ✅ Create browser pool with load balancer
- ✅ Set up Artifact Registry and secrets
- ✅ Build and push your container

### 2. Deploy Application

```bash
# Deploy the app to Cloud Run
./scripts/deploy-app.sh
```

### 3. Access Your Platform

- **Main App**: `https://your-cloud-run-url.run.app`
- **Login**: `https://your-cloud-run-url.run.app/auth/login`
- **Browser Dashboard**: `https://your-cloud-run-url.run.app/browser-dashboard`

## 🖥️ Browser-in-Browser

The platform provides multiple ways to view and interact with your AI agents:

### VNC Viewer
```typescript
// Traditional remote desktop - works everywhere
const vncViewer = new BrowserViewer(container, {
  mode: 'vnc',
  enableInteraction: true
});
```

### WebRTC Stream
```typescript
// Real-time video streaming - lowest latency
const webrtcViewer = new BrowserViewer(container, {
  mode: 'webrtc',
  quality: 'high'
});
```

### Screenshot Feed
```typescript
// HTTP polling - lightweight monitoring
const screenshotViewer = new BrowserViewer(container, {
  mode: 'screenshots',
  quality: 'medium'
});
```

### DOM Mirror
```typescript
// Synchronized DOM - interactive debugging
const domViewer = new BrowserViewer(container, {
  mode: 'dom-mirror',
  enableInteraction: true
});
```

## 🧪 Local Development

### Docker Compose Setup

```bash
# Start local development environment
pnpm docker:dev

# This starts:
# - Main app (localhost:4111)
# - MCP Gateway (localhost:8811)
# - PostgreSQL database
# - Redis (optional)
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp env.example .env
# Edit .env with your API keys

# Start database (if not using Docker)
# Update DATABASE_URL in .env

# Run migrations
pnpm db:migrate:deploy

# Start development server
pnpm dev
```

## 🔧 Configuration

### Environment Variables

```bash
# API Keys (required)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
EXA_API_KEY=your_exa_key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication
MASTRA_JWT_SECRET=your_jwt_secret
MASTRA_APP_PASSWORD=your_app_password

# Browser Pool (production)
MCP_GATEWAY_URL=http://browser-pool-lb:8811/sse
```

### Browser Pool Configuration

The browser pool supports various viewing modes:

```yaml
# docker-compose.yml (local)
services:
  mcp-gateway:
    image: docker/mcp-gateway:latest
    ports:
      - "8811:8811"  # MCP Gateway
      - "6080:6080"  # noVNC web interface
      - "8080:8080"  # WebRTC signaling
```

## 🚢 Deployment

### Infrastructure as Code

All infrastructure is managed with Terraform:

```bash
# Plan deployment
./scripts/deploy-infrastructure.sh plan

# Apply changes
./scripts/deploy-infrastructure.sh apply

# Destroy (careful!)
./scripts/deploy-infrastructure.sh destroy
```

### CI/CD Pipeline

GitHub Actions automatically:
- ✅ Builds and tests on every push
- ✅ Creates preview environments for PRs
- ✅ Deploys to production on main branch
- ✅ Cleans up old deployments

### Preview Environments

Every pull request gets its own environment:
- Unique URL: `https://pr-123-labs-asp.run.app`
- Isolated database schema
- Full browser pool access
- Automatic cleanup on PR close

## 📊 Monitoring

### Health Checks

```bash
# Main app health
curl https://your-app-url/health

# Browser pool health
curl http://browser-pool-ip:3000/health

# MCP Gateway health
curl http://browser-pool-ip:8811/health
```

### Logs

```bash
# Cloud Run logs
gcloud run services logs read labs-asp-main --region=us-central1

# Browser pool logs
gcloud compute ssh browser-pool-instance --zone=us-central1-a
sudo docker-compose -f /opt/browser-pool/docker-compose.yml logs
```

## 🛠️ Development

### Project Structure

```
labs-asp/
├── src/                    # Application source
│   ├── mastra/            # Mastra agents and workflows
│   ├── browser-viewer/    # Browser-in-browser components
│   └── utils/             # Utilities
├── terraform/             # Infrastructure as code
│   ├── environments/      # Environment-specific configs
│   └── modules/           # Reusable Terraform modules
├── docker/                # Docker configurations
├── scripts/               # Deployment and utility scripts
└── docs/                  # Documentation
```

### Adding New Agents

```typescript
// src/mastra/agents/my-agent.ts
export const myAgent = new Agent({
  name: 'myAgent',
  instructions: 'Your agent instructions...',
  model: openai('gpt-4'),
  tools: await mcpClient.getTools(),
});
```

### Browser Automation

```typescript
// Use the web automation agent
const response = await webAutomationAgent.stream([{
  role: 'user',
  content: 'Visit example.com and take a screenshot'
}]);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issues](https://github.com/your-org/labs-asp/issues)
- 💬 [Discussions](https://github.com/your-org/labs-asp/discussions)

---

**Built with ❤️ using [Mastra](https://mastra.ai), Google Cloud, and modern web technologies.**