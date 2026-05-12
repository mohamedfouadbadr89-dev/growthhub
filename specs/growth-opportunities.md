growth-opportunities.md

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



PAGE: app/decisions/opportunities/page.tsx

⸻

🧩 1. UI → Data Mapping

Quick Wins:

* opportunity_id
* title
* description
* uplift_percentage
* confidence
* effort (low / medium / high)
* type (scale / pause / optimize)

⸻

High Impact Plays:

* strategy_id
* title
* description
* projected_growth
* confidence_score

⸻

Reasoning Engine:

* reason_type (saturation / predictive / efficiency)
* message

⸻

Experimental Ideas:

* idea_id
* title
* description
* category (new_channel / retention / optimization)
* effort
* confidence
* expected_impact

⸻

Actions:

* execute
* view_details

⸻

Sidebar → Strategic Mapping:

* impact
* effort

⸻

Portfolio Summary:

* total_upside
* revenue_estimate

⸻

Coverage:

* optimization_percentage
* pending_actions

⸻

Platform Mix:

* meta_percentage
* google_percentage
* tiktok_percentage

⸻

AI Tip:

* tip_text

⸻

🧱 2. Data Shape (Normalized)

type Opportunity = {
  id: string
  title: string
  description: string

  type: "quick_win" | "high_impact" | "experiment"

  metrics: {
    uplift?: number
    projected_growth?: number
    confidence: number
  }

  effort: "low" | "medium" | "high"

  category?: "scale" | "pause" | "optimize" | "expand"

  reasoning?: {
    type: string
    message: string
  }

  status: "pending" | "executed" | "dismissed"
}

type GrowthResponse = {
  quick_wins: Opportunity[]
  high_impact: Opportunity[]
  experiments: Opportunity[]

  summary: {
    total_upside: number
    revenue_estimate: number
    optimization_coverage: number
    pending_actions: number
  }

  platform_mix: {
    meta: number
    google: number
    tiktok: number
  }

  ai_tip: string
}


3. API Contracts

GET /api/v1/growth/opportunities

Query:

* platform
* impact
* effort

Response:
GrowthResponse

⸻

POST /api/v1/growth/:id/execute

Purpose:

* execute opportunity

⸻

POST /api/v1/growth/:id/dismiss

Purpose:

* dismiss opportunity

⸻

🗄️ 4. DB Schema

growth_opportunities

* id
* org_id
* title
* description
* type
* category
* effort
* created_at

⸻

growth_metrics

* id
* opportunity_id
* uplift
* projected_growth
* confidence

⸻

growth_reasoning

* id
* opportunity_id
* type
* message

⸻

growth_summary

* org_id
* total_upside
* revenue_estimate
* optimization_coverage
* pending_actions

⸻

platform_mix

* org_id
* meta_percentage
* google_percentage
* tiktok_percentage

⸻

⚙️ 5. Execution Logic

Opportunity Engine:

generate opportunities based on:

* performance gaps
* budget inefficiencies
* audience saturation
* creative performance

⸻

Quick Wins Logic:

low effort + high impact
→ immediate execution

⸻

High Impact Logic:

high impact + medium/high effort
→ strategic recommendation

⸻

Experiment Logic:

new ideas based on:

* trends
* new channels
* AI predictions

⸻

Scoring:

impact_score = projected_growth * confidence

⸻

Prioritization:

sort by:

1. impact_score
2. effort (low first)

⸻

💳 6. Credits System

execute opportunity → consume credits

⸻

🧠 7. AI Usage Classification

opportunity_generation → HIGH

predictive_modeling → HIGH

reasoning_engine → MEDIUM

⸻

📊 8. Marketing Rules (CRITICAL)

IF high uplift + low effort
→ execute immediately

⸻

IF high impact + high effort
→ plan strategy

⸻

IF repeated inefficiency
→ create automation

⸻

IF saturation detected
→ expand OR diversify

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/growth/opportunities

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* backend generates all opportunities
* frontend renders only

⸻

Performance:

* cache opportunities
* batch calculations

⸻

Security:

* filter by org_id

⸻

🔥 CLAUDE IMPLEMENTATION PROMPT


⸻

Future:

feeds:

* decision engine
* automation engine
* budget allocator

⸻

## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## ⚠️ EXECUTION RULE FIX

- opportunities are ALWAYS suggestions
- execution MUST go through actions engine
- NO direct execution from opportunities page

FLOW:

opportunity → action → validation → execution

