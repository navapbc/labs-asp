#!/bin/bash

# Deploy only the playground VM resources
# This script targets only the compute resources, leaving Cloud Run untouched

set -e

echo "🚀 Deploying playground VM..."

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    terraform init
fi

# Plan and apply only the playground resources
echo "Planning playground deployment..."
terraform plan \
    -target="google_compute_firewall.allow_playground" \
    -target="google_compute_instance.playground"

echo ""
echo "Apply the playground deployment? (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Applying playground deployment..."
    terraform apply \
        -target="google_compute_firewall.allow_playground" \
        -target="google_compute_instance.playground" \
        -auto-approve
    
    echo ""
    echo "✅ Playground VM deployed!"
    echo ""
    echo "📊 Getting playground info..."
    terraform output playground_url
    terraform output playground_ssh_command
else
    echo "Deployment cancelled."
fi
