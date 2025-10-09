terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
}

provider "github" {
  owner = var.github_owner
}

variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "nava-labs"
}

variable "github_owner" {
  description = "GitHub organization or user"
  type        = string
  default     = "navapbc"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "labs-asp"
}

variable "database_secret_name" {
  description = "Name of the database URL secret in Google Secret Manager"
  type        = string
  default     = "database-url-dev"
}

