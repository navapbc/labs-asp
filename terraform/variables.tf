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
  default     = "labs-asp.com"
}

# Browser VM configuration
variable "browser_vm_machine_type" {
  description = "Machine type for browser automation VM"
  type        = string
  default     = "e2-standard-2"  # 2 vCPUs, 8GB RAM - sufficient for Playwright
}

variable "browser_vm_disk_size" {
  description = "Boot disk size for browser VM in GB"
  type        = number
  default     = 20
}

variable "browser_image_url" {
  description = "Container image URL for browser service"
  type        = string
  default     = "us-central1-docker.pkg.dev/nava-labs/labs-asp/browser-streaming:latest"
}

# Mastra Cloud Run configuration
variable "mastra_image_url" {
  description = "Container image URL for Mastra service"
  type        = string
  default     = "us-central1-docker.pkg.dev/nava-labs/labs-asp/mastra-app:latest"
}

variable "mastra_cpu" {
  description = "CPU allocation for Mastra Cloud Run service"
  type        = string
  default     = "2"  # 2 vCPUs for agent processing
}

variable "mastra_memory" {
  description = "Memory allocation for Mastra Cloud Run service"
  type        = string
  default     = "4Gi"  # 4GB RAM for agent processing
}

variable "mastra_min_instances" {
  description = "Minimum instances for Mastra service"
  type        = number
  default     = 0  # Scale to zero when not used
}

variable "mastra_max_instances" {
  description = "Maximum instances for Mastra service"
  type        = number
  default     = 10
}

variable "mastra_timeout" {
  description = "Request timeout for Mastra service in seconds"
  type        = number
  default     = 300  # 5 minutes for web automation tasks
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
  description = "Environment to deploy (dev, preview, prod)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "preview", "prod"], var.environment)
    error_message = "Environment must be one of: dev, preview, prod"
  }
}