
campaigns-detail.md

🔒 SYSTEM ENFORCEMENT LAYER

AI_GATEWAY: REQUIRED
AI_SOURCE: API_GATEWAY_ONLY

RULES:

* NO direct AI calls from frontend
* NO AI generation on GET requests
* NO “if missing → generate”
* AI only triggered via POST endpoints
* ALL AI responses must be cached

CACHE:

* required for all AI outputs
* key: org_id + entity_id + type

RATE LIMIT:

* per user
* per org
* prevent duplicate execution within 60s

⸻

🧱 DATABASE SOURCE

DB_PROVIDER: SUPABASE_ONLY

RULES:

* NO local database
* NO prisma migrations
* NO mock data in production
* ALL tables must exist in Supabase
* ALL writes go through Supabase API / RPC

⸻

🔐 SECRETS MANAGEMENT

VAULT: SUPABASE_VAULT

USE:

* OpenRouter keys
* BYOK users
* external APIs

RULES:

* NEVER expose keys to frontend
* NEVER log secrets
* fetch at runtime only

⸻

⚡ AI EXECUTION RULE

* AI must NEVER run on page load
* AI must be triggered ONLY by user action
* AI must be cached after execution

⸻

PAGE: campaigns/[id]/page.tsx

⸻

🧩 1. UI → Data Mapping

📊 KPI Summary

* total_spend
* total_revenue
* roas
* change_percent

⸻

⚡ Direct Execution Layer

* action_id
* action_type (increase_budget | shift_budget)
* trigger_condition
* risk_level (SAFE | STRATEGIC | HIGH)
* status (ready | executed | blocked | pending_approval)

RULES:

* NO auto execution
* ALL actions require user confirmation
* HIGH risk actions require additional approval
* execution must pass backend validation

⸻

📈 Trend Analysis

* date
* spend
* revenue
* roas

⸻

🎯 Ad Sets Table

* adset_id
* name
* status
* budget
* spend
* roas
* cpa
* created_at

⸻

🎨 Creatives (Expanded Row)

* creative_id
* type (video | static)
* performance_roas

⸻

🧠 AI Insight

* alert_title
* description
* affected_entities
* metric_change

RULES:

* MUST be fetched from cache/DB
* MUST NOT trigger AI automatically

⸻

💡 Recommendations

* recommendation_id
* title
* description
* impact_level

RULES:

* generated via backend only
* applied only via POST endpoint
* NO auto-apply

⸻

⚠️ Risk Analysis

* risk_type
* probability
* description

⸻

🧱 2. Data Shape

type CampaignDetail = {
summary: {
spend: number
revenue: number
roas: number
change_percent: number
}

actions: {
id: string
type: string
trigger: string
risk: “low” | “medium” | “high”
status: “ready” | “executed” | “blocked” | “pending_approval”
}[]

trend: {
date: string
spend: number
revenue: number
roas: number
}[]

adsets: {
id: string
name: string
status: string
budget: number
spend: number
roas: number
cpa: number
created_at: string
}[]

creatives: {
id: string
type: string
roas: number
}[]

ai_insight: {
title: string
description: string
metric_change: string
}

recommendations: {
id: string
title: string
description: string
impact: string
}[]

risk: {
type: string
probability: number
description: string
}
}

⸻

🌐 3. API Contracts

GET /api/v1/campaigns/{id}
→ returns FULL campaign data (NO AI execution)

⸻

POST /api/v1/campaigns/{id}/insights/regenerate

RULES:

* triggers AI insight generation
* must go through AI Gateway
* cached per campaign_id
* rate-limited

⸻

POST /api/v1/campaigns/action

RULES:

* requires user confirmation
* must pass validation layer
* must include risk check
* MUST NOT execute if risk = HIGH (unless override)

⸻

POST /api/v1/campaigns/recommendations/apply

RULES:

* manual trigger only
* must pass validation
* no auto-apply

⸻

🗄️ 4. DB Schema

campaigns
adsets
creatives
campaign_metrics
recommendations
risks
ai_insights (cached)

⸻

⚙️ 5. Execution Logic

* detect signals (ROAS, CPA) → backend only
* generate suggestions → NOT execution
* execution requires:

1. validation layer:
    * risk evaluation
    * constraint checks
    * budget safety
2. approval layer:
    * required for medium/high risk
3. execution decision:
    * approved → execute
    * blocked → log only
    * pending → wait

