# Custom domain mappings for Cloud Run services
# Maps custom domains (via Route53 CNAME) to Cloud Run services with auto-provisioned SSL

# Domain mapping for AI Chatbot service
resource "google_cloud_run_domain_mapping" "chatbot" {
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
  description = "Custom domain for this environment"
  value       = google_cloud_run_domain_mapping.chatbot.name
}

# Output domain mapping status
output "domain_mapping_status" {
  description = "Status of the domain mapping (use to verify SSL certificate provisioning)"
  value = {
    domain = google_cloud_run_domain_mapping.chatbot.name
    status = google_cloud_run_domain_mapping.chatbot.status
  }
}
