
📄 dashboard-cohort.md

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

PAGE: dashboard/cohort/page.tsx

⸻

🧩 1. UI → Data Mapping

Cohort Heatmap (CORE)

* cohort_date
* cohort_size
* day_1_retention
* day_3_retention
* day_7_retention
* day_14_retention
* day_30_retention

⸻

Cohort Revenue Table

* cohort_date
* users
* revenue_d1
* revenue_d7
* revenue_d30
* cumulative_revenue

⸻

Retention Curve Chart

* day
* retention_rate
* cohort_group

⸻

Cohort Comparison Cards

* best_cohort
* worst_cohort
* avg_retention
* avg_ltv

⸻

Filters

* date_range
* cohort_type (daily / weekly / monthly)
* channel
* country

⸻

🧱 2. Data Shape (Normalized)

type CohortRetention = {
  cohort_date: string
  cohort_size: number

  retention: {
    d1: number
    d3: number
    d7: number
    d14: number
    d30: number
  }
}

type CohortRevenue = {
  cohort_date: string
  users: number

  revenue: {
    d1: number
    d7: number
    d30: number
  }

  cumulative_revenue: number
}

type RetentionCurve = {
  day: number
  rate: number
  cohort: string
}

type CohortResponse = {
  retention: CohortRetention[]
  revenue: CohortRevenue[]
  curve: RetentionCurve[]

  summary: {
    avg_retention: number
    best_cohort: string
    worst_cohort: string
    avg_ltv: number
  }
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/cohort

Query:

* date_range
* cohort_type
* channel
* country

Response:
CohortResponse

⸻

🗄️ 4. DB Schema

cohorts (PRE-AGGREGATED — REQUIRED)

* id
* org_id
* cohort_date
* cohort_type
* users_count
* created_at

⸻

cohort_retention

* id
* org_id
* cohort_id
* day
* retention_rate
* created_at

⸻

cohort_revenue

* id
* org_id
* cohort_id
* day
* revenue
* created_at

⸻

⚙️ 5. Execution Logic

Retention:

retention_rate = active_users_day_n / total_users

⸻

Revenue:

cumulative_revenue = sum(revenue over time)

⸻

Cohort Performance:

compare cohorts by:

* retention
* revenue
* ltv

⸻

Best Cohort:

highest retention at D30

⸻

Worst Cohort:

lowest retention at D7

⸻

⚠️ IMPORTANT:

ALL cohort data must be PRE-COMPUTED  
NO heavy queries at request time

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

None (Analytics Page)

⸻

## 🧠 AI Layer

NONE

RULES:
- cohort analysis is precomputed
- no AI modeling

------


📊 8. Marketing Rules (CRITICAL)

IF retention drops early (D1–D3)

→ onboarding problem

⸻

IF retention strong but revenue low

→ pricing / monetization issue

⸻

IF cohort improves over time

→ product-market fit improving

⸻

IF new cohorts worse than old

→ acquisition quality dropping

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/cohort

⸻

Important:

* backend handles aggregation
* frontend renders only
* MUST use pre-aggregated tables

⸻

Performance:

* cache cohort data
* batch compute daily

⸻

Security:

* filter by org_id

⸻

Future:

feeds:

* LTV model
* decision engine
* retention optimization

⸻


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation
AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔗 COHORT ↔ LTV LINK

- every cohort MUST map to:

  - LTV metrics
  - CAC
  - channel
  - acquisition cost

---

RULE:

- cohort view MUST include profitability

NOT just retention

## 🔴 REALTIME STRATEGY

SOURCE: SUPABASE_REALTIME

MODE: LIMITED

---

1. REALTIME EVENTS

CHANNEL:

- cohort_updates:{org_id}

EVENTS:

cohort_update:
- cohort_id
- new_revenue
- updated_ltv

retention_update:
- cohort_id
- day
- retention_rate

---

RULES:

- retention curve updates incrementally
- revenue updates immediately

---

2. NON-REALTIME

- full cohort recompute → batch job

---

FALLBACK:

- refetch every 60–120s

## ⚠️ COHORT DIMENSIONS

cohorts MUST include:

- acquisition_channel
- campaign_id (optional)
- country (optional)

---

REASON:

- compare cohort quality by source
- feed decision engine


## 🧠 COHORT SCORE

score =

0.4 * retention_d7 +
0.3 * retention_d30 +
0.3 * ltv

---

USE:

- rank cohorts
- detect acquisition quality issues

## 🔗 EVENT SOURCES

ltv + cohort updated from:

- orders (revenue)
- attribution engine (CAC)
- user tracking (retention)
- actions (execution impact)

---

FLOW:

user → order → attribution → cohort → LTV → dashboard → decision engine



 COMPETITOR INTELLIGENCE LAYER

PRIMARY REFERENCES:

- Northbeam

- Triple Whale

- Amplitude

- Mixpanel

- PostHog

- Lifetimely

- RevenueCat

BENCHMARK AREAS:

- retention cohorting

- rolling cohorts

- LTV forecasting

- churn curves

- payback windows

- acquisition quality

- cohort profitability

- behavioral retention

- cohort segmentation

- survival analysis

REFERENCE:

[Northbeam Cohort Analysis](https://www.northbeam.io/blog/cohort-analysis-for-marketers-uncovering-trends-in-customer-behavior?utm_source=chatgpt.com)

[Amplitude Cohort Analysis](https://amplitude.com/explore/cohort-analysis?utm_source=chatgpt.com)

---

## ⚡ RUNTIME TRUTH

COHORT DATA IS:

- delayed

- partially complete

- acquisition-biased

- highly dependent on tracking quality

RULES:

- recent cohorts ALWAYS appear weaker initially

- retention improves as cohorts mature

- incomplete cohorts MUST NOT be compared equally with mature cohorts

- cohort retention != product-market fit alone

- retention can be distorted by seasonality

SYSTEM TRUTH PRIORITY:

1. warehouse events

2. order events

3. user activity tracking

4. attribution linkage

5. dashboard aggregates

NEVER:

- calculate retention in frontend

- compute cohorts at request time

- compare incomplete and mature cohorts directly

REFERENCE:

 [oai_citation:0‡northbeam.io](https://www.northbeam.io/blog/cohort-analysis-for-marketers-uncovering-trends-in-customer-behavior?utm_source=chatgpt.com)

---

## 🔄 COMPETITOR LIFECYCLE SEMANTICS

COHORT FLOW:

user acquisition

→ activation

→ retention tracking

→ revenue accumulation

→ LTV calculation

→ cohort scoring

→ profitability analysis

→ optimization feedback

→ acquisition decisioning

RULES:

- cohorts immutable after processing window closes

- recalculation creates new cohort snapshot

- dashboard reads pre-aggregated state only

- retention and revenue processed separately

REFERENCE:

 [oai_citation:1‡northbeam.io](https://www.northbeam.io/blog/cohort-analysis-for-marketers-uncovering-trends-in-customer-behavior?utm_source=chatgpt.com)

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- active user definition

- churn definition

- resurrection logic

- rolling retention semantics

- bracket retention semantics

- cohort maturity scoring

- timezone normalization

- refund handling

- subscription renewals

- reactivation attribution

- bot filtering

- anonymous-to-user merge logic

- event deduplication

- retention confidence

- delayed conversion ingestion

REQUIRED BEFORE SCALE:

- standardized retention definitions

- lifecycle state definitions

- retention audit semantics

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- retention decline means product issue

- high retention means profitability

- cohorts are comparable cross-season

- acquisition source quality remains stable

- all retained users are active users

- cohort revenue is final

- retention equals engagement

- cohorts stabilize quickly

RISKS:

- misleading retention narratives

- false PMF assumptions

- CAC misallocation

- distorted LTV forecasting

- cohort survivorship bias

- invalid acquisition scaling

REFERENCE:

 [oai_citation:2‡magnetmonster.com](https://www.magnetmonster.com/blog/the-retention-marketing-strategy-bible-for-dtc-brands?utm_source=chatgpt.com)

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/dashboard/cohort/ltv

- GET /api/v1/dashboard/cohort/history

- POST /api/v1/dashboard/cohort/recompute

- POST /api/v1/dashboard/cohort/export

- POST /api/v1/dashboard/cohort/validate

- GET /api/v1/dashboard/cohort/segments

- GET /api/v1/dashboard/cohort/forecast

MISSING FILTERS:

- acquisition_source

- campaign_id

- device_type

- signup_method

- subscription_plan

- traffic_type

- acquisition_cost_range

MISSING STATES:

- partial_cohort

- stale

- recomputing

- delayed_ingestion

- low_confidence

- incomplete_revenue

---

## 🌐 REQUIRED BACKEND CONTRACTS

COHORT COMPUTATION CONTRACT:

INPUT:

- signup_events[]

- activity_events[]

- revenue_events[]

OUTPUT:

- cohort_snapshot

- retention_metrics

- revenue_metrics

- cohort_score

RULES:

- backend-only execution

- deterministic aggregation only

- precomputed snapshots required

---

RETENTION CONTRACT:

INPUT:

- cohort_id

- active_users_day_n

- total_users

OUTPUT:

- retention_rate

RULE:

- active event definition centralized

- frontend MUST NEVER define retention logic

---

LTV CONTRACT:

INPUT:

- cohort_id

- cumulative_revenue

- acquisition_cost

OUTPUT:

- ltv

- payback_period

- profitability_score

RULE:

- refunds included

- canceled subscriptions included

---

## 🗄️ REQUIRED TABLES

cohort_snapshots

cohort_versions

cohort_scores

cohort_forecasts

cohort_profitability

cohort_dimensions

cohort_segments

retention_events

ltv_snapshots

revenue_reconciliation

cohort_jobs

cohort_audit_logs

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- cohort heatmap UI

- retention curve visualization

- segment filters

- cohort comparison cards

- CSV export UI

- loading/error/empty states

- realtime subscriptions

- cohort trend visualization

CLAUDE MUST NOT IMPLEMENT:

- retention computation engine

- LTV forecasting engine

- churn prediction model

- probabilistic forecasting

- survival analysis engine

- warehouse reconciliation

- identity stitching logic

REFERENCE:

 [oai_citation:3‡northbeam.io](https://www.northbeam.io/blog/cohort-analysis-for-marketers-uncovering-trends-in-customer-behavior?utm_source=chatgpt.com)

---

## 🛡️ GOVERNANCE BOUNDARIES

COHORT GOVERNANCE:

- cohort snapshots immutable

- retention definitions centrally managed

- cohort recomputes auditable

- LTV methodology locked per org

SECURITY:

- org isolation mandatory

- no cross-org cohort aggregation

- export access audited

COMPLIANCE:

- GDPR-safe user aggregation

- no raw user exposure in cohort UI

- retention exports anonymized

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- predictive churn AI

- probabilistic LTV forecasting

- behavioral clustering AI

- automated lifecycle recommendations

- AI-generated cohort insights

- causal retention modeling

- reinforcement optimization

RULE:

- do NOT fake predictive retention accuracy

REFERENCE:

 [oai_citation:4‡arXiv](https://arxiv.org/abs/2504.16216?utm_source=chatgpt.com)

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- realtime cohort recompute on page load

- frontend retention calculations

- localStorage cohort caching

- fake cohort projections

- mock retention data in production

- auto-generated cohort explanations

- direct SQL aggregation from frontend

- raw user event exposure in UI

---

## 🔴 COHORT MATURITY SEMANTICS

COHORT MATURITY:

- immature cohorts flagged separately

- recent cohorts weighted differently

- incomplete revenue windows visible

RULES:

- D30 cannot be trusted before maturity window

- comparisons require aligned maturity periods

- dashboards must expose cohort freshness

SYSTEM MUST TRACK:

- cohort maturity

- ingestion lag

- retention drift

- revenue completeness

- acquisition quality shift

REFERENCE:

 [oai_citation:5‡sarasanalytics.com](https://www.sarasanalytics.com/blog/shopify-cohort-analysis?utm_source=chatgpt.com)

---

## 📊 RETENTION INTELLIGENCE SEMANTICS

IF:

- strong D1

AND

- weak D7

THEN:

- onboarding quality issue

---

IF:

- strong retention

AND

- weak monetization

THEN:

- pricing or activation issue

---

IF:

- cohorts improving sequentially

THEN:

- acquisition quality or PMF improving

---

IF:

- paid cohorts weaker than organic

THEN:

- scaling efficiency risk

REFERENCE:

 [oai_citation:6‡northbeam.io](https://www.northbeam.io/blog/beyond-acquisition-why-retention-should-be-every-marketers-priority?utm_source=chatgpt.com)

 
 PYTHON ANALYTICS EXECUTION LAYER

RUNTIME:

- Python analytics workers

- warehouse-side aggregation

- async cohort computation jobs

- vectorized retention processing

USED FOR:

- retention aggregation

- cohort recomputation

- LTV aggregation

- revenue reconciliation

- churn curve analysis

- cohort maturity scoring

- anomaly detection

- forecasting preparation

RULES:

- Python NEVER runs in frontend

- cohort recompute MUST be async

- analytics outputs MUST persist to DB

- frontend reads persisted snapshots only

- large cohorts processed in batches

NEVER:

- compute cohorts in browser

- aggregate retention client-side

- expose analytics workers publicly

---

## 🔄 COHORT MATURITY LIFECYCLE

FLOW:

acquisition

→ activation

→ retention observation

→ maturity scoring

→ revenue stabilization

→ profitability evaluation

→ forecasting eligibility

→ archival

RULES:

- immature cohorts MUST be flagged

- mature and immature cohorts MUST NOT be ranked equally

- cohort confidence increases over time

- retention certainty decays with incomplete ingestion

---

## 🧬 EVENT INTEGRITY SEMANTICS

ALL EVENTS MUST INCLUDE:

- org_id

- user_id

- session_id

- event_id

- timestamp

- ingestion_timestamp

- source

RULES:

- duplicate events MUST be detectable

- invalid timestamps MUST be quarantined

- malformed retention events MUST be rejected

- revenue events MUST remain immutable

RISKS:

- inflated retention

- distorted LTV

- phantom engagement

- broken cohort analysis

---

## ⚠️ IDENTITY FRAGMENTATION SEMANTICS

RETENTION MAY BE DISTORTED BY:

- anonymous users

- cookie expiration

- multi-device usage

- privacy restrictions

- consent rejection

- account switching

RULES:

- unresolved identity MUST remain observable

- stitched identities MUST be auditable

- retention certainty MUST degrade gracefully

NEVER:

- silently merge identities

- assume deterministic identity resolution

---

## 📊 REVENUE MATURITY SEMANTICS

RECENT COHORT REVENUE IS:

- incomplete

- delayed

- refund-sensitive

- subscription-dependent

RULES:

- recent cohorts MUST expose incomplete revenue state

- refunds MUST recompute profitability

- subscription renewals MUST remain traceable

- LTV truth changes over time

SYSTEM MUST TRACK:

- delayed revenue

- refund impact

- subscription churn

- payback maturity

- monetization lag

---

## 🧠 FORECASTING GOVERNANCE

FORECASTS ARE:

- probabilistic

- confidence-weighted

- non-deterministic

RULES:

- forecasted LTV != realized LTV

- confidence score mandatory

- low-confidence cohorts flagged

- forecasting outputs versioned

NEVER:

- present forecasts as truth

- auto-optimize spend from forecasts

---

## 🧠 COMPETITOR INTELLIGENCE EXPANSION

ADVANCED COMPETITOR CAPABILITIES:

Amplitude:

- behavioral cohorting

- lifecycle segmentation

- retention intelligence

Mixpanel:

- funnel-linked retention

- event-based lifecycle analysis

RevenueCat:

- subscription cohort analytics

- renewal-aware LTV tracking

Northbeam:

- blended acquisition quality

- cohort profitability intelligence

PostHog:

- warehouse-native analytics

- product-led cohort tracking

SYSTEM DIRECTION:

- deterministic analytics first

- explainable retention intelligence

- warehouse-native processing

- retention observability infrastructure

- profitability-aware cohorting

---

## 🌐 REQUIRED BACKEND CONTRACTS (ADDITIONAL)

POST /api/v1/dashboard/cohort/maturity

POST /api/v1/dashboard/cohort/reconciliation

GET /api/v1/dashboard/cohort/drift

GET /api/v1/dashboard/cohort/health

POST /api/v1/dashboard/cohort/anomaly-check

GET /api/v1/dashboard/cohort/confidence

RULES:

- cohort recomputes async only

- forecasting backend-owned

- retention confidence backend-generated

- reconciliation versioned

---

## 🗄️ REQUIRED TABLES (ADDITIONAL)

cohort_maturity

cohort_confidence

retention_drift_logs

event_integrity_logs

subscription_reconciliation

refund_adjustments

revenue_maturity_state

forecast_versions

cohort_forecast_confidence

warehouse_compute_jobs

---

## ⚡ EXECUTION BOUNDARIES (ADDITIONAL)

CLAUDE MAY IMPLEMENT:

- cohort heatmap rendering

- maturity indicators

- confidence labels

- stale cohort warnings

- retention drift visualization

- forecasting UI states

- reconciliation history rendering

CLAUDE MUST NOT IMPLEMENT:

- churn prediction engine

- probabilistic LTV forecasting

- survival analysis engine

- warehouse aggregation engine

- revenue reconciliation engine

- identity stitching infrastructure

- forecasting ML systems

---

## 🛡️ GOVERNANCE BOUNDARIES (ADDITIONAL)

ALL COHORT OUTPUTS MUST BE:

- explainable

- reproducible

- versioned

- auditable

RULES:

- cohort recomputes immutable

- retention definitions centrally managed

- forecasting changes traceable

- profitability logic versioned

COMPLIANCE:

- GDPR-safe aggregation mandatory

- anonymized retention exports required

- no raw behavioral exposure

---

## ⏸️ WHAT MUST REMAIN DEFERRED (ADDITIONAL)

DEFER:

- autonomous churn AI

- self-optimizing retention systems

- predictive lifecycle automation

- reinforcement learning optimization

- AI acquisition quality scoring

- probabilistic survival forecasting

- autonomous pricing optimization

RULE:

- do NOT fake predictive retention certainty

---

## 🚫 WHAT SHOULD NEVER EXIST (ADDITIONAL)

NEVER:

- frontend retention computation

- realtime full cohort recompute on page load

- localStorage retention cache

- fake LTV forecasts

- hidden retention manipulation

- silent cohort recalculation

- browser-side aggregation

- mock cohort forecasting in production

RULE:

- cohorts are analytical infrastructure

- NOT visualization-only dashboards

---
✅ DONE