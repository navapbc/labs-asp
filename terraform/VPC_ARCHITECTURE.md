# VPC Network Architecture

## Overview

The infrastructure uses dedicated and isolated VPCs per environment, following the subnet naming pattern: **public**, **private**, and **database**.

## Network Architecture

### Environments and CIDRs

Each environment has its own VPC with /16 CIDR, subdivided into /20 subnets:

| Environment | VPC Base | Public Subnet | Private Subnet | DB Subnet | VPC Connector |
|----------|----------|----------------|----------------|-----------|---------------|
| **Dev** | 10.0.0.0/16 | 10.0.0.0/20 | 10.0.16.0/20 | 10.0.32.0/20 | 10.0.48.0/28 |
| **Preview (HML)** | 10.1.0.0/16 | 10.1.0.0/20 | 10.1.16.0/20 | 10.1.32.0/20 | 10.1.48.0/28 |
| **Prod** | 10.2.0.0/16 | 10.2.0.0/20 | 10.2.16.0/20 | 10.2.32.0/20 | 10.2.48.0/28 |

### Subnet Structure

#### 1. Public Subnet (`10.X.0.0/20`)
- **Resources**: VMs with external IP, Load Balancers, NAT Gateways
- **Capacity**: ~4,096 IPs
- **Current usage**: 
  - Application VM (browser-streaming + mastra-app)
  - External access via public IP
- **Features**:
  - Private Google Access enabled
  - Secondary ranges for GKE (future)
  - Flow logs enabled

#### 2. Private Subnet (`10.X.16.0/20`)
- **Resources**: Cloud Run (via VPC Connector), internal services
- **Capacity**: ~4,096 IPs
- **Current usage**:
  - VPC Access Connector for Cloud Run
  - Internal communication between services
- **Features**:
  - No direct internet access
  - Access via Cloud NAT
  - Private Google Access enabled

#### 3. Database Subnet (`10.X.32.0/20`)
- **Resources**: Cloud SQL, Redis, managed databases
- **Capacity**: ~4,096 IPs
- **Current usage**:
  - Reserved for Cloud SQL Private IP
  - Private Service Connection configured
- **Features**:
  - Isolated from direct access
  - Private Google Access enabled
  - VPC Peering with Google Service Networking

#### 4. VPC Connector (`10.X.48.0/28`)
- **Resources**: Serverless VPC Access Connector
- **Capacity**: 16 IPs (fixed /28 size)
- **Current usage**:
  - Connects Cloud Run to VPC
  - 2-10 instances (e2-micro)
- **Features**:
  - Bridge between Cloud Run and VPC
  - Automatically scalable

## Network Components

### Cloud NAT
- **Purpose**: Provides internet access for resources in private subnet
- **Configuration**: 
  - Automatic NAT IP
  - Logs for errors only
  - All subnets enabled

### Cloud Router
- **Purpose**: Manages dynamic routing for Cloud NAT
- **ASN**: 64514 (private default)

### VPC Peering
- **Service Networking**: Connects VPC to Google Service Networking
- **Usage**: Cloud SQL with private IP
- **Reserved range**: Additional /16 for Google services

## Firewall Rules

### 1. Internal Traffic (`allow-internal`)
- **Source**: All VPC subnets
- **Destination**: All VPC subnets
- **Protocols**: TCP, UDP, ICMP (all ports)
- **Purpose**: Free communication between internal resources

### 2. SSH via IAP (`allow-iap-ssh`)
- **Source**: 35.235.240.0/20 (Identity-Aware Proxy)
- **Destination**: All VMs
- **Protocol**: TCP port 22
- **Purpose**: Secure access via `gcloud compute ssh`

### 3. Health Checks (`allow-health-checks`)
- **Source**: 35.191.0.0/16, 130.211.0.0/22 (Google LB)
- **Destination**: Resources with target tags
- **Protocol**: TCP (all ports)
- **Purpose**: Load Balancer health checks

### 4. Application Ports

#### Browser MCP (port 8931)
- **Tags**: `browser-mcp`
- **Source**: Internal VPC + Configurable external IPs
- **Configuration**: Set via `allow_public_access` and `allowed_ip_ranges` variables
- **Usage**: Playwright MCP server

#### Browser Streaming (port 8933)
- **Tags**: `browser-streaming`
- **Source**: Internal VPC + Configurable external IPs
- **Configuration**: Set via `allow_public_access` and `allowed_ip_ranges` variables
- **Usage**: WebSocket streaming

#### Mastra API (port 4112)
- **Tags**: `mastra-app`
- **Source**: Internal VPC + Configurable external IPs
- **Configuration**: Set via `allow_public_access` and `allowed_ip_ranges` variables
- **Usage**: AI agents API

### Firewall Configuration by Environment

Firewall rules are automatically configured **per service** based on environment:

| Environment | Services | Configuration | Use Case |
|-------------|----------|---------------|----------|
| **Dev** | All | Public (0.0.0.0/0) | Development & testing |
| **Preview** | All | Public (0.0.0.0/0) | Staging & demos |
| **Prod** | Per-service | Granular restrictions | Production security |

**Production Granular Configuration:**
```json
{
  "browser_mcp": {
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]  // Office only
  },
  "browser_streaming": {
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24", "198.51.100.0/24"]  // Office + VPN
  },
  "mastra_api": {
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.50/32"]  // Specific server
  }
}
```

**See [FIREWALL_CONFIG.md](./FIREWALL_CONFIG.md) for comprehensive examples and scenarios.**

## Communication Flow

