# Service account for development environment
resource "google_service_account" "development" {
  account_id   = "labs-asp-development"
  display_name = "Labs ASP Development Service Account"
  description  = "Service account for Labs ASP development environment resources"
}

# Service account for Cloud Run services (for future use)
resource "google_service_account" "cloud_run" {
  account_id   = "labs-asp-cloud-run"
  display_name = "Labs ASP Cloud Run Service Account"
  description  = "Service account for Labs ASP Cloud Run services"
}

# IAM roles for development environment service account
resource "google_project_iam_member" "development_sql_client" {
  project = local.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_secret_accessor" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_storage_object_admin" {
  project = local.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_logging_writer" {
  project = local.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_monitoring_writer" {
  project = local.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_trace_agent" {
  project = local.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.development.email}"
}

# GitHub Actions resources (for future use - currently unused)
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deploy"
  display_name = "GitHub Actions Deployment Service Account"
  description  = "Service account for GitHub Actions deployments"
}

resource "google_iam_workload_identity_pool" "github_actions" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "Workload Identity Pool Provider for GitHub Actions"

  attribute_condition = "assertion.repository_owner=='navapbc'"
  attribute_mapping = {
    "google.subject"           = "assertion.sub"
    "attribute.actor"          = "assertion.actor"
    "attribute.repository"     = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

