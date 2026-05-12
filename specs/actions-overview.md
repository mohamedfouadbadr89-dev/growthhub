actions-overview.md

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

PAGE: app/actions/page.tsx

⸻

🧩 1. UI → Data Mapping

Pending Actions

* id
* title
* platform
* impact_score
* urgency
* effort
* created_at

⸻

Recommended Actions

* id
* title
* linked_decision_id
* expected_impact
* confidence
* effort

RULES:

* recommendations are advisory ONLY
* MUST NOT be executable directly
* MUST go through execution flow

⸻

Executed Actions (History)

* id
* title
* executed_at
* status
* performance_delta

⸻

Filters

* platform
* urgency
* status

⸻

Bulk Actions

* selected_ids[]
* action_type (execute | schedule)

RULES:

* bulk execution MUST validate each action individually
* MUST stop execution if any action is HIGH risk
* MUST require confirmation before execution
* MUST support partial success (not all-or-nothing)

⸻

🧱 2. Data Shape (Normalized)

type Action = {
id: string
title: string
description: string

source: “decision” | “automation” | “manual”
platform: “meta” | “google” | “tiktok”

impact_score: number
urgency: “low” | “medium” | “high”
effort: “low” | “medium” | “high”

confidence?: number

risk_level?: “low” | “medium” | “high”
validation_passed?: boolean

status: “pending” | “executed” | “failed” | “blocked”

created_at: string
executed_at?: string

performance_delta?: number
}

type ActionsResponse = {
pending: Action[]
recommended: Action[]
history: Action[]
}

⸻

🌐 3. API Contracts

Get Actions

GET /api/v1/actions

Query:

* platform
* urgency
* status

Response:
ActionsResponse

⸻

Execute Action

POST /api/v1/actions/:id/execute

RULES:

* MUST require user confirmation
* MUST pass validation layer
* MUST include risk evaluation
* MUST NOT execute if risk = HIGH (unless override)

⸻

Bulk Execute

POST /api/v1/actions/bulk

Body:

* action_ids[]

RULES:

* MUST validate each action individually
* MUST stop unsafe actions
* MUST log per-action result
* MUST support partial execution

⸻

Schedule Action

POST /api/v1/actions/:id/schedule

RULES:

* MUST validate before scheduling
* MUST store schedule safely
* MUST NOT execute immediately

⸻

🗄️ 4. DB Schema

actions

* id
* org_id
* title
* description
* source
* platform
* impact_score
* urgency
* effort
* status
* created_at
* executed_at

⸻

action_logs

* id
* action_id
* status
* result
* performance_delta
* risk_level
* validation_passed
* timestamp

⸻

⚙️ 5. Execution Logic

Priority

priority = impact_score × urgency_weight

⸻

Execution Flow

1. user triggers execution
2. confirmation modal appears
3. validation layer:
    * check API availability
    * check platform constraints
    * check risk level
4. execution decision:
    * approved → execute
    * blocked → log only
    * pending → require approval
5. execute action
6. log result
7. update metrics

⸻

🧠 6. AI Layer

AI Usage

* action generation (backend only)
* recommendations (precomputed or cached)

RULES:

* NO AI execution in UI
* NO AI on GET
* ALL AI must be cached

⸻

🧠 AI Cost Protection

* actions generated periodically (not per request)
* reused across sessions
* regenerated manually or via background jobs

⸻

💳 7. Credits System

* execute action → consumes credits
* bulk execution → higher cost
* viewing actions → FREE

⸻

🧠 8. AI Usage Classification

* action_generation → MEDIUM
* execution → NONE

⸻

📊 9. Marketing Rules

* if impact_score high + effort low → suggest for execution (manual approval required)
* if urgency high → push to top
* if repeated action → suggest automation

NOTE:

* rules generate suggestions ONLY
* NEVER trigger execution

⸻

⚠️ Execution Rules

* ALL actions require explicit trigger
* NO auto-execution from UI
* suggestions are NOT executable directly
* ALL executions must pass validation + approval

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:
GET /api/v1/actions

⸻

Requirements

* loading state
* error state
* empty state

⸻

Security

* filter by org_id
* no cross-org execution

⸻

Performance

* cache actions list
* debounce bulk operations

⸻

Important

* backend handles execution
* frontend triggers only
* NO direct execution from UI

⸻

Future

feeds:

* automation engine
* decision feedback loop

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

- actions_stream:{org_id}

EVENTS:

action_created:
- id
- title
- platform
- impact_score
- urgency
- timestamp

action_updated:
- id
- status
- validation_passed
- risk_level

action_executed:
- id
- status
- performance_delta
- executed_at

action_failed:
- id
- error
- timestamp

---

RULES:

- pending list MUST update in real-time
- executed actions MUST move to history instantly
- failed actions MUST surface immediately

---

UI BEHAVIOR:

- remove from pending on execution
- append to history
- update in-place (no reload)

---

FALLBACK:

- GET /api/v1/actions every 20s

---

SECURITY:

- org_id scoped channel


## ⚠️ ACTION CONFLICT RULE

IF two actions target same entity:

- prioritize higher impact
- block conflicting actions

---

## 🔗 ACTION DEPENDENCY

- some actions require previous action

EXAMPLE:

- cannot scale before fixing CPA issue

## ⚠️ FRONTEND RULES

- MUST render 3 sections:
  - pending
  - recommended
  - history

- recommended actions MUST NOT be executable directly

- ALL execution MUST go through confirmation modal

- ALL numeric fields MUST be raw numbers (no formatting)


GOVERNANCE AUDIT LAYER

## Runtime Truth

CURRENT REALITY:

* app/actions/page.tsx is currently a mocked-shell UI

* page renders successfully through protected routing

* frontend data is currently local mocked state only

* "Inspect Logic" now routes correctly to /actions/[id]

* dynamic action detail routing is operational

* no backend fetch currently powers the overview page

* no realtime stream currently connected

* no execution API currently wired from UI

* current "Deploy Now" behavior is frontend-only mocked interaction

* recommendation cards are currently visual placeholders

* Actions list currently does NOT consume canonical backend Action shape

* GET /api/v1/actions backend contract is NOT yet connected to UI

* current runtime preserves DEFERRED-BY-GOVERNANCE status

---

## Competitor Lifecycle

EXPECTED PRODUCT LIFECYCLE:

decision engine

→ generates recommendation

→ recommendation becomes pending action

→ user validates action

→ execution approval flow

→ execution engine

→ execution logs

→ performance feedback loop

→ automation recommendation

→ decision refinement

CURRENT STATUS:

* lifecycle only partially exists

* execution engine exists minimally in backend

* recommendation-generation lifecycle is NOT implemented

* frontend currently visualizes future-state lifecycle only

---

## Missing Semantics

MISSING DOMAIN SEMANTICS:

* distinction between recommendation vs executable action

* canonical pending-action lifecycle

* approval-state semantics

* risk escalation semantics

* bulk execution semantics

* dependency-chain semantics

* rollback ownership semantics

* realtime event semantics

* conflict-resolution semantics

* execution-authority semantics

* automation promotion semantics

---

## Dangerous Assumptions

CURRENT UI ASSUMPTIONS THAT ARE NOT YET TRUE:

* displayed impact scores imply real backend scoring

* displayed urgency implies validated prioritization

* displayed recommendations imply recommendation engine exists

* displayed execution buttons imply executable backend linkage

* displayed risk labels imply real validation

* displayed automation recommendations imply automation analysis exists

* displayed realtime activity implies realtime stream exists

* displayed execution history implies canonical audit persistence

RULE:

* UI placeholders MUST NOT be interpreted as production truth

---

## Spec Gaps

KNOWN ARCHITECTURE GAPS:

* recommendation engine specification incomplete

* recommendation persistence model undefined

* recommendation scoring lifecycle undefined

* execution approval-state transitions undefined

* bulk conflict-resolution behavior incomplete

* dependency-resolution engine undefined

* realtime reconciliation behavior incomplete

* action-priority weighting rules incomplete

* action replay semantics undefined

* execution ownership boundaries incomplete

---

## Required Backend Contracts

REQUIRED BUT NOT YET FULLY IMPLEMENTED:

GET /api/v1/actions

POST /api/v1/actions/:id/execute

POST /api/v1/actions/:id/schedule

POST /api/v1/actions/bulk

MISSING CONTRACT BEHAVIOR:

* canonical ActionsResponse normalization

* recommendation hydration

* realtime synchronization

* validation pipeline exposure

* risk evaluation response model

* approval workflow state exposure

* execution replay handling

* dependency validation

* conflict detection response

* partial-success bulk response model

---

## Required Tables

REQUIRED TABLES FOR FULL IMPLEMENTATION:

actions

action_logs

action_execution_queue

action_conflicts

action_dependencies

action_recommendations

action_validation_results

action_rollback_logs

action_realtime_events

CURRENT STATUS:

* only partial schema currently exists

* recommendation-layer persistence incomplete

* rollback persistence missing

* dependency persistence missing

* realtime event persistence missing

---

## Execution Boundaries

STRICT EXECUTION BOUNDARIES:

* frontend MUST NEVER execute platform APIs directly

* frontend MUST NEVER generate AI decisions

* frontend MUST NEVER bypass validation layer

* frontend MUST NEVER bypass approval flow

* execution authority belongs ONLY to backend

* validation authority belongs ONLY to backend

* risk authority belongs ONLY to backend

* rollback authority belongs ONLY to backend

* realtime authority belongs ONLY to backend infrastructure

---

## Governance Boundaries

DEFERRED-BY-GOVERNANCE SURFACES:

* recommendation engine

* automated prioritization

* realtime synchronization

* bulk execution orchestration

* rollback engine

* dependency engine

* conflict engine

* approval workflow engine

* execution queue orchestration

* recommendation persistence lifecycle

RULE:

* frontend may expose navigation safely

* frontend MUST NOT simulate backend truth beyond approved mocked-shell scope

---

## What Claude Can Safely Implement

SAFE IMPLEMENTATION ZONE:

* route exposure

* UI navigation

* loading states

* empty states

* error states

* frontend rendering structure

* non-executable placeholders

* static layout improvements

* frontend-only organization

* guarded API integration

* safe GET-based rendering

* readonly realtime placeholders

* explicit mocked-shell labeling

---

## What MUST Remain Deferred

DEFERRED UNTIL SPEC + BACKEND AUTHORITY EXIST:

* real recommendation generation

* automated action prioritization

* execution orchestration

* rollback engine

* dependency-resolution engine

* realtime execution synchronization

* approval workflow engine

* bulk execution engine

* canonical risk scoring

* execution replay engine

* automation promotion engine

---

## What Should NEVER Exist

FORBIDDEN ARCHITECTURE PATTERNS:

* direct frontend AI execution

* direct frontend platform execution

* frontend-owned risk evaluation

* frontend-owned approval bypass

* frontend-owned rollback execution

* auto-execution on page load

* GET-triggered AI generation

* fallback AI generation

* client-side secret exposure

* mock execution pretending to be real execution

* cross-org action visibility

* non-auditable execution flows

* execution without idempotency

* execution without validation

* execution without logging

