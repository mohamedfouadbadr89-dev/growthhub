📄 dashboard-profit.md

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



PAGE: dashboard/profit/page.tsx

⸻

🧩 1. UI → Data Mapping

Profit Overview:

* total_revenue
* total_cost
* total_profit
* profit_margin (%)

⸻

Profit Breakdown:

* product_cost
* ad_spend
* operational_cost
* other_cost

⸻

Profit Trends:

* date
* revenue
* cost
* profit

⸻

Unit Economics:

* cpa (cost per acquisition)
* cac (customer acquisition cost)
* aov
* ltv

⸻

Top Profitable Channels:

* channel_name
* revenue
* cost
* profit
* profit_margin

⸻

Filters:

* date_range
* channel
* product

⸻

🧱 2. Data Shape (Normalized)

type ProfitOverview = {
  revenue: number
  cost: number
  profit: number
  margin: number
}

type ProfitTrend = {
  date: string
  revenue: number
  cost: number
  profit: number
}

type UnitEconomics = {
  cpa: number
  cac: number
  aov: number
  ltv: number
}

type ChannelProfit = {
  channel: string
  revenue: number
  cost: number
  profit: number
  margin: number
}

type ProfitResponse = {
  overview: ProfitOverview
  trends: ProfitTrend[]
  unit_economics: UnitEconomics
  channels: ChannelProfit[]
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/profit

Query:

* date_range
* channel
* product

Response:
ProfitResponse

⸻

🗄️ 4. DB Schema (Initial)

profit_daily

* id
* org_id
* date
* revenue
* cost
* profit
* margin

⸻

cost_breakdown

* id
* org_id
* date
* ad_spend
* product_cost
* operational_cost
* other_cost

⸻

channel_profit

* id
* org_id
* channel
* revenue
* cost
* profit
* margin
* date

⸻

⚙️ 5. Execution Logic

Profit:

profit = revenue - cost

⸻

Profit Margin:

margin = (profit / revenue) * 100

⸻

CAC:

cac = total_ad_spend / total_customers

⸻

CPA:

cpa = ad_spend / conversions

⸻

LTV:

ltv = total_revenue / total_customers

⸻

AOV:

aov = total_revenue / total_orders

⸻

💳 6. Credits System

No credits used

⸻
## 🧠 AI Layer

NONE

RULES:
- no AI allowed
- backend calculations only
⸻

📊 8. Marketing Rules (Not AI)

If:

* profit margin dropping

Then:

* reduce spend OR increase pricing

⸻

If:

* CAC > LTV

Then:

* stop scaling immediately

⸻

If:

* channel highly profitable

Then:

* increase budget allocation

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/profit

⸻

Important:

* all calculations in backend
* frontend only displays

⸻

Security:

* filter by org_id

⸻

Performance:

* cache profit aggregates

⸻

Future:

feeds:

* finance dashboard
* decision engine

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

MODE: CRITICAL (FINANCIAL)

---

1. BROADCAST

CHANNEL:

- profit_updates:{org_id}

EVENTS:

profit_update:
- revenue
- cost
- profit
- margin

channel_profit_update:
- channel
- revenue
- cost
- profit

unit_economics_update:
- cac
- cpa
- ltv
- aov

---

RULES:

- profit MUST update instantly
- margin MUST reflect latest state
- CAC MUST sync with ad spend updates

---

2. POSTGRES_CHANGES

TABLES:

- profit_daily (INSERT)
- cost_breakdown (UPDATE)
- channel_profit (UPDATE)

---

3. NON-REALTIME

- trends → refresh every 60s
- historical data → cached

---

FALLBACK:

- refetch GET /api/v1/dashboard/profit every 30–60s

---

SECURITY:

- org_id scoped


## ⚠️ COST MODEL

cost =

- ad_spend (real-time)
- product_cost (static / batch)
- operational_cost (daily update)

---

RULE:

- profit MUST reflect real-time ad spend
- other costs may lag (acceptable)


## ⚠️ CAC vs CPA

CPA:
- cost per conversion

CAC:
- cost per customer acquisition

RULE:

- CAC MUST include:
  - ad spend
  - attribution logic
  - deduplication

- CPA = tactical metric
- CAC = strategic metric

## 🔗 EVENT SOURCES

profit + segments updated from:

- actions execution
- attribution engine
- campaign performance
- user behavior tracking

---

FLOW:

execution → logs → metrics → attribution → segments → profit → dashboard

✅ DONE