⸻

🧠 6. AI Layer

AI Usage

* anomaly detection (backend only)
* recommendation generation (POST only)
* risk prediction (precomputed / cached)

RULES:

* NO AI in GET
* NO auto-trigger
* ALL AI must be cached

⸻

🧠 AI Cost Protection

* insights generated ONCE per campaign
* reused across sessions
* regenerated manually only

⸻

💳 7. Credits System

* insight generation → LOW
* recommendations → MEDIUM
* viewing data → FREE

⸻

🧠 8. AI Usage Classification

* anomaly_detection → MEDIUM
* recommendations → HIGH
* execution → NONE

⸻

📊 9. Marketing Rules

* ROAS > 4 → suggest scale
* CPA increase > 20% → alert
* low ROAS adset → suggest optimization

NOTE:

* rules generate suggestions ONLY
* NEVER trigger execution

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:
GET /api/v1/campaigns/{id}

⸻

Execution UI

* must include confirmation modal
* must display risk level before execution
* must allow cancel

⸻

Security

* org_id filtering
* no cross-org data access

⸻

Performance

* cache campaign metrics
* lazy load creatives

⸻

Important

* NO auto execution
* NO AI on page load
* ALL execution must pass validation + approval


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI

## 🔴 REALTIME STRATEGY

SOURCE: SUPABASE_REALTIME

MODE: HYBRID

---

1. BROADCAST (PRIMARY)

CHANNEL:

- campaign_execution:{org_id}:{campaign_id}

EVENTS:

action_triggered:
- action_id
- type
- timestamp

action_validated:
- action_id
- risk_level
- status

action_executed:
- action_id
- result
- performance_delta
- timestamp

action_blocked:
- action_id
- reason

---

2. POSTGRES_CHANGES (SECONDARY)

TABLES:

- campaign_metrics (UPDATE)
- adsets (UPDATE)

---

RULES:

- UI MUST reflect execution instantly
- NO optimistic UI (always wait backend)
- KPI cards MUST update after execution

---

FALLBACK:

- refetch campaign API after action

---

SECURITY:

- org_id + campaign_id isolation


## ⚡ RUNTIME TRUTH

CAMPAIGN DETAILS ARE:

- attribution-sensitive

- execution-sensitive

- risk-dependent

- latency-sensitive

- platform-dependent

- approval-dependent

- realtime-volatile

RULES:

- KPI values may change after delayed attribution

- campaign execution effects are not immediate

- risk evaluation may change based on fresh metrics

- adset performance may diverge from campaign performance

- recommendations are probabilistic, not guarantees

- realtime metrics are eventually consistent

- campaign actions may fail at provider level

SYSTEM TRUTH PRIORITY:

1. platform execution result

2. attribution engine

3. campaign metrics

4. adset metrics

5. decision engine

6. recommendations

7. UI aggregates

NEVER:

- assume execution success before provider confirmation

- update KPIs optimistically

- calculate risk in frontend

- auto-apply recommendations

- classify campaign state from partial attribution windows

- trust stale metrics during execution flow

---

## 🔄 COMPETITOR LIFECYCLE

CAMPAIGN DETAIL FLOW:

campaign active

→ metrics accumulation

→ anomaly detection

→ recommendation generation

→ validation layer

→ approval flow

→ execution request

→ provider execution

→ execution result

→ feedback loop

→ updated campaign state

RULES:

- recommendations require historical context

- execution outcomes may lag

- risk evaluation must precede execution

- campaign state transitions are gradual

- provider APIs may partially succeed

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- execution rollback semantics

- attribution reconciliation windows

- recommendation scoring methodology

- action cooldown periods

- budget guardrails

- approval escalation rules

- adset inheritance behavior

- campaign objective normalization

- execution retry strategy

- provider timeout behavior

- anomaly confidence scoring

- campaign saturation semantics

- spend pacing logic

- multi-platform execution mapping

- recommendation conflict resolution

REQUIRED BEFORE SCALE:

- canonical execution lifecycle

- recommendation governance model

- risk scoring framework

- execution rollback policy

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- recommendation = guaranteed improvement

- provider execution succeeds instantly

- campaign metrics update synchronously

- low CPA always means healthy scaling

- adset ROAS reflects campaign health

- blocked execution means failure

- realtime data is complete

- recommendations remain valid indefinitely

RISKS:

- false-positive recommendations

