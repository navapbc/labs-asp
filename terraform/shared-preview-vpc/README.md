# Shared Preview VPC Terraform Module

This module creates and manages a shared VPC infrastructure used by all preview environments (preview-pr-*).

## Purpose

Instead of creating a separate VPC for each PR, all preview environments share this single VPC. This:
- Reduces infrastructure costs (~$125/month per preview eliminated)
- Speeds up deployments (no VPC creation per PR)
- Simplifies VPC peering management (permanent peering with dev)

## Architecture

```
┌─────────────────────────┐
│ Shared Preview VPC      │
│ 10.1.0.0/16            │
├─────────────────────────┤
│ Public Subnet           │  10.1.0.0/20  (4,096 IPs)
│ Private Subnet          │  10.1.16.0/20 (4,096 IPs) ← VMs deployed here
│ Database Subnet         │  10.1.32.0/20 (4,096 IPs)
│ VPC Connector           │  10.1.48.0/28 (16 IPs)
├─────────────────────────┤
│ NAT Gateway (shared)    │  Single static IP for all previews
│ Cloud Router            │  ASN: 64515
│ VPC Connector (shared)  │  Used by all Cloud Run services
├─────────────────────────┤
│ VPC Peering             │
│ ├─ preview → dev        │  Bidirectional peering
│ └─ dev → preview        │  Access to dev Cloud SQL
└─────────────────────────┘
```

## Resources Created

### Network Infrastructure

- **VPC Network:** `labs-asp-vpc-preview-shared`
  - Routing mode: REGIONAL
  - Auto-create subnets: false

- **Subnets:**
  - `labs-asp-public-preview-shared` (10.1.0.0/20)
  - `labs-asp-private-preview-shared` (10.1.16.0/20)
  - `labs-asp-db-preview-shared` (10.1.32.0/20)

- **Cloud Router:** `labs-asp-router-preview-shared`
  - BGP ASN: 64515 (different from dev: 64514)

- **NAT Gateway:** `labs-asp-nat-preview-shared`
  - Static IP: `labs-asp-nat-ip-preview-shared`
  - Source: ALL_SUBNETWORKS_ALL_IP_RANGES

- **VPC Connector:** `labs-conn-preview-shared`
  - IP range: 10.1.48.0/28
  - Machine type: e2-micro
  - Min instances: 2
  - Max instances: 10

### VPC Peering

- **Preview → Dev Peering:** `preview-shared-to-dev-peering`
  - Connects to: `labs-asp-vpc-dev`
  - Import/Export custom routes: true

- **Dev → Preview Peering:** `dev-to-preview-shared-peering`
  - Connects from: `labs-asp-vpc-dev`
  - Import/Export custom routes: true

### Firewall Rules

- **allow-internal-preview-shared:** Allow all internal VPC traffic + dev VPC (10.0.0.0/16)
- **allow-iap-ssh-preview-shared:** SSH access via Identity-Aware Proxy
- **allow-health-checks-preview-shared:** Google Cloud load balancer health checks

## Terraform State

**Backend:** GCS Bucket  
**State Path:** `gs://labs-asp-terraform-state/terraform/state/shared-preview-vpc`

This state is **separate** from individual environment states to prevent conflicts.

## Variables

All variables are defined in `variables.tf` with sensible defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `project_id` | `nava-labs` | GCP project ID |
| `region` | `us-central1` | GCP region |
| `vpc_cidr_public` | `10.1.0.0/20` | Public subnet CIDR |
| `vpc_cidr_private` | `10.1.16.0/20` | Private subnet CIDR (VMs) |
| `vpc_cidr_db` | `10.1.32.0/20` | Database subnet CIDR |
| `vpc_connector_cidr` | `10.1.48.0/28` | VPC connector CIDR |

## Outputs

| Output | Description |
|--------|-------------|
| `vpc_id` | VPC network ID |
| `vpc_name` | VPC network name (`labs-asp-vpc-preview-shared`) |
| `vpc_self_link` | VPC self link (for references) |
| `public_subnet_id` | Public subnet ID |
| `private_subnet_id` | Private subnet ID |
| `db_subnet_id` | Database subnet ID |
| `vpc_connector_id` | VPC connector ID (used by Cloud Run) |
| `vpc_connector_name` | VPC connector name |
| `nat_external_ip` | Static NAT IP for whitelisting |
| `peering_status` | VPC peering status (preview↔dev) |

## Deployment

### Automatic Deployment (Recommended)

The shared VPC is **automatically deployed** by GitHub Actions on the first preview environment deployment.

**Workflow:** `.github/workflows/deploy.yml`  
**Step:** "Deploy Shared Preview VPC" (Lines 200-218)

