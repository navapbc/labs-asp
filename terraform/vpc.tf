# VPC Network Configuration
# Creates VPC with public, private, and database subnets

# Main VPC Network
resource "google_compute_network" "main" {
  name                    = "labs-asp-vpc-${var.environment}"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  description             = "Main VPC network for labs-asp ${var.environment} environment"

  depends_on = [google_project_service.required_apis]
}

# Public Subnet - For resources that need direct internet access
resource "google_compute_subnetwork" "public" {
  name          = "labs-asp-public-${var.environment}"
  ip_cidr_range = var.vpc_cidr_public
  region        = local.region
  network       = google_compute_network.main.id
  description   = "Public subnet for resources with internet access"

  # Enable Private Google Access for API calls
  private_ip_google_access = true

  # Secondary ranges for GKE pods and services (if needed in future)
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = cidrsubnet(var.vpc_cidr_public, 4, 1)
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = cidrsubnet(var.vpc_cidr_public, 4, 2)
  }

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Private Subnet - For internal resources (VMs, Cloud Run connectors)
resource "google_compute_subnetwork" "private" {
  name          = "labs-asp-private-${var.environment}"
  ip_cidr_range = var.vpc_cidr_private
  region        = local.region
  network       = google_compute_network.main.id
  description   = "Private subnet for internal resources"

  # Enable Private Google Access for API calls without external IPs
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Database Subnet - For Cloud SQL and database resources
resource "google_compute_subnetwork" "db" {
  name          = "labs-asp-db-${var.environment}"
  ip_cidr_range = var.vpc_cidr_db
  region        = local.region
  network       = google_compute_network.main.id
  description   = "Database subnet for Cloud SQL and related services"

  # Enable Private Google Access
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Cloud Router for NAT Gateway (allows private instances to access internet)
resource "google_compute_router" "main" {
  name    = "labs-asp-router-${var.environment}"
  region  = local.region
  network = google_compute_network.main.id

  bgp {
    asn = 64514
  }
}

# Cloud NAT - Provides internet access for private subnet instances
resource "google_compute_router_nat" "main" {
  name                               = "labs-asp-nat-${var.environment}"
  router                             = google_compute_router.main.name
  region                             = google_compute_router.main.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Serverless VPC Access Connector for Cloud Run
resource "google_vpc_access_connector" "cloud_run" {
  name          = "labs-asp-connector-${var.environment}"
  region        = local.region
  network       = google_compute_network.main.name
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

# Private Service Connection for Cloud SQL
resource "google_compute_global_address" "private_ip_range" {
  name          = "labs-asp-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id

  labels = merge(local.common_labels, {
    environment = var.environment
    purpose     = "vpc-peering"
  })
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]

  depends_on = [google_project_service.required_apis]
}

# Firewall Rules
# Allow internal communication within VPC
resource "google_compute_firewall" "allow_internal" {
  name    = "labs-asp-allow-internal-${var.environment}"
  network = google_compute_network.main.name

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
  name    = "labs-asp-allow-iap-ssh-${var.environment}"
  network = google_compute_network.main.name

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
  name    = "labs-asp-allow-health-checks-${var.environment}"
  network = google_compute_network.main.name

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

# Browser MCP access (configurable port)
resource "google_compute_firewall" "browser_mcp" {
  name    = "labs-asp-browser-mcp-${var.environment}"
  network = google_compute_network.main.name

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

# Browser Streaming WebSocket access (configurable port)
resource "google_compute_firewall" "browser_streaming" {
  name    = "labs-asp-browser-streaming-${var.environment}"
  network = google_compute_network.main.name

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

# Mastra API access (configurable port)
resource "google_compute_firewall" "mastra_app" {
  name    = "labs-asp-mastra-app-${var.environment}"
  network = google_compute_network.main.name

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

