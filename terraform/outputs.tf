# VM outputs
output "vm_name" {
  description = "Name of the application VM"
  value       = google_compute_instance.app_vm.name
}

output "vm_external_ip" {
  description = "External IP address of the application VM"
  value       = google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip
}

output "app_vm_static_ip" {
  description = "Static external IP address for app VM (for external API whitelisting)"
  value       = google_compute_address.app_vm_static_ip.address
}

output "api_whitelisting_info" {
  description = "Information needed for external API whitelisting"
  value = {
    static_ip   = google_compute_address.app_vm_static_ip.address
    environment = var.environment
    region      = local.region
    purpose     = "Mastra server API calls from port 4112"
  }
}

output "vm_internal_ip" {
  description = "Internal IP address of the application VM"
  value       = google_compute_instance.app_vm.network_interface[0].network_ip
}

output "browser_mcp_url" {
  description = "MCP server URL for browser automation"
  value       = "http://${google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip}:8931/mcp"
}

output "browser_streaming_url" {
  description = "WebSocket URL for browser streaming"
  value       = "ws://${google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip}:8933"
}

output "mastra_service_url" {
  description = "URL of the Mastra service (running on VM)"
  value       = "http://${google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip}:4112"
}

output "mastra_chat_endpoint" {
  description = "Chat endpoint for Mastra service"
  value       = "http://${google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip}:4112/chat"
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

output "browser_ws_proxy_url" {
  description = "URL of the browser WebSocket proxy service"
  value       = google_cloud_run_v2_service.browser_ws_proxy.uri
}

# Service account outputs
output "vm_service_account" {
  description = "Service account email for VM"
  value       = google_service_account.vm.email
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
    app_vm = {
      type         = "Compute Engine VM"
      machine_type = var.vm_machine_type
      external_ip  = google_compute_instance.app_vm.network_interface[0].access_config[0].nat_ip
      services     = "browser-streaming + mastra-app"
      browser_mcp_port = 8931
      browser_ws_port  = 8933
      mastra_port      = 4112
    }
    chatbot_service = {
      type       = "Cloud Run"
      url        = google_cloud_run_v2_service.ai_chatbot.uri
      cpu        = var.chatbot_cpu
      memory     = var.chatbot_memory
    }
    networking = {
      vm_services      = "Both containers on same Docker network"
      chatbot_to_vm    = "Cloud Run → VM external IP"
      public_access    = "Cloud Run → Internet"
    }
  }
}
