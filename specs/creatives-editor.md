
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

⸻

⚙️ 5. Execution Logic

1. load creative
2. update in real-time
3. apply AI suggestions
4. preview update
5. save draft / publish

⸻

⸻

🧠 6. AI Layer

* copy optimization
* CTA improvement
* layout suggestion
* performance prediction

⸻

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

