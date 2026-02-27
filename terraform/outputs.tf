# Cloud NAT static IP for external API whitelisting
output "nat_external_ip" {
  description = "Static external IP for Cloud NAT (use for external API whitelisting)"
  value       = length(google_compute_address.nat_static_ip) > 0 ? google_compute_address.nat_static_ip[0].address : null
}

output "api_whitelisting_info" {
  description = "Information needed for external API whitelisting"
  value = length(google_compute_address.nat_static_ip) > 0 ? {
    static_ip   = google_compute_address.nat_static_ip[0].address
    environment = var.environment
    region      = local.region
    purpose     = "Outbound traffic via Cloud NAT"
  } : null
}

# AI Chatbot service outputs
output "chatbot_service_name" {
  description = "Name of the AI Chatbot Cloud Run service"
  value       = google_cloud_run_v2_service.ai_chatbot.name
}

output "chatbot_service_url" {
  description = "URL of the AI Chatbot Cloud Run service"
  value       = google_cloud_run_v2_service.ai_chatbot.uri
}

output "chatbot_public_url" {
  description = "Public URL for accessing the AI chatbot"
  value       = google_cloud_run_v2_service.ai_chatbot.uri
}

# Service account outputs
output "cloud_run_service_account" {
  description = "Service account email for Cloud Run services"
  value       = google_service_account.cloud_run.email
}

# Environment information
output "environment" {
  description = "Deployed environment"
  value       = var.environment
}

output "project_id" {
  description = "GCP project ID"
  value       = local.project_id
}

output "region" {
  description = "GCP region"
  value       = local.region
}

# VPC Network outputs
output "vpc_id" {
  description = "VPC network ID"
  value       = local.vpc_network.id
}

output "vpc_name" {
  description = "VPC network name"
  value       = local.vpc_network.name
}

output "vpc_public_subnet" {
  description = "Public subnet CIDR"
  value       = var.vpc_cidr_public
}

output "vpc_private_subnet" {
  description = "Private subnet CIDR"
  value       = var.vpc_cidr_private
}

output "vpc_db_subnet" {
  description = "Database subnet CIDR"
  value       = var.vpc_cidr_db
}

output "vpc_connector_cidr" {
  description = "VPC Connector CIDR"
  value       = var.vpc_connector_cidr
}

