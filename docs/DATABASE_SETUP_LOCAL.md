# Local Database Setup

## Quick Start

```bash
./setup-local-db.sh
```

This script will:
1. Start PostgreSQL in Docker
2. Run participant/household migrations
3. Run client/chat migrations
4. Display the DATABASE_URL

## Database Connection

### For Local Development (outside Docker)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/labs_asp_dev
```

Add this to:
- `client/.env.local` (client directory)

### For Docker Containers

```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/labs_asp_dev
```

Add this to:
- `.env` (root directory - used by Docker containers)

**Important:** Docker containers use `@postgres:5432` (the service name) instead of `@localhost:5432` because containers communicate via Docker's internal network.

## Database Tables

### Participant Management Tables
- `participants` - Main participant records
- `household_dependents` - Household members
- `mastra_artifacts` - Playwright artifacts and session data

### Chat/AI Application Tables
- `User` - User accounts
- `Chat` - Chat sessions
- `Message` / `Message_v2` - Chat messages
- `Document` - Document management
- `Suggestion` - Suggestion tracking
- `Vote` / `Vote_v2` - User votes
- `Stream` - Streaming data

### Mastra Framework Tables
- `mastra_threads` - Conversation threads
- `mastra_messages` - Thread messages
- `mastra_traces` - Observability traces

### System Tables
- `_migrations` - Migration tracking
- `mastra_workflow_snapshot` - Mastra workflow state (auto-created by Mastra framework)

## Manual Setup

If you need to run migrations manually:

### 1. Start PostgreSQL
```bash
docker-compose up -d postgres
```

### 2. Run Participant Migrations
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/labs_asp_dev"
node migrations/run-migrations.js
```

**Migrations that will run:**
- `001_create_tables.sql` - Core tables (participants, household_dependents, mastra_artifacts)
- `002_add_datasourcetype_field.sql` - Data source tracking
- `003_add_apricot360_fields.sql` - APRICOT360 integration fields
- `004_fix_mastra_artifacts_uuid.sql` - UUID fixes
- `005_add_apricot360_csv_fields.sql` - Extended APRICOT360 fields
- `006_drop_start_specific_columns.sql` - Cleanup
- `007_create_mastra_tables.sql` - Mastra framework tables (threads, messages, traces)

**Note:** Migration `000_convert_camelcase_to_snake_case.sql` is skipped (renamed to `.skip`) as it's only for converting existing Prisma databases.

### 3. Run Client Migrations
```bash
cd client
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/labs_asp_dev" pnpm exec tsx lib/db/migrate.ts
cd ..
```

## Running with Docker Compose

To start all services (including database, Mastra server, and Next.js client):

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

**Note:** If you change the DATABASE_URL in `.env`, you must rebuild the Docker images:

```bash
docker compose build
docker compose up -d
```

## Useful Commands

### Connect to Database
```bash
docker-compose exec postgres psql -U postgres -d labs_asp_dev
```

### View All Tables
```bash
docker exec labs-asp-postgres psql -U postgres -d labs_asp_dev -c "\dt"
```

### Stop Database
```bash
docker-compose down
```

### Reset Database (Delete All Data)
```bash
docker-compose down -v
```

### Restart Database
```bash
docker-compose up -d postgres
```

## Troubleshooting

### Port Conflict
If you have a local PostgreSQL running on port 5432:
1. Stop local PostgreSQL: `brew services stop postgresql`
2. Or use a different port in docker-compose.yml

### Migration Already Run Error
Migrations are tracked in the `_migrations` table and won't run twice. This is normal and expected.

### Cannot Connect from Docker Containers
**Symptom:** Mastra app shows `ECONNREFUSED 127.0.0.1:5432`

**Cause:** Docker containers can't connect to `localhost` - they need to use the service name.

**Solution:**
1. Update `.env` file to use `@postgres:5432` instead of `@localhost:5432`
2. Rebuild the Docker image: `docker compose build mastra-app`
3. Restart the container: `docker compose up -d mastra-app`

**Why rebuild?** The Mastra build process bundles environment variables at build time, so changes to `.env` require a rebuild.

### Missing Tables Error
If you see errors about missing tables like `mastra_threads` or `mastra_workflow_snapshot`:
1. Make sure all migrations have run: `node migrations/run-migrations.js`
2. Verify tables exist: `docker exec labs-asp-postgres psql -U postgres -d labs_asp_dev -c "\dt"`
3. Check migration status: `docker exec labs-asp-postgres psql -U postgres -d labs_asp_dev -c "SELECT * FROM _migrations ORDER BY id;"`

### Cannot Connect - General
- Ensure PostgreSQL container is running: `docker ps | grep postgres`
- Check logs: `docker logs labs-asp-postgres`
- Verify DATABASE_URL in .env files
- For Docker containers, ensure using `@postgres:5432` not `@localhost:5432`

## Docker Container Details

- **Container Name**: `labs-asp-postgres`
- **Image**: `postgres:16-alpine`
- **Port**: `5432`
- **Database**: `labs_asp_dev`
- **User**: `postgres`
- **Password**: `postgres`
- **Volume**: `postgres-data` (persists data across restarts)

