creatives-results.md

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

PAGE: creatives/results/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

Top Performer (Hero)

* creative_id
* score
* concept_title
* description
* tags[]
    * platform
    * format
* preview_url

⸻

Predicted Impact

* roas_uplift
* volume_growth
* confidence_score

⸻

Generated Variants

* creative_id
* thumbnail
* score
* platform
* format
* headline
* metrics
    * ctr
    * engagement
    * conversion

⸻

Actions

* edit_creative
* push_to_campaign
* share_creative

⸻

Right Panel (AI Insight)

* insight_text
* recommendation
* performance_matrix
    * visual_retention
    * emotional_resonance
    * cta_clarity
* audience_fit

⸻

⸻

🧱 2. Data Shape

type Creative = {
id: string
score: number

concept: {
title: string
description: string
}

tags: {
platform: string
format: string
}

preview_url: string

metrics: {
ctr: number
engagement: number
conversion: "low" | "medium" | "high"
}
}

type CreativeResults = {
top_performer: Creative
predicted_impact: {
roas_uplift: number
volume_growth: number
confidence: number
}

variants: Creative[]
}

⸻

🌐 3. API Contracts

GET /api/v1/creatives/results

POST /api/v1/creatives/:id/push

POST /api/v1/creatives/:id/share

⸻
POST /api/v1/creatives/generate

Purpose:

* generate new variants

RULES:

- user-triggered only
- cached per org_id + concept
- rate-limited

⸻

🗄️ 4. DB Schema

creatives

* id
* org_id
* concept (jsonb)
* tags (jsonb)
* preview_url
* score
* created_at

creative_versions

* id
* creative_id
* snapshot (jsonb)
* created_at

## ⚠️ VERSION CONTROL

- every generated variant is stored as version
- top performer always linked to latest stable version
- rollback supported
⸻

creative_metrics

* id
* creative_id
* ctr
* engagement
* conversion
* created_at

⸻

⸻

⚙️ 5. Execution Logic

1. fetch generated creatives
2. rank by score
3. identify top performer
4. calculate predicted impact
5. return variants

## ⚡ PERFORMANCE

- cache creative results
- invalidate on new generation
- reuse predicted metrics
⸻
## ⚡ REAL-TIME CREATIVE PERFORMANCE

SOURCE: SUPABASE REALTIME

CHANNEL:

- creatives:{org_id}

EVENTS:

- creative_updated
- metrics_updated
- new_variant_generated

RULE:

- UI must update instantly
⸻

🧠 6. AI Layer

* scoring engine
* hook analysis
* visual analysis
* audience matching
* performance prediction

⸻
## 🧠 AI GUARDRAILS

AI MUST NOT:

- generate misleading ads
- violate platform policies
- exceed character limits

OUTPUT MUST INCLUDE:

- confidence_score
- predicted_metrics
- reasoning

⸻

💳 7. Credits System

* generate creatives → HIGH
* view results → FREE

⸻

⸻

🧠 8. AI Usage Classification

* creative_generation → HIGH
* scoring → MEDIUM

⸻

⸻

📊 9. Marketing Rules

* high CTR → prioritize
* high engagement → boost
* low conversion → optimize CTA

⸻

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/creatives/results

Requirements:

* grid rendering
* sorting (score / CTR / engagement)
* fast filtering


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔗 DECISION INTEGRATION

- creatives may have linked decisions:
  - fatigue detected
  - low conversion
  - scaling opportunity

SOURCE:

- decision engine

## 🔗 POST-LAUNCH FEEDBACK

- track real performance after push

FIELDS:

- actual_ctr
- actual_roas

---

RULE:

- compare predicted vs actual
- update scoring model


 Runtime Truth

CURRENT MODE:

* frontend simulation layer
* static mock creative variants
* local UI ranking only
* no persistence
* no realtime updates
* no execution engine
* no backend scoring authority

RULES:

* UI is presentation-only
* all AI insights currently mocked
* predicted metrics are placeholders
* no production scoring should occur client-side

⸻

📊 Competitor Lifecycle Analysis

Reference competitors:

* Madgicx￼
* Smartly.io￼
* AdCreative.ai￼
* Hawky AI￼

Observed competitor lifecycle:

creative generation
→ creative scoring
→ fatigue analysis
→ audience matching
→ deployment
→ realtime optimization
→ refresh cycle
→ creative retirement

Madgicx direction:

* Meta-focused optimization
* creative fatigue prediction
* AI-assisted scaling
* predictive creative intelligence
* automated refresh cycles  

Hawky direction:

* cross-platform creative intelligence
* unified command center
* attribution-aware optimization
* creative pattern learning
* business-impact prioritization  

Gap vs competitors:

CURRENT SYSTEM MISSING:

* creative fatigue engine
* semantic hook analysis graph
* creative pattern lineage
* cross-platform winner detection
* creative survivorship modeling
* multimodal creative embeddings
* audience-creative compatibility graph
* creative memory persistence
* creative strategy replay system
* automated refresh orchestration

