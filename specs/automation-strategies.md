
automation-strategies.md

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

PAGE: app/automation/strategies/page.tsx

⸻

🧩 1. UI → Data Mapping

AI Recommendation (Hero Section)

* recommendation_id
* title
* description
* estimated_savings
* confidence_score
* actions:
    * activate
    * review

⸻

Strategy Categories

* category_id
* name

⸻

Strategies Grid

* id
* name
* description
* category
* trigger_conditions[]
* actions[]
* estimated_impact
* difficulty
* platforms[]

⸻

Custom Strategy CTA

* create_new_strategy

⸻

⸻

🧱 2. Data Shape

type AutomationStrategy = {
  id: string
  name: string
  description: string

  category: "budget" | "scaling" | "creative" | "reporting"

  trigger_conditions: {
    metric: string
    operator: ">" | "<" | "="
    value: number
    timeframe?: string
  }[]

  actions: {
    type: string
    value?: number
    target?: string
  }[]

  estimated_impact: {
    revenue?: number
    savings?: number
    roas_lift?: number
  }

  difficulty: "low" | "medium" | "high"

  platforms: ("meta" | "google" | "tiktok")[]

  created_at: string
}

🌐 3. API Contracts

Get Strategies

GET /api/v1/automation/strategies

Query:

* category
* platform

⸻

Activate Strategy

POST /api/v1/automation/strategies/:id/activate

## 🧠 Recommendation Rules

- recommendations are advisory only
- must convert to workflow before execution
- NO direct execution

POST /api/v1/automation/strategies/recommendation


4. DB Schema

⸻

strategies

* id
* org_id
* name
* description
* category
* config (jsonb)
* difficulty
* created_at

⸻

strategy_recommendations

* id
* org_id
* strategy_id
* estimated_impact
* confidence_score
* created_at

⸻

⸻

⚙️ 5. Execution Logic

⸻

Strategy → Workflow Conversion

strategy → automation_workflow


Example:

Stop Loss Strategy

Trigger: spend > 50  
Condition: CPA > 12  
Action: pause ad set  

Flow:

1. user clicks "Use Strategy"
2. system converts to workflow
3. opens builder (optional edit)
4. user activates

⸻

⸻

🧠 6. AI Layer

⸻

## 🧠 AI LAYER (CONTROLLED)

- AI suggests strategies only

RULES:

- NO execution
- NO auto-activation

Recommendation Engine

Input:

* recent performance
* wasted spend
* platform mix

⸻

Output:

* best strategy
* expected savings
* confidence

⸻

⸻

💳 7. Credits System

* recommendation generation → LOW cost
* activating strategy → FREE

⸻

⸻

🧠 8. AI Usage Classification

* strategy_recommendation → LOW
* automation_generate → MEDIUM

⸻

⸻

📊 9. Marketing Rules

⸻

Stop Loss

if spend > threshold AND CPA high → pause

Scaling

if roas stable → increase budget

Creative Rotation

if frequency high → rotate creatives

🧾 10. Comments (FOR CLAUDE)

⸻

Replace static UI with:

GET /api/v1/automation/strategies

Requirements:

* filter by category
* filter by platform
* quick activate
* preview logic

⸻

Important:

* strategies are templates
* NOT executed directly
* must convert to workflow


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation


AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔗 DECISION INTEGRATION

strategies MUST NOT run blindly

SOURCE:

- decision engine
- signals engine

---

RULE:

strategy trigger MUST come from:

- decisions
- alerts
- signals

NOT raw metrics only

## 🔁 STRATEGY LIFECYCLE

status:

- draft
- active
- paused
- archived

---

RULES:

- only active strategies can run
- paused = no triggers
- archived = read-only

## ⚠️ STRATEGY VERSIONING

- every strategy MUST have version

FIELDS:

- version_number
- updated_at
- change_log

---

RULE:

- running workflows MUST use frozen version
- edits create new version

## 🛑 STRATEGY SAFETY RULES

- strategy MUST pass validation BEFORE activation

VALIDATION:

