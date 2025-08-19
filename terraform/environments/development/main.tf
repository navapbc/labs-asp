terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  # Configure remote state storage
  backend "gcs" {
    bucket = "labs-asp-terraform-state"
    prefix = "environments/development"
  }
}

# Configure the Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Local values for common tags and naming
locals {
  environment = "development"
  project_name = "labs-asp"
  
  common_labels = {
    environment = local.environment
    project     = local.project_name
    managed_by  = "terraform"
  }
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "run.googleapis.com",
    "sql-component.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
  ])
  
  project = var.project_id
  service = each.value
  
  disable_dependent_services = false
  disable_on_destroy = false
}

# Artifact Registry for container images
resource "google_artifact_registry_repository" "main" {
  location      = var.region
  repository_id = local.project_name
  description   = "Container registry for ${local.project_name}"
  format        = "DOCKER"
  
  labels = local.common_labels
  
  depends_on = [google_project_service.required_apis]
}

# Cloud SQL Database
module "database" {
  source = "../../modules/database"
  
  project_id   = var.project_id
  region       = var.region
  environment  = local.environment
  
  # Development-specific settings
  db_tier               = "db-f1-micro"
  disk_size            = 10
  max_disk_size        = 50
  backup_retention_days = 7
  availability_type    = "ZONAL"
  
  labels = local.common_labels
  
  depends_on = [google_project_service.required_apis]
}

# Browser Pool for Playwright/MCP
module "browser_pool" {
  source = "../../modules/browser-pool"
  
  project_id  = var.project_id
  region      = var.region
  zone        = var.zone
  environment = local.environment
  
  # Network configuration
  network_name = module.database.network_name
  subnet_name  = "${local.environment}-labs-asp-subnet"
  
  # Development-specific settings
  machine_type    = "e2-standard-2"
  disk_size      = 30
  instance_count = 1  # Single instance for development
  
  # Container images
  container_image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.repository_id}/labs-asp:latest"
  
  labels = local.common_labels
  
  depends_on = [
    google_project_service.required_apis,
    module.database
  ]
}

# Cloud Run Services
module "cloud_run" {
  source = "../../modules/cloud-run"
  
  project_id  = var.project_id
  region      = var.region
  environment = local.environment
  
  # Development-specific settings
  cpu_limit     = "1"
  memory_limit  = "1Gi"
  max_instances = 5
  min_instances = 0
  
  # Database connection
  database_connection_name = module.database.connection_name
  vpc_connector_name      = module.database.vpc_connector_name
  
  # Browser pool connection
  mcp_gateway_endpoint = module.browser_pool.mcp_gateway_endpoint
  
  labels = local.common_labels
  
  depends_on = [
    google_project_service.required_apis,
    google_artifact_registry_repository.main,
    module.browser_pool
  ]
}

# Secret Manager secrets
resource "google_secret_manager_secret" "database_url" {
  secret_id = "database-url-${local.environment}"
  
  replication {
    auto {}
  }
  
  labels = local.common_labels
  
  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${module.database.user_name}:${module.database.user_password}@${module.database.private_ip_address}/${module.database.database_name}?sslmode=require"
}

# Output important values
output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = module.database.connection_name
}

output "database_private_ip" {
  description = "Database private IP address"
  value       = module.database.private_ip_address
  sensitive   = true
}

output "artifact_registry_url" {
  description = "Artifact Registry URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.repository_id}"
}

output "cloud_run_service_url" {
  description = "Cloud Run service URL"
  value       = module.cloud_run.service_url
}

output "cloud_run_service_name" {
  description = "Cloud Run service name"
  value       = module.cloud_run.service_name
}

output "browser_pool_internal_ip" {
  description = "Browser pool internal load balancer IP"
  value       = module.browser_pool.internal_load_balancer_ip
}

output "mcp_gateway_endpoint" {
  description = "MCP Gateway internal endpoint"
  value       = module.browser_pool.mcp_gateway_endpoint
}
