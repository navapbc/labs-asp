# Labs ASP Deployment Guide

## Overview

This guide will deploy your hybrid Mastra infrastructure:
- **Cloud Run**: Main web app (serverless, auto-scaling)
- **GCE Browser Pool**: Persistent browser instances with MCP Gateway
- **Cloud SQL**: PostgreSQL database (private networking)
- **Artifact Registry**: Container storage

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Terraform** installed (v1.5+)
4. **Docker** installed (for local testing)

## Step 1: GCP Project Setup

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Authenticate with Google Cloud
gcloud auth login
gcloud auth application-default login

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs (Terraform will also do this)
gcloud services enable \
  compute.googleapis.com \
  run.googleapis.com \
  runadmin.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iamcredentials.googleapis.com
```

## Step 2: Configure Terraform Variables

```bash
# Copy the example terraform vars
cd terraform/environments/development
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
cat > terraform.tfvars << EOF
# GCP Configuration
project_id = "$PROJECT_ID"
region     = "us-central1"
zone       = "us-central1-a"
EOF
```

## Step 3: Set Up Terraform Backend (Optional but Recommended)

```bash
# Create a bucket for Terraform state
gsutil mb gs://$PROJECT_ID-terraform-state

# Enable versioning
gsutil versioning set on gs://$PROJECT_ID-terraform-state

# Update the backend configuration in main.tf if needed
```

## Step 4: Initialize and Plan Terraform

```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Review the plan - you should see:
# - VPC network and subnet
# - Cloud SQL PostgreSQL instance
# - VPC connector
# - Artifact Registry
# - Browser pool (GCE instances + load balancer)
# - Cloud Run service
# - Secret Manager secrets
```

## Step 5: Deploy Infrastructure

```bash
# Apply the Terraform configuration
terraform apply

# This will take 10-15 minutes to complete
# - Database instance creation: ~5-7 minutes
# - VPC setup: ~2-3 minutes
# - Browser pool instances: ~3-5 minutes
```

## Step 6: Set Up Workload Identity Federation for GitHub Actions

Before setting up secrets, configure secure authentication for GitHub Actions:

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-actions-pool" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create OIDC Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='YOUR_GITHUB_USERNAME'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Create dedicated service account for GitHub Actions
gcloud iam service-accounts create "github-actions-deploy" \
  --project="$PROJECT_ID" \
  --display-name="GitHub Actions Deployment Service Account" \
  --description="Service account for GitHub Actions to deploy to Cloud Run"

# Grant necessary permissions
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:github-actions-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:github-actions-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:github-actions-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Get project number for additional permissions
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Grant permission to act as the default Compute Engine service account (required for Cloud Run)
gcloud iam service-accounts add-iam-policy-binding "$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --project="$PROJECT_ID" \
  --role="roles/iam.serviceAccountUser" \
  --member="serviceAccount:github-actions-deploy@$PROJECT_ID.iam.gserviceaccount.com"

# Grant the default Compute Engine service account access to secrets (required for Cloud Run secret injection)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Bind service account to Workload Identity Pool
gcloud iam service-accounts add-iam-policy-binding "github-actions-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"
```

## Step 7: Set Up GitHub Repository Variables

In your GitHub repository, go to Settings → Secrets and variables → Actions → Variables tab and add:

- `GCP_PROJECT_ID`: `your-project-id`
- `WIF_PROVIDER`: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider`
- `WIF_SERVICE_ACCOUNT`: `github-actions-deploy@your-project-id.iam.gserviceaccount.com`

## Step 8: Set Up Secrets

After Terraform completes, you need to add your API keys to Secret Manager:

```bash
# Create secrets for API keys (use single quotes to avoid shell issues with special characters)
echo 'your_openai_key_here' | gcloud secrets create openai-api-key --data-file=- --project=$PROJECT_ID
echo 'your_anthropic_key_here' | gcloud secrets create anthropic-api-key --data-file=- --project=$PROJECT_ID
echo 'your_exa_key_here' | gcloud secrets create exa-api-key --data-file=- --project=$PROJECT_ID

# Create JWT secret
echo 'supersecretdevkeythatishs256safe!' | gcloud secrets create mastra-jwt-secret --data-file=- --project=$PROJECT_ID

