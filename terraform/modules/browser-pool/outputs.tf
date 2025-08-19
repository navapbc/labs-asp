output "internal_load_balancer_ip" {
  description = "Internal IP address of the browser pool load balancer"
  value       = google_compute_forwarding_rule.browser_pool_forwarding_rule.ip_address
}

output "mcp_gateway_endpoint" {
  description = "Internal endpoint for MCP Gateway"
  value       = "http://${google_compute_forwarding_rule.browser_pool_forwarding_rule.ip_address}/sse"
}

output "instance_group_manager" {
  description = "Instance group manager for the browser pool"
  value       = google_compute_instance_group_manager.browser_pool_igm.name
}

output "service_account_email" {
  description = "Service account email for browser pool instances"
  value       = google_service_account.browser_pool_sa.email
}