SYSTEM ADVANTAGE DIRECTION:

* governance-first execution
* explainability
* traceable lifecycle
* execution safety boundaries
* institutional-grade operational modeling

⸻

⚠️ Dangerous Assumptions

DO NOT ASSUME:

* predicted uplift = actual uplift
* high CTR = profitable creative
* engagement = conversion quality
* high score creatives are reusable universally
* top performer remains stable over time
* platform behavior parity
* AI score accuracy without post-launch feedback

RULES:

* prediction ≠ truth
* actual attribution MUST override prediction
* backend MUST validate all deployment decisions
* frontend MUST NEVER infer execution safety

⸻

🧩 Missing Semantics

Current implementation lacks:

* creative fatigue semantics
* creative novelty scoring
* hook-level attribution
* audience resonance modeling
* creative entropy tracking
* execution survivability
* creative confidence decay
* post-launch learning semantics
* semantic embedding clustering
* creative strategy lineage

Future lifecycle semantics:

generated
→ scored
→ tested
→ validated
→ scaling
→ saturated
→ declining
→ refreshed
→ deprecated

⸻

⚙️ Required Backend Contracts

Required future contracts:

GET /api/v1/creatives/results

GET /api/v1/creatives/:id/analysis

GET /api/v1/creatives/:id/performance

GET /api/v1/creatives/:id/lineage

POST /api/v1/creatives/generate

POST /api/v1/creatives/:id/push

POST /api/v1/creatives/:id/share

POST /api/v1/actions/from-creative

POST /api/v1/creatives/:id/archive

RULES:

* push MUST go through actions engine
* generation MUST remain async
* backend owns ranking authority
* backend owns prediction authority

⸻

🗄️ Required Tables

Additional future tables:

creative_analysis

* hook_strength
* visual_retention
* cta_clarity
* emotional_resonance

creative_predictions

* predicted_ctr
* predicted_roas
* confidence_score
* survivability_score

creative_lineage

* parent_creative_id
* derivation_type
* generation_batch_id

creative_embeddings

* semantic_vector
* hook_cluster
* visual_cluster

creative_feedback

* actual_ctr
* actual_roas
* fatigue_detected
* prediction_accuracy

creative_push_logs

* pushed_by
* execution_id
* campaign_id
* rollback_state

creative_strategy_docs

* generated_summary
* insights_snapshot
* export_version

⸻

🔒 Execution Boundaries

Frontend MAY:

* render variants
* display rankings
* compare variants
* manage selection state
* simulate pushes
* show optimistic feedback
* render insights

Frontend MUST NEVER:

* generate creatives directly
* compute AI scores
* infer deployment safety
* validate campaign compatibility
* determine creative eligibility
* calculate attribution truth
* override execution governance

RULE:

* backend is intelligence authority
* frontend is orchestration surface only

⸻

🛡️ Governance Boundaries

ALL pushes MUST preserve:

* audit trail
* creative lineage
* execution traceability
* rollback capability
* org isolation
* attribution linkage

RULES:

* every generation MUST be versioned
* every push MUST be logged
* top performer MUST remain explainable
* exported strategy docs MUST be reproducible

⸻

🧠 Recommendations Engine Semantics

Recommendations MUST include:

* reasoning source
* confidence score
* attribution context
* audience context
* lifecycle stage
* freshness window

RULES:

* recommendation MUST NOT rely on single metric
* recommendation MUST consider:
    * CTR
    * ROAS
    * fatigue
    * engagement decay
    * audience fit
    * attribution quality

Recommendation lifecycle:

suggested
→ validated
→ deployed
→ monitored
→ reinforced
OR
→ deprecated

⸻

🔄 Creative Intelligence Lifecycle

creative generated
→ semantic analysis
→ scoring
→ ranking
→ deployment candidate
→ push validation
→ execution
→ realtime feedback
→ attribution reconciliation
→ lifecycle update

RULES:

* creative system is learning loop
* not static generation engine

⸻

⚡ Required Realtime Contracts

CHANNEL:

creatives_results:{org_id}

EVENTS:

creative_generated
creative_scored
creative_promoted
creative_declining
creative_fatigue_detected
creative_push_completed
creative_prediction_updated

RULES:

* top performers MUST update instantly
* stale predictions MUST invalidate
* push state MUST sync in realtime

⸻

📊 Attribution Semantics

ALL scoring MUST use:

* attributed revenue
* NOT raw clicks
* NOT vanity engagement only

RULES:

* prediction models MUST reconcile against actual performance
* post-launch feedback MUST retrain scoring system
* creative ranking MUST evolve continuously

⸻

✅ What Claude Can Safely Implement

Claude CAN safely implement:

* UI rendering
* sorting state
* filtering
* compare mode
* selection logic
* optimistic loading states
* realtime-ready state containers
* adapter layer
* React Query integration
* Supabase fetch layer
* pagination/infinite scroll
* virtualization

WITHOUT changing UI structure.

⸻

⏸️ What MUST Remain Deferred

Deferred to backend phase:

* multimodal scoring
* semantic embeddings
* visual analysis
* hook analysis
* audience fit prediction
* survivability scoring
* fatigue prediction
* post-launch reconciliation
* automated optimization
* strategy generation engine

RULE:

* frontend MUST NEVER emulate intelligence layer

⸻

🚫 What Should NEVER Exist

NEVER ALLOW:

* frontend AI generation
* hidden auto-generation on load
* silent deployment
* client-side prediction authority
* fake confidence scores
* fake realtime intelligence
* frontend execution authority
* direct campaign publishing
* ungoverned AI outputs

NEVER:

* bypass action engine
* bypass governance layer
* bypass attribution reconciliation
* bypass execution validation

RULE:

* creative results page is decision-support surface
* NOT autonomous AI execution layer

⸻

🧬 Strategic Direction

SYSTEM SHOULD EVOLVE INTO:

* creative intelligence operating system
* performance memory layer
* semantic creative graph
* attribution-aware optimization engine
* institutional creative observability layer

—not مجرد AI gallery/results UI.

## 🧠 INTELLIGENCE AUTHORITY LAYER

AUTHORITATIVE SYSTEMS:

- Python scoring pipelines
- attribution engine
- embeddings engine
- post-launch feedback engine

FRONTEND MUST NEVER:

- invent scores
- infer confidence
- approximate predictions
- fabricate insights

RULE:

all intelligence must originate from backend-authoritative systems only

---

## ⚠️ PREDICTION RELIABILITY LAYER

RULES:

- predictions are probabilistic
- actual performance overrides predictions
- confidence must decay over time
- stale predictions must invalidate

SYSTEM MUST TRACK:

- prediction_accuracy
- confidence_decay
- attribution_reconciliation
- post-launch divergence

---

## 🧠 CREATIVE MEMORY LAYER

SYSTEM MUST PRESERVE:

- winning patterns
- failed hooks
- fatigue history
- survivability history
- audience resonance history
- creative lineage

GOAL:

creative system evolves into institutional performance memory

---

## 🐍 PYTHON EXECUTION GOVERNANCE

ALL Python pipelines MUST:

- remain async
- remain reproducible
- remain cacheable
- support rollback
- support versioning

RULES:

- no blocking inference on page load
- no direct frontend execution
- no uncontrolled GPU execution
- outputs must be persisted before exposure

---

## 🧬 EMBEDDINGS GOVERNANCE

embeddings are used for:

- similarity search
- creative clustering
- hook lineage
- fatigue proximity
- winner pattern analysis

RULES:

- embeddings are backend-only
- embeddings must be versioned
- embeddings must support invalidation
- frontend MUST NEVER access raw vectors

---

## 📊 ATTRIBUTION INTEGRITY LAYER

RULES:

- creative scoring MUST consider attribution quality
- low attribution confidence MUST reduce prediction confidence
- vanity engagement MUST NOT dominate rankings

SYSTEM MUST PRIORITIZE:

- attributed revenue
- survivability
- margin efficiency
- LTV influence

---

## 🧠 SEMANTIC DECAY MODEL

SYSTEM MUST TRACK:

- novelty decay
- creative saturation
- semantic fatigue
- hook repetition
- audience exhaustion

RULE:

high-performing creatives may still degrade over time

---

## 🧾 REPRODUCIBILITY LAYER

ALL AI outputs MUST BE:

- reproducible
- versioned
- traceable
- explainable

RULES:

- same inputs should reproduce comparable outputs
- model versions must be logged
- prompts must remain auditable

---

## 🧠 STRATEGIC POSITIONING

THIS SYSTEM IS NOT:

- AI gallery
- creative toy
- auto ad generator
- autonomous deployment engine

THIS SYSTEM IS:

- creative intelligence infrastructure
- institutional scoring system
- attribution-aware optimization engine
- creative observability platform
- execution-governed intelligence layer

---

## 🚫 HALLUCINATION PREVENTION

SYSTEM MUST NEVER:

- fabricate performance certainty
- fabricate attribution confidence
- fabricate deployment safety
- fabricate audience fit

RULE:

unknown confidence > fake confidence

---

## 🔄 INTELLIGENCE LIFECYCLE

creative intelligence lifecycle:

generated
→ analyzed
→ scored
→ ranked
→ validated
→ deployed
→ monitored
→ reconciled
→ evolved
→ deprecated

---

## ⚡ RUNTIME ISOLATION

RULES:

- scoring workers isolated from frontend
- embeddings workers isolated from execution engine
- generation workers isolated from realtime systems

GOAL:

prevent execution cascade failures