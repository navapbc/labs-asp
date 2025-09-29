# Browser Service VM - Dedicated instance for Playwright automation
resource "google_compute_instance" "browser_service" {
  name         = "browser-streaming-${var.environment}"
  machine_type = var.browser_vm_machine_type
  zone         = local.zone

  # Container-Optimized OS for running Docker containers
  boot_disk {
    initialize_params {
      image = "cos-cloud/cos-stable"
      size  = var.browser_vm_disk_size
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
    email  = google_service_account.browser_vm.email
    scopes = ["cloud-platform"]
  }

  # Startup script to run browser-streaming container
  metadata = {
    startup-script = templatefile("${path.module}/scripts/browser_startup.sh", {
      browser_image = var.browser_image_url
      project_id    = local.project_id
      environment   = var.environment
    })
  }

  # Allow HTTP traffic for MCP and WebSocket
  tags = ["http-server", "https-server", "browser-mcp", "browser-streaming"]

  labels = merge(local.common_labels, {
    environment = var.environment
    component   = "browser-service"
  })

  depends_on = [
    google_project_service.required_apis,
    google_service_account.browser_vm
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

  source_ranges = [
    "10.0.0.0/8",     # Internal GCP ranges
    "172.16.0.0/12",  # Internal ranges
    "192.168.0.0/16"  # Internal ranges
  ]

  target_tags = ["browser-mcp"]

  description = "Allow MCP access from Cloud Run services to browser VM"
}

resource "google_compute_firewall" "browser_streaming" {
  name    = "allow-browser-streaming-${var.environment}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["8933"]  # Browser streaming WebSocket port
  }

  source_ranges = [
    "10.0.0.0/8",     # Internal GCP ranges
    "172.16.0.0/12",  # Internal ranges
    "192.168.0.0/16"  # Internal ranges
  ]

  target_tags = ["browser-streaming"]

  description = "Allow browser streaming WebSocket access from Cloud Run services"
}

# Service account for browser VM
resource "google_service_account" "browser_vm" {
  account_id   = "browser-vm-${var.environment}"
  display_name = "Browser VM Service Account (${var.environment})"
  description  = "Service account for browser automation VM in ${var.environment} environment"
}

# IAM binding for browser VM service account
resource "google_project_iam_member" "browser_vm_storage" {
  project = local.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.browser_vm.email}"
}

resource "google_project_iam_member" "browser_vm_logging" {
  project = local.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.browser_vm.email}"
}

resource "google_project_iam_member" "browser_vm_monitoring" {
  project = local.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.browser_vm.email}"
}