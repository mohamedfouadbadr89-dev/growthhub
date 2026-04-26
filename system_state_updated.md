# System State Audit — GrowthHub
**Date:** 2026-04-26  
**Branch:** `claude/init-growthhub-PaRUm`  
**Source of truth:** actual repo files

---

## 1. PHASE STATUS

### Phase 1 — Foundation ✅ DONE (code complete, env incomplete)

| Item | Status |
|------|--------|
| ClerkProvider in `app/layout.tsx` | ✅ Done |
| Middleware (`clerkMiddleware`) protecting private routes | ✅ Done |
| Sign-in / Sign-up pages | ✅ Done |
| Auto-create org on sign-up (Clerk webhook handler) | ✅ Done (`/app/api/webhooks/clerk/route.ts` + backend) |
| `organizations`, `users`, `subscriptions`, `audit_logs` tables | ✅ In migration `20260420000001_foundation.sql` |
| RLS enabled on all Phase 1 tables | ✅ Done |
| Hono backend — `GET /health`, auth middleware, PM2 config | ✅ Done (`backend/src/`) |
| Clerk webhook handler `POST /api/webhooks/clerk` | ✅ Done |

**Missing to make it work:**  
- `backend/.env` file does not exist — only `.env.example`. Backend will not start without real credentials.  
- Frontend `.env.local` only has `NEXT_PUBLIC_BACKEND_URL`. Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, etc.) are not set → auth broken in this environment.  
- Supabase migrations have never been run against a real project (no evidence of applied state).

---

### Phase 2 — Data Ingestion ⚠️ PARTIAL (code written, not wired up)

| Item | Status |
|------|--------|
| `integrations`, `ad_accounts`, `sync_logs`, `campaign_metrics` tables | ✅ In migration `20260420000002_data_ingestion.sql` |
| `campaign_metrics` partitioned by quarter | ✅ Done in migration |
| Backend `GET/POST /api/v1/integrations` | ✅ Implemented |
| Backend OAuth connect flow `GET /api/v1/integrations/connect/:platform/auth` | ✅ Implemented |
| OAuth callback in Next.js `app/api/integrations/callback/[platform]/route.ts` | ✅ Implemented |
| Meta Ads sync service (`syncMeta`) | ✅ Real API calls — fetches from `graph.facebook.com/v21.0` |
| Google Ads sync service (`syncGoogle`) | ✅ Real API calls — uses Google Ads REST API |
| Shopify sync service (`syncShopify`) | ✅ Real API calls |
| Inngest `daily-sync-all` cron job | ✅ Implemented |
| Inngest `sync-integration` event-driven job | ✅ Implemented |
| Manual re-sync trigger | ⚠️ No explicit endpoint found |

**Missing:**  
- No real credentials → sync jobs will fail at runtime  
- Integrations UI (`app/integrations/connect/page.tsx`) is **UI-only mock** — does not call the real OAuth flow  
- `app/integrations/page.tsx` calls `apiClient` but has `useAuth` → partially wired, may fail without credentials  

---

### Phase 3 — Intelligence Layer ⚠️ PARTIAL (backend exists, frontend mocked)

| Item | Status |
|------|--------|
| `decisions`, `alerts`, `alert_thresholds`, `decision_runs` tables | ✅ In migration `20260420000003_intelligence.sql` |
| Anomaly detection (`anomaly-detection.ts`) | ✅ Implemented — queries `campaign_metrics` |
| Decision generator (`decision-generator.ts`) | ✅ Implemented — OpenRouter integration with BYOK/credits logic |
| Alert detection (`alert-detection.ts`) | ✅ Implemented |
| Backend `GET /api/v1/decisions`, `GET /api/v1/decisions/:id` | ✅ Implemented |
| Backend `POST /api/v1/decisions/refresh` | ✅ Implemented |
| Backend `GET /api/v1/alerts` | ✅ Implemented |
| Inngest `generate-decisions` job | ✅ Implemented (triggered after sync) |

**Missing:**  
- **All Decision/Intelligence frontend pages are UI-only mock** (see Section 2)  
- No data → anomaly detection returns 0 results → no decisions generated  
- `decisions/page.tsx` uses `MOCK_DECISIONS` and `MOCK_INTEGRATIONS` arrays  
- `decisions/[id]/page.tsx` calls `apiClient` — still API-connected but will fail without credentials  

---

### Phase 4 — Execution Layer ⚠️ PARTIAL (backend exists, actions SIMULATED not real)

