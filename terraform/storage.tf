# Google Cloud Storage buckets for artifacts
resource "google_storage_bucket" "artifacts" {
  for_each = local.environments

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

# IAM binding for Cloud Run services to access storage
resource "google_storage_bucket_iam_member" "cloud_run_storage_access" {
  for_each = local.environments

  bucket = google_storage_bucket.artifacts[each.key].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"

  depends_on = [google_storage_bucket.artifacts]
}