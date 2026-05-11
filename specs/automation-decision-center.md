## ⚠️ IMPLEMENTATION STATUS

STATUS: IMPLEMENTED - - DO NOT TOUCH OR ADD.
PAGE: app/dashboard/automation/decision-center/page.tsx

RULES:
- DO NOT create a new page
- DO NOT duplicate this page
- ONLY update existing implementation
- MUST follow existing component structure

NOTES:
- Page already built and live
- Any changes must be incremental (NOT rebuild)





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


ADVANCED DECISION INTELLIGENCE LAYER

PURPOSE

decision center is:

* intelligence surface
* signal aggregation layer
* recommendation orchestration hub

decision center is NOT:

* execution runtime
* campaign mutation layer
* autonomous action dispatcher

⸻

🔗 DECISION ENGINE BOUNDARY

signals
→ decision engine
→ recommendation generation
→ action proposal
→ approval layer
→ execution engine

⸻

RULES:

* decisions NEVER execute directly
* decisions MUST generate structured recommendations
* execution belongs ONLY to execution engine
* frontend MUST remain read-only orchestration surface

⸻

🧠 MULTI-SIGNAL DECISION ENGINE

SIGNAL AGGREGATION

decision confidence MUST combine:

* blended_roas
* spend_velocity
* cpa_trend
* ctr_decay
* conversion_lag
* creative_fatigue
* attribution_shift
* audience_saturation
* learning_phase_instability
* ltv_delta
* profitability_score

⸻

RULE:

NO decision may rely on single-metric logic

⸻

🧬 DECISION PRIORITY SYSTEM

PRIORITY SCORE

decision_priority_score =

0.35 * projected_financial_impact +
0.25 * confidence_score +
0.20 * signal_consistency +
0.10 * urgency +
0.10 * execution_safety

⸻

PRIORITY LEVELS

priority_levels:

* critical
* high
* medium
* low
* insight_only

⸻

RULES:

* critical decisions surface first
* low-confidence decisions become insights only
* high-risk decisions require approval

⸻

⚠️ DECISION CONFLICT ENGINE

CONFLICT DETECTION

detect_conflicts_on:

* same campaign
* same adset
* same audience
* overlapping budget impact
* conflicting bid strategies

⸻

RESOLUTION RULES:

IF conflicts detected:

* choose highest priority_score
* choose highest confidence_score
* suppress conflicting low-priority decisions
* create conflict audit log

⸻

🔁 DECISION LIFECYCLE

decision_states:

* detected
* validated
* queued
* recommended
* approved
* rejected
* expired
* routed_to_execution
* archived

⸻

RULES:

* expired decisions cannot execute
* rejected decisions require new validation cycle
* archived decisions remain immutable

⸻

🧠 DECISION EXPLAINABILITY ENGINE

every decision MUST include:

* why_generated
* supporting_signals[]
* affected_entities[]
* projected_impact
* confidence_reasoning
* estimated_risk
* rollback_feasibility
* recommendation_source

⸻

📊 DECISION IMPACT MODELING

IMPACT DIMENSIONS

impact MUST estimate:

* spend_delta
* projected_roas_delta
* projected_cpa_delta
* expected_conversion_delta
* audience_impact
* creative_fatigue_reduction

⸻

RULE:

impact models MUST remain simulation-only inside decision center

⸻

🧪 SIMULATION ORCHESTRATION

simulation engine MUST support:

* dry-run decisions
* historical replay
* projected outcome windows
* multi-decision scenarios
* rollback feasibility scoring

⸻

RULES:

* simulation NEVER mutates live campaigns
* simulations MUST use cached historical data
* simulations MUST remain org-isolated

⸻

🔒 APPROVAL GOVERNANCE LAYER

approval REQUIRED for:

* high spend changes
* campaign pausing
* large reallocations
* bid strategy changes
* multi-platform impact

⸻

approval_levels:

* optional
* required
* admin_required

⸻

RULES:

* approvals MUST audit
* approvals MUST expire
* approvals MUST support rejection reasoning

⸻

🔁 DECISION → STRATEGY RELATIONSHIP

decision
→ recommends strategy
→ strategy generates workflow
→ workflow routes to execution

⸻

