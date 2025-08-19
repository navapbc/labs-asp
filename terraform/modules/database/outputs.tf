output "connection_name" {
  description = "The connection name for the database instance"
  value       = google_sql_database_instance.main.connection_name
}

output "private_ip_address" {
  description = "The private IP address of the database instance"
  value       = google_sql_database_instance.main.private_ip_address
  sensitive   = true
}

output "database_name" {
  description = "The name of the database"
  value       = google_sql_database.app_db.name
}

output "user_name" {
  description = "The database user name"
  value       = google_sql_user.app_user.name
}

output "user_password" {
  description = "The database user password"
  value       = google_sql_user.app_user.password
  sensitive   = true
}

output "network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.private_network.name
}

output "vpc_connector_name" {
  description = "The name of the VPC connector for Cloud Run"
  value       = google_vpc_access_connector.connector.name
}
