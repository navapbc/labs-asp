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

# Cloud Storage buckets for screenshots and artifacts (per environment)
resource "google_storage_bucket" "artifacts" {
  for_each = local.environments
  
  name          = "labs-asp-artifacts-${each.key}"
  location      = local.region
  force_destroy = each.key == "prod" ? false : true  # Protect prod data

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
      age = each.key == "prod" ? 90 : 30  # Keep prod data longer
    }
    action {
      type = "Delete"
    }
  }

  labels = merge(local.common_labels, {
    environment = each.key
  })
}

# IAM binding for Cloud Run services to access artifacts buckets
resource "google_storage_bucket_iam_member" "cloud_run_artifacts_access" {
  for_each = local.environments
  
  bucket = google_storage_bucket.artifacts[each.key].name
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
