# Cloud Run service configuration for each environment
resource "google_cloud_run_v2_service" "app" {
  for_each = local.environments

  name     = each.value.cloud_run_service_name
  location = local.region

  template {
    service_account = google_service_account.cloud_run.email
    
    # Resource configuration based on Phase 1 specs
    containers {
      image = "us-central1-docker.pkg.dev/${local.project_id}/labs-asp/app:latest"
      
      # Phase 1 optimal configuration: 2 vCPUs, 4GB RAM for browser + Node.js
      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }

      # Environment variables from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = each.key == "prod" ? "database-url-production" : "database-url-${each.key}"
            version = "latest"
          }
        }
      }

      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "openai-api-key"
            version = "latest"
          }
        }
      }

      env {
        name = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "anthropic-api-key"
            version = "latest"
          }
        }
      }

      env {
        name = "EXA_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "exa-api-key"
            version = "latest"
          }
        }
      }

      env {
        name = "MASTRA_JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "mastra-jwt-secret"
            version = "latest"
          }
        }
      }

      env {
        name = "MASTRA_APP_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = "mastra-app-password"
            version = "latest"
          }
        }
      }

      # Runtime configuration
      env {
        name  = "NODE_ENV"
        value = each.key == "prod" ? "production" : "development"
      }

      env {
        name  = "ENVIRONMENT"
        value = each.key
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = local.project_id
      }

      env {
        name  = "STORAGE_BUCKET"
        value = google_storage_bucket.artifacts[each.key].name
      }

      # CORS configuration for multi-environment access
      env {
        name  = "CORS_ORIGINS"
        value = each.key == "prod" ? "https://${var.domain_name},https://www.${var.domain_name}" : "https://${each.value.domain_prefix}.${var.domain_name},http://localhost:4111,*"
      }

      # Port configuration
      ports {
        container_port = 4111
      }

      # Startup and liveness probes
      startup_probe {
        http_get {
          path = "/health"
          port = 4111
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 4111
        }
        initial_delay_seconds = 30
        timeout_seconds       = 5
        period_seconds        = 30
        failure_threshold     = 3
      }
    }

    # Scaling configuration
    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    # 60-minute timeout for long-running browser automation
    timeout = "${var.cloud_run_timeout}s"

    # VPC connector for private database access (if needed)
    # vpc_access {
    #   connector = google_vpc_access_connector.default.id
    #   egress    = "ALL_TRAFFIC"
    # }
  }

  # Traffic configuration - 100% to latest revision
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  labels = merge(local.common_labels, {
    environment = each.key
  })

  depends_on = [
    google_project_service.required_apis,
    google_service_account.cloud_run
  ]
}

# IAM policy to allow public access (adjust as needed for production)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  for_each = local.environments

  name     = google_cloud_run_v2_service.app[each.key].name
  location = google_cloud_run_v2_service.app[each.key].location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Artifact Registry repository for container images
resource "google_artifact_registry_repository" "labs_asp" {
  repository_id = "labs-asp"
  location      = local.region
  format        = "DOCKER"
  description   = "Docker repository for Labs ASP application"

  labels = local.common_labels

  depends_on = [google_project_service.required_apis]
}