RULES:

* decisions MUST NOT create runtime actions directly
* strategy templates remain reusable
* workflow engine owns orchestration

⸻

🔴 REALTIME DECISION STREAMING

SOURCE:

SUPABASE_REALTIME

CHANNELS:

* decision_feed:{org_id}
* strategy_health:{org_id}
* signal_alerts:{org_id}
* execution_feedback:{org_id}

⸻

EVENTS:

* decision_created
* decision_updated
* decision_expired
* signal_detected
* conflict_detected
* approval_requested
* approval_resolved

⸻

RULES:

* realtime MUST remain read-only
* events MUST deduplicate
* repeated alerts MUST collapse

⸻

📈 DECISION STREAM HEALTH

each stream MUST expose:

* stream_health_score
* execution_accuracy
* recommendation_accuracy
* avg_confidence
* false_positive_rate
* avg_response_time
* volatility_score

⸻

🧠 AI RECOMMENDATION SAFETY

AI MUST NOT:

* auto-approve decisions
* bypass validation
* create destructive recommendations silently
* create recursive recommendation loops

⸻

AI-generated decisions MUST include:

* ai_confidence
* reasoning_summary
* approval_requirement
* safety_score

⸻

🧾 DECISION AUDIT ENGINE

decision_logs MUST include:

* decision_id
* org_id
* signal_sources
* affected_entities
* recommendation_output
* confidence_score
* approval_state
* execution_reference
* rollback_reference
* generated_by
* created_at

⸻

🧬 VERSIONED DECISION SNAPSHOTS

decision snapshots MUST freeze:

* source signals
* confidence scores
* impact models
* recommendation reasoning

⸻

RULE:

editing logic MUST create:

* new snapshot
* new validation cycle
* new audit chain

⸻

📊 UI ENHANCEMENTS

HERO KPI CARDS

cards MUST expose:

* trend_direction
* volatility
* recommendation_accuracy
* execution_safety_score

⸻

LIVE FEED CARDS

feed cards MUST include:

* confidence badge
* projected impact
* risk level
* approval requirement
* affected entities count

⸻

DECISION STREAMS

streams MUST expose:

* signal count
* health trend
* failure rate
* recommendation accuracy
* last validation time

⸻

🧠 COMPETITOR SEMANTIC REFERENCES

REFERENCE MODELS:

Madgicx Automations￼

* AI automation tactics
* recommendation ranking
* prebuilt optimization templates
* account-level orchestration
* automation confidence semantics

Braze Canvas￼

* orchestration lifecycle
* workflow approval semantics
* journey validation logic
* realtime orchestration graph

Braze Approval Workflow￼

* approval checkpoints
* launch validation
* permission-based approvals

Triple Whale￼

* blended profitability analytics
* unified attribution signals
* financial intelligence semantics

Northbeam￼

* attribution-aware decisions
* performance anomaly surfacing

Lifetimely￼

* LTV-aware decisioning
* cohort profitability intelligence

Revealbot￼

* rule-based automation orchestration
* multi-platform optimization logic

⸻

⚠️ GOVERNANCE RULES

HARD LOCKS

* NO direct execution from decision center
* NO executeAction() calls
* NO AI auto-approval
* NO runtime mutations
* NO unsafe autonomous routing

⸻

🧠 FUTURE PHASE ALIGNMENT

THIS PAGE DEPENDS ON:

* signals engine
* strategy recommendation engine
* workflow orchestration engine
* approval engine
* simulation engine
* realtime infrastructure
* observability engine

⸻

CURRENT STATUS:

decision surface = implemented
signal aggregation = partial
conflict engine = not implemented
approval orchestration = partial
simulation engine = partial
decision explainability = partial

⸻

🧾 SAFE IMPLEMENTATION ORDER

1. signal aggregation engine
2. decision scoring engine
3. approval orchestration
4. conflict resolution layer
5. simulation engine
6. realtime observability
7. explainability layer
8. execution feedback loop

⸻

DO NOT IMPLEMENT:

* autonomous execution
* direct campaign mutation
* self-learning execution routing
* unrestricted AI automation
* runtime workflow rewriting

WITHOUT EXPLICIT GOVERNANCE AUTHORIZATION