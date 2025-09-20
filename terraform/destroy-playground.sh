#!/bin/bash

# Destroy only the playground VM resources
# This script targets only the compute resources, leaving Cloud Run untouched

set -e

echo "Destroying playground VM..."

# Destroy only the playground resources
echo "Planning playground destruction..."
terraform plan -destroy \
    -target="google_compute_firewall.allow_playground" \
    -target="google_compute_instance.playground" \
    -target="google_project_iam_member.development_secret_accessor" \
    -target="google_project_iam_member.development_sql_client" \
    -target="google_project_iam_member.development_storage_object_admin" \
    -target="google_project_iam_member.development_logging_writer" \
    -target="google_project_iam_member.development_monitoring_writer" \
    -target="google_project_iam_member.development_trace_agent"

echo ""
echo "Destroy the playground VM? (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Destroying playground..."
    terraform destroy \
        -target="google_compute_firewall.allow_playground" \
        -target="google_compute_instance.playground" \
        -target="google_project_iam_member.development_secret_accessor" \
        -target="google_project_iam_member.development_sql_client" \
        -target="google_project_iam_member.development_storage_object_admin" \
        -target="google_project_iam_member.development_logging_writer" \
        -target="google_project_iam_member.development_monitoring_writer" \
        -target="google_project_iam_member.development_trace_agent" \
        -auto-approve
    
    echo ""
    echo "Playground VM destroyed!"
else
    echo "Destruction cancelled."
fi
