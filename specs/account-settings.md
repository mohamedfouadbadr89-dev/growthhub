📄 account-settings.md


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

PAGE: app/settings/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

👤 Profile

* name
* email
* avatar

⸻

🔐 Security

* password
* 2FA_status

⸻

🏢 Organization

* org_name
* plan
* seats

⸻

⚙️ Preferences

* theme
* notifications

⸻

⚡ Actions

* update_profile
* change_password
* enable_2fa

⸻

⸻

🧱 2. Data Shape

type AccountSettings = {
profile: {
name: string
email: string
avatar?: string
}

security: {
two_factor: boolean
}

organization: {
name: string
plan: string
seats: number
}

preferences: {
theme: string
notifications: boolean
}
}

3. API Contracts

GET /api/v1/account

PUT /api/v1/account

POST /api/v1/account/password

POST /api/v1/account/2fa

⸻

🗄️ 4. DB Schema

users

* id
* name
* email
* password_hash

⸻

organizations

* id
* name
* plan

⸻

⸻

⚙️ 5. Execution Logic

* update user data
* validate security
* handle preferences

⸻

⸻

🧠 6. AI Layer

* detect weak security
* recommend upgrades

## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI