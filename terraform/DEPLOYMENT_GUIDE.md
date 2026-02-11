# Deployment Guide

## Overview

This project uses GitHub Actions to automatically build Docker images and deploy infrastructure using Terraform. Deployments are triggered automatically based on branch activity.

## Deployment Environments

| Environment | Trigger | State Prefix | Purpose |
|------------|---------|--------------|---------|
| **Preview** | Pull Request | `terraform/state/preview-pr-{number}` | Isolated testing environment per PR |
| **Dev** | Push to `develop` | `terraform/state/dev` | Main development environment |
| **Prod** | Push to `main` | `terraform/state/prod` | Production environment |

## Architecture

### Infrastructure Components

1. **GCP Compute Engine VM** (`app-vm-{environment}`)
   - Runs Container-Optimized OS (COS)
   - Hosts two Docker containers:
     - `browser-streaming`: Playwright MCP server + browser automation
     - `mastra-app`: Mastra API server

2. **Cloud Run Services**
   - `ai-chatbot`: Web UI for interacting with agents
   - `browser-ws-proxy`: WebSocket proxy for browser streaming

3. **Shared Resources** (managed only by `dev` environment)
   - GitHub Actions service account
   - Workload Identity Pool
   - IAM bindings
   - GCS buckets (per environment, but created by dev)
   - Secret Manager secrets

## How Deployments Work

### 1. Code Changes → Docker Images

When you push code or open a PR, GitHub Actions:

1. **Authenticates** to GCP using Workload Identity
2. **Builds Docker images** for all components (always, regardless of what changed):
   - `browser-streaming:${COMMIT_SHA:0:7}`
   - `browser-ws-proxy:${COMMIT_SHA:0:7}`
   - `mastra-app:${COMMIT_SHA:0:7}`
   - `ai-chatbot:${COMMIT_SHA:0:7}`
3. **Pushes images** to Artifact Registry at `us-central1-docker.pkg.dev/nava-labs/labs-asp/`

### 2. Docker Images → Infrastructure Deployment

Terraform then:

1. **Initializes** with environment-specific state prefix
2. **Plans changes** using the new Docker image tags
3. **Applies changes**:
   - Updates VM metadata with new image tags
   - VM startup script pulls new images and restarts containers
   - Updates Cloud Run services with new images

### 3. VM Container Updates

When new images are deployed:

1. VM metadata is updated with new image tags (`browser-image-version`, `mastra-image-version`)
2. Terraform triggers VM restart (metadata changes cause VM reboot)
3. Startup script (`terraform/scripts/startup.sh`) runs on boot:
   - Configures Docker for Artifact Registry
   - Pulls latest images
   - Stops old containers
   - Starts new containers with updated configuration

## Key Architecture Decisions

### Global Resources Management

Only the `dev` environment manages global resources:
- GitHub Actions service account
- Workload Identity Pool
- IAM bindings
- GCS buckets for all environments

**Why?** Prevents preview/prod environments from destroying critical shared infrastructure.

See: `terraform/iam.tf:5-6`
```terraform
locals {
  is_managing_globals = var.environment == "dev"
}
```

### Always Build All Images

**Problem:** Previously, images were built conditionally based on path changes. This caused failures when only Terraform changed - new commit SHAs had no corresponding images in Artifact Registry.

**Solution:** Always build all images on every deployment (`.github/workflows/deploy.yml:125-161`).

**Trade-off:** Longer build times, but guaranteed image availability.

### Application Default Credentials (ADC)

Vertex AI authentication uses ADC instead of JSON key files:
- VM service account has `roles/aiplatform.user` permission
- No credential files needed
- Works both locally (with `gcloud auth application-default login`) and on VMs
- More secure - no secrets in containers

See: `terraform/compute.tf:195-199`

### VM Updates Trigger Restart

VM metadata changes (new image versions) trigger automatic VM restart to run startup script:
- `browser-image-version` metadata
- `mastra-image-version` metadata

See: `terraform/compute.tf:72-75`

## Deployment Workflows

### Preview Environment (Pull Request)

**Automatic on PR creation/update:**

```bash
# 1. Open PR against develop or main
# GitHub Actions automatically:
# - Builds all Docker images
# - Creates preview environment: preview-pr-{number}
# - Deploys isolated infrastructure
# - Comments on PR with service URLs
```

**What gets deployed:**
- Isolated VM: `app-vm-preview-pr-{number}`
- Cloud Run services with PR-specific names
- Uses dev database and dev GCS bucket
- Separate Terraform state