### Cloud Run → VM (Mastra API)
```
Cloud Run (ai-chatbot)
  ↓
VPC Connector (10.X.48.0/28)
  ↓
VPC Network (labs-asp-vpc-{env})
  ↓
VM in Public Subnet (10.X.0.0/20)
  ↓
Mastra API :4112
```

### Cloud Run → Cloud SQL
```
Cloud Run (ai-chatbot)
  ↓
VPC Connector (10.X.48.0/28)
  ↓
VPC Network
  ↓
Service Networking Peering
  ↓
Cloud SQL Private IP (10.X.32.0/20)
```

### Internet → Cloud Run → Browser
```
Internet
  ↓
Cloud Run Public URL
  ↓
Browser WS Proxy (Cloud Run)
  ↓
VPC Connector
  ↓
VM Browser Service :8933 (WebSocket)
```

## GitHub Actions Configuration

The `.github/workflows/deploy.yml` workflow automatically defines CIDRs based on environment:

```yaml
- name: Set VPC CIDR blocks
  id: vpc_cidrs
  run: |
    case ${ENV} in
      dev)
        echo "vpc_cidr_public=10.0.0.0/20"
        echo "vpc_cidr_private=10.0.16.0/20"
        echo "vpc_cidr_db=10.0.32.0/20"
        echo "vpc_connector_cidr=10.0.48.0/28"
        ;;
      preview|preview-*)
        echo "vpc_cidr_public=10.1.0.0/20"
        echo "vpc_cidr_private=10.1.16.0/20"
              echo "vpc_cidr_db=10.1.32.0/20"
              echo "vpc_connector_cidr=10.1.48.0/28"
              echo "allow_public_access=true"
              ;;
            prod)
              echo "vpc_cidr_public=10.2.0.0/20"
              echo "vpc_cidr_private=10.2.16.0/20"
              echo "vpc_cidr_db=10.2.32.0/20"
              echo "vpc_connector_cidr=10.2.48.0/28"
              echo "allow_public_access=false"
              echo 'allowed_ip_ranges=["office_ip", "vpn_ip"]'
              ;;
          esac
```

## Manual Deployment

For manual deployment with Terraform:

```bash
cd terraform

# Initialize Terraform
terraform init -backend-config="prefix=terraform/state/dev"

# Apply with specific CIDRs
terraform apply \
  -var="environment=dev" \
  -var="vpc_cidr_public=10.0.0.0/20" \
  -var="vpc_cidr_private=10.0.16.0/20" \
  -var="vpc_cidr_db=10.0.32.0/20" \
  -var="vpc_connector_cidr=10.0.48.0/28" \
  -var="allow_public_access=true" \
  -var='allowed_ip_ranges=["0.0.0.0/0"]'
```

## Security

### Environment Isolation
- Each environment has its own isolated VPC
- No direct traffic between VPCs of different environments
- Preview environments use shared VPC (10.1.0.0/16)

### Private Google Access
- Enabled on all subnets
- Allows access to Google APIs without external IP
- Reduces egress traffic cost

### Flow Logs
- Enabled on all subnets
- Interval: 5 seconds
- Full metadata for auditing

### Least Privilege Principle
- Firewalls restrict traffic by tags
- Cloud SQL accessible only via private VPC
- SSH only via Identity-Aware Proxy

## Monitoring

### VPC Flow Logs
- **Location**: Cloud Logging
- **Example query**:
```
resource.type="gce_subnetwork"
resource.labels.subnetwork_name=~"labs-asp-.*"
```

### VPC Connector Metrics
- **Location**: Cloud Monitoring
- **Important metrics**:
  - `connector.googleapis.com/connector/connections`
  - `connector.googleapis.com/connector/sent_bytes_count`
  - `connector.googleapis.com/connector/received_bytes_count`

## Future Expansion

### Subnet Expansion
Each /20 subnet can be expanded within the environment's /16:
- Public Subnet: up to 10.X.15.255
- Private Subnet: up to 10.X.31.255
- Database Subnet: up to 10.X.47.255

### New Environments
To add new environments:
1. Choose new /16 CIDR (example: 10.3.0.0/16)
2. Add mapping in workflow
3. Update `variables.tf` with validation
4. Deploy via GitHub Actions

### Kubernetes (GKE)
Secondary ranges already configured in public subnet:
- **Pods**: `cidrsubnet(vpc_cidr_public, 4, 1)` → 10.X.1.0/24
- **Services**: `cidrsubnet(vpc_cidr_public, 4, 2)` → 10.X.2.0/24

## Troubleshooting

### Cloud Run → VM Connectivity
```bash
# Check if VPC Connector is healthy
gcloud compute networks vpc-access connectors describe \
  labs-asp-connector-{env} \
  --region=us-central1

# Test connectivity
gcloud compute ssh app-vm-{env} --zone=us-central1-a \
  --tunnel-through-iap \
  -- curl http://localhost:4112/health
```

### Firewall Blocking Traffic
```bash
# List firewall rules
gcloud compute firewall-rules list \
  --filter="network:labs-asp-vpc-{env}"

# Check firewall logs
gcloud logging read 'resource.type="gce_subnetwork" 
  AND logName:"/logs/compute.googleapis.com/firewall"' \
  --limit=50 \
  --format=json
```

### VPC Peering Issues
```bash
# Check peering status
gcloud services vpc-peerings list \
  --network=labs-asp-vpc-{env}

# List reserved ranges
gcloud compute addresses list \
  --filter="purpose:VPC_PEERING" \
  --global
```
