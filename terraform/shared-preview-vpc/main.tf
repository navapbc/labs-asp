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

  # Dedicated state for shared preview VPC
  backend "gcs" {
    bucket = "labs-asp-terraform-state"
    prefix = "terraform/state/shared-preview-vpc"
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
  
  common_labels = {
    project     = "labs-asp"
    managed_by  = "terraform"
    environment = "shared-preview"
  }
}

