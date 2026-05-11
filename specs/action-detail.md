action-detail.md
## 🔒 SYSTEM ENFORCEMENT LAYER

AI_GATEWAY: REQUIRED
AI_SOURCE: API_GATEWAY_ONLY

RULES:
- ❌ NO direct AI calls from frontend
- ❌ NO AI generation on GET requests
- ❌ NO "if missing → generate"
- ✅ AI only triggered via POST endpoints
- ✅ ALL AI responses must be cached

CACHE:
- required for all AI outputs
- key: org_id + entity_id + type

RATE LIMIT:
- per user
- per org
- prevent duplicate execution within 60s

---

## 🧱 DATABASE SOURCE

DB_PROVIDER: SUPABASE_ONLY

RULES:
- ❌ NO local database
- ❌ NO prisma migrations
- ❌ NO mock data in production
- ✅ ALL tables must exist in Supabase
- ✅ ALL writes go through Supabase API / RPC

---

## 🔐 SECRETS MANAGEMENT

VAULT: SUPABASE_VAULT

USE:
- OpenRouter keys
- BYOK users
- external APIs

RULES:
- ❌ NEVER expose keys to frontend
- ❌ NEVER log secrets
- ✅ fetch at runtime only

---

## ⚡ AI EXECUTION RULE

- AI must NEVER run on page load
- AI must be triggered ONLY by user action
- AI must be cached after execution


PAGE: actions/[id]/page.tsx

⸻

🧩 1. UI → Data Mapping

Action Header:

* id
* title
* description
* platform
* source

⸻

Impact & Confidence:

* impact_score
* confidence

⸻

Execution Plan:

* steps[]
* estimated_time
* automation_possible

⸻

Simulation:

* projected_revenue
* cost_impact
* roas_change

⸻

Risk Analysis:

* risks[]
* severity
* worst_case

⸻

Execution Logs:

* status
* result
* timestamp

⸻

🧱 2. Data Shape


type ActionDetail = {
  id: string
  title: string
  description: string

  platform: string
  source: string

  impact_score: number
  confidence: number

  execution_plan: {
    steps: string[]
    estimated_time: string
    automation_possible: boolean
  }

  simulation: {
    revenue: number
    cost_change: number
    roas_change: number
  }

  risks: {
    id: string
    message: string
    severity: "low" | "medium" | "high"
  }[]

  logs: {
    status: string
    result: string
    timestamp: string
  }[]
}


3. API Contracts

GET /api/v1/actions/:id

Response:
ActionDetail

⸻
POST /actions/:id/execute

RULES:
- requires confirmation if risk ≥ medium
- blocked if risk = high (unless override)
⸻

🗄️ 4. DB Schema

extends actions + action_logs

⸻

⚙️ 5. Execution Logic

## 🧠 Simulation Rules

- simulation is BACKEND ONLY
- MUST NOT auto-trigger
- runs only on explicit user request
if risk high → require confirmation

⸻

💳 6. Credits

simulation → small cost
execution → standard cost

⸻

🧠 7. AI Usage

simulation → MEDIUM

⸻

📊 8. Rules

if confidence < 70% → show warning

if risk high → block auto execution

⸻

🧾 9. Comments

backend owns simulation

⸻

## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔁 ACTION STATE MACHINE

status:

- pending
- validated
- approved
- executing
- success
- failed
- rolled_back

---

RULE:

- every action MUST go through state transitions
- no direct execution jump

## ⚠️ IDEMPOTENCY

- every execution MUST include idempotency_key

RULE:

- same action MUST NOT execute twice
- duplicate requests MUST return same result

## 🔁 RETRY SYSTEM

IF execution fails:

- retry max 3 times
- exponential backoff

IF still fails:

- mark as failed
- trigger alert

## 🛑 ROLLBACK SYSTEM

REQUIRED FOR:

- budget changes
- bid changes
- audience changes

---

RULE:

- every action MUST have rollback plan

## 🔴 REALTIME EXECUTION

CHANNEL:

action_updates:{org_id}

EVENTS:

- action_started
- action_completed
- action_failed

---

RULE:

- UI MUST reflect execution instantly


## ⚠️ SIMULATION RULES

- simulation MUST be cached
- MUST reuse previous results if unchanged

---

KEY:

org_id + action_id + input_hash

## 🔗 DECISION → ACTION FLOW

