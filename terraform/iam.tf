# GitHub Actions Service Account
# IMPORTANT: This is a GLOBAL resource used across ALL environments
# NEVER destroy this, even during rollback
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deploy"
  display_name = "GitHub Actions Deployment Service Account"
  description  = "Service account for GitHub Actions deployments"

  lifecycle {
    prevent_destroy = true
  }
}

# IAM roles for GitHub Actions service account
# IMPORTANT: These are GLOBAL permissions needed for ALL deployments
# NEVER destroy these, even during rollback
resource "google_project_iam_member" "github_actions_cloud_run_admin" {
  project = local.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "github_actions_storage_admin" {
  project = local.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "github_actions_secret_accessor" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "github_actions_artifact_registry_admin" {
  project = local.project_id
  role    = "roles/artifactregistry.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "github_actions_cloud_build_editor" {
  project = local.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "github_actions_service_account_user" {
  project = local.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "github_actions_compute_admin" {
  project = local.project_id
  role    = "roles/compute.instanceAdmin.v1"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

# Compute network admin for firewall rules
resource "google_project_iam_member" "github_actions_compute_network_admin" {
  project = local.project_id
  role    = "roles/compute.networkAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

# Compute security admin for firewall management
resource "google_project_iam_member" "github_actions_compute_security_admin" {
  project = local.project_id
  role    = "roles/compute.securityAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

# Security Admin for managing IAM policies
resource "google_project_iam_member" "github_actions_security_admin" {
  project = local.project_id
  role    = "roles/iam.securityAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

# Workload Identity Pool Admin for managing workload identity
resource "google_project_iam_member" "github_actions_workload_identity_admin" {
  project = local.project_id
  role    = "roles/iam.workloadIdentityPoolAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

# Secret Manager Admin for reading secrets during terraform plan
resource "google_project_iam_member" "github_actions_secret_manager_admin" {
  project = local.project_id
  role    = "roles/secretmanager.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

# Service Account Admin for creating/deleting service accounts
resource "google_project_iam_member" "github_actions_service_account_admin" {
  project = local.project_id
  role    = "roles/iam.serviceAccountAdmin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"

  lifecycle {
    prevent_destroy = true
  }
}

# Workload Identity Pool for GitHub Actions
# NOTE: These are GLOBAL resources, not environment-specific
# NEVER destroy these, even during rollback
resource "google_iam_workload_identity_pool" "github_actions" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "Workload Identity Pool Provider for GitHub Actions"

  attribute_condition = "assertion.repository_owner=='navapbc'"
  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_service_account_iam_member" "github_actions_workload_identity" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/navapbc/labs-asp"

  lifecycle {
    prevent_destroy = true
  }
}

# Allow GitHub Actions service account to act as Cloud Run service account (only for current environment)
resource "google_service_account_iam_member" "github_actions_act_as_cloud_run" {
  service_account_id = google_service_account.cloud_run.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions.email}"
}