#!/bin/bash

# Unified deployment script for playground and client VMs
# Usage: ./deploy.sh [playground|client|both]

set -e

# Function to show usage
show_usage() {
    echo "Usage: $0 [playground|client|both]"
    echo ""
    echo "Examples:"
    echo "  $0 playground    # Deploy only playground VM"
    echo "  $0 client        # Deploy only client VM"
    echo "  $0 both          # Deploy both VMs"
    echo ""
    exit 1
}

# Function to deploy a specific environment
deploy_env() {
    local env=$1
    echo "Deploying $env VM..."
    
    terraform plan \
        -target="google_compute_firewall.allow_vm[\"$env\"]" \
        -target="google_compute_instance.vm[\"$env\"]"

    echo ""
    echo "Apply the $env deployment? (y/N)"
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Applying $env deployment..."
        terraform apply \
            -target="google_compute_firewall.allow_vm[\"$env\"]" \
            -target="google_compute_instance.vm[\"$env\"]" \
            -auto-approve
        
        echo ""
        echo "$env VM deployed!"
        echo ""
        echo "Getting $env info..."
        terraform output ${env}_url
        terraform output ${env}_ssh_command
        
        if [ "$env" = "client" ]; then
            echo ""
            echo "Note: It may take 5-10 minutes for the client to be fully ready."
            echo "Check the startup logs with:"
            echo "  gcloud compute ssh client --zone=us-west1-a --command='sudo tail -f /var/log/startup-script-client.log'"
        fi
    else
        echo "$env deployment cancelled."
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
    playground|client|both)
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
    playground)
        deploy_env "playground"
        ;;
    client)
        deploy_env "client"
        ;;
    both)
        echo "Deploying both environments..."
        echo ""
        
        # Plan for both environments
        terraform plan \
            -target="google_compute_firewall.allow_vm[\"playground\"]" \
            -target="google_compute_instance.vm[\"playground\"]" \
            -target="google_compute_firewall.allow_vm[\"client\"]" \
            -target="google_compute_instance.vm[\"client\"]"

        echo ""
        echo "Apply deployment for both environments? (y/N)"
        read -r response

        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "Applying both deployments..."
            terraform apply \
                -target="google_compute_firewall.allow_vm[\"playground\"]" \
                -target="google_compute_instance.vm[\"playground\"]" \
                -target="google_compute_firewall.allow_vm[\"client\"]" \
                -target="google_compute_instance.vm[\"client\"]" \
                -auto-approve
            
            echo ""
            echo "Both VMs deployed!"
            echo ""
            echo "Getting info for both environments..."
            echo "=== PLAYGROUND ==="
            terraform output playground_url
            terraform output playground_ssh_command
            echo ""
            echo "=== CLIENT ==="
            terraform output client_url
            terraform output client_ssh_command
            
            echo ""
            echo "Note: It may take 5-10 minutes for services to be fully ready."
        else
            echo "Deployment cancelled."
            exit 1
        fi
        ;;
esac

echo ""
echo "Deployment completed successfully!"
