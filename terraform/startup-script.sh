#!/bin/bash

# Exit on any error
set -e

# Log all output
exec > >(tee /var/log/startup-script.log)
exec 2>&1

echo "=== Starting Labs ASP Unified VM setup at $(date) ==="

# Update system packages
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
echo "Installing Docker..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Install Git
apt-get install -y git

# Create application directory
mkdir -p /opt/labs-asp
cd /opt/labs-asp

# Clone the repository
echo "Cloning repository..."
git clone -b ${github_branch} https://github.com/${github_repo}.git .

# Install Google Cloud SDK for secret access
echo "Installing Google Cloud SDK..."
export CLOUDSDK_INSTALL_DIR=/opt
curl -sSL https://sdk.cloud.google.com | bash
source /opt/google-cloud-sdk/path.bash.inc
export PATH="/opt/google-cloud-sdk/bin:$PATH"

# Add this VM's IP to the database authorized networks
echo "Adding VM IP to database authorized networks..."
VM_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H 'Metadata-Flavor: Google')
gcloud sql instances patch app-dev --authorized-networks=$(gcloud sql instances describe app-dev --format="value(settings.ipConfiguration.authorizedNetworks[].value)" | tr '\n' ',' | tr ';' ',' | sed 's/,$//'),$VM_IP/32 || echo "Warning: Could not update database authorized networks"

# Create .env file with secrets from Google Secret Manager
echo "Creating .env file with secrets..."
cat > .env << EOF
# API Keys from Secret Manager
OPENAI_API_KEY=$(gcloud secrets versions access latest --secret="openai-api-key" 2>/dev/null || echo "")
ANTHROPIC_API_KEY=$(gcloud secrets versions access latest --secret="anthropic-api-key" 2>/dev/null || echo "")
GOOGLE_GENERATIVE_AI_API_KEY=$(gcloud secrets versions access latest --secret="google-generative-ai-key" 2>/dev/null || echo "")
EXA_API_KEY=$(gcloud secrets versions access latest --secret="exa-api-key" 2>/dev/null || echo "")
GROK_API_KEY=$(gcloud secrets versions access latest --secret="grok-api-key" 2>/dev/null || echo "")

# Database Configuration (using app-dev)
DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url-dev" 2>/dev/null || echo "")

# Authentication
MASTRA_JWT_SECRET=$(gcloud secrets versions access latest --secret="mastra-jwt-secret" 2>/dev/null || echo "")
MASTRA_APP_PASSWORD=$(gcloud secrets versions access latest --secret="mastra-app-password" 2>/dev/null || echo "")

# Vertex AI Configuration
GOOGLE_VERTEX_LOCATION=us-east5
GOOGLE_VERTEX_PROJECT=nava-labs
GOOGLE_APPLICATION_CREDENTIALS="/app/vertex-ai-credentials.json"

# Server Configuration
NODE_ENV=production
PORT=4111
BROWSER_STREAMING_PORT=8933
MASTRA_APP_URL=http://localhost:4111

# CORS Configuration
CORS_ORIGINS="http://localhost:4111,http://0.0.0.0:4111,http://localhost:3000,http://0.0.0.0:3000,*"

# OpenTelemetry Configuration
OTEL_EXPORTER_OTLP_ENDPOINT=https://cloudtrace.googleapis.com/v1/projects/nava-labs/traces:batchWrite
OTEL_EXPORTER_OTLP_HEADERS=Content-Type=application/json
GOOGLE_CLOUD_PROJECT=nava-labs

# Disable telemetry for development
TELEMETRY_DISABLED=true
EOF

# Create client .env.local file with secrets
echo "Creating client .env.local file with secrets..."
mkdir -p client
cat > client/.env.local << EOF
# Next.js Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXTAUTH_URL=http://$VM_IP:3000

