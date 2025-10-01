# Mastra Application Service - AI Agent Backend
resource "google_cloud_run_v2_service" "mastra_app" {
  name     = local.environments[var.environment].mastra_service_name
  location = local.region

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = var.mastra_image_url

      # Resource configuration for AI agent processing
      resources {
        limits = {
          cpu    = var.mastra_cpu
          memory = var.mastra_memory
        }
      }

      # Database configuration
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.environment == "prod" ? "database-url-production" : "database-url-${var.environment}"
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
        name = "GROK_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "grok-api-key"
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

      # Mastra authentication
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

      env {
        name = "MASTRA_JWT_TOKEN"
        value_source {
          secret_key_ref {
            secret  = "mastra-jwt-token"
            version = "latest"
          }
        }
      }

      # Google Cloud configuration
      env {
        name = "GOOGLE_VERTEX_CREDENTIALS"
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

      # Browser service connection
      env {
        name  = "PLAYWRIGHT_MCP_URL"
        value = "http://${google_compute_instance.browser_service.network_interface[0].network_ip}:8931/mcp"
      }

      env {
        name  = "BROWSER_STREAMING_URL"
        value = "ws://${google_compute_instance.browser_service.network_interface[0].network_ip}:8933"
      }

      # CORS configuration for Mastra
      env {
        name  = "CORS_ORIGINS"
        value = var.environment == "prod" ? "https://${var.domain_name}" : "*"
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
        value = "nava-labs:us-central1:app-${var.environment}"
      }

      # Port configuration - Mastra server port
      ports {
        container_port = 4112
      }

      # Volume mount for Cloud SQL proxy
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

    }

    # Scaling configuration
    scaling {
      min_instance_count = var.mastra_min_instances
      max_instance_count = var.mastra_max_instances
    }

    # Extended timeout for web automation tasks
    timeout = "${var.mastra_timeout}s"

    # Cloud SQL connection for database access
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = ["nava-labs:us-central1:app-${var.environment}"]
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
    component   = "mastra-backend"
  })

  depends_on = [
    google_project_service.required_apis,
    google_service_account.cloud_run,
    google_compute_instance.browser_service
  ]
}

# AI Chatbot Service - Next.js Frontend
resource "google_cloud_run_v2_service" "ai_chatbot" {
  name     = local.environments[var.environment].chatbot_service_name
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
            secret  = var.environment == "prod" ? "database-url-production" : "database-url-${var.environment}"
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
        value = var.environment == "prod" ? "https://${var.domain_name}" : "https://${local.environments[var.environment].domain_prefix}.${var.domain_name}"
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
        value = "labs-asp-artifacts-${var.environment}"
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

      # Mastra server connection
      env {
        name  = "NEXT_PUBLIC_MASTRA_SERVER_URL"
        value = google_cloud_run_v2_service.mastra_app.uri
      }

      # Browser service connection (for direct client access if needed)
      env {
        name  = "PLAYWRIGHT_MCP_URL"
        value = "http://${google_compute_instance.browser_service.network_interface[0].network_ip}:8931/mcp"
      }

      env {
        name  = "BROWSER_STREAMING_URL"
        value = "ws://${google_compute_instance.browser_service.network_interface[0].network_ip}:8933"
      }

      env {
        name  = "BROWSER_STREAMING_PORT"
        value = "8933"
      }

      env {
        name  = "BROWSER_STREAMING_HOST"
        value = google_compute_instance.browser_service.network_interface[0].network_ip
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
        value = "nava-labs:us-central1:app-${var.environment}"
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
        instances = ["nava-labs:us-central1:app-${var.environment}"]
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
    google_cloud_run_v2_service.mastra_app
  ]
}

# IAM policies for public access
resource "google_cloud_run_v2_service_iam_member" "mastra_public_access" {
  name     = google_cloud_run_v2_service.mastra_app.name
  location = google_cloud_run_v2_service.mastra_app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "chatbot_public_access" {
  name     = google_cloud_run_v2_service.ai_chatbot.name
  location = google_cloud_run_v2_service.ai_chatbot.location
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
