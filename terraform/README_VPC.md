# VPC Configuration - Labs ASP

## Summary of Changes

The infrastructure now uses **dedicated and isolated VPCs per environment** with subnets following the standard pattern: **public**, **private**, and **database**.

## Environments and CIDRs

| Environment | VPC Base | Public Subnet | Private Subnet | DB Subnet | VPC Connector |
|----------|----------|----------------|----------------|-----------|---------------|
| **Dev** | 10.0.0.0/16 | 10.0.0.0/20 | 10.0.16.0/20 | 10.0.32.0/20 | 10.0.48.0/28 |
| **Preview (HML)** | 10.1.0.0/16 | 10.1.0.0/20 | 10.1.16.0/20 | 10.1.32.0/20 | 10.1.48.0/28 |
| **Prod** | 10.2.0.0/16 | 10.2.0.0/20 | 10.2.16.0/20 | 10.2.32.0/20 | 10.2.48.0/28 |

> **Note**: Preview PRs (preview-pr-N) share the Preview/HML VPC environment

## Modified Files

### 1. **terraform/vpc.tf** (NEW)
Creates the entire network infrastructure:
- Dedicated VPC network per environment
- 3 subnets (public, private, database)
- Cloud NAT for private subnet internet access
- VPC Access Connector for Cloud Run
- Private Service Connection for Cloud SQL
- Configurable firewall rules per environment

### 2. **terraform/variables.tf**
Added variables for VPC CIDRs and Granular Firewall:
```hcl
variable "vpc_cidr_public" {}
variable "vpc_cidr_private" {}
variable "vpc_cidr_db" {}
variable "vpc_connector_cidr" {}
variable "firewall_rules" {
  # Separate rules for each service:
  # - browser_mcp (port 8931)
  # - browser_streaming (port 8933)
  # - mastra_api (port 4112)
}
```

### 3. **terraform/compute.tf**
VM now uses the VPC public subnet:
```hcl
network_interface {
  network    = google_compute_network.main.id
  subnetwork = google_compute_subnetwork.public.id
  # ...
}
```

### 4. **terraform/cloud_run.tf**
Cloud Run services connected to VPC via VPC Connector:
```hcl
vpc_access {
  connector = google_vpc_access_connector.cloud_run.id
  egress    = "PRIVATE_RANGES_ONLY"
}
```

### 5. **terraform/main.tf**
Enabled required APIs:
- `vpcaccess.googleapis.com`
- `servicenetworking.googleapis.com`

### 6. **.github/workflows/deploy.yml**
Added step to automatically define CIDRs and Firewall rules based on environment:
```yaml
- name: Set VPC CIDR blocks and Firewall rules
  id: vpc_cidrs
  run: |
    case ${ENV} in
      prod)
        # Granular rules per service
        firewall_rules={
          "browser_mcp": {
            "allow_public_access": false,
            "allowed_ip_ranges": ["office_ip"]
          },
          "browser_streaming": {
            "allow_public_access": false,
            "allowed_ip_ranges": ["office_ip", "partner_ip"]
          },
          "mastra_api": {
            "allow_public_access": false,
            "allowed_ip_ranges": ["backend_server_ip"]
          }
        }
    esac
```

### 7. **terraform/outputs.tf**
Added VPC outputs:
- `vpc_id`, `vpc_name`
- `vpc_public_subnet`, `vpc_private_subnet`, `vpc_db_subnet`
- `vpc_connector_cidr`

### 8. **terraform/terraform.tfvars.example**
Added VPC configuration examples

## How to Use

### Deploy via GitHub Actions (Recommended)

CIDRs are **automatically** defined by the workflow based on the environment:

```bash
# Push to develop → deploy to Dev (10.0.0.0/16)
git push origin develop

# Push to main → deploy to Prod (10.2.0.0/16)
git push origin main

# PR → deploy to Preview-PR-N (10.1.0.0/16 shared)
# Manual dispatch → choose environment
```

### Manual Deploy with Terraform

