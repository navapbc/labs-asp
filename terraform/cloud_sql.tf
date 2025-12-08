# Cloud SQL Database Configuration
# 
# Strategy:
# - Dev: Creates and manages app-dev Cloud SQL instance
# - Preview: Does NOT create database, uses VPC peering to connect to dev database
# - Prod: Creates and manages app-prod Cloud SQL instance (completely isolated from dev/preview)

# Cloud SQL Instance for DEV environment
resource "google_sql_database_instance" "dev" {
  count            = var.environment == "dev" ? 1 : 0
  name             = "app-dev"
  database_version = "POSTGRES_15"
  region           = local.region

  settings {
    tier                        = "db-f1-micro"  # Minimal tier for testing
    availability_type           = "ZONAL"
    deletion_protection_enabled = false  # Allow deletion for dev environment

    # Storage configuration - minimal for testing
    disk_type       = "PD_SSD"
    disk_size       = 10  # Minimal storage (10GB)
    disk_autoresize = false  # Disable autoresize for testing

    # Backup configuration - minimal for testing
    backup_configuration {
      enabled                        = false  # Disable backups for testing
      point_in_time_recovery_enabled = false
    }

    # IP configuration - Private IP only via VPC peering
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    # Database flags - minimal for testing
    database_flags {
      name  = "max_connections"
      value = "25"  # Reduced for minimal tier
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
  secret_id = "database-password-dev"
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
  name             = "app-prod"
  database_version = "POSTGRES_15"
  region           = local.region

  settings {
    tier                        = "db-f1-micro"  # Minimal tier for testing
    availability_type           = "ZONAL"
    deletion_protection_enabled = false  # Disabled for testing (set to true in production)

    # Storage configuration - minimal for testing
    disk_type       = "PD_SSD"
    disk_size       = 10  # Minimal storage (10GB)
    disk_autoresize = false  # Disable autoresize for testing

    # Backup configuration - minimal for testing
    backup_configuration {
      enabled                        = false  # Disable backups for testing
      point_in_time_recovery_enabled = false
    }

    # IP configuration - Private IP only via VPC peering
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    # Database flags - minimal for testing
    database_flags {
      name  = "max_connections"
      value = "25"  # Reduced for minimal tier
    }
  }

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_compute_network.main
  ]

  deletion_protection = false  # Disabled for testing (set to true in production)
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
  secret_id = "database-password-prod"
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

