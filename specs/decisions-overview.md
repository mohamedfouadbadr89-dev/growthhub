decisions-overview.md

PAGE: dashboard/decisions/page.tsx

⸻

🧩 1. UI → Data Mapping

Decision Priority Strip:

* critical_count
* high_impact_count
* quick_wins_count

⸻

AI Decision Summary:

* risks_detected
* opportunities_detected
* top_issue
* top_opportunity

⸻

Real-Time Signals:

* signal_type (cpa_spike / ctr_increase / demand_spike)
* platform
* value
* timestamp

⸻

Decision Feed:

* decision_id
* title
* platform
* campaign_id
* risk_level
* impact_value
* confidence_score
* urgency
* status

⸻

Decision Metrics:

* confidence
* risk
* root_cause
* urgency
* status

⸻

AI Reasoning:

* reasoning_text

⸻

Recommended Action:

* action_text
* action_type (scale / pause / reallocate / refresh)

⸻

System Pulse (Right Panel):

* active_decisions
* system_confidence
* estimated_impact
* performance_change

⸻

Operational Status:

* integration_name
* status
* last_sync
* data_health

⸻

Filters:

* platform
* impact
* status
* time_range

⸻

🧱 2. Data Shape (Normalized)

type Decision = {
  id: string
  title: string
  platform: "meta" | "google" | "tiktok"
  campaign_id?: string

  impact_value: number
  confidence: number

  risk: "low" | "medium" | "high"
  urgency: string

  status: "new" | "applied" | "ignored"

  root_cause: string

  reasoning: string

  recommendation: {
    action: string
    type: "scale" | "pause" | "reallocate" | "refresh"
  }

  created_at: string
}

type Signal = {
  id: string
  type: "cpa_spike" | "ctr_increase" | "demand_spike"
  platform: string
  value: number
  timestamp: string
}

type DecisionSummary = {
  risks_detected: number
  opportunities_detected: number
  top_issue: string
  top_opportunity: string
}

type DecisionStats = {
  critical: number
  high_impact: number
  quick_wins: number
}

type SystemPulse = {
  active_decisions: number
  avg_confidence: number
  estimated_impact: number
  performance_change: number
}

type DecisionResponse = {
  stats: DecisionStats
  summary: DecisionSummary
  signals: Signal[]
  decisions: Decision[]
  system_pulse: SystemPulse
}


🌐 3. API Contracts

GET /api/v1/decisions

Query:

* date_range
* platform
* status
* impact

Response:
DecisionResponse

⸻

GET /api/v1/decisions/:id

Response:
Decision

⸻

POST /api/v1/decisions/:id/apply

Purpose:

* apply decision action

⸻

POST /api/v1/decisions/:id/ignore

Purpose:

* ignore decision

⸻

🗄️ 4. DB Schema

decisions

* id
* org_id
* title
* platform
* campaign_id
* impact_value
* confidence
* risk
* urgency
* status
* root_cause
* reasoning
* action_type
* action_text
* created_at

⸻

decision_signals

* id
* org_id
* type
* platform
* value
* timestamp

⸻

decision_logs

* id
* org_id
* decision_id
* action (applied / ignored)
* user_id
* created_at

⸻

system_pulse

* id
* org_id
* active_decisions
* avg_confidence
* estimated_impact
* performance_change
* created_at

⸻

⚙️ 5. Execution Logic

Decision Scoring:

score = (impact_value * 0.5) + (confidence * 0.5)

⸻

Risk Classification:

IF confidence > 85 AND impact high
→ high confidence decision

IF risk high AND urgency low
→ deprioritize

⸻

Impact Estimation:

impact = predicted_revenue_change over 30 days

⸻

Signals Engine:

detect anomalies:

* CPA spike
* CTR drop
* ROAS decline
* search demand spike

⸻

Decision Generation:

combine:

* signals
* performance metrics
* thresholds

⸻

💳 6. Credits System

if decision is AI-generated:

* consumes low credits

if applying decision:

* no credits

⸻

🧠 7. AI Usage Classification

decision_generation → MEDIUM

signal_detection → LOW

future:

* autonomous decision engine

⸻

📊 8. Marketing Rules (CRITICAL)

IF CPA spikes
→ reduce spend OR refresh creatives

⸻

IF ROAS drops below threshold
→ pause campaign

⸻

IF CTR increases significantly
→ scale campaign

⸻

IF new audience signal detected
→ expand targeting

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/decisions

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* ALL decision logic in backend
* frontend only renders

⸻

Security:

* filter by org_id

⸻

Performance:

* cache decisions
* stream real-time signals (WebSocket recommended)

⸻

🔥 CLAUDE IMPLEMENTATION PROMPT (ADD THIS TO EVERY PAGE)

Use this prompt inside Claude:


Implement all API integrations for this page.

Rules:
- DO NOT modify UI structure
- ONLY replace static data with API calls
- Use React Query for fetching
- Add loading, error, empty states
- Keep all business logic in backend
- Ensure org_id is always included
- Use proper typing based on provided interfaces
- Optimize with caching and memoization

⸻

Future:

feeds:

* decision engine
* automation system
* budget allocator

⸻

✅ DONE