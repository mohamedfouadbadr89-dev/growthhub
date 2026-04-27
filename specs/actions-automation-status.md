actions-automation-status.md

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


PAGE: app/actions/automation/page.tsx

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
→ auto-generate actions (execution gated)


if manual
→ require approval

## ⚠️ Execution Control Layer

- autonomous mode = auto SUGGESTIONS only
- execution ALWAYS requires backend validation
- UI cannot trigger execution without confirmation
- backend MUST enforce risk thresholds
- high-risk actions require multi-step confirmation

## 🛑 Kill Switch

- pause_all MUST stop ALL executions immediately
- rollback MUST revert last actions
- system must support emergency shutdown
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


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

⸻
AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI



✅ DONE