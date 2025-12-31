# Cloud Run Services
# Note: mastra-app now runs on VM, only ai-chatbot frontend runs on Cloud Run

# AI Chatbot Service - Next.js Frontend
resource "google_cloud_run_v2_service" "ai_chatbot" {
  name     = local.env_config.chatbot_service_name
  location = local.region

  # Disable deletion protection for preview environments to allow easy cleanup
  deletion_protection = startswith(var.environment, "preview-") ? false : true

  template {
    service_account = google_service_account.cloud_run.email

    # VPC Access - Connect to VPC network
    vpc_access {
      connector = local.vpc_connector.id
      egress    = "PRIVATE_RANGES_ONLY"  # Only use VPC for private ranges
    }

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
      # - dev: uses private IP within dev VPC
      # - preview: uses PSC endpoint to reach dev DB from preview VPC
      # - prod: uses private IP within prod VPC
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.environment == "prod" ? "database-url-production" : (startswith(var.environment, "preview") ? "database-url-preview" : "database-url-dev")
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

      # Apricot API Configuration
      env {
        name = "APRICOT_API_BASE_URL"
        value = "https://f5r-api.iws.sidekick.solutions/apricot"
      }

      env {
        name = "APRICOT_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = "apricot-client-id"
            version = "latest"
          }
        }
      }

      env {
        name = "APRICOT_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "apricot-client-secret"
            version = "latest"
          }
        }
      }

      # PostHog Analytics
      env {
        name = "NEXT_PUBLIC_POSTHOG_KEY"
        value_source {
          secret_key_ref {
            secret  = "posthog-api-key"
            version = "latest"
          }
        }
      }

      env {
        name  = "NEXT_PUBLIC_POSTHOG_HOST"
        value = "https://us.i.posthog.com"
      }

      # Next.js Auth configuration
      # Preview envs: NEXTAUTH_URL not set, code falls back to x-forwarded-host header
      dynamic "env" {
        for_each = startswith(var.environment, "preview-") ? [] : [1]
        content {
          name  = "NEXTAUTH_URL"
          value = var.environment == "prod" ? "https://${var.domain_name}" : "https://${local.env_config.domain_prefix}.${var.domain_name}"
        }
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

      # Google OAuth configuration
      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = "google-oauth-client-id"
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "google-oauth-client-secret"
            version = "latest"
          }
        }
      }

      # Microsoft Entra ID OAuth configuration
      env {
        name = "AUTH_MICROSOFT_ENTRA_ID_ID"
        value_source {
          secret_key_ref {
            secret  = "microsoft-entra-id-client-id"
            version = "latest"
          }
        }
      }

      env {
        name = "AUTH_MICROSOFT_ENTRA_ID_SECRET"
        value_source {
          secret_key_ref {
            secret  = "microsoft-entra-id-client-secret"
            version = "latest"
          }
        }
      }

      env {
        name = "AUTH_MICROSOFT_ENTRA_ID_ISSUER"
        value_source {
          secret_key_ref {
            secret  = "microsoft-entra-id-issuer"
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

      # Upstash Redis for shared links
      env {
        name = "UPSTASH_REDIS_REST_URL"
        value_source {
          secret_key_ref {
            secret  = var.environment == "prod" ? "upstash-redis-rest-url-prod" : "upstash-redis-rest-url-dev"
            version = "latest"
          }
        }
      }

      env {
        name = "UPSTASH_REDIS_REST_TOKEN"
        value_source {
          secret_key_ref {
            secret  = var.environment == "prod" ? "upstash-redis-rest-token-prod" : "upstash-redis-rest-token-dev"
            version = "latest"
          }
        }
      }

      # Cloudflare Verified Bots - Ed25519 private key for signing key directory
      env {
        name = "CLOUDFLARE_BOT_PRIVATE_KEY"
        value_source {
          secret_key_ref {
            secret  = "cloudflare-bot-private-key"
            version = "latest"
          }
        }
      }

      # Mastra server connection (server-side env var, not NEXT_PUBLIC_*)
      # Uses internal IP - VM is in private subnet, accessible via VPC Connector
      env {
        name  = "MASTRA_SERVER_URL"
        value = "http://${google_compute_instance.app_vm.network_interface[0].network_ip}:4112"
      }

      # Keep NEXT_PUBLIC_ version for backwards compatibility
      env {
        name  = "NEXT_PUBLIC_MASTRA_SERVER_URL"
        value = "http://${google_compute_instance.app_vm.network_interface[0].network_ip}:4112"
      }

      # Browser service connection (for direct client access if needed)
      env {
        name  = "PLAYWRIGHT_MCP_URL"
        value = "http://${google_compute_instance.app_vm.network_interface[0].network_ip}:8931/mcp"
      }

      # Browser WebSocket Proxy URL (server-side runtime config)
      env {
        name  = "BROWSER_WS_PROXY_URL"
        value = google_cloud_run_v2_service.browser_ws_proxy.uri
      }

      # Legacy browser streaming env vars (keeping for backwards compatibility)
      env {
        name  = "BROWSER_STREAMING_URL"
        value = "ws://${google_compute_instance.app_vm.network_interface[0].network_ip}:8933"
      }

      env {
        name  = "BROWSER_STREAMING_PORT"
        value = "8933"
      }

      env {
        name  = "BROWSER_STREAMING_HOST"
        value = google_compute_instance.app_vm.network_interface[0].network_ip
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
        value = var.environment == "prod" ? "nava-labs:us-central1:nava-db-prod" : "nava-labs:us-central1:nava-db-dev"
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
        instances = [var.environment == "prod" ? "nava-labs:us-central1:nava-db-prod" : "nava-labs:us-central1:nava-db-dev"]
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
    google_compute_instance.app_vm,
    google_vpc_access_connector.cloud_run,
    # Wait for database URL secrets to be created before starting Cloud Run
    # This ensures the DATABASE_URL env var can be resolved on startup
    google_secret_manager_secret_version.database_url_dev,
    google_secret_manager_secret_version.database_url_preview,
    google_secret_manager_secret_version.database_url_prod
  ]
}

# Browser WebSocket Proxy Service
resource "google_cloud_run_v2_service" "browser_ws_proxy" {
  name     = "browser-ws-proxy-${var.environment}"
  location = local.region

  # Disable deletion protection for preview environments to allow easy cleanup
  deletion_protection = startswith(var.environment, "preview-") ? false : true

  template {
    service_account = google_service_account.cloud_run.email

    # VPC Access - Connect to VPC network
    vpc_access {
      connector = local.vpc_connector.id
      egress    = "PRIVATE_RANGES_ONLY"  # Only use VPC for private ranges
    }

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
        value = google_compute_instance.app_vm.network_interface[0].network_ip
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
    google_compute_instance.app_vm,
    google_vpc_access_connector.cloud_run
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
