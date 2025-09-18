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

  # Use GCS backend for state storage
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
  
  # Environment configurations
  environments = {
    dev = {
      cloud_run_service_name = "labs-asp-dev"
      sql_instance_name     = "app-dev"
      domain_prefix         = "dev"
    }
    preview = {
      cloud_run_service_name = "labs-asp-preview"
      sql_instance_name     = "app-preview"
      domain_prefix         = "preview"
    }
    prod = {
      cloud_run_service_name = "labs-asp-prod"
      sql_instance_name     = "app-prod"
      domain_prefix         = "app"
    }
  }
  
  # Common labels
  common_labels = {
    project     = "labs-asp"
    managed_by  = "terraform"
    environment = "multi"
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
    "dns.googleapis.com",
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
