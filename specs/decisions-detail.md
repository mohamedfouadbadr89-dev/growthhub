decisions-detail.md

🔒 SYSTEM ENFORCEMENT LAYER
AI_GATEWAY: REQUIRED AI_SOURCE: API_GATEWAY_ONLY

RULES:

❌ NO direct AI calls from frontend
❌ NO AI generation on GET requests
❌ NO "if missing → generate"
✅ AI only triggered via POST endpoints
✅ ALL AI responses must be cached
CACHE:

required for all AI outputs
key: org_id + entity_id + type
RATE LIMIT:

per user
per org
prevent duplicate execution within 60s
🧱 DATABASE SOURCE
DB_PROVIDER: SUPABASE_ONLY

RULES:

❌ NO local database
❌ NO prisma migrations
❌ NO mock data in production
✅ ALL tables must exist in Supabase
✅ ALL writes go through Supabase API / RPC
🔐 SECRETS MANAGEMENT
VAULT: SUPABASE_VAULT

USE:

OpenRouter keys
BYOK users
external APIs
RULES:

❌ NEVER expose keys to frontend
❌ NEVER log secrets
✅ fetch at runtime only
⚡ AI EXECUTION RULE
AI must NEVER run on page load
AI must be triggered ONLY by user action
AI must be cached after execution
PAGE: decisions/[id]/page.tsx

⸻

🧩 1. UI → Data Mapping

Header:

decision_id
title
impact_score
confidence
⸻

AI Reasoning:

Decision Reasoning (precomputed explanation) ⸻

Causal Analysis:

cpa_change
ctr_change
correlation_score
time_range
⸻

Performance Metrics:

metric_name
value
change_percent
⸻

Recommended Action Plan:

steps[]
step_id
title
description
estimated_time
platform
automation_support
⸻

Impact Simulation:

projected_revenue
cost_impact
roas_shift
confidence_range
⸻

Risk Analysis:

risk_type
severity
description
worst_case_loss
volatility_curve
⸻

Related Signals:

signal_id
signal_type
title
severity
⸻

Actions:

apply_decision
simulate_decision
⸻

🧱 2. Data Shape (Normalized)

type DecisionDetail = { id: string title: string

impact_score: number confidence: number

reasoning: string

causal_analysis: { cpa_change: number ctr_change: number correlation: number time_range: string }

actions: { steps: { id: string title: string description: string estimated_time: string platform: string automation: boolean }[] }

simulation: { projected_revenue: number cost_impact: number roas_shift: number confidence_min: number confidence_max: number }

risks: { type: string severity: "low" | "medium" | "high" description: string worst_case_loss: number }[]

signals: { id: string type: string title: string severity: string }[]

created_at: string }

🌐 3. API Contracts

GET /api/v1/decisions/:id

Response: DecisionDetail

⸻

POST /api/v1/decisions/:id/apply

Purpose:

apply decision
⸻

POST /api/v1/decisions/:id/simulate (optional, backend only)

RULES:

rate-limited
NOT auto-triggered
requires explicit user action
⚠️ Cost Protection
simulation is NOT auto-run
UI must not trigger simulation on load
cache simulation results
reuse existing results if available
Purpose:

run simulation
⸻

🗄️ 4. DB Schema

decisions

id
org_id
title
impact_score
confidence
reasoning
created_at
⸻

decision_analysis

id
org_id
decision_id
cpa_change
ctr_change
correlation
created_at
⸻

decision_actions

id
org_id
decision_id
title
description
estimated_time
platform
automation
created_at
⸻

decision_simulations

id
org_id
decision_id
projected_revenue
cost_impact
roas_shift
confidence_min
confidence_max
created_at
⸻

decision_risks

id
org_id
decision_id
type
severity
description
worst_case_loss
created_at
⸻

decision_signals

id
org_id
decision_id
type
title
severity
created_at
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

CPA increase
CTR drop
frequency increase
⸻

Simulation (PRECOMPUTED ONLY) ⸻

Risk Engine:

estimate:

downside scenarios
volatility window
⸻

💳 6. Credits System

simulation:

consumes medium credits
apply decision:

no credits
⸻

🧠 7. AI Usage Classification

decision_analysis → MEDIUM

simulation_engine → HIGH

risk_modeling → MEDIUM

⸻

📊 8. Marketing Rules (CRITICAL)

IF CPA increases → adjust bidding OR creatives

⸻

IF CTR drops → refresh creatives

⸻

IF correlation high (>0.8) → strong decision confidence

⸻

IF risk high → require manual approval

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/decisions/:id

⸻

Requirements:

loading state
error state
empty state
⸻

Important:

ALL analysis done in backend
frontend only renders
⸻

Security:

filter by org_id
⸻

Performance:

cache decision detail
precompute simulations
⸻

🔥 CLAUDE IMPLEMENTATION PROMPT

Implement all API integrations for this page.

Rules:

DO NOT modify UI
Replace static data with API
Use React Query
Add loading / error / empty states
Keep logic in backend
Use types strictly
Optimize caching
⸻

