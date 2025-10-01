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

### 1. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Plan Deployment

```bash
terraform plan -var="environment=dev"
```

### 4. Deploy Infrastructure

```bash
terraform apply -var="environment=dev"
```

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