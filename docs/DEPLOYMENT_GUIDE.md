# Labs ASP Deployment Guide

This guide walks you through deploying the Labs ASP application using the Phase 1 architecture with Terraform and GitHub Actions.

## Architecture Overview

The deployment creates a multi-environment setup on Google Cloud Platform:

- **Production** (`main` branch): `labs-asp-prod` Cloud Run service
- **Development** (`develop` branch): `labs-asp-dev` Cloud Run service  
- **Preview** (PRs & feature branches): Dynamic `pr-{number}-labs-asp` services

## Prerequisites

✅ **Already Set Up** (based on existing infrastructure):
- GCP Project: `nava-labs` with billing enabled
- Cloud SQL instances: `app-dev`, `app-preview`, `app-prod`
- Secret Manager secrets: All API keys and database URLs
- GitHub Actions service account with Workload Identity Federation

🔧 **Still Need**:
- Terraform >= 1.0 installed locally
- gcloud CLI authenticated with project access
- Custom domain (optional, for production URLs)

## Quick Deployment

### 1. Initialize Terraform

```bash
cd terraform
terraform init
```

This will:
- Configure the GCS backend for state storage
- Download required providers (Google Cloud, Google Beta)

### 2. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
# Required
project_id = "nava-labs"
region     = "us-central1"

# Optional: Custom domain
domain_name          = "your-domain.com"  # Set if you have a domain
enable_load_balancer = true               # Creates global LB + SSL
enable_dns          = false               # Set to true if managing DNS

# GitHub repository
github_repository = "navapbc/labs-asp"
```

### 3. Deploy Infrastructure

```bash
terraform plan    # Review changes
terraform apply   # Deploy infrastructure
```

This creates:
- 🏃 **Cloud Run services** for each environment
- 🌐 **Global Load Balancer** with SSL certificates  
- 🗄️ **Cloud Storage buckets** for artifacts and build cache
- 📦 **Artifact Registry** for container images
- 👤 **Service accounts** with proper IAM permissions

### 4. Deploy Application

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys when you push code:

```bash
git push origin main        # Deploys to production
git push origin develop     # Deploys to development
# PRs automatically get preview deployments
```

## Environment URLs

After deployment, you can access:

### With Custom Domain (if configured)
- **Production**: `https://your-domain.com`
- **Development**: `https://dev.your-domain.com`  
- **Preview**: `https://preview.your-domain.com`

### Without Custom Domain (Cloud Run URLs)
Check the Terraform output:
```bash
terraform output environment_urls
```

Or GitHub Actions logs for PR preview URLs.

## Deployment Workflow

### Automatic Deployments

The GitHub Actions workflow triggers on:

1. **Push to `main`** → Deploys to `labs-asp-prod`
2. **Push to `develop`** → Deploys to `labs-asp-dev`
3. **Pull Requests** → Creates `pr-{number}-labs-asp` preview
4. **Feature branches** → Creates `branch-{name}-labs-asp` preview

### Manual Deployments

You can also deploy manually using gcloud:

```bash
# Development
pnpm run deploy:dev

# Production  
pnpm run deploy:prod

# Custom deployment
gcloud run deploy my-service-name \
  --source . \
  --region us-central1 \
  --service-account labs-asp-cloud-run@nava-labs.iam.gserviceaccount.com
```

## Configuration Details

### Environment Variables

Each Cloud Run service gets these environment variables from Secret Manager:

```bash
# Database (environment-specific)
DATABASE_URL           # From database-url-{env} secret

# API Keys (shared across environments)  
OPENAI_API_KEY         # From openai-api-key secret
ANTHROPIC_API_KEY      # From anthropic-api-key secret
EXA_API_KEY           # From exa-api-key secret

# Authentication (shared)
MASTRA_JWT_SECRET     # From mastra-jwt-secret secret  
MASTRA_APP_PASSWORD   # From mastra-app-password secret

# Runtime configuration
NODE_ENV              # production/development
ENVIRONMENT           # prod/dev/preview
GCP_PROJECT_ID        # nava-labs
STORAGE_BUCKET        # labs-asp-artifacts
```

### Resource Configuration

Cloud Run services use Phase 1 specifications:

```yaml
CPU: 2000m        # 2 vCPUs for browser + Node.js
Memory: 4Gi       # 4GB RAM for Chrome processes  
Timeout: 3600s    # 60 minutes for long automations
Min Instances: 0  # Scale to zero when idle
Max Instances: 100 # Auto-scale based on demand
```

