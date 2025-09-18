#!/bin/bash

# Destroy only the playground VM resources
# This script targets only the compute resources, leaving Cloud Run untouched

set -e

echo "🗑️  Destroying playground VM..."

# Destroy only the playground resources
echo "Planning playground destruction..."
terraform plan -destroy \
    -target="google_compute_firewall.allow_playground" \
    -target="google_compute_instance.playground"

echo ""
echo "Destroy the playground VM? (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Destroying playground..."
    terraform destroy \
        -target="google_compute_firewall.allow_playground" \
        -target="google_compute_instance.playground" \
        -auto-approve
    
    echo ""
    echo "✅ Playground VM destroyed!"
else
    echo "Destruction cancelled."
fi
