#!/bin/bash
set -e

echo "🚀 Setting up Labs ASP development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if required tools are installed
check_requirements() {
    echo "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js version 20+ is required. Current version: $(node -v)"
        exit 1
    fi
    print_status "Node.js $(node -v) is installed"
    
    if ! command -v pnpm &> /dev/null; then
        echo "Installing pnpm..."
        npm install -g pnpm
    fi
    print_status "pnpm $(pnpm -v) is installed"
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. You'll need Docker for local development with database."
        print_warning "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    else
        print_status "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') is installed"
    fi
    
    if ! command -v gcloud &> /dev/null; then
        print_warning "Google Cloud CLI is not installed. You'll need it for production deployment."
        print_warning "Please install gcloud: https://cloud.google.com/sdk/docs/install"
    else
        print_status "Google Cloud CLI $(gcloud version --format='value(Google Cloud SDK)') is installed"
    fi
    
    if ! command -v terraform &> /dev/null; then
        print_warning "Terraform is not installed. You'll need it for infrastructure management."
        print_warning "Please install Terraform: https://developer.hashicorp.com/terraform/downloads"
    else
        print_status "Terraform $(terraform version -json | jq -r '.terraform_version') is installed"
    fi
}

# Install dependencies
install_dependencies() {
    echo "Installing project dependencies..."
    pnpm install
    print_status "Dependencies installed"
}

# Setup environment file
setup_env() {
    if [ ! -f .env ]; then
        echo "Setting up environment file..."
        cp env.example .env
        print_status "Created .env file from env.example"
        print_warning "Please edit .env file with your actual API keys and configuration"
        print_warning "Required: OPENAI_API_KEY, ANTHROPIC_API_KEY, EXA_API_KEY"
    else
        print_status ".env file already exists"
    fi
}

# Setup local database with Docker
setup_database() {
    if command -v docker &> /dev/null; then
        echo "Setting up local database..."
        
        if [ ! -f .env.local ]; then
            echo "Creating .env.local for Docker development..."
            cat > .env.local << 'EOF'
# Local development overrides
DATABASE_URL="postgresql://app_user:app_password@db:5432/app_db"
REDIS_URL="redis://redis:6379"
EOF
            print_status "Created .env.local file"
        fi
        
        # Start the database
        pnpm docker:dev -d
        print_status "Started local database with Docker"
        
        # Wait for database to be ready
        echo "Waiting for database to be ready..."
        sleep 10
        
        # Run migrations
        echo "Running database migrations..."
        DATABASE_URL="postgresql://app_user:app_password@localhost:5432/app_db" pnpm db:migrate:deploy
        print_status "Database migrations completed"
        
    else
        print_warning "Docker not available. Please set up your database manually."
        print_warning "Update DATABASE_URL in .env to point to your database."
    fi
}

# Generate Prisma client
generate_prisma() {
    echo "Generating Prisma client..."
    npx prisma generate
    print_status "Prisma client generated"
}

# Build the application
build_app() {
    echo "Building application..."
    pnpm build
    print_status "Application built successfully"
}

# Main setup flow
main() {
    echo "🏗️  Labs ASP Setup Script"
    echo "========================"
    
    check_requirements
    echo
    
    install_dependencies
    echo
    
    setup_env
    echo
    
    generate_prisma
    echo
    
    setup_database
    echo
    
    build_app
    echo
    
    echo "🎉 Setup complete!"
    echo
    echo "Next steps:"
    echo "1. Edit .env file with your API keys"
    echo "2. Run 'pnpm dev' to start the development server"
    echo "3. Visit http://localhost:4111/auth/login"
    echo
    echo "For production deployment:"
    echo "1. Set up GCP project and configure terraform/environments/*/terraform.tfvars"
    echo "2. Run 'terraform init' and 'terraform apply' in terraform/environments/development"
    echo "3. Configure GitHub secrets for CI/CD"
    echo
    print_status "Happy coding! 🚀"
}

# Run main function
main "$@"
