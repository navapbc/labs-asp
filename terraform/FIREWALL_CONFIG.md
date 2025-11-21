# Firewall Configuration Guide - Multiple Rules

## Overview

Application firewall rules are **automatically configured per environment and per service** via GitHub Actions workflow. This allows granular control where each service (Browser MCP, Browser Streaming, Mastra API) can have different access rules.

## How It Works

### Granular Firewall Variable

The `firewall_rules` variable controls **ports, protocols, and access** per service:

```hcl
firewall_rules = {
  browser_mcp = {
    port                = number         # Configurable port!
    allow_public_access = bool
    allowed_ip_ranges   = list(string)
  }
  browser_streaming = {
    port                = number         # Configurable port!
    allow_public_access = bool
    allowed_ip_ranges   = list(string)
  }
  mastra_api = {
    port                = number         # Configurable port!
    allow_public_access = bool
    allowed_ip_ranges   = list(string)
  }
}
```

### Services Configuration

| Service | Default Port | Description | Typical Access Pattern |
|---------|--------------|-------------|------------------------|
| **browser_mcp** | 8931 (configurable) | Playwright MCP automation | Office/Dev team only |
| **browser_streaming** | 8933 (configurable) | WebSocket browser streaming | Broader access for demos |
| **mastra_api** | 4112 (configurable) | AI agents API | Restricted to specific services |

> **NEW**: Ports are now fully configurable! You can use custom ports per environment.

## Configuration Examples

### Example 0: Custom Ports!

**NEW**: You can now use completely custom ports per environment:

```json
{
  "browser_mcp": {
    "port": 9931,                        // Custom port!
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  },
  "browser_streaming": {
    "port": 9933,                        // Custom port!
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  },
  "mastra_api": {
    "port": 5112,                        // Custom port!
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  }
}
```

### Example 1: All Public with Default Ports (Dev/Preview)

```json
{
  "browser_mcp": {
    "port": 8931,
    "allow_public_access": true,
    "allowed_ip_ranges": ["0.0.0.0/0"]
  },
  "browser_streaming": {
    "port": 8933,
    "allow_public_access": true,
    "allowed_ip_ranges": ["0.0.0.0/0"]
  },
  "mastra_api": {
    "port": 4112,
    "allow_public_access": true,
    "allowed_ip_ranges": ["0.0.0.0/0"]
  }
}
```

### Example 2: Different Rules per Service (Production)

```json
{
  "browser_mcp": {
    "port": 8931,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]              // Office only
  },
  "browser_streaming": {
    "port": 8933,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24", "198.51.100.0/24"]  // Office + VPN
  },
  "mastra_api": {
    "port": 4112,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.50/32", "198.51.100.10/32"]  // Specific servers
  }
}
```

### Example 3: Mixed Access (Hybrid)

```json
{
  "browser_mcp": {
    "port": 8931,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]  // Restricted
  },
  "browser_streaming": {
    "port": 8933,
    "allow_public_access": true,             // Public for demos
    "allowed_ip_ranges": ["0.0.0.0/0"]
  },
  "mastra_api": {
    "port": 4112,
    "allow_public_access": false,
    "allowed_ip_ranges": ["198.51.100.0/24"]  // VPN only
  }
}
```

### Example 4: Ultra-Restricted Production

```json
{
  "browser_mcp": {
    "port": 8931,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.50/32"]  // Single admin IP
  },
  "browser_streaming": {
    "port": 8933,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]   // Office network
  },
  "mastra_api": {
    "port": 4112,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.100/32", "198.51.100.50/32"]  // 2 specific servers
  }
}
```

## Configuring in GitHub Actions

Edit `.github/workflows/deploy.yml` in the "Set VPC CIDR blocks and Firewall rules" step:

### Production Configuration Example

```yaml
prod)
  # Production: 10.2.0.0/16
  echo "vpc_cidr_public=10.2.0.0/20" >> $GITHUB_OUTPUT
  echo "vpc_cidr_private=10.2.16.0/20" >> $GITHUB_OUTPUT
  echo "vpc_cidr_db=10.2.32.0/20" >> $GITHUB_OUTPUT
  echo "vpc_connector_cidr=10.2.48.0/28" >> $GITHUB_OUTPUT
  
  # Granular firewall rules per service with custom ports
  cat >> $GITHUB_OUTPUT << 'EOF'
firewall_rules={
  "browser_mcp": {
    "port": 8931,                          # Standard or custom port
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  },
  "browser_streaming": {
    "port": 8933,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24", "198.51.100.0/24"]
  },
  "mastra_api": {
    "port": 4112,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.50/32"]
  }
}
EOF
  ;;
```

## Real-World Scenarios

### Scenario 1: Development Team + External Partners

**Requirements:**
- Dev team needs full access to MCP
- Partners need browser streaming for demos
- API restricted to internal services

