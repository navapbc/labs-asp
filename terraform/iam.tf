# Service account for development environment
resource "google_service_account" "development" {
  account_id   = "labs-asp-development"
  display_name = "Labs ASP Development Service Account"
  description  = "Service account for Labs ASP development environment resources"
}

# IAM roles for development environment service account
resource "google_project_iam_member" "development_sql_client" {
  project = local.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_secret_accessor" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_storage_object_admin" {
  project = local.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_logging_writer" {
  project = local.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_monitoring_writer" {
  project = local.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.development.email}"
}

resource "google_project_iam_member" "development_trace_agent" {
  project = local.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.development.email}"
}

