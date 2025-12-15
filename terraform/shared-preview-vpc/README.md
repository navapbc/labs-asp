# Shared Preview VPC Infrastructure

This directory contains the Terraform configuration for the **shared preview VPC** that is used by all preview environments (preview-pr-*).

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Dev VPC           │         │ Preview Shared VPC  │
│   10.0.0.0/16       │◄───────►│   10.1.0.0/16       │
│                     │ Peering │                     │
│  - app-dev          │         │  - All preview-pr-* │
│  - Cloud SQL        │         │    environments     │
└─────────────────────┘         └─────────────────────┘
```

## Key Features

1. **Single VPC for all preview environments** - Instead of creating a VPC per PR, all preview environments share this VPC
2. **Permanent VPC peering with dev** - Peering is established once and remains active
3. **Access to dev Cloud SQL** - Preview environments can connect to dev database via VPC peering
4. **Separate Terraform state** - Managed independently from individual preview deployments

## Network Layout

| CIDR Block        | Purpose                    | Range                      |
|-------------------|----------------------------|----------------------------|
| 10.1.0.0/20       | Public subnet              | 10.1.0.0 - 10.1.15.255     |
| 10.1.16.0/20      | Private subnet             | 10.1.16.0 - 10.1.31.255    |
| 10.1.32.0/20      | Database subnet            | 10.1.32.0 - 10.1.47.255    |
| 10.1.48.0/28      | VPC Connector              | 10.1.48.0 - 10.1.48.15     |

## Deployment

### Initial Setup

This VPC should be deployed **once** and left running:

```bash
cd terraform/shared-preview-vpc

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the changes
terraform apply
```

### Prerequisites

- Dev VPC must exist (`labs-asp-vpc-dev`)
- Appropriate GCP permissions for VPC peering

### When to Redeploy

You only need to apply this configuration when:
- Setting up the infrastructure for the first time
- Making changes to the shared VPC configuration (CIDR changes, firewall rules, etc.)
- Updating VPC peering settings

## Integration with Preview Environments

Preview environments (preview-pr-*) will use **data sources** to reference this shared VPC instead of creating their own VPCs.

See `../vpc.tf` for the data source configuration used by preview environments.

## Cleanup

⚠️ **Do not destroy this VPC while preview environments are active!**

To destroy the shared preview VPC (only when no preview environments are running):

```bash
terraform destroy
```

## Troubleshooting

### Check VPC peering status

```bash
gcloud compute networks peerings list --network=labs-asp-vpc-preview-shared
```

### Verify connectivity to dev

```bash
# From a VM in preview shared VPC, test connectivity to dev Cloud SQL
gcloud compute ssh <vm-in-preview> --command="ping <dev-cloud-sql-private-ip>"
```

### Check VPC connector status

```bash
gcloud compute networks vpc-access connectors describe \
  labs-conn-preview-shared \
  --region=us-central1
```