```yaml
- name: Deploy Shared Preview VPC
  if: startsWith(needs.setup.outputs.environment, 'preview-')
  working-directory: ./terraform/shared-preview-vpc
  run: |
    terraform init
    if gcloud compute networks describe labs-asp-vpc-preview-shared; then
      echo "✅ VPC exists, skipping..."
    else
      terraform apply -auto-approve
    fi
```

### Manual Deployment

If you need to deploy or update manually:

```bash
# Navigate to module directory
cd terraform/shared-preview-vpc

# Initialize Terraform
terraform init

# Review changes
terraform plan

# Apply changes
terraform apply
```

### First Time Setup

On first deployment, Terraform will create:
1. VPC network and subnets (~30 seconds)
2. Cloud Router and NAT Gateway (~1 minute)
3. VPC Connector (~2-3 minutes)
4. VPC Peering (~30 seconds)
5. Firewall rules (~10 seconds)

**Total time:** ~4-5 minutes

### Subsequent Updates

Updates (e.g., firewall rule changes) typically take ~30 seconds to 1 minute.

## Usage by Preview Environments

Preview environments **reference** this shared VPC using Terraform data sources.

**File:** `terraform/vpc.tf` (Lines 10-52)

```hcl
# Data sources for shared preview VPC
data "google_compute_network" "preview_shared" {
  count   = startswith(var.environment, "preview-") ? 1 : 0
  name    = "labs-asp-vpc-preview-shared"
  project = local.project_id
}

data "google_compute_subnetwork" "preview_private" {
  count   = startswith(var.environment, "preview-") ? 1 : 0
  name    = "labs-asp-private-preview-shared"
  region  = local.region
  project = local.project_id
}

data "google_vpc_access_connector" "preview_connector" {
  count   = startswith(var.environment, "preview-") ? 1 : 0
  name    = "labs-conn-preview-shared"
  region  = local.region
  project = local.project_id
}

# Local values for abstraction
locals {
  vpc_network = startswith(var.environment, "preview-") ? 
    data.google_compute_network.preview_shared[0] : 
    google_compute_network.main[0]
  # ...
}
```

All preview resources (VMs, Cloud Run) use these data sources to deploy into the shared VPC.

## VPC Peering Details

### How Peering Works

VPC peering is **bidirectional** and requires peering connections on both sides:

1. **Preview → Dev Peering** (`preview_to_dev`)
   - Created by this module
   - Allows preview VMs to initiate connections to dev resources

2. **Dev → Preview Peering** (`dev_to_preview`)
   - Also created by this module
   - Allows dev resources to respond to preview connections
   - Required for Cloud SQL access

### Route Import/Export

```hcl
import_custom_routes = true  # Import routes from peer
export_custom_routes = true  # Export routes to peer
```

This allows:
- Preview environments to reach dev Cloud SQL private IP
- Dev database to respond to preview connections
- Proper routing for Private Service Connect

### When Peering is Established

**Scenario 1: First Preview Deployed (Before Dev)**
1. Preview deployment creates shared VPC
2. Both peering connections created immediately
3. Dev VPC must exist (error if not)

**Scenario 2: Dev Already Exists**
1. Shared VPC created
2. Peering established automatically
3. Next dev deployment ensures peering is up-to-date

**Scenario 3: Dev Deployed After Preview**
- Dev deployment step "Establish VPC Peering" runs
- Re-applies this module to ensure peering is correct
- No manual intervention needed

## Database Access Flow

```
Preview Environment (preview-pr-123)
  ├─ VM (10.1.16.x)
  │   └─ Docker containers (internal network)
  │       └─ Connection to: nava-labs:us-central1:app-dev
  │
  ├─ Cloud Run (uses VPC connector: 10.1.48.0/28)
  │   └─ Cloud SQL Proxy: nava-labs:us-central1:app-dev
  │
  └─ VPC Peering (preview ↔ dev)
      └─ Dev VPC (10.0.0.0/16)
          └─ Cloud SQL: app-dev (private IP: 10.0.x.x)
```

**No Cloud SQL instance created for preview** - all previews share dev database.

## Monitoring and Verification

### Check VPC Status

```bash
# Describe VPC
gcloud compute networks describe labs-asp-vpc-preview-shared

# List subnets
gcloud compute networks subnets list \
  --network=labs-asp-vpc-preview-shared

# Check VPC connector
gcloud compute networks vpc-access connectors describe \
  labs-conn-preview-shared \
  --region=us-central1
```

### Check VPC Peering Status

```bash
# List all peerings for shared VPC
gcloud compute networks peerings list \
  --network=labs-asp-vpc-preview-shared

# Expected output:
# NAME: preview-shared-to-dev-peering
# PEER_NETWORK: labs-asp-vpc-dev
# STATE: ACTIVE

# NAME: dev-to-preview-shared-peering  
# PEER_NETWORK: labs-asp-vpc-preview-shared
# STATE: ACTIVE
```