### Container Image

The Dockerfile creates an optimized container:

- **Base**: Node.js 20 on Debian Bullseye
- **Playwright**: Chromium browser with all dependencies
- **MCP Server**: `@playwright/mcp@latest` for browser automation
- **Security**: Non-root user, health checks
- **Build**: Multi-stage build for smaller production image

## Monitoring & Debugging

### Health Checks

All services expose a health check endpoint:

```bash
curl https://your-service-url/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z", 
  "version": "abc123...",
  "environment": "production"
}
```

### Logs

View application logs:

```bash
# Production logs
gcloud logs read --resource-type=cloud_run_revision \
  --resource-labels=service_name=labs-asp-prod \
  --limit=100

# Development logs  
gcloud logs read --resource-type=cloud_run_revision \
  --resource-labels=service_name=labs-asp-dev \
  --limit=100

# Preview logs (replace with actual service name)
gcloud logs read --resource-type=cloud_run_revision \
  --resource-labels=service_name=pr-123-labs-asp \
  --limit=100
```

### Service Status

Check Cloud Run service status:

```bash
gcloud run services list --region=us-central1
gcloud run services describe labs-asp-prod --region=us-central1
```

### Load Balancer Status

If using custom domains:

```bash
gcloud compute url-maps list
gcloud compute ssl-certificates list
gcloud compute global-addresses list
```

## Troubleshooting

### Common Issues

#### 1. **"Service account not found"**
The GitHub Actions service account exists but may need additional permissions:

```bash
gcloud projects add-iam-policy-binding nava-labs \
  --member="serviceAccount:github-actions-deploy@nava-labs.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

#### 2. **"Secret not found"** 
Verify secrets exist:

```bash
gcloud secrets list
gcloud secrets versions access latest --secret="database-url-production"
```

#### 3. **"SSL certificate provisioning failed"**
Google-managed SSL certificates can take 15-60 minutes. Check status:

```bash
gcloud compute ssl-certificates describe labs-asp-ssl-cert --global
```

#### 4. **"Database connection failed"**
Check if Cloud Run service account has SQL client role:

```bash
gcloud projects add-iam-policy-binding nava-labs \
  --member="serviceAccount:labs-asp-cloud-run@nava-labs.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

#### 5. **"Container build failed"**
Check GitHub Actions logs and verify Artifact Registry permissions:

```bash
gcloud artifacts repositories list --location=us-central1
gcloud artifacts repositories get-iam-policy labs-asp --location=us-central1
```

### Manual Testing

Test the deployment locally:

```bash
# Build and run container locally
pnpm run docker:build
pnpm run docker:run

# Test health endpoint
curl http://localhost:4111/health

# Test auth flow
open http://localhost:4111/auth/login
```

## Security Notes

- 🔐 **No service account keys**: Uses Workload Identity Federation
- 🛡️ **Secrets in Secret Manager**: No secrets in code or environment files
- 🚪 **Authentication required**: All routes except health check require login
- 🔒 **HTTPS only**: SSL certificates for all custom domains
- 👤 **Least privilege**: Service accounts have minimal required permissions

## Cost Optimization

- **Cloud Run**: Pay-per-request, scales to zero
- **Load Balancer**: ~$18/month for global LB
- **SSL Certificates**: Free with Google-managed certificates
- **Storage**: ~$0.02/GB/month for artifacts
- **SQL**: Existing shared-core instances are cost-effective

## Next Steps

This Phase 1 deployment provides:
- ✅ Multi-environment automated deployments
- ✅ SSL certificates and custom domains
- ✅ Headless browser automation with screenshots
- ✅ Authentication and security
- ✅ Monitoring and logging

**Phase 2** will add:
- 🔄 Real-time browser streaming with WebSocket
- 🎯 GKE cluster for dedicated browser infrastructure  
- 📺 VNC servers for browser visualization
- 🗄️ Redis for session management
- 👥 Multi-user support

## Support

For issues:
1. Check [Terraform README](../terraform/README.md) for infrastructure questions
2. Review [GitHub Actions workflow](../.github/workflows/deploy.yml) for deployment issues
3. Examine [Production Architecture](./PRODUCTION_ARCHITECTURE.md) for overall design
4. Use `terraform plan` to see what changes would be made before applying
