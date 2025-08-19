terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

# Random password for database user
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# VPC for private IP
resource "google_compute_network" "private_network" {
  name                    = "${var.environment}-labs-asp-network"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "private_subnet" {
  name          = "${var.environment}-labs-asp-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.private_network.id
}

# VPC peering for Cloud SQL
resource "google_compute_global_address" "private_ip_address" {
  name          = "${var.environment}-labs-asp-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.private_network.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.private_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

# Cloud SQL instance
resource "google_sql_database_instance" "main" {
  name             = "${var.environment}-labs-asp-db"
  database_version = "POSTGRES_15"
  region           = var.region
  
  settings {
    tier                        = var.db_tier
    availability_type           = var.availability_type
    disk_size                  = var.disk_size
    disk_autoresize           = true
    disk_autoresize_limit     = var.max_disk_size
    disk_type                 = "PD_SSD"
    
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = var.backup_retention_days
      }
    }
    
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.private_network.id
      enable_private_path_for_google_cloud_services = true
    }
    
    database_flags {
      name  = "log_statement"
      value = "all"
    }
    
    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }
  }
  
  deletion_protection = var.environment == "production" ? true : false
  
  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# Database
resource "google_sql_database" "app_db" {
  name     = "labs_asp_app"
  instance = google_sql_database_instance.main.name
}

# Database user
resource "google_sql_user" "app_user" {
  name     = "app_user"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}

# VPC Connector for Cloud Run to access private resources
resource "google_vpc_access_connector" "connector" {
  name          = "${var.environment}-labs-asp-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.private_network.name
}
