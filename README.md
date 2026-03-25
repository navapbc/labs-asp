# Labs ASP — Application Support Portal

An AI-powered caseworker tool that autonomously navigates government benefit portals on behalf of staff. Caseworkers direct an AI agent through a chat interface and watch it fill out applications, research eligibility requirements, and gather information in real time — all using existing participant data from a connected case management system.

Built by [Nava PBC](https://www.navapbc.com) with philanthropic funding. Designed to be adopted by any state, municipality, or government agency running benefits programs.

> **Status:** Active labs project. Nava's open source approval is in progress. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## What it can do

- **Autonomous web navigation** — The AI agent browses benefit portals (WIC, SNAP, Medicaid, CalWORKs, etc.), fills forms, and extracts information using participant data
- **Live browser streaming** — Caseworkers watch the agent's actions in real time via a split-screen chat + browser UI
- **Natural language control** — Staff direct the agent conversationally: _"Apply for WIC in Riverside County for this participant"_
- **Case management integration** — Pulls participant demographics, income, and household data from a connected system (Apricot360 supported out of the box; extensible to others)
- **Multi-LLM support** — Works with Anthropic Claude, Google Gemini, OpenAI GPT, or any model available via Google Vertex AI
- **Shared link API** — Generate pre-populated URLs that kick off automated workflows for a specific participant
- **Responsible crawling** — Requests are rate-limited, human-paced, and cryptographically signed (HTTP Message Signatures, RFC 9421)

## What it cannot do

- **Solve CAPTCHAs** — Human intervention is required when a CAPTCHA is encountered
- **Operate autonomously without a caseworker** — All workflows are initiated and supervised by authenticated staff; this is not a public-facing or fully autonomous bot
- **Handle complex file uploads** — Scenarios requiring multi-file uploads are not fully supported
- **Multi-tab workflows** — Designed for single-tab browser sessions
- **Multi-language UI** — The interface is currently English-only (though the agent can respond in other languages if prompted)
- **Unlimited sessions** — Agent sessions are capped at 50 steps and 60 minutes to prevent runaway automation

---

## Tech stack

**Frontend** (`client/`)
| Package | Purpose |
|---------|---------|
| Next.js 16, React 19 | App framework |
| Vercel AI SDK v6 (`ai@6`) | Streaming chat, tool calling |
| `@ai-sdk/{anthropic,google,openai,xai}` | LLM provider adapters |
| Drizzle ORM + PostgreSQL | Database access |
| NextAuth.js 5 | Authentication |
| Radix UI + Tailwind CSS | UI components |
| Framer Motion | Animations |
| ProseMirror + CodeMirror 6 | Rich text / code editors |
| PostHog | Analytics |
| OpenTelemetry + `@vercel/otel` | Observability |
| Vitest + Playwright | Testing |
| Biome | Linting and formatting |

**Backend** (`src/`)
| Package | Purpose |
|---------|---------|
| Vercel AI SDK v5 (`ai@5`) | Model calls, streaming (active) |
| [Mastra](https://mastra.ai) (`@mastra/core` + plugins) | AI agent framework — legacy, not active in deployed environments |
| `@ai-sdk/{anthropic,google,google-vertex,openai}` | LLM provider adapters |
| `@mastra/mcp` + Playwright | Browser automation via MCP |
| `@mastra/memory` + pgvector | Semantic memory / recall |
| PostgreSQL 16 + `pg` | Database |
| `web-bot-auth` | HTTP Message Signatures (RFC 9421) for bot identity |
| Zod | Schema validation |
| Pino | Structured logging |

**Infrastructure**
| Tool | Purpose |
|------|---------|
| Docker + Docker Compose | Local and production containers |
| Google Cloud Run | Serverless compute |
| Google Cloud SQL | Managed PostgreSQL |
| Google Artifact Registry | Docker image storage |
| Terraform | Infrastructure as code |
| GitHub Actions | CI/CD — builds, preview deployments, promotion |
| Redis (Upstash or self-hosted) | Session coordination |

---

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker Desktop
- A supported LLM API key (Anthropic, Google, or OpenAI)
- PostgreSQL 16 with the `pgvector` extension

---

## Local development

See **[`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md)** for a full step-by-step guide covering prerequisites, environment variables, database setup, and verification.

Quick start:

```bash
git clone --recurse-submodules https://github.com/navapbc/labs-asp.git
cd labs-asp && git checkout develop
pnpm install && cd client && pnpm install && cd ..
cp .env.example .env && cp client/.env.example client/.env.local
# Fill in API keys and auth secrets in both files
docker compose up -d --build
# App: http://localhost:3000  |  Mastra playground: http://localhost:4111
```

For daily development with fast hot reload, see [`docs/DEVELOPMENT_GUIDE.md`](docs/DEVELOPMENT_GUIDE.md).

---

## Environment variables

Key variables required to run the application:

```bash
# LLM provider (at least one required)
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENAI_API_KEY=                  # Also used for embeddings/memory

# Database
DATABASE_URL=postgresql://...

# Case management integration
APRICOT_API_BASE_URL=
APRICOT_ORG_ID=
APRICOT_CLIENT_ID=
APRICOT_CLIENT_SECRET=

# Auth
NEXTAUTH_SECRET=
MASTRA_JWT_SECRET=
MASTRA_APP_PASSWORD=

# Browser streaming (optional for local dev)
BROWSER_STREAMING_URL=
```

See `.env.example` for the full list.

---

## Deployment

The application is designed for deployment on **Google Cloud Platform** using **Terraform** and **GitHub Actions**.

### Environments

| Branch | Environment |
|--------|------------|
| `develop` | `dev` — auto-deployed on push |
| Pull request | `preview-pr-{N}` — isolated preview per PR |
| `main` | `prod` — auto-deployed on push |

### CI/CD pipeline

1. GitHub Actions builds Docker images and pushes to GCP Artifact Registry
2. Terraform provisions Cloud Run services, VPC, Cloud SQL, and supporting infrastructure
3. Preview URLs are posted as PR comments automatically

### Services deployed

- **AI Chatbot** (Next.js) — Cloud Run
- **Mastra API** — Cloud Run or Compute Engine
- **Browser MCP** — Playwright + Chromium container
- **Browser streaming** — WebSocket/VNC proxy (optional)

See [`docs/PRODUCTION_ARCHITECTURE.md`](docs/PRODUCTION_ARCHITECTURE.md) and [`terraform/`](terraform/) for full infrastructure details.

---

## Adapting for your agency

This project was built against Apricot360 as its case management integration, but the data layer is designed to be replaced. To connect your own system:

1. Replace or extend the tools in `src/mastra/tools/` with your data source
2. Update the database seed scripts in `scripts/seed/` for your participant data shape
3. Configure your preferred LLM provider in `src/mastra/agents/web-automation-agent.ts`

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
