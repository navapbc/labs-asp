# Cloud Run Services
# Note: mastra-app now runs on VM, only ai-chatbot frontend runs on Cloud Run

# AI Chatbot Service - Next.js Frontend
resource "google_cloud_run_v2_service" "ai_chatbot" {
  name     = local.env_config.chatbot_service_name
  location = local.region

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = var.chatbot_image_url

      # Resource configuration for Next.js app
      resources {
        limits = {
          cpu    = var.chatbot_cpu
          memory = var.chatbot_memory
        }
      }

      # Database (Cloud SQL PostgreSQL)
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.environment == "prod" ? "database-url-production" : "database-url-dev"
            version = "latest"
          }
        }
      }

      # AI API Keys
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
        name = "GOOGLE_GENERATIVE_AI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "google-generative-ai-key"
            version = "latest"
          }
        }
      }

      env {
        name = "XAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "xai-api-key"
            version = "latest"
          }
        }
      }

      # Next.js Auth configuration
      env {
        name  = "NEXTAUTH_URL"
        value = var.environment == "prod" ? "https://${var.domain_name}" : "https://${local.env_config.domain_prefix}.${var.domain_name}"
      }

      env {
        name = "AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = "auth-secret"
            version = "latest"
          }
        }
      }

      # Google Cloud configuration
      env {
        name = "GOOGLE_APPLICATION_CREDENTIALS"
        value_source {
          secret_key_ref {
            secret  = "vertex-ai-credentials"
            version = "latest"
          }
        }
      }

      env {
        name  = "GOOGLE_VERTEX_LOCATION"
        value = "us-east5"
      }

      env {
        name  = "GOOGLE_VERTEX_PROJECT"
        value = local.project_id
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = local.project_id
      }

      # Google Cloud Storage
      env {
        name  = "GCS_BUCKET_NAME"
        value = var.environment == "prod" ? "labs-asp-artifacts-prod" : "labs-asp-artifacts-dev"
      }

      # Mastra authentication
      env {
        name = "MASTRA_JWT_TOKEN"
        value_source {
          secret_key_ref {
            secret  = "mastra-jwt-token"
            version = "latest"
          }
        }
      }

      # Mastra server connection (server-side env var, not NEXT_PUBLIC_*)
      env {
        name  = "MASTRA_SERVER_URL"
        value = "http://${google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip}:4112"
      }

      # Keep NEXT_PUBLIC_ version for backwards compatibility
      env {
        name  = "NEXT_PUBLIC_MASTRA_SERVER_URL"
        value = "http://${google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip}:4112"
      }

      # Browser service connection (for direct client access if needed)
      env {
        name  = "PLAYWRIGHT_MCP_URL"
        value = "http://${google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip}:8931/mcp"
      }

      # Browser WebSocket Proxy URL (server-side runtime config)
      env {
        name  = "BROWSER_WS_PROXY_URL"
        value = google_cloud_run_v2_service.browser_ws_proxy.uri
      }

      # Legacy browser streaming env vars (keeping for backwards compatibility)
      env {
        name  = "BROWSER_STREAMING_URL"
        value = "ws://${google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip}:8933"
      }

      env {
        name  = "BROWSER_STREAMING_PORT"
        value = "8933"
      }

      env {
        name  = "BROWSER_STREAMING_HOST"
        value = google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip
      }

      # Runtime configuration
      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : "development"
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = local.project_id
      }

      env {
        name  = "CLOUD_SQL_INSTANCE"
        value = var.environment == "prod" ? "nava-labs:us-central1:app-prod" : "nava-labs:us-central1:app-dev"
      }

      # Port configuration - Next.js port
      ports {
        container_port = 3000
      }

      # Volume mount for Cloud SQL proxy
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

    }

    # Scaling configuration
    scaling {
      min_instance_count = var.chatbot_min_instances
      max_instance_count = var.chatbot_max_instances
    }

    # Standard timeout for web requests
    timeout = "${var.chatbot_timeout}s"

    # Cloud SQL connection for database access
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.environment == "prod" ? "nava-labs:us-central1:app-prod" : "nava-labs:us-central1:app-dev"]
      }
    }
  }

  # Traffic configuration
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  labels = merge(local.common_labels, {
    environment = var.environment
    component   = "chatbot-frontend"
  })

  depends_on = [
    google_project_service.required_apis,
    google_service_account.cloud_run,
    google_compute_instance.app_vm
  ]
}

# Browser WebSocket Proxy Service
resource "google_cloud_run_v2_service" "browser_ws_proxy" {
  name     = "browser-ws-proxy-${var.environment}"
  location = local.region

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = var.browser_ws_proxy_image_url

      # Lightweight proxy - minimal resources
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # Backend browser-streaming configuration
      env {
        name  = "BROWSER_STREAMING_HOST"
        value = google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip
      }

      env {
        name  = "BROWSER_STREAMING_PORT"
        value = "8933"
      }

      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : "development"
      }

      # Port configuration
      ports {
        container_port = 8080
      }
    }

    # Scaling configuration - can scale to zero when not in use
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    # Timeout for WebSocket connections
    timeout = "3600s" # 1 hour for long-lived WebSocket connections
  }

  # Traffic configuration
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  labels = merge(local.common_labels, {
    environment = var.environment
    component   = "browser-ws-proxy"
  })

  depends_on = [
    google_project_service.required_apis,
    google_service_account.cloud_run,
    google_compute_instance.app_vm
  ]
}

# IAM policies for public access
resource "google_cloud_run_v2_service_iam_member" "chatbot_public_access" {
  name     = google_cloud_run_v2_service.ai_chatbot.name
  location = google_cloud_run_v2_service.ai_chatbot.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "browser_ws_proxy_public_access" {
  name     = google_cloud_run_v2_service.browser_ws_proxy.name
  location = google_cloud_run_v2_service.browser_ws_proxy.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Service account for Cloud Run services
resource "google_service_account" "cloud_run" {
  account_id   = "cloud-run-${var.environment}"
  display_name = "Cloud Run Service Account (${var.environment})"
  description  = "Service account for Cloud Run services in ${var.environment} environment"

  # Force recreation to fix deleted service account issues
  lifecycle {
    create_before_destroy = true
  }
}

# IAM bindings for Cloud Run service account
resource "google_project_iam_member" "cloud_run_sql" {
  project = local.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"

  # Recreate when service account changes
  lifecycle {
    replace_triggered_by = [google_service_account.cloud_run]
  }
}

resource "google_project_iam_member" "cloud_run_storage" {
  project = local.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"

  # Recreate when service account changes
  lifecycle {
    replace_triggered_by = [google_service_account.cloud_run]
  }
}

resource "google_project_iam_member" "cloud_run_secrets" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"

  # Recreate when service account changes
  lifecycle {
    replace_triggered_by = [google_service_account.cloud_run]
  }
}

resource "google_project_iam_member" "cloud_run_logging" {
  project = local.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"

  # Recreate when service account changes
  lifecycle {
    replace_triggered_by = [google_service_account.cloud_run]
  }
}

resource "google_project_iam_member" "cloud_run_monitoring" {
  project = local.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"

  # Recreate when service account changes
  lifecycle {
    replace_triggered_by = [google_service_account.cloud_run]
  }
}
