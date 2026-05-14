# GrowthHub — AI Growth Operating System

AI-powered Growth OS for ecommerce/DTC brands. Closed-loop decision engine:
**Data → Insight → Decision → Action → Result → Learning → Better Decision.**

Stack: Next.js App Router (FE) · Hono on Node (BE) · Supabase (Postgres + Vault + Storage) · Clerk (auth + orgs) · Inngest (jobs) · OpenRouter (AI) · Stripe (billing). See `CLAUDE.md` for the full architecture spec.

---

## Repository layout

```
.                       Frontend (Next.js App Router)
├── app/                Pages — see CLAUDE.md §5 for routing map
├── components/         Shared UI (Sidebar, Topbar, etc.)
├── lib/                API client + Clerk helpers
├── backend/            Backend service (Hono, ALL new code lives here)
│   └── src/
│       ├── routes/v1/  Canonical v1 routers (12 active, 2 deferred-503)
│       ├── routes/webhooks/  Stripe + Clerk webhook handlers (HMAC verified)
│       ├── services/   AI orchestration, execution engine, sync
│       ├── middleware/ auth (Clerk JIT), tracing, error, request logger
│       └── jobs/       Inngest cron + event-driven functions
├── supabase/migrations/  Single source of truth for schema (18 migrations)
└── specs/              Phase specs, system control, AI operating model
```

**Important:** `backend/growthhub/api` is legacy Express code (read-only). All new backend work goes in `backend/src` (Hono).

---

## Local development

### 1. Prerequisites

- Node ≥ 20
- A Supabase project with all migrations applied (`supabase db push` from `/supabase`)
- A Clerk app (publishable + secret keys + webhook signing secret)
- An Inngest dev account (event + signing key)

### 2. Configure environment

Two `.env` files — keep them in sync:

```bash
cp .env.local.example .env.local        # frontend (Next.js)
cp backend/.env.example backend/.env    # backend (Hono)
```

Required at startup (backend will refuse to boot otherwise — see `backend/src/index.ts:40-153`):

| Var | Notes |
|---|---|
| `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | Clerk |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Backend uses service-role; FE uses anon |
| `OPENROUTER_API_KEY` | AI gateway |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Both required (signing key verifies inbound `/api/inngest` requests) |
| `STRIPE_WEBHOOK_SECRET` | Verifies inbound Stripe webhooks |

All other vars are documented inline in `backend/.env.example` and `.env.local.example`.

### 3. Run

```bash
# Terminal 1 — backend (listens on PORT, default 3001)
cd backend
npm install
npm run dev

# Terminal 2 — frontend (Next.js dev server on :3000)
npm install
npm run dev
```

Frontend dev origin (`http://localhost:3000`) is in the default CORS allowlist. The FE points at `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:3001`).

---

## Production deployment (Hostinger VPS)

### 1. Apply migrations

Migrations are the **single source of truth** for schema. Never modify tables at runtime.

```bash
# from the supabase/ directory, against the production Supabase project
supabase db push
```

Migration order is enforced by timestamp prefix in `supabase/migrations/`.

### 2. Configure production env

Populate `backend/.env` and `.env.local` on the VPS with production values. Critical production-only settings:

- `CORS_ALLOWED_ORIGINS=https://yourdomain.com` — comma-separated; the default dev allowlist is **not** safe for production
- `NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com` — public backend origin
- `OAUTH_REDIRECT_BASE_URL=https://api.yourdomain.com` — must match the redirect URI registered with Meta / Google / Shopify
- `SENTRY_DSN=...` — backend error tracking
- LIVE flags (`META_PAUSE_CAMPAIGN_LIVE`, etc.) — default `false`; enabling requires the dependent provider credentials per `backend/src/index.ts:LIVE_FLAG_DEPENDENCIES`. Misconfiguration fails-fast at boot.

### 3. Build + start

```bash
# Backend
cd backend
npm ci
npm run build          # tsc → dist/
pm2 start dist/index.js --name growthhub-backend

# Frontend
cd ..
npm ci
npm run build          # next build
pm2 start "npm run start" --name growthhub-frontend
```

### 4. Nginx reverse-proxy

Terminate SSL at Nginx; proxy `/api/*` → backend (`PORT`), everything else → frontend (`:3000`).

### 5. Configure webhooks

In each provider's dashboard, point the production URL:

- **Clerk**: `POST https://api.yourdomain.com/api/webhooks/clerk` (events: `organization.created`, `organizationMembership.created`)
- **Stripe**: `POST https://api.yourdomain.com/api/webhooks/stripe` (events: `checkout.session.completed`, `customer.subscription.*`)
- **Inngest**: registers itself via the SDK; verify the `/api/inngest` endpoint is reachable

### 6. Enable provider LIVE flags

After Meta App Review, Google Ads Developer Token Standard upgrade, and Shopify Partner App listing complete, flip the relevant `*_LIVE` flag and add the org_id to the corresponding `*_LIVE_ORG_ALLOWLIST`. Re-deploy. Backend fail-fasts if any LIVE flag is `true` without its dependencies.

---

## Architecture invariants (DO NOT VIOLATE)

These are enforced by `CONSTITUTION.md` and `CLAUDE.md`:

1. **Single-writer**: Frontend NEVER calls Supabase directly. All DB writes go through Backend API.
2. **Org isolation**: Every request extracts `org_id` from the Clerk JWT server-side. Client-supplied `org_id` is rejected. RLS is enabled on every table.
3. **Canonical envelope**: All v1 API responses use `{success, data, error: {message, code}, request_id}` (see `backend/src/utils/response.ts`).
4. **Migrations only**: All schema changes go in `supabase/migrations/<timestamp>_<name>.sql`. Never `CREATE TABLE` at runtime. The legacy `/db/migrations` is archive-only.
5. **Fail-loud**: Backend exits with status 1 on missing required env (`backend/src/index.ts:84`) or inconsistent LIVE-flag configuration (`:153`).

---

## Reference documents

- `CLAUDE.md` — architecture + execution rules + page routing map
- `CONSTITUTION.md` — prime directives (security, auth, org isolation)
- `Phases.md` — phase roadmap
- `specs/SYSTEM_CONTROL.md` — active runtime authority + continuation history
- `specs/AI_OPERATING_MODEL.md` — AI approval semantics + operating model

---

## Health checks

```
GET /health                  # always 200, no auth
GET /api/v1/health           # 200 with {status, version, timestamp}
```

Suitable for Nginx upstream / k8s liveness / PM2 monitoring.
