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
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
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

## Step 6: Set Up Secrets

After Terraform completes, you need to add your API keys to Secret Manager:

```bash
# Create secrets for API keys
echo "your_openai_key_here" | gcloud secrets create openai-api-key --data-file=-
echo "your_anthropic_key_here" | gcloud secrets create anthropic-api-key --data-file=-
echo "your_exa_key_here" | gcloud secrets create exa-api-key --data-file=-

# Create JWT secret (generate a random string)
openssl rand -base64 32 | gcloud secrets create mastra-jwt-secret --data-file=-

# Create app password
echo "your_secure_password" | gcloud secrets create mastra-app-password --data-file=-
```

## Step 7: Build and Deploy Application

```bash
# Go back to project root
cd ../../../

# Build the Docker image
docker build -f docker/Dockerfile -t labs-asp .

# Tag for Artifact Registry
REPO_URL=$(terraform -chdir=terraform/environments/development output -raw artifact_registry_url)
docker tag labs-asp $REPO_URL/labs-asp:latest

# Push to Artifact Registry
docker push $REPO_URL/labs-asp:latest
```

## Step 8: Deploy to Cloud Run

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

## Step 9: Verify Deployment

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

## Step 10: Set Up GitHub Actions (Optional)

If you want CI/CD, configure GitHub secrets:

```bash
# In your GitHub repository settings, add these secrets:
# - GCP_PROJECT_ID: your project ID
# - GCP_SA_KEY: service account JSON key for GitHub Actions
```

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

3. **Cloud Run deployment fails**
   ```bash
   # Check the logs
   gcloud run services logs read $SERVICE_NAME --region=us-central1
   ```

4. **Browser pool not responding**
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
