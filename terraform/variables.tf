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
  description = "The GCP zone for resources"
  type        = string
  default     = "us-central1-c"
}

variable "domain_name" {
  description = "The domain name for the application (optional)"
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "The GitHub repository in format 'owner/repo'"
  type        = string
  default     = "navapbc/labs-asp"
}

variable "cloud_run_cpu" {
  description = "CPU allocation for Cloud Run services"
  type        = string
  default     = "2000m"
}

variable "cloud_run_memory" {
  description = "Memory allocation for Cloud Run services"
  type        = string
  default     = "4Gi"
}

variable "cloud_run_timeout" {
  description = "Timeout for Cloud Run services in seconds"
  type        = number
  default     = 3600
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 100
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "enable_load_balancer" {
  description = "Whether to create a load balancer and SSL certificates"
  type        = bool
  default     = false
}

variable "enable_dns" {
  description = "Whether to create DNS records (requires domain_name)"
  type        = bool
  default     = false
}

# Playground VM Configuration
variable "playground_machine_type" {
  description = "Machine type for the playground VM"
  type        = string
  default     = "e2-standard-4"  # 4 vCPUs, 16GB RAM
}

variable "playground_zone" {
  description = "Zone for the playground VM"
  type        = string
  default     = "us-west1-a"
}

variable "playground_disk_size" {
  description = "Disk size for the playground VM in GB"
  type        = number
  default     = 50
}
