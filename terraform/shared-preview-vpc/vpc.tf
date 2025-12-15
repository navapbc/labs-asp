# Shared Preview VPC Network Configuration
# This VPC is shared by ALL preview environments (preview-pr-*)

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
  ])

  service            = each.key
  disable_on_destroy = false
}

# Main VPC Network - Shared by all preview environments
resource "google_compute_network" "preview_shared" {
  name                    = "labs-asp-vpc-preview-shared"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  description             = "Shared VPC network for all labs-asp preview environments"

  depends_on = [google_project_service.required_apis]
}

# Public Subnet
resource "google_compute_subnetwork" "public" {
  name          = "labs-asp-public-preview-shared"
  ip_cidr_range = var.vpc_cidr_public
  region        = local.region
  network       = google_compute_network.preview_shared.id
  description   = "Public subnet for preview resources with internet access"

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Private Subnet
resource "google_compute_subnetwork" "private" {
  name          = "labs-asp-private-preview-shared"
  ip_cidr_range = var.vpc_cidr_private
  region        = local.region
  network       = google_compute_network.preview_shared.id
  description   = "Private subnet for preview internal resources"

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Database Subnet
resource "google_compute_subnetwork" "db" {
  name          = "labs-asp-db-preview-shared"
  ip_cidr_range = var.vpc_cidr_db
  region        = local.region
  network       = google_compute_network.preview_shared.id
  description   = "Database subnet for preview environments"

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Cloud Router for NAT Gateway
resource "google_compute_router" "main" {
  name    = "labs-asp-router-preview-shared"
  region  = local.region
  network = google_compute_network.preview_shared.id

  bgp {
    asn = 64515  # Different ASN from dev (64514)
  }
}

# Static external IP for Cloud NAT
resource "google_compute_address" "nat_static_ip" {
  name         = "labs-asp-nat-ip-preview-shared"
  region       = local.region
  address_type = "EXTERNAL"
  description  = "Static IP for Cloud NAT - shared by all preview environments"

  labels = merge(local.common_labels, {
    component = "cloud-nat"
    purpose   = "external-api-whitelisting"
  })
}

# Cloud NAT
resource "google_compute_router_nat" "main" {
  name                               = "labs-asp-nat-preview-shared"
  router                             = google_compute_router.main.name
  region                             = google_compute_router.main.region
  nat_ip_allocate_option             = "MANUAL_ONLY"
  nat_ips                            = [google_compute_address.nat_static_ip.self_link]
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Serverless VPC Access Connector for Cloud Run
resource "google_vpc_access_connector" "cloud_run" {
  name          = "labs-conn-preview-shared"
  region        = local.region
  network       = google_compute_network.preview_shared.name
  ip_cidr_range = var.vpc_connector_cidr
  
  machine_type = "e2-micro"
  
  min_instances = 2
  max_instances = 10

  depends_on = [
    google_compute_network.preview_shared,
    google_project_service.required_apis
  ]
}

# Private Service Connection for Cloud SQL (if needed)
resource "google_compute_global_address" "private_ip_range" {
  name          = "labs-asp-private-ip-preview-shared"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.preview_shared.id

  labels = merge(local.common_labels, {
    purpose = "vpc-peering"
  })
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.preview_shared.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]

  depends_on = [google_project_service.required_apis]
}

# Data source to get dev VPC for peering
data "google_compute_network" "dev_vpc" {
  name    = "labs-asp-vpc-dev"
  project = local.project_id
}

# VPC Peering: Preview Shared → Dev
resource "google_compute_network_peering" "preview_to_dev" {
  name         = "preview-shared-to-dev-peering"
  network      = google_compute_network.preview_shared.id
  peer_network = data.google_compute_network.dev_vpc.id

  import_custom_routes = true
  export_custom_routes = true

  depends_on = [
    google_compute_network.preview_shared,
    google_service_networking_connection.private_vpc_connection
  ]
}

# VPC Peering: Dev → Preview Shared
resource "google_compute_network_peering" "dev_to_preview" {
  name         = "dev-to-preview-shared-peering"
  network      = data.google_compute_network.dev_vpc.id
  peer_network = google_compute_network.preview_shared.id

  import_custom_routes = true
  export_custom_routes = true

  depends_on = [
    google_compute_network_peering.preview_to_dev
  ]
}

# Firewall Rules
resource "google_compute_firewall" "allow_internal" {
  name    = "labs-asp-allow-internal-preview-shared"
  network = google_compute_network.preview_shared.name

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
    var.vpc_connector_cidr,
    "10.0.0.0/16"  # Allow traffic from dev VPC
  ]

  description = "Allow all internal communication within preview shared VPC and from dev VPC"
}

resource "google_compute_firewall" "allow_iap_ssh" {
  name    = "labs-asp-allow-iap-ssh-preview-shared"
  network = google_compute_network.preview_shared.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]

  description = "Allow SSH via Identity-Aware Proxy"
}

resource "google_compute_firewall" "allow_health_checks" {
  name    = "labs-asp-allow-health-checks-preview-shared"
  network = google_compute_network.preview_shared.name

  allow {
    protocol = "tcp"
  }

  source_ranges = [
    "35.191.0.0/16",
    "130.211.0.0/22"
  ]

  description = "Allow health checks from Google Cloud load balancers"
}

