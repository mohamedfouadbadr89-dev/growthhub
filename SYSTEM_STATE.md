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
