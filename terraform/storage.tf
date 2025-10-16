# Google Cloud Storage buckets for artifacts
# Only create for dev/prod, preview environments use existing buckets
resource "google_storage_bucket" "artifacts" {
  for_each = var.environment == "dev" || var.environment == "prod" ? local.environments : {}

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

# Data source to reference existing buckets for preview environments
data "google_storage_bucket" "artifacts_dev" {
  name = "labs-asp-artifacts-dev"
}

data "google_storage_bucket" "artifacts_preview" {
  name = "labs-asp-artifacts-preview"
}

data "google_storage_bucket" "artifacts_prod" {
  name = "labs-asp-artifacts-prod"
}

# IAM binding for Cloud Run services to access storage
resource "google_storage_bucket_iam_member" "cloud_run_storage_access" {
  # Use the bucket name directly based on base environment
  bucket = "labs-asp-artifacts-${local.base_environment}"
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}