## 🔴 REALTIME STRATEGY

SOURCE: SUPABASE_REALTIME

MODE: BROADCAST

---

CHANNEL:

- growth_stream:{org_id}

EVENTS:

opportunity_created:
- id
- title
- type
- impact
- confidence

opportunity_updated:
- id
- status
- metrics

opportunity_executed:
- id
- status (executed)
- performance_delta

opportunity_dismissed:
- id
- status

---

RULES:

- quick wins MUST appear instantly
- executed opportunities MUST move out of list
- summary MUST update in real-time

---

FALLBACK:

- GET /api/v1/growth/opportunities every 30s

---

SECURITY:

- org_id isolation

## 🔗 INTEGRATION WITH ACTIONS

- opportunities MUST create actions via backend

API:

POST /api/v1/actions/from-opportunity

BODY:
- opportunity_id

RULES:

- no execution directly
- must pass validation layer

GROWTH OPPORTUNITIES POSITIONING

growth opportunities page is:

* strategic growth intelligence layer

* AI opportunity orchestration cockpit

* revenue expansion intelligence system

* operational prioritization engine

growth opportunities page is NOT:

* direct automation executor

* campaign launcher

* autonomous growth engine

* ad manager replacement

⸻

🧬 SYSTEM POSITIONING

attribution engine

→ growth intelligence engine

→ opportunity scoring engine

→ prioritization layer

→ execution governance engine

⸻

🔒 OPPORTUNITY GOVERNANCE ENGINE

RULES:

* frontend is visualization-only

* opportunities MUST originate from backend

* opportunity scoring MUST remain backend authoritative

* execution requires validation layer

* opportunities MUST be explainable

* execution MUST be auditable

⸻

🧠 GROWTH INTELLIGENCE ENGINE

growth engine MUST analyze:

* attributed revenue gaps

* campaign inefficiencies

* audience saturation

* creative fatigue

* budget allocation imbalance

* scaling velocity

* CAC instability

* ROAS trends

* LTV quality

* channel expansion potential

* retention opportunities

* margin compression

RULES:

* growth recommendations MUST NOT rely on ROAS only

* long-term value MUST influence prioritization

* unstable attribution MUST reduce confidence score

⸻

📊 OPPORTUNITY SCORING ENGINE

score MUST combine:

* projected growth

* execution confidence

* implementation effort

* execution risk

* LTV impact

* attribution quality

* margin efficiency

* operational complexity

RULES:

* scoring MUST remain backend-only

* frontend MUST NOT calculate rankings

* low-confidence opportunities MUST degrade priority

⸻

⚡ QUICK WINS ENGINE

quick wins MUST represent:

* low operational effort

* high probability improvements

* immediate efficiency gains

* low execution risk

RULES:

* quick wins MUST be surfaced instantly

* quick wins MUST prioritize execution safety

* repetitive quick wins MUST trigger automation suggestions

⸻

📈 HIGH IMPACT STRATEGY ENGINE

high impact plays MUST support:

* scaling recommendations

* diversification opportunities

* market expansion

* audience expansion

* retention optimization

* budget restructuring

* channel allocation changes

RULES:

* high impact plays REQUIRE reasoning visibility

* strategic plays MUST expose downside risk

* strategic plays MUST expose projected timelines

⸻

🧠 REASONING ENGINE

reasoning engine MUST expose:

* why opportunity exists

* affected systems

* predicted impact

* confidence rationale

* risk dependencies

* attribution dependencies

* operational constraints

RULES:

* reasoning MUST come from backend only

* frontend MUST remain render-only

* no client-generated intelligence

⸻

🛡️ EXECUTION SAFETY LAYER

ALL executions MUST pass:

* validation layer

* org permissions

* budget governance

* active automation conflict checks

* rollout compatibility checks

* execution engine verification

RULES:

* no direct execution from UI

* all execution flows MUST remain reversible

* failed validation MUST block execution immediately

⸻

🔗 ACTION ENGINE INTEGRATION

FLOW:

opportunity

→ action creation

→ validation

→ execution orchestration

→ monitoring

→ rollback capability

API:

POST /api/v1/actions/from-opportunity

RULES:

* opportunities NEVER execute directly

* opportunities ONLY create validated actions

* execution state MUST sync from backend

⸻

📊 STRATEGIC MAPPING ENGINE

effort vs impact matrix MUST support:

* dynamic positioning

* confidence weighting

* execution risk weighting

* revenue weighting

* operational effort modeling

RULES:

* matrix coordinates MUST be backend-computed

* realtime updates MUST reposition opportunities

* dismissed opportunities MUST disappear instantly

⸻

📡 REALTIME GROWTH STREAM

SOURCE:

SUPABASE_REALTIME

CHANNEL:

growth_stream:{org_id}

EVENTS:

opportunity_created

opportunity_updated

opportunity_executed

opportunity_dismissed

summary_updated

coverage_updated

platform_mix_updated

RULES:

* quick wins MUST appear immediately

* executed items MUST reconcile instantly

* sidebar summaries MUST update incrementally

* duplicate realtime events MUST collapse safely

⸻

⚠️ FALLBACK STRATEGY

fallback polling:

GET /api/v1/growth/opportunities every 30s

RULES:

* polling ONLY during realtime degradation

* stale opportunity state MUST reconcile safely

⸻

📊 OPPORTUNITY ENRICHMENT LAYER

EVERY opportunity SHOULD expose:

* projected incremental revenue

* execution confidence

* implementation risk

* attribution confidence

* expected payback window

* operational complexity

* automation compatibility

* historical success similarity

* dependency signals

⸻

🧠 PREDICTIVE MODELING LAYER

predictive engine MUST support:

* scaling projections

* saturation forecasting

* creative fatigue prediction

* CAC trajectory prediction

* channel expansion forecasting

* retention opportunity forecasting

RULES:

* predictive outputs MUST be cached

* predictions MUST remain precomputed

* no live AI inference on page load

⸻

📈 PORTFOLIO INTELLIGENCE ENGINE

portfolio summary MUST expose:

* total upside potential

* projected revenue impact

* execution coverage

* optimization maturity

* pending opportunity count

* risk-adjusted opportunity value

RULES:

* portfolio calculations MUST remain backend authoritative

* summary MUST update incrementally via realtime

⸻

📊 PLATFORM MIX ENGINE

platform mix MUST support:

* revenue weighting

* spend weighting

* efficiency weighting

* attribution quality weighting

* scaling opportunity weighting

RULES:

* platform percentages MUST NOT use raw spend alone

* platform mix SHOULD reflect strategic value

⸻

🧠 EXPERIMENTATION ENGINE

experiments MUST support:

* emerging channels

* retention systems

* optimization hypotheses

* bidding experiments

* audience diversification

* creative strategy testing

RULES:

* experiments MUST expose confidence

* experiments MUST expose effort level

* experiments MUST remain sandbox-safe

⸻

📚 LEARNING ENGINE

system MUST preserve:

* opportunity outcomes

* execution performance

* false-positive recommendations

* dismissed opportunity patterns

* strategic success history

* scaling efficiency trends

USED FOR:

* confidence calibration

* prioritization refinement

* predictive weighting

* recommendation quality improvement

⸻

🧠 COMPETITOR REFERENCE CONTEXT

REFERENCE SYSTEMS:

