# Docker Setup Guide

This guide covers running the entire application stack using Docker and Docker Compose. Docker setup is the recommended approach as it eliminates local PostgreSQL installation issues.

## Overview

The Docker setup includes:
- **PostgreSQL Database** (port 5434)
- **Mastra Backend** (port 4111)
- **AI Chatbot Frontend** (port 3000)
- **Browser Streaming Service** (ports 8931, 8933)

## Prerequisites

You'll need:
- **Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop)
- **Git**: For cloning the repository

That's it! No Node.js, PostgreSQL, or pnpm installation required.

## Quick Start

### 1. Clone the Repository

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/navapbc/labs-asp.git
cd labs-asp

# Or if already cloned, initialize submodules
git submodule update --init --recursive
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# API Keys (ask your team lead for these)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
EXA_API_KEY=your_exa_key_here

# Database connection (for Docker containers)
# Use service name 'postgres' with internal port 5432
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/benefits_db"
```

Create `client/.env.local` file:

```env
# Copy from client/.env.example and update these values:
AUTH_SECRET=temp-secret-for-local-dev

# Database connection (for Docker containers)
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/benefits_db"

# API Keys (same as root .env)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Mastra Backend URL
MASTRA_SERVER_URL=http://localhost:4111
NEXT_PUBLIC_MASTRA_SERVER_URL=http://localhost:4111
```

### 3. Start All Services

```bash
# Start everything in background mode
docker-compose up -d

# View logs to confirm everything started
docker-compose logs -f
```

### 4. Run Database Migrations (First Time Only)

```bash
# Wait for database to be ready, then run migrations
docker-compose exec postgres psql -U postgres -d benefits_db -c "SELECT 1"

# Run migrations
node migrations/run-migrations.js
```

### 5. Access the Application

- **AI Chatbot Frontend**: http://localhost:3000
- **Mastra Backend**: http://localhost:4111
- **Mastra Playground**: http://localhost:4111/
- **Mastra API**: http://localhost:4111/api

## Daily Usage

### Starting the Application

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Viewing Logs

```bash
# All services (follow mode - real-time updates)
docker-compose logs -f

# Specific service
docker-compose logs -f ai-chatbot
docker-compose logs -f mastra-app

# Last 50 lines only
docker-compose logs --tail 50 mastra-app
```

### Stopping the Application

```bash
# Stop all services (keeps data)
docker-compose down

# Stop and remove volumes (DELETES DATABASE DATA!)
docker-compose down -v
```

### Restarting Services

```bash
# Restart specific service
docker-compose restart mastra-app

# Restart all services
docker-compose restart
```

## Development Workflow

### After Making Code Changes

```bash
# Rebuild and restart the affected service
docker-compose up -d --build mastra-app

# Or rebuild without cache if having issues
docker-compose build --no-cache mastra-app
docker-compose up -d mastra-app
```

### Updating Dependencies

When `package.json` changes:

```bash
# Rebuild the service to install new dependencies
docker-compose build --no-cache mastra-app
docker-compose up -d mastra-app
```

### Accessing Service Shells

```bash
# Access mastra-app container
docker-compose exec mastra-app sh

# Access database
docker-compose exec postgres psql -U postgres -d benefits_db

# Run commands in container
docker-compose exec mastra-app pnpm --version
```

## Database Management

### Running Migrations

```bash
# From host machine
node migrations/run-migrations.js

# Or from inside container
docker-compose exec mastra-app pnpm tsx migrations/run-migrations.js
```

### Accessing Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d benefits_db

# View tables
docker-compose exec postgres psql -U postgres -d benefits_db -c "\dt"

# Query data
docker-compose exec postgres psql -U postgres -d benefits_db -c "SELECT * FROM participants LIMIT 5;"
```

### Database Backup & Restore

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres benefits_db > backup-$(date +%Y%m%d).sql

# Restore
docker-compose exec -T postgres psql -U postgres benefits_db < backup-20240101.sql
```

### Reset Database

```bash
# Stop services and remove volumes
docker-compose down -v

# Start services (creates fresh database)
docker-compose up -d

# Wait for database to be ready
sleep 10