# Authentication
AUTH_SECRET=$(gcloud secrets versions access latest --secret="auth-secret" 2>/dev/null || echo "supersecretdevkeythatishs256safe!NavaPBC")

# API Keys from Secret Manager
OPENAI_API_KEY=$(gcloud secrets versions access latest --secret="openai-api-key" 2>/dev/null || echo "")
ANTHROPIC_API_KEY=$(gcloud secrets versions access latest --secret="anthropic-api-key" 2>/dev/null || echo "")
GOOGLE_GENERATIVE_AI_API_KEY=$(gcloud secrets versions access latest --secret="google-generative-ai-key" 2>/dev/null || echo "")
EXA_API_KEY=$(gcloud secrets versions access latest --secret="exa-api-key" 2>/dev/null || echo "")
XAI_API_KEY=$(gcloud secrets versions access latest --secret="xai-api-key" 2>/dev/null || echo "")

# Database Configuration
DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url-dev" 2>/dev/null || echo "")
POSTGRES_URL=$(gcloud secrets versions access latest --secret="postgres-url" 2>/dev/null || echo "")

# Google Cloud Configuration
GOOGLE_VERTEX_LOCATION=us-east5
GOOGLE_VERTEX_PROJECT=nava-labs
GOOGLE_APPLICATION_CREDENTIALS=/app/vertex-ai-credentials.json
GOOGLE_CLOUD_PROJECT=nava-labs
GCS_BUCKET_NAME=labs-asp-artifacts-dev

# Mastra Backend Integration (for web automation)
MASTRA_API_URL=http://localhost:4111
MASTRA_SERVER_URL=http://localhost:4111
MASTRA_JWT_TOKEN=$(gcloud secrets versions access latest --secret="mastra-jwt-token" 2>/dev/null || echo "")

# Browser streaming (internal to container)
BROWSER_STREAMING_HOST=localhost
BROWSER_STREAMING_PORT=8933

# Server Configuration
PORT=3000
EOF

# Create Vertex AI credentials file from Secret Manager
echo "Creating Vertex AI credentials file..."
gcloud secrets versions access latest --secret="vertex-ai-credentials" > vertex-ai-credentials.json 2>/dev/null || {
  echo "Warning: Could not retrieve vertex-ai-credentials from Secret Manager, using fallback"
  # Create a minimal fallback (though Vertex AI features may not work)
  cat > vertex-ai-credentials.json << 'VERTEX_EOF'
{
  "type": "service_account",
  "project_id": "nava-labs",
  "client_email": "vertex-ai@nava-labs.iam.gserviceaccount.com"
}
VERTEX_EOF
}

# Copy vertex AI credentials to client directory
cp vertex-ai-credentials.json client/vertex-ai-credentials.json

# Build and run the Docker containers
echo "Building Docker containers..."
docker compose build

echo "Starting all services..."
docker compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 60

# Check service status
echo "Checking service status..."
docker compose ps

# Check if services are responding
echo "Testing service endpoints..."
curl -f http://localhost:8931/health || echo "Playwright MCP not ready yet"
curl -f http://localhost:4111/health || echo "Mastra App not ready yet"
curl -f http://localhost:3000/health || curl -f http://localhost:3000 || echo "AI Chatbot not ready yet"

# Set up log rotation for Docker containers
echo "Setting up log rotation..."
cat > /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF

# Create systemd service to auto-restart containers on boot
echo "Creating systemd service..."
cat > /etc/systemd/system/labs-asp-unified.service << 'EOF'
[Unit]
Description=Labs ASP Unified Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/labs-asp
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable labs-asp-unified.service

echo "=== Labs ASP Unified VM setup completed at $(date) ==="
echo "Services should be available at:"
echo "- AI Chatbot (Next.js): http://$VM_IP:3000"
echo "- Mastra App: http://$VM_IP:4111"
echo "- Playwright MCP: http://$VM_IP:8931"
echo "- Browser Streaming: ws://$VM_IP:8933"
