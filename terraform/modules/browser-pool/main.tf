terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Service account for browser instances
resource "google_service_account" "browser_pool_sa" {
  account_id   = "${var.environment}-browser-pool-sa"
  display_name = "Browser Pool Service Account for ${var.environment}"
}

# IAM roles for the service account
resource "google_project_iam_member" "browser_pool_sa_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.browser_pool_sa.email}"
}

# Instance template for browser pool
resource "google_compute_instance_template" "browser_pool_template" {
  name_prefix  = "${var.environment}-browser-pool-"
  machine_type = var.machine_type
  
  disk {
    source_image = "cos-cloud/cos-stable"
    auto_delete  = true
    boot         = true
    disk_size_gb = var.disk_size
    disk_type    = "pd-ssd"
  }
  
  network_interface {
    network    = var.network_name
    subnetwork = var.subnet_name
    # No external IP - internal only
  }
  
  # Startup script to run Docker MCP Gateway
  metadata = {
    startup-script = templatefile("${path.module}/startup-script.sh", {
      project_id        = var.project_id
      environment       = var.environment
      container_image   = var.container_image
      mcp_gateway_image = var.mcp_gateway_image
    })
    
    # Enable OS Login
    enable-oslogin = "TRUE"
  }
  
  service_account {
    email  = google_service_account.browser_pool_sa.email
    scopes = ["cloud-platform"]
  }
  
  # Labels
  labels = merge(var.labels, {
    component = "browser-pool"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# Health check for browser pool
resource "google_compute_health_check" "browser_pool_health" {
  name = "${var.environment}-browser-pool-health"
  
  http_health_check {
    port         = 8811
    request_path = "/health"
  }
  
  check_interval_sec  = 30
  timeout_sec         = 10
  healthy_threshold   = 2
  unhealthy_threshold = 3
}

# Instance group manager for browser pool
resource "google_compute_instance_group_manager" "browser_pool_igm" {
  name               = "${var.environment}-browser-pool-igm"
  base_instance_name = "${var.environment}-browser-pool"
  zone               = var.zone
  target_size        = var.instance_count
  
  version {
    instance_template = google_compute_instance_template.browser_pool_template.id
  }
  
  auto_healing_policies {
    health_check      = google_compute_health_check.browser_pool_health.id
    initial_delay_sec = 300
  }
  
  # Update policy for rolling updates
  update_policy {
    type                         = "PROACTIVE"
    instance_redistribution_type = "PROACTIVE"
    minimal_action               = "REPLACE"
    max_surge_fixed              = 1
    max_unavailable_fixed        = 1
  }
}

# Internal load balancer for browser pool
resource "google_compute_region_backend_service" "browser_pool_backend" {
  name                  = "${var.environment}-browser-pool-backend"
  region                = var.region
  protocol              = "HTTP"
  timeout_sec           = 300
  load_balancing_scheme = "INTERNAL_MANAGED"
  
  backend {
    group           = google_compute_instance_group_manager.browser_pool_igm.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }
  
  health_checks = [google_compute_health_check.browser_pool_health.id]
}

# URL map for internal load balancer
resource "google_compute_region_url_map" "browser_pool_url_map" {
  name            = "${var.environment}-browser-pool-url-map"
  region          = var.region
  default_service = google_compute_region_backend_service.browser_pool_backend.id
}

# Target HTTP proxy for internal load balancer
resource "google_compute_region_target_http_proxy" "browser_pool_proxy" {
  name    = "${var.environment}-browser-pool-proxy"
  region  = var.region
  url_map = google_compute_region_url_map.browser_pool_url_map.id
}

# Forwarding rule for internal load balancer
resource "google_compute_forwarding_rule" "browser_pool_forwarding_rule" {
  name                  = "${var.environment}-browser-pool-lb"
  region                = var.region
  port_range            = "80"
  ip_protocol           = "TCP"
  load_balancing_scheme = "INTERNAL_MANAGED"
  target                = google_compute_region_target_http_proxy.browser_pool_proxy.id
  network               = var.network_name
  subnetwork            = var.subnet_name
}