```json
{
  "browser_mcp": {
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]  // Dev team office
  },
  "browser_streaming": {
    "allow_public_access": false,
    "allowed_ip_ranges": [
      "203.0.113.0/24",   // Dev team
      "198.51.100.0/24",  // Partner A
      "192.0.2.0/24"      // Partner B
    ]
  },
  "mastra_api": {
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24", "10.50.0.0/16"]  // Office + Internal VPC
  }
}
```

### Scenario 2: Multi-Office Company

**Requirements:**
- 3 office locations
- Remote VPN users
- Cloud monitoring service

```json
{
  "browser_mcp": {
    "allow_public_access": false,
    "allowed_ip_ranges": [
      "203.0.113.0/24",   // Office NY
      "198.51.100.0/24",  // Office SF
      "192.0.2.0/24"      // Office London
    ]
  },
  "browser_streaming": {
    "allow_public_access": false,
    "allowed_ip_ranges": [
      "203.0.113.0/24",   // Office NY
      "198.51.100.0/24",  // Office SF
      "192.0.2.0/24",     // Office London
      "198.18.0.0/24"     // VPN users
    ]
  },
  "mastra_api": {
    "allow_public_access": false,
    "allowed_ip_ranges": [
      "203.0.113.0/24",   // Office NY
      "198.51.100.0/24",  // Office SF
      "192.0.2.0/24",     // Office London
      "35.190.247.0/24"   // Cloud monitoring
    ]
  }
}
```

### Scenario 3: Public Demo + Private Admin

**Requirements:**
- Browser streaming public for demos
- MCP and API restricted to admins

```json
{
  "browser_mcp": {
    "port": 8931,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]  // Admin only
  },
  "browser_streaming": {
    "port": 8933,
    "allow_public_access": true,             // Public demos
    "allowed_ip_ranges": ["0.0.0.0/0"]
  },
  "mastra_api": {
    "port": 4112,
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]  // Admin only
  }
}
```

### Scenario 4: Custom Ports for Security

**Requirements:**
- Use non-standard ports for security through obscurity
- Restrict all access to office network

```json
{
  "browser_mcp": {
    "port": 19931,                           // Custom high port
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  },
  "browser_streaming": {
    "port": 19933,                           // Custom high port
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  },
  "mastra_api": {
    "port": 15112,                           // Custom high port
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  }
}
```

## Manual Terraform Configuration

### Using terraform.tfvars

Create `terraform/terraform.tfvars`:

```hcl
environment = "prod"

# VPC Configuration
vpc_cidr_public      = "10.2.0.0/20"
vpc_cidr_private     = "10.2.16.0/20"
vpc_cidr_db          = "10.2.32.0/20"
vpc_connector_cidr   = "10.2.48.0/28"

# Granular Firewall Rules
firewall_rules = {
  browser_mcp = {
    allow_public_access = false
    allowed_ip_ranges   = ["203.0.113.0/24"]
  }
  browser_streaming = {
    allow_public_access = false
    allowed_ip_ranges   = ["203.0.113.0/24", "198.51.100.0/24"]
  }
  mastra_api = {
    allow_public_access = false
    allowed_ip_ranges   = ["203.0.113.50/32"]
  }
}
```

Then apply:

```bash
cd terraform
terraform apply
```

### Using CLI Variables

```bash
terraform apply \
  -var="environment=prod" \
  -var='firewall_rules={
    "browser_mcp": {
      "allow_public_access": false,
      "allowed_ip_ranges": ["203.0.113.0/24"]
    },
    "browser_streaming": {
      "allow_public_access": false,
      "allowed_ip_ranges": ["203.0.113.0/24", "198.51.100.0/24"]
    },
    "mastra_api": {
      "allow_public_access": false,
      "allowed_ip_ranges": ["203.0.113.50/32"]
    }
  }'
```

## Testing Multiple Rules

### Check All Firewall Rules

```bash
# List all firewall rules for environment
gcloud compute firewall-rules list \
  --filter="network:labs-asp-vpc-prod" \
  --format="table(
    name,
    targetTags.list(),
    allowed[].map().firewall_rule().list(),
    sourceRanges.list()
  )"
```

### Test Each Service

```bash
# Get VM IP
VM_IP=$(gcloud compute instances describe app-vm-prod \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

# Test Browser MCP (8931)
curl --max-time 5 http://$VM_IP:8931/mcp

# Test Browser Streaming (8933)
curl --max-time 5 http://$VM_IP:8933

# Test Mastra API (4112)
curl --max-time 5 http://$VM_IP:4112/health
```

### Verify Specific Rule

```bash
# Check Browser MCP rule
gcloud compute firewall-rules describe labs-asp-browser-mcp-prod \
  --format="yaml(sourceRanges, allowed)"

# Check Browser Streaming rule
gcloud compute firewall-rules describe labs-asp-browser-streaming-prod \
  --format="yaml(sourceRanges, allowed)"

# Check Mastra API rule
gcloud compute firewall-rules describe labs-asp-mastra-app-prod \
  --format="yaml(sourceRanges, allowed)"
```

