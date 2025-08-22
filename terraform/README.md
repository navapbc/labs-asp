# Labs ASP Terraform Infrastructure

This directory contains Terraform configuration for deploying the Labs ASP application infrastructure on Google Cloud Platform, implementing the Phase 1 architecture from `docs/PRODUCTION_ARCHITECTURE.md`.

## Architecture Overview

The Terraform configuration creates:

### Core Infrastructure
- **Multi-Environment Cloud Run** services (dev, preview, prod)
- **Global Load Balancer** with SSL certificates and custom domain routing
- **Cloud Storage** buckets for artifacts and build cache
- **Artifact Registry** for container images
- **Service Accounts** with appropriate IAM permissions

### Existing Resources (Imported)
- **Cloud SQL PostgreSQL** instances (app-dev, app-preview, app-prod)
- **Secret Manager** secrets (API keys and credentials)
- **GitHub Actions** service account

## Prerequisites

1. **GCP Project**: `nava-labs` with billing enabled
2. **Terraform**: Version >= 1.0
3. **gcloud CLI**: Authenticated with appropriate permissions
4. **Existing Infrastructure**: Cloud SQL instances and secrets already set up

## Quick Start

1. **Initialize Terraform**:
   ```bash
   cd terraform
   terraform init
   ```

2. **Copy and customize variables**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your configuration
   ```

3. **Plan the deployment**:
   ```bash
   terraform plan
   ```

4. **Apply the configuration**:
   ```bash
   terraform apply
   ```

## Configuration

### Essential Variables

```hcl
# terraform.tfvars
project_id = "nava-labs"
region     = "us-central1"

# Optional: Custom domain configuration
domain_name          = "your-domain.com"
enable_load_balancer = true
enable_dns          = true

# Cloud Run configuration (Phase 1 specs)
cloud_run_cpu    = "2000m"  # 2 vCPUs for browser + Node.js
cloud_run_memory = "4Gi"    # 4GB RAM for Chrome processes
cloud_run_timeout = 3600    # 60 minutes for long automations
```

### Environment Configuration

The configuration creates three environments:

- **Production** (`prod`): `labs-asp-prod` service
- **Development** (`dev`): `labs-asp-dev` service  
- **Preview** (`preview`): `labs-asp-preview` service

Each environment:
- Has its own Cloud Run service
- Connects to its respective Cloud SQL instance
- Uses environment-specific secrets from Secret Manager
- Routes through the global load balancer (if enabled)

## File Structure

```
terraform/
├── main.tf              # Main configuration and providers
├── variables.tf         # Input variables
├── outputs.tf          # Output values
├── cloud_run.tf        # Cloud Run services and Artifact Registry
├── load_balancer.tf    # Global Load Balancer and SSL certificates
├── dns.tf              # DNS configuration (optional)
├── storage.tf          # Cloud Storage buckets
├── iam.tf              # Service accounts and IAM permissions
├── terraform.tfvars.example  # Example variables file
└── README.md           # This file
```

## Phase 1 Implementation

This Terraform configuration implements the **Phase 1** architecture:

### ✅ Implemented
- Multi-environment Cloud Run services
- Global Load Balancer with SSL certificates
- Cloud Storage for artifacts and build cache
- Service accounts with proper IAM permissions
- Integration with existing Cloud SQL and Secret Manager
- GitHub Actions deployment pipeline support

### 🔄 Existing (Imported)
- Cloud SQL PostgreSQL instances (3 environments)
- Secret Manager secrets (API keys, database URLs)
- GitHub Actions service account

### 🚫 Phase 1 Limitations
- No browser display streaming (screenshots only)
- No session persistence (each automation starts fresh)
- No GKE cluster (Cloud Run native approach)
- No VNC/WebSocket streaming

## Deployment Workflow

The infrastructure supports the GitHub Actions workflow in `.github/workflows/deploy.yml`:

1. **Build**: Application built and containerized
2. **Push**: Container pushed to Artifact Registry
3. **Deploy**: Deployed to appropriate Cloud Run service based on branch/PR
4. **Preview**: PR deployments get unique URLs with automatic cleanup

### Branch Mapping
- `main` → `labs-asp-prod` (production)
- `develop` → `labs-asp-dev` (development)
- PRs → `pr-{number}-labs-asp` (preview)
- Feature branches → `branch-{name}-labs-asp` (preview)

## Custom Domain Setup

If you have a custom domain:

1. **Set variables**:
   ```hcl
   domain_name = "your-domain.com"
   enable_dns  = true
   ```

2. **Apply Terraform**:
   ```bash
   terraform apply
   ```

3. **Update DNS**: Point your domain's nameservers to the Google Cloud DNS nameservers (shown in terraform output)

4. **Environment URLs**:
   - Production: `https://your-domain.com`
   - Development: `https://dev.your-domain.com`
   - Preview: `https://preview.your-domain.com`

## Monitoring and Debugging

### Useful Commands

```bash
# Check Cloud Run services
gcloud run services list --region=us-central1

# View service logs
gcloud logs read --resource-type=cloud_run_revision \
  --resource-labels=service_name=labs-asp-prod

# Check load balancer status
gcloud compute url-maps list
gcloud compute ssl-certificates list

# Verify DNS configuration
gcloud dns record-sets list --zone=labs-asp-zone
```

### Terraform State

State is stored in the `labs-asp-terraform-state` Cloud Storage bucket. This allows multiple developers to collaborate on infrastructure changes.

## Security Notes

- All secrets stored in Google Secret Manager
- Service accounts follow principle of least privilege
- Cloud Run services use dedicated service account
- GitHub Actions uses Workload Identity Federation (no service account keys)
- SSL/TLS termination at load balancer level

## Troubleshooting

### Common Issues

1. **"Backend configuration changed"**: Run `terraform init` to reinitialize

2. **Permission denied**: Ensure your gcloud account has the necessary IAM roles:
   ```bash
   gcloud auth application-default login
   ```

3. **SSL certificate provisioning**: Google-managed SSL certificates can take 15-60 minutes to provision

4. **DNS propagation**: DNS changes can take up to 48 hours to propagate globally

5. **Import errors**: If resources already exist, use terraform import:
   ```bash
   terraform import google_service_account.github_actions \
     projects/nava-labs/serviceAccounts/github-actions-deploy@nava-labs.iam.gserviceaccount.com
   ```

## Next Steps (Phase 2+)

Future phases will add:
- GKE cluster for browser infrastructure
- Redis for session management
- WebSocket streaming for real-time browser display
- VNC servers for browser visualization
- Advanced monitoring and alerting

## Support

For questions or issues:
1. Check the [Production Architecture documentation](../docs/PRODUCTION_ARCHITECTURE.md)
2. Review the [GitHub Actions workflow](../.github/workflows/deploy.yml)
3. Examine the Terraform plan output: `terraform plan`
