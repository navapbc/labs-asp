# Terraform variables for labs-asp deployment

# GCP Configuration
project_id = "nava-labs"
region     = "us-west1"      # Changed to match existing VM location
zone       = "us-west1-a"    # Changed to match existing VM location

# GitHub Repository
github_repository = "navapbc/labs-asp"

# Playground VM Configuration (optional - only deployed if needed)
playground_machine_type = "e2-standard-4"  # 4 vCPUs, 16GB RAM
playground_zone         = "us-west1-a"     # Different zone for playground
playground_disk_size    = 50              # GB

# Cloud Run Configuration (for production deployments)
cloud_run_cpu         = "2000m"  # 2 vCPUs for browser + Node.js
cloud_run_memory      = "4Gi"    # 4GB RAM for Chrome processes
cloud_run_timeout     = 3600     # 60 minutes for long automations
cloud_run_max_instances = 100
cloud_run_min_instances = 0

# Load Balancer and DNS (disabled for now)
enable_load_balancer = false
enable_dns = false