Future:

feeds:

automation engine
decision execution layer
predictive optimization
⸻

🧠 AI Layer
SOURCE: BACKEND ONLY

RULES:

simulation MUST be precomputed
NO live AI calls
NO on-demand simulation from frontend
NO Claude generation allowed
🧬 SCHEMA CONTROL
schema.sql is source of truth
no runtime creation
AUTH: CLERK

all requests must include org_id

NO auto AI

NO fallback AI

🔴 REALTIME STRATEGY
SOURCE: SUPABASE_REALTIME

MODE: HYBRID

BROADCAST (PRIMARY)
CHANNEL:

decision_detail:{org_id}:{decision_id}
EVENTS:

decision_updated:

impact_score
confidence
timestamp
simulation_updated:

projected_revenue
roas_shift
confidence_range
risk_updated:

risk_type
severity
worst_case_loss
status_changed:

status (new → applied → ignored)
POSTGRES_CHANGES (SECONDARY)
TABLES:

decisions (UPDATE)
decision_simulations (UPDATE)
decision_risks (UPDATE)
RULES:

UI MUST update if simulation changes
UI MUST reflect decision status instantly
risk MUST always be latest version
FALLBACK:

refetch GET /api/v1/decisions/:id every 30s
SECURITY:

org_id + decision_id scoped
🧠 SIMULATION UPDATE STRATEGY
simulations generated in background jobs

update triggered by:

major metric change (>10%)
execution event
scheduled refresh
UI NEVER triggers simulation automatically

UI ONLY listens to updates ✅Done

🧠 DECISION DETAIL POSITIONING

decision detail page is:

* strategic execution briefing layer
* AI reasoning visibility surface
* execution recommendation cockpit
* risk + simulation intelligence panel

decision detail page is NOT:

* workflow builder
* execution mutation engine
* realtime AI generation surface
* autonomous optimization engine

⸻

🔗 SYSTEM POSITIONING

signals engine
→ decision engine
→ recommendation intelligence
→ decision detail surface
→ execution orchestration layer

⸻

⚠️ DECISION GOVERNANCE RULES

decision detail MUST remain:

* backend-authoritative
* simulation-driven
* execution-safe
* audit-compatible

RULES:

* UI MUST NEVER mutate recommendations locally
* apply state MUST come from backend
* simulation truth MUST remain backend-generated
* stale simulations MUST auto-expire

⸻

🧬 DECISION INTELLIGENCE LAYER

decision detail MUST expose:

* reasoning confidence
* causal confidence
* simulation confidence
* execution readiness
* rollback readiness
* recommendation priority

RULES:

* all intelligence metrics MUST remain backend-generated
* frontend MUST remain visualization-only

⸻

📊 CAUSAL ANALYSIS ENGINE

causal analysis MUST support:

* CPA degradation analysis
* CTR decay analysis
* frequency saturation analysis
* audience fatigue detection
* attribution instability detection

RULES:

* causal correlations MUST be precomputed
* no frontend calculations allowed
* correlation confidence MUST be included

⸻

🧠 SIMULATION GOVERNANCE ENGINE

simulation engine MUST support:

* projected revenue impact
* projected ROAS shift
* projected spend impact
* projected volatility
* downside estimation
* execution confidence

RULES:

* simulations MUST be generated asynchronously
* frontend MUST NOT trigger AI simulation logic directly
* simulation cache REQUIRED
* simulation refreshes MUST be rate-limited

⸻

⚠️ SIMULATION SAFETY RULES

IF:

* platform instability detected
* data freshness degraded
* attribution mismatch detected
* anomaly pressure high

THEN:

→ simulation confidence MUST decrease

⸻

🛡️ RISK MODELING ENGINE

risk engine MUST evaluate:

* spend leakage risk
* learning phase instability
* creative fatigue probability
* audience saturation risk
* execution volatility
* rollback probability

RULES:

* high-risk recommendations MAY require approval
* risk models MUST remain backend-controlled

⸻

🔴 EXECUTION READINESS ENGINE

system MUST calculate:

* execution readiness score
* automation compatibility
* rollback readiness
* platform stability dependency
* execution volatility score

RULES:

* readiness MUST update via realtime
* degraded readiness MUST reduce execution confidence

⸻

📈 IMPACT CONFIDENCE MODEL

impact confidence MUST combine:

* historical performance
* signal stability
* platform health
* attribution quality
* execution history
* simulation consistency

OUTPUT:

* projected confidence interval
* execution reliability score

⸻

🧬 RECOMMENDATION EXECUTION LAYER

recommended actions MUST support:

* automation compatibility
* estimated execution duration
* execution dependency mapping
* rollback compatibility
* validation requirements

RULES:

* execution support MUST remain backend-defined
* UI MUST NEVER infer automation support

⸻

🔁 ROLLBACK READINESS ENGINE

before apply_decision:

system MUST validate:

* rollback snapshot exists
* execution dependency integrity
* platform operational health
* approval requirements

