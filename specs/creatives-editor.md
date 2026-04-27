
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
