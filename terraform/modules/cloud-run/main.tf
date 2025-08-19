terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Service account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = "${var.environment}-labs-asp-run-sa"
  display_name = "Cloud Run Service Account for ${var.environment}"
}

# IAM roles for the service account
resource "google_project_iam_member" "cloud_run_sa_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectViewer",
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Cloud Run service for production/main deployments
resource "google_cloud_run_service" "main" {
  count    = var.environment == "production" ? 1 : 0
  name     = "labs-asp-main"
  location = var.region
  
  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = tostring(var.max_instances)
        "autoscaling.knative.dev/minScale" = tostring(var.min_instances)
        "run.googleapis.com/execution-environment" = "gen2"
        "run.googleapis.com/vpc-access-connector" = var.vpc_connector_name
        "run.googleapis.com/vpc-access-egress" = "private-ranges-only"
      }
      
      labels = merge(var.labels, {
        deployment-type = "main"
      })
    }
    
    spec {
      service_account_name = google_service_account.cloud_run_sa.email
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/labs-asp/labs-asp:latest"
        
        ports {
          container_port = 4111
        }
        
        env {
          name  = "ENVIRONMENT"
          value = var.environment
        }
        
        env {
          name  = "DEPLOYMENT_ID"
          value = "main"
        }
        
        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = "database-url-${var.environment}"
              key  = "latest"
            }
          }
        }
        
        env {
          name = "OPENAI_API_KEY"
          value_from {
            secret_key_ref {
              name = "openai-api-key"
              key  = "latest"
            }
          }
        }
        
        env {
          name = "ANTHROPIC_API_KEY"
          value_from {
            secret_key_ref {
              name = "anthropic-api-key"
              key  = "latest"
            }
          }
        }
        
        env {
          name = "EXA_API_KEY"
          value_from {
            secret_key_ref {
              name = "exa-api-key"
              key  = "latest"
            }
          }
        }
        
        env {
          name = "MASTRA_JWT_SECRET"
          value_from {
            secret_key_ref {
              name = "mastra-jwt-secret"
              key  = "latest"
            }
          }
        }
        
        env {
          name = "MASTRA_APP_PASSWORD"
          value_from {
            secret_key_ref {
              name = "mastra-app-password"
              key  = "latest"
            }
          }
        }
        
        resources {
          limits = {
            cpu    = var.cpu_limit
            memory = var.memory_limit
          }
        }
        
        # Health check
        liveness_probe {
          http_get {
            path = "/health"
            port = 4111
          }
          initial_delay_seconds = 30
          period_seconds        = 10
          timeout_seconds       = 5
          failure_threshold     = 3
        }
        
        startup_probe {
          http_get {
            path = "/health"
            port = 4111
          }
          initial_delay_seconds = 10
          period_seconds        = 5
          timeout_seconds       = 3
          failure_threshold     = 20
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  autogenerate_revision_name = true
}

# IAM policy to allow unauthenticated access
resource "google_cloud_run_service_iam_member" "public_access" {
  count    = var.environment == "production" ? 1 : 0
  location = google_cloud_run_service.main[0].location
  project  = google_cloud_run_service.main[0].project
  service  = google_cloud_run_service.main[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
