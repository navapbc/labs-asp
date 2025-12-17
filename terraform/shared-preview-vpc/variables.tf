# Project configuration
variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "nava-labs"
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

# VPC CIDR blocks for shared preview VPC (larger range to accommodate all preview environments)
# Using 10.1.0.0/16 for ALL preview environments
variable "vpc_cidr_public" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.1.0.0/20"  # 10.1.0.0 - 10.1.15.255
}

variable "vpc_cidr_private" {
  description = "CIDR block for private subnet"
  type        = string
  default     = "10.1.16.0/20"  # 10.1.16.0 - 10.1.31.255
}

variable "vpc_cidr_db" {
  description = "CIDR block for database subnet"
  type        = string
  default     = "10.1.32.0/20"  # 10.1.32.0 - 10.1.47.255
}

variable "vpc_connector_cidr" {
  description = "CIDR block for VPC connector (used by Cloud Run)"
  type        = string
  default     = "10.1.48.0/28"  # 10.1.48.0 - 10.1.48.15
}

