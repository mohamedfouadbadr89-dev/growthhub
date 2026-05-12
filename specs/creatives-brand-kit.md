creatives-brand-kit.md

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

PAGE: app/creatives/brand-kit/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

Brand Assets

* colors[]
* fonts[]
* logos[]

⸻

Rules

* allowed_colors
* allowed_fonts
* restrictions

⸻

State

* locked (boolean)

⸻

⸻

🧱 2. Data Shape

type BrandKit = {
id: string
org_id: string

colors: string[]
fonts: string[]
logos: string[]

rules: {
enforce_colors: boolean
enforce_fonts: boolean
}

locked: boolean
}

⸻

🌐 3. API Contracts

GET /api/v1/brand-kit

PUT /api/v1/brand-kit

⸻
POST /api/v1/brand-kit/validate

Purpose:

* validate creative against brand kit

Response:

* valid: boolean
* errors[]
⸻

🗄️ 4. DB Schema

brand_kits

* id
* org_id
* colors (jsonb)
* fonts (jsonb)
* logos (jsonb)
* rules (jsonb)
* locked
* updated_at

brand_kit_versions

* id
* brand_kit_id
* snapshot (jsonb)
* created_at

⸻

⸻

⚙️ 5. Execution Logic

1. load brand kit
2. enforce rules on editor
3. block invalid styles

⸻

## ⚡ PERFORMANCE

- cache brand kit
- load once per session
- sync with editor

## ⚠️ ENFORCEMENT ENGINE

- all creatives MUST validate against brand kit

VALIDATION:

- color must be in allowed_colors
- font must be in allowed_fonts

BLOCK IF:

- rule violated AND locked = true
⸻

🧠 6. AI Layer

* auto-apply brand styles
* reject off-brand creatives

## 🧠 AI LAYER (SAFE MODE)

- AI suggestions MUST respect brand rules

RULES:

- no off-brand generation
- auto-correct suggestions to match brand kit
- use cached suggestions only
⸻
## 🔗 EDITOR INTEGRATION

- creatives/editor MUST consume brand-kit
- enforce styles in real-time
- prevent invalid save if locked
⸻

💳 7. Credits System

* none

⸻

⸻

🧠 8. AI Usage Classification

* brand_enforcement → LOW

⸻

⸻

📊 9. Marketing Rules

* consistency across creatives
* brand recognition priority

⸻

⸻

🧾 10. Comments (FOR CLAUDE)

Apply brand rules inside editor automatically


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🧠 COMPETITOR INTELLIGENCE LAYER

PRIMARY REFERENCES:

- AdCreative.ai

- Canva Brand Kit

- Pencil

- Madgicx

- Smartly.io

BENCHMARK AREAS:

- brand consistency enforcement

- AI-safe brand application

- creative synchronization

- multi-brand management

- typography governance

- compliance-aware design systems

- asset orchestration

- design-token enforcement

REFERENCE:

[AdCreative.ai Enterprise](https://www.adcreative.ai/enterprise?utm_source=chatgpt.com)

[AdCreative.ai Brand Customization](https://www.adcreative.ai/ad-creatives?utm_source=chatgpt.com)

---

## ⚡ RUNTIME TRUTH

BRAND KIT STATE:

- brand_state

- enforcement_state

- asset_state

- sync_state

- validation_state

- editor_sync_state

RULES:

- brand kit is infrastructure, NOT settings UI

- editor must consume persisted brand rules

- live preview is derived state ONLY

- all creative validation must use persisted brand snapshot

- runtime preview != persisted enforcement

SOURCE OF TRUTH:

- Supabase

- version snapshots

- organization-level policies

---

## 🔄 BRAND LIFECYCLE SEMANTICS

FLOW:

draft

→ validated

→ enforced

→ synced

→ deployed

→ inherited

→ versioned

→ archived

RULES:

- creatives inherit latest active brand version

- published creatives retain immutable brand snapshot

- archived brand kits remain referenceable

- enforcement changes must not mutate historical creatives

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- multi-brand organizations

- inheritance rules

- asset approval workflow

- logo moderation

- design token hierarchy

- fallback fonts

- asset expiration lifecycle

- brand ownership

- collaborative governance

- localization support

- platform-specific overrides

- accessibility enforcement

REQUIRED:

- operational semantics before enterprise rollout

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- uploaded logo is production-safe

- font exists across all render environments

- AI respects brand automatically

- preview accuracy = export accuracy

- editor enforcement = platform rendering

- color contrast = accessibility compliance

- locked brand = immutable deployment

RISKS:

- off-brand creatives

- inaccessible designs

- broken exports

- inconsistent rendering

- asset drift

- invalid typography rendering

REFERENCE:

[AdCreative.ai Compliance Checker](https://www.adcreative.ai/post/introducing-compliance-checker-ai?utm_source=chatgpt.com)

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- POST /api/v1/brand-kit/version

- POST /api/v1/brand-kit/rollback

- POST /api/v1/brand-kit/approve

- POST /api/v1/brand-kit/assets/upload

- POST /api/v1/brand-kit/assets/remove

- POST /api/v1/brand-kit/sync

- POST /api/v1/brand-kit/audit

- GET /api/v1/brand-kit/history

MISSING EVENTS:

- brand_updated

- brand_synced

- brand_locked

- asset_uploaded

- asset_removed

- enforcement_changed

- validation_failed

---

## 🌐 REQUIRED BACKEND CONTRACTS

BRAND SAVE CONTRACT:

INPUT:

- colors

- fonts

- logos

- rules

- enforcement mode

OUTPUT:

- version_id

- sync_token

- updated_at

---

VALIDATION CONTRACT:

INPUT:

- creative snapshot

- brand snapshot

OUTPUT:

- valid

- violations[]

- warnings[]

- corrected_suggestions[]

RULE:

- validation engine must be deterministic

---

EDITOR ENFORCEMENT CONTRACT:

INPUT:

- org_id

- active_brand_version

OUTPUT:

- allowed tokens

- blocked tokens

- enforcement level

---

## 🗄️ REQUIRED TABLES

brand_kits

brand_kit_versions

brand_assets

brand_asset_versions

brand_rules

brand_validations

brand_audit_logs

brand_sync_state

brand_typography

brand_color_tokens

brand_editor_bindings

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- brand kit UI

- token selectors

- asset upload UX

- live preview rendering

- optimistic updates

- realtime listeners

- local validation visuals

CLAUDE MUST NOT IMPLEMENT:

- actual design-token compiler

- AI compliance engine

- font licensing validation

- cross-platform rendering engine

- moderation systems

- accessibility scoring engine

- semantic brand understanding

---

## 🛡️ GOVERNANCE BOUNDARIES

BRAND GOVERNANCE:

- all changes versioned

- enforcement changes auditable

- historical creatives immutable

- organization isolation mandatory

AI GOVERNANCE:

- AI suggestions must respect brand rules

- no hidden brand mutation

- no automatic enforcement override

- all AI corrections explainable

SECURITY:

- BYOK isolation mandatory

- asset access scoped per org

- signed asset URLs required

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER TO FUTURE PHASES:

- semantic brand AI

- auto-generated design systems

- AI logo redesign

- adaptive multi-region branding

- video-safe typography enforcement

- intelligent accessibility remediation

- autonomous brand correction

- multi-brand inheritance engine

RULE:

- do NOT fake enterprise governance in frontend

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend-stored brand rules

- direct AI calls from frontend

- runtime schema creation

- auto-overwrite of creative branding

- hidden AI palette changes

- unrestricted font uploads

- mock validation in production

- localStorage as brand source

- editor bypass for strict mode

- automatic publish without validation

---

## 🧠 BRAND MEMORY ENGINE

PURPOSE:

- preserve successful branding patterns

- maintain identity consistency

- track historical enforcement

- detect brand drift

RULES:

- every published creative linked to brand version

- historical brand states immutable

- enforcement engine deterministic

REFERENCE:

[AdCreative.ai Brand Workflow](https://www.adcreative.ai/?gspk=dGhvbWFzMTEwMTUyNDQ&gsxid=lp76A3DIZSnhGb&ps_partner_key=dGhvbWFzMTEwMTUyNDQ&ps_xid=lp76A3DIZSnhGb&utm_source=chatgpt.com)

---

## 📊 BRAND PERFORMANCE SEMANTICS

PERFORMANCE CONFIDENCE:

- predictive only

- not platform truth

ACTUAL PERFORMANCE:

- sourced externally

- delayed ingestion possible

RULES:

- confidence != performance

- AI recommendations are advisory only

- accessibility recommendations must be validated independently

SYSTEM MUST TRACK:

- brand consistency score

- accessibility drift

- creative compliance rate

- off-brand violation frequency

REFERENCE:

[AdCreative.ai Compliance Checker AI](https://www.adcreative.ai/compliance-checker?utm_source=chatgpt.com)

## 🧠 PYTHON BRAND ANALYSIS PIPELINE

PYTHON RESPONSIBILITIES:

- logo extraction

- typography detection

- color clustering

- accessibility contrast analysis

- visual consistency scoring

- asset fingerprinting

- duplicate asset detection

- brand drift detection

- multimodal style embeddings

RULES:

- Python workers MUST remain backend-only

- frontend MUST NEVER execute Python

- all analysis jobs MUST be async

- all outputs MUST be persisted before UI exposure

- all generated embeddings MUST remain server-side

PIPELINE:

asset upload

→ preprocessing

→ OCR / typography analysis

→ palette extraction

→ accessibility analysis

→ embeddings

→ validation

→ cache

→ API exposure

---

## ⚡ ADVANCED RUNTIME TRUTH

CURRENT REALITY:

- live preview is approximation only

- editor sync is NOT authoritative

- enforcement preview != export truth

- accessibility scoring remains advisory

- asset rendering parity is not guaranteed cross-platform

RULES:

- persisted brand snapshot = source of truth

- enforcement engine owns validation authority

- platform rendering differences MUST be expected

- AI recommendations MUST remain advisory only

---

## 📊 ADVANCED COMPETITOR LIFECYCLE

REFERENCE COMPETITORS:

- Canva Brand Kit

- AdCreative.ai

- Frontify

- Bynder

- Brandfolder

- Smartly.io

- Figma Design Systems

- Celtra

OBSERVED MARKET DIRECTION:

brand assets

→ tokenization

→ governance

→ enforcement

→ AI-safe generation

→ deployment validation

→ performance correlation

→ drift detection

→ organizational reuse

COMPETITOR GAPS:

- weak governance explainability

- shallow auditability

- weak attribution linkage

- poor enforcement transparency

- limited realtime operational visibility

- weak AI lineage tracking

SYSTEM DIFFERENTIATION:

- governance-first enforcement

- attribution-aware branding

- immutable historical brand snapshots

- deterministic enforcement engine

- explainable AI-safe branding

- operational observability

- institutional-grade creative governance

RULE:

system is NOT simple design-settings page

system evolves into:

- creative governance infrastructure

- enterprise brand enforcement engine

- reusable organizational design memory

---

## ⚠️ ADVANCED DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- uploaded SVG is safe

- logo transparency is valid

- font licensing permits export

- AI-generated colors are accessible

- visual consistency = performance improvement

- accessibility pass = platform compliance

- same font renders equally across environments

- cached previews represent final exports

RISKS:

- corrupted exports

- inaccessible creatives

- inconsistent typography rendering

- cross-platform drift

- broken asset inheritance

- invalid deployment branding

---

## 🧩 ADVANCED SPEC GAPS

CURRENT SYSTEM STILL LACKS:

- design token inheritance graph

- asset dependency mapping

- semantic logo classification

- font fallback orchestration

- export-safe typography contracts

- accessibility remediation lifecycle

- cross-brand hierarchy

- creative-brand lineage graph

- asset deduplication semantics

- brand approval workflows

- enterprise RBAC semantics

- regional brand overrides

- template governance

REQUIRED BEFORE SCALE:

- operational governance semantics

- deterministic rendering contracts

- accessibility audit infrastructure

- brand lineage architecture

---

## 🌐 REQUIRED ADVANCED BACKEND CONTRACTS

POST /api/v1/brand-kit/analyze

PURPOSE:

- run Python-based asset analysis

RETURNS:

- palette_analysis

- typography_analysis

- accessibility_analysis

- logo_integrity_score

- consistency_score

RULES:

- async execution required

- cached results mandatory

---

POST /api/v1/brand-kit/embeddings

PURPOSE:

- generate semantic brand embeddings

RETURNS:

- embedding_id

- similarity_matches

- brand_clusters

RULES:

- vectors remain backend-private

---

GET /api/v1/brand-kit/lifecycle

RETURNS:

- active_version

- enforcement_state

- drift_state

- adoption_rate

---

POST /api/v1/brand-kit/drift-detection

PURPOSE:

- detect off-brand creative trends

RETURNS:

- drift_probability

- violating_assets[]

- enforcement_recommendations[]

---

## 🗄️ REQUIRED ADVANCED TABLES

brand_embeddings

FIELDS:

- id

- brand_kit_id

- embedding_vector

- cluster_id

- model_version

- created_at

---

brand_analysis

FIELDS:

- id

- brand_kit_id

- accessibility_score

- typography_score

- consistency_score

- logo_integrity_score

- palette_confidence

- created_at

---

brand_drift

FIELDS:

- id

- brand_kit_id

- drift_score

- detected_assets

- detected_at

---

brand_predictions

FIELDS:

- id

- brand_kit_id

- predicted_consistency

- predicted_accessibility

- confidence_score

- created_at

---

brand_lineage

FIELDS:

- id

- parent_brand_id

- child_brand_id

- derivation_type

- created_at

---

brand_reasoning

FIELDS:

- id

- brand_kit_id

- reasoning_snapshot

- ai_model

- created_at

---

## ⚡ EXECUTION BOUNDARIES

FRONTEND MAY:

- render brand previews

- render validation state

- render accessibility warnings

- render enforcement badges

- manage optimistic state

- render upload flows

- manage token selectors

- display AI suggestions

FRONTEND MUST NEVER:

- execute accessibility analysis

- generate embeddings

- determine compliance truth

- infer brand drift

- mutate persisted rules silently

- override enforcement authority

- bypass governance layer

RULE:

backend owns enforcement authority completely

---

## 🛡️ GOVERNANCE BOUNDARIES

ALL BRAND CHANGES MUST:

- remain versioned

- remain auditable

- preserve lineage

- preserve rollback capability

- preserve org isolation

ALL AI OUTPUTS MUST:

- remain explainable

- include confidence metadata

- respect enforcement mode

- preserve historical references

SECURITY RULES:

- signed asset URLs mandatory

- private assets isolated per org

- embeddings encrypted at rest

- Python workers isolated

- BYOK isolation enforced

---

## ✅ WHAT CLAUDE CAN SAFELY IMPLEMENT

CLAUDE CAN IMPLEMENT:

- brand kit UI

- asset management UX

- upload flows

- realtime listeners

- enforcement indicators

- accessibility warning UI

- token management

- optimistic UX

- adapter normalization

- React Query integration

- Supabase fetch layers

- rollback UI

- version history UI

- live preview rendering

WITHOUT:

- fabricating intelligence

- bypassing governance

- simulating enterprise enforcement logic

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFERRED TO BACKEND / ML PHASE:

- semantic brand understanding

- multimodal brand embeddings

- accessibility AI remediation

- autonomous brand correction

- cross-platform rendering parity engine

- intelligent token generation

- semantic design governance

- adaptive localization branding

- predictive compliance scoring

- automated drift prevention

RULE:

frontend MUST NEVER emulate enterprise intelligence systems

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER ALLOW:

- Python execution in frontend

- hidden AI palette mutations

- auto-generated brand rules on load

- fake accessibility scoring

- silent enforcement overrides

- uncontrolled font uploads

- frontend compliance authority

- localStorage as enforcement source

- direct model access from browser

- unversioned enforcement changes

- destructive overwrite saves

- AI silently changing organization identity

NEVER:

- bypass governance

- bypass audit logging

- bypass validation engine

- bypass org isolation

- bypass rollback layer

RULE:

brand kit is enterprise governance infrastructure

NOT:

- simple theme settings page

- uncontrolled AI styling tool

- autonomous branding engine

---

## 🧠 BRAND INTELLIGENCE + MEMORY LOOP

SYSTEM SHOULD EVOLVE INTO:

- enterprise design memory engine

- brand governance infrastructure

- semantic brand graph

- attribution-aware branding intelligence

- organizational consistency engine

- creative-brand lineage system

LEARNING LOOP:

brand_created

→ analyzed

→ enforced

→ deployed

→ monitored

→ drift_detected

→ reconciled

→ versioned

→ reused safely

GOAL:

build institutional-grade brand intelligence

—not مجرد brand settings panel أو color picker system.