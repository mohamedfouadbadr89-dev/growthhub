
creatives-editor.md

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

PAGE: creatives/editor/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

Editor Inputs

* headline
* description
* cta
* media_url

⸻

Canvas

* preview_state
* device_mode (mobile | tablet | desktop)
* zoom_level

⸻

Elements

* text_blocks[]
* images[]
* logos[]
* buttons[]

⸻

Right Panel (AI)

* suggestions[]
* predicted_metrics
    * ctr
    * engagement

⸻

Actions

* save
* publish
* export
* push_to_campaign

⸻

⸻

🧱 2. Data Shape

type CreativeDraft = {
id: string

content: {
headline: string
description: string
cta: string
}

media_url: string

elements: {
type: "text" | "image" | "logo" | "cta"
value: string
position?: { x: number; y: number }
}[]

preview: {
device: "mobile" | "tablet" | "desktop"
zoom: number
}
}

⸻

🌐 3. API Contracts

GET /api/v1/creatives/:id

PUT /api/v1/creatives/:id

POST /api/v1/creatives/:id/publish

POST /api/v1/creatives/:id/export


POST /api/v1/creatives/:id/ai/suggest

Purpose:

* generate copy / layout suggestions

RULES:

- user-triggered only
- cached per creative_id
- rate-limited

⸻

⸻

🗄️ 4. DB Schema

creative_drafts

* id
* org_id
* content (jsonb)
* media_url
* elements (jsonb)
* created_at
* updated_at

⸻
creative_versions

* id
* creative_id
* snapshot (jsonb)
* created_at

## ⚠️ VERSION CONTROL

- every save creates new version
- publish uses latest stable version
- rollback supported

⸻

⚙️ 5. Execution Logic

1. load creative
2. update in real-time
3. apply AI suggestions
4. preview update
5. save draft / publish

⸻

## ⚡ REAL-TIME SYNC

SOURCE: SUPABASE REALTIME

CHANNEL:

- creatives:{org_id}:{creative_id}

EVENTS:

- content_updated
- elements_updated
- preview_updated

RULE:

- UI must update instantly across sessions

⸻

🧠 6. AI Layer

* copy optimization
* CTA improvement
* layout suggestion
* performance prediction

⸻

## 🧠 AI GUARDRAILS

AI MUST NOT:

- generate misleading claims
- violate ad policies
- exceed character limits

OUTPUT MUST INCLUDE:

- confidence_score
- predicted_metrics

⸻

💳 7. Credits System

* AI suggestion → LOW
* optimization → MEDIUM

⸻

⸻

🧠 8. AI Usage Classification

* copy_improvement → LOW
* performance_prediction → MEDIUM

⸻

⸻

📊 9. Marketing Rules

* strong hook in first 3 sec
* CTA clarity mandatory
* mobile-first layout

⸻

⸻

🧾 10. Comments (FOR CLAUDE)

Use:

GET /api/v1/creatives/:id

Requirements:

* real-time preview
* drag & drop elements
* device switch

⸻
## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🛑 CREATIVE VALIDATION

BEFORE PUBLISH:

- headline exists
- CTA exists
- media valid
- mobile preview OK

BLOCK IF:

- missing required fields


## 🧠 COMPETITOR INTELLIGENCE LAYER

PRIMARY COMPETITOR REFERENCES:

- AdCreative.ai

- Madgicx

- Canva Ads AI

- Smartly.io

- Pencil

- Markifact

BENCHMARK AREAS:

- AI suggestion workflow

- creative scoring

- real-time preview

- ad fatigue prevention

- variant lifecycle

- export/publish orchestration

- campaign push workflow

RULE:

- editor is NOT a design toy

- editor is performance optimization infrastructure

