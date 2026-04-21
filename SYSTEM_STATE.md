# SYSTEM_STATE.md

**Generated**: 2026-04-21
**Method**: Direct code audit — no assumptions, no documentation taken at face value
**Scope (Part 1)**: Executive Summary + Phase 1 Reality Mapping

> NOTE: Three files referenced in the task brief (BACKEND_STATUS.md, FRONTEND_INTEGRATION_SPEC.md,
> PHASE5_REQUIREMENTS.md) do NOT exist on disk. This document is based entirely on actual source code,
> migration files, and Phases.md / CLAUDE.md.

---

## 1. EXECUTIVE SUMMARY

### Real System State

The system is **partially functional in development but unreliable in production**.

The application is a Next.js 15 frontend (App Router) backed by a Hono v4 API server, with Supabase
as the database and Clerk for auth. Phases 1–6 of a 7-phase build are committed to the local branch
`claude/init-growthhub-PaRUm`. **3 commits are ahead of the remote and cannot be pushed** due to a
403 on the git proxy — meaning the production/Hostinger server has not received any code since the
`6cd3ee1` commit (Phase 5 hardening).

### Is the system functional?

| Layer | Verdict |
|---|---|
| Auth flow (sign-in/sign-up) | **UNKNOWN — cannot verify without env vars** |
| Backend API (Railway) | **UNKNOWN — backend/.env does not exist locally** |
| Frontend → Backend integration | **BROKEN — 3 commits containing this work are NOT pushed** |
| Database schema (Supabase) | **UNKNOWN — migrations exist as SQL files but cannot verify they were applied** |
| Real data on any page | **ZERO — no page returns real data until backend env is configured and commits are pushed** |

### High-Level Truth

1. **No API calls are reaching the backend from the browser.** The 3 unpushed commits contain every
   frontend API integration change (Phase 7). The deployed Hostinger version has none of them.
   Every page in production is still showing static/mock data.

