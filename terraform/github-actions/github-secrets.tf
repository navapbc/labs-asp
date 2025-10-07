# Fetch the database URL from Google Secret Manager
data "google_secret_manager_secret_version" "database_url" {
  secret  = var.database_secret_name
  project = var.project_id
}

# GitHub Actions Secrets
resource "github_actions_secret" "gcp_workload_identity_provider" {
  repository      = var.github_repo
  secret_name     = "GCP_WORKLOAD_IDENTITY_PROVIDER"
  plaintext_value = google_iam_workload_identity_pool_provider.github.name
}

resource "github_actions_secret" "gcp_service_account" {
  repository      = var.github_repo
  secret_name     = "GCP_SERVICE_ACCOUNT"
  plaintext_value = local.service_account_email
}

resource "github_actions_secret" "google_cloud_project" {
  repository      = var.github_repo
  secret_name     = "GOOGLE_CLOUD_PROJECT"
  plaintext_value = var.project_id
}

resource "github_actions_secret" "database_url" {
  repository      = var.github_repo
  secret_name     = "DATABASE_URL"
  plaintext_value = data.google_secret_manager_secret_version.database_url.secret_data
}