- no conflicting actions
- no high-risk loops
- budget limits respected

---

BLOCK:

- if risk score > threshold

## ⚠️ LOOP PROTECTION

- strategy MUST NOT trigger repeatedly within short window

RULE:

- cooldown period required

EXAMPLE:

- same action cannot run twice within 30 min

## 🔴 REALTIME STRATEGY ENGINE

SOURCE: SUPABASE_REALTIME

CHANNEL:

strategy_triggers:{org_id}

EVENTS:

- decision_created
- alert_triggered
- metric_update

---

RULE:

- strategies MUST react to events
- NOT polling only

## 🧠 STRATEGY PERFORMANCE SCORE

score =

0.4 * impact +
0.3 * success_rate +
0.3 * consistency

---

USE:

- rank strategies
- recommend best ones

## ⚠️ ACTIVATION FLOW

1. validate strategy
2. convert → workflow
3. assign safeguards
4. activate

---

RULE:

NO direct activation without validation

## 🔒 EXECUTION GUARD

before any strategy runs:

- validate permissions
- validate risk
- validate constraints

BLOCK IF:

- high risk
- insufficient permissions


## ⚠️ FAILURE HANDLING

on failure:

- log error
- retry (max 3)
- fallback to safe state

## 🔁 ROLLBACK

IF action causes negative impact:

- revert last action
- notify user

## 📊 STRATEGY MONITORING

track:

- execution success rate
- impact delta
- error rate

## ⏱ COOLDOWN ENFORCEMENT

- enforce cooldown per strategy + entity

key:

org_id + strategy_id + entity_id

## ⚠️ MANUAL OVERRIDE

admin can:

- override blocked strategy
- approve high-risk execution

## 🧾 EXECUTION LOGGING

log:

- trigger source
- decision source
- action executed
- result


---

# 🧠 RUNTIME SEMANTICS LAYER

## PURPOSE

automation strategies are NOT workflows

automation strategies are NOT executions

automation strategies are:
- reusable orchestration templates
- recommendation-ready playbooks
- workflow generators

---

## STRATEGY SYSTEM BOUNDARY

BOUNDARY:

strategy_template
→ generates
workflow_definition
→ produces
execution_runs

---

RULES:

- strategy templates NEVER execute directly
- workflows own runtime execution
- execution engine owns action dispatch
- executeAction() remains canonical execution path

---

BLOCK:

- NO strategy may bypass workflow conversion
- NO strategy may dispatch actions directly
- NO strategy may call external APIs directly

---

## CANONICAL FLOW

decision/signal
→ recommendation engine
→ strategy recommendation
→ user review
→ strategy validation
→ workflow generation
→ workflow activation
→ runtime trigger
→ executeAction()
→ decision_history
→ automation_runs

---

# 🧬 STRATEGY TEMPLATE SYSTEM

## TEMPLATE TYPES

template_type:

- stop_loss
- scaling
- creative_rotation
- bid_control
- reporting
- budget_reallocation
- audience_protection
- fatigue_prevention
- trend_amplification
- custom

---

## TEMPLATE SOURCE

template_source:

- system
- ai_generated
- user_created
- imported

---

RULES:

- system templates are immutable
- user templates are editable
- ai_generated templates require review
- imported templates require validation

---

# 📦 STRATEGY TEMPLATE METADATA

FIELDS:

- template_version
- template_origin
- lifecycle_stage
- recommendation_rank
- execution_risk
- required_permissions
- compatible_platforms
- compatible_objectives
- estimated_runtime_frequency
- cooldown_window
- rollback_supported

---

# 🧠 AI RECOMMENDATION INTELLIGENCE

## RECOMMENDATION ENGINE INPUTS

recommendations MUST use:

- blended_roas
- spend_velocity
- ctr_trend
- cpa_trend
- cvr_trend
- frequency_fatigue
- creative_decay
- attribution_delta
- ltv_delta
- cohort_decay
- conversion_lag
- platform_volatility

---

## SIGNAL SOURCES

signal_sources:

