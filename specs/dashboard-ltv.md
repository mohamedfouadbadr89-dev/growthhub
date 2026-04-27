📄 dashboard-ltv.md


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

PAGE: dashboard/ltv/page.tsx

⸻

🧩 1. UI → Data Mapping

LTV Core Cards:

* avg_ltv
* avg_cac
* ltv_cac_ratio
* payback_days
* repeat_rate

⸻

Cohort Chart (CRITICAL)

* cohort_date
* customers_acquired
* revenue_d7
* revenue_d30
* revenue_d60
* revenue_d90
* cumulative_ltv

⸻

LTV Breakdown Table

* channel
* ltv
* cac
* ratio
* payback_days
* status

⸻

Retention Curve

* day
* retention_rate

⸻

Filters

* date_range
* channel
* cohort_type (weekly / monthly)

⸻

🧱 2. Data Shape (Normalized)

type LTVMetrics = {
  avg_ltv: number
  avg_cac: number
  ltv_cac_ratio: number
  payback_days: number
  repeat_rate: number
}

type Cohort = {
  cohort_date: string
  customers: number

  revenue: {
    d7: number
    d30: number
    d60: number
    d90: number
  }

  ltv: number
}

type LTVChannel = {
  channel: string
  ltv: number
  cac: number
  ratio: number
  payback_days: number
  status: "scaling" | "healthy" | "risky" | "unprofitable"
}

type LTVResponse = {
  summary: LTVMetrics
  cohorts: Cohort[]
  channels: LTVChannel[]
  retention: {
    day: number
    rate: number
  }[]
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/ltv

Query:

* date_range
* channel
* cohort_type

Response:
LTVResponse

⸻

🗄️ 4. DB Schema

customers

* id
* org_id
* acquisition_channel
* acquisition_cost
* first_purchase_date
* created_at

⸻

orders

* id
* org_id
* customer_id
* revenue
* date
* created_at

⸻

cohorts (PRE-AGGREGATED — REQUIRED)

* id
* org_id
* cohort_date
* customers_count
* d7_revenue
* d30_revenue
* d60_revenue
* d90_revenue
* created_at

⸻

⚙️ 5. Execution Logic

LTV:

LTV = total_revenue / total_customers

## ⚠️ LTV CALCULATION UPGRADE

LTV MUST NOT be global average

REQUIRED:

- cohort-based LTV
- time-window based:
  - LTV D7
  - LTV D30
  - LTV D60
  - LTV D90

---

ADVANCED:

predicted_ltv = model (based on early signals)

INPUTS:

- D1 retention
- D3 retention
- early revenue
- channel
- cohort behavior

---

RULES:

- dashboard MUST show:
  - actual LTV
  - predicted LTV

- decision engine MUST use predicted LTV (NOT historical only)

⸻

CAC:

CAC = total_acquisition_spend / customers_acquired

⸻

LTV / CAC Ratio:

ratio = LTV / CAC

⸻

Payback Period:

payback_days = days until cumulative revenue >= CAC

⸻

Retention:

retention_rate = returning_customers / total_customers

⸻

Status Logic:

IF ratio > 3
→ scaling

IF ratio between 2–3
→ healthy

IF ratio between 1–2
→ risky

IF ratio < 1
→ unprofitable

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

None

This page is analytics only

⸻

📊 8. Marketing Rules (CRITICAL)

IF ratio > 3
→ increase budget

⸻

IF ratio between 1–2
→ optimize funnel

⸻

IF ratio < 1
→ stop acquisition

⸻

IF payback_days too high
→ reduce CAC

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/ltv

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* backend calculates all metrics
* frontend only renders
* MUST use cohort pre-aggregation

⸻

Performance:

* cache LTV metrics
* precompute cohorts

⸻

Security:

* filter by org_id

⸻

Future:

feeds:

* decision engine
* budget allocation
* strategy layer

⸻

## 🧠 AI Layer

NONE

RULES:
- strictly analytics
- cohort precomputed only

## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI



## 🔴 REALTIME STRATEGY

SOURCE: SUPABASE_REALTIME

MODE: HYBRID

---

1. REALTIME (PARTIAL)

CHANNEL:

- ltv_updates:{org_id}

EVENTS:

order_created:
- customer_id
- revenue
- timestamp

customer_acquired:
- customer_id
- channel
- acquisition_cost

---

RULES:

- new revenue MUST update cohort cumulative LTV
- CAC MUST update instantly

---

2. NON-REALTIME

- cohort rebuild → batch job (hourly / daily)
- predicted LTV → background job

---

FALLBACK:

- refetch every 60s
✅ DONE