# VPC & Network Isolation Analysis

Based on investigation of the infrastructure, this document provides a comprehensive analysis of the current network architecture and recommendations for improvement.

---

## Terraform Workspaces vs State Prefixes

**Current State Management:** The project already uses state prefixes for environment isolation.

**Implementation:**
```yaml
# .github/workflows/deploy.yml:203-204
terraform init \
  -backend-config="prefix=terraform/state/${{ needs.setup.outputs.environment }}"
```

**State Storage:**
```
gs://labs-asp-terraform-state/
├── terraform/state/dev/
├── terraform/state/preview-pr-42/
├── terraform/state/preview-pr-43/
└── terraform/state/prod/
```

**Terraform Workspaces vs Current Approach:**

| Aspect | Workspaces | Current (State Prefixes) |
|--------|-----------|-------------------------|
| State isolation | Yes | Yes |
| Explicit environment | No (implicit) | Yes (via -var) |
| Dynamic PR names | Awkward | Natural |
| CI/CD simplicity | Extra steps needed | One init command |
| Visibility | Hidden workspace | Visible state path |
| **Verdict** | Redundant | Already implemented |

**Conclusion:** Terraform workspaces would be redundant. The project already has proper state isolation via prefixes, which is more explicit and better suited for the dynamic preview-pr-N naming pattern.

**The Real Problem:** VPC/network isolation, not state isolation. Workspaces do not solve network isolation.

---

## Current Architecture State

### Network Configuration

**Current Setup: Single Default VPC**
- Network: `default` (auto-mode VPC)
- All environments share the same network: dev, preview-pr-*, prod
- No network isolation between environments

### Components Breakdown

#### 1. Compute Engine VMs (terraform/compute.tf:43-106)

- Multiple VMs: `app-vm-dev`, `app-vm-preview-pr-*` (18 VMs currently)
- All VMs on same network: `network = "default"` (compute.tf:59)
- All VMs in same subnet: 10.128.0.0/20 (us-central1)
- Each VM has:
  - Internal IP: Within 10.128.0.0/20 range
  - External IP: Public internet-facing
- VMs run Docker containers:
  - browser-streaming (ports 8931, 8933)
  - mastra-app (port 4112)
  - Containers share a Docker bridge network: mastra-network

#### 2. Cloud Run Services (terraform/cloud_run.tf)

- Services: `ai-chatbot-*`, `browser-ws-proxy-*`
- Serverless - no explicit VPC attachment configured
- Uses Cloud Run's default egress (all traffic goes through internet)
- Cloud Run → VM communication happens over public internet via VM external IPs

#### 3. Firewall Rules (terraform/compute.tf:134-180)

- `allow-browser-mcp-{environment}`: 0.0.0.0/0 → tcp:8931
- `allow-browser-streaming-{environment}`: 0.0.0.0/0 → tcp:8933
- `allow-mastra-app-{environment}`: 0.0.0.0/0 → tcp:4112

All ports are open to the entire internet (0.0.0.0/0)

---

## Critical Security Gaps

### Gap 1: No Network Isolation Between Environments

**Current State:**
- Dev VM at 10.128.0.62 can directly communicate with all preview VMs
- Preview VMs can access dev resources
- All VMs share the same subnet and can reach each other's internal services

**Risk:**
- A compromised preview environment could attack dev/prod resources
- Cross-environment data leakage possible
- No blast radius containment

### Gap 2: All Services Exposed to Public Internet

**Current State:**
```
Source: 0.0.0.0/0 (entire internet)
→ Port 8931 (MCP server)
→ Port 8933 (WebSocket)
→ Port 4112 (Mastra API)
```

**Risk:**
- Anyone on the internet can reach your internal APIs
- No authentication layer before reaching services
- Vulnerable to DDoS, scanning, exploitation

### Gap 3: Cloud Run Uses Public Egress

**Current State:**
- Cloud Run services connect to VMs via external IPs (cloud_run.tf:218, 230, 236)
- Traffic path: Cloud Run → Internet → VM External IP
- No private connectivity

