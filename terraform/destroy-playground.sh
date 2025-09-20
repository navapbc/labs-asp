#!/bin/bash

# Destroy only the playground VM resources
# This script targets only the compute resources, leaving Cloud Run untouched

set -e

echo "Destroying playground VM..."

# Destroy VM resources first, then IAM permissions
echo "Step 1: Planning VM destruction..."
terraform plan -destroy \
    -target="google_compute_firewall.allow_playground" \
    -target="google_compute_instance.playground"

echo ""
echo "Destroy the playground VM? (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Destroying VM resources..."
    terraform destroy \
        -target="google_compute_firewall.allow_playground" \
        -target="google_compute_instance.playground" \
        -auto-approve
    
    echo ""
    echo "Planning playground destruction..."
    terraform plan -destroy \
        -target="google_project_iam_member.development_secret_accessor" \
        -target="google_project_iam_member.development_sql_client" \
        -target="google_project_iam_member.development_storage_object_admin" \
        -target="google_project_iam_member.development_logging_writer" \
        -target="google_project_iam_member.development_monitoring_writer" \
        -target="google_project_iam_member.development_trace_agent"
    
    echo ""
    echo "Destroy IAM permissions? (y/N)"
    read -r iam_response
    
    if [[ "$iam_response" =~ ^[Yy]$ ]]; then
        echo "Destroying IAM permissions..."
        terraform destroy \
            -target="google_project_iam_member.development_secret_accessor" \
            -target="google_project_iam_member.development_sql_client" \
            -target="google_project_iam_member.development_storage_object_admin" \
            -target="google_project_iam_member.development_logging_writer" \
            -target="google_project_iam_member.development_monitoring_writer" \
            -target="google_project_iam_member.development_trace_agent" \
            -auto-approve
    else
        echo "IAM permissions destruction cancelled."
    fi
    
    echo ""
    echo "Playground VM destroyed!"
else
    echo "Destruction cancelled."
fi
