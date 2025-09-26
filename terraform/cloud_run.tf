# Cloud Run service configuration for each environment

# Build and push Docker images before creating Cloud Run services
resource "null_resource" "build_docker_images" {
  # Trigger rebuild when Dockerfile or source code changes
  triggers = {
    dockerfile_mastra = filemd5("${path.root}/../Dockerfile")
    dockerfile_chatbot = filemd5("${path.root}/../Dockerfile.ai-chatbot")
    # Force rebuild for now by using timestamp
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.root}/..
      
      echo "Configuring Docker for gcloud..."
      gcloud auth configure-docker ${local.region}-docker.pkg.dev
      
      echo "Building and pushing mastra-app image..."
      docker build -t ${local.container_image_base_url}/mastra-app:latest -f Dockerfile .
      docker push ${local.container_image_base_url}/mastra-app:latest
      
      echo "Building and pushing ai-chatbot image..."
      docker build -t ${local.container_image_base_url}/ai-chatbot:latest -f Dockerfile.ai-chatbot .
      docker push ${local.container_image_base_url}/ai-chatbot:latest
      
      echo "Docker images built and pushed successfully!"
    EOT
  }

  depends_on = [google_artifact_registry_repository.labs_asp]
}

# Mastra App (Backend API) - one per environment
resource "google_cloud_run_v2_service" "app" {
  for_each = local.environments

  name     = each.value.cloud_run_service_name
  location = local.region

  template {
    service_account = google_service_account.cloud_run.email
    
    # Resource configuration optimized for Mastra backend
    containers {
      image = "us-central1-docker.pkg.dev/${local.project_id}/labs-asp/mastra-app:latest"
      
      # Resource limits for backend API
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
        name = "GOOGLE_GENERATIVE_AI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "google-generative-ai-key"
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
        name = "GROK_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "grok-api-key"
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

      # Vertex AI Configuration
      env {
        name  = "GOOGLE_VERTEX_LOCATION"
        value = "us-east5"
      }

      env {
        name  = "GOOGLE_VERTEX_PROJECT"
        value = local.project_id
      }

      env {
        name  = "GOOGLE_APPLICATION_CREDENTIALS"
        value = "/app/vertex-ai-credentials.json"
      }

      # Browser services connection (VM)
      env {
        name  = "PLAYWRIGHT_MCP_URL"
        value = "http://${google_compute_instance.browser_services[each.key].network_interface[0].access_config[0].nat_ip}:8931/mcp"
      }

      env {
        name  = "BROWSER_STREAMING_URL"
        value = "ws://${google_compute_instance.browser_services[each.key].network_interface[0].access_config[0].nat_ip}:8933"
      }

      # CORS configuration for multi-environment access
      env {
        name  = "CORS_ORIGINS"
        value = each.key == "prod" ? "https://${var.domain_name},https://www.${var.domain_name}" : "https://${each.value.domain_prefix}.${var.domain_name},http://localhost:4111,*"
      }

      # Port configuration
      ports {
        container_port = 4111
        name           = "http1"
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
  }

  # Traffic configuration - 100% to latest revision
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  labels = merge(local.common_labels, {
    environment = each.key
    service     = "mastra-app"
  })

  depends_on = [
    google_project_service.required_apis,
    google_service_account.cloud_run
  ]
}

# AI Chatbot (Next.js Frontend) - one per environment
resource "google_cloud_run_v2_service" "ai_chatbot" {
  for_each = local.environments

  name     = each.value.ai_chatbot_service_name
  location = local.region

  template {
    service_account = google_service_account.cloud_run.email
    
    # Resource configuration optimized for Next.js
    containers {
      image = "us-central1-docker.pkg.dev/${local.project_id}/labs-asp/ai-chatbot:latest"
      
      # Resource limits for Next.js frontend
      resources {
        limits = {
          cpu    = "1000m"  # 1 vCPU for frontend
          memory = "2Gi"    # 2GB RAM for Next.js
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
        name = "POSTGRES_URL"
        value_source {
          secret_key_ref {
            secret  = "postgres-url"
            version = "latest"
          }
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
        name = "GOOGLE_GENERATIVE_AI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "google-generative-ai-key"
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
        name = "XAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "xai-api-key"
            version = "latest"
          }
        }
      }

      # Next.js Configuration
      env {
        name  = "NODE_ENV"
        value = each.key == "prod" ? "production" : "development"
      }

      env {
        name  = "NEXT_TELEMETRY_DISABLED"
        value = "1"
      }

      env {
        name  = "NEXTAUTH_URL"
        value = each.key == "prod" ? "https://${var.domain_name}" : "https://${each.value.domain_prefix}.${var.domain_name}"
      }

      # Google Cloud Configuration
      env {
        name  = "GOOGLE_VERTEX_LOCATION"
        value = "us-east5"
      }

      env {
        name  = "GOOGLE_VERTEX_PROJECT"
        value = local.project_id
      }

      env {
        name  = "GOOGLE_APPLICATION_CREDENTIALS"
        value = "/app/vertex-ai-credentials.json"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = local.project_id
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.artifacts[each.key].name
      }

      # Mastra Backend Integration
      env {
        name  = "MASTRA_API_URL"
        value = google_cloud_run_v2_service.app[each.key].uri
      }

      env {
        name  = "MASTRA_SERVER_URL"
        value = google_cloud_run_v2_service.app[each.key].uri
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

      # Browser streaming (VM connection)
      env {
        name  = "BROWSER_STREAMING_HOST"
        value = google_compute_instance.browser_services[each.key].network_interface[0].access_config[0].nat_ip
      }

      env {
        name  = "BROWSER_STREAMING_PORT"
        value = "8933"
      }

      # Port configuration
      ports {
        container_port = 3000
        name           = "http1"
      }

      # Startup and liveness probes
      startup_probe {
        http_get {
          path = "/api/health"
          port = 3000
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/api/health"
          port = 3000
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

    # Standard timeout for web requests
    timeout = "300s"
  }

  # Traffic configuration - 100% to latest revision
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  labels = merge(local.common_labels, {
    environment = each.key
    service     = "ai-chatbot"
  })

  depends_on = [
    google_project_service.required_apis,
    google_service_account.cloud_run,
    google_cloud_run_v2_service.app,
    null_resource.build_docker_images
  ]
}

# IAM policy to allow public access (adjust as needed for production)
resource "google_cloud_run_v2_service_iam_member" "app_public_access" {
  for_each = local.environments

  name     = google_cloud_run_v2_service.app[each.key].name
  location = google_cloud_run_v2_service.app[each.key].location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "ai_chatbot_public_access" {
  for_each = local.environments

  name     = google_cloud_run_v2_service.ai_chatbot[each.key].name
  location = google_cloud_run_v2_service.ai_chatbot[each.key].location
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

  depends_on = [
    google_project_service.required_apis,
    null_resource.build_docker_images
  ]
}

# Outputs for Cloud Run services
output "cloud_run_urls" {
  description = "URLs for accessing the Cloud Run services"
  value = {
    for env in keys(local.environments) :
    env => {
      mastra_app = try(google_cloud_run_v2_service.app[env].uri, null)
      ai_chatbot = try(google_cloud_run_v2_service.ai_chatbot[env].uri, null)
    }
  }
}

output "cloud_run_service_names" {
  description = "Names of the Cloud Run services"
  value = {
    for env in keys(local.environments) :
    env => {
      mastra_app = try(google_cloud_run_v2_service.app[env].name, null)
      ai_chatbot = try(google_cloud_run_v2_service.ai_chatbot[env].name, null)
    }
  }
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository for container images"
  value = google_artifact_registry_repository.labs_asp.name
}

output "container_image_base_url" {
  description = "Base URL for container images in Artifact Registry"
  value = "${local.region}-docker.pkg.dev/${local.project_id}/${google_artifact_registry_repository.labs_asp.repository_id}"
}