**Risk:**
- All internal traffic traverses public internet
- Higher latency
- Data exposure risk
- Costs (egress charges)

### Gap 4: Shared Database and Storage

**Current State:**
- All preview environments share dev database (main.tf:54)
- Storage buckets per environment but no network-level isolation

**Risk:**
- Preview environment bugs could corrupt dev data
- No true isolation for testing

---

## VPC & Subnet Architecture Recommendations

### Option 1: Separate VPCs Per Environment (Strongest Isolation)

```
┌─────────────────────────────────────────────────────────────┐
│ Project: nava-labs                                          │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐│
│  │ VPC: dev         │  │ VPC: preview     │  │ VPC: prod  ││
│  │ CIDR: 10.0.0.0/16│  │ CIDR: 10.1.0.0/16│  │ CIDR:      ││
│  │                  │  │                  │  │ 10.2.0.0/16││
│  │ Subnets:         │  │ Subnets:         │  │ Subnets:   ││
│  │ - us-central1:   │  │ - us-central1:   │  │ - us-c1:   ││
│  │   10.0.0.0/20    │  │   10.1.0.0/20    │  │  10.2.0.0  ││
│  │                  │  │                  │  │  /20       ││
│  │ Resources:       │  │ Resources:       │  │ Resources: ││
│  │ - app-vm-dev     │  │ - app-vm-pr-*    │  │ - app-vm-  ││
│  │ - Cloud Run      │  │ - Cloud Run      │  │   prod     ││
│  │   (VPC connector)│  │   (VPC connector)│  │ - Cloud    ││
│  │                  │  │                  │  │   Run      ││
│  └──────────────────┘  └──────────────────┘  └────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- Complete network isolation - VPC boundary prevents cross-environment access
- Independent firewall rules per VPC (simpler logic, no CIDR math)
- No cross-environment communication possible (even with firewall misconfiguration)
- Can have overlapping IP ranges if needed
- Same migration complexity as Option 2 (~200 lines of Terraform)
- Better protection against human error

**Cons:**
- 3x infrastructure to manage (3 VPCs, 3 routers, 3 NATs)
- Shared services require VPC peering or Private Service Connect
- Slightly higher GCP costs (~$0-50/month more than Option 2)

---

### Option 2: Single VPC with Separate Subnets

```
┌─────────────────────────────────────────────────────────────┐
│ VPC: labs-asp-network (CIDR: 10.0.0.0/8)                   │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Subnet: dev-subnet                                     ││
│  │ CIDR: 10.0.0.0/16                                      ││
│  │ Region: us-central1                                    ││
│  │ Resources: app-vm-dev, Cloud Run VPC connector        ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Subnet: preview-subnet                                 ││
│  │ CIDR: 10.1.0.0/16                                      ││
│  │ Region: us-central1                                    ││
│  │ Resources: app-vm-preview-pr-*, Cloud Run connectors  ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Subnet: prod-subnet                                    ││
│  │ CIDR: 10.2.0.0/16                                      ││
│  │ Region: us-central1                                    ││
│  │ Resources: app-vm-prod, Cloud Run VPC connector       ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Isolation via Firewall Rules:**

```hcl
# Dev VMs can only talk to dev VMs
source_ranges = ["10.0.0.0/16"]  # dev subnet
target_tags = ["dev"]

# Preview VMs can only talk to preview VMs
source_ranges = ["10.1.0.0/16"]  # preview subnet
target_tags = ["preview"]

# Prod VMs can only talk to prod VMs
source_ranges = ["10.2.0.0/16"]  # prod subnet
target_tags = ["prod"]
```

**Pros:**
- Good isolation with firewall rules
- Easier to manage than multiple VPCs
- Can share some resources (Cloud SQL, Secret Manager)
- Lower operational complexity
- Same code complexity as Option 1 (150-200 lines)