REFERENCE:

 [oai_citation:0‡AdCreative](https://www.adcreative.ai/ad-creatives?utm_source=chatgpt.com)

---

## ⚡ RUNTIME TRUTH

EDITOR RUNTIME STATE:

- draft_state

- ai_state

- preview_state

- publish_state

- export_state

- sync_state

RULES:

- preview MUST reflect latest persisted draft

- publish MUST use latest stable snapshot

- AI suggestions MUST NOT mutate editor automatically

- optimistic UI allowed ONLY for local interactions

SOURCE OF TRUTH:

- Supabase

- version snapshots

- persisted editor state

---

## 🔄 CREATIVE LIFECYCLE SEMANTICS

FLOW:

draft

→ optimized

→ reviewed

→ approved

→ published

→ deployed

→ fatigued

→ archived

→ reusable

RULES:

- published creatives become immutable snapshots

- deployed creatives linked to campaigns

- fatigued creatives trigger recommendation engine

- archived creatives feed creative memory system

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- collaboration ownership

- editor locking

- concurrent editing conflicts

- asset validation rules

- image transformation lifecycle

- failed publish rollback

- creative moderation status

- approval workflow

- publishing destinations

- export format orchestration

REQUIRED:

- operational semantics before production rollout

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- AI suggestion = valid ad policy

- predicted CTR = actual performance

- export success = platform approval

- published creative = deployed creative

- canvas state = persisted state

- realtime sync = conflict-free editing

RISKS:

- lost versions

- broken publish states

- conflicting edits

- invalid creative deployment

- stale AI recommendations

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- POST /creatives/:id/version

- POST /creatives/:id/rollback

- POST /creatives/:id/lock

- POST /creatives/:id/unlock

- POST /creatives/:id/approve

- POST /creatives/:id/review

MISSING EVENTS:

- creative_saved

- creative_published

- ai_suggestion_applied

- export_completed

- deployment_started

- deployment_failed

---

## 🌐 REQUIRED BACKEND CONTRACTS

EDITOR SAVE CONTRACT:

INPUT:

- draft snapshot

- element tree

- version metadata

OUTPUT:

- version_id

- updated_at

- sync_token

---

PUBLISH CONTRACT:

VALIDATE:

- mobile safe

- required CTA

- policy compliance

- asset validity

RETURN:

- publish_id

- deployment readiness

- moderation flags

---

AI SUGGESTION CONTRACT:

INPUT:

- creative snapshot

- campaign goal

- audience context

OUTPUT:

- suggestion[]

- reasoning

- confidence_score

- predicted_metrics

RULE:

- AI output MUST be explainable

---

## 🗄️ REQUIRED TABLES

creative_drafts

creative_versions

creative_assets

creative_elements

creative_comments

creative_collaborators

creative_publish_history

creative_deployments

creative_ai_suggestions

creative_moderation_logs

creative_sync_state

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- editor UI

- local state

- drag/drop interactions

- preview rendering

- optimistic UX

- realtime listeners

- normalized adapters

CLAUDE MUST NOT IMPLEMENT:

- real AI scoring

- policy moderation engine

- deployment orchestration

- actual publishing adapters

- creative ranking engine

- predictive ML inference

---

## 🛡️ GOVERNANCE BOUNDARIES

AI GOVERNANCE:

- suggestions must be explainable

- prediction confidence mandatory

- no hidden AI execution

- no auto publish

- no silent optimization

EDITOR GOVERNANCE:

- every publish logged

- every AI apply tracked

- rollback mandatory

- audit trail required

SECURITY:

- org isolation mandatory

- RBAC required

- BYOK isolation required

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER TO FUTURE PHASES:

- multiplayer collaborative editing

- Figma-grade canvas engine

- AI auto-layout generation

- generative video editing

- policy moderation AI

- auto campaign deployment

- cross-platform render engine

- semantic design understanding

RULE:

- do NOT fake enterprise infra in frontend

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- direct OpenAI calls from frontend

- auto-generated ads on page load

- hidden AI mutations

- publish without validation

- runtime schema creation

- localStorage as persistence layer

- frontend-generated performance scoring

- mock predictions in production

- auto overwrite of editor state

- AI silently changing copy/design

---

## 🧠 CREATIVE MEMORY ENGINE

PURPOSE:

- preserve winning structures

- reuse successful hooks

- detect fatigue patterns

- identify evergreen creatives

RULES:

- editor suggestions should leverage historical winners

- reuse engine must be deterministic

- historical performance must remain immutable

---

## 📊 PERFORMANCE SEMANTICS

PREDICTED METRICS:

- predictive only

- not analytics truth

ACTUAL METRICS:

- sourced from ad platforms

- delayed ingestion possible

RULE:

- predicted != actual

SYSTEM MUST TRACK:

- prediction accuracy delta

- model drift

- fatigue decay

- creative saturation

REFERENCE:

 [oai_citation:1‡AdCreative](https://www.adcreative.ai/ad-creatives?utm_source=chatgpt.com)


 ## 🧠 PYTHON CREATIVE PIPELINE GOVERNANCE

PYTHON ROLE:

- multimodal creative analysis
- OCR extraction
- layout scoring
- visual hierarchy detection
- typography analysis
- image embeddings
- hook pattern analysis
- creative clustering
- fatigue prediction
- attribution reconciliation preprocessing

RULES:

- Python workers are backend-only
- frontend MUST NEVER execute Python
- Python outputs MUST be persisted before exposure
- all Python jobs MUST be async
- all Python jobs MUST be traceable
- all Python outputs MUST be reproducible

PIPELINE:

creative upload
→ preprocessing
→ embeddings
→ scoring
→ prediction
→ cache
→ API exposure

---

## ⚡ PYTHON RUNTIME TRUTH

CURRENT REALITY:

- editor UI is orchestration layer only
- canvas is NOT authoritative
- Python scoring is NOT realtime-safe yet
- multimodal analysis remains deferred
- frontend preview is visual approximation only

RULES:

- persisted snapshot = source of truth
- backend scoring = intelligence authority
- Python execution MUST remain isolated
- AI outputs MUST survive refresh/reconnect

---

## 🧬 MULTIMODAL CREATIVE SEMANTICS

SYSTEM SHOULD UNDERSTAND:

- visual density
- CTA visibility
- face positioning
- emotional framing
- text hierarchy
- hook placement
- brand dominance
- whitespace balance
- scroll-stop probability
- mobile readability

RULES:

- semantics MUST originate from backend analysis
- frontend MUST NEVER fabricate visual intelligence

---

## 📊 COMPETITOR LIFECYCLE ANALYSIS

REFERENCE COMPETITORS:

- AdCreative.ai
- Pencil
- Madgicx
- Smartly.io
- Canva Ads AI
- Bannerbear
- Marpipe
- Celtra

OBSERVED MARKET DIRECTION:

asset generation
→ variant explosion
→ scoring
→ fatigue detection
→ deployment
→ feedback ingestion
→ automated refresh
→ creative memory reuse

COMPETITOR WEAKNESSES:

- weak explainability
- black-box scoring
- limited governance
- weak attribution reconciliation
- poor auditability
- shallow lineage tracking
- low operational transparency

SYSTEM DIFFERENTIATION:

- governance-first architecture
- attribution-aware intelligence
- institutional observability
- deterministic lifecycle tracking
- explainable optimization
- reusable performance memory
- execution-safe orchestration

RULE:

system is NOT competing as simple AI ad generator

system competes as:

- creative intelligence infrastructure
- operational optimization system
- institutional creative memory engine

---

## ⚠️ ADVANCED DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- visual beauty = conversion performance
- high engagement = profitable audience
- AI suggestion = deployment-safe
- exported creative = approved creative
- realtime sync = state consistency
- mobile preview = platform rendering parity
- Python prediction = attribution truth
- embeddings similarity = creative compatibility

RISKS:

- false confidence
- invalid deployment
- attribution corruption
- creative duplication loops
- semantic drift
- stale optimization logic

---

## 🧩 ADVANCED SPEC GAPS

CURRENT SYSTEM STILL LACKS:

- asset fingerprinting
- duplicate creative detection
- semantic version lineage
- render engine parity validation
- platform-safe cropping semantics
- moderation escalation flow
- creative approval orchestration
- human review lifecycle
- AI reasoning persistence
- deployment rollback semantics
- design token governance
- template inheritance system

REQUIRED BEFORE SCALE:

- operational moderation semantics
- deterministic deployment contracts
- creative dependency graph
- cross-campaign lineage
- asset survivability modeling

---

## 🌐 REQUIRED ADVANCED BACKEND CONTRACTS

POST /api/v1/creatives/:id/analyze

PURPOSE:

- run multimodal Python analysis

RETURNS:

- layout_score
- hook_strength
- visual_retention
- emotional_resonance
- cta_visibility

RULES:

- async execution required
- cached results mandatory

---

POST /api/v1/creatives/:id/embeddings

PURPOSE:

- generate semantic embeddings

RETURNS:

- embedding_id
- cluster_id
- similarity_matches

RULES:

- vectors remain backend-private

---

GET /api/v1/creatives/:id/lifecycle

RETURNS:

- lifecycle_stage
- fatigue_state
- survivability_score
- saturation_score

---

POST /api/v1/creatives/:id/fatigue-check

PURPOSE:

- detect creative exhaustion risk

RETURNS:

- fatigue_probability
- refresh_recommendation
- replacement_candidates

---

## 🗄️ REQUIRED ADVANCED TABLES

creative_embeddings

FIELDS:

- id
- creative_id
- embedding_vector
- cluster_id
- model_version
- created_at

---

creative_analysis

FIELDS:

- id
- creative_id
- hook_strength
- cta_visibility
- emotional_resonance
- visual_retention
- typography_score
- readability_score
- created_at

---

creative_fatigue

FIELDS:

- id
- creative_id
- fatigue_score
- saturation_score
- survivability_score
- detected_at

---

creative_predictions

FIELDS:

- id
- creative_id
- predicted_ctr
- predicted_roas
- confidence_score
- model_version
- created_at

---

creative_lineage

FIELDS:

- id
- parent_creative_id
- child_creative_id
- derivation_type
- generation_batch_id

---

creative_reasoning

FIELDS:

- id
- creative_id
- reasoning_snapshot
- ai_model
- created_at

---

## ⚡ EXECUTION BOUNDARIES

FRONTEND MAY:

- render previews
- manage editor interactions
- display predictions
- display AI reasoning
- manage optimistic state
- manage drag/drop
- display fatigue warnings
- render compare mode

FRONTEND MUST NEVER:

- execute Python
- generate embeddings
- infer fatigue
- generate survivability scores
- fabricate predictions
- mutate persisted state silently
- determine deployment readiness
- bypass moderation layer

RULE:

backend owns intelligence authority completely

---

## 🛡️ GOVERNANCE BOUNDARIES

ALL AI OUTPUTS MUST:

- remain explainable
- remain auditable
- remain reproducible
- include confidence metadata
- preserve lineage
- preserve attribution context

ALL PUBLISH ACTIONS MUST:

- create immutable snapshots
- log deployment state
- preserve rollback capability
- preserve org isolation

SECURITY RULES:

- Python workers isolated
- GPU workers isolated
- vault access server-only
- embeddings encrypted at rest
- no raw AI payload exposure

---

## ✅ WHAT CLAUDE CAN SAFELY IMPLEMENT

CLAUDE CAN IMPLEMENT:

- editor UI
- compare mode
- variant grids
- drag/drop UX
- realtime listeners
- optimistic state containers
- adapter normalization
- React Query integration
- Supabase fetch layers
- pagination
- virtualization
- version history UI
- rollback UI
- collaborative cursors (visual only)
- preview rendering
- upload flows
- export flows (UI only)

WITHOUT:

- changing architecture
- bypassing governance
- fabricating intelligence

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFERRED TO BACKEND / ML PHASE:

- multimodal reasoning
- attribution-aware scoring
- fatigue prediction
- embeddings clustering
- semantic similarity engine
- AI moderation
- policy validation
- automated refresh cycles
- deployment orchestration
- reinforcement learning loops
- cross-platform render engines
- semantic layout optimization
- autonomous campaign execution

RULE:

frontend MUST NEVER simulate enterprise intelligence systems

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER ALLOW:

- Python execution in frontend
- hidden AI mutations
- auto-generated creatives on load
- fake realtime intelligence
- silent publish flows
- frontend prediction authority
- localStorage persistence authority
- uncontrolled GPU execution
- direct model access from browser
- unversioned AI outputs
- non-auditable AI reasoning
- destructive overwrite saves
- publish without immutable snapshot
- AI-generated metrics without attribution context

NEVER:

- bypass governance
- bypass moderation
- bypass execution validation
- bypass org isolation
- bypass audit logging

RULE:

editor is governed creative infrastructure

NOT:

- toy AI editor
- uncontrolled generation sandbox
- autonomous deployment engine

---

## 🧠 CREATIVE MEMORY + LEARNING LOOP

SYSTEM SHOULD EVOLVE INTO:

- creative memory engine
- semantic pattern registry
- fatigue-aware optimization system
- attribution reconciliation loop
- creative survivability intelligence
- institutional performance graph

LEARNING LOOP:

creative_created
→ analyzed
→ deployed
→ monitored
→ reconciled
→ fatigue_detected
→ refreshed
→ lineage_preserved
→ reused intelligently

GOAL:

build reusable institutional creative intelligence

—not مجرد editor UI أو AI suggestions panel.