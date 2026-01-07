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

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/labs_asp_dev
```

Add this to:
- `.env` (root directory)
- `client/.env.local` (client directory)

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

### 3. Run Client Migrations
```bash
cd client
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/labs_asp_dev" pnpm exec tsx lib/db/migrate.ts
cd ..
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
Migrations are tracked in the `_migrations` table and won't run twice.

### Cannot Connect
- Ensure PostgreSQL container is running: `docker ps | grep postgres`
- Check logs: `docker logs labs-asp-postgres`
- Verify DATABASE_URL in .env files

## Docker Container Details

- **Container Name**: `labs-asp-postgres`
- **Image**: `postgres:16-alpine`
- **Port**: `5432`
- **Database**: `labs_asp_dev`
- **User**: `postgres`
- **Password**: `postgres`
- **Volume**: `postgres-data` (persists data across restarts)

