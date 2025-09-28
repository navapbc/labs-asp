# Client-Server Architecture Deployment Strategy

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Build       │→ │ Deploy      │→ │ Preview/PR  │            │
│  │ 3 Images    │  │ 2 Services  │  │ Comments    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser VM    │◄──┤  Mastra Cloud   │◄──┤ Chatbot Cloud   │
│                 │   │      Run        │   │      Run        │
│ • Playwright    │   │                 │   │                 │
│ • MCP Server    │   │ • AI Agents     │   │ • Next.js App   │
│ • WebSocket     │   │ • Tool Calls    │   │ • Chat UI       │
│ • (Terraform)   │   │ • /chat Route   │   │ • Auth          │
│                 │   │ • (GitHub CI)   │   │ • (GitHub CI)   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## 🚀 **Deployment Flow**

### **Phase 1: One-time Browser VM Setup** (Terraform)
```bash
# Deploy browser VM infrastructure
cd terraform
terraform apply -var="environment=dev"
```

### **Phase 2: Continuous Service Deployment** (GitHub Actions)
```bash
# Triggered automatically on:
git push origin main       # → Production deployment
git push origin develop    # → Development deployment
# Open PR                  # → Preview deployment
```

## 🔄 **GitHub Actions Workflow**

### **Build Job** (`build`)
1. **Checkout code** and authenticate to GCP
2. **Build 3 container images** in parallel:
   - `browser-streaming` (from `playwright-mcp/`)
   - `mastra-app` (from root with `Dockerfile`)
   - `ai-chatbot` (from root with `Dockerfile.ai-chatbot`)
3. **Push to Artifact Registry** with commit SHA tags + `latest`

### **Deploy Job** (`deploy`)
1. **Get browser VM internal IP** for service connection
2. **Deploy Mastra Service** with:
   - Connection to browser VM (`PLAYWRIGHT_MCP_URL`)
   - All AI API keys from Secret Manager
   - Environment-specific database
3. **Deploy AI Chatbot Service** with:
   - Connection to Mastra service (`NEXT_PUBLIC_MASTRA_SERVER_URL`)
   - Connection to browser VM (for direct streaming)
   - Dual database access (Neon + Cloud SQL)

## 🌍 **Environment Strategy**

| Git Branch | Environment | Mastra Service | Chatbot Service | Browser VM |
|------------|-------------|----------------|-----------------|------------|
| `main` | `prod` | `mastra-app-prod` | `ai-chatbot-prod` | `browser-streaming-prod` |
| `develop` | `dev` | `mastra-app-dev` | `ai-chatbot-dev` | `browser-streaming-dev` |
| PR #123 | `preview` | `pr-123-mastra-app` | `pr-123-ai-chatbot` | `browser-streaming-preview` |

## 🔧 **Benefits of This Approach**

### ✅ **Solves Build Dependencies**
- **Browser VM** deployed independently via Terraform
- **Mastra + Chatbot** deployed via GitHub Actions with known browser VM IP
- **No circular dependencies** during build process

### ✅ **Leverages Existing Infrastructure**
- **Reuses** your existing Cloud SQL databases
- **Reuses** your existing Secret Manager secrets
- **Reuses** your existing GitHub Actions setup with Workload Identity

### ✅ **Environment Isolation**
- **Separate VMs** for each environment (dev/preview/prod)
- **Separate Cloud Run services** with environment-specific configs
- **Automatic cleanup** of preview deployments

### ✅ **Developer Experience**
- **PR previews** with full 3-service architecture
- **Automatic deployments** on branch pushes
- **Rich PR comments** with service URLs and architecture diagram

## 📋 **Next Steps**

### 1. **Deploy Browser VMs** (One-time per environment)
```bash
# Development
terraform apply -var="environment=dev"

# Preview (for PRs)
terraform apply -var="environment=preview"

# Production (when ready)
terraform apply -var="environment=prod"
```

### 2. **Trigger GitHub Actions** (Automatic)
```bash
# Create feature branch and open PR
git checkout -b feat/new-feature
git push origin feat/new-feature
# Open PR → Triggers preview deployment

# Merge to develop
git checkout develop
git merge feat/new-feature
git push origin develop
# → Triggers dev deployment

# Merge to main (when ready)
git checkout main
git merge develop
git push origin main
# → Triggers production deployment
```

### 3. **Monitor and Scale**
- **Logs**: Cloud Run services log to Cloud Logging
- **Metrics**: Built-in Cloud Run metrics + custom application metrics
- **Scaling**: Auto-scaling based on traffic (min 0, max configurable)
- **Cost**: Pay-per-use for Cloud Run, fixed cost for browser VMs

## 🔐 **Security Features**

- ✅ **No secrets in code** - all stored in Secret Manager
- ✅ **Workload Identity** for secure GitHub Actions authentication
- ✅ **Service accounts** with least-privilege access
- ✅ **Internal networking** between services via GCP internal IPs
- ✅ **Firewall rules** restrict browser VM access

This strategy gives you production-ready infrastructure that scales, is secure, and maintains your existing development workflow while implementing the new client-server architecture!