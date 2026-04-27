creatives-archive.md

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

PAGE: 

⸻

🧩 1. UI → Data Mapping

⸻

Creative List

* creative_id
* thumbnail
* platform
* format
* performance_score
* status

⸻

Filters

* platform
* format
* performance
* status

⸻

Actions

* reuse
* duplicate
* edit
* relaunch

⸻
## ⚠️ RELAUNCH SAFETY

- MUST validate campaign compatibility
- MUST check current performance trends

BLOCK IF:

- creative outdated
- performance declining

⸻

🧱 2. Data Shape

type CreativeArchive = {
id: string
thumbnail: string

tags: {
platform: string
format: string
}

performance_score: number

status: "active" | "paused" | "archived"
}

⸻

🌐 3. API Contracts

GET /api/v1/creatives/archive

POST /api/v1/creatives/:id/reuse

POST /api/v1/creatives/:id/duplicate

⸻

POST /api/v1/creatives/bulk/reuse

RULES:

- validate each creative
- support partial execution

⸻

🗄️ 4. DB Schema

creative_archive

* id
* org_id
* creative_id
* status
* performance_score
* created_at

⸻
creative_history

* id
* creative_id
* version_id
* performance_score
* created_at

⸻

⚙️ 5. Execution Logic

1. fetch archived creatives
2. filter + search
3. allow reuse / relaunch


## 📊 PERFORMANCE SCORING

score based on:

- roas
- ctr
- engagement
- recency

RULE:

- prioritize recent high performers

⸻

## ⚡ REAL-TIME ARCHIVE SYNC

SOURCE: SUPABASE REALTIME

CHANNEL:

- creatives_archive:{org_id}

EVENTS:

- creative_archived
- creative_reused
- performance_updated

⸻

🧠 6. AI Layer

* detect top reusable creatives
* identify evergreen creatives

⸻
## 🧠 AI LAYER (BACKEND ONLY)

- reusable creatives detection is precomputed
- fetched from cache / DB

RULES:

- NO AI execution on GET
⸻

💳 7. Credits System

* reuse → FREE

⸻

⸻

🧠 8. AI Usage Classification

* reuse_recommendation → LOW

⸻

⸻

📊 9. Marketing Rules

* reuse high performers
* archive low performers

⸻

⸻

🧾 10. Comments (FOR CLAUDE)

Use:

GET /api/v1/creatives/archive

Requirements:

* fast filtering
* search
* bulk actions


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI
