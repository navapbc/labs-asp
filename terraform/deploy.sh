#!/bin/bash

# Multi-environment deployment script for Labs ASP
# Usage: ./deploy.sh [dev|preview|prod|all]

set -e

# Function to show usage
show_usage() {
    echo "Usage: $0 [dev|preview|prod|all]"
    echo ""
    echo "Examples:"
    echo "  $0 dev       # Deploy only dev environment"
    echo "  $0 preview   # Deploy only preview environment"
    echo "  $0 prod      # Deploy only prod environment"
    echo "  $0 all       # Deploy all environments"
    echo ""
    exit 1
}

# Function to deploy a specific environment
deploy_env() {
    local env=$1
    echo "Deploying $env environment..."
    
    terraform plan \
        -target="google_cloud_run_v2_service.app[\"$env\"]" \
        -target="google_cloud_run_v2_service.ai_chatbot[\"$env\"]" \
        -target="google_compute_instance.browser_services[\"$env\"]" \
        -target="google_storage_bucket.artifacts[\"$env\"]"

    echo ""
    echo "Apply the $env deployment? (y/N)"
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Applying $env deployment..."
        terraform apply \
            -target="google_cloud_run_v2_service.app[\"$env\"]" \
            -target="google_cloud_run_v2_service.ai_chatbot[\"$env\"]" \
            -target="google_compute_instance.browser_services[\"$env\"]" \
            -target="google_storage_bucket.artifacts[\"$env\"]" \
            -auto-approve
        
        echo ""
        echo "$env environment deployed!"
        echo ""
        echo "Getting $env info..."
        show_env_info $env
    else
        echo "$env deployment cancelled."
        return 1
    fi
}

# Function to show environment info
show_env_info() {
    local env=$1
    echo "=== $env ENVIRONMENT ==="
    echo "Cloud Run Services:"
    echo "  Mastra App: $(terraform output -json | jq -r ".cloud_run_urls.value[\"$env\"].mastra_app // \"Not available\"")"
    echo "  AI Chatbot: $(terraform output -json | jq -r ".cloud_run_urls.value[\"$env\"].ai_chatbot // \"Not available\"")"
    echo ""
    echo "Browser Services VM:"
    echo "  External IP: $(terraform output -json | jq -r ".browser_services_external_ips.value[\"$env\"] // \"Not available\"")"
    echo "  Playwright MCP: $(terraform output -json | jq -r ".playwright_mcp_urls.value[\"$env\"] // \"Not available\"")"
    echo "  Browser Streaming: $(terraform output -json | jq -r ".browser_streaming_urls.value[\"$env\"] // \"Not available\"")"
    echo "  SSH: $(terraform output -json | jq -r ".browser_services_ssh_commands.value[\"$env\"] // \"Not available\"")"
    echo ""
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

echo "Starting deployment for: $ENVIRONMENT"

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    terraform init
fi

# Deploy based on environment
case $ENVIRONMENT in
    dev|preview|prod)
        deploy_env "$ENVIRONMENT"
        ;;
    all)
        echo "Deploying all environments..."
        echo ""
        
        # Plan for all environments
        terraform plan

        echo ""
        echo "Apply deployment for all environments? (y/N)"
        read -r response

        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "Applying all deployments..."
            terraform apply -auto-approve
            
            echo ""
            echo "All environments deployed!"
            echo ""
            echo "Getting info for all environments..."
            for env in dev preview prod; do
                show_env_info $env
            done
        else
            echo "Deployment cancelled."
            exit 1
        fi
        ;;
esac

echo ""
echo "Deployment completed successfully!"
echo ""
echo "Note: It may take 5-10 minutes for all services to be fully ready."
echo "Check browser services startup logs with:"
echo "  gcloud compute ssh browser-services-$ENVIRONMENT --zone=us-west1-a --command='sudo tail -f /var/log/browser-services-startup.log'"
