terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  # Use existing GCS backend for state storage
  backend "gcs" {
    bucket = "labs-asp-terraform-state"
    prefix = "terraform/state"
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

  # Environment configurations - reuse existing pattern
  environments = {
    dev = {
      mastra_service_name = "mastra-app-dev"
      chatbot_service_name = "ai-chatbot-dev"
      sql_instance_name = "app-dev"  # Reuse existing
      domain_prefix = "dev"
    }
    preview = {
      mastra_service_name = "mastra-app-preview"
      chatbot_service_name = "ai-chatbot-preview"
      sql_instance_name = "app-preview"  # Reuse existing
      domain_prefix = "preview"
    }
    prod = {
      mastra_service_name = "mastra-app-prod"
      chatbot_service_name = "ai-chatbot-prod"
      sql_instance_name = "app-prod"  # Reuse existing
      domain_prefix = "app"
    }
  }

  # Common labels
  common_labels = {
    project     = "labs-asp"
    managed_by  = "terraform"
    deployment  = "client-server-architecture"
  }
}

# Enable required APIs (reuse existing pattern)
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
    "iamcredentials.googleapis.com"
  ])

  service = each.key
  project = local.project_id

  disable_dependent_services = false
  disable_on_destroy        = false
}