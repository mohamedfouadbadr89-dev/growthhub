📄 dashboard-overview.md


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



PAGE: dashboard/overview/page.tsx

⸻

🧩 1. UI → Data Mapping

AI Summary:

* performance_vs_benchmark
* top_campaign
* recommendation_action

⸻

KPI Cards:

* revenue
* profit
* roas
* spend
* mer
* change_percent per metric

⸻

Trend Chart:

* date
* revenue
* spend

⸻

Highlights:

* wins[]
* issues[]

⸻

Campaign Table:

* id
* name
* platform
* spend
* revenue
* roas
* status

⸻

🧱 2. Data Shape (Normalized)

type DashboardOverview = {
  summary: {
    performance_vs_benchmark: number
    top_driver: {
      campaign_id: string
      campaign_name: string
      platform: "meta" | "google" | "tiktok"
      roas: number
    }
    recommendation: {
      action: string
      amount: number
      from_channel: string
      to_channel: string
    }
    generated_at: string
  }

  kpis: {
    revenue: number
    profit: number
    spend: number
    roas: number
    mer: number
    change: {
      revenue: number
      profit: number
      roas: number
      spend: number
      mer: number
    }
  }

  trend: {
    date: string
    revenue: number
    spend: number
  }[]

  highlights: {
    wins: {
      id: string
      message: string
      impact_score: number
    }[]
    issues: {
      id: string
      message: string
      severity: "low" | "medium" | "high"
    }[]
  }

  campaigns: {
    id: string
    name: string
    platform: string
    spend: number
    revenue: number
    roas: number
    status: "active" | "paused" | "warning"
  }[]
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/overview

Query:

* date_range=7d | 30d | 90d

Response:
DashboardOverview

⸻

POST /api/v1/dashboard/summary/regenerate

Purpose:

* regenerate AI summary

Rules:

* costs credits for subscription users
* uses BYOK for LTD users

⸻

🗄️ 4. DB Schema (Initial)

daily_metrics

* id
* org_id
* date
* revenue
* spend
* profit
* roas
* mer
* created_at

⸻

ai_summaries

* id
* org_id
* type (dashboard_summary)
* content (jsonb)
* tokens_used
* cost
* created_at

⸻

highlights

* id
* org_id
* type (win | issue)
* message
* severity
* impact_score
* created_at

⸻

⚙️ 5. Execution Logic

Metrics Engine:

revenue = SUM(revenue)
spend = SUM(spend)
profit = revenue - spend
roas = revenue / spend
mer = revenue / total_spend

⸻

Top Driver:

select campaign with highest ROAS

⸻

Highlights (RULE-BASED, NOT AI):

if roas > 3 → win
if roas < 1.5 → issue
if profit < 0 → critical issue

⸻

AI Summary:

* fetch latest from ai_summaries
* 🧠 AI Layer

SOURCE:
GET /api/v1/ai/cache?type=dashboard_summary

TRIGGER:
POST /api/v1/dashboard/summary/regenerate

RULES:
- return cached only
- if not exists → return null
- NEVER generate inside GET
* DO NOT auto-regenerate on page load

⸻

💳 6. Credits System

if plan_type === "ltd":

* use BYOK key from vault
* no credits deducted

else:

* regenerate summary → deduct credits
* normal load → no credits

⸻

🧠 7. AI Usage Classification

dashboard_summary → LOW cost
decision_engine → MEDIUM
creative_generation → HIGH

⸻

📊 8. Marketing Rules (NOT AI)

if roas > 3 → scale
if roas < 1.5 → stop
if spend high + low return → reallocate budget

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/overview

⸻

Requirements:

* loading state
* error handling
* empty state

⸻

Security:

* must include org_id filtering
* no direct DB calls from frontend

⸻

Performance:

* cache response (Redis optional)

⸻

Important:

* AI summary must be cached
* regenerate only on user action

⸻


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation
AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔴 REALTIME STRATEGY

SOURCE: SUPABASE_REALTIME

MODE: HYBRID (CRITICAL)

---

1. BROADCAST (PRIMARY)

CHANNEL:

- dashboard_overview:{org_id}

EVENTS:

kpi_update:
- revenue
- spend
- profit
- roas
- mer
- timestamp

campaign_update:
- campaign_id
- status
- spend
- revenue
- roas

highlight_update:
- wins[]
- issues[]

---

2. POSTGRES_CHANGES (LIMITED)

TABLES:

- daily_metrics (INSERT)
- highlights (INSERT)

---

RULES:

- KPI cards MUST update live
- campaign table MUST reflect latest status
- highlights MUST push instantly

---

3. NON-REALTIME (INTENTIONAL)

- trend chart → refresh every 60s
- AI summary → cache only (NO realtime)

---

FALLBACK:

- refetch GET /api/v1/dashboard/overview every 30s

---

SECURITY:

- org_id scoped channels

✅ DONE