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




 🧠 COMPETITOR INTELLIGENCE LAYER

PRIMARY REFERENCES:

- Northbeam

- Triple Whale

- Peel Insights

- Lifetimely

- Segmetrics

- Polar Analytics

- Wicked Reports

BENCHMARK AREAS:

- contribution profit

- net margin visibility

- channel profitability

- CAC efficiency

- blended profitability

- payback analysis

- operational cost visibility

- realtime margin tracking

- cohort profitability

- incremental profit analysis

REFERENCE:

[Northbeam](https://www.northbeam.io/?utm_source=chatgpt.com)

[Northbeam Reviews](https://www.g2.com/products/northbeam/reviews?utm_source=chatgpt.com)

---

## ⚡ RUNTIME TRUTH

PROFIT IS:

- delayed

- attribution-sensitive

- refund-sensitive

- inventory-sensitive

- operationally distorted

RULES:

- revenue ≠ realized profit

- ad spend updates faster than COGS

- operational costs may lag

- refunds alter historical profitability

- attribution affects channel profit accuracy

- gross profit and net profit MUST remain separate

SYSTEM TRUTH PRIORITY:

1. verified financial transactions

2. attributed spend

3. refund ledger

4. operational cost snapshots

5. dashboard aggregates

NEVER:

- compute profitability in frontend

- calculate CAC from raw spend only

- use estimated margins as source of truth

- blend realized and projected profit silently

REFERENCE:

 [oai_citation:0‡northbeam.io](https://www.northbeam.io/?utm_source=chatgpt.com)

---

## 🔄 COMPETITOR LIFECYCLE SEMANTICS

PROFIT FLOW:

traffic

→ attribution

→ conversion

→ order

→ refund validation

→ cost allocation

→ contribution margin

→ net profitability

→ cohort profitability

→ scaling decisions

RULES:

- channel profitability changes over time

- contribution margin separate from net margin

- CAC linked to attribution engine

- operational costs allocated asynchronously

REFERENCE:

 [oai_citation:1‡northbeam.io](https://www.northbeam.io/?utm_source=chatgpt.com)

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- gross vs net revenue

- refund accounting

- tax treatment

- shipping revenue handling

- currency normalization

- inventory depreciation

- partial refunds

- delayed fulfillment cost

- blended operational allocation

- agency fee allocation

- subscription churn impact

- recurring revenue treatment

- failed payment handling

- multi-channel order allocation

- margin confidence scoring

REQUIRED BEFORE SCALE:

- financial normalization rules

- accounting reconciliation rules

- profitability methodology standardization

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- high revenue means profitability

- ROAS equals profit

- CAC and CPA interchangeable

- contribution margin equals net margin

- operational costs fully synced

- channel attribution perfectly accurate

- recent profit metrics finalized

RISKS:

- overscaling unprofitable campaigns

- incorrect executive reporting

- false margin confidence

- distorted CAC decisions

- underreported operational costs

- inaccurate board-level profitability

REFERENCE:

 [oai_citation:2‡G2](https://www.g2.com/products/northbeam/reviews?utm_source=chatgpt.com)

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/dashboard/profit/margin

- GET /api/v1/dashboard/profit/contribution

- GET /api/v1/dashboard/profit/cohorts

- GET /api/v1/dashboard/profit/refunds

- GET /api/v1/dashboard/profit/payback

- GET /api/v1/dashboard/profit/forecast

- POST /api/v1/dashboard/profit/recompute

- POST /api/v1/dashboard/profit/export

MISSING FILTERS:

- campaign_id

- acquisition_channel

- product_category

- subscription_plan

- geo

- attribution_model

- customer_segment

- device_type

MISSING STATES:

- stale_costs

- delayed_refunds

- incomplete_margin

- attribution_mismatch

- recalculating

- partial_profit

- low_confidence

- pending_finance_sync

---

## 🌐 REQUIRED BACKEND CONTRACTS

PROFIT COMPUTATION CONTRACT:

INPUT:

- orders[]

- refunds[]

- attributed_spend[]

- operational_costs[]

OUTPUT:

- gross_profit

- net_profit

- contribution_margin

- profit_margin

RULES:

- backend-only execution

- immutable financial snapshots

- refund-aware calculations

---

CAC CONTRACT:

INPUT:

- attributed_spend

- acquired_customers

OUTPUT:

- cac

- cohort_cac

- blended_cac

RULES:

- attribution-linked only

- deduplicated customers required

---

CHANNEL PROFIT CONTRACT:

INPUT:

- attributed_revenue

- attributed_cost

- operational_allocations

OUTPUT:

- channel_profit

- margin

- profitability_status

RULES:

- attribution engine required

- operational allocation versioned

REFERENCE:

 [oai_citation:3‡northbeam.io](https://www.northbeam.io/?utm_source=chatgpt.com)

---

## 🗄️ REQUIRED TABLES

profit_snapshots

profit_versions

refund_ledger

operational_allocations

contribution_margin_daily

gross_margin_daily

profit_audit_logs

financial_reconciliation

profit_forecasts

channel_profitability_snapshots

payback_snapshots

cost_sync_status

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- profit cards UI

- margin visualizations

- trend charts

- realtime subscriptions

- breakdown tables

- profitability badges

- filters

- export buttons

- loading/error/empty states

CLAUDE MUST NOT IMPLEMENT:

- accounting reconciliation engine

- profitability forecasting engine

- financial allocation logic

- refund reconciliation

- margin simulation

- autonomous budget shifts

- finance-grade reporting engine

REFERENCE:

 [oai_citation:4‡northbeam.io](https://www.northbeam.io/?utm_source=chatgpt.com)

---

## 🛡️ GOVERNANCE BOUNDARIES

FINANCIAL GOVERNANCE:

- profitability formulas versioned

- cost allocation auditable

- margin methodology immutable

- financial snapshots reproducible

SECURITY:

- org-level financial isolation

- export logging mandatory

- financial access RBAC enforced

COMPLIANCE:

- accounting-safe calculations

- immutable audit trail

- refund history preserved

- recalculation history retained

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- AI profitability forecasting

- autonomous spend optimization

- predictive finance modeling

- causal margin attribution

- generative financial recommendations

- automated pricing optimization

- AI-driven operational allocation

RULE:

- do NOT fake accounting precision

REFERENCE:

 [oai_citation:5‡northbeam.io](https://www.northbeam.io/?utm_source=chatgpt.com)

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend margin calculations

- realtime full financial recomputes

- uncached profitability aggregation

- fake revenue projections

- client-side CAC computation

- browser-based accounting logic

- direct SQL access from frontend

- automatic AI profit generation

---

## 🔴 PROFITABILITY SEMANTICS

PROFITABILITY LAYERS:

- gross revenue

- contribution profit

- operating profit

- net profit

RULES:

- dashboards MUST distinguish layers clearly

- contribution margin separate from net margin

- refunds applied historically

- operational costs versioned

SYSTEM MUST TRACK:

- refund impact

- attribution confidence

- operational lag

- financial completeness

- margin consistency

REFERENCE:

 [oai_citation:6‡northbeam.io](https://www.northbeam.io/?utm_source=chatgpt.com)

---

## 📊 STRATEGIC PROFIT INTELLIGENCE

IF:

- revenue increasing

AND

- margin decreasing

THEN:

- scaling inefficiency risk

---

IF:

- CAC rising

AND

- LTV stable

THEN:

- acquisition deterioration

---

IF:

- high ROAS

BUT

- weak contribution profit

THEN:

- attribution illusion

---

IF:

- operational costs spike

AND

- revenue flat

THEN:

- margin compression risk

---

IF:

- one channel dominates profitability

THEN:

- dependency concentration risk

REFERENCE:

 [oai_citation:7‡linkedin.com](https://www.linkedin.com/company/northbeam?utm_source=chatgpt.com)


 
✅ DONE