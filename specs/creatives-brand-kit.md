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

PAGE: creatives/brand-kit/page.tsx

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

⸻

⸻

⚙️ 5. Execution Logic

1. load brand kit
2. enforce rules on editor
3. block invalid styles

⸻

⸻

🧠 6. AI Layer

* auto-apply brand styles
* reject off-brand creatives

⸻

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