# Playground VM Configuration
# This file contains the compute resources for the playground environment

# Firewall rule for playground (public)
resource "google_compute_firewall" "allow_playground" {
  name    = "allow-playground"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["4111"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["playground"]

  description = "Allow playground access"
}

# Playground VM
resource "google_compute_instance" "playground" {
  name         = "playground"
  machine_type = var.playground_machine_type
  zone         = var.playground_zone

  tags = ["playground"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = var.playground_disk_size
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {
      # Ephemeral public IP
    }
  }

  # Startup script with variable substitution
  metadata_startup_script = templatefile("${path.module}/startup-script.sh", {
    github_repo = var.github_repository
  })

  service_account {
    # Use the development environment service account which has Secret Manager and SQL access
    email = google_service_account.development.email
    scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }

  labels = {
    environment = "development"
    project     = "labs-asp"
    service     = "playground"
  }

  # Allow stopping for maintenance
  allow_stopping_for_update = true
}

# Output the external IP
output "playground_external_ip" {
  description = "External IP address of the playground VM"
  value       = google_compute_instance.playground.network_interface[0].access_config[0].nat_ip
}

output "playground_internal_ip" {
  description = "Internal IP address of the playground VM"
  value       = google_compute_instance.playground.network_interface[0].network_ip
}

output "playground_ssh_command" {
  description = "SSH command to connect to the playground VM"
  value       = "gcloud compute ssh ${google_compute_instance.playground.name} --zone=${var.playground_zone}"
}

output "playground_url" {
  description = "URL for accessing the playground"
  value       = "http://${google_compute_instance.playground.network_interface[0].access_config[0].nat_ip}:4111"
}
