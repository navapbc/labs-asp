# Firewall rule for browser services VMs
resource "google_compute_firewall" "allow_browser_services" {
  name    = "allow-browser-services"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["8931", "8933"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["browser-services"]

  description = "Allow access to browser services (MCP: 8931, Browser Streaming: 8933)"
}

# Browser services VM instances (one per environment)
resource "google_compute_instance" "browser_services" {
  for_each = local.environments

  name         = each.value.vm_name
  machine_type = var.machine_type
  zone         = var.zone

  tags = ["browser-services"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = var.disk_size
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
  metadata_startup_script = templatefile("${path.module}/browser-services-startup.sh", {
    github_repo   = var.github_repository
    github_branch = var.github_branch
    environment   = each.key
  })

  service_account {
    # Use existing service account with required permissions
    email = "labs-asp-cloud-run@nava-labs.iam.gserviceaccount.com"
    scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }

  labels = merge(local.common_labels, {
    service     = "browser-services"
    environment = each.key
  })

  # Allow stopping for maintenance
  allow_stopping_for_update = true
}

# Outputs for each environment
output "browser_services_external_ips" {
  description = "External IP addresses of the browser services VMs"
  value = {
    for env, instance in google_compute_instance.browser_services :
    env => instance.network_interface[0].access_config[0].nat_ip
  }
}

output "browser_services_internal_ips" {
  description = "Internal IP addresses of the browser services VMs"
  value = {
    for env, instance in google_compute_instance.browser_services :
    env => instance.network_interface[0].network_ip
  }
}

output "browser_services_ssh_commands" {
  description = "SSH commands to connect to the browser services VMs"
  value = {
    for env, instance in google_compute_instance.browser_services :
    env => "gcloud compute ssh ${instance.name} --zone=${var.zone}"
  }
}

output "playwright_mcp_urls" {
  description = "URLs for accessing the Playwright MCP servers"
  value = {
    for env, instance in google_compute_instance.browser_services :
    env => "http://${instance.network_interface[0].access_config[0].nat_ip}:8931"
  }
}

output "browser_streaming_urls" {
  description = "URLs for accessing the browser streaming WebSocket servers"
  value = {
    for env, instance in google_compute_instance.browser_services :
    env => "ws://${instance.network_interface[0].access_config[0].nat_ip}:8933"
  }
}