| Item | Status |
|------|--------|
| `actions_library`, `automation_rules`, `automation_runs`, `decision_history` tables | ✅ In migration `20260420000004_execution.sql` |
| Backend `GET/POST /api/v1/actions`, `POST /api/v1/actions/:id/execute` | ✅ Implemented |
| Backend automation CRUD (`GET/POST/PATCH/DELETE /api/v1/automation/rules`) | ✅ Implemented |
| Backend automation runs `GET /api/v1/automation/runs` | ✅ Implemented |
| Backend decision history `GET /api/v1/history` | ✅ Implemented |
| Inngest automation dispatcher | ✅ Present in automation-engine.ts |
| Decision History logging (all fields: decision, action_taken, trigger, data_used, result, ai_explanation, confidence_score) | ✅ Schema defined, executor writes to it |

**CRITICAL — Action execution is SIMULATED:**  
`backend/src/services/execution/action-executor.ts` line 11-27: ALL handlers return `{ simulated: true, ... }`. No real API calls to Meta/Google are made when an action executes. This is a stub.

**Frontend — all UI-only mock:**  
- `app/actions/page.tsx`, `app/actions/[id]/page.tsx`, `app/actions/logs/page.tsx`, `app/actions/automation/page.tsx` — all use `MOCK_*` data  
- `app/automation/history/page.tsx` — calls `apiClient` (API-connected attempt) but `automation/page.tsx`, `automation/strategies/page.tsx`, `automation/builder/page.tsx` are UI-only mock  

---

### Phase 5 — Creatives ⚠️ PARTIAL (backend exists, frontend mocked)

| Item | Status |
|------|--------|
| `brand_kits`, `creative_generations`, `creatives` tables | ✅ In migrations `20260420000005` + `20260420000006` |
| Storage RLS policies | ✅ In `20260420000006_creatives_hardening.sql` |
| Backend brand-kit routes | ✅ Implemented (`brand-kit.ts`) |
| Backend creatives routes | ✅ Implemented (`creatives.ts`) |
| OpenRouter copy generation service | ✅ Implemented (`copy-generation.ts`) |
| SiliconFlow image generation service | ✅ Implemented (`image-generation.ts`) |
| Inngest `generate-creative` job | ✅ Implemented |
| Creative scoring by performance | ✅ Present in `creative-generator.ts` |

**Missing:**  
- All 4 creatives pages are **UI-only mock** (brand-kit, generator, results, editor)  
- SiliconFlow key not configured  

---

### Phase 6 — Campaigns ⚠️ PARTIAL (backend exists, frontend mocked)

| Item | Status |
|------|--------|
| `campaigns` table | ✅ In migration `20260420000007_campaigns.sql` |
| Backend `GET/POST /api/v1/campaigns` | ✅ Implemented |
| Backend `GET /api/v1/campaigns/:id` | ✅ Implemented |
| Backend `PATCH /api/v1/campaigns/:id` | ✅ Implemented (with role check) |
| Backend `POST /api/v1/campaigns/:id/ai-suggestions` | ✅ Implemented |
| Backend `POST /api/v1/campaigns/:id/push` | ✅ Implemented (push to ad platform) |
| AI campaign suggestions service | ✅ Implemented (`ai-suggestions.ts`) |

**Missing:**  
- All 3 campaign pages are **UI-only mock** (list, detail, create)  
- `campaigns/push` endpoint will fail without real ad platform tokens  

---

### Phase 7 — Monetization + Polish ❌ NOT STARTED

| Item | Status |
|------|--------|
| Stripe integration | ❌ Not implemented |
| Plans (Starter/Growth/Scale) | ❌ Not implemented |
| Credits system | ❌ Not implemented (schema has `plan_type` but no credits table) |
| BYOK OpenRouter key storage | ⚠️ Schema column exists in `organizations`, vault logic in backend, UI not built |
| AppSumo LTD flow | ❌ Not implemented |
| Stripe webhooks | ❌ Not implemented |
| Settings: Account / Team / API Keys / Billing pages | ⚠️ Pages exist as UI-only mocks |
| Rate limiting on API endpoints | ❌ Not implemented |
| Sentry configured | ❌ DSN not set |
| RLS audit | ❌ Not done |
| Error boundaries | ❌ Not implemented |

---

## 2. FRONTEND STATUS

### UI-Only Pages (mock data, no API calls)
These pages have static `MOCK_*` constants and simulate actions with `setTimeout`.