- ai_decisions
- alerts
- campaign_metrics
- attribution_engine
- creative_performance
- audience_decay
- budget_volatility
- anomaly_engine

---

RULE:

recommendations MUST NOT rely on single-metric logic

---

## RECOMMENDATION REASONING

every recommendation MUST include:

- why_recommended
- supporting_signals[]
- affected_entities[]
- estimated_impact_window
- confidence_reasoning
- rollback_risk
- recommendation_priority

---

## RECOMMENDATION PRIORITY SCORE

priority_score =

0.30 * financial_impact +
0.25 * confidence +
0.20 * execution_safety +
0.15 * consistency +
0.10 * urgency

---

# ⚠️ STRATEGY VALIDATION ENGINE

validation_required: true

validation_stages:

- schema_validation
- permission_validation
- execution_validation
- platform_validation
- cooldown_validation
- risk_validation
- dependency_validation

---

BLOCK IF:

- conflicting workflows detected
- execution overlap detected
- cooldown active
- missing permissions
- unsupported platform
- invalid budget delta
- unsafe automation loop
- missing org scope

---

# 🔒 ORG ISOLATION RULES

ALL strategy entities MUST include:

- org_id
- created_by
- updated_by

---

RULES:

- NO cross-org strategy visibility
- NO shared execution state
- NO shared cooldown state
- NO shared recommendation cache

---

# 🔁 STRATEGY STATE MACHINE

allowed_states:

- draft
- recommended
- pending_review
- validated
- active
- paused
- cooling_down
- blocked
- archived
- failed

---

## STATE TRANSITIONS

draft
→ validated
→ active

recommended
→ pending_review
→ validated
→ active

active
→ paused
→ active

active
→ cooling_down
→ active

active
→ failed

failed
→ paused

paused
→ archived

---

BLOCK:

- archived strategies cannot reactivate
- failed strategies cannot auto-reactivate
- blocked strategies require admin override

---

# ⏱ EXECUTION FREQUENCY CONTROL

## EXECUTION WINDOWS

strategy executions MUST define:

- max_runs_per_hour
- max_runs_per_day
- cooldown_minutes
- execution_window
- timezone_mode

---

## THROTTLING

prevent:

- event storms
- repeated triggers
- recursive execution
- duplicate workflow dispatch

---

# 🧠 EVENT-DRIVEN ORCHESTRATION

SOURCE:

SUPABASE_REALTIME

CHANNELS:

- strategy_triggers:{org_id}
- strategy_state:{org_id}
- workflow_runtime:{org_id}

---

## EVENT TYPES

events:

- decision_created
- alert_triggered
- metric_threshold_hit
- creative_fatigue_detected
- attribution_shift_detected
- budget_anomaly_detected
- workflow_failed
- execution_completed

---

RULES:

- strategies react to events
- strategies MUST NOT poll excessively
- realtime events MUST deduplicate
- repeated events MUST collapse

---

# 🔄 DEDUPLICATION LAYER

dedup_key:

org_id +
strategy_id +
entity_id +
event_type +
time_bucket

---

RULE:

duplicate events inside cooldown window MUST collapse into one execution candidate

---

# 🛡 EXECUTION SAFETY ENGINE

## SAFETY LEVELS

execution_risk:

- low
- medium
- high
- critical

---

## REQUIREMENTS

high-risk strategies require:

- approval
- simulation
- rollback capability

critical-risk strategies require:

- admin approval
- dry-run validation
- manual confirmation

---

## DRY RUN MODE

dry_run_supported: true

simulation_output:

- expected_budget_change
- expected_roas_delta
- expected_spend_delta
- estimated_risk
- affected_campaigns

---

# 🔁 ROLLBACK SYSTEM

rollback_supported: true

rollback_actions:

- restore_budget
- resume_campaign
- revert_bid
- restore_workflow_state

---

RULES:

- rollback MUST log reason
- rollback MUST snapshot previous state
- rollback MUST create audit event

---

# 🧾 STRATEGY AUDIT SYSTEM

## REQUIRED LOGS

