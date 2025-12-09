# VM outputs
output "vm_name" {
  description = "Name of the application VM"
  value       = google_compute_instance.app_vm.name
}

output "vm_internal_ip" {
  description = "Internal IP address of the application VM (in private subnet)"
  value       = google_compute_instance.app_vm.network_interface[0].network_ip
}

# Cloud NAT static IP for external API whitelisting
output "nat_external_ip" {
  description = "Static external IP for Cloud NAT (use for external API whitelisting)"
  value       = google_compute_address.nat_static_ip.address
}

output "api_whitelisting_info" {
  description = "Information needed for external API whitelisting"
  value = {
    static_ip   = google_compute_address.nat_static_ip.address
    environment = var.environment
    region      = local.region
    purpose     = "Outbound traffic from VM via Cloud NAT"
  }
}

output "browser_mcp_url" {
  description = "MCP server URL for browser automation (internal IP)"
  value       = "http://${google_compute_instance.app_vm.network_interface[0].network_ip}:8931/mcp"
}

output "browser_streaming_url" {
  description = "WebSocket URL for browser streaming (internal IP)"
  value       = "ws://${google_compute_instance.app_vm.network_interface[0].network_ip}:8933"
}

output "mastra_service_url" {
  description = "URL of the Mastra service (running on VM, internal IP)"
  value       = "http://${google_compute_instance.app_vm.network_interface[0].network_ip}:4112"
}

output "mastra_chat_endpoint" {
  description = "Chat endpoint for Mastra service (internal IP)"
  value       = "http://${google_compute_instance.app_vm.network_interface[0].network_ip}:4112/chat"
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

# VPC Network outputs
output "vpc_id" {
  description = "VPC network ID"
  value       = google_compute_network.main.id
}

output "vpc_name" {
  description = "VPC network name"
  value       = google_compute_network.main.name
}

output "vpc_public_subnet" {
  description = "Public subnet CIDR"
  value       = var.vpc_cidr_public
}

output "vpc_private_subnet" {
  description = "Private subnet CIDR"
  value       = var.vpc_cidr_private
}

output "vpc_db_subnet" {
  description = "Database subnet CIDR"
  value       = var.vpc_cidr_db
}

output "vpc_connector_cidr" {
  description = "VPC Connector CIDR"
  value       = var.vpc_connector_cidr
}

# Database outputs
output "database_instance_name" {
  description = "Cloud SQL instance name"
  value = var.environment == "dev" ? (
    length(google_sql_database_instance.dev) > 0 ? google_sql_database_instance.dev[0].name : null
  ) : (
    var.environment == "prod" ? (
      length(google_sql_database_instance.prod) > 0 ? google_sql_database_instance.prod[0].name : null
    ) : null
  )
}

output "database_connection_name" {
  description = "Cloud SQL connection name (for Cloud SQL Proxy)"
  value = var.environment == "dev" ? (
    length(google_sql_database_instance.dev) > 0 ? google_sql_database_instance.dev[0].connection_name : null
  ) : (
    var.environment == "prod" ? (
      length(google_sql_database_instance.prod) > 0 ? google_sql_database_instance.prod[0].connection_name : null
    ) : null
  )
}

output "database_private_ip" {
  description = "Cloud SQL private IP address"
  value = var.environment == "dev" ? (
    length(google_sql_database_instance.dev) > 0 ? google_sql_database_instance.dev[0].private_ip_address : null
  ) : (
    var.environment == "prod" ? (
      length(google_sql_database_instance.prod) > 0 ? google_sql_database_instance.prod[0].private_ip_address : null
    ) : null
  )
}

output "database_name" {
  description = "Database name"
  value       = "app_db"
}

output "database_user" {
  description = "Database username"
  value       = "app_user"
}

# Architecture summary
output "architecture_summary" {
  description = "Summary of the deployed architecture"
  value = {
    app_vm = {
      type         = "Compute Engine VM"
      machine_type = var.vm_machine_type
      internal_ip  = google_compute_instance.app_vm.network_interface[0].network_ip
      subnet       = "private"
      internet_access = "via Cloud NAT"
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
      vpc_network      = google_compute_network.main.name
      vm_services      = "Both containers on same Docker network"
      chatbot_to_vm    = "Cloud Run → VPC → VM internal IP"
      public_access    = "Cloud Run → Internet"
      vpc_cidrs = {
        public   = var.vpc_cidr_public
        private  = var.vpc_cidr_private
        database = var.vpc_cidr_db
        connector = var.vpc_connector_cidr
      }
    }
  }
}