**Cons:**
- CRITICAL: Isolation depends entirely on firewall rules - One CIDR typo = cross-environment breach
- Higher human error risk - Engineer types 10.0.0.0/8 instead of 10.1.0.0/16 = all environments exposed
- All environments visible in same VPC
- More complex firewall logic (must calculate CIDR ranges)

---

### Option 3: Environment-Specific Projects (Strongest Overall)

```
┌────────────────────┐  ┌────────────────────┐  ┌────────────────┐
│ Project: dev       │  │ Project: preview   │  │ Project: prod  │
│ VPC: default       │  │ VPC: default       │  │ VPC: default   │
│ Resources:         │  │ Resources:         │  │ Resources:     │
│ - app-vm-dev       │  │ - app-vm-pr-*      │  │ - app-vm-prod  │
│ - Cloud SQL-dev    │  │ - Cloud SQL-dev    │  │ - Cloud SQL-   │
│ - Secrets          │  │   (shared)         │  │   prod         │
└────────────────────┘  └────────────────────┘  └────────────────┘
```

**Pros:**
- Complete project-level isolation
- Separate billing and quotas
- Easiest firewall management
- Best security posture

**Cons:**
- Requires GCP org structure changes
- More complex CI/CD (different projects)
- Separate secrets, IAM per project

---

## Recommended Implementation Plan

### FINAL RECOMMENDATION: Option 1 (Separate VPCs)

**Decision Rationale:**
- Same code complexity as Option 2 (~200 lines either way)
- Same migration effort (2-3 days either way)
- Minimal cost difference ($0-50/month)
- Significantly better security (VPC boundary prevents firewall mistakes)
- With 18+ preview environments and high change velocity, human error risk is real
- One firewall typo in Option 2 could expose all environments; Option 1 contains mistakes to single VPC

**Cost Analysis:**
- Option 1: ~$261/month (VPC connectors + NAT)
- Option 2: ~$195-261/month (depending on NAT configuration)
- Security benefit far outweighs minimal cost difference

**Timeline:** 1 week (2 days code + 3 days migration + 2 days validation)

### Phase 1: Create Custom VPC and Subnets

Create `terraform/network.tf`:

```hcl
resource "google_compute_network" "labs_asp" {
  name                    = "labs-asp-network"
  auto_create_subnetworks = false  # Manual subnet control
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "dev" {
  name          = "dev-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.labs_asp.id
  
  private_ip_google_access = true  # Access to Google APIs via private IPs
}

resource "google_compute_subnetwork" "preview" {
  name          = "preview-subnet"
  ip_cidr_range = "10.1.0.0/16"
  region        = var.region
  network       = google_compute_network.labs_asp.id
  
  private_ip_google_access = true
}

resource "google_compute_subnetwork" "prod" {
  name          = "prod-subnet"
  ip_cidr_range = "10.2.0.0/16"
  region        = var.region
  network       = google_compute_network.labs_asp.id
  
  private_ip_google_access = true
}

# Cloud Router for Cloud NAT (allows VMs without external IPs to reach internet)
resource "google_compute_router" "labs_asp" {
  name    = "labs-asp-router"
  region  = var.region
  network = google_compute_network.labs_asp.id
}

# Cloud NAT per environment (for outbound internet access)
resource "google_compute_router_nat" "dev" {
  name   = "dev-nat"
  router = google_compute_router.labs_asp.name
  region = var.region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"
  
  subnetwork {
    name                    = google_compute_subnetwork.dev.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}

# Repeat for preview and prod...
```

### Phase 2: Migrate VMs to Subnets

Modify `terraform/compute.tf`:

```hcl
locals {
  # Map environment to subnet
  environment_subnet = {
    dev     = google_compute_subnetwork.dev.id
    preview = google_compute_subnetwork.preview.id
    prod    = google_compute_subnetwork.prod.id
  }
  
  # Determine subnet for current environment
  vm_subnet = local.environment_subnet[local.base_environment]
}

resource "google_compute_instance" "app_vm" {
  name         = "app-vm-${var.environment}"
  machine_type = var.vm_machine_type
  zone         = local.zone

  # ... boot disk config ...

  network_interface {
    network    = google_compute_network.labs_asp.id
    subnetwork = local.vm_subnet

    # OPTION A: Keep external IP (easier migration)
    access_config {}

    # OPTION B: No external IP (more secure, requires Cloud NAT)
    # Remove access_config block entirely
  }

  tags = [
    local.base_environment,  # "dev", "preview", or "prod"
    "browser-mcp",
    "browser-streaming",
    "mastra-app"
  ]
}
```

### Phase 3: Implement Private Service Connectivity

For Cloud Run → VM communication (instead of public internet).

Create `terraform/vpc_connector.tf`:

```hcl
# VPC Connector for Cloud Run
resource "google_vpc_access_connector" "dev" {
  count = local.base_environment == "dev" ? 1 : 0
  
  name          = "dev-connector"
  region        = var.region
  network       = google_compute_network.labs_asp.name
  ip_cidr_range = "10.0.255.0/28"  # Small /28 range for connector
}

resource "google_vpc_access_connector" "preview" {
  count = local.base_environment == "preview" ? 1 : 0

  name          = "preview-connector"
  region        = var.region
  network       = google_compute_network.labs_asp.name
  ip_cidr_range = "10.1.255.0/28"
}
```

Update Cloud Run to use VPC connector in `terraform/cloud_run.tf`:

```hcl
resource "google_cloud_run_v2_service" "ai_chatbot" {
  # ... existing config ...
  
  template {
    vpc_access {
      connector = local.base_environment == "dev" ?
        google_vpc_access_connector.dev[0].id :
        google_vpc_access_connector.preview[0].id
      egress    = "PRIVATE_RANGES_ONLY"  # Use VPC for private IPs, internet for public
    }

    # Change MASTRA_SERVER_URL to use internal IP
    containers {
      env {
        name  = "MASTRA_SERVER_URL"
        value = "http://${google_compute_instance.app_vm.network_interface[0].network_ip}:4112"
      }
    }
  }
}
```

### Phase 4: Restrict Firewall Rules

Create `terraform/firewall.tf` (move from compute.tf):

```hcl
# Allow internal VM-to-VM communication within same environment
resource "google_compute_firewall" "internal_dev" {
  name    = "allow-internal-dev"
  network = google_compute_network.labs_asp.name

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/16"]  # dev subnet
  target_tags   = ["dev"]
}

# Allow Cloud Run VPC connector to reach dev VMs
resource "google_compute_firewall" "cloudrun_to_dev" {
  name    = "allow-cloudrun-to-dev"
  network = google_compute_network.labs_asp.name

  allow {
    protocol = "tcp"
    ports    = ["4112", "8931", "8933"]
  }

  source_ranges = ["10.0.255.0/28"]  # dev VPC connector range
  target_tags   = ["dev"]
}

# ONLY allow public access to Cloud Run (port 3000)
# Remove public access to VM ports entirely
# Or restrict to specific IP ranges (office, VPN)

resource "google_compute_firewall" "restricted_public_dev" {
  name    = "allow-restricted-public-dev"
  network = google_compute_network.labs_asp.name

  allow {
    protocol = "tcp"
    ports    = ["4112"]  # Only if you need public API access
  }

  # Replace 0.0.0.0/0 with specific ranges
  source_ranges = [
    "YOUR_OFFICE_IP/32",
    "VPN_IP_RANGE/24"
  ]
  
  target_tags = ["dev"]
}

# Deny all other inbound traffic
resource "google_compute_firewall" "deny_all_ingress" {
  name     = "deny-all-ingress"
  network  = google_compute_network.labs_asp.name
  priority = 65534  # Lower priority (evaluated last)

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
}
```

### Phase 5: Service Accounts per Environment

Currently your service accounts are per-environment, which is good. But ensure they can't cross environments.

Add to `terraform/iam.tf`:

```hcl
# Dev VM service account can only access dev resources
resource "google_project_iam_member" "vm_storage_dev" {
  count = local.base_environment == "dev" ? 1 : 0

  project = local.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.vm.email}"
  
  condition {
    title       = "Dev resources only"
    description = "Restrict access to dev GCS bucket"
    expression  = "resource.name.startsWith('projects/_/buckets/labs-asp-artifacts-dev')"
  }
}
```

---

## Migration Strategy

### Step 1: Create Network Infrastructure (No Impact)

1. Create new VPC and subnets
2. Create VPC connectors
3. Create Cloud NAT and routers
4. Don't migrate resources yet

### Step 2: Migrate Non-Prod Environments First

1. Start with a single preview environment as test
2. Update VM to use new subnet
3. Update Cloud Run to use VPC connector
4. Update firewall rules
5. Test thoroughly
6. Migrate remaining preview environments
7. Migrate dev

### Step 3: Migrate Production Last

1. After all non-prod environments validated
2. Schedule maintenance window
3. Migrate prod

### Step 4: Decommission Default Network

1. After all resources migrated
2. Delete old firewall rules
3. Consider deleting default network

---

## Immediate Actions (Low-Risk Security Improvements)

While you plan the full migration, you can make these changes now:

### 1. Restrict Firewall Source Ranges

Modify `terraform/compute.tf`:

```hcl
resource "google_compute_firewall" "browser_mcp" {
  name    = "allow-browser-mcp-${var.environment}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["8931"]
  }

  # CHANGE THIS:
  # source_ranges = ["0.0.0.0/0"]  # Old - entire internet

  # TO THIS:
  source_ranges = [
    "10.128.0.0/9",  # Internal GCP traffic
    "YOUR_OFFICE_IP/32"  # Your office IP
  ]

  target_tags = ["browser-mcp"]
}
```

### 2. Remove External IPs from VMs (use Cloud NAT)

Modify `terraform/compute.tf`:

```hcl
resource "google_compute_instance" "app_vm" {
  # ... existing config ...
  
  network_interface {
    network = "default"
    # Remove this block:
    # access_config {
    #   # Ephemeral external IP
    # }
  }
}

# Add Cloud NAT for outbound connectivity
resource "google_compute_router" "default_router" {
  name    = "default-router-${var.environment}"
  network = "default"
  region  = var.region
}

resource "google_compute_router_nat" "default_nat" {
  name   = "default-nat-${var.environment}"
  router = google_compute_router.default_router.name
  region = var.region

  nat_ip_allocate_option = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
```

### 3. Add Cloud Armor for Cloud Run

Create `terraform/security.tf`:

```hcl
resource "google_compute_security_policy" "cloud_run_policy" {
  name = "cloud-run-policy-${var.environment}"

  # Block common attack sources
  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      expr {
        expression = "origin.region_code == 'CN' || origin.region_code == 'RU'"
      }
    }
  }

  # Rate limiting
  rule {
    action   = "rate_based_ban"
    priority = "2000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
  }

  # Default allow
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}
```

---

## Summary

### Current State:

- All environments share default VPC
- All services exposed to internet (0.0.0.0/0)
- Cloud Run uses public egress to VMs
- No network isolation whatsoever

### Recommended End State:

- Custom VPC with 3 subnets (dev, preview, prod)
- Firewall rules restrict cross-environment access
- VMs use internal IPs only (no external)
- Cloud Run uses VPC connectors for private connectivity
- Public internet access only to Cloud Run frontend (port 3000)
- All internal APIs (4112, 8931, 8933) are private

### Migration Complexity:

- **Moderate** - Requires careful planning and testing
- **Downtime** - Can be done with minimal downtime per environment
- **Rollback** - Keep old network until validated

---

## Next Steps

Choose one of the following actions:

1. Generate the complete Terraform code for the recommended VPC setup
2. Create a detailed migration runbook with step-by-step commands
3. Start implementing the immediate security improvements (firewall restrictions)
4. Analyze any specific concerns about the recommendations

