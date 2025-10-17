# Secret data sources for VM startup script
data "google_secret_manager_secret_version" "database_url" {
  secret = var.environment == "prod" ? "database-url-production" : "database-url-dev"
}

data "google_secret_manager_secret_version" "openai_api_key" {
  secret = "openai-api-key"
}

data "google_secret_manager_secret_version" "anthropic_api_key" {
  secret = "anthropic-api-key"
}

data "google_secret_manager_secret_version" "exa_api_key" {
  secret = "exa-api-key"
}

data "google_secret_manager_secret_version" "google_ai_key" {
  secret = "google-generative-ai-key"
}

data "google_secret_manager_secret_version" "grok_api_key" {
  secret = "grok-api-key"
}

data "google_secret_manager_secret_version" "xai_api_key" {
  secret = "xai-api-key"
}

data "google_secret_manager_secret_version" "mastra_jwt_secret" {
  secret = "mastra-jwt-secret"
}

data "google_secret_manager_secret_version" "mastra_app_password" {
  secret = "mastra-app-password"
}

data "google_secret_manager_secret_version" "mastra_jwt_token" {
  secret = "mastra-jwt-token"
}

# Compute VM - Runs browser-streaming and mastra-app containers
resource "google_compute_instance" "app_vm" {
  name         = "app-vm-${var.environment}"
  machine_type = var.vm_machine_type
  zone         = local.zone

  # Container-Optimized OS for running Docker containers
  boot_disk {
    initialize_params {
      image = "cos-cloud/cos-stable"
      size  = var.vm_disk_size
      type  = "pd-standard"
    }
  }

  # Network configuration
  network_interface {
    network = "default"
    access_config {
      # Ephemeral external IP
    }
  }

  # Service account for VM
  service_account {
    email  = google_service_account.vm.email
    scopes = ["cloud-platform"]
  }

  # Startup script to run both containers
  # IMPORTANT: Image version metadata triggers VM restart when images change
  metadata = {
    browser-image-version = var.browser_image_url
    mastra-image-version  = var.mastra_image_url
    startup-script = templatefile("${path.module}/scripts/startup.sh", {
      browser_image       = var.browser_image_url
      mastra_image        = var.mastra_image_url
      project_id          = local.project_id
      environment         = var.environment
      database_url        = data.google_secret_manager_secret_version.database_url.secret_data
      openai_api_key      = data.google_secret_manager_secret_version.openai_api_key.secret_data
      anthropic_api_key   = data.google_secret_manager_secret_version.anthropic_api_key.secret_data
      exa_api_key         = data.google_secret_manager_secret_version.exa_api_key.secret_data
      google_ai_key       = data.google_secret_manager_secret_version.google_ai_key.secret_data
      grok_api_key        = data.google_secret_manager_secret_version.grok_api_key.secret_data
      xai_api_key         = data.google_secret_manager_secret_version.xai_api_key.secret_data
      mastra_jwt_secret   = data.google_secret_manager_secret_version.mastra_jwt_secret.secret_data
      mastra_app_password = data.google_secret_manager_secret_version.mastra_app_password.secret_data
      mastra_jwt_token    = data.google_secret_manager_secret_version.mastra_jwt_token.secret_data
    })
  }

  # Allow HTTP traffic for MCP, WebSocket, and Mastra API
  tags = ["http-server", "https-server", "browser-mcp", "browser-streaming", "mastra-app"]

  labels = merge(local.common_labels, {
    environment = var.environment
    component   = "app-vm"
  })

  depends_on = [
    google_project_service.required_apis,
    google_service_account.vm
  ]
}

# Firewall rules for browser service
resource "google_compute_firewall" "browser_mcp" {
  name    = "allow-browser-mcp-${var.environment}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["8931"]  # Playwright MCP port
  }

  source_ranges = ["0.0.0.0/0"]  # Allow from anywhere (Cloud Run uses dynamic IPs)

  target_tags = ["browser-mcp"]

  description = "Allow MCP access from Cloud Run services to browser VM (dev uses external IP)"
}

resource "google_compute_firewall" "browser_streaming" {
  name    = "allow-browser-streaming-${var.environment}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["8933"]  # Browser streaming WebSocket port
  }

  source_ranges = ["0.0.0.0/0"]  # Allow from anywhere

  target_tags = ["browser-streaming"]

  description = "Allow browser streaming WebSocket access"
}

resource "google_compute_firewall" "mastra_app" {
  name    = "allow-mastra-app-${var.environment}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["4112"]  # Mastra API port
  }

  source_ranges = ["0.0.0.0/0"]  # Allow from anywhere (Cloud Run uses dynamic IPs)

  target_tags = ["mastra-app"]

  description = "Allow Mastra API access from Cloud Run"
}

# Service account for VM
resource "google_service_account" "vm" {
  account_id   = "app-vm-${var.environment}"
  display_name = "App VM Service Account (${var.environment})"
  description  = "Service account for application VM in ${var.environment} environment"
}

# IAM bindings for VM service account
resource "google_project_iam_member" "vm_storage" {
  project = local.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.vm.email}"
}

resource "google_project_iam_member" "vm_logging" {
  project = local.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.vm.email}"
}

resource "google_project_iam_member" "vm_monitoring" {
  project = local.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.vm.email}"
}

resource "google_project_iam_member" "vm_artifact_registry" {
  project = local.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.vm.email}"
}

resource "google_project_iam_member" "vm_secret_accessor" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.vm.email}"
}

resource "google_project_iam_member" "vm_vertex_ai_user" {
  project = local.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.vm.email}"
}