# Create app password
echo 'your_secure_password' | gcloud secrets create mastra-app-password --data-file=- --project=$PROJECT_ID

# Create database URLs for different environments
echo 'postgresql://app_user:your_password@your_db_ip/app_db?sslmode=disable' | gcloud secrets create database-url-production --data-file=- --project=$PROJECT_ID
echo 'postgresql://app_user:your_password@your_db_ip/app_db?sslmode=disable' | gcloud secrets create database-url-preview --data-file=- --project=$PROJECT_ID
```

## Step 9: Create Artifact Registry Repository

```bash
# Create the Docker repository in Artifact Registry
gcloud artifacts repositories create labs-asp \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Labs ASP project" \
    --project=$PROJECT_ID
```

## Step 10: Build and Deploy Application

The GitHub Actions workflow will handle building and deploying, but for manual deployment:

```bash
# Go back to project root
cd ../../../

# Build the Docker image
docker build -f docker/Dockerfile -t labs-asp .

# Tag for Artifact Registry
REPO_URL="us-central1-docker.pkg.dev/$PROJECT_ID/labs-asp"
docker tag labs-asp $REPO_URL/labs-asp:latest

# Configure Docker auth and push
gcloud auth configure-docker us-central1-docker.pkg.dev
docker push $REPO_URL/labs-asp:latest
```

## Step 11: Deploy to Cloud Run

The Cloud Run service should already be created by Terraform, but you need to deploy your container:

```bash
# Get the Cloud Run service name
SERVICE_NAME=$(terraform -chdir=terraform/environments/development output -raw cloud_run_service_name)

# Deploy the container
gcloud run deploy $SERVICE_NAME \
  --image $REPO_URL/labs-asp:latest \
  --region us-central1 \
  --allow-unauthenticated
```

## Step 12: Verify Deployment

```bash
# Get the Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME --region=us-central1 --format='value(status.url)')
echo "Main App URL: $CLOUD_RUN_URL"

# Get browser pool load balancer IP
BROWSER_POOL_IP=$(terraform -chdir=terraform/environments/development output -raw browser_pool_internal_ip)
echo "Browser Pool Internal IP: $BROWSER_POOL_IP"

# Test the main app
curl $CLOUD_RUN_URL/health

# Test browser pool (from within GCP network)
# This would need to be tested from a GCE instance or Cloud Shell
```

## Step 13: GitHub Actions CI/CD

The GitHub Actions workflow is already configured with Workload Identity Federation. It will automatically:

1. **Type check** your code
2. **Build** the application
3. **Push** Docker images to Artifact Registry
4. **Deploy** to Cloud Run with secrets injection

The workflow runs on:
- Push to any branch (creates preview deployments)
- Pull requests (creates PR-specific deployments)
- Push to main (creates production deployment)

**Important**: Make sure you've completed Step 7 (GitHub Repository Variables) for the workflow to authenticate properly.

## What You'll Have After Deployment

### Infrastructure Components

1. **VPC Network** (`development-labs-asp-network`)
   - Private subnet for all resources
   - VPC connector for Cloud Run access

2. **Cloud SQL Database** (`development-labs-asp-db`)
   - PostgreSQL 15 instance
   - Private IP only (secure)
   - Automatic backups enabled

3. **Browser Pool** (`development-browser-pool-igm`)
   - 1 GCE instance (e2-standard-2)
   - Docker MCP Gateway running
   - VNC server for browser viewing
   - Internal load balancer

4. **Cloud Run Service** (`labs-asp-main`)
   - Auto-scaling web application
   - Connected to private database
   - Can communicate with browser pool

5. **Artifact Registry** (`labs-asp`)
   - Container image storage
   - Integrated with CI/CD

### Access Points

- **Main App**: `https://your-cloud-run-url.run.app`
- **Health Check**: `https://your-cloud-run-url.run.app/health`
- **Browser Dashboard**: `https://your-cloud-run-url.run.app/browser-dashboard`
- **VNC Viewer**: `http://browser-pool-ip:6080/vnc.html` (internal only)

## Troubleshooting

### Common Issues

