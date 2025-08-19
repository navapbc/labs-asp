variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
}

variable "db_tier" {
  description = "The machine type for the database instance"
  type        = string
  default     = "db-f1-micro"
}

variable "disk_size" {
  description = "The initial disk size in GB"
  type        = number
  default     = 20
}

variable "max_disk_size" {
  description = "The maximum disk size in GB for auto-resize"
  type        = number
  default     = 100
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "availability_type" {
  description = "Availability type for the database (ZONAL or REGIONAL)"
  type        = string
  default     = "ZONAL"
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}