- unsafe scaling

- invalid execution approvals

- stale recommendation execution

- attribution mismatch

- duplicated budget allocation

- inconsistent KPI reporting

- delayed anomaly detection

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/campaigns/{id}/trend

- GET /api/v1/campaigns/{id}/alerts

- GET /api/v1/campaigns/{id}/risks

- GET /api/v1/campaigns/{id}/recommendations

- GET /api/v1/campaigns/{id}/executions

- GET /api/v1/campaigns/{id}/adsets

- GET /api/v1/campaigns/{id}/creatives

- GET /api/v1/campaigns/{id}/history

- POST /api/v1/campaigns/{id}/validate-action

- POST /api/v1/campaigns/{id}/request-approval

- POST /api/v1/campaigns/{id}/cancel-action

MISSING FILTERS:

- attribution_window

- lifecycle_state

- adset_status

- creative_type

- risk_level

- recommendation_type

- execution_status

MISSING STATES:

- validating

- awaiting_provider

- partially_executed

- stale_metrics

- delayed_attribution

- approval_required

- execution_failed

- rollback_pending

- anomaly_detected

- awaiting_refresh

---

## 🌐 REQUIRED BACKEND CONTRACTS

CAMPAIGN DETAIL CONTRACT:

INPUT:

- campaign_id

- org_id

- attribution_window

OUTPUT:

- summary

- adsets

- creatives

- recommendations

- risks

- execution_state

RULES:

- backend aggregation only

- org isolation mandatory

- deterministic KPI calculation

- realtime-safe outputs required

---

RECOMMENDATION CONTRACT:

INPUT:

- campaign metrics

- adset metrics

- historical trends

- anomaly signals

OUTPUT:

- recommendations[]

- confidence_score

- impact_estimate

RULES:

- recommendations are advisory only

- no automatic execution

- cached outputs mandatory

- backend-only generation

---

EXECUTION VALIDATION CONTRACT:

INPUT:

- action_type

- campaign_id

- org_id

- user_id

OUTPUT:

- validation_passed

- risk_level

- approval_required

- blocking_reasons[]

RULES:

- every execution validated independently

- high-risk actions blocked or escalated

- deterministic validation mandatory

- all validations logged

---

RISK ANALYSIS CONTRACT:

INPUT:

- campaign metrics

- budget delta

- execution history

- anomaly signals

OUTPUT:

- risk_level

- probability

- explanation

RULES:

- backend-only risk evaluation

- cached outputs

- historical comparison required

---

## 🗄️ REQUIRED TABLES

campaign_execution_requests

campaign_execution_results

campaign_recommendation_history

campaign_risk_history

campaign_alerts

campaign_anomalies

campaign_validation_logs

campaign_approval_requests

campaign_execution_queue

campaign_execution_rollbacks

campaign_provider_logs

campaign_trend_snapshots

campaign_realtime_events

campaign_action_history

campaign_signal_scores

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- campaign detail UI

- KPI cards

- recommendation cards

- trend charts

- risk panels

- confirmation modals

- realtime subscriptions

- expandable creatives

- loading/error/empty states

- execution status indicators

CLAUDE MUST NOT IMPLEMENT:

- execution engine

- provider execution logic

- recommendation engine

- anomaly detection engine

- risk scoring engine

- automatic scaling

- automatic budget shifting

- autonomous optimization logic

---

## 🛡️ GOVERNANCE BOUNDARIES

EXECUTION GOVERNANCE:

- every execution auditable

- approval flows immutable historically

- risk evaluations versioned

- recommendations historically traceable

SECURITY:

- org_id + campaign_id isolation mandatory

- backend-only execution authority

- execution permissions validated server-side

- realtime channels scoped per org + campaign

COMPLIANCE:

- execution logs immutable

- approvals traceable

- recommendation generation auditable

- rollback history preserved

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- autonomous execution

- AI-driven budget scaling

- predictive campaign automation

- automatic anomaly correction

- autonomous recommendation application

- AI-generated execution chains

- dynamic provider optimization

- self-adjusting campaign systems

RULE:

- execution must remain human-approved initially

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend execution authority

- optimistic KPI mutation

- browser-side risk scoring

- automatic AI execution on GET

- uncached recommendation recomputation

- hidden execution flows

- direct provider API execution from frontend

- automatic recommendation apply

- cross-org campaign visibility

- frontend-generated execution statuses

---