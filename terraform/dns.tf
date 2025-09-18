# DNS configuration for custom domain routing
# Only created if enable_dns is true and domain_name is provided

# Managed DNS zone
resource "google_dns_managed_zone" "main" {
  count = var.enable_dns && var.domain_name != "" ? 1 : 0
  
  name        = "labs-asp-zone"
  dns_name    = "${var.domain_name}."
  description = "DNS zone for Labs ASP application"

  labels = local.common_labels

  depends_on = [google_project_service.required_apis]
}

# A record for root domain (production)
resource "google_dns_record_set" "root" {
  count = var.enable_dns && var.domain_name != "" && var.enable_load_balancer ? 1 : 0

  name = google_dns_managed_zone.main[0].dns_name
  type = "A"
  ttl  = 300

  managed_zone = google_dns_managed_zone.main[0].name
  rrdatas      = [google_compute_global_address.default[0].address]
}

# A record for www subdomain (production)
resource "google_dns_record_set" "www" {
  count = var.enable_dns && var.domain_name != "" && var.enable_load_balancer ? 1 : 0

  name = "www.${google_dns_managed_zone.main[0].dns_name}"
  type = "A"
  ttl  = 300

  managed_zone = google_dns_managed_zone.main[0].name
  rrdatas      = [google_compute_global_address.default[0].address]
}

# A record for dev subdomain
resource "google_dns_record_set" "dev" {
  count = var.enable_dns && var.domain_name != "" && var.enable_load_balancer ? 1 : 0

  name = "dev.${google_dns_managed_zone.main[0].dns_name}"
  type = "A"
  ttl  = 300

  managed_zone = google_dns_managed_zone.main[0].name
  rrdatas      = [google_compute_global_address.default[0].address]
}

# A record for preview subdomain
resource "google_dns_record_set" "preview" {
  count = var.enable_dns && var.domain_name != "" && var.enable_load_balancer ? 1 : 0

  name = "preview.${google_dns_managed_zone.main[0].dns_name}"
  type = "A"
  ttl  = 300

  managed_zone = google_dns_managed_zone.main[0].name
  rrdatas      = [google_compute_global_address.default[0].address]
}

# Wildcard A record for preview environments (*.preview.domain.com)
resource "google_dns_record_set" "preview_wildcard" {
  count = var.enable_dns && var.domain_name != "" && var.enable_load_balancer ? 1 : 0

  name = "*.preview.${google_dns_managed_zone.main[0].dns_name}"
  type = "A"
  ttl  = 300

  managed_zone = google_dns_managed_zone.main[0].name
  rrdatas      = [google_compute_global_address.default[0].address]
}
