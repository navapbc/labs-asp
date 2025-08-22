# Cloud Storage bucket for Terraform state
resource "google_storage_bucket" "terraform_state" {
  name          = "labs-asp-terraform-state"
  location      = "US"
  force_destroy = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  labels = local.common_labels
}

# Cloud Storage bucket for screenshots and artifacts
resource "google_storage_bucket" "artifacts" {
  name          = "labs-asp-artifacts"
  location      = local.region
  force_destroy = false

  # Enable uniform bucket-level access
  uniform_bucket_level_access = true

  # CORS configuration for web access
  cors {
    origin          = ["*"]
    method          = ["GET", "POST", "PUT", "DELETE", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  labels = local.common_labels
}

# IAM binding for Cloud Run services to access artifacts bucket
resource "google_storage_bucket_iam_member" "cloud_run_artifacts_access" {
  bucket = google_storage_bucket.artifacts.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Cloud Storage bucket for build artifacts and container images cache
resource "google_storage_bucket" "build_cache" {
  name          = "labs-asp-build-cache"
  location      = local.region
  force_destroy = true

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }

  labels = local.common_labels
}

# IAM binding for GitHub Actions to access build cache
resource "google_storage_bucket_iam_member" "github_actions_build_cache" {
  bucket = google_storage_bucket.build_cache.name
  role   = "roles/storage.admin"
  member = "serviceAccount:github-actions-deploy@${local.project_id}.iam.gserviceaccount.com"
}
