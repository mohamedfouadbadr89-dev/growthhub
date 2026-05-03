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

✅ DONE

