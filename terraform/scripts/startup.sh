#!/bin/bash

# VM startup script for Container-Optimized OS
# Runs browser-streaming and mastra-app containers

set -euo pipefail

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [STARTUP] $1" | systemd-cat -t vm-startup
}

log "Starting services initialization..."

# Configure Docker for Artifact Registry
log "Configuring Docker for Artifact Registry..."
export DOCKER_CONFIG=/tmp/.docker
mkdir -p "$DOCKER_CONFIG"

if command -v docker-credential-gcr >/dev/null 2>&1; then
    log "Using docker-credential-gcr..."
    docker-credential-gcr configure-docker --registries=us-central1-docker.pkg.dev
else
    log "Using gcloud auth configure-docker..."
    gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
fi

# Pull images
log "Pulling browser-streaming image: ${browser_image}"
DOCKER_CONFIG="$DOCKER_CONFIG" docker pull "${browser_image}" || {
    log "Failed to pull browser image"
    exit 1
}

log "Pulling mastra-app image: ${mastra_image}"
DOCKER_CONFIG="$DOCKER_CONFIG" docker pull "${mastra_image}" || {
    log "Failed to pull mastra image"
    exit 1
}

# Create Docker network
log "Creating Docker network..."
docker network create mastra-network 2>/dev/null || log "Network already exists"

# Stop and remove existing containers
log "Cleaning up existing containers..."
docker stop browser-streaming mastra-app 2>/dev/null || true
docker rm browser-streaming mastra-app 2>/dev/null || true

# Create artifacts directory
mkdir -p /tmp/artifacts
chmod 755 /tmp/artifacts

# Start browser-streaming container
log "Starting browser-streaming container..."
docker run -d \
    --name browser-streaming \
    --restart unless-stopped \
    --network mastra-network \
    -p 8931:8931 \
    -p 8933:8933 \
    -v /tmp/artifacts:/app/artifacts \
    -e ENVIRONMENT="${environment}" \
    -e GCP_PROJECT_ID="${project_id}" \
    "${browser_image}"

# Wait for browser service to be running
log "Waiting for browser-streaming container to start..."
sleep 10
if ! docker ps | grep -q browser-streaming; then
    log "Browser-streaming container failed to start"
    docker logs browser-streaming
    exit 1
fi
log "Browser-streaming container is running"

# Start mastra-app container
log "Starting mastra-app container..."
docker run -d \
    --name mastra-app \
    --restart unless-stopped \
    --network mastra-network \
    -p 4112:4112 \
    -v /tmp/artifacts:/app/artifacts \
    -e PLAYWRIGHT_MCP_URL=http://browser-streaming:8931/mcp \
    -e BROWSER_STREAMING_URL=ws://browser-streaming:8933 \
    -e NODE_ENV=production \
    -e ENVIRONMENT="${environment}" \
    -e GCP_PROJECT_ID="${project_id}" \
    -e DATABASE_URL="${database_url}" \
    -e OPENAI_API_KEY="${openai_api_key}" \
    -e ANTHROPIC_API_KEY="${anthropic_api_key}" \
    -e EXA_API_KEY="${exa_api_key}" \
    -e GOOGLE_GENERATIVE_AI_API_KEY="${google_ai_key}" \
    -e GROK_API_KEY="${grok_api_key}" \
    -e XAI_API_KEY="${xai_api_key}" \
    -e MASTRA_JWT_SECRET="${mastra_jwt_secret}" \
    -e MASTRA_APP_PASSWORD="${mastra_app_password}" \
    -e MASTRA_JWT_TOKEN="${mastra_jwt_token}" \
    -e GOOGLE_VERTEX_LOCATION=us-east5 \
    -e GOOGLE_VERTEX_PROJECT="${project_id}" \
    -e GOOGLE_CLOUD_PROJECT="${project_id}" \
    -e CORS_ORIGINS="*" \
    "${mastra_image}"

# Wait for mastra service to be running and healthy
log "Waiting for mastra-app container to start..."
sleep 15
if ! docker ps | grep -q mastra-app; then
    log "Mastra-app container failed to start"
    docker logs mastra-app
    exit 1
fi

# Check mastra health endpoint (it has one)
log "Checking mastra-app health..."
for i in {1..30}; do
    if docker exec mastra-app curl -f http://localhost:4112/health 2>/dev/null; then
        log "Mastra-app is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        log "Warning: Mastra-app health check failed, but container is running"
        docker logs mastra-app | tail -20
    fi
    sleep 2
done

# Set up log forwarding
log "Setting up log forwarding..."
docker logs -f browser-streaming &
docker logs -f mastra-app &

log "All services started successfully!"

# Signal readiness
ZONE=$(curl -H "Metadata-Flavor: Google" -s http://metadata.google.internal/computeMetadata/v1/instance/zone | cut -d/ -f4)
INSTANCE_NAME=$(curl -H "Metadata-Flavor: Google" -s http://metadata.google.internal/computeMetadata/v1/instance/name)

gcloud compute instances add-metadata "$${INSTANCE_NAME}" \
  --metadata services-ready=true \
  --zone="$${ZONE}" || {
  log "Warning: Could not set readiness metadata"
}

log "Services ready!"
