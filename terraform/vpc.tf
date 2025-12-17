# VPC Network Configuration
# 
# Strategy:
# - Dev/Prod: Creates dedicated VPC for each environment
# - Preview: Uses shared preview VPC (created in shared-preview-vpc/)
#
# Preview environments reference the existing shared VPC via data sources

# Data sources for shared preview VPC (used by all preview-pr-* environments)
data "google_compute_network" "preview_shared" {
  count   = startswith(var.environment, "preview-") ? 1 : 0
  name    = "labs-asp-vpc-preview-shared"
  project = local.project_id
}

data "google_compute_subnetwork" "preview_public" {
  count   = startswith(var.environment, "preview-") ? 1 : 0
  name    = "labs-asp-public-preview-shared"
  region  = local.region
  project = local.project_id
}

data "google_compute_subnetwork" "preview_private" {
  count   = startswith(var.environment, "preview-") ? 1 : 0
  name    = "labs-asp-private-preview-shared"
  region  = local.region
  project = local.project_id
}

data "google_compute_subnetwork" "preview_db" {
  count   = startswith(var.environment, "preview-") ? 1 : 0
  name    = "labs-asp-db-preview-shared"
  region  = local.region
  project = local.project_id
}

data "google_vpc_access_connector" "preview_connector" {
  count   = startswith(var.environment, "preview-") ? 1 : 0
  name    = "labs-conn-preview-shared"
  region  = local.region
  project = local.project_id
}

# Main VPC Network (only for dev and prod)
resource "google_compute_network" "main" {
  count                   = startswith(var.environment, "preview-") ? 0 : 1
  name                    = "labs-asp-vpc-${var.environment}"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  description             = "Main VPC network for labs-asp ${var.environment} environment"

  depends_on = [google_project_service.required_apis]
}

# Local values to reference VPC/subnets regardless of source (created or data source)
locals {
  vpc_network = startswith(var.environment, "preview-") ? (
    data.google_compute_network.preview_shared[0]
  ) : (
    google_compute_network.main[0]
  )
  
  public_subnet = startswith(var.environment, "preview-") ? (
    data.google_compute_subnetwork.preview_public[0]
  ) : (
    google_compute_subnetwork.public[0]
  )
  
  private_subnet = startswith(var.environment, "preview-") ? (
    data.google_compute_subnetwork.preview_private[0]
  ) : (
    google_compute_subnetwork.private[0]
  )
  
  db_subnet = startswith(var.environment, "preview-") ? (
    data.google_compute_subnetwork.preview_db[0]
  ) : (
    google_compute_subnetwork.db[0]
  )
  
  vpc_connector = startswith(var.environment, "preview-") ? (
    data.google_vpc_access_connector.preview_connector[0]
  ) : (
    google_vpc_access_connector.cloud_run[0]
  )
}

