
campaigns-list.md

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

PAGE: campaigns/page.tsx

⸻

🧩 1. UI → Data Mapping

📊 Campaigns Table

* campaign_id
* name
* status
* platform
* spend
* revenue
* roas

⸻

🔍 Filters / Controls

* date_range
* platform
* status

⸻

⚡ Bulk Actions

* pause
* duplicate
* export

## ⚠️ BULK ACTION RULES

- each campaign MUST be validated individually
- MUST check risk before execution
- MUST support partial success

BLOCK IF:

- any campaign risk = HIGH (unless override)
⸻

🧱 2. Data Shape

type CampaignList = {
campaigns: {
id: string
name: string
platform: string
status: string
spend: number
revenue: number
roas: number
}[]

filters: {
date_range: string
platform: string
status: string
}
}

3. API Contracts


GET /api/v1/campaigns

Query:

- page
- limit
- date_range
- platform
- status
- sort_by (spend | revenue | roas)
- order (asc | desc)

⸻

🗄️ 4. DB Schema

campaigns
campaign_metrics

⸻

⚙️ 5. Execution Logic

* aggregate campaign metrics
* sort by performance
* filter by status/platform

## 📊 CAMPAIGN STATUS LOGIC

IF roas > 3
→ scaling

IF roas stable
→ active

IF roas declining
→ warning

IF roas < 1.5
→ critical

## ⚡ REAL-TIME UPDATES

SOURCE: SUPABASE REALTIME

CHANNEL:

- campaigns:{org_id}

EVENTS:

- campaign_updated
- campaign_status_changed
- metrics_updated

RULE:

- UI must auto-update without refresh

⸻

🧠 6. AI Layer

* 
* flag underperformers

## 🧠 AI LAYER (BACKEND ONLY)

SOURCE:

- precomputed rankings
- cached insights

RULES:

- NO AI execution on GET
- rankings fetched from DB/cache only

⸻

💳 7. Credits System

* minimal usage → LOW

⸻

🧠 8. AI Usage Classification

* campaign_ranking → LOW

⸻

📊 9. Marketing Rules

* ROAS low → flag
* high spend no return → alert

⸻

🧾 10. Comments

* pagination required
* sorting enabled


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation
AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI



## 🔗 DECISION INTEGRATION

EACH CAMPAIGN MAY HAVE:

- linked_decisions_count
- risk_level
- active_alerts

SOURCE:

- decision engine
- alerts system

## 🎯 UI STATES

- loading state
- empty state (no campaigns)
- error state (API failure)

## ⚡ PERFORMANCE

- cache campaigns list
- invalidate on update events
- debounce filters