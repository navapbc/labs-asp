# Development Guide

This guide covers local development with hot reloading for the best developer experience.

## Quick Start

```bash
# Start development environment (backend in Docker, frontend local)
./dev-frontend.sh

# Stop everything
./dev-stop.sh
```

## Development Setup

### Architecture

For optimal development experience, we run:
- **Backend services in Docker**: PostgreSQL, Mastra API, Browser Streaming
- **Frontend locally**: Next.js with hot reloading

This gives you:
- ⚡ **Instant hot reloading** - changes appear immediately
- 🐛 **Better debugging** - full Next.js dev tools
- 🚀 **Faster iteration** - no Docker rebuilds needed
- 💾 **Lower resource usage** - less overhead

### Services

| Service | Location | URL/Port | Purpose |
|---------|----------|----------|---------|
| PostgreSQL | Docker | `localhost:5434` | Database with pgvector |
| Mastra API | Docker | `http://localhost:4111` | Backend API & agents |
| Browser Streaming | Docker | `ws://localhost:8933` | Playwright automation |
| **Frontend** | **Local** | **`http://localhost:3000`** | **Next.js with hot reload** |

### Manual Start

If you prefer manual control:

```bash
# 1. Start backend services
docker-compose up -d postgres mastra-app browser-streaming

# 2. Stop frontend container (if running)
docker-compose stop ai-chatbot

# 3. Start frontend locally
cd client
pnpm dev
```

### Making Changes

1. **Edit any file** in `client/` directory
2. **Save** - changes appear instantly at http://localhost:3000
3. **No restart needed** - hot module replacement handles updates

Example:
```bash
# Edit the home page
code client/app/(chat)/home/page.tsx

# Changes appear immediately in browser
```

### Environment Variables

- Frontend uses: `client/.env.local`
- Backend uses: `.env`

The `DATABASE_URL` in `client/.env.local` is configured for localhost:5434.

### Switching to Full Docker Mode

If you need to run everything in Docker (e.g., for testing production builds):

```bash
# Start all services including frontend
docker-compose up -d

# Frontend will be at http://localhost:3000 (no hot reload)
```

## Troubleshooting

### Port 3000 already in use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (replace PID)
kill <PID>
```

### Database connection failed

```bash
# Check if postgres is running
docker-compose ps postgres

# Verify connection
docker-compose exec postgres psql -U postgres -d benefits_db -c "SELECT 1;"
```

### Hot reload not working

1. Check if frontend is running locally (not in Docker)
2. Ensure you're editing files in the `client/` directory
3. Clear Next.js cache: `rm -rf client/.next`

### Backend services not responding

```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs -f mastra-app
docker-compose logs -f postgres
```

## Production Build Testing

To test production builds locally:

```bash
# Build and start production mode
docker-compose build ai-chatbot
docker-compose up -d ai-chatbot

# Access at http://localhost:3000
```

## Database Management

```bash
# Run migrations
cd client
pnpm tsx lib/db/migrate

# Connect to database
docker-compose exec postgres psql -U postgres -d benefits_db

# View data with Prisma Studio (if using Prisma)
cd client
pnpm db:studio
```

## Tips

- Use `./dev-frontend.sh` for daily development
- Keep Docker Desktop running for backend services
- Use browser dev tools with Next.js for best debugging
- Check `docker-compose logs` if backend issues occur
