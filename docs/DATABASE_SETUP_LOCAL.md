# Local Database Setup

This guide explains how to run PostgreSQL locally using Docker for development.

## Quick Start

```bash
# Start the postgres container
docker compose up -d postgres

# Verify it's running
docker ps | grep postgres
```

## Database Connection

### For Local Development (outside Docker)

When running `pnpm dev` or other local commands:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/labs_asp_dev
```

Add this to:
- `.env` (root directory)
- `client/.env.local` (client directory)

### For Docker Containers

When services run inside Docker (via `docker compose up`):

```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/labs_asp_dev
```

**Note:** Docker containers use `@postgres:5432` (the service name) instead of `@localhost:5432` because containers communicate via Docker's internal network.

## Automatic Table Creation

Mastra automatically creates and manages all required database tables when the application starts. When you pass storage to the Mastra class, `init()` is called automatically before any storage operation.

Tables created automatically include:
- `mastra_threads` - Conversation threads
- `mastra_messages` - Individual messages
- `mastra_traces` - Telemetry and tracing data
- `mastra_workflow_snapshot` - Workflow state

**No manual migrations are required** - just start the app and Mastra handles the rest.

## Useful Commands

### Connect to Database
```bash
docker exec -it labs-asp-postgres psql -U postgres -d labs_asp_dev
```

### View All Tables
```bash
docker exec labs-asp-postgres psql -U postgres -d labs_asp_dev -c "\dt"
```

### Stop Database
```bash
docker compose down
```

### Reset Database (Delete All Data)
```bash
docker compose down -v
```

## Troubleshooting

### Port Conflict
If you have a local PostgreSQL running on port 5432:
1. Stop local PostgreSQL: `brew services stop postgresql`
2. Or change the port mapping in docker-compose.yml

### Cannot Connect from Docker Containers
**Symptom:** App shows `ECONNREFUSED 127.0.0.1:5432`

**Solution:** Update `.env` to use `@postgres:5432` instead of `@localhost:5432`, then rebuild:
```bash
docker compose build
docker compose up -d
```

### Cannot Connect - General
- Ensure PostgreSQL container is running: `docker ps | grep postgres`
- Check logs: `docker logs labs-asp-postgres`
- Verify DATABASE_URL in your .env files

## Container Details

- **Container Name**: `labs-asp-postgres`
- **Image**: `pgvector/pgvector:pg16`
- **Port**: `5432`
- **Database**: `labs_asp_dev`
- **User**: `postgres`
- **Password**: `postgres`
- **Volume**: `postgres-data` (persists data across restarts)
