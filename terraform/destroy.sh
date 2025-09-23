#!/bin/bash

# Unified destruction script for playground and client VMs
# Usage: ./destroy.sh [playground|client|both]

set -e

# Function to show usage
show_usage() {
    echo "Usage: $0 [playground|client|both]"
    echo ""
    echo "Examples:"
    echo "  $0 playground    # Destroy only playground VM"
    echo "  $0 client        # Destroy only client VM"
    echo "  $0 both          # Destroy both VMs"
    echo ""
    exit 1
}

# Function to destroy a specific environment
destroy_env() {
    local env=$1
    echo "Destroying $env VM..."
    
    terraform plan -destroy \
        -target="google_compute_firewall.allow_vm[\"$env\"]" \
        -target="google_compute_instance.vm[\"$env\"]"

    echo ""
    echo "Destroy the $env VM? (y/N)"
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Destroying $env..."
        terraform destroy \
            -target="google_compute_firewall.allow_vm[\"$env\"]" \
            -target="google_compute_instance.vm[\"$env\"]" \
            -auto-approve
        
        echo ""
        echo "$env VM destroyed!"
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
    playground|client|both)
        ;;
    *)
        echo "Error: Invalid environment '$ENVIRONMENT'"
        show_usage
        ;;
esac

echo "Starting destruction for: $ENVIRONMENT"

# Destroy based on environment
case $ENVIRONMENT in
    playground)
        destroy_env "playground"
        ;;
    client)
        destroy_env "client"
        ;;
    both)
        echo "Destroying both environments..."
        echo ""
        
        # Plan destruction for both environments
        terraform plan -destroy \
            -target="google_compute_firewall.allow_vm[\"playground\"]" \
            -target="google_compute_instance.vm[\"playground\"]" \
            -target="google_compute_firewall.allow_vm[\"client\"]" \
            -target="google_compute_instance.vm[\"client\"]"

        echo ""
        echo "Destroy both environments? (y/N)"
        read -r response

        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "Destroying both environments..."
            terraform destroy \
                -target="google_compute_firewall.allow_vm[\"playground\"]" \
                -target="google_compute_instance.vm[\"playground\"]" \
                -target="google_compute_firewall.allow_vm[\"client\"]" \
                -target="google_compute_instance.vm[\"client\"]" \
                -auto-approve
            
            echo ""
            echo "Both VMs destroyed!"
        else
            echo "Destruction cancelled."
            exit 1
        fi
        ;;
esac

echo ""
echo "Destruction completed successfully!"