| Page | Path |
|------|------|
| Actions Library | `app/actions/page.tsx` |
| Action Detail | `app/actions/[id]/page.tsx` |
| Execution Logs | `app/actions/logs/page.tsx` |
| Automation Status | `app/actions/automation/page.tsx` |
| Decision Center | `app/automation/page.tsx` |
| Strategies | `app/automation/strategies/page.tsx` |
| Builder | `app/automation/builder/page.tsx` |
| Campaigns List | `app/campaigns/page.tsx` |
| Campaign Detail | `app/campaigns/[id]/page.tsx` |
| Create Campaign | `app/campaigns/create/page.tsx` |
| Creative Generator | `app/creatives/page.tsx` |
| Creative Editor | `app/creatives/editor/page.tsx` |
| Creative Results | `app/creatives/results/page.tsx` |
| Brand Kit | `app/creatives/brand-kit/page.tsx` |
| Dashboard Attribution | `app/dashboard/attribution/page.tsx` |
| Dashboard Cohort | `app/dashboard/cohort/page.tsx` |
| Dashboard Creative | `app/dashboard/creative/page.tsx` |
| Dashboard LTV | `app/dashboard/ltv/page.tsx` |
| Dashboard Profit | `app/dashboard/profit/page.tsx` |
| Dashboard Segment | `app/dashboard/segment/page.tsx` |
| Decisions Overview | `app/decisions/page.tsx` |
| Alerts | `app/decisions/alerts/page.tsx` |
| Audience Insights | `app/decisions/audience/page.tsx` |
| Decision History (old path) | `app/decisions/history/page.tsx` |
| Opportunities | `app/decisions/opportunities/page.tsx` |
| Recommendations | `app/decisions/recommendations/page.tsx` |
| Integrations Connect | `app/integrations/connect/page.tsx` |
| Settings (Permissions) | `app/settings/page.tsx` |
| Settings Billing | `app/settings/billing/page.tsx` |
| Settings Team | `app/settings/team/page.tsx` |

**Total UI-only: ~30 of 40 pages**

---

### API-Connected Pages (call `apiClient` or `useAuth`)
These attempt to reach the backend; will fail if credentials are missing.

| Page | Path | Status |
|------|------|--------|
| Dashboard Overview | `app/dashboard/overview/page.tsx` | Calls `apiClient` for metrics + campaigns |
| Dashboard Channels | `app/dashboard/channels/page.tsx` | Uses `useAuth` |
| Decision Detail | `app/decisions/[id]/page.tsx` | Calls `apiClient` for decision by ID |
| Automation History | `app/automation/history/page.tsx` | Calls `apiClient` |
| Integrations List | `app/integrations/page.tsx` | Uses `useAuth` |

**Inconsistency:** `app/decisions/page.tsx` is flagged as UI-only (uses `MOCK_DECISIONS`) but the detail page `app/decisions/[id]/page.tsx` tries to call the real API — the two pages are inconsistent.

---

## 3. BACKEND STATUS

### Exists (implemented in `backend/src/routes/v1/`)