2. **The backend cannot start correctly in production.** `backend/.env` does not exist on disk.
   `ecosystem.config.cjs` points to `/home/user/growthhub/backend/.env` for env vars. Without it,
   `CLERK_SECRET_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are all undefined at runtime.
   Every authenticated API call would return 401 or crash.

3. **There is an architecture violation in Phase 1** that violates the primary CLAUDE.md rule
   ("Frontend NEVER calls Supabase directly"). The frontend Next.js route at
   `app/api/webhooks/clerk/route.ts` writes directly to Supabase using `SUPABASE_SERVICE_ROLE_KEY`.

4. **13 of ~40 pages are hardcoded static data** with no API calls at all. These pages will never
   show real data regardless of environment state.

5. **CORS is configured only for `localhost:3000` and `72.62.131.250:3000`** (the frontend IP).
   If the Hostinger VPS address or production domain differs from these, all preflight requests
   will be blocked by the browser.

---

## 2. PHASE 1 REALITY MAPPING

### What Was Planned (from Phases.md)

**Clerk**
- ClerkProvider in `app/layout.tsx`
- Middleware protecting all private routes
- Sign-in / Sign-up pages (`/sign-in`, `/sign-up`)
- Auto-create Organization on sign-up
- Redirect to `/dashboard/overview` after auth

**Supabase Schema**
- `organizations` table
- `users` table
- `subscriptions` table
- `audit_logs` table
- RLS enabled on all tables
- All tables have `org_id` column

**Backend (Railway)**
- Hono server setup (binds 0.0.0.0:3001)
- Clerk token verification middleware
- Health check endpoint `GET /health`
- Base API structure `/api/v1/`
- Error handling + logging
- Clerk webhook handler (`POST /api/webhooks/clerk`)
- PM2 ecosystem config (`ecosystem.config.cjs`)

**Phase 1 Deliverable**: User can sign up → create org → land on dashboard → backend responds to
authenticated requests.

---

### What Is Actually Working

**ClerkProvider — WORKING**
`app/layout.tsx` wraps the entire app in `<ClerkProvider>`. Code confirmed.

**Route Middleware — WORKING**
`middleware.ts` uses `clerkMiddleware` with `createRouteMatcher`. All intended private paths are
protected: `/dashboard(.*)`, `/actions(.*)`, `/automation(.*)`, `/campaigns(.*)`, `/creatives(.*)`,
`/decisions(.*)`, `/integrations(.*)`, `/settings(.*)`. Unauthenticated users hitting these paths
are redirected to Clerk's sign-in page.

**Sign-in / Sign-up pages — WORKING**
- `app/sign-in/[[...sign-in]]/page.tsx` — renders Clerk's `<SignIn />` component.
- `app/sign-up/[[...sign-up]]/page.tsx` — exists (not read, but path matches Clerk's catch-all pattern).
- Root `app/page.tsx` does `redirect("/dashboard/overview")` — anonymous users hit middleware and
  land on sign-in.

**Supabase Schema — WORKING (migration exists; applied status unknown)**
`supabase/migrations/20260420000001_foundation.sql` defines all four tables with correct structure:
- `organizations`: `id`, `org_id` (UNIQUE), `name`, `plan_type` (enum), `created_at`
- `users`: `id`, `org_id` (FK → organizations), `clerk_id` (UNIQUE), `email`, `role` (enum), `created_at`
- `subscriptions`: `id`, `org_id`, `plan_type`, `status`, `stripe_customer_id`, `stripe_sub_id`,
  `current_period_end`, `created_at`, `updated_at`
- `audit_logs`: `id`, `org_id`, `actor_id`, `action`, `resource`, `resource_id`, `metadata`, `created_at`

RLS is enabled on all four tables. All have `org_id`. Policies use `auth.jwt()->>'org_id'` for
isolation. Indexes exist on `org_id` and `created_at` where appropriate.

**Backend Hono Server — WORKING (code correct; runtime unknown)**
`backend/src/index.ts`:
- Binds to `0.0.0.0:3001`.
- `hono/logger` middleware applied globally.
- CORS applied globally (see issues below).
- `process.on('uncaughtException')` and `process.on('unhandledRejection')` registered.
- Missing env var check at startup with console warning (does not crash, warns).

**Backend Clerk Auth Middleware — WORKING (code correct; runtime depends on CLERK_SECRET_KEY)**
`backend/src/middleware/auth.ts` correctly:
- Requires `Authorization: Bearer <token>` header.
- Verifies token via `@clerk/backend`'s `verifyToken`.
- Extracts `userId` (`payload.sub`) and `orgId` (`payload.org_id`).
- Returns 401 if token is missing/invalid.
- Returns 403 if `org_id` is absent from the token payload.
- Sets `c.Variables.userId` and `c.Variables.orgId` for downstream handlers.

**Health Check — WORKING**
`GET /health` and `GET /api/v1/health` both return `{ status: 'ok', version: '1.0.0', timestamp }`.
No auth required. Works even when Supabase env vars are missing.

**Base API Structure — WORKING**
`/api/v1/*` is fully routed through `backend/src/routes/v1/index.ts`. Auth middleware applied to
all routes under `v1.use('/*', authMiddleware)` before any handler.

**Error Handling + Logging — WORKING**
`backend/src/middleware/error.ts` uses `@sentry/node`. `Sentry.init()` is called at import time with
`process.env.SENTRY_DSN`. If `SENTRY_DSN` is not set, Sentry initialises in no-op mode — does not
crash. Global `onError` handler catches unhandled Hono errors.

**PM2 Ecosystem Config — WORKING**
`backend/ecosystem.config.cjs` defines the `growthhub-backend` process with correct script
(`dist/index.js`), port (`3001`), autorestart, memory limit, and log paths.

**Auto-Create Organization on Sign-up — CODE EXISTS (runtime status unknown)**
`app/api/webhooks/clerk/route.ts` handles `user.created` Clerk webhook events:
1. Creates a Clerk Organization named `"{first_name}'s Workspace"`.
2. Adds the user as `org:admin`.
3. Inserts into `organizations`, `users`, `subscriptions` tables.
4. Writes two `audit_logs` entries.
5. Has atomic rollback: if any DB insert fails, it calls `clerk.organizations.deleteOrganization()`
   to prevent orphaned Clerk orgs.

---

### What Is Broken

**BROKEN 1: Architecture Violation — Frontend Writes Directly to Supabase**

File: `app/api/webhooks/clerk/route.ts` (lines 10–13)

```typescript
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

This violates the explicit rule in CLAUDE.md:
> "Frontend NEVER calls Supabase directly"
> "service_role_key lives on Backend only — never exposed to frontend"

This is a Next.js server route, so `SUPABASE_SERVICE_ROLE_KEY` is not browser-exposed, but it IS
stored in the frontend server's environment. The architecture rule is about where the key lives, not
just whether it reaches the browser. The backend is supposed to be the sole Supabase writer.

**BROKEN 2: Duplicate Webhook Handlers — Conflicting Responsibility**

There are two webhook handlers listening for Clerk events:

| Handler | Location | Events handled |
|---|---|---|
| Frontend (Next.js) | `app/api/webhooks/clerk/route.ts` | `user.created` |
| Backend (Hono) | `backend/src/routes/webhooks/clerk.ts` | `organization.created`, `organizationMembership.created` |

The frontend handler creates a Clerk organization (step 1), which triggers `organization.created`,
which the backend handler then processes — attempting to `upsert` the same organization into the
`organizations` table. Since the frontend handler already did a direct `insert`, this creates a
race condition. The backend upsert uses `onConflict: 'org_id'` so it won't error, but the split
responsibility is fragile and violates the single-writer rule.

Which handler is actually registered as the Clerk webhook endpoint in the Clerk Dashboard is unknown
from code alone. If only the frontend handler is registered, the backend handler never fires.
If both are registered (two webhook endpoints), both fire for every event.

**BROKEN 3: backend/.env Does Not Exist**

`ecosystem.config.cjs` points to `env_file: '/home/user/growthhub/backend/.env'`. This file does
not exist. In production (Railway or PM2 on the VPS), the backend starts without:
- `CLERK_SECRET_KEY` — all authenticated routes return 401
- `SUPABASE_URL` — all DB calls use the placeholder `https://placeholder.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — all DB calls use the placeholder key and fail silently

The server does NOT crash on missing vars (startup warning only). It serves health checks but every
data endpoint fails at the database call level.

**BROKEN 4: Clerk Env Vars Missing from .env.local**

`.env.local` contains only one line:
```
NEXT_PUBLIC_BACKEND_URL=http://72.62.131.250:3001
```

Missing variables that Clerk requires for correct behaviour:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk SDK cannot initialise without this
- `CLERK_SECRET_KEY` — required for `clerkClient()` in the webhook route
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` — Clerk defaults to its own hosted URL without this
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` — same
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` — without this, post-sign-in redirect is undefined
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` — without this, new users do not land on `/dashboard/overview`
- `CLERK_WEBHOOK_SECRET` — the frontend webhook handler returns 500 without this

Without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, the entire frontend fails to initialise Clerk. Sign-in
and sign-up do not render. Middleware cannot verify sessions. The app is non-functional in local dev.

**BROKEN 5: CORS Origin Mismatch Risk**

`backend/src/index.ts` allows origins:
```
['http://localhost:3000', 'http://72.62.131.250:3000']
```

If the production frontend runs on HTTPS, a different port, or a domain name (e.g.
`https://app.growthhub.io`), all browser preflight requests to the backend are blocked. The second
origin `http://72.62.131.250:3000` is an IP address with HTTP — if the Hostinger VPS is behind
Nginx with SSL, the actual origin would be `https://72.62.131.250` or a domain, not this string.

**BROKEN 6: Redirect After Auth is Not Configured**

`app/page.tsx` does `redirect("/dashboard/overview")`. This handles direct root URL visits.
It does NOT control where Clerk redirects after a successful sign-in or sign-up. That requires
`NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` in the environment.
Without them, Clerk defaults to its hosted User Profile page, not the dashboard.

---

### What Is NOT IMPLEMENTED

**NOT IMPLEMENTED: org_id in Clerk JWT (runtime configuration)**

The backend auth middleware extracts `orgId` from `payload.org_id`:
```typescript
const orgId = (payload as Record<string, unknown>).org_id as string | undefined
```

For `org_id` to appear in the Clerk JWT, the Clerk Dashboard must have a JWT template configured
to include `org_id` in the session claims. There is no code that configures this — it is a Clerk
Dashboard setting. If it is not configured, every authenticated backend request returns 403
"User has no organization assigned" regardless of whether the user belongs to an org.

This is the most likely reason the frontend shows only Clerk requests with no backend API calls:
if the JWT does not contain `org_id`, the backend rejects every request with 403, pages catch the
error and show the error state, and no successful API calls appear in the network tab.

**NOT IMPLEMENTED: Subscription creation on sign-up via webhook**

The frontend webhook (`app/api/webhooks/clerk/route.ts`) inserts a `subscriptions` row with
`status: 'trialing'`. However, Phases.md Phase 7 lists "subscriptions table connected to Stripe"
as not done. There is no `trial_ends_at` column, no Stripe customer ID populated, and no webhook
to update the trial status. The subscription row is created but is functionally inert.

**NOT IMPLEMENTED: Clerk Dashboard configuration (external, not in code)**

The following must exist in the Clerk Dashboard for Phase 1 to work end-to-end. None of these
can be verified from code:
- Webhook endpoint registered pointing to the correct URL
- JWT template with `org_id` claim included
- Organizations feature enabled in the Clerk application settings
- Redirect URLs matching the env vars

**NOT IMPLEMENTED: Supabase RLS policy covers backend service_role**

The RLS policies on Phase 1 tables use `auth.jwt()->>'org_id'`. The backend uses `supabaseAdmin`
(service_role_key), which **bypasses RLS entirely**. This means the RLS policies on `organizations`,
`users`, `subscriptions`, and `audit_logs` are never evaluated for any backend write. They would
only apply if someone connected to Supabase using the anon key — which is not the intended flow.
The policies are not broken, but they provide zero protection for the actual data access pattern.

**NOT IMPLEMENTED: Supabase migrations applied to production**

`supabase/migrations/` contains 7 SQL files. There is no evidence in the repository of a
`supabase push` or any CI step that applies migrations. Whether these migrations are applied to
the production Supabase project is unknown and cannot be determined from code.

---

### Phase 1 Summary Table

| Item | Verdict |
|---|---|
| ClerkProvider in layout.tsx | WORKING |
| Middleware protecting private routes | WORKING |
| Sign-in page at /sign-in | WORKING |
| Sign-up page at /sign-up | WORKING |
| Redirect root → /dashboard/overview | WORKING (root only) |
| Redirect after sign-in/sign-up | BROKEN — env vars missing |
| Auto-create org on sign-up (code) | WORKING (code exists) |
| Auto-create org on sign-up (runtime) | UNKNOWN — depends on Clerk webhook config |
| organizations table | WORKING (migration exists; applied unknown) |
| users table | WORKING (migration exists; applied unknown) |
| subscriptions table | WORKING (migration exists; applied unknown) |
| audit_logs table | WORKING (migration exists; applied unknown) |
| RLS on all Phase 1 tables | WORKING in migration — but bypassed by service_role |
| org_id on all Phase 1 tables | WORKING |
| Hono server 0.0.0.0:3001 | WORKING (code correct) |
| Clerk token verification middleware | WORKING (code correct; depends on CLERK_SECRET_KEY) |
| GET /health | WORKING |
| Base /api/v1/ structure | WORKING |
| Error handling + logging | WORKING |
| Clerk webhook handler (backend) | WORKING (code exists; conflicts with frontend handler) |
| Clerk webhook handler (frontend) | WORKING (code exists; violates architecture rules) |
| PM2 ecosystem config | WORKING (config exists; backend/.env missing) |
| org_id in Clerk JWT | NOT IMPLEMENTED (Clerk Dashboard config required) |
| backend/.env | NOT IMPLEMENTED (file missing) |
| Clerk env vars in .env.local | NOT IMPLEMENTED (file is missing all Clerk keys) |
| Supabase migrations applied | UNKNOWN (no evidence of supabase push) |
| Phase 1 deliverable working end-to-end | **NO — cannot be confirmed without env vars and Clerk Dashboard config** |

---

## 3. PHASE 2 REALITY MAPPING

### What Was Planned (from Phases.md)

**OAuth Integrations**
- Connect Meta Ads, Google Ads, Shopify via OAuth
- Store encrypted tokens in Supabase Vault
- OAuth callback route at `/api/integrations/callback/[platform]`
- State parameter validation to prevent CSRF

**Sync Engine**
- Inngest background jobs: daily sync per platform, on-demand sync
- Meta: fetch ad accounts + campaign insights (30-day window)
- Google: fetch customers + campaign metrics via GAQL
- Shopify: fetch orders, map to revenue metrics
- Upsert to `campaign_metrics` table

**Supabase Schema**
- `integrations` table (stores OAuth tokens via Vault reference)
- `ad_accounts` table
- `campaign_metrics` table (PARTITION BY RANGE on `date`)
- `sync_logs` table
- RLS on all tables

**Frontend**
- Integrations page: connect/disconnect/sync buttons
- Dashboard → Channels page: real campaign metric breakdowns

---

### What Is Actually Working

**Sync Service Code — WORKING (code correct; runtime blocked by missing env vars)**

`backend/src/services/sync/meta.ts`:
- Reads token from Supabase Vault via `vault.decrypted_secrets`
- Calls Meta Ads API v21.0: `/{ad_account_id}/insights`
- Fetches 30-day window, maps fields: `spend`, `reach`, `impressions`, `clicks`, `actions`, `purchase_roas`
- Upserts to `campaign_metrics` with conflict resolution on `(org_id, platform, campaign_id, date)`

`backend/src/services/sync/google.ts`:
- Refreshes access token via Google OAuth2 token endpoint
- Fetches accessible customers via `https://googleads.googleapis.com/v19/customers:listAccessibleCustomers`
- Uses GAQL `searchStream` endpoint
- Parses NDJSON response line-by-line
- Requires `GOOGLE_ADS_DEVELOPER_TOKEN` header on every request

`backend/src/services/sync/shopify.ts`:
- Calls Shopify GraphQL Admin API via `fetch`
- Paginates orders with `pageInfo.hasNextPage` cursor
- Maps each order as a `campaign_metrics` row: `spend=0`, `conversions=1`, `revenue=order_total_price`

**Inngest Job Definition — WORKING (code exists; keys missing)**
Backend defines Inngest functions for:
- Daily sync (cron `0 6 * * *`): triggers sync for all connected integrations
- Per-integration sync: triggered by `integration/sync.requested` event

**Supabase Migration — WORKING (migration exists; applied status unknown)**
`supabase/migrations/20260420000002_data_ingestion.sql`:
- `integrations`: `id`, `org_id`, `platform`, `status`, `vault_secret_id`, `last_synced_at`, `metadata`
- `ad_accounts`: `id`, `org_id`, `integration_id`, `platform_account_id`, `account_name`, `currency`, `status`
- `campaign_metrics`: partitioned table (`PARTITION BY RANGE (date)`) with 8 quarterly partitions (2026 Q1 → 2027 Q4) plus a default partition
- `sync_logs`: `id`, `org_id`, `integration_id`, `status`, `records_synced`, `error_message`, `started_at`, `completed_at`
- RLS on all four tables

**OAuth Callback Route — WORKING (code correct; redirects properly)**
`app/api/integrations/callback/[platform]/route.ts`:
- Does NOT call Supabase directly (correct)
- Calls backend `POST /api/v1/integrations/connect/complete` with `{ code, state, shop? }`
- On success: redirects to `/integrations?connected={platform}`
- On failure: redirects to `/integrations?error=oauth_failed`

**Frontend Integrations Page — WORKING (UI correct; data from real API)**
`app/integrations/page.tsx` calls:
- `GET /api/v1/integrations` to list connected platforms
- `POST /api/v1/integrations/connect/start` to begin OAuth flow
- `DELETE /api/v1/integrations/{id}` to disconnect
- `POST /api/v1/integrations/{id}/sync` to trigger on-demand sync
Has error state, retry button, toast notifications. No hardcoded data.

---

### What Is Broken

**BROKEN 1: Supabase Vault Not Enabled**

`backend/src/lib/vault.ts` calls `vault.create_secret()` and queries `vault.decrypted_secrets`. These functions are part of the `pgsodium` extension that powers Supabase Vault. The extension must be enabled at the Supabase **project level** via the Supabase Dashboard or CLI — no SQL migration can enable it.

There is no `supabase/migrations/` file that enables `pgsodium`. If Vault is not enabled on the production Supabase project, every `integrations/connect/complete` call (which stores the OAuth token) and every sync (which reads the token) crashes with:

```
schema "vault" does not exist
```

This means: even if all env vars were present, OAuth tokens cannot be stored or read.

**BROKEN 2: ALL Platform OAuth Env Vars Missing**

Neither `backend/.env` (which does not exist) nor `.env.local` contains any of these:

```
META_APP_ID
META_APP_SECRET
GOOGLE_ADS_CLIENT_ID
GOOGLE_ADS_CLIENT_SECRET
GOOGLE_ADS_DEVELOPER_TOKEN
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
OAUTH_REDIRECT_BASE_URL
```

Without `OAUTH_REDIRECT_BASE_URL`, the backend cannot construct the OAuth redirect URL for any platform. Without the platform credentials, the OAuth authorization URL is invalid and will be rejected by Meta/Google/Shopify.

**BROKEN 3: Inngest Env Vars Missing**

`INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are not present in any env file. Without them:
- Inngest cannot authenticate the backend as a valid client
- No sync jobs fire — neither the daily cron nor on-demand sync
- Even if an integration is "connected" in the DB, no data ever arrives

**BROKEN 4: Dashboard Channels Page — Static Chart Data**

`app/dashboard/channels/page.tsx` fetches real campaign metrics from the backend API. However, the **chart column data** is hardcoded:

```typescript
const CHANNELS = [
  { key: "meta", label: "Meta Ads", color: "#005bc4" },
  { key: "google", label: "Google Ads", color: "#f59e0b" },
  { key: "shopify", label: "Shopify", color: "#10b981" },
];
```

The channel breakdown table fetches real data, but the bar chart columns are built from this static array rather than from the API response. If an org only has Google connected (no Meta), the Meta column still appears in the chart (empty but present).

---

### What Is NOT IMPLEMENTED

**NOT IMPLEMENTED: Vault enabled at Supabase project level**
Cannot be done via migration. Requires manual Supabase Dashboard action: enable the `pgsodium` extension in the Extensions tab of the Supabase project.

**NOT IMPLEMENTED: All platform OAuth credentials**
`META_APP_ID`, `META_APP_SECRET`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET` — none populated anywhere.

**NOT IMPLEMENTED: OAUTH_REDIRECT_BASE_URL**
Must point to the **frontend** URL where the Next.js callback route lives (e.g., `http://72.62.131.250:3000` or the Hostinger domain). The backend uses this to construct the `redirect_uri` sent to Meta/Google/Shopify during OAuth. Without it, the OAuth flow cannot even start correctly.

**NOT IMPLEMENTED: Inngest keys**
`INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` not in any env file.

---

### Phase 2 Summary Table

| Item | Verdict |
|---|---|
| Meta sync service (code) | WORKING |
| Google sync service (code) | WORKING |
| Shopify sync service (code) | WORKING |
| Inngest job definitions (code) | WORKING |
| integrations table migration | WORKING |
| campaign_metrics table with partitioning | WORKING |
| ad_accounts, sync_logs tables | WORKING |
| OAuth callback route | WORKING (code correct) |
| Integrations page (UI) | WORKING (calls real API) |
| Dashboard → Channels page | PARTIALLY BROKEN (chart columns hardcoded) |
| Supabase Vault enabled | NOT IMPLEMENTED (project-level config required) |
| META_APP_ID / META_APP_SECRET | NOT IMPLEMENTED |
| GOOGLE_ADS_CLIENT_ID / SECRET / DEVELOPER_TOKEN | NOT IMPLEMENTED |
| SHOPIFY_API_KEY / API_SECRET | NOT IMPLEMENTED |
| OAUTH_REDIRECT_BASE_URL | NOT IMPLEMENTED |
| INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY | NOT IMPLEMENTED |
| Any real data syncing in production | **NO — blocked by missing env vars and Vault** |

---

## 4. PHASE 3 REALITY MAPPING

### What Was Planned (from Phases.md)

**Decision Engine**
- Anomaly detection: `detect_anomaly_candidates` SQL function (7-day rolling window)
- AI explanation via OpenRouter for each decision
- Confidence scoring with rationale
- Decision prioritization
- `decision_runs` table with concurrency lock (unique partial index)
- `decisions` table scoped by `org_id`
- Credit deduction for subscription users (1 credit per AI decision)

**Alerts**
- Threshold-based alert generation
- `alerts` table, `alert_thresholds` table
- Alerts page: list + dismiss
- Opportunities page: growth signals

**Recommendations & Audience**
- AI-generated recommendations
- Audience segmentation insights

**Intelligence Inngest Job**
- Daily cron triggers decision engine after sync completes
- OpenRouter API key for AI calls

---

### What Is Actually Working

**Anomaly Detection SQL Function — WORKING (migration exists; applied status unknown)**
`supabase/migrations/20260420000003_intelligence.sql` defines `detect_anomaly_candidates(p_org_id TEXT, p_days INTEGER)`:
- 7-day rolling window via `WITH recent_data AS (SELECT ... WHERE date >= NOW() - INTERVAL '7 days')`
- Detects: ROAS_DROP (>30% below 7d avg), SPEND_SPIKE (>3x 7d avg), CONVERSION_DROP (>40% below 7d avg), SCALING_OPPORTUNITY (ROAS >3.5x with ≥5 data points)
- Returns typed result set: `campaign_id`, `platform`, `anomaly_type`, `current_value`, `baseline_value`, `deviation_pct`

**Decision Generator — WORKING (code correct; runtime blocked by missing OPENROUTER_API_KEY)**
`backend/src/services/intelligence/decision-generator.ts`:
- Calls `detect_anomaly_candidates` RPC
- Calls OpenRouter via OpenAI SDK (`baseURL: 'https://openrouter.ai/api/v1'`)
- Uses `openai/gpt-4o-mini` model with structured JSON output schema
- Deducts 1 credit per decision via `deduct_credit(p_org_id)` RPC for subscription users
- Sets `ai_status` to `completed` / `credits_exhausted` / `ai_unavailable` based on result

**Credit Deduction — WORKING (code + SQL exist; runtime depends on migration applied)**
- `deduct_credit(p_org_id TEXT)` defined in Phase 3 migration: deducts exactly 1 credit from `organizations.credits_balance`
- This is different from `deduct_credits(p_org_id TEXT, p_amount INTEGER)` defined in Phase 5 hardening (used for creatives, deducts variable amount)
- Both functions exist independently; no conflict

**Decisions API Routes — WORKING (code correct; data depends on engine running)**
`backend/src/routes/v1/decisions.ts`:
- `GET /api/v1/decisions` — lists org decisions with pagination and status filter
- `GET /api/v1/decisions/:id` — returns single decision with full data snapshot
- `POST /api/v1/decisions/generate` — triggers decision generation on demand

**Frontend Decisions Pages — WORKING (UI correct; calls real API)**
- `app/decisions/page.tsx` — lists decisions, filters by status/type, links to detail
- `app/decisions/[id]/page.tsx` — full detail view: AI explanation, data snapshot, confidence score, execute recommended action button

**Alerts API + Page — PARTIALLY WORKING**
`backend/src/routes/v1/alerts.ts` exists with `GET /api/v1/alerts` and `PATCH /api/v1/alerts/:id` (dismiss).
`app/decisions/alerts/page.tsx` calls `GET /api/v1/alerts` and renders with error state.

**Opportunities Page — PARTIALLY WORKING**
`app/decisions/opportunities/page.tsx` calls `GET /api/v1/decisions?type=SCALING_OPPORTUNITY` and renders as opportunity cards. No error state or retry button.

---

### What Is Broken

**BROKEN 1: OPENROUTER_API_KEY Missing — All AI Explanations Are Unavailable**

`.env.local` does not contain `OPENROUTER_API_KEY`. `backend/.env` does not exist.

When `decision-generator.ts` attempts to call OpenRouter, the API key is `undefined`. The OpenAI SDK throws an authentication error. The code catches this and sets:
```typescript
aiStatus = 'ai_unavailable'
ai_explanation = null
confidence_rationale = "AI unavailable"
confidence_score = fallback_heuristic_score
```

Every decision in production will have `ai_status: 'ai_unavailable'` and no explanation. The decision engine still runs and generates structural decisions (type, trigger condition, data snapshot), but the core AI value proposition is absent.

**BROKEN 2: Opportunities Page Has No Error State**

`app/decisions/opportunities/page.tsx` has no error handling. If the API call fails (which it will in production due to missing env vars), the page silently renders empty with no feedback to the user and no retry button.

**BROKEN 3: Recommendations Page — Fully Static Mock Data**

`app/decisions/recommendations/page.tsx` contains zero API calls. The entire page is hardcoded:

```typescript
const RECOMMENDATIONS = [
  { id: 1, title: "Scale Meta Lookalike 1% Audience", ... },
  { id: 2, title: "Pause Underperforming Google DSA Campaign", ... },
  ...
];
```

This page will never show real data. It is not connected to any backend route.

**BROKEN 4: Audience Insights Page — Fully Static Mock Data**

`app/decisions/audience/page.tsx` contains zero API calls. Entire page is hardcoded segment data. Never shows real data.

**BROKEN 5: Alert Thresholds — No UI Exists**

The `alert_thresholds` table exists in the migration (Phase 3). The backend has no CRUD routes for `alert_thresholds`. The frontend has no page to create, view, or manage thresholds. Without custom thresholds, alerts can only be generated by the hardcoded anomaly detection thresholds in `detect_anomaly_candidates`.

---

### What Is NOT IMPLEMENTED

**NOT IMPLEMENTED: OPENROUTER_API_KEY**
Not in `.env.local`, not in `backend/.env` (which doesn't exist).

**NOT IMPLEMENTED: Alert Thresholds UI and API**
`alert_thresholds` table exists but there are no backend routes for it and no frontend page.

**NOT IMPLEMENTED: Recommendations page API integration**
The page is static. No backend route exists for AI recommendations distinct from decisions.

**NOT IMPLEMENTED: Audience Insights page API integration**
The page is static. No backend route exists for audience segmentation.

**NOT IMPLEMENTED: Intelligence engine running automatically**
Inngest keys are missing. The daily decision generation cron never fires.

---

### Phase 3 Summary Table

| Item | Verdict |
|---|---|
| detect_anomaly_candidates SQL function | WORKING (migration exists) |
| decision_runs, decisions tables | WORKING (migration exists) |
| alerts, alert_thresholds tables | WORKING (migration exists) |
| Decision generator code | WORKING (code correct) |
| Credit deduction (deduct_credit) | WORKING (code + SQL) |
| Decisions list + detail pages | WORKING (calls real API) |
| Alerts list page | WORKING (calls real API, has error state) |
| Opportunities page | BROKEN (no error state or retry) |
| OPENROUTER_API_KEY | NOT IMPLEMENTED |
| AI explanations in production | **ZERO — all decisions get ai_unavailable** |
| Alert thresholds UI | NOT IMPLEMENTED |
| Recommendations page (real data) | NOT IMPLEMENTED (fully static mock data) |
| Audience insights page (real data) | NOT IMPLEMENTED (fully static mock data) |
| Intelligence engine auto-running | NOT IMPLEMENTED (Inngest keys missing) |
| Phase 3 deliverable working end-to-end | **NO — no real AI explanations, no auto-runs** |

---

## 5. PHASE 4 REALITY MAPPING

### What Was Planned (from Phases.md)

**Execution Layer**
- `actions_library` table: catalog of executable action templates (platform, action_type, parameter schema)
- `automation_rules` table: IF→THEN playbooks (trigger condition → action template)
- `automation_runs` table: execution log per rule run
- `decision_history` table: critical memory system — every execution logs decision + action + trigger + data snapshot + result + AI explanation + confidence
- Actions Library page: browse executable templates
- Action Detail page: API mapping + execution logic + run button
- Execution Logs page: history of what ran
- Automation Status page: system health, enabled/disabled rules
- Decision History page: full memory — every decision + trigger + data + result + AI explanation + confidence
- Automation: user builds IF→THEN rules; Inngest jobs execute rules after each decision run
- Manual execution from Decision Detail page

---

### What Is Actually Working

**Supabase Migration — WORKING (migration exists; applied status unknown)**
`supabase/migrations/20260420000004_execution.sql` defines:
- `actions_library`: `id`, `org_id` (nullable), `platform`, `action_type`, `name`, `description`, `parameter_schema` (JSONB), `created_at`
- `automation_rules`: `id`, `org_id`, `name`, `trigger_type`, `min_confidence_threshold`, `action_template_id` (FK → actions_library), `action_params`, `enabled`, `run_count`, `last_fired_at`, `created_at`
- `automation_runs`: `id`, `org_id`, `rule_id`, `decision_id`, `action_template_id`, `status`, `result_data`, `error_message`, `created_at`
- `decision_history`: `id`, `org_id`, `decision_id`, `action_template_id`, `decision` (text), `action_taken` (text), `trigger_condition`, `data_used` (JSONB), `result` (enum: success/failed/skipped), `ai_explanation`, `confidence_score`, `executed_by` (enum: manual/automation), `created_at`
- Seeds 8 action templates: `pause_campaign`, `increase_budget`, `decrease_budget`, `rotate_creative`, `send_alert_email` × platforms (meta, google, shopify)

**Backend Action Routes — WORKING (code correct)**
`backend/src/routes/v1/actions.ts`:
- `GET /api/v1/actions` — list action templates (filtered by org_id for org-specific + global templates)
- `GET /api/v1/actions/:id` — single template with full parameter schema
- `POST /api/v1/actions/:id/execute` — execute action, write to decision_history

**Backend Automation Routes — WORKING (code correct)**
`backend/src/routes/v1/automation.ts`:
- `GET /api/v1/automation/rules` — list org rules
- `POST /api/v1/automation/rules` — create rule
- `PATCH /api/v1/automation/rules/:id` — update (toggle enabled, update params)
- `DELETE /api/v1/automation/rules/:id` — delete rule

**Backend History Routes — WORKING (code correct)**
`backend/src/routes/v1/history.ts`:
- `GET /api/v1/history` — paginated decision history list
- `GET /api/v1/history/:id` — single record with full data_used snapshot

**Decision Detail Execute Button — WORKING (UI wired to real API)**
`app/decisions/[id]/page.tsx`:
- `DECISION_ACTION_MAP` maps decision type + platform to a hardcoded action template UUID
- "Execute Recommended Action" button calls `POST /api/v1/actions/{templateId}/execute`
- Shows executing/executed states, links to `/automation/history` on success

**Automation Rules Page — WORKING (calls real API)**
`app/actions/automation/page.tsx`:
- Loads rules from `GET /api/v1/automation/rules` and templates from `GET /api/v1/actions`
- Create rule form with all fields
- Toggle enable/disable, delete
- Error state with retry button

**Decision History Page — WORKING (calls real API)**
`app/automation/history/page.tsx`:
- Loads from `GET /api/v1/history?limit=100`
- Expandable rows call `GET /api/v1/history/:id` for detail
- Shows AI explanation and data snapshot inline
- Error state with retry button

**Actions Library Page — WORKING (calls real API)**
`app/actions/page.tsx` fetches from `GET /api/v1/actions` and renders template cards.

**Action Detail Page — WORKING (calls real API)**
`app/actions/[id]/page.tsx` fetches from `GET /api/v1/actions/:id` and renders parameter schema with execute form.

---

### What Is Broken

**BROKEN 1: ALL Action Execution Is Simulated — No Real Platform Mutations**

`backend/src/services/execution/action-executor.ts` defines five handlers. Every single one returns a hardcoded simulation result:

```typescript
const ACTION_HANDLERS: Record<string, ActionHandler> = {
  pause_campaign: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'pause_campaign', platform: ctx.platform, ...params },
  }),
  increase_budget: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'increase_budget', platform: ctx.platform, budget_change: '+20%', ...params },
  }),
  decrease_budget: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'decrease_budget', platform: ctx.platform, budget_change: '-20%', ...params },
  }),
  rotate_creative: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'rotate_creative', platform: ctx.platform, ...params },
  }),
  send_alert_email: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'send_alert_email', ...params },
  }),
};
```

No Meta Ads API call is made to pause a campaign. No Google Ads API call is made to change a budget. The `send_alert_email` handler does not send an email. Every "execution" writes `{ simulated: true }` to `result_data` in `decision_history`. The system records the action as `result: 'success'` even though nothing happened on the platform.

**BROKEN 2: Phase 6 Migration `is_active` Column Bug**

`supabase/migrations/20260420000006_creatives_hardening.sql` contains:
```sql
INSERT INTO actions_library (id, platform, action_type, name, description, parameter_schema, is_active)
VALUES (...)
```

The `actions_library` CREATE TABLE in Phase 4 migration has no `is_active` column. This INSERT will fail with:
```
column "is_active" of relation "actions_library" does not exist
```

If migrations are applied in sequence, Phase 6 fails. All migrations after Phase 6 also fail (migration runner typically stops on error). Whether this has been caught depends on whether migrations have been applied at all.

**BROKEN 3: Automation Center, Strategies, Builder — Fully Static**

Three pages under `app/automation/` are hardcoded mock data with zero API calls:

`app/automation/page.tsx` (Decision Center):
```typescript
const KPI_CARDS = [
  { label: "Revenue", value: "$142,400", change: "+12%", ... },
  { label: "ROAS", value: "4.2x", ... },
  ...
];
const ACTION_LOG = [
  { label: "Scale FB Lookalike 1%", tag: "Meta", ... },
  ...
];
```

`app/automation/strategies/page.tsx`:
- Entire strategies list is hardcoded. No API call. Never shows real data.

`app/automation/builder/page.tsx`:
- Static workflow builder mockup. No save/load API calls.

**BROKEN 4: `DECISION_ACTION_MAP` Uses Hardcoded UUIDs**

`app/decisions/[id]/page.tsx` maps decision types to action template IDs:
```typescript
const DECISION_ACTION_MAP: Record<string, Record<string, string>> = {
  ROAS_DROP:  { meta: "00000000-0000-0000-0000-000000000001", google: "00000000-0000-0000-0000-000000000004" },
  SPEND_SPIKE: { meta: "00000000-0000-0000-0000-000000000003", google: "00000000-0000-0000-0000-000000000006" },
  ...
};
```

These UUIDs are the seeded action template IDs from the Phase 4 migration. If the seed inserts were not applied (or were applied with different IDs), the execute button calls a non-existent template and returns 404.

---

### What Is NOT IMPLEMENTED

**NOT IMPLEMENTED: Real Meta Ads campaign mutations**
No `POST /{campaign_id}/` call to Meta Ads API to pause or update budget. Simulated only.

**NOT IMPLEMENTED: Real Google Ads campaign mutations**
No `MutateCampaigns` or `MutateCampaignBudgets` gRPC/REST call. Simulated only.

**NOT IMPLEMENTED: Alert email sending**
`send_alert_email` handler does not call Resend or any email service. Returns `{ simulated: true }`.

**NOT IMPLEMENTED: Automation Center page (real data)**
`app/automation/page.tsx` is 100% static mock data with no API connection.

**NOT IMPLEMENTED: Strategies page (real data)**
`app/automation/strategies/page.tsx` is 100% static.

**NOT IMPLEMENTED: Builder page (functional)**
`app/automation/builder/page.tsx` is a static UI mockup with no save/load.

**NOT IMPLEMENTED: Inngest automation run trigger**
The IF→THEN rule evaluation is defined in backend code but depends on Inngest keys (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`). Without them, automation rules never fire automatically. The only execution path is the manual "Execute Recommended Action" button.

---

### Phase 4 Summary Table

| Item | Verdict |
|---|---|
| actions_library, automation_rules, automation_runs, decision_history tables | WORKING (migration exists) |
| 8 action template seeds | WORKING (in migration; applied status unknown) |
| Actions Library page | WORKING (calls real API) |
| Action Detail page | WORKING (calls real API) |
| Automation Rules page (CRUD) | WORKING (calls real API) |
| Decision History page | WORKING (calls real API) |
| Execute button on Decision Detail | WORKING (calls real API) |
| Action execution — pause_campaign | SIMULATED (returns { simulated: true }) |
| Action execution — increase/decrease_budget | SIMULATED |
| Action execution — rotate_creative | SIMULATED |
| Action execution — send_alert_email | SIMULATED (no email sent) |
| Automation Center page | NOT IMPLEMENTED (100% static mock data) |
| Strategies page | NOT IMPLEMENTED (100% static mock data) |
| Builder page | NOT IMPLEMENTED (static mockup, no API) |
| IF→THEN rules auto-firing | NOT IMPLEMENTED (Inngest keys missing) |
| Phase 6 migration is_active bug | **WILL FAIL** (column does not exist) |
| Phase 4 deliverable working end-to-end | **PARTIAL — execution records but takes no real actions** |