RULES:

* rollback readiness REQUIRED for high-risk decisions
* frontend MUST display rollback availability state only

⸻

📡 RELATED SIGNAL ORCHESTRATION

related signals MUST support:

* source signal linkage
* severity propagation
* anomaly clustering
* cross-platform correlation
* signal lineage

RULES:

* related signals MUST remain traceable
* orphan signals NOT allowed

⸻

⚠️ EXECUTION SAFETY CONTROLS

decision apply flow MUST support:

* approval validation
* cooldown validation
* platform health validation
* conflict detection
* rollback verification

RULES:

* failed validation MUST block apply action
* frontend MUST display validation status only

⸻

🧠 DECISION MEMORY ENGINE

system MUST preserve:

* historical recommendation outcomes
* execution effectiveness
* rollback history
* simulation variance
* approval outcomes

USED FOR:

* confidence refinement
* future recommendation weighting
* execution prioritization

⸻

🌐 REALTIME DECISION ORCHESTRATION

SOURCE:

SUPABASE_REALTIME

CHANNELS:

* decision_detail:{org_id}:{decision_id}
* recommendation_updates:{org_id}
* simulation_updates:{org_id}
* risk_alerts:{org_id}

EVENTS:

decision_updated
simulation_updated
risk_updated
approval_required
execution_applied
rollback_available
platform_warning

RULES:

* UI MUST patch-update realtime fields
* no full-page reloads
* stale events MUST auto-expire visually

⸻

📊 EXECUTION CONFIDENCE VISUALIZATION

UI SHOULD expose:

* confidence intervals
* execution stability
* volatility projection
* risk escalation probability
* platform dependency warnings

RULES:

* confidence visuals MUST remain backend-generated
* frontend MUST NOT calculate projections

⸻

🧬 COMPETITOR POSITIONING

CURRENT POSITIONING:

already stronger than:

* Madgicx recommendation detail semantics
* Revealbot recommendation visibility
* Birch optimization explainability

CURRENT ADVANTAGES:

* execution governance direction
* simulation-first architecture
* backend-authoritative intelligence
* enterprise safety semantics
* rollback-aware recommendations

STILL MISSING:

* dependency tracing
* execution topology graph
* recommendation lineage
* realtime anomaly overlays
* execution confidence propagation
* approval orchestration visibility

TARGET POSITION:

enterprise-grade recommendation operating system —
NOT AI recommendation dashboard

⸻

📚 COMPETITOR REFERENCE CONTEXT

REFERENCE SYSTEMS:

[Madgicx Platform](https://madgicx.com/?utm_source=chatgpt.com)

[Madgicx Meta Dashboard](https://academy.madgicx.com/lessons/facebook-dashboard?utm_source=chatgpt.com)

[Madgicx One-Click Report](https://academy.madgicx.com/lessons/one-click-report?utm_source=chatgpt.com)

[Madgicx Custom Automation](https://madgicx.com/products/custom-automation?utm_source=chatgpt.com)

[Madgicx Automated Reporting](https://madgicx.com/products/automated-reporting?utm_source=chatgpt.com)

REFERENCE PATTERNS:

* recommendation visibility semantics
* execution monitoring semantics
* operational reporting semantics
* optimization cockpit patterns
* blended observability concepts

⸻

🚫 FRONTEND IMMUTABILITY RULES

RULES:

* DO NOT redesign UI
* DO NOT modify visual hierarchy
* DO NOT alter spacing system
* DO NOT replace existing component semantics
* DO NOT mutate layout structure
* ONLY replace mock/static data with backend integrations

⸻

🧱 UI PROTECTION LAYER

existing recommendation UI is considered:

* production-grade
* institutional-grade
* execution-oriented

backend integrations MUST adapt to existing UI —
NOT redesign it.

⸻

🔥 CLAUDE IMPLEMENTATION ADDITION

Implement runtime-safe integrations for decision detail page.

Rules:

* DO NOT modify UI structure
* Replace mock/static data only
* Use React Query
* Use realtime subscriptions
* Keep all intelligence logic in backend
* Add loading/error/empty states
* Use strict typing
* Cache simulations aggressively
* Prevent duplicate apply execution
* Prevent optimistic execution state
* Reconcile realtime updates safely
* Scope ALL requests by org_id


Decision State Machine

Decision flow:

detected
→ validated
→ approved
→ action_created
→ execution_engine
→ monitoring
→ rollback_possible

Rules:

* decisions MUST remain auditable
* every execution MUST preserve reasoning snapshot
* execution MUST preserve attribution state

⸻

🧠 Root Cause Intelligence

Decision detail MUST expose:

* causal signals
* impacted entities
* confidence rationale
* attribution dependencies
* execution risks
* downstream effects

⸻

⚠️ Competitor Gap Analysis

Most competitors expose:

* rule triggers
* automation actions
* campaign metrics

This system direction exposes:

* explainability
* strategic reasoning
* operational governance
* execution lineage
* attribution-aware decisions