# Public Subnet - For resources that need direct internet access (only for dev/prod)
resource "google_compute_subnetwork" "public" {
  count         = startswith(var.environment, "preview-") ? 0 : 1
  name          = "labs-asp-public-${var.environment}"
  ip_cidr_range = var.vpc_cidr_public
  region        = local.region
  network       = google_compute_network.main[0].id
  description   = "Public subnet for resources with internet access"

  # Enable Private Google Access for API calls
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Private Subnet - For internal resources (only for dev/prod)
resource "google_compute_subnetwork" "private" {
  count         = startswith(var.environment, "preview-") ? 0 : 1
  name          = "labs-asp-private-${var.environment}"
  ip_cidr_range = var.vpc_cidr_private
  region        = local.region
  network       = google_compute_network.main[0].id
  description   = "Private subnet for internal resources"

  # Enable Private Google Access for API calls without external IPs
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Database Subnet - For Cloud SQL and database resources (only for dev/prod)
resource "google_compute_subnetwork" "db" {
  count         = startswith(var.environment, "preview-") ? 0 : 1
  name          = "labs-asp-db-${var.environment}"
  ip_cidr_range = var.vpc_cidr_db
  region        = local.region
  network       = google_compute_network.main[0].id
  description   = "Database subnet for Cloud SQL and related services"

  # Enable Private Google Access
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Cloud Router for NAT Gateway (only for dev/prod, preview uses shared router)
resource "google_compute_router" "main" {
  count   = startswith(var.environment, "preview-") ? 0 : 1
  name    = "labs-asp-router-${var.environment}"
  region  = local.region
  network = google_compute_network.main[0].id

  bgp {
    asn = 64514
  }
}

# Static external IP for Cloud NAT (only for dev/prod)
resource "google_compute_address" "nat_static_ip" {
  count        = startswith(var.environment, "preview-") ? 0 : 1
  name         = "labs-asp-nat-ip-${var.environment}"
  region       = local.region
  address_type = "EXTERNAL"
  description  = "Static IP for Cloud NAT - used for external API whitelisting in ${var.environment} environment"

  labels = merge(local.common_labels, {
    environment = var.environment
    component   = "cloud-nat"
    purpose     = "external-api-whitelisting"
  })
}

# Cloud NAT - Provides internet access for private subnet instances (only for dev/prod)
resource "google_compute_router_nat" "main" {
  count                              = startswith(var.environment, "preview-") ? 0 : 1
  name                               = "labs-asp-nat-${var.environment}"
  router                             = google_compute_router.main[0].name
  region                             = google_compute_router.main[0].region
  nat_ip_allocate_option             = "MANUAL_ONLY"
  nat_ips                            = [google_compute_address.nat_static_ip[0].self_link]
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Serverless VPC Access Connector for Cloud Run (only for dev/prod, preview uses shared connector)
resource "google_vpc_access_connector" "cloud_run" {
  count         = startswith(var.environment, "preview-") ? 0 : 1
  name          = local.vpc_connector_name
  region        = local.region
  network       = google_compute_network.main[0].name
  ip_cidr_range = var.vpc_connector_cidr
  
  # Connector machine type (f1-micro, e2-micro, or e2-standard-4)
  machine_type = "e2-micro"
  
  min_instances = 2
  max_instances = 10

  depends_on = [
    google_compute_network.main,
    google_project_service.required_apis
  ]
}

# Private Service Connection for Cloud SQL (only for dev/prod)
# Preview uses the connection from shared VPC
resource "google_compute_global_address" "private_ip_range" {
  count         = startswith(var.environment, "preview-") ? 0 : 1
  name          = "labs-asp-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main[0].id

  labels = merge(local.common_labels, {
    environment = var.environment
    purpose     = "vpc-peering"
  })
}

resource "google_service_networking_connection" "private_vpc_connection" {
  count                   = startswith(var.environment, "preview-") ? 0 : 1
  network                 = google_compute_network.main[0].id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range[0].name]

  depends_on = [google_project_service.required_apis]
}

# Firewall Rules (only for dev/prod, preview uses shared VPC firewalls)
# Allow internal communication within VPC
resource "google_compute_firewall" "allow_internal" {
  count   = startswith(var.environment, "preview-") ? 0 : 1
  name    = "labs-asp-allow-internal-${var.environment}"
  network = google_compute_network.main[0].name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [
    var.vpc_cidr_public,
    var.vpc_cidr_private,
    var.vpc_cidr_db,
    var.vpc_connector_cidr
  ]

  description = "Allow all internal communication within VPC"
}

# Allow SSH from IAP (Identity-Aware Proxy)
resource "google_compute_firewall" "allow_iap_ssh" {
  count   = startswith(var.environment, "preview-") ? 0 : 1
  name    = "labs-asp-allow-iap-ssh-${var.environment}"
  network = google_compute_network.main[0].name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # IAP's IP range for SSH
  source_ranges = ["35.235.240.0/20"]

  description = "Allow SSH via Identity-Aware Proxy"
}

# Allow health checks from Google Cloud
resource "google_compute_firewall" "allow_health_checks" {
  count   = startswith(var.environment, "preview-") ? 0 : 1
  name    = "labs-asp-allow-health-checks-${var.environment}"
  network = google_compute_network.main[0].name

  allow {
    protocol = "tcp"
  }

  # Google Cloud health check IP ranges
  source_ranges = [
    "35.191.0.0/16",
    "130.211.0.0/22"
  ]

  description = "Allow health checks from Google Cloud load balancers"
}

# Browser MCP access (configurable port, only for dev/prod)
# Preview environments use shared VPC firewall rules
resource "google_compute_firewall" "browser_mcp" {
  count   = startswith(var.environment, "preview-") ? 0 : 1
  name    = "labs-asp-browser-mcp-${var.environment}"
  network = google_compute_network.main[0].name

  allow {
    protocol = "tcp"
    ports    = [tostring(var.firewall_rules.browser_mcp.port)]
  }

  # Combine internal VPC ranges with allowed external ranges
  source_ranges = concat(
    [
      var.vpc_cidr_public,
      var.vpc_cidr_private,
      var.vpc_connector_cidr
    ],
    var.firewall_rules.browser_mcp.allow_public_access ? ["0.0.0.0/0"] : var.firewall_rules.browser_mcp.allowed_ip_ranges
  )

  target_tags = ["browser-mcp"]

  description = "Allow Playwright MCP access on port ${var.firewall_rules.browser_mcp.port} from VPC and approved external IPs"
}

# Browser Streaming WebSocket access (configurable port, only for dev/prod)
resource "google_compute_firewall" "browser_streaming" {
  count   = startswith(var.environment, "preview-") ? 0 : 1
  name    = "labs-asp-browser-streaming-${var.environment}"
  network = google_compute_network.main[0].name

  allow {
    protocol = "tcp"
    ports    = [tostring(var.firewall_rules.browser_streaming.port)]
  }

  # Combine internal VPC ranges with allowed external ranges
  source_ranges = concat(
    [
      var.vpc_cidr_public,
      var.vpc_cidr_private,
      var.vpc_connector_cidr
    ],
    var.firewall_rules.browser_streaming.allow_public_access ? ["0.0.0.0/0"] : var.firewall_rules.browser_streaming.allowed_ip_ranges
  )

  target_tags = ["browser-streaming"]

  description = "Allow browser streaming WebSocket access on port ${var.firewall_rules.browser_streaming.port} from VPC and approved external IPs"
}

# Mastra API access (configurable port, only for dev/prod)
resource "google_compute_firewall" "mastra_app" {
  count   = startswith(var.environment, "preview-") ? 0 : 1
  name    = "labs-asp-mastra-app-${var.environment}"
  network = google_compute_network.main[0].name

  allow {
    protocol = "tcp"
    ports    = [tostring(var.firewall_rules.mastra_api.port)]
  }

  # Combine internal VPC ranges with allowed external ranges
  source_ranges = concat(
    [
      var.vpc_cidr_public,
      var.vpc_cidr_private,
      var.vpc_connector_cidr
    ],
    var.firewall_rules.mastra_api.allow_public_access ? ["0.0.0.0/0"] : var.firewall_rules.mastra_api.allowed_ip_ranges
  )

  target_tags = ["mastra-app"]

  description = "Allow Mastra API access on port ${var.firewall_rules.mastra_api.port} from VPC and approved external IPs"
}

# ============================================================================
# VPC Peering Configuration
# ============================================================================
# 
# Note: VPC peering for preview environments is now managed in shared-preview-vpc/
# All preview environments use a shared VPC that has permanent peering with dev VPC
# 
# This eliminates the need for dynamic peering creation/destruction per preview environment

