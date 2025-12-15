# Shared Preview VPC Setup Guide

## Overview

This guide explains the new shared VPC architecture for preview environments and how to set it up.

## Architecture Changes

### Before (Individual VPCs per Preview)
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Dev VPC     │    │ Preview-PR-1 │    │ Preview-PR-2 │
│  10.0.0.0/16 │    │ 10.1.0.0/16  │    │ 10.2.0.0/16  │
└──────────────┘    └──────────────┘    └──────────────┘
       │                    │                   │
       └────────────────────┴───────────────────┘
              (Dynamic VPC peering per PR)
```

**Problems:**
- New VPC created for each PR
- Dynamic peering setup/teardown required
- Complex state management
- Slower deployments

### After (Shared Preview VPC)
```
┌──────────────┐         ┌──────────────────────┐
│  Dev VPC     │◄───────►│ Preview Shared VPC   │
│  10.0.0.0/16 │ Peering │    10.1.0.0/16       │
└──────────────┘         └──────────────────────┘
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                   ┌─────▼──────┐    ┌──────▼─────┐
                   │ PR-1 VMs   │    │ PR-2 VMs   │
                   │ + Services │    │ + Services │
                   └────────────┘    └────────────┘
```

**Benefits:**
- ✅ One VPC for all preview environments
- ✅ Permanent peering (no dynamic setup)
- ✅ Faster preview deployments
- ✅ Simplified state management
- ✅ Reduced costs (fewer NAT gateways, connectors, etc.)

## Setup Instructions

### 1. Deploy the Shared Preview VPC (One-time Setup)

The shared preview VPC must be deployed **before** any preview environments can use it.

```bash
cd terraform/shared-preview-vpc

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy the shared VPC
terraform apply
```

This creates:
- VPC `labs-asp-vpc-preview-shared` (10.1.0.0/16)
- Subnets (public, private, database)
- VPC connector for Cloud Run
- NAT gateway with static IP
- VPC peering with dev VPC (bidirectional)
- Firewall rules

### 2. Verify VPC Peering

Check that peering is established:

```bash
# Check preview → dev peering
gcloud compute networks peerings list --network=labs-asp-vpc-preview-shared

# Check dev → preview peering
gcloud compute networks peerings list --network=labs-asp-vpc-dev
```

You should see:
- `preview-shared-to-dev-peering` on preview VPC
- `dev-to-preview-shared-peering` on dev VPC
- Both with `STATE: ACTIVE`

### 3. Deploy Preview Environments

Preview environments automatically use the shared VPC:

```bash
# Create a PR - GitHub Actions will deploy to shared VPC
# No manual intervention needed!
```

## How It Works

### For Dev/Prod Environments
- Creates dedicated VPC per environment
- Uses `google_compute_network.main[0]` (count = 1)
- Isolated from other environments

### For Preview Environments
- Uses data sources to reference shared VPC
- `data.google_compute_network.preview_shared[0]`
- All resources deploy to shared VPC
- Unique VM/service names per PR prevent conflicts

### Local Values for Abstraction

The `vpc.tf` file uses local values to abstract VPC access:

```hcl
locals {
  vpc_network = startswith(var.environment, "preview-") ? 
    data.google_compute_network.preview_shared[0] : 
    google_compute_network.main[0]
  
  private_subnet = startswith(var.environment, "preview-") ?
    data.google_compute_subnetwork.preview_private[0] :
    google_compute_subnetwork.private[0]
  
  # ... etc
}
```

All other Terraform files reference `local.vpc_network` instead of the resource directly.

## GitHub Actions Workflow

### New Workflow: `deploy-shared-preview-vpc.yml`

Deploys/updates the shared VPC infrastructure:

```bash
# Triggers on:
# - Push to main with changes to terraform/shared-preview-vpc/**
# - Manual workflow_dispatch
```

### Existing Workflow: `deploy.yml`

Updated to work with shared VPC:
- Preview environments use shared VPC CIDRs (for reference)
- No VPC creation for preview environments
- Faster deployments (no VPC/peering setup)

## Database Access

Preview environments access dev Cloud SQL via VPC peering:

```
Preview VM → Preview Shared VPC → (VPC Peering) → Dev VPC → Dev Cloud SQL
```

No changes needed - automatic via permanent peering.

## Cleanup

### Destroying a Preview Environment

```bash
# Terraform destroy works normally
terraform destroy -var="environment=preview-pr-123"
```

Only the VM and services are destroyed, VPC remains.

### Destroying the Shared VPC

⚠️ **Only destroy when NO preview environments are active!**

```bash
cd terraform/shared-preview-vpc
terraform destroy
```

This will:
- Remove VPC peering
- Delete shared VPC
- Delete NAT gateway, connectors, etc.

## Troubleshooting

### Preview deployment fails with "VPC not found"

**Cause**: Shared VPC not deployed yet.

**Solution**:
```bash
cd terraform/shared-preview-vpc
terraform apply
```

### Preview can't connect to dev database

**Cause**: VPC peering not established.

**Solution**: Check peering status:
```bash
gcloud compute networks peerings list --network=labs-asp-vpc-preview-shared
gcloud compute networks peerings list --network=labs-asp-vpc-dev
```

Both should show `STATE: ACTIVE`. If not, redeploy shared VPC.

### "Network already exists" error

**Cause**: Shared VPC already exists from previous deployment.

**Solution**: Import existing VPC into Terraform state:
```bash
cd terraform/shared-preview-vpc
terraform import google_compute_network.preview_shared labs-asp-vpc-preview-shared
```

## Migration from Old Architecture

If you have existing preview environments with individual VPCs:

1. **Destroy existing preview environments**:
   ```bash
   # For each active preview
   terraform destroy -var="environment=preview-pr-N"
   ```

2. **Deploy shared VPC**:
   ```bash
   cd terraform/shared-preview-vpc
   terraform apply
   ```

3. **Redeploy preview environments**:
   ```bash
   # Rerun PR deployments - they'll use shared VPC
   ```

## Cost Impact

**Savings per preview environment:**
- 1x NAT gateway: ~$45/month
- 1x VPC connector: ~$73/month
- 1x Static IP: ~$7/month
- **Total savings: ~$125/month per preview environment**

With 5 concurrent previews: **~$625/month savings**

The shared VPC costs ~$125/month total, shared across all previews.

## Questions?

See the main README or check the Terraform configuration:
- `terraform/shared-preview-vpc/` - Shared VPC config
- `terraform/vpc.tf` - VPC routing logic
- `.github/workflows/deploy-shared-preview-vpc.yml` - Deployment workflow

