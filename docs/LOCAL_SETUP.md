# Local Setup Guide

Step-by-step instructions for getting labs-asp running on your machine for the first time.

---

## Prerequisites

Install these before starting:

- **Node.js 20+** — [nodejs.org](https://nodejs.org/)
- **pnpm** — `npm install -g pnpm`
- **Docker Desktop** — [docker.com](https://www.docker.com/products/docker-desktop/)
- **Git**

You'll also need at least one LLM API key (see [Step 4](#step-4-configure-environment-variables)).

---

## Step 1 — Clone the repository

This project uses a Git submodule for the frontend client. Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/navapbc/labs-asp.git
cd labs-asp
git checkout develop
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

---

## Step 2 — Install dependencies

```bash
# Install backend dependencies
pnpm install

# Install frontend dependencies
cd client && pnpm install && cd ..
```

---

## Step 3 — Start the database

The app requires PostgreSQL 16 with the `pgvector` extension. The easiest way to run it locally is with Docker:

```bash
docker compose up -d postgres
```

This starts a PostgreSQL container at `localhost:5432` with:
- User: `postgres`
- Password: `postgres`
- Database: `labs_asp_dev`

---

## Step 4 — Configure environment variables

### Backend (`/.env`)

```bash
cp .env.example .env
```

Open `.env` and fill in the required fields:

**Required — pick at least one LLM provider:**

| Variable | Where to get it |
|----------|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/) — also used for memory/embeddings |
| `GOOGLE_GENERATIVE_AI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/) |

**Required — database and auth:**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/labs_asp_dev"
MASTRA_JWT_SECRET=<any-random-string>
MASTRA_APP_PASSWORD=<any-password-you-choose>
MASTRA_JWT_TOKEN=<any-random-string>
```

Generate random strings with: `openssl rand -base64 32`

**Optional — Exa web search:**

```bash
EXA_API_KEY=<your-key>   # https://exa.ai — enables the agent to search the web
```

**Optional — Apricot360 case management integration:**

```bash
APRICOT_API_BASE_URL=https://f5r-api.iws.sidekick.solutions/apricot
APRICOT_ORG_ID=<your-org-id>
APRICOT_CLIENT_ID=<your-client-id>
APRICOT_CLIENT_SECRET=<your-client-secret>
```

Leave these blank if you don't have an Apricot360 instance. The app will use the database for participant data instead.

**Optional — Google Vertex AI:**

Only needed if you want to use Anthropic models via Google Cloud or Google's Vertex AI models.

```bash
GOOGLE_VERTEX_LOCATION=us-east5
GOOGLE_VERTEX_PROJECT=<your-gcp-project>
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-credentials.json
```

See [`docs/VERTEX_AI_ANTHROPIC_SETUP.md`](VERTEX_AI_ANTHROPIC_SETUP.md) for the full setup.

---

### Frontend (`/client/.env.local`)

```bash
cp client/.env.example client/.env.local
```

Open `client/.env.local` and fill in the required fields:

**Required:**

```bash
AUTH_SECRET=<random-string>          # openssl rand -base64 32
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/labs_asp_dev"
MASTRA_SERVER_URL=http://localhost:4111
NEXT_PUBLIC_MASTRA_SERVER_URL=http://localhost:4111
MASTRA_JWT_TOKEN=<same-value-as-backend>
ENVIRONMENT=dev
NEXT_PUBLIC_ENVIRONMENT=dev
USE_AI_SDK_AGENT=true            # Must be true — matches all deployed environments
NEXT_PUBLIC_USE_AI_SDK_AGENT=true
```

**Required — at least one LLM key** (can reuse your backend keys):

```bash
OPENAI_API_KEY=<your-key>
# and/or
ANTHROPIC_API_KEY=<your-key>
GOOGLE_GENERATIVE_AI_API_KEY=<your-key>
```

**Optional — OAuth sign-in:**

```bash
# Google OAuth
GOOGLE_CLIENT_ID=<your-id>
GOOGLE_CLIENT_SECRET=<your-secret>

# Microsoft / Entra ID
AUTH_MICROSOFT_ENTRA_ID_ID=<your-id>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<your-secret>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/common/v2.0
```

If you skip OAuth, the app will use the built-in credential login with the password set in `MASTRA_APP_PASSWORD`.

**Optional — Redis (for shared links feature):**

```bash
UPSTASH_REDIS_REST_URL=<your-url>
UPSTASH_REDIS_REST_TOKEN=<your-token>
```

Without Redis, the shared link API will not be available, but everything else works fine.

---

## Step 5 — Run database migrations

```bash
# Run backend migrations
pnpm db:setup

# Run frontend migrations
cd client && pnpm db:migrate && cd ..
```

---

## Step 6 — Start the app

### Option A: Full stack with Docker (recommended for first-time setup)

```bash
docker compose up -d --build
```

Services:
- Frontend (Next.js): [http://localhost:3000](http://localhost:3000)
- Mastra backend / playground: [http://localhost:4111](http://localhost:4111)
- Database browser: run `pnpm db:studio` → [http://localhost:5555](http://localhost:5555)

### Option B: Native development (faster iteration)

Recommended once you're past initial setup — sub-second hot reload.

```bash
# Terminal 1: Start backend + database in Docker
./dev.sh native

# Terminal 2: Start frontend natively
cd client && pnpm dev
```

See [`docs/DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md) for a full comparison of development modes.

---

## Step 7 — Verify it's working

1. Open [http://localhost:3000](http://localhost:3000)
2. Sign in (credential login uses `MASTRA_APP_PASSWORD` from your `.env`)
3. Start a new chat and type: `"What's the weather like in San Francisco?"`
4. The agent should respond — if it does, your LLM connection is working
5. For browser automation, try: `"Visit google.com and take a screenshot"` — you should see the browser stream on the right side of the screen

---

## Common issues

**Database connection refused**
Make sure the postgres container is running: `docker compose ps`

**Submodule directory is empty**
```bash
git submodule update --init --recursive
```

**`pnpm dev` fails in client with missing env vars**
Check that `client/.env.local` exists and contains `AUTH_SECRET` and `DATABASE_URL`.

**Agent isn't responding / LLM errors**
Verify your API key is set correctly in both `.env` (backend) and `client/.env.local` (frontend). Keys are not shared automatically between the two services.

**Port already in use**
```bash
# Find what's using a port (e.g. 3000)
lsof -i :3000
kill -9 <PID>
```

---

## Seed data (optional)

To load sample participant data for testing the case management features:

```bash
pnpm seed:wic        # WIC program sample data
pnpm seed:csv        # Load from a custom CSV file
```

---

## Next steps

- [`docs/DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md) — hot reload modes for daily development
- [`docs/PRODUCTION_ARCHITECTURE.md`](PRODUCTION_ARCHITECTURE.md) — deploying to GCP
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — how to contribute
