decisions-alerts.md

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

✅ DONE

