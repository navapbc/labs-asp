# Docker Commands Quick Reference

Quick reference for common Docker commands used in this project.

## Essential Commands

### Starting & Stopping

```bash
# Start all services (background mode)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (DELETES DATA!)
docker-compose down -v

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart mastra-app
```

### Viewing Status

```bash
# Check service status
docker-compose ps

# View resource usage (CPU, memory)
docker stats

# Check service health
docker-compose ps
docker inspect labs-asp-mastra-app-1 | grep -A 10 Health
```

### Viewing Logs

```bash
# All services (follow mode - real-time)
docker-compose logs -f

# Specific service
docker-compose logs -f mastra-app
docker-compose logs -f ai-chatbot
docker-compose logs -f postgres

# Last 50 lines
docker-compose logs --tail 50 mastra-app

# Since specific time
docker-compose logs --since 5m mastra-app
```

## Development

### Rebuilding After Changes

```bash
# Rebuild specific service
docker-compose up -d --build mastra-app

# Rebuild without cache (clean build)
docker-compose build --no-cache mastra-app
docker-compose up -d mastra-app

# Rebuild all services
docker-compose up -d --build
```

### Accessing Containers

```bash
# Open shell in container
docker-compose exec mastra-app sh
docker-compose exec ai-chatbot sh

# Run single command
docker-compose exec mastra-app pnpm --version
docker-compose exec mastra-app env | grep DATABASE

# Run as root (if needed)
docker-compose exec -u root mastra-app sh
```

## Database

### Accessing Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d benefits_db

# List tables
docker-compose exec postgres psql -U postgres -d benefits_db -c "\dt"

# Run query
docker-compose exec postgres psql -U postgres -d benefits_db -c "SELECT * FROM participants LIMIT 5;"

# Check database size
docker-compose exec postgres psql -U postgres -d benefits_db -c "SELECT pg_size_pretty(pg_database_size('benefits_db'));"
```

### Database Backup & Restore

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres benefits_db > backup.sql

# Backup with timestamp
docker-compose exec postgres pg_dump -U postgres benefits_db > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore database
docker-compose exec -T postgres psql -U postgres benefits_db < backup.sql

# Create new database from backup
docker-compose exec postgres createdb -U postgres benefits_db_copy
docker-compose exec -T postgres psql -U postgres benefits_db_copy < backup.sql
```

### Running Migrations

```bash
# From host (using local Node.js)
node migrations/run-migrations.js

# From inside container
docker-compose exec mastra-app pnpm tsx migrations/run-migrations.js
```

## Troubleshooting

### Clean Start

```bash
# Stop everything
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove all unused images and build cache
docker system prune -a --volumes

# Start fresh
docker-compose up -d --build
```

### Checking Errors

```bash
# View all service logs
docker-compose logs

# Check for errors in specific service
docker-compose logs mastra-app | grep -i error
docker-compose logs mastra-app | grep -i failed

# View service configuration
docker-compose config

# Inspect container details
docker inspect labs-asp-mastra-app-1
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect network
docker network inspect labs-asp_mastra-network

# Recreate network
docker-compose down
docker-compose up -d
```

### Port Conflicts

```bash
# Find what's using a port (macOS/Linux)
lsof -i :3000
lsof -i :4111
lsof -i :5434

# Kill process using port
kill -9 $(lsof -ti:3000)

# Or change port in docker-compose.yml
```

### Service Health Checks

```bash
# Check health of all services
docker-compose ps

# Manual health checks
curl http://localhost:3000/health
curl http://localhost:4111/health
docker-compose exec postgres pg_isready -U postgres
```

## Useful Patterns

### View Environment Variables

```bash
# View all env vars in container
docker-compose exec mastra-app env | sort

# Check specific variable
docker-compose exec mastra-app sh -c 'echo $DATABASE_URL'
```

### Copy Files

```bash
# Copy from container to host
docker cp labs-asp-mastra-app-1:/app/some-file.log ./

# Copy from host to container
docker cp ./local-file.txt labs-asp-mastra-app-1:/app/
```

### Running One-off Commands

```bash
# Run command without starting normal service
docker-compose run --rm mastra-app pnpm test

# Run with custom environment variable
docker-compose run --rm -e DEBUG=true mastra-app pnpm dev
```

### Building Specific Services

```bash
# Build only one service
docker-compose build mastra-app

# Build with no cache
docker-compose build --no-cache ai-chatbot

# Build with progress output
docker-compose build --progress=plain mastra-app
```

## System Maintenance

### Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused (CAREFUL!)
docker system prune -a --volumes

# View disk usage
docker system df
```

### Image Management

```bash
# List images
docker images

# Remove specific image
docker rmi labs-asp-mastra-app

# Force remove
docker rmi -f labs-asp-mastra-app

# Remove all project images
docker images | grep labs-asp | awk '{print $3}' | xargs docker rmi -f
```

## Monitoring

### Real-time Monitoring

```bash
# Watch resource usage
docker stats

# Watch logs
docker-compose logs -f --tail 10

# Watch specific service
watch -n 2 'docker-compose ps'
```

### Performance Diagnostics

```bash
# See container processes
docker-compose top

# See what's running in container
docker-compose exec mastra-app ps aux

# Check network connections
docker-compose exec mastra-app netstat -tuln
```

## Common Workflows

### Full Restart

```bash
docker-compose down && docker-compose up -d
docker-compose logs -f
```

### Update and Restart

```bash
git pull --recurse-submodules
docker-compose down
docker-compose up -d --build
docker-compose logs -f
```

### Debug Failing Service

```bash
docker-compose ps
docker-compose logs --tail 100 mastra-app
docker-compose exec mastra-app sh
# Inside container: check env vars, files, run commands manually
```

### Reset Database

```bash
docker-compose down -v
docker-compose up -d postgres
sleep 10
node migrations/run-migrations.js
docker-compose up -d
```

## Getting More Help

```bash
# Docker Compose help
docker-compose --help
docker-compose up --help

# Docker help
docker --help
docker run --help
```

## Keyboard Shortcuts

When viewing logs with `-f` (follow mode):
- `Ctrl+C` - Stop following (exit)
- `Ctrl+Z` - Pause/background

## Tips

1. **Always use `-d` flag** for `docker-compose up` to run in background
2. **Use `--tail` flag** with logs to limit output
3. **Name your backups** with timestamps for easy identification
4. **Check logs first** when debugging issues
5. **Use `--no-cache`** if rebuild isn't picking up changes
6. **Remove volumes** (`-v`) only when you want to delete data

## See Also

- [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Complete Docker setup guide
- [README.md](./README.md) - Project overview
- [docs/DATABASE_SETUP.md](./docs/DATABASE_SETUP.md) - Database details
