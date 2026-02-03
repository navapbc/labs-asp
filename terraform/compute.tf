# Secret data sources for VM startup script
# - dev: uses private IP within dev VPC
# - preview: uses PSC endpoint to reach dev DB from preview VPC
# - prod: uses private IP within prod VPC

# Data source ONLY for preview (secret created by dev deployment, already exists)
data "google_secret_manager_secret_version" "database_url_for_preview" {
  count  = startswith(var.environment, "preview") ? 1 : 0
  secret = "database-url-preview"
}

# Local to pick the right database URL based on environment
locals {
  database_url_secret_data = (
    var.environment == "prod"
    ? google_secret_manager_secret_version.database_url_prod[0].secret_data
    : (startswith(var.environment, "preview")
      ? data.google_secret_manager_secret_version.database_url_for_preview[0].secret_data
      : google_secret_manager_secret_version.database_url_dev[0].secret_data
    )
  )

  # Apricot credentials - prod uses /api/ endpoint, all others use /sandbox/
  apricot_client_id = (
    var.environment == "prod"
    ? data.google_secret_manager_secret_version.apricot_client_id_prod.secret_data
    : data.google_secret_manager_secret_version.apricot_client_id_sandbox.secret_data
  )
  apricot_client_secret = (
    var.environment == "prod"
    ? data.google_secret_manager_secret_version.apricot_client_secret_prod.secret_data
    : data.google_secret_manager_secret_version.apricot_client_secret_sandbox.secret_data
  )
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

data "google_secret_manager_secret_version" "vertex_ai_credentials" {
  secret = "vertex-ai-credentials"
}

data "google_secret_manager_secret_version" "apricot_api_base_url" {
  secret = "apricot-api-base-url"
}

# Apricot credentials - prod and sandbox require separate credentials
data "google_secret_manager_secret_version" "apricot_client_id_prod" {
  secret = "apricot-client-id-prod"
}

data "google_secret_manager_secret_version" "apricot_client_secret_prod" {
  secret = "apricot-client-secret-prod"
}

data "google_secret_manager_secret_version" "apricot_client_id_sandbox" {
  secret = "apricot-client-id-sandbox"
}

data "google_secret_manager_secret_version" "apricot_client_secret_sandbox" {
  secret = "apricot-client-secret-sandbox"
}

# Note: VM uses private subnet without external IP
# Internet access is provided via Cloud NAT
# If external IP is needed for API whitelisting, consider using Cloud NAT's external IPs

# Compute VM - Runs browser-streaming and mastra-app containers
resource "google_compute_instance" "app_vm" {
  name         = "app-vm-${var.environment}"
  machine_type = var.vm_machine_type
  zone         = local.zone

  # Allow Terraform to stop the VM for updates (e.g., network changes)
  allow_stopping_for_update = true

  # Container-Optimized OS for running Docker containers
  boot_disk {
    initialize_params {
      image = "cos-cloud/cos-stable"
      size  = var.vm_disk_size
      type  = "pd-standard"
    }
  }

  # Network configuration - Use private subnet without external IP
  # Internet access via Cloud NAT (configured in vpc.tf)
  network_interface {
    network    = local.vpc_network.id
    subnetwork = local.private_subnet.id
    # No access_config - VM uses Cloud NAT for outbound internet access
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
      browser_image           = var.browser_image_url
      mastra_image            = var.mastra_image_url
      project_id              = local.project_id
      environment             = var.environment
      database_url            = local.database_url_secret_data
      openai_api_key          = data.google_secret_manager_secret_version.openai_api_key.secret_data
      anthropic_api_key       = data.google_secret_manager_secret_version.anthropic_api_key.secret_data
      exa_api_key             = data.google_secret_manager_secret_version.exa_api_key.secret_data
      google_ai_key           = data.google_secret_manager_secret_version.google_ai_key.secret_data
      grok_api_key            = data.google_secret_manager_secret_version.grok_api_key.secret_data
      xai_api_key             = data.google_secret_manager_secret_version.xai_api_key.secret_data
      mastra_jwt_secret       = data.google_secret_manager_secret_version.mastra_jwt_secret.secret_data
      mastra_app_password     = data.google_secret_manager_secret_version.mastra_app_password.secret_data
      mastra_jwt_token        = data.google_secret_manager_secret_version.mastra_jwt_token.secret_data
      vertex_ai_credentials   = data.google_secret_manager_secret_version.vertex_ai_credentials.secret_data
      apricot_api_base_url    = data.google_secret_manager_secret_version.apricot_api_base_url.secret_data
      apricot_client_id       = local.apricot_client_id
      apricot_client_secret   = local.apricot_client_secret
    })
  }

  # Allow HTTP traffic for MCP, WebSocket, and Mastra API
  tags = ["http-server", "https-server", "browser-mcp", "browser-streaming", "mastra-app"]

  labels = merge(local.common_labels, {
    environment = var.environment
    component   = "app-vm"
  })

  # Recreate VM when container images change
  lifecycle {
    replace_triggered_by = [terraform_data.image_versions]
  }

  depends_on = [
    google_project_service.required_apis,
    google_service_account.vm,
    google_compute_network.main,
    google_compute_subnetwork.private,
    google_compute_router_nat.main  # Ensure NAT is ready for internet access
  ]
}

# Track image versions to trigger VM restart when they change
resource "terraform_data" "image_versions" {
  input = {
    browser_image = var.browser_image_url
    mastra_image  = var.mastra_image_url
  }
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