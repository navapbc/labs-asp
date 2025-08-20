#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Get project info
get_project_info() {
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        print_error "No GCP project set. Please run: gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
    print_status "Using GCP project: $PROJECT_ID"
}

# Build and push container
build_and_push() {
    print_info "Building application container..."
    
    # Build the container for Cloud Run (linux/amd64)
    docker build --platform linux/amd64 -f docker/Dockerfile -t labs-asp .
    print_status "Container built for linux/amd64 platform"
    
    # Get Artifact Registry URL
    cd terraform/environments/development
    if [ ! -f terraform.tfstate ]; then
        print_error "No Terraform state found. Please run ./scripts/deploy-infrastructure.sh first"
        exit 1
    fi
    
    REPO_URL=$(terraform output -raw artifact_registry_url)
    cd ../../../
    
    print_info "Pushing to Artifact Registry: $REPO_URL"
    
    # Configure Docker auth
    gcloud auth configure-docker us-central1-docker.pkg.dev --project=$PROJECT_ID
    
    # Tag and push
    docker tag labs-asp $REPO_URL/labs-asp:latest
    docker push $REPO_URL/labs-asp:latest
    
    print_status "Container pushed successfully"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    print_info "Deploying to Cloud Run..."
    
    cd terraform/environments/development
    REPO_URL=$(terraform output -raw artifact_registry_url)
    SERVICE_NAME=$(terraform output -raw cloud_run_service_name 2>/dev/null || echo "labs-asp-main")
    cd ../../../
    
    # Deploy the service
    gcloud run deploy $SERVICE_NAME \
        --image $REPO_URL/labs-asp:latest \
        --region us-central1 \
        --allow-unauthenticated \
        --port=8080 \
        --set-env-vars="ENVIRONMENT=development" \
        --project=$PROJECT_ID
    
    print_status "Deployed to Cloud Run"
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    
    # Get the Cloud Run service URL
    cd terraform/environments/development
    SERVICE_URL=$(terraform output -raw cloud_run_service_url 2>/dev/null)
    cd ../../../
    
    if [ -n "$SERVICE_URL" ]; then
        print_info "Testing database connection at $SERVICE_URL/health"
        
        # Wait for service to be ready
        for i in {1..30}; do
            if curl -s "$SERVICE_URL/health" > /dev/null; then
                print_status "Service is healthy"
                break
            fi
            echo -n "."
            sleep 2
        done
        
        # Note: In a real deployment, you'd run migrations here
        # For now, we'll just check the health endpoint
        print_warning "Database migrations should be run manually for now"
        print_info "Connect to your Cloud Run instance and run: pnpm db:migrate:deploy"
    else
        print_warning "Could not get service URL. Please check Cloud Run deployment manually"
    fi
}

# Show deployment info
show_deployment_info() {
    cd terraform/environments/development
    
    echo
    print_status "🎉 Application deployed successfully!"
    echo
    print_info "Deployment Information:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    SERVICE_URL=$(terraform output -raw cloud_run_service_url 2>/dev/null || echo "Not available")
    BROWSER_POOL_IP=$(terraform output -raw browser_pool_internal_ip 2>/dev/null || echo "Not available")
    
    echo "🌐 Application URL: $SERVICE_URL"
    echo "🔒 Login URL: $SERVICE_URL/auth/login"
    echo "🖥️  Browser Dashboard: $SERVICE_URL/browser-dashboard"
    echo "❤️  Health Check: $SERVICE_URL/health"
    echo "🖱️  Browser Pool: $BROWSER_POOL_IP:6080/vnc.html (internal only)"
    
    echo
    print_info "Testing the deployment:"
    echo "curl $SERVICE_URL/health"
    
    echo
    print_info "Next Steps:"
    echo "1. Visit $SERVICE_URL/auth/login to access the application"
    echo "2. Use the password you set during infrastructure deployment"
    echo "3. Try the browser dashboard to see the browser-in-browser functionality"
    echo "4. Check the agent playground for web automation"
    
    cd ../../../
}

# Main function
main() {
    echo "🚀 Labs ASP Application Deployment"
    echo "═══════════════════════════════════"
    echo
    
    get_project_info
    build_and_push
    deploy_to_cloud_run
    run_migrations
    show_deployment_info
    
    print_status "Deployment complete! 🎉"
}

# Handle script arguments
case "${1:-}" in
    "build")
        get_project_info
        build_and_push
        ;;
    "deploy")
        get_project_info
        deploy_to_cloud_run
        ;;
    *)
        main
        ;;
esac
