automation-decision-center.md

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
→ auto-execute (autonomous mode)

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