### Check NAT Gateway

```bash
# Get NAT IP for whitelisting
gcloud compute addresses describe labs-asp-nat-ip-preview-shared \
  --region=us-central1 \
  --format="value(address)"

# Check NAT configuration
gcloud compute routers nats describe labs-asp-nat-preview-shared \
  --router=labs-asp-router-preview-shared \
  --region=us-central1
```

### Check Active Preview VMs

```bash
# List all preview VMs using shared VPC
gcloud compute instances list \
  --filter="network~labs-asp-vpc-preview-shared"

# Check VM subnet assignment
gcloud compute instances describe <VM_NAME> \
  --format="value(networkInterfaces[0].subnetwork)"
```

## Troubleshooting

### VPC Creation Fails

**Error:** "Network already exists"

**Cause:** VPC was created manually or by previous deployment.

**Fix:**
```bash
terraform import google_compute_network.preview_shared \
  labs-asp-vpc-preview-shared
```

### Peering State is Not ACTIVE

**Check peer VPC exists:**
```bash
gcloud compute networks describe labs-asp-vpc-dev
```

**If dev VPC doesn't exist:**
```bash
# Deploy dev environment first
cd terraform
terraform apply -var="environment=dev"
```

**If peering is stuck:**
```bash
# Delete and recreate peering
gcloud compute networks peerings delete preview-shared-to-dev-peering \
  --network=labs-asp-vpc-preview-shared

cd terraform/shared-preview-vpc
terraform apply
```

### Preview Can't Reach Dev Database

**1. Check peering is ACTIVE:**
```bash
gcloud compute networks peerings list --network=labs-asp-vpc-preview-shared
```

**2. Check firewall allows traffic from preview:**
```bash
gcloud compute firewall-rules list \
  --filter="network:labs-asp-vpc-dev"
```

**3. Test connectivity from preview VM:**
```bash
# SSH to preview VM
gcloud compute ssh <preview-vm>

# Ping dev Cloud SQL private IP
ping <dev-cloud-sql-private-ip>
```

### VPC Connector Issues

**Error:** "VPC Access Connector is not ready"

**Check connector status:**
```bash
gcloud compute networks vpc-access connectors describe \
  labs-conn-preview-shared \
  --region=us-central1
```

**If state is not READY:**
- Wait 2-3 minutes (connector can take time to provision)
- Check logs: `gcloud logging read "resource.type=vpc_access_connector"`

## Maintenance

### Updating Firewall Rules

Edit `vpc.tf` (Lines 190-250) and apply:

```bash
cd terraform/shared-preview-vpc
terraform apply
```

Changes apply to all preview environments immediately (no restart needed).

### Changing VPC CIDR Ranges

⚠️ **Cannot be changed after creation** - VPC CIDR is immutable.

**To change:**
1. Destroy all preview environments
2. Destroy shared VPC
3. Update `variables.tf` with new CIDR
4. Apply to create new VPC

### Updating VPC Connector

```bash
# Connector size can be adjusted in vpc.tf
# Lines 126-139
machine_type = "e2-micro"  # or e2-standard-4 for more capacity
min_instances = 2
max_instances = 10
```

Apply changes:
```bash
terraform apply
```

## Cleanup

### When to Destroy

Only destroy when:
- ✅ No preview environments are active
- ✅ Migrating to new architecture
- ✅ Project shutdown

### Destroy Process

```bash
# 1. Verify no active previews
gcloud compute instances list --filter="name~preview"

# 2. Destroy shared VPC
cd terraform/shared-preview-vpc
terraform destroy

# 3. Confirm resources deleted
gcloud compute networks list --filter="name:preview-shared"
```

## Security Considerations

- **Private IPs only:** All resources use private IPs
- **NAT Gateway:** Single static IP for whitelisting external APIs
- **Firewall rules:** Restrict traffic to VPC and dev VPC ranges
- **IAP SSH:** SSH access only via Identity-Aware Proxy
- **VPC Peering:** Only with dev VPC (prod is isolated)

## Cost Breakdown

**Monthly costs (approximate):**
- VPC Network: Free
- Subnets: Free
- NAT Gateway: $45/month (single IP)
- Cloud Router: Free
- VPC Connector: $73/month (e2-micro, 2 instances)
- Static IP: $7/month
- Firewall rules: Free
- VPC Peering: Free

**Total: ~$125/month** (shared across ALL preview environments)

Compare to: $125/month **per preview** with individual VPCs.

## References

- Main documentation: `terraform/SHARED_PREVIEW_VPC_SETUP.md`
- Deployment workflow: `.github/workflows/deploy.yml`
- VPC routing logic: `terraform/vpc.tf`
- [Google Cloud VPC](https://cloud.google.com/vpc/docs)
- [VPC Peering](https://cloud.google.com/vpc/docs/vpc-peering)
