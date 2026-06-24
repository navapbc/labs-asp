# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is the infrastructure/deployment repo for Labs ASP. **Almost all application code lives in `client/`, which is a Git submodule** tracking the `develop` branch of [navapbc/ai-chatbot](https://github.com/navapbc/ai-chatbot). Run application commands from `client/`, not the root.

- **`client/`** — the Next.js AI chatbot app (submodule). This is where you'll spend most of your time.
- **`terraform/`** — GCP infrastructure-as-code (Cloud Run, Cloud SQL, VPC, IAM).
- **`browser-ws-proxy/`** — standalone WebSocket proxy service (`server.js`) for browser streaming.
- **`playwright-mcp/`** — Playwright MCP + browser-streaming server, deployed separately.
- **`scripts/`** — Mastra `runExperiment` scorer-testing framework (CSV-driven evals).
- **`docs/`** — architecture and setup docs (`CLIENT_ARCHITECTURE.md`, `BROWSER_STREAMING_ARCHITECTURE.md`, `PRODUCTION_ARCHITECTURE.md`, `DATABASE_SETUP.md`, etc.).

`develop` is the primary working branch (not `main`). The client submodule also tracks `develop`. Use `git spull` (alias for `git pull --recurse-submodules`) to update both.

## Commands (run from `client/`)

```bash
pnpm dev              # next dev --turbo
pnpm build            # runs lib/db/migrate THEN next build
pnpm lint             # biome lint --write --unsafe
pnpm format           # biome format --write
pnpm test             # vitest (browser mode, chromium via Playwright)
pnpm test:playwright  # Playwright e2e tests (sets PLAYWRIGHT=True)

# Database (Drizzle)
pnpm db:generate      # generate migrations from schema
pnpm db:migrate       # apply migrations
pnpm db:studio        # open Drizzle Studio (read-only browsing)
pnpm db:push          # push schema without migration files
```

Run a single unit test: `pnpm exec vitest run <path>` (e.g. `pnpm exec vitest run tests/client/some.test.tsx`).

The shared cloud database is seeded/reset only by admins (`pnpm seed:wic`, `pnpm db:reset`) — regular work should not modify it.

## Architecture (client app)

**Stack:** Next.js 16 (App Router) · React 19 · Vercel AI SDK v6 (`ai` package) · Drizzle ORM + Postgres · next-auth v5 (beta, with guest auth) · Biome for lint/format · Tailwind.

**Agent loop** — `app/(chat)/api/chat/route.ts` is the core. It runs `streamText` as a multi-step agent (`stopWhen: stepCountIs(500)`), with `prepareStep` switching models mid-run. `maxDuration = 300` (5 min) for long web-automation tasks. Tools wired in: `apricotTools`, `browser`, `gap-analysis`, `form-summary`, `check-submit-gate`, `action-label`, `read-reference`.

**Models / providers** — `lib/ai/providers.ts`. Web automation uses `webAutomationModel = vertexAnthropic('claude-opus-4-7')` via Google Vertex AI; `prepareStepModel` uses `claude-haiku-4-5`. A `customProvider` exposes selectable dev-only models (GPT and Claude variants). Test env swaps in mocks from `lib/ai/models.test.ts` (note: that file is NOT a test — it exports mocks and is excluded from the vitest run).

**Browser automation (Kernel.sh)** — `lib/kernel/browser.ts` manages remote browser sessions on Kernel.sh using `agent-browser`'s `BrowserManager` + `executeCommand` (in-process, no CLI subprocess). Sessions are held in an **in-memory cache** keyed by `${userId}:${sessionId}` — this assumes a single Cloud Run instance; Kernel.sh owns lifecycle/timeout. The `browser` tool (`lib/ai/tools/browser.ts`) serializes commands per session with a mutex queue because Playwright's `page` is not concurrency-safe. Session IDs are `${chatId}-${userId}`. The `NEXT_PUBLIC_USE_AI_SDK_AGENT` flag toggles this Kernel path vs. legacy Mastra WebSocket streaming.

**Apricot/Apricot360 integration** — `lib/apricot-api.ts` + `lib/ai/tools/apricot/` look up participant data via the Apricot API. Uses the `sandbox` environment everywhere except production (`api`).

**Database schema** — `lib/db/schema.ts`. Note deprecated vs. current tables: use `Message_v2`/`vote` (current), not `Message`/`Vote` (deprecated). Queries live in `lib/db/queries.ts`.

**Artifacts** — interactive side-panel artifacts in `artifacts/` (and `lib/artifacts/`): `browser` (live session viewer), `code`, `image`, `sheet`, `text`. The `artifacts/session_*` directories are runtime scratch output, not source.

**Feature flags** — `lib/feature-flags.ts`. Env-aware defaults overridable per-browser via `localStorage` (`ff:` prefix) through a dev-only menu. Current flag: `declutterToolCalls`.

**Prompts** — `lib/ai/prompts/` (web-automation, browser-and-forms, application-protocol) with markdown references in `prompts/references/`.

## Conventions (from `.cursor/rules/`)

**React/frontend:**
- Tailwind classes only for styling — no inline styles, no separate CSS. Add a Tailwind variable if a new style property is needed.
- Event handlers use a `handle` prefix (`handleClick`, `handleKeyDown`); prefer `const` arrow functions with types over `function`.
- Use early returns; include accessibility attributes (`aria-label`, `tabIndex`, keyboard handlers).
- **Ask before installing any new dependency.** Always use `pnpm`.

**Testing:** Default to `vitest --browser` (Playwright + `vitest-browser-react`); only write node/jsdom tests if explicitly asked. Import components under test from source; import test helpers from `vitest-browser-react`. Prefer `getByRole`/`findByRole` (name with regex) over `getByTestId`. Use `findBy*`/`waitFor` for async, MSW for HTTP, local `vi.mock` for modules.

**Documentation:** Write for engineers — avoid marketing language ("powerful", "out-of-the-box", "production-ready", "makes it easy", "Check out", etc.). H1 headings use Title Case.
