# Google Cloud Storage Configuration
# 
# Strategy:
# - Dev: Creates and manages nava-storage-dev bucket
# - Preview: Uses dev bucket name directly (bucket must exist, created by dev)
# - Prod: Creates and manages nava-storage-prod bucket (completely isolated from dev/preview)

# Storage Bucket for DEV environment
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
  ) : startswith(var.environment, "preview-") ? (
    "nava-storage-dev"  # Preview uses dev bucket name directly (bucket must exist)
  ) : (
    google_storage_bucket.dev[0].name
  )
}

# IAM binding for Cloud Run services to access DEV bucket
resource "google_storage_bucket_iam_member" "cloud_run_dev_access" {
  count  = var.environment == "dev" ? 1 : 0
  bucket = google_storage_bucket.dev[0].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"

  depends_on = [google_storage_bucket.dev]
}

# IAM binding for preview environments to access DEV bucket
# Note: Bucket must exist (created by dev) before preview can apply IAM binding
resource "google_storage_bucket_iam_member" "cloud_run_preview_dev_access" {
  count  = startswith(var.environment, "preview-") ? 1 : 0
  bucket = "nava-storage-dev"  # Use bucket name directly - bucket must exist from dev
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

# IAM binding for Cloud Run services to access PROD bucket
resource "google_storage_bucket_iam_member" "cloud_run_prod_access" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = google_storage_bucket.prod[0].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"

  depends_on = [google_storage_bucket.prod]
}