**Access URLs** (posted as PR comment):
- AI Chatbot: `https://ai-chatbot-preview-pr-{number}-{hash}.run.app`
- Mastra API: `http://{VM_IP}:4112`
- Browser MCP: `http://{VM_IP}:8931/mcp`
- Browser Streaming: `ws://{VM_IP}:8933`

### Dev Environment

**Automatic on push to `develop`:**

```bash
git checkout develop
git merge feature-branch
git push origin develop

# GitHub Actions automatically:
# - Builds all Docker images
# - Deploys to dev environment
# - Creates/updates global resources (IAM, buckets, etc.)
```

**What gets deployed:**
- VM: `app-vm-dev`
- Cloud Run services: `ai-chatbot-dev`, `browser-ws-proxy-dev`
- Global resources (managed only by dev)
- Uses dev database and dev GCS bucket

### Production Environment

**Automatic on push to `main`:**

```bash
git checkout main
git merge develop
git push origin main

# GitHub Actions automatically:
# - Builds all Docker images
# - Deploys to prod environment
# - Uses production database and GCS bucket
```

**What gets deployed:**
- VM: `app-vm-prod`
- Cloud Run services: `ai-chatbot-prod`, `browser-ws-proxy-prod`
- References global resources (doesn't modify them)
- Uses production database and production GCS bucket

## Manual Operations

### View Deployment Status

```bash
# Check GitHub Actions runs
gh run list --workflow=deploy.yml --limit 5

# View specific run
gh run view {run-id} --log
```

### Access VM Logs

```bash
# SSH into VM
gcloud compute ssh app-vm-{environment} --zone=us-central1-a

# View container logs
docker logs browser-streaming
docker logs mastra-app

# View startup script logs
sudo journalctl -u google-startup-scripts.service
```

### Manual VM Restart (if needed)

```bash
# Restart VM to re-run startup script with current image tags
gcloud compute instances reset app-vm-{environment} --zone=us-central1-a

# Check VM status
gcloud compute instances describe app-vm-{environment} --zone=us-central1-a
```

### Force Redeploy Without Code Changes

```bash
# Use workflow dispatch
gh workflow run deploy.yml \
  --ref develop \
  --field environment=dev
```

## Troubleshooting

### VM Containers Not Starting

**Symptoms:** VM deployed but containers not running

**Check:**
```bash
gcloud compute ssh app-vm-{environment} --zone=us-central1-a

# Check if containers are running
docker ps

# Check startup logs
sudo journalctl -u google-startup-scripts.service -f

# Common issues:
# - Image pull failures (check Artifact Registry permissions)
# - Port conflicts
# - Missing secrets
```

### Image Not Found Error

**Symptoms:** `manifest for {image}:{tag} not found`

**Cause:** Workflow didn't build images for the commit SHA

**Solution:** This should no longer happen (workflow always builds all images). If it does:
```bash
# Check if image exists
gcloud artifacts docker images list us-central1-docker.pkg.dev/nava-labs/labs-asp/browser-streaming

# Manually trigger build
gh workflow run deploy.yml --ref {branch}
```

### Terraform State Issues

**Symptoms:** Resources already exist, state conflicts

**Check state:**
```bash
cd terraform

# Initialize with correct environment
terraform init -backend-config="prefix=terraform/state/{environment}"

# List resources in state
terraform state list

# Import existing resource if needed
terraform import {resource_type}.{name} {resource_id}
```

### Preview Environment Not Cleaning Up

**Manual cleanup:**
```bash
cd terraform

# Initialize with preview environment state
terraform init -backend-config="prefix=terraform/state/preview-pr-{number}"

# Destroy preview environment
terraform destroy \
  -var="environment=preview-pr-{number}" \
  -var="browser_image_url={any_existing_image}" \
  -var="mastra_image_url={any_existing_image}" \
  -var="chatbot_image_url={any_existing_image}" \
  -var="browser_ws_proxy_image_url={any_existing_image}"
```

## Security Notes

### Service Accounts

- **GitHub Actions SA:** `github-actions-deploy@nava-labs.iam.gserviceaccount.com`
  - Managed by Workload Identity (no JSON keys)
  - Has broad permissions for deployment
  - Only accessible from `navapbc/labs-asp` repository

- **VM SA:** `app-vm-{environment}@nava-labs.iam.gserviceaccount.com`
  - Scoped per environment
  - Has minimal permissions (storage, logging, artifact registry, secrets, vertex AI)

- **Cloud Run SA:** `cloud-run-{environment}@nava-labs.iam.gserviceaccount.com`
  - Scoped per environment
  - Can access VM services, storage, secrets

### Secrets

All secrets stored in Google Secret Manager:
- `database-url-dev` / `database-url-production`
- API keys (OpenAI, Anthropic, Exa, etc.)
- `mastra-jwt-secret`, `mastra-app-password`, `mastra-jwt-token`
- `posthog-api-key` - Analytics and user behavior tracking

Accessed via:
- Terraform data sources (for startup script)
- VM/Cloud Run service accounts with `secretAccessor` role

### Network Security

Firewall rules allow public access to:
- Port 8931 (Browser MCP)
- Port 8933 (Browser Streaming WebSocket)
- Port 4112 (Mastra API)

**Production consideration:** Consider restricting source IPs or using Cloud VPN/Interconnect.

## File Reference

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | CI/CD pipeline - builds images and deploys |
| `terraform/main.tf` | Core Terraform config, providers, backend |
| `terraform/compute.tf` | VM and firewall resources |
| `terraform/cloud-run.tf` | Cloud Run services |
| `terraform/iam.tf` | Service accounts, workload identity, IAM bindings |
| `terraform/storage.tf` | GCS buckets for artifacts |
| `terraform/scripts/startup.sh` | VM startup script - pulls and runs containers |
| `terraform/variables.tf` | Input variables and defaults |
| `terraform/outputs.tf` | Output values (URLs, IPs) |

## Analytics and User Tracking

### PostHog Setup

PostHog is integrated for analytics and user behavior tracking across all environments (dev, prod, preview).

**Configuration:**
- Single PostHog Cloud project shared across all environments
- Events are tagged with `environment` property (dev/prod/preview-pr-{number})
- Client-side tracking using `posthog-js` in Next.js app
- Automatic pageview tracking and session recording

**Environment Variables:**
- `NEXT_PUBLIC_POSTHOG_KEY` - Project API key (from Secret Manager)
- `NEXT_PUBLIC_POSTHOG_HOST` - `https://us.i.posthog.com`

**Files:**
- `client/app/providers.tsx` - PostHog provider and pageview tracking
- `client/app/layout.tsx` - Provider integration
- `terraform/cloud_run.tf` - Environment variable configuration

**Managing the PostHog API Key:**
```bash
# View current secret
gcloud secrets versions access latest --secret=posthog-api-key --project=nava-labs

# Update secret with new API key
echo -n "phc_YOUR_NEW_KEY" | gcloud secrets versions add posthog-api-key --data-file=-
```

**Viewing Analytics:**
- Dashboard: https://app.posthog.com
- Filter by environment using the `environment` property
- Session recordings available for debugging user issues

## Recent Fixes

### Fix: PostHog Analytics Integration

**Added:** PostHog Cloud integration for user behavior tracking

**Changes:**
- Created `posthog-api-key` secret in Secret Manager
- Added PostHog environment variables to Cloud Run service
- Implemented PostHog provider in Next.js app with automatic pageview tracking
- All environments use the same PostHog project with environment tagging

**Files modified:**
- `terraform/cloud_run.tf` (added PostHog env vars)
- `client/app/providers.tsx` (created PostHog provider)
- `client/app/layout.tsx` (integrated provider)
- `client/package.json` (added posthog-js dependency)

### Fix: Vertex AI Claude Sonnet 4.5 Authentication

**Problem:** Model ID format incorrect (`claude-sonnet-4-5-20250929`)

**Fix:** Changed to `claude-sonnet-4-5@20250929` in `src/mastra/agents/web-automation-agent.ts:159`

### Fix: VM Not Updating After Deployment

**Problem:** Terraform updated metadata but VM didn't restart

**Solution:** Metadata changes now trigger VM restart automatically

### Fix: Switched to Application Default Credentials (ADC)

**Problem:** Using JSON credentials file caused directory conflicts and wasn't clean

**Changes:**
- Removed credentials file handling from startup script
- Added `roles/aiplatform.user` to VM service account
- Removed `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Kept `GOOGLE_CLOUD_PROJECT` for ADC to work

**Files modified:**
- `terraform/compute.tf` (removed vertex credentials secret, added IAM role)
- `terraform/scripts/startup.sh` (removed credentials file creation)

### Fix: Always Build All Docker Images

**Problem:** Conditional builds caused "manifest not found" errors when only Terraform changed

**Fix:** Removed `if` conditions from all build steps in `.github/workflows/deploy.yml:125-161`

**Trade-off:** Longer build times (~5-10 min) but guaranteed image availability

