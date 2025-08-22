# Output values for reference and use in other configurations

output "project_id" {
  description = "The GCP project ID"
  value       = local.project_id
}

output "region" {
  description = "The GCP region"
  value       = local.region
}

# Cloud Run service URLs
output "cloud_run_urls" {
  description = "URLs of the Cloud Run services"
  value = {
    for env, config in local.environments : env => google_cloud_run_v2_service.app[env].uri
  }
}

# Service account emails
output "cloud_run_service_account" {
  description = "Email of the Cloud Run service account"
  value       = google_service_account.cloud_run.email
}

output "github_actions_service_account" {
  description = "Email of the GitHub Actions service account"
  value       = google_service_account.github_actions.email
}

# Storage bucket names (per environment)
output "artifacts_buckets" {
  description = "Names of the artifacts storage buckets per environment"
  value = {
    for env, bucket in google_storage_bucket.artifacts : env => bucket.name
  }
}

output "build_cache_bucket" {
  description = "Name of the build cache storage bucket"
  value       = google_storage_bucket.build_cache.name
}

output "terraform_state_bucket" {
  description = "Name of the Terraform state storage bucket"
  value       = google_storage_bucket.terraform_state.name
}

# Artifact Registry repository
output "artifact_registry_repository" {
  description = "Artifact Registry repository for container images"
  value       = google_artifact_registry_repository.labs_asp.name
}

output "container_image_base_url" {
  description = "Base URL for container images"
  value       = "${local.region}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.labs_asp.repository_id}"
}

# Load balancer outputs (if enabled)
output "load_balancer_ip" {
  description = "Global IP address of the load balancer"
  value       = var.enable_load_balancer ? google_compute_global_address.default[0].address : null
}

output "load_balancer_ip_name" {
  description = "Name of the global IP address"
  value       = var.enable_load_balancer ? google_compute_global_address.default[0].name : null
}

# DNS outputs (if enabled)
output "dns_zone_name" {
  description = "Name of the DNS managed zone"
  value       = var.enable_dns && var.domain_name != "" ? google_dns_managed_zone.main[0].name : null
}

output "dns_name_servers" {
  description = "Name servers for the DNS zone"
  value       = var.enable_dns && var.domain_name != "" ? google_dns_managed_zone.main[0].name_servers : null
}

# Environment-specific database connection info
output "database_instances" {
  description = "Cloud SQL instance names for each environment"
  value = {
    for env, config in local.environments : env => config.sql_instance_name
  }
}

# URLs by environment (with custom domains if configured)
output "environment_urls" {
  description = "URLs for each environment"
  value = var.domain_name != "" && var.enable_load_balancer ? {
    prod    = "https://${var.domain_name}"
    dev     = "https://dev.${var.domain_name}"
    preview = "https://preview.${var.domain_name}"
  } : {
    for env, config in local.environments : env => google_cloud_run_v2_service.app[env].uri
  }
}

# Workload Identity Pool outputs
output "workload_identity_pool_name" {
  description = "Full name of the workload identity pool"
  value       = google_iam_workload_identity_pool.github_actions.name
}

output "workload_identity_provider_name" {
  description = "Full name of the workload identity provider"
  value       = google_iam_workload_identity_pool_provider.github_actions.name
}

# GitHub Actions deployment info
output "github_actions_info" {
  description = "Information for GitHub Actions setup"
  value = {
    service_account_email           = google_service_account.github_actions.email
    workload_identity_provider      = google_iam_workload_identity_pool_provider.github_actions.name
    project_id                     = local.project_id
    region                         = local.region
    artifact_registry              = "${local.region}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.labs_asp.repository_id}"
    
    cloud_run_services = {
      for env, config in local.environments : env => {
        name     = config.cloud_run_service_name
        url      = google_cloud_run_v2_service.app[env].uri
        location = local.region
      }
    }
  }
}
