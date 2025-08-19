output "service_url" {
  description = "The URL of the Cloud Run service"
  value       = var.environment == "production" ? google_cloud_run_service.main[0].status[0].url : null
}

output "service_name" {
  description = "The name of the Cloud Run service"
  value       = var.environment == "production" ? google_cloud_run_service.main[0].name : null
}

output "service_account_email" {
  description = "The email of the service account used by Cloud Run"
  value       = google_service_account.cloud_run_sa.email
}
