# VPC Network outputs
output "vpc_id" {
  description = "Shared preview VPC network ID"
  value       = google_compute_network.preview_shared.id
}

output "vpc_name" {
  description = "Shared preview VPC network name"
  value       = google_compute_network.preview_shared.name
}

output "vpc_self_link" {
  description = "Shared preview VPC self link"
  value       = google_compute_network.preview_shared.self_link
}

# Subnet outputs
output "public_subnet_id" {
  description = "Public subnet ID"
  value       = google_compute_subnetwork.public.id
}

output "public_subnet_name" {
  description = "Public subnet name"
  value       = google_compute_subnetwork.public.name
}

output "private_subnet_id" {
  description = "Private subnet ID"
  value       = google_compute_subnetwork.private.id
}

output "private_subnet_name" {
  description = "Private subnet name"
  value       = google_compute_subnetwork.private.name
}

output "db_subnet_id" {
  description = "Database subnet ID"
  value       = google_compute_subnetwork.db.id
}

output "db_subnet_name" {
  description = "Database subnet name"
  value       = google_compute_subnetwork.db.name
}

# VPC Connector output
output "vpc_connector_id" {
  description = "VPC connector ID for Cloud Run"
  value       = google_vpc_access_connector.cloud_run.id
}

output "vpc_connector_name" {
  description = "VPC connector name"
  value       = google_vpc_access_connector.cloud_run.name
}

# NAT IP output
output "nat_external_ip" {
  description = "Static external IP for Cloud NAT"
  value       = google_compute_address.nat_static_ip.address
}

# CIDR outputs
output "vpc_cidr_public" {
  description = "Public subnet CIDR"
  value       = var.vpc_cidr_public
}

output "vpc_cidr_private" {
  description = "Private subnet CIDR"
  value       = var.vpc_cidr_private
}

output "vpc_cidr_db" {
  description = "Database subnet CIDR"
  value       = var.vpc_cidr_db
}

output "vpc_connector_cidr" {
  description = "VPC Connector CIDR"
  value       = var.vpc_connector_cidr
}

# Peering status
output "peering_status" {
  description = "VPC peering status with dev"
  value = {
    preview_to_dev = google_compute_network_peering.preview_to_dev.state
    dev_to_preview = google_compute_network_peering.dev_to_preview.state
  }
}