# Run migrations
node migrations/run-migrations.js
```

## Troubleshooting

### Services Won't Start

```bash
# Check what's running
docker-compose ps

# View logs for errors
docker-compose logs

# Try rebuilding everything
docker-compose down
docker-compose up -d --build
```

### Database Connection Errors

```bash
# Check if postgres is healthy
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Port Already in Use

If you get "port already allocated" errors:

```bash
# Find what's using the port
lsof -i :3000  # or 4111, 5434, etc.

# Stop that process or change the port in docker-compose.yml
```

### Service Stuck in "Restarting" State

```bash
# View recent logs
docker-compose logs --tail 100 mastra-app

# Check health status
docker inspect labs-asp-mastra-app-1 | grep -A 10 Health

# Force rebuild
docker-compose down
docker-compose build --no-cache mastra-app
docker-compose up -d
```

### Clear Everything and Start Fresh

```bash
# CAUTION: This deletes all data!
docker-compose down -v
docker system prune -a --volumes

# Then rebuild
docker-compose up -d --build
```

## Advanced Usage

### Viewing Resource Usage

```bash
# See CPU, memory usage
docker stats

# See disk usage
docker system df
```

### Inspecting Containers

```bash
# See detailed container info
docker inspect labs-asp-mastra-app-1

# See environment variables
docker-compose exec mastra-app env | sort
```

### Custom Commands

```bash
# Run one-off commands
docker-compose run --rm mastra-app pnpm test

# Run with different environment
docker-compose run --rm -e DEBUG=true mastra-app pnpm dev
```

### Building for Production

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Run with production config
docker-compose -f docker-compose.yml up -d
```

## Docker Compose Configuration

The `docker-compose.yml` file defines four services:

### postgres
- PostgreSQL 16 Alpine image
- External port: 5434 → Internal port: 5432
- Data persisted in `postgres_data` volume
- Credentials: postgres/postgres

### browser-streaming
- Custom Playwright MCP service
- Ports: 8931 (MCP), 8933 (WebSocket)
- Handles browser automation

### mastra-app
- Main Mastra backend application
- External port: 4111 → Internal port: 4112
- Connects to postgres via Docker network

### ai-chatbot
- Next.js frontend application
- Port: 3000
- Runs migrations on startup
- Connects to both postgres and mastra-app

## Networking

All services communicate via the `mastra-network` Docker bridge network:
- Services can reach each other using service names (e.g., `postgres`, `mastra-app`)
- External access via mapped ports (e.g., `localhost:3000`)

## Environment Variables

### Container vs Host

**Important**: Environment variables differ between host and container:

```env
# For containers (inside Docker network)
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/benefits_db"
MASTRA_SERVER_URL=http://mastra-app:4112

# For host machine (outside Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/benefits_db"
MASTRA_SERVER_URL=http://localhost:4111
```

### Build-time vs Runtime

Some variables must be set at **build time**:
- `NEXT_PUBLIC_*` variables (embedded in Next.js bundle)

Others can be set at **runtime**:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- Most other environment variables

To update build-time variables, you must rebuild:
```bash
docker-compose build --no-cache ai-chatbot
docker-compose up -d ai-chatbot
```

## Comparison: Docker vs Local Development

### Docker Advantages
- ✅ No local PostgreSQL installation needed
- ✅ Consistent environment across team
- ✅ Easy to reset/clean up
- ✅ Isolated from host system

### Local Development Advantages
- ✅ Faster iteration (no rebuild needed)
- ✅ Direct access to code/logs
- ✅ Easier debugging with IDE

### Hybrid Approach

You can mix both:
```bash
# Run only PostgreSQL in Docker
docker-compose up -d postgres

# Run app locally
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/benefits_db"
pnpm dev
```

## Next Steps

- See [README.md](./README.md) for project overview
- See [docs/DATABASE_SETUP.md](./docs/DATABASE_SETUP.md) for database details
- See [PLAYWRIGHT_MCP_GUIDE.md](./PLAYWRIGHT_MCP_GUIDE.md) for browser automation

## Getting Help

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables are set correctly
3. Try rebuilding: `docker-compose up -d --build`
4. Ask your team lead or create an issue
