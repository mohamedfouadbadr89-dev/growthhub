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

PAGE: actions/page.tsx

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