#### Container Failed to Start and Listen on Port
**Error**: `The user-provided container failed to start and listen on the port defined provided by the PORT environment variable`

**Root Causes & Solutions**:

1. **Port Configuration Mismatch**: 
   - Cloud Run dynamically sets the `PORT` environment variable
   - Your app must listen on `process.env.PORT`, not a hardcoded port
   - **Fixed**: Updated `src/mastra/index.ts` to use `process.env.PORT`

2. **Prisma Client Missing**:
   - The Dockerfile was skipping Prisma client generation in production
   - **Fixed**: Added `npx prisma generate` step in Dockerfile

3. **Platform Compatibility**:
   - Docker images built on ARM (M1/M2 Macs) may not work on Cloud Run
   - **Solution**: Build with `--platform linux/amd64`

#### Why Can't We Use `pnpm start`?
The Dockerfile uses:
```dockerfile
CMD ["node", "--import=./.mastra/output/instrumentation.mjs", ".mastra/output/index.mjs"]
```

Instead of `pnpm start` because:
- Mastra builds your app into `.mastra/output/` with compiled JS files
- The instrumentation file enables telemetry/observability
- This ensures consistent startup regardless of package manager

#### Prisma Deployment Best Practices
1. **Generate Client in Production**: Always run `npx prisma generate` in production containers
2. **Run Migrations Separately**: Use `npx prisma migrate deploy` for production migrations
3. **Database Connection**: Ensure proper connection strings and networking

### Common Issues

1. **Terraform fails with API not enabled**
   ```bash
   # Enable the specific API mentioned in the error
   gcloud services enable [API_NAME]
   ```

2. **Docker push fails**
   ```bash
   # Configure Docker auth
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

3. **GitHub Actions authentication fails**
   ```bash
   # Make sure IAM Service Account Credentials API is enabled
   gcloud services enable iamcredentials.googleapis.com --project=$PROJECT_ID
   
   # Make sure Cloud Run Admin API is enabled
   gcloud services enable runadmin.googleapis.com --project=$PROJECT_ID
   
   # Verify Workload Identity Federation is set up correctly
   gcloud iam workload-identity-pools describe github-actions-pool --location=global --project=$PROJECT_ID
   ```

4. **GitHub Actions fails with "Repository not found"**
   ```bash
   # Create Artifact Registry repository
   gcloud artifacts repositories create labs-asp \
       --repository-format=docker \
       --location=us-central1 \
       --project=$PROJECT_ID
   ```

5. **Cloud Run deployment fails**
   ```bash
   # Check the logs
   gcloud run services logs read $SERVICE_NAME --region=us-central1
   ```

6. **Container fails to start with permission denied on .mastra directory**
   ```bash
   # This means the application user doesn't have write permissions
   # Make sure the Dockerfile includes: RUN chown -R mastra:nodejs /app
   # before switching to USER mastra
   ```

7. **Browser pool not responding**
   ```bash
   # SSH to the instance and check Docker
   gcloud compute ssh development-browser-pool-[ID] --zone=us-central1-a
   sudo docker-compose -f /opt/browser-pool/docker-compose.yml logs
   ```

### Useful Commands

```bash
# View all resources
terraform show

# Get outputs
terraform output

# Destroy everything (careful!)
terraform destroy

# Check Cloud Run logs
gcloud run services logs read labs-asp-main --region=us-central1

# Check browser pool instances
gcloud compute instances list --filter="name:browser-pool"

# Connect to database (from authorized IP)
gcloud sql connect development-labs-asp-db --user=app_user
```

## Next Steps

1. **Test the browser-in-browser functionality**
2. **Set up monitoring and alerting**
3. **Configure custom domains**
4. **Set up staging and production environments**
5. **Implement backup and disaster recovery**

## Cost Estimate

**Development Environment (Monthly)**:
- Cloud SQL (db-f1-micro): ~$7
- GCE Browser Pool (e2-standard-2): ~$50
- Cloud Run (minimal usage): ~$0-10
- VPC Connector: ~$5
- Storage & Networking: ~$3
- **Total**: ~$65-75/month

This is similar to your current costs but with much better architecture and capabilities!
