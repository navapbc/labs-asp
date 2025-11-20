# Labs ASP - Client-Server Architecture Deployment

This Terraform configuration deploys the Labs ASP application using a **client-server architecture** with:

- **Browser Service**: Dedicated Compute Engine VM running Playwright automation
- **Mastra Service**: Cloud Run service for AI agent backend
- **AI Chatbot Service**: Cloud Run service for Next.js frontend

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser VM    │    │  Mastra Cloud   │    │ Chatbot Cloud   │
│                 │    │      Run        │    │      Run        │
│ • Playwright    │◄───┤                 │◄───┤                 │
│ • MCP Server    │    │ • AI Agents     │    │ • Next.js App   │
│ • WebSocket     │    │ • Tool Calls    │    │ • Chat UI       │
│                 │    │ • /chat Route   │    │ • Auth          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                        ┌─────────────────┐
                        │  Cloud SQL DB   │
                        │   (existing)    │
                        └─────────────────┘
```

## Benefits

- **Separation of Concerns**: Browser automation isolated from application logic
- **Independent Scaling**: Each service scales based on demand
- **Cost Optimization**: Cloud Run scales to zero when not used
- **Build Dependency Resolution**: Browser VM runs independently of build process
- **Resource Optimization**: Right-sized compute for each component

## Prerequisites

1. **Existing Infrastructure** (reused):
   - Cloud SQL databases (`app-dev`, `app-preview`, `app-prod`)
   - Secret Manager secrets for API keys
   - Artifact Registry repository

2. **Container Images** (build required):
   - `browser-streaming:latest` - Playwright MCP container
   - `mastra-app:latest` - Mastra backend with chatRoute
   - `ai-chatbot:latest` - Next.js frontend with conditional routing

## Deployment

### Important: Build vs Deploy Separation

**Terraform manages infrastructure, NOT Docker builds.** You must build and push Docker images before deploying.

#### Why This Separation?

- **Terraform** = Infrastructure as Code (VMs, Cloud Run, IAM, networking)
- **Docker Builds** = Application packaging (done by CI/CD or locally)
- Terraform references pre-built images from Artifact Registry

### Development Deployment (Local Build)

#### 1. Build and Push Docker Images

**IMPORTANT:** Build fresh images before deploying to ensure latest code changes are included.

```bash
# Build order matters: browser-streaming first, then others in parallel

# Step 1: Build and push browser-streaming
docker build -f playwright-mcp/Dockerfile \
  -t us-central1-docker.pkg.dev/nava-labs/labs-asp/browser-streaming:latest \
  ./playwright-mcp
docker push us-central1-docker.pkg.dev/nava-labs/labs-asp/browser-streaming:latest

# Step 2: Build mastra-app and ai-chatbot (can run in parallel)
docker build -f Dockerfile \
  -t us-central1-docker.pkg.dev/nava-labs/labs-asp/mastra-app:latest .
docker build -f Dockerfile.ai-chatbot \
  -t us-central1-docker.pkg.dev/nava-labs/labs-asp/ai-chatbot:latest .

# Step 3: Push both images (can run in parallel)
docker push us-central1-docker.pkg.dev/nava-labs/labs-asp/mastra-app:latest
docker push us-central1-docker.pkg.dev/nava-labs/labs-asp/ai-chatbot:latest
```

**Authentication:** If you get "Unauthenticated" errors:
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

#### 2. Configure Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars if needed (defaults should work for dev)
```

#### 3. Initialize Terraform

```bash
terraform init
```

#### 4. Plan Deployment

```bash
terraform plan -var="environment=dev"
```

Review the plan to ensure:
- Browser VM will be created
- Both Cloud Run services will be created
- Workload Identity Pool will be created (for GitHub Actions)

#### 5. Deploy Infrastructure

```bash
terraform apply -var="environment=dev"
```

This will:
- Create browser VM and pull `:latest` image
- Deploy mastra-app Cloud Run service
- Deploy ai-chatbot Cloud Run service
- Configure networking and IAM

### Production Deployment (GitHub Actions)

For preview/prod environments, use the automated GitHub Actions workflow:

1. **Push your branch to GitHub**
   ```bash
   git push origin feat/your-branch
   ```

2. **Create a Pull Request**
   - GitHub Actions automatically builds images
   - Deploys preview environment
   - Posts preview URL in PR comment

3. **Merge to deploy to prod**
   - Merging to `main` triggers prod deployment
   - Images are built and tagged with commit SHA
   - Terraform applies infrastructure changes

## Environment Variables

The deployment expects these Secret Manager secrets to exist:
- `database-url-{environment}` or `database-url-production`
- `openai-api-key`
- `anthropic-api-key`
- `exa-api-key`
- `mastra-jwt-secret`
- `mastra-app-password`
- `nextauth-secret`

## Networking

- **Browser VM**: Internal IP accessible to Cloud Run services
- **Mastra Service**: Connects to Browser VM via internal IP
- **Chatbot Service**: Connects to both Browser VM and Mastra Service
- **Public Access**: Only Chatbot service exposed publicly

## Service Endpoints

After deployment, access services via:
- **AI Chatbot**: `https://ai-chatbot-{env}-{project}.{region}.run.app`
- **Mastra API**: `https://mastra-app-{env}-{project}.{region}.run.app/chat`
- **Browser MCP**: Internal only - `http://{vm-internal-ip}:8931/mcp`

## Build Dependencies

This architecture resolves the Docker build dependency issue:

1. **Browser VM** runs independently with pre-built image
2. **Mastra Service** can build knowing Browser VM endpoint
3. **Chatbot Service** can build knowing Mastra Service endpoint

## Environment Support

Deploy to different environments:
```bash
terraform apply -var="environment=dev"     # Development
terraform apply -var="environment=preview" # Preview/Staging
terraform apply -var="environment=prod"    # Production
```

Each environment gets:
- Dedicated browser VM
- Separate Cloud Run services
- Isolated networking
- Environment-specific secrets