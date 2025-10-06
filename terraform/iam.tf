# GitHub Actions Service Account
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deploy"
  display_name = "GitHub Actions Deployment Service Account"
  description  = "Service account for GitHub Actions deployments"
}

# IAM roles for GitHub Actions service account
resource "google_project_iam_member" "github_actions_cloud_run_admin" {
  project = local.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_storage_admin" {
  project = local.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_secret_accessor" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_artifact_registry_admin" {
  project = local.project_id
  role    = "roles/artifactregistry.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_cloud_build_editor" {
  project = local.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_service_account_user" {
  project = local.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_compute_viewer" {
  project = local.project_id
  role    = "roles/compute.viewer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Workload Identity Pool for GitHub Actions
# NOTE: These are GLOBAL resources, not environment-specific
# They should only be created once, typically in preview environment
# Comment out to avoid conflicts when deploying to dev/prod
# resource "google_iam_workload_identity_pool" "github_actions" {
#   workload_identity_pool_id = "github-actions-pool"
#   display_name              = "GitHub Actions Pool"
#   description               = "Workload Identity Pool for GitHub Actions"
# }

# resource "google_iam_workload_identity_pool_provider" "github_actions" {
#   workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
#   workload_identity_pool_provider_id = "github-provider"
#   display_name                       = "GitHub Provider"
#   description                        = "Workload Identity Pool Provider for GitHub Actions"

#   attribute_condition = "assertion.repository_owner=='navapbc'"
#   attribute_mapping = {
#     "google.subject"             = "assertion.sub"
#     "attribute.actor"            = "assertion.actor"
#     "attribute.repository"       = "assertion.repository"
#     "attribute.repository_owner" = "assertion.repository_owner"
#   }

#   oidc {
#     issuer_uri = "https://token.actions.githubusercontent.com"
#   }
# }

# resource "google_service_account_iam_member" "github_actions_workload_identity" {
#   service_account_id = google_service_account.github_actions.name
#   role               = "roles/iam.workloadIdentityUser"
#   member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/navapbc/labs-asp"
# }

# Allow GitHub Actions service account to act as Cloud Run service account (only for current environment)
resource "google_service_account_iam_member" "github_actions_act_as_cloud_run" {
  service_account_id = google_service_account.cloud_run.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions.email}"
}