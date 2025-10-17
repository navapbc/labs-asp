# Google Cloud Storage buckets for artifacts
# IMPORTANT: GLOBAL resources managed ONLY by 'dev' environment
# These buckets are shared across ALL environments (dev, preview-*, prod)
resource "google_storage_bucket" "artifacts" {
  for_each = local.is_managing_globals ? local.environments : {}

  name          = "labs-asp-artifacts-${each.key}"
  location      = local.region
  force_destroy = each.key != "prod" # Protect production bucket

  # Versioning
  versioning {
    enabled = true
  }

  # Lifecycle management
  lifecycle_rule {
    condition {
      age = 30 # days
    }
    action {
      type = "Delete"
    }
  }

  # Uniform bucket-level access
  uniform_bucket_level_access = true

  labels = merge(local.common_labels, {
    environment = each.key
    purpose     = "artifacts"
  })

  depends_on = [google_project_service.required_apis]
}

# Data sources for storage buckets (used in preview/prod environments)
data "google_storage_bucket" "artifacts" {
  for_each = local.is_managing_globals ? {} : local.environments

  name = "labs-asp-artifacts-${each.key}"
}

# Unified local for bucket references
locals {
  artifact_buckets = local.is_managing_globals ? {
    for k, v in google_storage_bucket.artifacts : k => v.name
  } : {
    for k, v in data.google_storage_bucket.artifacts : k => v.name
  }
}

# IAM binding for Cloud Run services to access storage
# Only manage in dev environment
resource "google_storage_bucket_iam_member" "cloud_run_storage_access" {
  for_each = local.is_managing_globals ? local.environments : {}

  bucket = google_storage_bucket.artifacts[each.key].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"

  depends_on = [google_storage_bucket.artifacts]
}