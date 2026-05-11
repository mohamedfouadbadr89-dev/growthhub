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


## ⚠️ PAYBACK RULE

- MUST be cohort-specific
- MUST NOT use global average

ADVANCED:

- show distribution:
  - median payback
  - p75 payback
  
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

## ⚠️ CAC SOURCE

CAC MUST come from:

- attribution engine
- NOT raw ad spend

RULE:

- CAC = attributed spend / customers

NOT:

- total spend / users



COMPETITOR INTELLIGENCE LAYER

PRIMARY REFERENCES:

- Northbeam

- Triple Whale

- Lifetimely

- Segmetrics

- Wicked Reports

- Polar Analytics

- Peel Insights

BENCHMARK AREAS:

- cohort-based LTV

- predicted LTV

- CAC recovery

- payback curves

- profitability segmentation

- acquisition quality

- blended ROAS

- retention-linked LTV

- channel efficiency

- cohort forecasting

REFERENCE:

[Northbeam Cohort Analysis](https://www.northbeam.io/blog/cohort-analysis-for-marketers-uncovering-trends-in-customer-behavior?utm_source=chatgpt.com)

[Northbeam Real-time Dashboards](https://northbeam.findableis.com/features/dashboards.html?utm_source=chatgpt.com)

---

## ⚡ RUNTIME TRUTH

LTV IS:

- delayed

- probabilistic

- cohort-sensitive

- highly dependent on attribution quality

RULES:

- recent cohorts underreport true LTV

- CAC changes over time

- LTV matures over months

- attribution affects profitability accuracy

- refunds distort realized LTV

- retention quality impacts forecast confidence

SYSTEM TRUTH PRIORITY:

1. verified orders

2. attribution engine

3. customer identity graph

4. cohort aggregation

5. dashboard snapshots

NEVER:

- calculate LTV in frontend

- compute payback in browser

- use global averages for decisions

- compare immature and mature cohorts equally

REFERENCE:

 [oai_citation:0‡northbeam.io](https://www.northbeam.io/blog/cohort-analysis-for-marketers-uncovering-trends-in-customer-behavior?utm_source=chatgpt.com)

---

## 🔄 COMPETITOR LIFECYCLE SEMANTICS

LTV FLOW:

acquisition

→ attribution

→ first purchase

→ retention

→ repeat orders

→ cumulative revenue

→ cohort LTV

→ profitability scoring

→ budget optimization

→ forecasting

RULES:

- cohort LTV evolves continuously

- predicted LTV separate from realized LTV

- CAC must remain attribution-linked

- payback recalculated incrementally

REFERENCE:

 [oai_citation:1‡Cometly](https://www.cometly.com/post/northbeam-vs-other-attribution-tools?utm_source=chatgpt.com)

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- refund treatment

- canceled subscription handling

- multi-order attribution

- cross-device identity stitching

- blended CAC semantics

- net vs gross revenue

- tax inclusion

- shipping inclusion

- retention decay model

- predicted LTV confidence

- cohort maturity weighting

- delayed conversion ingestion

- churn recovery logic

- customer resurrection semantics

- payback confidence interval

REQUIRED BEFORE SCALE:

- financial normalization rules

- attribution reconciliation policy

- standardized LTV definitions

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- high LTV means profitability

- high ROAS means strong cohorts

- CAC remains stable over time

- projected LTV equals realized LTV

- all channels produce equal retention

- recent cohorts are finalized

- blended metrics are actionable alone

RISKS:

- overspending on weak cohorts

- false scaling decisions

- CAC distortion

- overestimated profitability

- inaccurate payback windows

- misleading board reporting

REFERENCE:

 [oai_citation:2‡wickedreports.com](https://www.wickedreports.com/wicked-vs-northbeam?utm_source=chatgpt.com)

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/dashboard/ltv/forecast

- GET /api/v1/dashboard/ltv/payback

- GET /api/v1/dashboard/ltv/history

- POST /api/v1/dashboard/ltv/recompute

- POST /api/v1/dashboard/ltv/export

- GET /api/v1/dashboard/ltv/profitability

- GET /api/v1/dashboard/ltv/confidence

MISSING FILTERS:

- acquisition_campaign

- product

- subscription_plan

- device_type

- customer_type

- geo

- attribution_model

MISSING STATES:

- immature_cohort

- stale_forecast

- delayed_revenue

- low_confidence

- recomputing

- attribution_mismatch

- refund_adjusted

---

## 🌐 REQUIRED BACKEND CONTRACTS

LTV COMPUTATION CONTRACT:

INPUT:

- customer_orders[]

- attribution_costs[]

- retention_events[]

OUTPUT:

- realized_ltv

- predicted_ltv

- payback_days

- profitability_score

RULES:

- backend-only execution

- cohort-window based

- immutable snapshots

---

PAYBACK CONTRACT:

INPUT:

- cohort_id

- cumulative_revenue

- attributed_cac

OUTPUT:

- payback_days

- payback_distribution

RULE:

- cohort-specific only

- no blended payback allowed

---

FORECAST CONTRACT:

INPUT:

- retention_d1

- retention_d7

- early_revenue

- acquisition_channel

OUTPUT:

- predicted_ltv

- confidence_score

RULES:

- async processing only

- versioned forecasts required

REFERENCE:

 [oai_citation:3‡RevOps Tools](https://revops.tools/northbeam/?utm_source=chatgpt.com)

---

## 🗄️ REQUIRED TABLES

ltv_snapshots

ltv_forecasts

ltv_versions

payback_metrics

cohort_profitability

customer_profitability

refund_adjustments

ltv_confidence_scores

ltv_jobs

ltv_audit_logs

revenue_reconciliation

attribution_cost_snapshots

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- LTV cards UI

- trend chart rendering

- cohort performance tables

- filtering UI

- pagination

- loading/error/empty states

- realtime subscriptions

- profitability badges

CLAUDE MUST NOT IMPLEMENT:

- predictive LTV engine

- forecasting model

- attribution reconciliation

- CAC computation engine

- payback engine

- profitability engine

- MMM simulations

REFERENCE:

 [oai_citation:4‡RevOps Tools](https://revops.tools/northbeam/?utm_source=chatgpt.com)

---

## 🛡️ GOVERNANCE BOUNDARIES

LTV GOVERNANCE:

- forecast versions immutable

- LTV methodology centrally controlled

- CAC definitions locked per org

- recomputes auditable

SECURITY:

- org-level isolation mandatory

- no raw customer exposure

- exports audited

COMPLIANCE:

- financial calculations reproducible

- anonymized cohort exports only

- audit trail required for forecast updates

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- AI-driven budget optimization

- probabilistic CAC forecasting

- autonomous spend allocation

- causal LTV modeling

- reinforcement optimization

- automated scaling recommendations

- generative insights

RULE:

- do NOT fake predictive profitability accuracy

REFERENCE:

 [oai_citation:5‡RevOps Tools](https://revops.tools/northbeam/?utm_source=chatgpt.com)

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend LTV calculations

- realtime full cohort rebuilds

- uncached predicted LTV

- fake projections in production

- localStorage profitability caching

- client-side CAC computation

- automatic AI forecasts on page load

- direct SQL aggregation from frontend

---

## 🔴 LTV MATURITY SEMANTICS

LTV MATURITY:

- D7 stable earlier

- D30 moderate confidence

- D90 delayed stabilization

- 365D highly probabilistic

RULES:

- projected LTV MUST display confidence

- immature cohorts flagged visually

- realized and predicted LTV separated

SYSTEM MUST TRACK:

- forecast confidence

- cohort maturity

- revenue completeness

- attribution confidence

- refund impact

REFERENCE:

 [oai_citation:6‡northbeam.io](https://www.northbeam.io/blog/cohort-analysis-for-marketers-uncovering-trends-in-customer-behavior?utm_source=chatgpt.com)

---

## 📊 PROFITABILITY INTELLIGENCE SEMANTICS

IF:

- high LTV

AND

- long payback

THEN:

- scaling risk

---

IF:

- low CAC

AND

- weak retention

THEN:

- acquisition quality issue

---

IF:

- retention improving

AND

- CAC stable

THEN:

- increase scaling confidence

---

IF:

- channel has high ROAS

BUT

- weak LTV

THEN:

- short-term optimization trap

REFERENCE:

 [oai_citation:7‡northbeam.io](https://www.northbeam.io/case-study/targeting-high-value-customers-and-subscriptions-for-sustainable-growth-at-petmeds?utm_source=chatgpt.com)

 
✅ DONE