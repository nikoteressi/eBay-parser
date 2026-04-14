# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Nuxt dev server (http://localhost:3000)
npm run build            # Production build to .output/
npm start                # Run built server (node .output/server/index.mjs)

npm run db:generate      # Generate SQL migration from schema.ts changes
npm run db:migrate       # Apply migrations to DATABASE_PATH
npm run db:push          # Push schema directly (used only for tests/dev)
npm run db:studio        # Drizzle Studio UI

npm test                 # Vitest: pushes schema to /tmp/test-db.sqlite, then runs
npx vitest run <path>    # Run a single test file (requires DATABASE_PATH set)
```

Docker production: `docker-compose up -d --build`. SQLite file is bind-mounted at `./data:/data` and `DATABASE_PATH=/data/ebay-tracker.db` inside the container.

## Required Environment

`.env` must set `ENCRYPTION_KEY` (AES-256-GCM for secrets at rest), `ADMIN_TOKEN`, and `NUXT_PUBLIC_ADMIN_TOKEN` (must equal `ADMIN_TOKEN`). All `/api/*` routes except `/api/health` require `Authorization: Bearer $ADMIN_TOKEN` — see [server/middleware/auth.ts](server/middleware/auth.ts). The middleware fail-secures with HTTP 500 if `ADMIN_TOKEN` is unset.

## Architecture

This is a **Nuxt 3 modular monolith** — a single Nitro deployable. Frontend ([app/](app/)) and backend ([server/](server/)) share one process. Domain logic lives in [server/modules/](server/modules/) and communicates via direct imports, never HTTP. See [ARCHITECTURE.md](ARCHITECTURE.md) and [PRODUCT_SPEC.md](PRODUCT_SPEC.md) for the authoritative design (v1.1).

### Module dependency rules (enforce when editing)

Each module exposes its public API via `index.ts`; internal files are implementation detail.

| Module | May depend on | Must NOT depend on |
|--------|---------------|--------------------|
| [url-translator](server/modules/url-translator/) | — (pure) | any module |
| [ebay-client](server/modules/ebay-client/) | url-translator, api-budget, db | scheduler, notifier |
| [diff-engine](server/modules/diff-engine/) | db | ebay-client, notifier |
| [scheduler](server/modules/scheduler/) | ebay-client, diff-engine, notifier, gc, db | url-translator |
| [notifier](server/modules/notifier/) | db | scheduler, ebay-client |
| [garbage-collector](server/modules/garbage-collector/) | db | everything else |
| [api-budget](server/modules/api-budget/) | db | everything else |

### Concurrency model — critical invariants

1. **SQLite WAL is mandatory.** [server/database/index.ts](server/database/index.ts) sets `journal_mode=WAL`, `busy_timeout=5000`, `synchronous=NORMAL`, `foreign_keys=ON` on open. Do not remove or weaken these — without WAL, reads during writes throw `SQLITE_BUSY`.
2. **Global Polling Queue, max concurrency = 2.** node-cron fires per-query, but all polls funnel through a serialized queue inside [server/modules/scheduler/](server/modules/scheduler/). This is what prevents SQLite lock storms and eBay HTTP 429. Don't bypass it by calling `ebay-client` directly from API routes or plugins.
3. **eBay OAuth tokens are cached** in-memory with proactive refresh ([server/modules/ebay-client/token-cache.ts](server/modules/ebay-client/token-cache.ts)); authentication is not per-request.
4. **Telegram has a 1.5s inter-message delay** (flood control) in the notifier.

### Data model — critical invariants

- **No `SNAPSHOT` table.** [tracked_items](server/database/schema.ts) IS the source of truth. Every poll updates rows in place (`current_price`, `current_shipping`, `current_total_cost`, `last_seen_at`), inserts new ones, and transitions missing ones through `active → out_of_view → ended_or_sold`. Never add JSON blob snapshotting.
- **Total cost = price + shipping.** Price-drop alerts compare `current_total_cost`, not price alone. New columns added for this (`first_seen_shipping`, `current_shipping`, `first_seen_total_cost`, `current_total_cost`) must be maintained together.
- **Grace period (default 7 days)** for `out_of_view` before promotion to `ended_or_sold`. Retention (default 30 days) before hard delete. Both are tunable in `settings`.
- **Unique `(query_id, ebay_item_id)`**: a relisted `ended_or_sold` item is deleted and re-inserted with a fresh `first_seen_price`, triggering a new-item alert.
- **IDs are ULIDs** (lexicographically sortable) via the `ulid` package.

### Boot sequence

Nitro plugins run in filename order. [server/plugins/1.migrations.ts](server/plugins/1.migrations.ts) runs Drizzle migrations on startup (in Docker, migrations are copied explicitly — see Dockerfile), then [server/plugins/database.ts](server/plugins/database.ts) and [server/plugins/scheduler.ts](server/plugins/scheduler.ts) wire up the DB shutdown hook and start the scheduler. Scheduler failures are logged but do not crash the server.

### Secrets

All sensitive settings (`ebay.client_secret`, `smtp.password`, `telegram.bot_token`) are encrypted at rest in the `settings` table via AES-256-GCM in [server/utils/encryption.ts](server/utils/encryption.ts), keyed off `ENCRYPTION_KEY`. Rows have an `is_secret` flag; secret values are prefixed `enc:` on disk. Never log or return raw decrypted secret values to the client.

## Conventions

- TypeScript across front + back. Vue 3 SFCs for UI, Vanilla CSS with custom properties (no Tailwind), dark-mode-first.
- Settings are configured via the web UI, not env vars (except the three auth/encryption env vars above).
- When schema changes: edit [server/database/schema.ts](server/database/schema.ts), run `npm run db:generate`, commit the generated SQL in [server/database/migrations/](server/database/migrations/). The migrations plugin applies them on next boot.
