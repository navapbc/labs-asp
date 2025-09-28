#!/bin/bash

# Browser VM startup script for Container-Optimized OS
# This script pulls and runs the browser-streaming container

set -euo pipefail

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [STARTUP] $1" | systemd-cat -t browser-startup
}

log "Starting browser service initialization..."

# Configure Docker daemon for GCR access (COS compatible)
log "Configuring Docker for Artifact Registry..."
/usr/bin/docker-credential-gcr configure-docker --registries=us-central1-docker.pkg.dev

# Alternative approach if the above fails
if [ $? -ne 0 ]; then
    log "Using gcloud auth configure-docker as fallback..."
    gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
fi

# Pull the browser streaming image
log "Pulling browser streaming image: ${browser_image}"
docker pull "${browser_image}" || {
    log "Failed to pull image ${browser_image}"
    exit 1
}

# Stop any existing container
log "Stopping any existing browser-streaming container..."
docker stop browser-streaming 2>/dev/null || true
docker rm browser-streaming 2>/dev/null || true

# Create artifacts directory for browser sessions
mkdir -p /tmp/artifacts
chmod 755 /tmp/artifacts

# Run the browser streaming container
log "Starting browser streaming container..."
docker run -d \
    --name browser-streaming \
    --restart unless-stopped \
    -p 8931:8931 \
    -p 8933:8933 \
    -v /tmp/artifacts:/app/artifacts \
    -e ENVIRONMENT="${environment}" \
    -e GCP_PROJECT_ID="${project_id}" \
    "${browser_image}"

# Wait for container to be healthy
log "Waiting for browser service to be ready..."
for i in {1..30}; do
    if docker exec browser-streaming curl -f http://localhost:8931/health 2>/dev/null; then
        log "Browser service is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        log "Browser service failed to become ready after 30 attempts"
        docker logs browser-streaming
        exit 1
    fi
    sleep 2
done

# Set up log forwarding to Cloud Logging
log "Setting up log forwarding..."
docker logs -f browser-streaming &

log "Browser service startup complete!"