[Madgicx Growth Automation](https://madgicx.com/blog/best-growth-marketing-automation-platforms?utm_source=chatgpt.com)

[Madgicx Performance Marketing Automation](https://madgicx.com/blog/automated-performance-marketing-with-ai?utm_source=chatgpt.com)

[Madgicx Marketing Automation Guide](https://madgicx.com/blog/marketing-automation?utm_source=chatgpt.com)

[Bïrch vs Madgicx Automation Comparison](https://bir.ch/blog/birch-vs-madgicx?utm_source=chatgpt.com)

[AdsGo vs Madgicx Execution Layer](https://www.adsgo.ai/alternatives/madgicx-alternative?utm_source=chatgpt.com)

REFERENCE PATTERNS:

* AI opportunity surfacing

* automation-assisted workflows

* operational optimization UX

* strategic recommendation systems

* effort vs impact prioritization

* media-buying intelligence

⸻

🧠 COMPETITIVE POSITIONING

CURRENT POSITION:

already visually stronger than:

* Madgicx opportunity surfaces

* Bïrch optimization dashboards

* Revealbot operational panels

* AdEspresso recommendation UX

CURRENT ADVANTAGES:

* enterprise-grade operational semantics

* institutional UI direction

* governance-first architecture

* attribution-aware intelligence

* realtime orchestration direction

* execution safety model

MOST COMPETITORS FOCUS ON:

* ad automation

* campaign execution

* rules engines

* AI-assisted media buying

THIS SYSTEM DIRECTION IS DIFFERENT:

* growth observability

* opportunity intelligence

* strategic orchestration

* execution governance

* operational visibility

* attribution-aware prioritization

* enterprise intelligence systems

⸻

⚠️ CURRENT GAP VS TOP COMPETITORS

STILL MISSING:

* predictive opportunity timelines

* opportunity dependency graph

* execution simulation layer

* portfolio forecasting

* strategic scenario modeling

* opportunity decay tracking

* historical execution benchmarking

* opportunity confidence visualization

⸻

🧬 EXECUTION PHILOSOPHY

system philosophy:

AI suggests

→ governance validates

→ execution engine applies

→ observability monitors

→ rollback protects

NOT:

AI auto-executes blindly

⸻

🚫 FRONTEND IMMUTABILITY RULES

RULES:

* DO NOT redesign UI

* DO NOT alter visual hierarchy

* DO NOT modify layouts

* ONLY replace static data with backend integrations

* preserve institutional operational semantics

⸻

🧱 UI PROTECTION LAYER

existing UI is considered:

* enterprise-grade

* operationally differentiated

* visually mature

* strategically stronger than most ad-tech competitors

backend systems MUST adapt to UI —

NOT the opposite.

⸻

🔥 CLAUDE IMPLEMENTATION ADDITION

Implement runtime-safe growth opportunity integrations.

Rules:

* Replace static/mock data only

* Use React Query

* Add loading/error/empty states

* Add realtime subscriptions

* Scope ALL queries by org_id

* Keep all calculations backend-only

* Prevent duplicate execution requests

* Route execution through actions engine only

* Cache opportunities aggressively

* Reconcile realtime events safely

* Preserve UI semantics exactly

* Keep frontend visualization-only

⸻

🧠 STRATEGIC DIFFERENTIATION

Most competitors optimize:

* campaigns

* ads

* rules

* automation

This system is evolving toward:

* enterprise growth intelligence

* strategic observability

* operational orchestration

* attribution-aware recommendations

* execution governance

* realtime opportunity intelligence

That category positioning is significantly more defensible long term.

 Opportunity Lifecycle

States:

* discovered
* prioritized
* validated
* converted_to_action
* executed
* monitored
* optimized
* archived

⸻

🧠 Strategic Recommendation Engine

Recommendations MUST combine:

* projected growth
* confidence
* operational complexity
* attribution quality
* execution risk
* margin impact
* LTV effect

⸻

📊 Competitor Positioning

References:

* Madgicx AI Intelligence Platform￼
* Madgicx Real-Time Decision Making￼
* Bïrch Performance Automation￼
* Revealbot Automation Layer￼

Current positioning:

NOT:

* automation-only platform

YES:

* enterprise growth intelligence system
* strategic orchestration layer
* operational observability engine
* attribution-aware recommendation system


RUNTIME TRUTH LAYER

Actual Runtime Position

growth opportunities page currently behaves as:

* strategic recommendation visualization layer
* semi-intelligent growth cockpit
* frontend-simulated prioritization surface
* static opportunity orchestration UI

NOT YET:

* enterprise growth intelligence engine
* strategic portfolio orchestration system
* predictive opportunity intelligence platform
* governance-safe execution planning layer

⸻

⚠️ CURRENT RUNTIME REALITY

Current implementation still contains:

* frontend opportunity authority
* static impact calculations
* local execution simulation
* client-side prioritization semantics
* frontend execution completion
* hardcoded reasoning engine
* static strategic mapping
* static portfolio intelligence
* mock experimentation semantics

Meaning:

UI visually communicates institutional intelligence —
but runtime behavior still operates at demo-layer semantics.

⸻

🔴 DANGEROUS ASSUMPTIONS

❌ Dangerous Assumption:

Opportunities are operationally trustworthy

Reality:

current opportunities lack:

* attribution confidence validation
* execution feasibility validation
* dependency resolution
* budget governance checks
* rollout compatibility
* organizational conflict analysis
* margin impact verification
* strategic sequencing validation

Meaning:
recommendations LOOK intelligent —
but execution semantics are still unsafe.

⸻

❌ Dangerous Assumption:

Execute buttons are harmless simulations

Reality:

current execution state:

* bypasses actions engine
* bypasses governance validation
* bypasses rollout orchestration
* bypasses audit logging
* bypasses reversibility checks
* bypasses automation conflicts

This creates false operational semantics.

⸻

❌ Dangerous Assumption:

Strategic Mapping reflects actual intelligence

Reality:

matrix coordinates are static frontend visuals.

Missing:

* execution risk weighting
* confidence weighting
* revenue weighting
* organizational complexity
* operational dependencies
* attribution quality
* execution probability
* saturation sensitivity

Without backend intelligence:
matrix becomes decorative.

⸻

❌ Dangerous Assumption:

Portfolio Summary is meaningful

Reality:

summary currently lacks:

* risk-adjusted opportunity value
* attribution-aware upside
* execution feasibility
* sequencing constraints
* operational capacity modeling
* predicted decay
* dependency penalties

Without these:
portfolio metrics become cosmetic.

⸻

🧬 MISSING ENTERPRISE SEMANTICS

Current page still lacks:

⸻

1. Opportunity Confidence Intelligence

Current UI exposes:

* uplift
* projected growth
* confidence %

Missing:

* attribution confidence
* execution confidence
* rollout safety confidence
* dependency confidence
* prediction certainty
* organizational feasibility

Enterprise systems REQUIRE confidence explainability.

⸻

2. Strategic Dependency Modeling

Current opportunities are isolated.

Missing:

* execution dependency graph
* sequencing constraints
* campaign interdependencies
* budget dependency mapping
* audience conflict propagation
* creative coupling analysis

Without dependency intelligence:
execution ordering becomes unsafe.

⸻

3. Opportunity Decay Intelligence

Missing:

* urgency decay
* timing sensitivity
* opportunity expiration windows
* seasonal decay
* competitive decay
* saturation acceleration impact

Without decay modeling:
prioritization becomes historically stale.

⸻

4. Attribution Integrity Layer

Current projections imply:

trustworthy revenue forecasting.

Reality:

missing:

* modeled attribution confidence
* blended attribution integrity
* signal degradation visibility
* delayed conversion reconciliation
* incrementality sensitivity
* post-iOS reliability adjustments

Without attribution integrity:
growth forecasting becomes unstable.

⸻

5. Execution Governance Semantics

Missing:

* reversible execution lineage
* rollback safety
* rollout monitoring
* staged deployment
* execution checkpointing
* blast-radius estimation

Enterprise orchestration REQUIRES execution governance.

⸻

🧠 COMPETITOR LIFECYCLE ANALYSIS

Madgicx

Strong at:

* AI recommendations
* automation workflows
* media-buying optimizations
* growth suggestions

Weak at:

* governance semantics
* portfolio intelligence
* strategic observability
* dependency modeling
* execution explainability

Your direction already exceeds Madgicx in:

* operational semantics
* institutional architecture
* governance-first execution direction
* attribution-aware orchestration

⸻

Bïrch

Strong at:

* automation
* budget shifting
* optimization execution

Weak at:

* enterprise intelligence semantics
* strategic observability
* lifecycle orchestration
* recommendation explainability

Bïrch is execution-centric.

Your direction is:
intelligence-centric.

Different category evolution.

⸻

Revealbot

Strong at:

* automation
* rule systems
* operational workflows

Weak at:

* predictive intelligence
* portfolio orchestration
* strategic prioritization
* governance semantics

Revealbot optimizes execution.

You are evolving toward:
growth intelligence infrastructure.

⸻

Triple Whale

Strong at:

* ecommerce attribution
* blended reporting
* performance visibility

Weak at:

* opportunity orchestration
* strategic intelligence
* operational governance
* realtime prioritization

Triple Whale is observability-first.

Your direction is:
observability + orchestration.

⸻

Northbeam

Strong at:

* attribution science
* MMM
* incrementality

Weak at:

* operational opportunity intelligence
* execution governance
* strategic orchestration UX

Northbeam is measurement infrastructure.

You are evolving toward:
decision infrastructure.

⸻

🧱 REQUIRED BACKEND CONTRACTS

Opportunity API MUST additionally expose:

type OpportunityConfidence = {
execution_confidence: number
attribution_confidence: number
prediction_confidence: number
rollout_confidence: number
}

⸻

Opportunity MUST expose:

type OpportunityMetadata = {
projected_incremental_revenue: number
expected_payback_days: number
implementation_complexity: number
execution_risk: “low” | “medium” | “high”
rollback_safe: boolean
}

⸻

Strategic Mapping MUST expose:

type OpportunityMatrixPosition = {
impact_score: number
effort_score: number
risk_weight: number
confidence_weight: number
}

⸻

Portfolio Summary MUST expose:

type PortfolioIntelligence = {
total_upside: number
risk_adjusted_upside: number
projected_margin_impact: number
execution_capacity_score: number
}

⸻

🗄️ REQUIRED TABLES

REQUIRED:

growth_execution_history

Tracks:

* executions
* validations
* rollbacks
* monitoring outcomes
* execution conflicts

⸻

opportunity_dependency_graph

Tracks:

* opportunity sequencing
* conflicts
* dependencies
* shared resources
* blocked opportunities

⸻

opportunity_forecasts

Tracks:

* predicted growth
* attribution-adjusted projections
* decay models
* timing sensitivity
* risk forecasts

⸻

opportunity_feedback

Tracks:

* dismissed opportunities
* false positives
* successful executions
* failed strategies
* confidence calibration

⸻

portfolio_health_history

Tracks:

* opportunity coverage evolution
* execution maturity
* risk-adjusted portfolio changes
* strategic progression

⸻

⚠️ SPEC GAPS

Missing:

execution idempotency

Need:

execution_hash

Otherwise:
duplicate opportunity executions may occur.

⸻

Missing:

realtime event versioning

Need:

event_version
event_timestamp

Otherwise:
stale realtime updates may overwrite fresh portfolio state.

⸻

Missing:

opportunity decay semantics

Need:

expires_at
urgency_score
decay_velocity

Otherwise:
stale opportunities may remain prioritized.

⸻

Missing:

attribution degradation visibility

Need:

attribution_integrity_score

Otherwise:
growth forecasts may rely on corrupted attribution.

⸻

🔴 EXECUTION BOUNDARIES

Frontend MAY:

* render opportunities
* render reasoning
* render portfolio summaries
* request action creation
* render execution states
* render validation outcomes
* subscribe realtime updates

Frontend MUST NEVER:

* calculate opportunity scores
* calculate portfolio value
* infer impact rankings
* infer strategic priority
* infer execution feasibility
* generate opportunities
* simulate execution completion
* calculate matrix positioning

⸻

🛡️ GOVERNANCE BOUNDARIES

Backend MUST remain authoritative for:

* opportunity generation
* scoring
* prioritization
* portfolio intelligence
* predictive modeling
* execution validation
* attribution integrity
* strategic sequencing
* realtime orchestration

⸻

🧠 REALTIME SAFETY RISKS

Current realtime direction still lacks:

* duplicate event collapsing
* ordering guarantees
* incremental reconciliation
* stale event invalidation
* optimistic rollback protection

Without this:

growth intelligence state can diverge from operational truth.

⸻

🧬 WHAT CLAUDE CAN SAFELY IMPLEMENT

Claude CAN safely implement:

* React Query integration
* Supabase realtime subscriptions
* org-scoped fetching
* loading/error/empty states
* safe cache reconciliation
* polling fallback
* execution request deduplication
* backend-authoritative rendering
* optimistic mutation prevention

⸻

⛔ WHAT MUST REMAIN DEFERRED

Requires real infrastructure:

* predictive opportunity forecasting
* strategic dependency graph engine
* portfolio simulation layer
* scenario modeling
* opportunity decay ML
* execution orchestration engine
* attribution calibration systems
* risk-adjusted forecasting
* incrementality modeling

⸻

🚫 WHAT SHOULD NEVER EXIST

NEVER ALLOW:

❌ frontend-generated opportunities

Reason:

breaks intelligence authority.

⸻

❌ client-side opportunity scoring

Reason:

creates inconsistent prioritization.

⸻

❌ optimistic execution completion

Reason:

creates orchestration desync.

⸻

❌ direct execution from opportunity cards

Reason:

unsafe operational mutations.

⸻

❌ fallback AI opportunity generation

Reason:

creates governance inconsistency.

⸻

❌ frontend strategic mapping calculations

Reason:

breaks backend authority.

⸻

❌ direct campaign launch from growth layer

Reason:

violates orchestration boundaries.

⸻

🧠 TRUE SYSTEM CATEGORY

This system is evolving toward:

enterprise growth intelligence + strategic orchestration + execution governance platform

NOT:

* AI recommendation widget
* campaign automation panel
* ad optimization dashboard
* media-buying shortcut tool
* AI growth hack generator

That positioning is structurally stronger because it combines:

* attribution intelligence
* operational observability
* governance-safe execution
* strategic orchestration
* portfolio intelligence
* predictive opportunity systems
* backend-authoritative decision infrastructure

✅ DONE

