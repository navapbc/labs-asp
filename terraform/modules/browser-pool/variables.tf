variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
}

variable "zone" {
  description = "The GCP zone for instances"
  type        = string
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
}

variable "network_name" {
  description = "Name of the VPC network"
  type        = string
}

variable "subnet_name" {
  description = "Name of the subnet"
  type        = string
}

variable "machine_type" {
  description = "Machine type for browser instances"
  type        = string
  default     = "e2-standard-2"
}

variable "disk_size" {
  description = "Boot disk size in GB"
  type        = number
  default     = 50
}

variable "instance_count" {
  description = "Number of browser instances"
  type        = number
  default     = 2
}

variable "container_image" {
  description = "Container image for the main application"
  type        = string
}

variable "mcp_gateway_image" {
  description = "Docker MCP Gateway image"
  type        = string
  default     = "docker/mcp-gateway:latest"
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}
