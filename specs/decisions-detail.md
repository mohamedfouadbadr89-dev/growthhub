decisions-detail.md

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


PAGE: dashboard/decisions/[id]/page.tsx

⸻

🧩 1. UI → Data Mapping

Header:

* decision_id
* title
* impact_score
* confidence

⸻

AI Reasoning:

Decision Reasoning (precomputed explanation)
⸻

Causal Analysis:

* cpa_change
* ctr_change
* correlation_score
* time_range

⸻

Performance Metrics:

* metric_name
* value
* change_percent

⸻

Recommended Action Plan:

* steps[]
    * step_id
    * title
    * description
    * estimated_time
    * platform
    * automation_support

⸻

Impact Simulation:

* projected_revenue
* cost_impact
* roas_shift
* confidence_range

⸻

Risk Analysis:

* risk_type
* severity
* description
* worst_case_loss
* volatility_curve

⸻

Related Signals:

* signal_id
* signal_type
* title
* severity

⸻

Actions:

* apply_decision
* simulate_decision

⸻

🧱 2. Data Shape (Normalized)


type DecisionDetail = {
  id: string
  title: string

  impact_score: number
  confidence: number

  reasoning: string

  causal_analysis: {
    cpa_change: number
    ctr_change: number
    correlation: number
    time_range: string
  }

  actions: {
    steps: {
      id: string
      title: string
      description: string
      estimated_time: string
      platform: string
      automation: boolean
    }[]
  }

  simulation: {
    projected_revenue: number
    cost_impact: number
    roas_shift: number
    confidence_min: number
    confidence_max: number
  }

  risks: {
    type: string
    severity: "low" | "medium" | "high"
    description: string
    worst_case_loss: number
  }[]

  signals: {
    id: string
    type: string
    title: string
    severity: string
  }[]

  created_at: string
}


🌐 3. API Contracts

GET /api/v1/decisions/:id

Response:
DecisionDetail

⸻

POST /api/v1/decisions/:id/apply

Purpose:

* apply decision

⸻

POST /api/v1/decisions/:id/simulate (optional, backend only)

RULES:
- rate-limited
- NOT auto-triggered
- requires explicit user action

## ⚠️ Cost Protection

- simulation is NOT auto-run
- UI must not trigger simulation on load
- cache simulation results
- reuse existing results if available


Purpose:

* run simulation

⸻

🗄️ 4. DB Schema

decisions

* id
* org_id
* title
* impact_score
* confidence
* reasoning
* created_at

⸻

decision_analysis

* id
* org_id
* decision_id
* cpa_change
* ctr_change
* correlation
* created_at

⸻

decision_actions

* id
* org_id
* decision_id
* title
* description
* estimated_time
* platform
* automation
* created_at

⸻

decision_simulations

* id
* org_id
* decision_id
* projected_revenue
* cost_impact
* roas_shift
* confidence_min
* confidence_max
* created_at

⸻

decision_risks

* id
* org_id
* decision_id
* type
* severity
* description
* worst_case_loss
* created_at

⸻

decision_signals

* id
* org_id
* decision_id
* type
* title
* severity
* created_at

⸻

⚙️ 5. Execution Logic

Impact Score:

impact_score = weighted score based on revenue + efficiency

⸻

Confidence:

confidence = model certainty based on historical patterns

⸻

Causal Analysis:

detect correlation between:

* CPA increase
* CTR drop
* frequency increase

⸻

Simulation (PRECOMPUTED ONLY)
⸻

Risk Engine:

estimate:

* downside scenarios
* volatility window

⸻

💳 6. Credits System

simulation:

* consumes medium credits

apply decision:

* no credits

⸻

🧠 7. AI Usage Classification

decision_analysis → MEDIUM

simulation_engine → HIGH

risk_modeling → MEDIUM

⸻

📊 8. Marketing Rules (CRITICAL)

IF CPA increases
→ adjust bidding OR creatives

⸻

IF CTR drops
→ refresh creatives

⸻

IF correlation high (>0.8)
→ strong decision confidence

⸻

IF risk high
→ require manual approval

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/decisions/:id

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* ALL analysis done in backend
* frontend only renders

⸻

Security:

* filter by org_id

⸻

Performance:

* cache decision detail
* precompute simulations

⸻

🔥 CLAUDE IMPLEMENTATION PROMPT


Implement all API integrations for this page.

Rules:
- DO NOT modify UI
- Replace static data with API
- Use React Query
- Add loading / error / empty states
- Keep logic in backend
- Use types strictly
- Optimize caching



⸻

Future:

feeds:

* automation engine
* decision execution layer
* predictive optimization

⸻

## 🧠 AI Layer

SOURCE: BACKEND ONLY

RULES:
- simulation MUST be precomputed
- NO live AI calls
- NO on-demand simulation from frontend
- NO Claude generation allowed


✅ DONE

