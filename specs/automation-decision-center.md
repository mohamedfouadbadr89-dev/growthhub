automation-decision-center.md

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


PAGE: dashboard/automation/decision-center/page.tsx

⸻

🧩 1. UI → Data Mapping

AI Decision Summary:

* system_health_score
* active_strategies_count
* risk_level
* automation_mode

⸻

Decision Streams (Core Engine):

* id
* name
* type (budget / creative / bidding / audience)
* status (active / learning / paused)
* confidence_score
* last_decision
* impact_score

⸻

Live Decision Feed:

* id
* decision_type
* message
* trigger_reason
* action_recommended
* timestamp

⸻

Strategy Clusters:

* cluster_name
* automations_count
* performance_score
* status

⸻

Decision Filters:

* platform
* decision_type
* confidence
* impact

⸻

🧱 2. Data Shape (Normalized)

type AutomationDecisionCenter = {
  summary: {
    system_health: number
    active_strategies: number
    risk_level: "low" | "medium" | "high"
    mode: "autonomous" | "manual"
    generated_at: string
  }

  decision_streams: {
    id: string
    name: string

    type: "budget" | "creative" | "bidding" | "audience"

    status: "active" | "learning" | "paused"

    confidence: number

    last_decision: {
      action: string
      impact: number
      timestamp: string
    }

    impact_score: number
  }[]

  decision_feed: {
    id: string

    type: "scale" | "pause" | "reallocate" | "test"

    message: string
    trigger_reason: string
    recommended_action: string

    timestamp: string
  }[]

  clusters: {
    name: string
    automations_count: number
    performance_score: number
    status: "healthy" | "unstable" | "declining"
  }[]
}


🌐 3. API Contracts

GET /api/v1/automation/decision-center

Response:
AutomationDecisionCenter

⸻

POST /api/v1/automation/decision/simulate

Purpose:

* simulate decision before execution

⸻

POST /api/v1/automation/decision/approve

Purpose:

* approve decision (manual mode)

⸻

🗄️ 4. DB Schema

decision_engine_state

* id
* org_id
* system_health
* mode
* created_at

⸻

decision_streams

* id
* org_id
* name
* type
* status
* confidence
* impact_score
* created_at

⸻

decision_logs

* id
* org_id
* stream_id
* decision_type
* message
* trigger_reason
* action
* created_at

⸻

strategy_clusters

* id
* org_id
* name
* performance_score
* status
* created_at

⸻

⚙️ 5. Execution Logic

Decision Engine Flow:

1. ingest data (campaigns / creatives / performance)
2. detect signals
3. classify opportunity
4. generate decision
5. assign confidence score

⸻

Decision Types:

if roas > threshold
→ scale

if cpa high
→ reduce budget

if frequency high
→ refresh creatives

if learning phase stuck
→ restructure campaign

⸻

Confidence Score:

based on:

* data volume
* consistency
* historical accuracy

⸻

Clusters Logic:

group automations by:

* funnel stage
* channel
* objective

⸻

💳 6. Credits System

decision generation = LOW cost

simulation = MEDIUM

approval = free

⸻

🧠 7. AI Usage Classification

decision_engine → MEDIUM

signal_detection → LOW

execution → NONE

⸻

📊 8. Marketing Rules (CORE)

if high confidence + high impact
→ auto-prioritize (not execute)

## 🧠 Decision Rules

- decisions NEVER execute directly
- decisions only generate recommendations
- execution handled by execution engine ONLY


- decision engine has NO execution permissions
- cannot call execution APIs directly


⸻

if medium confidence
→ require approval

⸻

if low confidence
→ send as insight only

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/automation/decision-center

⸻

Requirements:

* real-time decision feed
* filters working
* loading / error / empty

⸻

Important:

* THIS IS THE BRAIN OF AUTOMATION
* DO NOT MIX WITH EXECUTION

⸻

Performance:

* cache decision streams
* stream live feed

⸻

Security:

* org_id isolation
* no cross-account decisions

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

MODE: BROADCAST (PRIMARY)

CHANNELS:

- decision_feed:{org_id}
  → emits new decisions in real-time

- decision_streams:{org_id}
  → emits updates on strategy state

---

EVENT STRUCTURE:

decision_created:
- id
- type
- message
- confidence
- impact
- timestamp

decision_updated:
- id
- status
- confidence
- impact_score

---

RULES:

- realtime MUST NOT trigger AI
- realtime is read-only layer
- AI generation ONLY via POST APIs
- all events scoped by org_id
- no cross-org subscription

---

FALLBACK:

- if realtime fails → refetch via:
GET /api/v1/automation/decision-center

---

SECURITY:

- enforce RLS on realtime.messages
- channel subscription must validate org_id


## 🔗 DECISION → ACTION FLOW

decision → creates action

RULE:

- decision NEVER executes
- decision MUST generate action
- action goes to execution engine

---

## ⚠️ CONFLICT RESOLUTION

IF multiple decisions affect same entity:

- choose highest confidence + impact
- discard lower priority decisions
