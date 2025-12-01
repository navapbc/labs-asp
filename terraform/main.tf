terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }

  # Use existing GCS backend for state storage
  # Note: prefix should be set per-environment via terraform init -backend-config
  backend "gcs" {
    bucket = "labs-asp-terraform-state"
  }
}

# Configure the Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Local values for common configurations
locals {
  project_id = var.project_id
  region     = var.region
  zone       = var.zone

  # Determine base environment (dev, preview, prod) from environment name
  # For preview-pr-123, base_environment = "preview"
  base_environment = startswith(var.environment, "preview-pr-") ? "preview" : var.environment

  # Environment configurations - reuse existing pattern
  environments = {
    dev = {
      mastra_service_name = "mastra-app-dev"
      chatbot_service_name = "ai-chatbot-dev"
      sql_instance_name = "app-dev"  # dev database
      domain_prefix = "dev"
    }
    preview = {
      mastra_service_name = "mastra-app-${var.environment}"  # Use full env name for unique resources
      chatbot_service_name = "ai-chatbot-${var.environment}"
      sql_instance_name = "app-dev"  # ALL preview environments use dev database
      domain_prefix = var.environment  # preview-pr-123 gets preview-pr-123.labs-asp.com
    }
    prod = {
      mastra_service_name = "mastra-app-prod"
      chatbot_service_name = "ai-chatbot-prod"
      sql_instance_name = "app-prod"  # prod database
      domain_prefix = "app"
    }
  }

  # Get current environment config using base_environment as key
  env_config = local.environments[local.base_environment]

  # Common labels
  common_labels = {
    project     = "labs-asp"
    managed_by  = "terraform"
    deployment  = "client-server-architecture"
  }
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "sql-component.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "compute.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "iamcredentials.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com"
  ])

  service = each.key
  project = local.project_id

  disable_dependent_services = false
  disable_on_destroy        = false
}