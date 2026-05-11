

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


PAGE: actions/automation/page.tsx

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

## 🔴 REALTIME STRATEGY

SOURCE: SUPABASE_REALTIME

MODE: HYBRID

---

1. BROADCAST (PRIMARY)

CHANNEL:

- system_activity:{org_id}

EVENTS:

automation_event:
- type
- message
- platform
- entity
- timestamp

system_alert:
- severity
- message
- timestamp

---

2. POSTGRES_CHANGES (SECONDARY)

TABLES:

- system_state (UPDATE)
- automations (UPDATE)
- alerts (INSERT)

---

RULES:

- activity feed MUST use broadcast
- metrics MAY use postgres_changes
- NO execution triggered from realtime
- realtime only reflects executed actions

---

UI BEHAVIOR:

- prepend new activity instantly
- keep latest first
- no full refresh

---

FALLBACK:

- polling every 15s if websocket disconnects

---

SECURITY:

- org_id scoped channels
- RLS enforced
- no public broadcast channels


## ⚙️ SYSTEM STATE MACHINE

states:

- idle
- running
- paused
- degraded
- emergency_shutdown

---

RULE:

- emergency_shutdown overrides ALL
- degraded reduces execution frequency



## ⚠️ FRONTEND NORMALIZATION RULE

- ALL numeric values MUST be numbers (not formatted strings)
- NO "$", "%", "k" in raw data
- formatting happens in UI only



AUTOMATION CONTROL CENTER — EXECUTION GOVERNANCE LAYER

PURPOSE

automation status page is:

* execution orchestration surface
* runtime automation visibility layer
* operational control center
* automation health + governance layer

automation status page is NOT:

* decision engine
* AI generation surface
* workflow builder
* execution audit history

⸻

🔗 SYSTEM POSITIONING

decision engine
→ workflow engine
→ execution engine
→ automation control center
→ execution logs

⸻

RULES:

* control center MUST reflect runtime state only
* UI MUST NOT own execution state
* runtime truth comes from execution engine
* controls MUST pass backend validation

⸻

⚠️ AUTOMATION GOVERNANCE ENGINE

automation states:

* running
* paused
* validating
* degraded
* emergency_stopped
* rollback_mode
* awaiting_approval

⸻

RULES:

* paused automations MUST reject execution triggers
* degraded automations MUST reduce execution frequency
* emergency_stopped overrides ALL runtime activity

⸻

🧠 EXECUTION CONTROL MATRIX

controls MUST support:

* pause_single_automation
* pause_all
* resume_single
* resume_all
* emergency_shutdown
* rollback_last_execution
* reduce_sensitivity
* execution_lock

⸻

RULES:

* ALL controls require backend authorization
* frontend MUST NEVER mutate execution state directly
* execution state MUST sync from backend source-of-truth

⸻

🔴 EMERGENCY SHUTDOWN SYSTEM

CRITICAL FAILSAFE

IF:

* failure_rate > threshold
* spend anomaly detected
* execution conflicts spike
* platform instability detected

THEN:

→ emergency_shutdown

⸻

emergency_shutdown MUST:

* stop ALL executions
* freeze new automation runs
* preserve queued actions
* trigger alerts
* require manual recovery approval

⸻

🧬 EXECUTION HEALTH ENGINE

system health MUST expose:

* execution_success_rate
* active_runtime_count
* queue_depth
* avg_execution_latency
* retry_rate
* rollback_rate
* platform_health_score
* realtime_sync_health

⸻

⚠️ PLATFORM HEALTH LAYER

platform health MUST track:

* Meta API degradation
* Google Ads API instability
* TikTok API latency
* rate-limit pressure
* auth failures

⸻

RULES:

* platform degradation reduces execution aggressiveness
* severe degradation pauses affected automations only
* unaffected platforms continue execution

⸻

🔁 AUTOMATION ORCHESTRATION ENGINE

automation runtime MUST include:

* execution_frequency
* execution_priority
* risk_level
* validation_status
* cooldown_window
* retry_policy
* rollback_capability

⸻

RULES:

* cooldown windows MUST prevent rapid loops
* retry policy MUST remain backend-controlled
* rollback capability MUST require snapshots

⸻

📊 AUTOMATION INTELLIGENCE

automation cards MUST expose:

* projected_impact
* actual_impact
* execution_accuracy
* automation_efficiency
* last_execution_result
* execution_velocity
* runtime_confidence

⸻

