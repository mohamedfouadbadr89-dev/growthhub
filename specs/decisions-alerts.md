decisions-alerts.md

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

PAGE: decisions/alerts/page.tsx

⸻

🧩 1. UI → Data Mapping

Alerts Feed:

* alert_id
* title
* severity (critical / warning / info / resolved)
* entity_name
* platform
* timestamp

⸻

Alert Details (Expandable):

* root_cause
* suggested_action

⸻

Alert Actions:

* execute_action
* ignore_alert
* linked_decision_id

⸻

Filters:

* severity
* platform
* mode (real-time / historical)

⸻

System Metrics (Sidebar):

* system_stability_score
* stability_trend
* alerts_under_review

⸻

Alert Frequency:

* date
* alerts_count

⸻

Health Scan:

* metric_name
* status
* value

⸻

🧱 2. Data Shape (Normalized)

type Alert = {
  id: string
  title: string
  severity: "critical" | "warning" | "info" | "resolved"

  entity: string
  platform: "meta" | "google" | "tiktok"

  timestamp: string

  details: {
    root_cause: string
    suggested_action: string
  }

  linked_decision_id?: string

  status: "active" | "resolved"
}

type AlertsResponse = {
  alerts: Alert[]

  summary: {
    total_active: number
    critical: number
    warning: number
    info: number
  }

  system: {
    stability_score: number
    trend: number
    alerts_under_review: number
  }

  frequency: {
    date: string
    count: number
  }[]

  health: {
    metric: string
    status: string
    value?: number
  }[]
}


3. API Contracts

GET /api/v1/alerts

Query:

* severity
* platform
* mode

Response:
AlertsResponse

⸻

POST /api/v1/alerts/:id/execute

Purpose:

* execute suggested action

⸻

POST /api/v1/alerts/:id/ignore

Purpose:

* ignore alert

⸻

🗄️ 4. DB Schema

alerts

* id
* org_id
* title
* severity
* entity
* platform
* status
* created_at

⸻

alert_details

* id
* org_id
* alert_id
* root_cause
* suggested_action

⸻

alert_metrics

* id
* org_id
* date
* alerts_count

⸻

system_health

* id
* org_id
* metric
* status
* value
* created_at

⸻

⚙️ 5. Execution Logic

Alert Engine:

detect anomalies based on:

* CPA spikes
* CTR drops
* tracking failures
* API issues

⸻

Severity Logic:

IF major performance drop
→ critical

IF moderate issue
→ warning

IF optimization insight
→ info

IF resolved automatically
→ resolved

⸻

System Stability:

stability_score = weighted health metrics

⸻

Alert Frequency:

aggregate alerts per day

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

anomaly_detection → MEDIUM

signal_processing → LOW

⸻

📊 8. Marketing Rules (CRITICAL)

IF critical alert
→ immediate action

⸻

IF repeated alerts
→ systemic issue

⸻

IF tracking alert
→ fix data pipeline first

⸻

IF resolved alerts increase
→ system stability improving

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/alerts

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* alert detection happens in backend
* frontend only renders

⸻

Security:

* filter by org_id

⸻

Performance:

* use real-time streaming (WebSocket optional)
* cache alerts feed

⸻

🔥 CLAUDE IMPLEMENTATION PROMPT


⸻

Future:

feeds:

* decision engine
* automation triggers
* incident response system

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

MODE: HYBRID

---

1. BROADCAST (PRIMARY)

CHANNEL:

- alerts_stream:{org_id}

EVENTS:

alert_created:
- id
- severity
- entity
- platform
- timestamp

alert_updated:
- id
- status
- severity

alert_resolved:
- id
- timestamp

---

2. POSTGRES_CHANGES (SECONDARY)

TABLES:

- alerts (INSERT / UPDATE)
- system_health (UPDATE)

---

RULES:

- alerts MUST appear instantly
- critical alerts MUST trigger UI highlight
- resolved alerts MUST update in-place

---

UI BEHAVIOR:

- prepend new alerts
- allow live filtering
- maintain scroll position

---

FALLBACK:

- GET /api/v1/alerts every 15s

---

SECURITY:

- org_id isolation
- private channels only


## ⚠️ ALERT DEDUPLICATION

RULE:

- same alert (entity + type) MUST NOT repeat within cooldown window

FIELDS:

- last_triggered_at
- cooldown_minutes

---

IF alert triggered within cooldown
→ ignore

---

## 🔁 ALERT GROUPING

- group similar alerts into cluster

EXAMPLE:

- multiple CPA spikes → one grouped alert


✅ DONE

