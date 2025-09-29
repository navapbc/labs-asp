# Browser VM outputs
output "browser_vm_name" {
  description = "Name of the browser service VM"
  value       = google_compute_instance.browser_service.name
}

output "browser_vm_external_ip" {
  description = "External IP address of the browser service VM"
  value       = google_compute_instance.browser_service.network_interface[0].access_config[0].nat_ip
}

output "browser_vm_internal_ip" {
  description = "Internal IP address of the browser service VM"
  value       = google_compute_instance.browser_service.network_interface[0].network_ip
}

output "browser_mcp_url" {
  description = "MCP server URL for browser automation"
  value       = "http://${google_compute_instance.browser_service.network_interface[0].network_ip}:8931/mcp"
}

output "browser_streaming_url" {
  description = "WebSocket URL for browser streaming"
  value       = "ws://${google_compute_instance.browser_service.network_interface[0].network_ip}:8933"
}

# Mastra service outputs
output "mastra_service_name" {
  description = "Name of the Mastra Cloud Run service"
  value       = google_cloud_run_v2_service.mastra_app.name
}

output "mastra_service_url" {
  description = "URL of the Mastra Cloud Run service"
  value       = google_cloud_run_v2_service.mastra_app.uri
}

output "mastra_chat_endpoint" {
  description = "Chat endpoint for Mastra service"
  value       = "${google_cloud_run_v2_service.mastra_app.uri}/chat"
}

# AI Chatbot service outputs
output "chatbot_service_name" {
  description = "Name of the AI Chatbot Cloud Run service"
  value       = google_cloud_run_v2_service.ai_chatbot.name
}

output "chatbot_service_url" {
  description = "URL of the AI Chatbot Cloud Run service"
  value       = google_cloud_run_v2_service.ai_chatbot.uri
}

output "chatbot_public_url" {
  description = "Public URL for accessing the AI chatbot"
  value       = google_cloud_run_v2_service.ai_chatbot.uri
}

# Service account outputs
output "browser_vm_service_account" {
  description = "Service account email for browser VM"
  value       = google_service_account.browser_vm.email
}

output "cloud_run_service_account" {
  description = "Service account email for Cloud Run services"
  value       = google_service_account.cloud_run.email
}

# Environment information
output "environment" {
  description = "Deployed environment"
  value       = var.environment
}

output "project_id" {
  description = "GCP project ID"
  value       = local.project_id
}

output "region" {
  description = "GCP region"
  value       = local.region
}

# Architecture summary
output "architecture_summary" {
  description = "Summary of the deployed architecture"
  value = {
    browser_service = {
      type        = "Compute Engine VM"
      machine_type = var.browser_vm_machine_type
      internal_ip  = google_compute_instance.browser_service.network_interface[0].network_ip
      mcp_port     = 8931
      streaming_port = 8933
    }
    mastra_service = {
      type         = "Cloud Run"
      url          = google_cloud_run_v2_service.mastra_app.uri
      chat_endpoint = "${google_cloud_run_v2_service.mastra_app.uri}/chat"
      cpu          = var.mastra_cpu
      memory       = var.mastra_memory
    }
    chatbot_service = {
      type       = "Cloud Run"
      url        = google_cloud_run_v2_service.ai_chatbot.uri
      cpu        = var.chatbot_cpu
      memory     = var.chatbot_memory
    }
    networking = {
      browser_to_mastra = "VM internal IP → Cloud Run"
      browser_to_chatbot = "VM internal IP → Cloud Run"
      public_access = "Cloud Run → Internet"
    }
  }
}