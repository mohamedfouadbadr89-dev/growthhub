action-execution-log.md

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


PAGE: actions/logs/page.tsx

⸻

🧩 1. UI → Data Mapping

Logs Table:

* action_id
* title
* status
* result
* performance_delta
* timestamp

⸻

Filters:

* status
* platform
* date_range

⸻

🧱 2. Data Shape

type ActionLog = {
  action_id: string
  title: string

  status: "success" | "failed" | "partial"

  result: string
  performance_delta: number

  timestamp: string
}

type LogsResponse = {
  logs: ActionLog[]
}

3. API Contracts

GET /api/v1/actions/logs

Query:

* status
* date_range

Response:
LogsResponse

⸻

🗄️ 4. DB Schema

action_logs

⸻

⚙️ 5. Execution Logic

logs created after every execution

⸻

💳 6. Credits

no credits

⸻

🧠 7. AI Usage

none

⸻

📊 8. Rules

if failure rate high → alert

⸻

🧾 9. Comments

pure tracking page

⸻


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

- execution_logs:{org_id}

EVENTS:

execution_started:
- action_id
- type
- entity_id
- timestamp

execution_completed:
- action_id
- status
- result
- performance_delta
- timestamp

execution_failed:
- action_id
- error
- timestamp

---

RULES:

- logs MUST be written AFTER execution
- realtime MUST reflect execution state instantly
- UI MUST prepend new logs (no refresh)
- events MUST be idempotent (no duplicates)

---

FALLBACK:

- GET /api/v1/actions/logs (polling every 20s if disconnected)

---

SECURITY:

- org_id scoped channel
- RLS enforced on realtime.messages


## ⚠️ RETRY LOGIC

- retry_count
- max_retries

IF failure:
→ retry up to threshold

---

## ❌ FAILURE CLASSIFICATION

types:

- API_ERROR
- VALIDATION_ERROR
- PLATFORM_ERROR
- TIMEOUT

---

USE:

- debugging
- risk engine


✅ DONE