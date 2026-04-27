decisions-overview.md

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



PAGE: decisions/page.tsx

⸻

🧩 1. UI → Data Mapping

Decision Priority Strip:

* critical_count
* high_impact_count
* quick_wins_count

⸻

## 🧠 AI Layer

SOURCE: BACKEND ONLY

RULES:
- NO AI execution in frontend
- NO generation inside UI
- ALL decisions precomputed from backend
- UI only renders decision output


## ⚠️ Execution Rules

- decisions are READ-ONLY in UI
- apply / ignore only triggers API
- no local computation

⸻

Recommended Action (backend-generated)

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

⸻

Decision Reasoning (from backend only):
* reasoning_text (precomputed)
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

- decisions_stream:{org_id}

EVENTS:

decision_created:
- id
- title
- platform
- impact_value
- confidence
- risk
- urgency
- timestamp

decision_updated:
- id
- status
- impact_value
- confidence

decision_applied:
- id
- status

decision_ignored:
- id
- status

---

2. POSTGRES_CHANGES (SECONDARY)

TABLES:

- decision_signals (INSERT)
- system_pulse (UPDATE)

---

RULES:

- decisions MUST be precomputed (NO realtime AI)
- UI MUST prepend new decisions
- updates MUST be in-place (no full reload)

---

FALLBACK:

- GET /api/v1/decisions every 20s

---

SECURITY:

- org_id scoped channels
- RLS enforced


✅ DONE