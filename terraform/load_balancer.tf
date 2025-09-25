# Global Load Balancer with SSL certificates and domain routing
# This implements the Phase 1 architecture requirement for custom domains

# Reserved global IP address
resource "google_compute_global_address" "default" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "labs-asp-global-ip"
}

# SSL certificate (managed by Google)
resource "google_compute_managed_ssl_certificate" "default" {
  count = var.enable_load_balancer && var.domain_name != "" ? 1 : 0
  name  = "labs-asp-ssl-cert"

  managed {
    domains = [
      var.domain_name,
      "www.${var.domain_name}",
      "dev.${var.domain_name}",
      "preview.${var.domain_name}",
      "*.preview.${var.domain_name}" # Wildcard for PR previews
    ]
  }

  depends_on = [google_project_service.required_apis]
}

# Backend services for each environment
resource "google_compute_backend_service" "app" {
  for_each = var.enable_load_balancer ? local.environments : {}

  name        = "labs-asp-backend-${each.key}"
  description = "Backend service for Labs ASP ${each.key} environment"
  
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = var.cloud_run_timeout

  backend {
    group = google_compute_region_network_endpoint_group.cloud_run[each.key].id
  }

  # Health check
  health_checks = [google_compute_health_check.cloud_run[each.key].id]

  # CDN configuration
  enable_cdn = true
  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                 = 3600
    max_ttl                     = 86400
    negative_caching            = true
    serve_while_stale           = 86400
    
    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = false
    }
  }

  depends_on = [google_project_service.required_apis]
}

# Network Endpoint Groups for Cloud Run services
resource "google_compute_region_network_endpoint_group" "cloud_run" {
  for_each = var.enable_load_balancer ? local.environments : {}

  name                  = "labs-asp-neg-${each.key}"
  network_endpoint_type = "SERVERLESS"
  region                = local.region

  cloud_run {
    service = google_cloud_run_v2_service.app[each.key].name
  }

  depends_on = [google_project_service.required_apis]
}

# Health checks for backend services
resource "google_compute_health_check" "cloud_run" {
  for_each = var.enable_load_balancer ? local.environments : {}

  name        = "labs-asp-health-check-${each.key}"
  description = "Health check for Labs ASP ${each.key} environment"

  timeout_sec         = 5
  check_interval_sec  = 30
  healthy_threshold   = 1
  unhealthy_threshold = 3

  http_health_check {
    port         = "80"
    request_path = "/health"
  }

  depends_on = [google_project_service.required_apis]
}

# URL map for routing traffic to different environments
resource "google_compute_url_map" "default" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "labs-asp-url-map"

  # Default service (production)
  default_service = google_compute_backend_service.app["prod"].id

  # Host rules for different environments
  dynamic "host_rule" {
    for_each = var.domain_name != "" ? [1] : []
    content {
      hosts        = [var.domain_name, "www.${var.domain_name}"]
      path_matcher = "prod"
    }
  }

  dynamic "host_rule" {
    for_each = var.domain_name != "" ? [1] : []
    content {
      hosts        = ["dev.${var.domain_name}"]
      path_matcher = "dev"
    }
  }

  dynamic "host_rule" {
    for_each = var.domain_name != "" ? [1] : []
    content {
      hosts        = ["preview.${var.domain_name}", "*.preview.${var.domain_name}"]
      path_matcher = "preview"
    }
  }

  # Path matchers for each environment
  dynamic "path_matcher" {
    for_each = local.environments
    content {
      name            = path_matcher.key
      default_service = google_compute_backend_service.app[path_matcher.key].id

      path_rule {
        paths   = ["/*"]
        service = google_compute_backend_service.app[path_matcher.key].id
      }
    }
  }

  depends_on = [google_project_service.required_apis]
}

# HTTPS proxy
resource "google_compute_target_https_proxy" "default" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "labs-asp-https-proxy"

  url_map = google_compute_url_map.default[0].id
  ssl_certificates = var.domain_name != "" ? [
    google_compute_managed_ssl_certificate.default[0].id
  ] : []

  depends_on = [google_project_service.required_apis]
}

# HTTP proxy (redirects to HTTPS)
resource "google_compute_target_http_proxy" "default" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "labs-asp-http-proxy"

  url_map = google_compute_url_map.redirect_to_https[0].id

  depends_on = [google_project_service.required_apis]
}

# URL map for HTTP to HTTPS redirect
resource "google_compute_url_map" "redirect_to_https" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "labs-asp-redirect-to-https"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }

  depends_on = [google_project_service.required_apis]
}

# Global forwarding rules
resource "google_compute_global_forwarding_rule" "https" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "labs-asp-forwarding-rule-https"

  target     = google_compute_target_https_proxy.default[0].id
  port_range = "443"
  ip_address = google_compute_global_address.default[0].id

  depends_on = [google_project_service.required_apis]
}

resource "google_compute_global_forwarding_rule" "http" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "labs-asp-forwarding-rule-http"

  target     = google_compute_target_http_proxy.default[0].id
  port_range = "80"
  ip_address = google_compute_global_address.default[0].id

  depends_on = [google_project_service.required_apis]
}
