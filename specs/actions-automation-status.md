actions-automation-status.md

PAGE: dashboard/actions/automation-status/page.tsx

⸻

🧩 1. UI → Data Mapping

System Status:

* mode (autonomous / manual)
* active_automations_count
* system_status

⸻

Performance Metrics:

* revenue_impact
* cpa_improvement
* execution_frequency

⸻

Active Automations Grid:

* id
* name
* platforms[]
* status
* entities_count
* impact_value
* efficiency_metric (roas / cpa / etc)
* execution_frequency

⸻

Live Activity Feed:

* id
* event_type
* message
* platform
* entity_name
* timestamp

⸻

Risk & Safety:

* stop_loss_status
* rollback_active
* platform_alerts_count

⸻

System Control Panel:

* pause_all
* resume_all
* system_sensitivity

⸻

🧱 2. Data Shape (Normalized)

type AutomationStatusOverview = {
  system: {
    mode: "autonomous" | "manual"
    status: "healthy" | "warning" | "critical"
    active_automations: number
    last_sync: string
  }

  metrics: {
    revenue_impact: number
    cpa_improvement: number
    execution_frequency: number
  }

  automations: {
    id: string
    name: string

    platforms: ("meta" | "google" | "tiktok" | "snap")[]

    status: "running" | "paused"

    entities_count: number

    impact: number

    metric: {
      type: "roas" | "cpa" | "efficiency"
      value: number
    }

    execution_frequency: string
  }[]

  activity: {
    id: string
    type: "budget_update" | "creative_rotation" | "bid_change" | "automation_deploy"

    message: string
    platform: string
    entity: string

    timestamp: string
  }[]

  risk: {
    stop_loss: "active" | "inactive"
    rollback_active: number
    platform_alerts: number
  }

  controls: {
    sensitivity: number
  }
}


3. API Contracts

GET /api/v1/actions/automation-status

Response:
AutomationStatusOverview

⸻

POST /api/v1/actions/system/pause

⸻

POST /api/v1/actions/system/resume

⸻

POST /api/v1/actions/system/sensitivity

Body:

* sensitivity (0 → 1)

⸻

🗄️ 4. DB Schema

automations (reuse)

⸻

automation_runs

* id
* automation_id
* action_type
* entity_id
* result
* created_at

⸻

system_state

* id
* org_id
* mode
* sensitivity
* last_sync
* created_at

⸻

system_logs (CRITICAL)

* id
* org_id
* type
* message
* platform
* entity
* created_at

⸻

alerts

* id
* org_id
* type
* severity
* status
* created_at

⸻

⚙️ 5. Execution Logic

System Mode:

if mode = autonomous
→ auto execute actions

if manual
→ require approval

⸻

Execution Engine:

on decision trigger:

* validate constraints
* apply action
* log activity

⸻

Live Activity:

* push events (real-time stream)
* latest first

⸻

Risk Engine:

if spend anomaly detected
→ trigger stop-loss

if repeated failure
→ rollback

⸻

Sensitivity Control:

higher sensitivity → faster triggers
lower sensitivity → safer execution

⸻

💳 6. Credits System

each execution = credit

live monitoring = no cost

⸻

🧠 7. AI Usage Classification

execution_engine → NONE (rule-based)
risk_detection → LOW
decision_source → upstream

⸻

📊 8. Marketing Rules (CRITICAL)

if roas drops suddenly
→ reduce spend automatically

⸻

if cpa spikes
→ pause ad set

⸻

if performance stable
→ scale gradually

⸻

if alerts > threshold
→ reduce automation aggressiveness

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/actions/automation-status

⸻

Requirements:

* real-time updates (WebSocket / polling)
* loading
* error
* empty

⸻

Important:

* THIS IS REAL EXECUTION LAYER
* DO NOT fake data
* MUST be event-driven

⸻

Performance:

* cache automations
* stream activity

⸻

Security:

* org_id filtering
* prevent cross-org execution

⸻

Future:

feeds:

* decision engine
* automation engine
* risk engine

⸻

✅ DONE