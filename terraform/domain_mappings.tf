# Custom domain mappings for Cloud Run services
# Maps custom domains (via Route53 CNAME) to Cloud Run services with auto-provisioned SSL
# Note: Requires domain ownership verification via Google Search Console for parent domain
# Preview environments skip domain mappings to avoid verification issues

# Domain mapping for AI Chatbot service (only for dev and prod)
resource "google_cloud_run_domain_mapping" "chatbot" {
  count    = var.enable_custom_domain ? 1 : 0
  name     = local.env_config.domain_prefix == "app" ? var.domain_name : "${local.env_config.domain_prefix}.${var.domain_name}"
  location = local.region

  metadata {
    namespace = local.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.ai_chatbot.name
  }

  # Ensure service exists before creating mapping
  depends_on = [google_cloud_run_v2_service.ai_chatbot]
}

# Output the custom domain for this environment
output "custom_domain" {
  description = "Custom domain for this environment (empty string if domain mapping disabled)"
  value       = var.enable_custom_domain ? google_cloud_run_domain_mapping.chatbot[0].name : ""
}

# Output domain mapping status
output "domain_mapping_status" {
  description = "Status of the domain mapping (null if domain mapping disabled)"
  value = var.enable_custom_domain ? {
    domain = google_cloud_run_domain_mapping.chatbot[0].name
    status = google_cloud_run_domain_mapping.chatbot[0].status
  } : null
}