audience recommendation → creates action

action → goes to execution engine

execution → logs result

result → feeds back to:

- decision engine
- audience scoring


GOVERNANCE AUDIT LAYER

Runtime Truth

CURRENT REALITY:

* app/actions/[id]/page.tsx is currently a mocked-shell UI
* page renders successfully through dynamic routing
* frontend data is local mocked state only
* NO real recommendation engine exists yet
* NO real simulation engine exists yet
* NO realtime execution pipeline exists yet
* backend execution substrate EXISTS separately via executeAction
* actions_library EXISTS as execution template catalog
* decision_history EXISTS as audit + execution history layer
* Action Detail UI currently does NOT reflect runtime backend truth

⸻

Competitor Lifecycle

Typical competitor flow:

AI insight
→ recommendation
→ scoring
→ simulation
→ approval
→ execution
→ rollback
→ reporting

Current system status:

* execution substrate exists
* recommendation lifecycle authority DOES NOT exist yet
* scoring authority incomplete
* simulation authority missing
* rollback authority missing

This page is currently a PREVIEW of a future lifecycle.

NOT a fully wired runtime system.

⸻

Missing Semantics

The following semantic layers are currently undefined or incomplete:

* recommendation ownership
* recommendation lifecycle
* confidence semantics
* impact scoring semantics
* risk semantics
* simulation semantics
* approval semantics
* rollback semantics
* realtime execution semantics
* execution visibility semantics

⸻

Dangerous Assumptions

The frontend MUST NOT assume:

* displayed confidence is real
* displayed simulation is real
* displayed impact score is real
* displayed risks are runtime validated
* execution has actually occurred
* automation exists behind UI controls
* rollback protection exists
* realtime exists
* recommendation engine exists

UI state MUST NOT imply backend guarantees.

⸻

Spec Gaps

The following architecture gaps currently exist:

* missing recommendations authority layer
* missing recommendation state machine
* missing simulation engine specification
* missing execution approval specification
* missing rollback specification
* missing realtime execution specification
* missing recommendation-generation specification

The current page spec exceeds current backend reality.

⸻

Required Backend Contracts

Future safe implementation requires:

GET /api/v1/actions/:id
→ ActionDetail authoritative response

POST /api/v1/actions/:id/execute
→ governed execution entrypoint

Future required contracts may include:

* simulation contracts
* recommendation contracts
* approval contracts
* rollback contracts
* realtime event contracts

These contracts DO NOT fully exist yet.

⸻

Required Tables

Current runtime already includes:

* actions_library
* decision_history

Future implementation may require:

* recommendations
* recommendation_scores
* recommendation_simulations
* action_approvals
* action_rollbacks
* action_execution_events

DO NOT implement prematurely.

⸻

Execution Boundaries

Frontend responsibilities:

* rendering only
* user interaction only
* explicit execution initiation only

Frontend MUST NEVER:

* calculate scoring
* calculate risk
* generate simulations
* trigger AI automatically
* execute platform mutations directly
* own execution state machine

Backend owns ALL execution truth.

⸻

Governance Boundaries

This page is GOVERNANCE-DEFERRED.

Allowed:

* mocked-shell rendering
* routing
* safe frontend exposure
* isolated UI iteration

NOT allowed:

* speculative backend wiring
* fake orchestration
* hidden execution systems
* implicit automation
* recommendation engine invention
* fake runtime guarantees

⸻

What Claude Can Safely Implement

Claude MAY safely implement:

* routing exposure
* isolated UI rendering
* mocked-shell improvements
* loading states
* error states
* empty states
* frontend-only interaction polish
* component isolation
* governance-safe refactors

WITHOUT backend expansion.

⸻

What MUST Remain Deferred

The following MUST remain deferred until architecture authority exists:

* recommendation engine
* confidence engine
* risk engine
* simulation engine
* rollback engine
* realtime execution
* approval workflows
* execution orchestration
* recommendation lifecycle
* autonomous execution systems

⸻

What Should NEVER Exist

The system MUST NEVER contain:

* direct frontend AI calls
* direct frontend execution
* hidden autonomous execution
* fake execution success
* fake runtime guarantees
* client-side scoring truth
* client-side risk authority
* uncached AI execution
* implicit AI execution on page load
* frontend-owned orchestration
* execution without audit trail


✅ DONE