🧠 SENSITIVITY ENGINE

sensitivity controls MUST map to:

0.0 → conservative
0.5 → balanced
1.0 → aggressive

⸻

higher sensitivity:

* faster execution cadence
* lower signal tolerance
* faster scaling
* faster stop-loss triggers

⸻

lower sensitivity:

* slower execution cadence
* stricter validation
* reduced execution volatility

⸻

RULES:

* sensitivity changes MUST NOT affect running executions
* changes apply only to future execution cycles

⸻

🔴 REALTIME EVENT ORCHESTRATION

SOURCE:

SUPABASE_REALTIME

PRIMARY CHANNELS:

* automation_runtime:{org_id}
* automation_activity:{org_id}
* platform_health:{org_id}
* execution_alerts:{org_id}

⸻

EVENTS:

automation_started
automation_paused
automation_resumed
automation_degraded
execution_triggered
rollback_triggered
platform_alert
system_shutdown

⸻

RULES:

* activity feed MUST prepend latest first
* stale activity MUST auto-expire visually
* duplicate events MUST collapse
* realtime MUST remain read-only

⸻

🧾 AUTOMATION AUDIT REFERENCES

automation runtime MUST link to:

* workflow_id
* strategy_id
* decision_id
* execution_log_id
* rollback_snapshot_id
* validation_snapshot_id

⸻

⚠️ RISK ENGINE INTEGRATION

risk layer MUST support:

* stop_loss_detection
* spend_spike_detection
* execution_conflict_detection
* anomaly_detection
* failure_rate_monitoring

⸻

RULES:

IF alerts exceed threshold:
→ reduce automation aggressiveness

IF repeated failures detected:
→ pause automation automatically

⸻

🔒 SECURITY & GOVERNANCE

* org_id isolation REQUIRED
* no cross-org execution visibility
* no frontend execution authority
* no direct realtime mutations
* no hidden rollback operations

⸻

📊 UI ENHANCEMENTS

ACTIVE AUTOMATION CARDS

cards SHOULD include:

* runtime state
* execution cadence
* rollback availability
* validation status
* confidence score
* risk classification
* platform health dependency

⸻

LIVE ACTIVITY FEED

feed SHOULD include:

* source decision
* workflow reference
* execution impact
* rollback events
* failure events
* approval events

⸻

RISK & SAFETY PANEL

panel SHOULD expose:

* active stop-loss count
* rollback queue
* platform degradation
* execution anomaly warnings
* emergency shutdown readiness

⸻

CONTROL PANEL

controls SHOULD support:

* pause selected
* pause all
* emergency shutdown
* execution throttle
* sensitivity profiles
* validation strictness

⸻

🧠 COMPETITOR REFERENCE MODELS

REFERENCE SYSTEMS:

Madgicx Platform￼

* automation orchestration semantics
* multi-channel runtime visibility
* AI-assisted execution governance

Madgicx Business Dashboard￼

* live operational visibility
* blended realtime metrics
* unified marketing observability

Madgicx Ads Manager 2.0￼

* execution management patterns
* asset-level runtime controls
* latest actions tracking semantics

Madgicx One-Click Report￼

* realtime reporting architecture
* cross-platform orchestration visibility
* operational reporting UX patterns

Madgicx Dashboard Architecture￼

* funnel monitoring logic
* automation cockpit semantics
* strategic KPI visualization

⸻

⚠️ HARD RULES

* NO frontend execution authority
* NO direct execution mutations
* NO optimistic execution state
* NO auto-recovery without validation
* NO hidden execution retries
* NO autonomous rollback execution

⸻

🧬 FUTURE PHASES

NEXT SYSTEMS:

1. execution orchestration engine
2. rollback control center
3. platform degradation engine
4. anomaly intelligence layer
5. runtime dependency graph
6. automation conflict resolver
7. emergency shutdown protocol
8. execution simulation layer

⸻

🧾 CURRENT STATUS

automation status UI = implemented
execution governance = partial
rollback orchestration = partial
platform health engine = partial
realtime runtime visibility = partial
emergency shutdown = not implemented

⸻

🧠 COMPETITIVE POSITIONING

CURRENT POSITION:

already visually stronger than:

* Madgicx operational UI
* Revealbot runtime visibility
* Birch automation monitoring

STILL MISSING:

* runtime dependency tracing
* execution topology graph
* rollback orchestration visibility
* realtime anomaly intelligence
* execution confidence modeling
* automation conflict resolution