## Monitoring and Auditing

### View Denied Connections by Service

```bash
# Browser MCP denies
gcloud logging read \
  'resource.type="gce_subnetwork"
   AND jsonPayload.rule_details.reference="labs-asp-browser-mcp-prod"
   AND jsonPayload.disposition="DENIED"' \
  --limit=50 \
  --format="table(timestamp, jsonPayload.connection.src_ip, jsonPayload.connection.dest_port)"

# Browser Streaming denies
gcloud logging read \
  'resource.type="gce_subnetwork"
   AND jsonPayload.rule_details.reference="labs-asp-browser-streaming-prod"
   AND jsonPayload.disposition="DENIED"' \
  --limit=50

# Mastra API denies
gcloud logging read \
  'resource.type="gce_subnetwork"
   AND jsonPayload.rule_details.reference="labs-asp-mastra-app-prod"
   AND jsonPayload.disposition="DENIED"' \
  --limit=50
```

### Identify Unauthorized Access Attempts

```bash
# Find IPs trying to access restricted services
gcloud logging read \
  'resource.type="gce_subnetwork"
   AND jsonPayload.disposition="DENIED"
   AND resource.labels.subnetwork_name=~"labs-asp-.*-prod"' \
  --limit=200 \
  --format="value(jsonPayload.connection.src_ip)" \
  | sort | uniq -c | sort -rn
```

## Security Best Practices

### Recommended Patterns

1. **Least Privilege per Service**
   ```json
   // MCP: Dev team only (most restrictive)
   "browser_mcp": { "allowed_ip_ranges": ["office_ip"] }
   
   // Streaming: Demos + partners (moderate)
   "browser_streaming": { "allowed_ip_ranges": ["office_ip", "partner_ips"] }
   
   // API: Specific backend services (restrictive)
   "mastra_api": { "allowed_ip_ranges": ["backend_server_ips"] }
   ```

2. **Use Network Ranges**
   ```json
   // Good: Network range
   "allowed_ip_ranges": ["203.0.113.0/24"]
   
   // Less flexible: Individual IPs
   "allowed_ip_ranges": ["203.0.113.1/32", "203.0.113.2/32", ...]
   ```

3. **Document Each Range**
   ```yaml
   # Office NY: 203.0.113.0/24
   # Office SF: 198.51.100.0/24
   # VPN users: 198.18.0.0/24
   # Partner A: 192.0.2.0/24
   ```

4. **Regular Audits**
   - Review rules quarterly
   - Remove unused IP ranges
   - Update based on denied connection logs

### Anti-Patterns

1. **All Services Public in Production**
   ```json
   // DON'T DO THIS IN PROD
   "allow_public_access": true  // for all services
   ```

2. **Overly Broad Ranges**
   ```json
   // Too broad
   "allowed_ip_ranges": ["0.0.0.0/0", "10.0.0.0/8"]
   ```

3. **Same Rules for All Services**
   ```json
   // Missing opportunity for granular control
   // All services have identical rules
   ```

## Troubleshooting

### Different Services Have Different Access

**Symptom**: Can access port 8933 but not 4112

**Cause**: Different firewall rules per service (by design)

**Solution**: Check configuration for each service separately

```bash
# Compare rules
gcloud compute firewall-rules describe labs-asp-browser-streaming-prod
gcloud compute firewall-rules describe labs-asp-mastra-app-prod
```

### Rule Updates Not Applied

**Symptom**: Changed rules in workflow but still blocked

**Solution**:
```bash
cd terraform
terraform refresh
terraform apply
```

### Emergency Access Needed

**Quick fix** (temporary):
```bash
# Add your IP to specific service
gcloud compute firewall-rules update labs-asp-mastra-app-prod \
  --source-ranges="EXISTING_RANGES,YOUR_IP/32"

# Remember to update workflow after!
```

## Migration Guide

### From Single Rule to Multiple Rules

**Old format** (deprecated):
```yaml
echo "allow_public_access=false" >> $GITHUB_OUTPUT
echo 'allowed_ip_ranges=["203.0.113.0/24"]' >> $GITHUB_OUTPUT
```

**New format**:
```yaml
cat >> $GITHUB_OUTPUT << 'EOF'
firewall_rules={
  "browser_mcp": {
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  },
  "browser_streaming": {
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  },
  "mastra_api": {
    "allow_public_access": false,
    "allowed_ip_ranges": ["203.0.113.0/24"]
  }
}
EOF
```

### Backward Compatibility

Old variables (`allow_public_access`, `allowed_ip_ranges`) are still supported but deprecated. They will apply the same rule to all services.

## Support

For questions or issues:
1. Check [VPC_ARCHITECTURE.md](./VPC_ARCHITECTURE.md) for network details
2. Review firewall logs per service
3. Test each service individually
4. Compare rules: `gcloud compute firewall-rules list --filter="network:labs-asp-vpc-prod"`
