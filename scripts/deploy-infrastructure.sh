#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    print_status "gcloud CLI is installed"
    
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    print_status "Terraform is installed"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    print_status "Docker is installed"
}

# Get project ID
get_project_id() {
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        if [ -z "$PROJECT_ID" ]; then
            print_error "No GCP project set. Please run: gcloud config set project YOUR_PROJECT_ID"
            exit 1
        fi
    fi
    print_status "Using GCP project: $PROJECT_ID"
}

# Enable required APIs
enable_apis() {
    print_info "Enabling required GCP APIs..."
    gcloud services enable \
        compute.googleapis.com \
        run.googleapis.com \
        sql-component.googleapis.com \
        sqladmin.googleapis.com \
        secretmanager.googleapis.com \
        artifactregistry.googleapis.com \
        cloudbuild.googleapis.com \
        --project=$PROJECT_ID
    print_status "APIs enabled"
}

# Set up Terraform variables
setup_terraform_vars() {
    cd terraform/environments/development
    
    if [ ! -f terraform.tfvars ]; then
        print_info "Creating terraform.tfvars..."
        cat > terraform.tfvars << EOF
# GCP Configuration
project_id = "$PROJECT_ID"
region     = "us-central1"
zone       = "us-central1-a"
EOF
        print_status "terraform.tfvars created"
    else
        print_status "terraform.tfvars already exists"
    fi
}

# Initialize Terraform
init_terraform() {
    print_info "Initializing Terraform..."
    terraform init
    print_status "Terraform initialized"
}

# Plan Terraform
plan_terraform() {
    print_info "Planning Terraform deployment..."
    terraform plan -out=tfplan
    print_status "Terraform plan created"
    
    print_warning "Review the plan above. Press Enter to continue or Ctrl+C to abort..."
    read -r
}

# Apply Terraform
apply_terraform() {
    print_info "Applying Terraform configuration..."
    print_warning "This will take 10-15 minutes..."
    
    terraform apply tfplan
    print_status "Infrastructure deployed successfully!"
}

# Set up secrets
setup_secrets() {
    print_info "Setting up secrets in Google Secret Manager..."
    
    # Check if secrets already exist
    if gcloud secrets describe openai-api-key --project=$PROJECT_ID &>/dev/null; then
        print_warning "Secrets already exist. Skipping secret creation."
        return
    fi
    
    echo
    print_warning "You need to provide API keys for the following services:"
    
    # OpenAI API Key
    echo -n "Enter your OpenAI API Key: "
    read -r OPENAI_KEY
    echo "$OPENAI_KEY" | gcloud secrets create openai-api-key --data-file=- --project=$PROJECT_ID
    
    # Anthropic API Key
    echo -n "Enter your Anthropic API Key: "
    read -r ANTHROPIC_KEY
    echo "$ANTHROPIC_KEY" | gcloud secrets create anthropic-api-key --data-file=- --project=$PROJECT_ID
    
    # Exa API Key
    echo -n "Enter your Exa API Key: "
    read -r EXA_KEY
    echo "$EXA_KEY" | gcloud secrets create exa-api-key --data-file=- --project=$PROJECT_ID
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    echo "$JWT_SECRET" | gcloud secrets create mastra-jwt-secret --data-file=- --project=$PROJECT_ID
    
    # App password
    echo -n "Enter a secure password for app login: "
    read -r APP_PASSWORD
    echo "$APP_PASSWORD" | gcloud secrets create mastra-app-password --data-file=- --project=$PROJECT_ID
    
    print_status "Secrets created successfully"
}

# Build and push container
build_and_push() {
    cd ../../../  # Back to project root
    
    print_info "Building Docker container..."
    docker build -f docker/Dockerfile -t labs-asp .
    print_status "Container built"
    
    # Get Artifact Registry URL from Terraform output
    cd terraform/environments/development
    REPO_URL=$(terraform output -raw artifact_registry_url)
    cd ../../../
    
    print_info "Pushing to Artifact Registry..."
    
    # Configure Docker auth
    gcloud auth configure-docker us-central1-docker.pkg.dev --project=$PROJECT_ID
    
    # Tag and push
    docker tag labs-asp $REPO_URL/labs-asp:latest
    docker push $REPO_URL/labs-asp:latest
    
    print_status "Container pushed to Artifact Registry"
}

# Get deployment info
show_deployment_info() {
    cd terraform/environments/development
    
    echo
    print_status "🎉 Deployment completed successfully!"
    echo
    print_info "Deployment Information:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Get outputs
    CLOUD_RUN_URL=$(terraform output -raw cloud_run_service_url 2>/dev/null || echo "Not deployed yet")
    BROWSER_POOL_IP=$(terraform output -raw browser_pool_internal_ip 2>/dev/null || echo "Not available")
    ARTIFACT_REGISTRY=$(terraform output -raw artifact_registry_url 2>/dev/null || echo "Not available")
    
    echo "🌐 Main Application: $CLOUD_RUN_URL"
    echo "🖥️  Browser Pool IP: $BROWSER_POOL_IP (internal)"
    echo "📦 Container Registry: $ARTIFACT_REGISTRY"
    echo "🗄️  Database: Private Cloud SQL instance"
    
    echo
    print_info "Next Steps:"
    echo "1. The infrastructure is deployed but you need to deploy your app container"
    echo "2. Run: ./scripts/deploy-app.sh"
    echo "3. Visit your Cloud Run URL to test the application"
    echo "4. Check the browser dashboard at: \$CLOUD_RUN_URL/browser-dashboard"
    
    cd ../../../
}

# Main deployment flow
main() {
    echo "🚀 Labs ASP Infrastructure Deployment"
    echo "═══════════════════════════════════════"
    echo
    
    check_prerequisites
    get_project_id
    enable_apis
    setup_terraform_vars
    init_terraform
    plan_terraform
    apply_terraform
    setup_secrets
    build_and_push
    show_deployment_info
    
    print_status "All done! 🎉"
}

# Handle script arguments
case "${1:-}" in
    "plan")
        check_prerequisites
        get_project_id
        setup_terraform_vars
        cd terraform/environments/development
        init_terraform
        terraform plan
        ;;
    "apply")
        check_prerequisites
        get_project_id
        cd terraform/environments/development
        terraform apply
        ;;
    "destroy")
        print_warning "This will destroy all infrastructure. Are you sure? (yes/no)"
        read -r confirmation
        if [ "$confirmation" = "yes" ]; then
            cd terraform/environments/development
            terraform destroy
        else
            echo "Aborted."
        fi
        ;;
    *)
        main
        ;;
esac
