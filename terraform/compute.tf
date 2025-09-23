# VM Configuration for both Playground and Client environments
# This file contains compute resources using a unified approach

# Local configuration for different VM types
locals {
  vms = {
    playground = {
      name           = "playground"
      ports          = ["4111"]
      startup_script = "startup-script.sh"
      service        = "playground"
      description    = "Allow playground access"
    }
    client = {
      name           = "client"
      ports          = ["3000", "8933"]
      startup_script = "startup-script-client.sh"
      service        = "client"
      description    = "Allow client access"
    }
  }
}

# Firewall rules for each VM type
resource "google_compute_firewall" "allow_vm" {
  for_each = local.vms

  name    = "allow-${each.key}"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = each.value.ports
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = [each.key]

  description = each.value.description
}

# VM instances for each type
resource "google_compute_instance" "vm" {
  for_each = local.vms

  name         = each.value.name
  machine_type = var.playground_machine_type
  zone         = var.playground_zone

  tags = [each.key]

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
  metadata_startup_script = templatefile("${path.module}/${each.value.startup_script}", {
    github_repo = var.github_repository
  })

  service_account {
    # Use the labs-asp-cloud-run service account which has Secret Manager and Storage access
    email = "labs-asp-cloud-run@nava-labs.iam.gserviceaccount.com"
    scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }

  labels = {
    environment = "development"
    project     = "labs-asp"
    service     = each.value.service
  }

  # Allow stopping for maintenance
  allow_stopping_for_update = true
}

# Outputs for each VM
output "playground_external_ip" {
  description = "External IP address of the playground VM"
  value       = try(google_compute_instance.vm["playground"].network_interface[0].access_config[0].nat_ip, null)
}

output "playground_internal_ip" {
  description = "Internal IP address of the playground VM"
  value       = try(google_compute_instance.vm["playground"].network_interface[0].network_ip, null)
}

output "playground_ssh_command" {
  description = "SSH command to connect to the playground VM"
  value       = try("gcloud compute ssh ${google_compute_instance.vm["playground"].name} --zone=${var.playground_zone}", null)
}

output "playground_url" {
  description = "URL for accessing the playground"
  value       = try("http://${google_compute_instance.vm["playground"].network_interface[0].access_config[0].nat_ip}:4111", null)
}

output "client_external_ip" {
  description = "External IP address of the client VM"
  value       = try(google_compute_instance.vm["client"].network_interface[0].access_config[0].nat_ip, null)
}

output "client_internal_ip" {
  description = "Internal IP address of the client VM"
  value       = try(google_compute_instance.vm["client"].network_interface[0].network_ip, null)
}

output "client_ssh_command" {
  description = "SSH command to connect to the client VM"
  value       = try("gcloud compute ssh ${google_compute_instance.vm["client"].name} --zone=${var.playground_zone}", null)
}

output "client_url" {
  description = "URL for accessing the client"
  value       = try("http://${google_compute_instance.vm["client"].network_interface[0].access_config[0].nat_ip}:3000", null)
}
