 PHASE 0 — Architecture Lock (MANDATORY BEFORE EVERYTHING)

Goal: Prevent system corruption before backend starts

🔥🔥 NEW

* REMOVE any Supabase direct writes from Next.js (frontend API routes)
* Ensure ONLY backend writes to database (single writer rule)
* Keep Clerk webhook in ONE place only (backend OR frontend → backend preferred)
* Remove duplicate webhook handlers to avoid race conditions
* Validate org_id is always present in JWT before backend work

Deliverable

* Clean architecture with single source of truth (backend only)

⸻

PHASE 1 — Foundation

Goal: Auth + Database + Backend skeleton working end-to-end

Clerk

* ClerkProvider in app/layout.tsx
* Middleware protecting all private routes
* Sign-in / Sign-up pages (/sign-in, /sign-up)
* Auto-create Organization on sign-up
* Redirect to /dashboard/overview after auth

Supabase Schema

* organizations table
* users table
* subscriptions table
* audit_logs table
* RLS enabled on all tables
* All tables have org_id column

Backend (Hostinger VPS)

* Hono server setup
* Clerk token verification middleware
* Health check endpoint GET /health
* Base API structure /api/v1/
* Error handling + logging
* Clerk webhook handler (POST /api/webhooks/clerk)
* PM2 ecosystem config

🔥 ADDITIONS

* Claude MUST load:
    * CLAUDE.md
    * CONSTITUTION.md
    * ALL /specs/*.md
* Treat MD files as executable instructions
* 🔥 Ensure .env files exist (backend + frontend)
* 🔥 Apply Supabase migrations BEFORE moving to Phase 2

🔥🔥 NEW

* Define backend folder structure BEFORE writing code:
    * /controllers
    * /services
    * /repositories
    * /middleware
    * /utils
* Add request logging middleware (every request logged)
* Add global error handler (standard error format)
* Enforce org_id extraction middleware (reject if missing)

📄 SPECS (Phase 1)

* database-migrations.md
* permissions-roles.md
* team-management.md
* account-settings.md

Deliverable

Auth + org + backend working with real env

⸻

PHASE 2 — Data Ingestion

Goal: Connect ad platforms + pull real data into DB

Integrations

* integrations table
* ad_accounts table
* sync_logs table
* Integrations List page (real data)
* Connect Integration flow (OAuth)

Platforms (Core First)

* Meta Ads API — campaigns + metrics
* Google Ads API — campaigns + metrics
* Shopify API — orders + revenue

Sync Jobs (Inngest)

* Daily sync job per integration
* campaign_metrics table (partitioned by date)
* Sync status + error handling
* Manual re-sync trigger

🔥 ADDITIONS

* REMOVE mock integrations UI completely
* 🔥 Add endpoint:
    POST /api/v1/integrations/:id/sync
* 🔥 Ensure OAuth flow is REAL (not UI only)
* 🔥 Validate credentials before sync

🔥🔥 NEW

* Define API response contract BEFORE implementation:
    * success response format
    * error response format
    * pagination format
* All endpoints MUST:
    * return org-scoped data only
    * reject cross-org access
* Add rate limiting middleware (basic protection from start)

📄 SPECS (Phase 2)

* ai-connectors.md
* ai-jobs.md

Deliverable

Real data flowing into DB

⸻

PHASE 3 — Intelligence Layer

Goal: AI starts generating decisions from data

Decision Engine

* decisions table
* alerts table
* Anomaly detection logic
* Opportunity detection logic
* Decision prioritization engine

Pages (Real Data)

* Dashboard Overview
* Decisions Overview
* Decision Detail
* Alerts Center
* Opportunities

AI Integration (OpenRouter)

* Decision generation prompt
* Anomaly explanation
* Confidence score calculation

🔥 ADDITIONS (CRITICAL)

* REMOVE ALL MOCK DATA
* decisions/page.tsx → API ONLY
* Ensure anomaly detection returns real results

🧠 AI OUTPUT CONTRACT (MANDATORY)

ALL AI responses MUST follow:
{
type: “dashboard” | “insight” | “decision”,
result: any,
confidence_score: number
}

🔥🔥 NEW

* AI responses MUST be validated before saving to DB
* Reject invalid AI output (no silent failures)
* Log every AI request + response

📄 SPECS (Phase 3)

* ai-prompts.md
* ai-dashboard-generator.md
* decisions-overview.md
* decisions-detail.md
* decisions-alerts.md
* decisions-audience.md
* growth-opportunities.md
* dashboard-overview.md
* dashboard-channels.md
* dashboard-attribution.md
* dashboard-cohort.md
* dashboard-creative.md
* dashboard-ltv.md
* dashboard-profit.md
* dashboard-segments.md

Deliverable

System generates real AI decisions

⸻

🔥 PHASE X — AI ORCHESTRATION (CRITICAL)

Goal: Control system brain

📄 SPECS

* mcp-orchestration.md
* mcp-integration.md
* ai-execution.md

⸻

PHASE 4 — Execution Layer

Goal: Execute decisions as real actions

Actions

* actions_library table
* automation_rules table
* automation_runs table
* decision_history table

🔥 ADDITIONS

* REMOVE simulated execution
* action-executor MUST call real APIs

🔥🔥 NEW

* Execution MUST be idempotent
* Always log execution result
* Always include data snapshot
* Enforce org_id validation

📄 SPECS

* execution-engine.md
* action-detail.md
* action-execution-log.md
* actions-overview.md
* actions-automation-status.md
* automation-builder.md
* automation-decision-center.md
* automation-history.md
* automation-strategies.md

⸻

PHASE 5 — Creatives

Goal: AI creatives generation

🔥🔥 NEW

* Link creatives to campaign_metrics (feedback loop)
* Store generation metadata (prompt, model, inputs)

📄 SPECS

* creatives-brand-kit.md
* creatives-editor.md
* creatives-results.md
* creatives-archive.md

⸻

PHASE 6 — Campaigns

🔥🔥 NEW

* Validate org ownership
* Validate ad account ownership
* Prevent cross-account execution

📄 SPECS

* campaigns-list.md
* campaigns-detail.md
* campaigns-execution-focus.md

⸻

PHASE 7 — Monetization + Polish

🔥🔥 NEW

* Credits check BEFORE every AI call
* Log every credit transaction

📄 SPECS

* account-settings.md
* team-management.md
* permissions-roles.md

⸻

🔥 SPEC MAPPING (MANDATORY)

Each phase MUST load only its relevant specs.

* Phase 1 → database + auth
* Phase 2 → connectors + jobs
* Phase 3 → decisions + dashboards
* Phase 4 → execution + automation
* Phase 5 → creatives
* Phase 6 → campaigns
* Phase 7 → billing + settings

🚨 RULES:

* Specs are executable instructions
* If conflict → specs win
* No cross-phase mixing
* If unclear → STOP (no guessing)

⸻

🔥 GLOBAL RULES

FRONTEND

* NO MOCK DATA
* API ONLY

🔥🔥 NEW

BACKEND

* ALL queries MUST include org_id
* NEVER trust client org_id
* Backend = single source of truth

⸻

🚨 WHAT BREAKS SYSTEM

1. Missing ENV
2. Missing migrations
3. Mock UI
4. No real integrations
5. No AI orchestration
6. Missing org_id enforcement