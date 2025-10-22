# Project configuration
variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "nava-labs"
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone for VM instances"
  type        = string
  default     = "us-central1-a"
}

# Domain configuration
variable "domain_name" {
  description = "Base domain name for the application"
  type        = string
  default     = "labs-asp.navateam.com"
}

variable "enable_custom_domain" {
  description = "Enable custom domain mapping (requires domain verification via Google Search Console)"
  type        = bool
  default     = false  # Default to false to avoid verification issues
}

# VM configuration (runs browser-streaming + mastra-app)
variable "vm_machine_type" {
  description = "Machine type for application VM"
  type        = string
  default     = "e2-standard-4"  # 4 vCPUs, 16GB RAM - runs both containers
}

variable "vm_disk_size" {
  description = "Boot disk size for VM in GB"
  type        = number
  default     = 30
}

variable "browser_image_url" {
  description = "Container image URL for browser service"
  type        = string
  default     = "us-central1-docker.pkg.dev/nava-labs/labs-asp/browser-streaming:latest"
}

variable "mastra_image_url" {
  description = "Container image URL for mastra-app service"
  type        = string
  default     = "us-central1-docker.pkg.dev/nava-labs/labs-asp/mastra-app:latest"
}

variable "browser_ws_proxy_image_url" {
  description = "Container image URL for browser WebSocket proxy service"
  type        = string
  default     = "us-central1-docker.pkg.dev/nava-labs/labs-asp/browser-ws-proxy:latest"
}

# AI Chatbot Cloud Run configuration
variable "chatbot_image_url" {
  description = "Container image URL for AI chatbot service"
  type        = string
  default     = "us-central1-docker.pkg.dev/nava-labs/labs-asp/ai-chatbot:latest"
}

variable "chatbot_cpu" {
  description = "CPU allocation for AI Chatbot Cloud Run service"
  type        = string
  default     = "1"  # 1 vCPU for Next.js app
}

variable "chatbot_memory" {
  description = "Memory allocation for AI Chatbot Cloud Run service"
  type        = string
  default     = "2Gi"  # 2GB RAM for Next.js app
}

variable "chatbot_min_instances" {
  description = "Minimum instances for AI Chatbot service"
  type        = number
  default     = 0  # Scale to zero when not used
}

variable "chatbot_max_instances" {
  description = "Maximum instances for AI Chatbot service"
  type        = number
  default     = 5
}

variable "chatbot_timeout" {
  description = "Request timeout for AI Chatbot service in seconds"
  type        = number
  default     = 60  # 1 minute for typical chat responses
}

# Environment selection
variable "environment" {
  description = "Environment to deploy (dev, preview-pr-N, prod)"
  type        = string
  default     = "dev"
  validation {
    condition     = can(regex("^(dev|prod|preview(-pr-[0-9]+)?)$", var.environment))
    error_message = "Environment must be one of: dev, prod, preview, or preview-pr-NUMBER"
  }
}