strategy_logs MUST include:

- trigger_source
- signal_source
- workflow_id
- execution_id
- validation_result
- risk_score
- cooldown_status
- rollback_status
- execution_duration
- affected_entities
- decision_reference_id

---

## AUDIT TABLES

NEW TABLES:

strategy_versions
strategy_validation_logs
strategy_execution_events
strategy_state_history
strategy_cooldowns
strategy_rollbacks

---

# 🧠 VERSION CONTROL ENGINE

## IMMUTABLE EXECUTION VERSION

running workflows MUST use:

- frozen strategy snapshot
- frozen validation config
- frozen risk profile

---

RULE:

editing strategy MUST create:
- new version
- new snapshot
- new validation cycle

---

# 🔗 WORKFLOW BUILDER INTEGRATION

## BUILDER CONTRACT

strategy activation MUST produce:

workflow_definition

---

workflow_definition MUST contain:

- trigger_graph
- condition_graph
- action_graph
- rollback_graph
- cooldown_rules
- risk_controls

---

RULES:

- builder owns orchestration editing
- strategy page owns templates only
- workflow builder owns runtime logic

---

# 🧠 COMPETITOR SEMANTIC REFERENCES

REFERENCE MODELS:

Madgicx:
- preset automation templates
- AI recommendation ranking
- dynamic benchmark logic
- strategy lifecycle
- template customization flow

Braze Canvas:
- orchestration lifecycle
- workflow validation
- activation safety
- execution graph semantics

Northbeam:
- insight-driven recommendations
- attribution-aware decisioning
- performance anomaly surfacing

Triple Whale:
- blended analytics signals
- profitability-aware automation
- signal aggregation semantics

Lifetimely:
- LTV-aware recommendations
- cohort-aware strategy ranking

AdCreative.ai:
- creative fatigue lifecycle
- asset rotation logic

Markifact:
- orchestration workflow semantics
- automation operational lifecycle

---

# 📊 UI RUNTIME REQUIREMENTS

## HERO RECOMMENDATION CARD

hero card MUST include:

- recommendation_reason
- confidence_breakdown
- affected_campaign_count
- estimated_savings_window
- signal_summary
- risk_level
- approval_requirement

---

## STRATEGY CARD REQUIREMENTS

each card MUST expose:

- execution_risk
- compatible_platforms
- cooldown_window
- estimated_frequency
- success_rate
- recommended_for
- last_updated_at
- version_number

---

## FILTERS

filters MUST support:

- platform
- objective
- execution_risk
- automation_level
- lifecycle_stage
- compatible_channel
- recommendation_score

---

# ⚠️ GOVERNANCE RULES

## HARD LOCKS

- NO direct execution from strategies page
- NO executeAction() calls from frontend
- NO bypass of automation-engine
- NO runtime workflow mutation
- NO direct AI execution on page load

---

## SAFE BOUNDARY

strategies page responsibilities:

- display templates
- display recommendations
- validate activation
- generate workflow draft

NOT:

- execute actions
- mutate campaigns directly
- bypass workflow engine
- bypass approval system

---

# 🧠 FUTURE PHASE ALIGNMENT

THIS PAGE DEPENDS ON:

- automation_workflows subsystem
- recommendation engine subsystem
- workflow builder subsystem
- signals engine
- attribution engine
- creative fatigue engine

---

CURRENT STATUS:

frontend shell = implemented
backend orchestration = partial
recommendation engine = not implemented
workflow runtime = partial
strategy lifecycle runtime = not implemented

---

# 🧾 IMPLEMENTATION NOTES

SAFE IMPLEMENTATION ORDER:

1. strategy templates API
2. recommendation engine
3. workflow conversion
4. validation engine
5. cooldown engine
6. realtime orchestration
7. rollback system
8. execution observability

---

DO NOT IMPLEMENT:

- direct execution
- multi-step orchestration runtime
- MCP routing
- AI auto-activation
- autonomous execution

WITHOUT EXPLICIT GOVERNANCE AUTHORIZATION