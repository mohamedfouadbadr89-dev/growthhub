
campaigns-execution-focus.md

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

PAGE: app/campaigns/[id]/page.tsx

⸻

🧩 1. UI → Data Mapping

📊 KPI Cards

* spend
* revenue
* roas

⸻

⚡ Execution First Actions

* action_id
* type
* trigger
* button_execute

RULES:

* execution MUST require confirmation modal
* execution MUST display risk level before action
* execution MUST pass backend validation
* HIGH risk actions MUST be blocked or require override
* NO auto execution

⸻

📈 Trend Toggle

* spend
* revenue
* roas

⸻

🎯 Ad Sets + Inline Edit

* budget_editable
* cpa_editable

RULES:

* inline edits MUST go through API
* MUST validate values (budget limits / CPA thresholds)
* MUST NOT apply changes without confirmation

⸻

🧠 Insight Panel

* alert
* description

RULES:

* MUST NOT trigger AI on load
* MUST fetch cached insights only

⸻

⚠️ Risk Engine

* risk_score
* probability
* visualization

RULES:

* risk MUST be precomputed or cached
* MUST be shown BEFORE execution
* MUST be used in validation layer

⸻

🧱 2. Data Shape

type ExecutionView = {
kpis: {
spend: number
revenue: number
roas: number
}

actions: {
id: string
type: string
trigger: string
risk_level?: “low” | “medium” | “high”
status?: “ready” | “blocked” | “pending_approval”
}[]

trend: {
date: string
spend: number
revenue: number
roas: number
}[]

adsets: {
id: string
budget: number
cpa: number
editable: boolean
}[]

insight: {
message: string
}

risk: {
score: number
probability: number
}
}

⸻

🌐 3. API Contracts

GET /api/v1/campaigns/{id}/execution
→ returns execution-ready data (NO AI execution)

⸻

POST /api/v1/actions/execute

RULES:

* MUST require confirmation
* MUST include action_id + campaign_id
* MUST pass validation layer
* MUST include risk evaluation
* MUST NOT execute if risk = HIGH (unless override)

⸻

POST /api/v1/campaigns/{id}/execution/insights/regenerate

RULES:

* triggers AI insights
* cached per campaign
* rate-limited
* manual trigger only

⸻

🗄️ 4. DB Schema

campaigns
adsets
campaign_metrics
execution_logs
risk_scores
ai_insights

⸻

⚙️ 5. Execution Logic

* prioritize actions visually (UX)
* DO NOT auto-execute anything

Execution Flow:

1. user clicks execute
2. confirmation modal يظهر
3. validation layer:
    * check risk
    * check budget constraints
    * check campaign state
4. decision:
    * approved → execute
    * blocked → show reason
    * pending → require approval
5. execute action
6. log result

⸻

🧠 6. AI Layer

AI Usage

* action prioritization (backend only)
* risk prediction (cached / precomputed)

RULES:

* NO AI execution in UI
* NO AI on GET
* ALL AI via POST only
* ALL AI cached

⸻

🧠 AI Cost Protection

* prioritization generated periodically (not per request)
* reused across sessions
* regenerated manually or via background job

⸻

💳 7. Credits System

* execution suggestions → MEDIUM
* insights generation → LOW
* execution → FREE

⸻

🧠 8. AI Usage Classification

* action_engine → HIGH (controlled backend)
* execution → NONE

⸻

📊 9. Marketing Rules

* high ROAS → suggest scaling
* high CPA → suggest reduction
* risky actions → block or require approval

NOTE:

* rules generate suggestions ONLY
* NEVER trigger execution

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:
GET /api/v1/campaigns/{id}/execution

⸻

UX Rules

* execution-first UI BUT NOT unsafe
* minimal friction WITH validation (NOT zero validation)
* always show risk before execution

⸻

Security

* org_id filtering
* no cross-org execution

⸻

Performance

* cache risk scores
* lazy load insights

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

MODE: BROADCAST (CRITICAL)

CHANNEL:

- execution_stream:{org_id}:{campaign_id}

EVENTS:

action_started:
- action_id
- type
- entity
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

action_failed:
- action_id
- error
- timestamp

---

RULES:

- execution MUST trigger realtime event
- UI MUST reflect execution instantly
- NO UI state assumptions (always trust backend)

---

FALLBACK:

- refetch GET /execution after action

---

SECURITY:

- org_id + campaign_id scoped channel


Action UI States:

- idle
- loading (on click)
- success (executed)
- error (failed)

RULES:
- button MUST show loading state during execution
- MUST disable button while processing
- MUST reflect final state visually (success / failed)


Blocked Actions UI:

- if status = blocked:
  - button MUST be disabled
  - MUST show reason tooltip or inline message

- if risk = high:
  - MUST show warning UI (color / icon)
  - MUST require confirmation step (modal or override)


  ## ⚡ RUNTIME TRUTH

EXECUTION SYSTEMS ARE:

- stateful

- latency-sensitive

- approval-sensitive

- provider-dependent

- risk-constrained

- eventually-consistent

- failure-prone

RULES:

- execution success is not guaranteed

- provider APIs may partially fail

- execution latency varies by platform

- campaign metrics may lag after execution

- realtime events may arrive out of order

- approvals may expire

- risk changes dynamically with live metrics

SYSTEM TRUTH PRIORITY:

1. execution engine result

2. provider confirmation

3. validation layer

4. approval state

5. campaign metrics

6. cached risk scores

7. UI state

NEVER:

- assume execution succeeded before backend confirmation

- mutate UI optimistically for critical actions

- calculate risk in frontend

- bypass validation layer

- trust stale approval state

- execute directly from UI

---

## 🔄 COMPETITOR LIFECYCLE

EXECUTION FLOW:

action suggested

→ risk evaluation

→ validation layer

→ approval check

→ confirmation modal

→ execution queued

→ provider execution

→ execution result

→ realtime update

→ metrics refresh

→ audit logging

RULES:

- execution is asynchronous

- provider confirmation is authoritative

- failed execution may require rollback

- validation precedes execution always

- approvals may block execution flow

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- execution queue priority

- rollback semantics

- execution retries

- provider timeout handling

- approval expiration rules

- concurrency locking

- duplicate execution prevention strategy

- execution cooldown windows

- stale risk invalidation

- provider reconciliation rules

- budget override semantics

- execution batching logic

- execution dependency chains

- action idempotency policy

REQUIRED BEFORE SCALE:

- canonical execution lifecycle

- rollback framework

- provider reconciliation strategy

- execution lock model

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- execution completes instantly

- provider APIs are deterministic

- risk remains static during execution

- validation state remains valid indefinitely

- realtime events arrive sequentially

- partial execution means total failure

- cached insights are current forever

- approval implies successful execution

RISKS:

- duplicate executions

- unsafe scaling

- stale risk approvals

- race conditions

- provider desynchronization

- invalid KPI reporting

- inconsistent campaign states

- execution replay bugs

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/actions/:id/status

- GET /api/v1/campaigns/{id}/execution/history

- GET /api/v1/campaigns/{id}/execution/risk

- POST /api/v1/actions/:id/validate

- POST /api/v1/actions/:id/approve

- POST /api/v1/actions/:id/cancel

- POST /api/v1/actions/:id/retry

- POST /api/v1/actions/:id/rollback

MISSING STATES:

- validating

- queued

- executing

- awaiting_provider

- partially_executed

- rollback_required

- rollback_completed

- approval_expired

- stale_risk

- retrying

MISSING FILTERS:

- execution_status

- risk_level

- approval_status

- execution_source

- provider

- action_type

---

## 🌐 REQUIRED BACKEND CONTRACTS

EXECUTION CONTRACT:

INPUT:

- action_id

- campaign_id

- org_id

- user_id

- override_reason?

OUTPUT:

- execution_id

- validation_result

- approval_state

- execution_status

RULES:

- backend-only execution authority

- deterministic validation required

- all executions logged

- org isolation mandatory

---

VALIDATION CONTRACT:

INPUT:

- action_type

- campaign_state

- risk_score

- budget_delta

- approval_state

OUTPUT:

- approved

- blocked

- pending_approval

- validation_errors[]

RULES:

- validation required before every execution

- stale validations rejected

- risk-aware validation mandatory

- deterministic outputs only

---

RISK CONTRACT:

INPUT:

- campaign metrics

- execution type

- spend impact

- anomaly signals

OUTPUT:

- risk_level

- risk_score

- blocking_reason?

- override_required

RULES:

- backend-only risk evaluation

- cached + periodically refreshed

- no frontend derivation

---

REALTIME EXECUTION CONTRACT:

EVENTS:

- action_started

- action_validated

- action_executed

- action_failed

- action_rolled_back

RULES:

- backend is source of truth

- realtime events immutable

- UI must reconcile after events

- no optimistic execution assumptions

---

## 🗄️ REQUIRED TABLES

execution_requests

execution_results

execution_validation_logs

execution_risk_snapshots

execution_approvals

execution_rollbacks

execution_retries

execution_provider_logs

execution_locks

execution_realtime_events

execution_state_history

execution_failures

execution_overrides

execution_queue

execution_audit_logs

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- execution UI

- confirmation modals

- risk indicators

- action buttons

- loading states

- disabled states

- realtime subscriptions

- execution timelines

- execution history UI

- error/success states

CLAUDE MUST NOT IMPLEMENT:

- execution engine

- provider execution logic

- risk scoring engine

- rollback engine

- approval engine

- retry orchestration

- concurrency locking

- provider reconciliation

- autonomous execution

---

## 🛡️ GOVERNANCE BOUNDARIES

EXECUTION GOVERNANCE:

- every execution immutable historically

- approvals auditable

- overrides traceable

- risk snapshots versioned

- rollback history preserved

SECURITY:

- org_id + campaign_id scoped execution

- backend-only provider access

- execution permissions enforced server-side

- realtime channels org-scoped

COMPLIANCE:

- all execution attempts logged

- failed executions preserved

- approval decisions immutable

- provider responses auditable

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- autonomous execution

- AI-driven overrides

- automatic rollback decisions

- predictive execution systems

- self-healing execution logic

- autonomous retry orchestration

- dynamic approval bypassing

- AI-generated execution chains

RULE:

- human approval remains authoritative

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend execution authority

- direct provider API calls from browser

- optimistic execution mutation

- automatic AI execution on GET

- hidden execution retries

- uncached risk recomputation

- frontend-generated validation

- execution without audit logs

- bypassed approval flows

- cross-org execution visibility

---