# Cloud SQL Database Configuration
# 
# Strategy:
# - Dev: Creates and manages nava-db-dev Cloud SQL instance
# - Preview: Does NOT create database, uses VPC peering to connect to dev database
# - Prod: Creates and manages nava-db-prod Cloud SQL instance (completely isolated from dev/preview)

# Cloud SQL Instance for DEV environment
resource "google_sql_database_instance" "dev" {
  count            = var.environment == "dev" ? 1 : 0
  name             = "nava-db-dev"
  database_version = "POSTGRES_15"
  region           = local.region

  settings {
    tier                        = "db-custom-2-3840"  # Dev: 2 vCPUs, 3.75GB RAM
    availability_type           = "ZONAL"
    deletion_protection_enabled = false  # Allow deletion for dev environment

    # Storage configuration
    disk_type       = "PD_SSD"
    disk_size       = 100  # 50GB storage for dev
    disk_autoresize = true  # Enable autoresize

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    # IP configuration - Private IP via VPC peering + PSC for preview environments
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = local.vpc_network.id
      enable_private_path_for_google_cloud_services = true
      
      # Allow preview VPC to connect via PSC
      psc_config {
        psc_enabled               = true
        allowed_consumer_projects = [local.project_id]
      }
    }

    # Database flags
    database_flags {
      name  = "max_connections"
      value = "100"  # Appropriate for dev tier
    }
  }

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_compute_network.main
  ]

  deletion_protection = false
}

# Cloud SQL Database for DEV
resource "google_sql_database" "dev" {
  count    = var.environment == "dev" ? 1 : 0
  name     = "app_db"
  instance = google_sql_database_instance.dev[0].name
}

# Generate random password for DEV database
resource "random_password" "dev_password" {
  count   = var.environment == "dev" ? 1 : 0
  length  = 32
  special = true
  upper   = true
  lower   = true
  numeric = true
}

# Create secret in Secret Manager for DEV database password
resource "google_secret_manager_secret" "database_password_dev" {
  count     = var.environment == "dev" ? 1 : 0
  secret_id = "nava-db-password-dev"
  project   = local.project_id

  replication {
    user_managed {
      replicas {
        location = local.region
      }
    }
  }

  labels = merge(local.common_labels, {
    environment = "dev"
    purpose     = "database-password"
  })
}

# Store password in Secret Manager
resource "google_secret_manager_secret_version" "database_password_dev" {
  count       = var.environment == "dev" ? 1 : 0
  secret      = google_secret_manager_secret.database_password_dev[0].id
  secret_data = random_password.dev_password[0].result
}

# Cloud SQL User for DEV
resource "google_sql_user" "dev" {
  count    = var.environment == "dev" ? 1 : 0
  name     = "app_user"
  instance = google_sql_database_instance.dev[0].name
  password = random_password.dev_password[0].result
  type     = "BUILT_IN"
}


# Cloud SQL Instance for PROD environment (completely isolated)
resource "google_sql_database_instance" "prod" {
  count            = var.environment == "prod" ? 1 : 0
  name             = "nava-db-prod"
  database_version = "POSTGRES_15"
  region           = local.region

  settings {
    tier                        = "db-custom-4-7680"  # Prod: 4 vCPUs, 7.5GB RAM
    availability_type           = "REGIONAL" # Prod: Regional availability
    deletion_protection_enabled = true  # Protect production database

    # Storage configuration
    disk_type       = "PD_SSD"
    disk_size       = 100  # 100GB storage for prod
    disk_autoresize = true  # Enable autoresize

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    # IP configuration - Private IP only via VPC peering
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = local.vpc_network.id
      enable_private_path_for_google_cloud_services = true
    }

    # Database flags
    database_flags {
      name  = "max_connections"
      value = "200"  # Higher for production tier
    }
  }

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_compute_network.main
  ]

  deletion_protection = true  # Critical: Protect production database
}

# Cloud SQL Database for PROD
resource "google_sql_database" "prod" {
  count    = var.environment == "prod" ? 1 : 0
  name     = "app_db"
  instance = google_sql_database_instance.prod[0].name
}

# Generate random password for PROD database
resource "random_password" "prod_password" {
  count   = var.environment == "prod" ? 1 : 0
  length  = 32
  special = true
  upper   = true
  lower   = true
  numeric = true
}

# Create secret in Secret Manager for PROD database password
resource "google_secret_manager_secret" "database_password_prod" {
  count     = var.environment == "prod" ? 1 : 0
  secret_id = "nava-db-password-prod"
  project   = local.project_id

  replication {
    user_managed {
      replicas {
        location = local.region
      }
    }
  }

  labels = merge(local.common_labels, {
    environment = "prod"
    purpose     = "database-password"
  })
}

# Store password in Secret Manager
resource "google_secret_manager_secret_version" "database_password_prod" {
  count       = var.environment == "prod" ? 1 : 0
  secret      = google_secret_manager_secret.database_password_prod[0].id
  secret_data = random_password.prod_password[0].result
}

# Cloud SQL User for PROD
resource "google_sql_user" "prod" {
  count    = var.environment == "prod" ? 1 : 0
  name     = "app_user"
  instance = google_sql_database_instance.prod[0].name
  password = random_password.prod_password[0].result
  type     = "BUILT_IN"
}

# Note: VPC Peering configuration has been moved to vpc.tf for better organization
# See vpc.tf for preview-to-dev and dev-to-preview peering resources

# ============================================================================
# Private Service Connect (PSC) Configuration
# ============================================================================
# Allows preview environments to connect to dev Cloud SQL instance
# via Private Service Connect instead of relying solely on VPC peering
# Note: The preview VPC and subnets are managed in a separate terraform state

# Data source for preview shared VPC (only when in dev environment)
data "google_compute_network" "preview_shared_vpc" {
  count   = var.environment == "dev" ? 1 : 0
  name    = "labs-asp-vpc-preview-shared"
  project = local.project_id
}

# Data source for preview shared private subnet
data "google_compute_subnetwork" "preview_shared_private" {
  count   = var.environment == "dev" ? 1 : 0
  name    = "labs-asp-private-preview-shared"
  region  = local.region
  project = local.project_id
}

# PSC Connection Policy - Allows preview VPC to connect to Cloud SQL
resource "google_compute_network_connectivity_service_connection_policy" "cloud_sql_preview" {
  count         = var.environment == "dev" ? 1 : 0
  name          = "labs-asp-cloudsql-psc-preview"
  location      = local.region
  project       = local.project_id
  description   = "PSC policy to allow preview environments to connect to dev Cloud SQL"
  
  network       = data.google_compute_network.preview_shared_vpc[0].id
  service_class = "google-cloud-sql"
  
  psc_config {
    subnetworks = [data.google_compute_subnetwork.preview_shared_private[0].id]
  }
  
  labels = merge(local.common_labels, {
    environment = "dev"
    purpose     = "cloud-sql-preview-access"
  })
  
  depends_on = [
    google_sql_database_instance.dev,
    data.google_compute_network.preview_shared_vpc,
    data.google_compute_subnetwork.preview_shared_private
  ]
}

