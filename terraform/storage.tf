# Google Cloud Storage Configuration
#
# Strategy:
# - Dev: Creates and manages nava-storage-dev bucket
# - Preview: References existing nava-storage-dev bucket (shared with dev)
# - Prod: Creates and manages nava-storage-prod bucket (completely isolated from dev/preview)

# Storage Bucket for DEV environment (only created by dev, not preview)
resource "google_storage_bucket" "dev" {
  count         = var.environment == "dev" ? 1 : 0
  name          = "nava-storage-dev"
  location      = local.region
  force_destroy = false  # Prevent accidental deletion in dev

  # Versioning
  versioning {
    enabled = true
  }

  # Lifecycle management
  lifecycle_rule {
    condition {
      age = 30  # days
    }
    action {
      type = "Delete"
    }
  }

  # Uniform bucket-level access
  uniform_bucket_level_access = true

  labels = merge(local.common_labels, {
    environment = "dev"
    purpose     = "artifacts"
  })

  depends_on = [google_project_service.required_apis]
}

# Data source to reference existing dev bucket for preview environments
data "google_storage_bucket" "dev" {
  count = startswith(var.environment, "preview-") ? 1 : 0
  name  = "nava-storage-dev"
}

# Storage Bucket for PROD environment (completely isolated)
resource "google_storage_bucket" "prod" {
  count         = var.environment == "prod" ? 1 : 0
  name          = "nava-storage-prod"
  location      = local.region
  force_destroy = false  # Protect production bucket

  # Versioning
  versioning {
    enabled = true
  }

  # Lifecycle management - longer retention for prod
  lifecycle_rule {
    condition {
      age = 90  # days - longer retention for production
    }
    action {
      type = "Delete"
    }
  }

  # Uniform bucket-level access
  uniform_bucket_level_access = true

  labels = merge(local.common_labels, {
    environment = "prod"
    purpose     = "artifacts"
  })

  depends_on = [google_project_service.required_apis]
}

# Unified local for bucket references
locals {
  storage_bucket_name = var.environment == "prod" ? (
    google_storage_bucket.prod[0].name
  ) : var.environment == "dev" ? (
    google_storage_bucket.dev[0].name
  ) : (
    data.google_storage_bucket.dev[0].name  # Preview references existing dev bucket
  )
}

# IAM binding for Cloud Run services to access DEV bucket (dev and preview)
resource "google_storage_bucket_iam_member" "cloud_run_dev_access" {
  count  = var.environment == "dev" || startswith(var.environment, "preview-") ? 1 : 0
  bucket = var.environment == "dev" ? google_storage_bucket.dev[0].name : data.google_storage_bucket.dev[0].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"

  depends_on = [
    google_storage_bucket.dev,
    data.google_storage_bucket.dev
  ]
}

# IAM binding for Cloud Run services to access PROD bucket
resource "google_storage_bucket_iam_member" "cloud_run_prod_access" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = google_storage_bucket.prod[0].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"

  depends_on = [google_storage_bucket.prod]
}
