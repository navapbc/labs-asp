# Terraform variables for labs-asp deployment

# GCP Configuration
project_id = "nava-labs"
region     = "us-west1"
zone       = "us-west1-a"

# GitHub Repository
github_repository = "navapbc/labs-asp"
github_branch     = "feat/terraform-cloud-run-vm-deployment"

# Cloud Run Configuration
cloud_run_cpu         = "2000m"  # 2 vCPUs for Mastra backend
cloud_run_memory      = "4Gi"    # 4GB RAM for browser automation
cloud_run_timeout     = 3600     # 60 minutes for long automations
cloud_run_max_instances = 100
cloud_run_min_instances = 0

# VM Configuration (for browser services)
machine_type = "e2-standard-4"  # 4 vCPUs, 16GB RAM for browser services
disk_size    = 50               # GB

# Load Balancer and DNS (disabled for now)
enable_load_balancer = false
enable_dns = false
