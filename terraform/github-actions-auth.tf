# Workload Identity Federation for GitHub Actions
# Allows GitHub Actions workflows to authenticate to GCP without storing service account keys

locals {
  repo_owner            = "navapbc"
  repo_name             = "labs-asp"
  github_sa_email       = "github-actions-deploy@${var.project_id}.iam.gserviceaccount.com"
}

# Workload Identity Pool for GitHub Actions
resource "google_iam_workload_identity_pool" "github_actions" {
  workload_identity_pool_id = "github-actions-pool"
  display_name             = "GitHub Actions Pool"
  description              = "Identity pool for GitHub Actions workflows"
  # Use numeric project ID to match existing resource
}

# OIDC Provider for GitHub
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "OIDC provider for GitHub Actions"
  # Use numeric project ID to match existing resource

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  attribute_condition = "assertion.repository_owner == '${local.repo_owner}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow GitHub Actions to impersonate the service account
resource "google_service_account_iam_member" "github_actions_workload_identity" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${local.github_sa_email}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/${local.repo_owner}/${local.repo_name}"
}

# DEPRECATED: roles/editor is too broad - using specific roles in iam.tf instead
# This should be removed once we confirm least-privilege permissions work
# resource "google_project_iam_member" "github_actions_sheets_editor" {
#   project = var.project_id
#   role    = "roles/editor"
#   member  = "serviceAccount:${local.github_sa_email}"
# }

# Output the values needed for GitHub Secrets
output "gcp_workload_identity_provider" {
  description = "The Workload Identity Provider resource name for GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "gcp_service_account" {
  description = "The service account email for GitHub Actions"
  value       = local.github_sa_email
}

output "github_secrets_instructions" {
  description = "Instructions for setting up GitHub secrets"
  value = <<-EOT
  
  Add these secrets to GitHub repository settings:
  https://github.com/${local.repo_owner}/${local.repo_name}/settings/secrets/actions
  
  GCP_WORKLOAD_IDENTITY_PROVIDER: ${google_iam_workload_identity_pool_provider.github.name}
  GCP_SERVICE_ACCOUNT: ${local.github_sa_email}
  GOOGLE_CLOUD_PROJECT: ${var.project_id}
  DATABASE_URL: (Use your existing DATABASE_URL from .env)
  EOT
}

