#!/bin/bash

# Exit on any error
set -e

# Log all output
exec > >(tee /var/log/browser-services-startup.log)
exec 2>&1

echo "=== Starting Browser Services VM setup for ${environment} at $(date) ==="

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
mkdir -p /opt/browser-services
cd /opt/browser-services

# Clone the repository
echo "Cloning repository..."
git clone -b ${github_branch} https://github.com/${github_repo}.git .

# Install Google Cloud SDK for secret access
echo "Installing Google Cloud SDK..."
export CLOUDSDK_INSTALL_DIR=/opt
curl -sSL https://sdk.cloud.google.com | bash
source /opt/google-cloud-sdk/path.bash.inc
export PATH="/opt/google-cloud-sdk/bin:$PATH"

# Create simplified docker-compose for browser services only
echo "Creating browser services docker-compose..."
cat > docker-compose.browser.yml << 'EOF'
services:
  # Playwright MCP Server
  playwright-mcp:
    build:
      context: ./playwright-mcp
      dockerfile: Dockerfile
    ports:
      - "8931:8931"   # Playwright MCP server
      - "8933:8933"   # Browser streaming WebSocket port
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    networks:
      - browser-network

networks:
  browser-network:
    driver: bridge
EOF

# Build and run the browser services
echo "Building browser services Docker containers..."
docker compose -f docker-compose.browser.yml build

echo "Starting browser services..."
docker compose -f docker-compose.browser.yml up -d

# Wait for services to be ready
echo "Waiting for browser services to start..."
sleep 30

# Check service status
echo "Checking service status..."
docker compose -f docker-compose.browser.yml ps

# Check if services are responding
echo "Testing service endpoints..."
curl -f http://localhost:8931/health || echo "Playwright MCP not ready yet"

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
cat > /etc/systemd/system/browser-services.service << 'EOF'
[Unit]
Description=Browser Services Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/browser-services
ExecStart=/usr/bin/docker compose -f docker-compose.browser.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.browser.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable browser-services.service

echo "=== Browser Services VM setup completed for ${environment} at $(date) ==="
echo "Browser services should be available at:"
echo "- Playwright MCP: http://$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H 'Metadata-Flavor: Google'):8931"
echo "- Browser Streaming: ws://$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H 'Metadata-Flavor: Google'):8933"