| Route Group | Endpoints |
|-------------|-----------|
| `/api/v1/auth` | `GET /me` |
| `/api/v1/integrations` | `GET /`, `GET /:id`, `DELETE /:id` |
| `/api/v1/integrations/connect` | `GET /:platform/auth`, `GET /:platform/callback` |
| `/api/v1/metrics` | `GET /summary`, `GET /channels` |
| `/api/v1/decisions` | `GET /run-status`, `GET /`, `GET /:id`, `POST /refresh` |
| `/api/v1/alerts` | `GET /`, `PATCH /:id` |
| `/api/v1/actions` | `GET /`, `GET /:id`, `POST /:id/execute` |
| `/api/v1/history` | `GET /`, `GET /:id` |
| `/api/v1/automation` | `GET /rules`, `POST /rules`, `PATCH /rules/:id`, `DELETE /rules/:id`, `GET /runs` |
| `/api/v1/brand-kit` | `GET /`, `PUT /` |
| `/api/v1/creatives` | `GET /`, `POST /generate`, `GET /:id` |
| `/api/v1/campaigns` | `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `POST /:id/ai-suggestions`, `POST /:id/push` |
| `/health` | `GET /health` |
| `/api/webhooks/clerk` | `POST /` |

### Missing vs. Plan
- No `/api/v1/billing` or Stripe endpoints (Phase 7)
- No `/api/v1/team` or user management endpoints (Phase 7)
- No `/api/v1/settings` endpoints
- No rate limiting middleware on any route
- No credits deduction endpoint
- No manual re-sync trigger endpoint for integrations

---

## 4. DATABASE STATUS

### Tables Defined in Migrations (not confirmed applied to live Supabase)

| Migration | Tables |
|-----------|--------|
| `20260420000001_foundation.sql` | `organizations`, `users`, `subscriptions`, `audit_logs` |
| `20260420000002_data_ingestion.sql` | `integrations`, `ad_accounts`, `campaign_metrics` (partitioned), `sync_logs` |
| `20260420000003_intelligence.sql` | `decision_runs`, `decisions`, `alerts`, `alert_thresholds` |
| `20260420000004_execution.sql` | `actions_library`, `automation_rules`, `automation_runs`, `decision_history` |
| `20260420000005_creatives.sql` | `brand_kits`, `creative_generations`, `creatives` |
| `20260420000006_creatives_hardening.sql` | Storage RLS, batch credit RPCs (alters `creative_generations`) |
| `20260420000007_campaigns.sql` | `campaigns` |

### RLS Status
- All tables have `ENABLE ROW LEVEL SECURITY` in migrations ✅
- All tables include `org_id` column ✅

### Missing vs. Plan
- No `credits` table (Phase 7 credits system)
- No Stripe-linked subscription tracking columns (Phase 7)
- `plan_type` and `vault_byok_openrouter_secret_id` columns exist on `organizations` (good)
- **UNKNOWN:** Whether migrations have actually been applied to a live Supabase project — no `supabase/config.toml` or migration history file found confirming applied state

---

## 5. EXECUTION LAYER

### Decision → Action → Execution Chain

| Step | Status |
|------|--------|
| Decision generated by AI | ⚠️ Backend logic real, but needs live `campaign_metrics` data to trigger |
| User sees decision in UI | ❌ UI is mock — decisions shown are hardcoded `MOCK_DECISIONS` |
| User clicks Execute action | ⚠️ Calls `POST /api/v1/actions/:id/execute` (API-connected only on detail page) |
| Action executor runs | **SIMULATED** — all handlers return `{ simulated: true }` with no real API calls |
| Result logged to `decision_history` | ✅ Schema + executor code writes to DB (if connected) |
| Automation rule triggers via Inngest | ⚠️ Code complete, but no rules exist and no data to trigger conditions |

**Conclusion: The execution loop is NOT real end-to-end.**  
- Data ingestion: code exists, credentials missing  
- Intelligence: code exists, no data to detect  
- Action execution: **always simulated** — `pause_campaign`, `increase_budget`, etc. return fake success without calling Meta/Google APIs  
- Decision History: would log correctly if the chain above worked  

---

## 6. SUMMARY

### What is REAL (code complete and correct)
- Hono backend structure with all route groups
- Supabase schema migrations (7 files, all tables, all RLS)
- Clerk auth wiring (layout, middleware, webhook)
- Meta/Google/Shopify sync services (real API calls)
- Decision generator with OpenRouter + anomaly detection logic
- BYOK / LTD plan logic in backend
- Inngest jobs (daily sync → decisions → creatives pipeline)
- Creative generation services (copy via OpenRouter, images via SiliconFlow)
- Campaign AI suggestions service
- All action executor DB logging

### What is FAKE / Simulated
- **30 of 40 frontend pages** show hardcoded mock data (MOCK_* constants, setTimeout to simulate actions)
- **All action execution** is simulated — `action-executor.ts` returns `{ simulated: true }` for every action type without calling ad platform APIs
- The 5 API-connected pages will return errors in this environment (credentials missing)

### What is Missing to Reach a Working System

| Priority | Item |
|----------|------|
| 🔴 CRITICAL | Set real credentials: backend `.env` (Clerk, Supabase, Meta/Google/Shopify, OpenRouter) |
| 🔴 CRITICAL | Set frontend `.env.local` Clerk + Supabase public keys |
| 🔴 CRITICAL | Apply Supabase migrations to a live project |
| 🔴 CRITICAL | Replace simulated action handlers with real Meta/Google API calls |
| 🟠 HIGH | Wire all 30 UI-only pages to their corresponding backend API endpoints |
| 🟠 HIGH | Implement real OAuth flow for integrations (currently UI-only mock) |
| 🟠 HIGH | Deploy backend to Railway with real env vars |
| 🟡 MEDIUM | Phase 7: Stripe billing, credits system, AppSumo LTD flow |
| 🟡 MEDIUM | Phase 7: Settings pages (account, team, API keys) connected to real data |
| 🟡 MEDIUM | Rate limiting on all API endpoints |
| 🟡 MEDIUM | Sentry DSN configuration |
| 🟡 MEDIUM | Error boundaries on all pages |
| 🟢 LOW | `decisions/page.tsx` — switch from MOCK_DECISIONS to real API |
| 🟢 LOW | Inconsistency: decisions list is mocked but detail page calls real API |
