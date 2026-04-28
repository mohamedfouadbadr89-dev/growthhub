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

📄 SPECS (Phase 3)

* ai-prompts.md 🔥
* ai-dashboard-generator.md 🔥
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

🔥 PHASE X — AI ORCHESTRATION (CRITICAL LAYER)

Goal: Control system brain (not optional)

MCP Orchestration

* decide when AI uses tools
* multi-step reasoning:
    campaign → insight → creatives → execution

Execution Routing

* detect request type:
    * dashboard
    * insight
    * decision
* route correctly

Tool Governance

* max tool calls
* timeout handling
* fallback logic

AI Contract Enforcement

* enforce response schema globally

📄 SPECS (CRITICAL)

* mcp-orchestration.md 🔥🔥🔥
* mcp-integration.md
* ai-execution.md 🔥

Deliverable

AI behaves like SYSTEM (not chatbot)

⸻

PHASE 4 — Execution Layer

Goal: Execute decisions as real actions

Actions

* actions_library table
* automation_rules table
* automation_runs table
* decision_history table

🔥 ADDITIONS (CRITICAL)

* REMOVE simulated execution
* action-executor MUST call real APIs

Execution Engine

* central execution router
* maps actions → APIs

📄 SPECS (Phase 4)

* execution-engine.md 🔥
* action-detail.md
* action-execution-log.md
* actions-overview.md
* actions-automation-status.md
* automation-builder.md
* automation-decision-center.md
* automation-history.md
* automation-strategies.md

Deliverable

Real execution + logging

⸻

PHASE 5 — Creatives

Goal: AI creatives generation

Brand Kit

* brand_kits table
* assets upload

Creative Generation

* creative_generations
* creatives
* OpenRouter copy
* SiliconFlow images

🔥 ADDITIONS

* REMOVE mock UI
* add creative feedback loop

🐍 PYTHON (IMPORTANT)

Python starts HERE

Used for:

* image pipelines
* video generation
* heavy AI processing

👉 YOU setup Python env (not Claude)
👉 install libs before starting Phase 5

📄 SPECS (Phase 5)

* creatives-brand-kit.md
* creatives-editor.md
* creatives-results.md
* creatives-archive.md

Deliverable

AI generates + optimizes creatives

⸻

PHASE 6 — Campaigns

Goal: Campaign management

Campaigns

* backend ready

🔥 ADDITIONS

* connect decisions → campaigns
* REMOVE mock UI

📄 SPECS (Phase 6)

* campaigns-list.md
* campaigns-detail.md
* campaigns-execution-focus.md

Deliverable

Campaign creation + push

⸻

PHASE 7 — Monetization + Polish

Goal: Production-ready SaaS

Billing

* Stripe integration
* Plans
* Credits system

🔥 CREDITS SYSTEM

tables:

* credits_balance
* credits_transactions

logic:
check → deduct → execute → log

🔥 ADMIN DASHBOARD

* org management
* usage tracking
* AI usage monitoring

🔥 FOOTER PAGES

Create pages based on competitor research:

* Terms
* Privacy
* Refund Policy
* Contact
* About

👉 create separate MD if needed OR inline here

📄 SPECS (Phase 7)

* account-settings.md
* team-management.md
* permissions-roles.md

Deliverable

Full SaaS live

⸻

🔥 GLOBAL RULES

FRONTEND

* NO MOCK DATA
* API ONLY
* loading + error states required

⸻

GIT + WORKFLOW (CRITICAL)

After EVERY completed step:

* commit to GitHub
* push to current branch

DATABASE

After ANY schema change:

* create migration
* apply in Supabase

⸻

API UPDATES

👉 ALWAYS update PLAN (not CLAUDE.md)

⸻

SKILLS (IMPORTANT)

Claude must operate with:

* marketing reasoning
* ad platform logic
* growth thinking
* clerk auth understanding

⸻

🚨 WHAT WILL BREAK EXECUTION

If any missing → system fails:

1. ENV not set
2. Supabase migrations not applied
3. UI still mock
4. action executor still simulated
5. no real integrations
6. AI orchestration not implemented