```bash
cd terraform

# Dev
terraform init -backend-config="prefix=terraform/state/dev"
terraform apply \
  -var="environment=dev" \
  -var="vpc_cidr_public=10.0.0.0/20" \
  -var="vpc_cidr_private=10.0.16.0/20" \
  -var="vpc_cidr_db=10.0.32.0/20" \
  -var="vpc_connector_cidr=10.0.48.0/28"

# Preview (HML)
terraform init -backend-config="prefix=terraform/state/preview"
terraform apply \
  -var="environment=preview" \
  -var="vpc_cidr_public=10.1.0.0/20" \
  -var="vpc_cidr_private=10.1.16.0/20" \
  -var="vpc_cidr_db=10.1.32.0/20" \
  -var="vpc_connector_cidr=10.1.48.0/28"

# Prod
terraform init -backend-config="prefix=terraform/state/prod"
terraform apply \
  -var="environment=prod" \
  -var="vpc_cidr_public=10.2.0.0/20" \
  -var="vpc_cidr_private=10.2.16.0/20" \
  -var="vpc_cidr_db=10.2.32.0/20" \
  -var="vpc_connector_cidr=10.2.48.0/28"
```

## Security

### Isolation
- Each environment has an isolated VPC (dev, preview, prod)
- No direct communication between environments
- Preview PRs share HML VPC

### Private Access
- Cloud SQL accessible only via private IP
- Cloud Run connects via VPC Connector
- Private Google Access enabled (access APIs without external IP)

### Firewall
- Internal traffic allowed only within VPC
- SSH only via Identity-Aware Proxy (IAP)
- Application ports restricted by tags
- **Granular rules per service** (Browser MCP, Browser Streaming, Mastra API)
- Each service can have different IP restrictions
- Production can be ultra-restrictive per service

### Monitoring
- VPC Flow Logs enabled (5 sec interval)
- Firewall logs for auditing
- VPC Connector metrics in Cloud Monitoring

## Communication Flow

### Cloud Run → VM (Mastra API)
```
Cloud Run (ai-chatbot) 
  → VPC Connector (10.X.48.0/28)
  → VPC Network
  → VM Public Subnet (10.X.0.0/20)
  → Mastra API :4112
```

### Cloud Run → Cloud SQL
```
Cloud Run
  → VPC Connector
  → VPC Network
  → Service Networking Peering
  → Cloud SQL Private IP (10.X.32.0/20)
```

### Internet → Cloud Run → Browser
```
Internet
  → Cloud Run Public URL
  → Browser WS Proxy (Cloud Run)
  → VPC Connector
  → VM Browser Service :8933 (WebSocket)
```

## Complete Documentation

For more details, see:
- **[VPC_ARCHITECTURE.md](./VPC_ARCHITECTURE.md)** - Complete technical documentation
- **[FIREWALL_CONFIG.md](./FIREWALL_CONFIG.md)** - Firewall configuration guide
- **[terraform.tfvars.example](./terraform.tfvars.example)** - Configuration examples

## Important Notes

1. **VPC Connector**: Requires /28 (16 IPs) mandatory
2. **Cloud SQL**: Requires Private Service Connection configured
3. **First Deployment**: APIs may take 1-2 minutes to enable
4. **Costs**: VPC Connector costs ~$15-30/month per environment (2-10 instances)
5. **Production Firewall**: Update `firewall_rules` in workflow for prod environment to configure granular access per service (see [FIREWALL_CONFIG.md](./FIREWALL_CONFIG.md))

## Troubleshooting

### Cloud Run cannot access VM
```bash
# Check VPC Connector
gcloud compute networks vpc-access connectors describe \
  labs-asp-connector-{env} --region=us-central1

# Check if it's READY
```

### Firewall blocking connections
```bash
# List all rules for environment
gcloud compute firewall-rules list \
  --filter="network:labs-asp-vpc-{env}"

# Check specific service rule
gcloud compute firewall-rules describe labs-asp-mastra-app-{env}

# View firewall denied logs
gcloud logging read 'jsonPayload.disposition="DENIED"' --limit=50
```

### VM without internet access
```bash
# Check Cloud NAT
gcloud compute routers nats list \
  --router=labs-asp-router-{env} \
  --region=us-central1
```

## Next Steps

1. Deploy to Dev to test VPC
2. Validate Cloud Run → VM connectivity
3. Verify Cloud SQL via private IP
4. Deploy to Preview (HML)
5. Deploy to Prod

## Support

For questions or issues:
1. Consult [VPC_ARCHITECTURE.md](./VPC_ARCHITECTURE.md)
2. Check logs in Cloud Logging
3. Review firewall rules
