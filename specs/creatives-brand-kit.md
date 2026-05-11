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