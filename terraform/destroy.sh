#!/bin/bash

# Multi-environment destruction script for Labs ASP
# Usage: ./destroy.sh [dev|preview|prod|all]

set -e

# Function to show usage
show_usage() {
    echo "Usage: $0 [dev|preview|prod|all]"
    echo ""
    echo "Examples:"
    echo "  $0 dev       # Destroy only dev environment"
    echo "  $0 preview   # Destroy only preview environment"
    echo "  $0 prod      # Destroy only prod environment"
    echo "  $0 all       # Destroy all environments"
    echo ""
    exit 1
}

# Function to destroy a specific environment
destroy_env() {
    local env=$1
    echo "Destroying $env environment..."
    
    terraform plan -destroy \
        -target="google_cloud_run_v2_service.app[\"$env\"]" \
        -target="google_cloud_run_v2_service.ai_chatbot[\"$env\"]" \
        -target="google_compute_instance.browser_services[\"$env\"]" \
        -target="google_storage_bucket.artifacts[\"$env\"]"

    echo ""
    echo "Destroy the $env environment? (y/N)"
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Destroying $env..."
        terraform destroy \
            -target="google_cloud_run_v2_service.app[\"$env\"]" \
            -target="google_cloud_run_v2_service.ai_chatbot[\"$env\"]" \
            -target="google_compute_instance.browser_services[\"$env\"]" \
            -target="google_storage_bucket.artifacts[\"$env\"]" \
            -auto-approve
        
        echo ""
        echo "$env environment destroyed!"
    else
        echo "$env destruction cancelled."
        return 1
    fi
}

# Check if environment argument is provided
if [ $# -eq 0 ]; then
    show_usage
fi

ENVIRONMENT=$1

# Validate environment argument
case $ENVIRONMENT in
    dev|preview|prod|all)
        ;;
    *)
        echo "Error: Invalid environment '$ENVIRONMENT'"
        show_usage
        ;;
esac

echo "Starting destruction for: $ENVIRONMENT"

# Destroy based on environment
case $ENVIRONMENT in
    dev|preview|prod)
        destroy_env "$ENVIRONMENT"
        ;;
    all)
        echo "Destroying all environments..."
        echo ""
        
        # Plan destruction for all environments
        terraform plan -destroy

        echo ""
        echo "Destroy all environments? (y/N)"
        read -r response

        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "Destroying all environments..."
            terraform destroy -auto-approve
            
            echo ""
            echo "All environments destroyed!"
        else
            echo "Destruction cancelled."
            exit 1
        fi
        ;;
esac

echo ""
echo "Destruction completed successfully!"
