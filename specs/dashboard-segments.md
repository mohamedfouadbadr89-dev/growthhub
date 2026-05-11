SYSTEM ENFORCEMENT LAYER

AI_GATEWAY: REQUIRED
AI_SOURCE: API_GATEWAY_ONLY

RULES:

* ❌ NO direct AI calls from frontend
* ❌ NO AI generation on GET requests
* ❌ NO “if missing → generate”
* ✅ AI only triggered via POST endpoints
* ✅ ALL AI responses must be cached

CACHE:

* required for all AI outputs
* key: org_id + entity_id + type

RATE LIMIT:

* per user
* per org
* prevent duplicate execution within 60s

⸻

🧱 DATABASE SOURCE

DB_PROVIDER: SUPABASE_ONLY

RULES:

* ❌ NO local database
* ❌ NO prisma migrations
* ❌ NO mock data in production
* ✅ ALL tables must exist in Supabase
* ✅ ALL writes go through Supabase API / RPC

⸻

🔐 SECRETS MANAGEMENT

VAULT: SUPABASE_VAULT

USE:

* OpenRouter keys
* BYOK users
* external APIs

RULES:

* ❌ NEVER expose keys to frontend
* ❌ NEVER log secrets
* ✅ fetch at runtime only

⸻

⚡ AI EXECUTION RULE

* AI must NEVER run on page load
* AI must be triggered ONLY by user action
* AI must be cached after execution

⸻

📄 PAGE

dashboard/segment/page.tsx

⸻

🧩 1. UI → Data Mapping

Segment Overview:

* segment_name
* users_count
* revenue
* avg_order_value
* ltv
* conversion_rate

⸻

Top Segment:

* segment_name
* performance_score
* growth_rate

⸻

Segment Breakdown:

* segment_type (new / returning / vip / churn_risk)
* users_count
* revenue_contribution (%)

⸻

Behavior Metrics:

* avg_sessions_per_user
* avg_time_on_site
* pages_per_session

⸻

Filters:

* date_range
* segment_type

⸻

🧱 2. Data Shape

type Segment = {
  id: string
  name: string
  type: 'new' | 'returning' | 'vip' | 'churn_risk'
  users_count: number
  revenue: number
  aov: number
  ltv: number
  conversion_rate: number
}

type SegmentResponse = {
  segment: Segment[]

  top_segment: {
    segment_id: string
    performance_score: number
    growth_rate: number
  }[]

  behavior: {
    avg_sessions_per_user: number
    avg_time_on_site: number
    pages_per_session: number
  }
}

3. API Contracts

GET /api/v1/dashboard/segment

Query:

* date_range
* segment_type

Response:
SegmentResponse

⸻

GET /api/v1/dashboard/segment/:id

Response:
Segment

⸻

🗄️ 4. DB Schema

segment

* id
* org_id
* name
* type
* users_count
* revenue
* aov
* ltv
* conversion_rate
* created_at

⸻

segment_users

* id
* org_id
* segment_id
* user_id

⸻

segment_metrics

* id
* org_id
* segment_id
* sessions
* time_on_site
* pages_per_session
* date

⸻

⚙️ 5. Execution Logic

Segment Types:

New:

* first purchase within period

Returning:

* repeat buyers

VIP:

* high LTV + high AOV

Churn Risk:

* no activity in X days

⸻

LTV:

LTV = total_revenue / total_users

⸻

Conversion Rate:

conversion_rate = conversions / visitors

⸻

💳 6. Credits System

No credits used

⸻

🧠 AI Layer

NONE

RULES:

* segmentation is rule-based
* no AI inference

⸻

📊 8. Marketing Rules

If VIP growing → increase retention budget

If churn_risk high → trigger retention campaigns

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/segment

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* segmentation logic must be in backend
* frontend only renders

⸻

🔴 REALTIME

CHANNEL:

* segment_updates:{org_id}

EVENTS:

* segment_user_update
* segment_metrics_update
* top_segment_update

⸻

RULES:

* segment counts MUST update instantly
* top segment MUST reflect latest ranking

⸻

⚠️ RULES

* segmentation backend only
* no frontend logic
* LTV must be cohort-based

⸻


COMPETITOR INTELLIGENCE LAYER

PRIMARY REFERENCES:

- Northbeam

- Triple Whale

- Segment

- Lifetimely

- Peel Insights

- Hull

- Customer.io

- Klaviyo

- Segmetrics

BENCHMARK AREAS:

- behavioral segmentation

- RFM segmentation

- cohort-linked segments

- predictive churn

- lifecycle segmentation

- realtime audience sync

- segment profitability

- engagement scoring

- retention segmentation

- campaign-to-segment attribution

REFERENCE:

[Northbeam Segmentation Strategies](https://www.northbeam.io/blog/user-segmentation-strategies-in-marketing-audience-personalization?utm_source=chatgpt.com)

[Triple Whale Customer Segmentation](https://www.triplewhale.com/blog/customer-segmentation?utm_source=chatgpt.com)

---

## ⚡ RUNTIME TRUTH

SEGMENTS ARE:

- dynamic

- probabilistic

- event-driven

- attribution-sensitive

- identity-sensitive

RULES:

- users may belong to multiple segments

- segments drift over time

- realtime counts are eventually consistent

- behavioral events may arrive late

- churn risk is not deterministic

- VIP status changes historically

SYSTEM TRUTH PRIORITY:

1. identity resolution

2. verified events

3. purchase history

4. attribution mapping

5. engagement scoring

6. dashboard aggregates

NEVER:

- treat segments as static

- compute segmentation in frontend

- infer missing users silently

- overwrite historical segment states

- merge anonymous + identified users without identity rules

REFERENCE:

 [oai_citation:0‡northbeam.io](https://www.northbeam.io/blog/what-makes-northbeam-data-different?utm_source=chatgpt.com)

---

## 🔄 COMPETITOR LIFECYCLE SEMANTICS

SEGMENT FLOW:

event ingestion

→ identity resolution

→ behavioral aggregation

→ cohort assignment

→ RFM scoring

→ lifecycle classification

→ campaign eligibility

→ retention monitoring

→ profitability ranking

RULES:

- segment membership versioned

- segments evolve over lifecycle

- campaign targeting depends on freshness

- attribution impacts segment profitability

REFERENCE:

 [oai_citation:1‡triplewhale.com](https://www.triplewhale.com/blog/customer-segmentation?utm_source=chatgpt.com)

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- anonymous users

- identity stitching

- cross-device users

- RFM methodology

- segment overlap rules

- churn window definition

- inactivity thresholds

- engagement scoring

- VIP qualification logic

- segment decay rules

- segment confidence scoring

- historical membership snapshots

- multi-segment eligibility

- campaign sync logic

- audience freshness SLA

- deleted users handling

- bot traffic filtering

REQUIRED BEFORE SCALE:

- canonical segmentation methodology

- identity resolution rules

- lifecycle governance model

- segment hierarchy definition

REFERENCE:

 [oai_citation:2‡triplewhale.com](https://www.triplewhale.com/blog/customer-segmentation?utm_source=chatgpt.com)

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- all users fit one segment

- segment counts are exact realtime

- VIP users are permanently VIP

- churn risk equals churn certainty

- segments update instantly

- anonymous traffic resolved correctly

- engagement means profitability

RISKS:

- invalid campaign targeting

- duplicate audience sync

- incorrect retention decisions

- overcounted users

- false churn alerts

- inaccurate executive reporting

REFERENCE:

 [oai_citation:3‡northbeam.io](https://www.northbeam.io/blog/user-stickiness-the-metric-to-measure-customer-engagement-and-how-to-improve-it?utm_source=chatgpt.com)

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/dashboard/segment/overview

- GET /api/v1/dashboard/segment/rfm

- GET /api/v1/dashboard/segment/churn

- GET /api/v1/dashboard/segment/history

- GET /api/v1/dashboard/segment/overlap

- GET /api/v1/dashboard/segment/cohorts

- GET /api/v1/dashboard/segment/campaigns

- POST /api/v1/dashboard/segment/recompute

- POST /api/v1/dashboard/segment/export

- POST /api/v1/dashboard/segment/sync

MISSING FILTERS:

- acquisition_channel

- campaign_id

- geo

- device_type

- product_category

- cohort_id

- lifecycle_stage

- engagement_level

- attribution_model

MISSING STATES:

- stale_segments

- identity_pending

- partial_resolution

- segment_rebuilding

- low_confidence

- incomplete_events

- delayed_sync

- recalculating

- orphaned_users

---

## 🌐 REQUIRED BACKEND CONTRACTS

SEGMENTATION CONTRACT:

INPUT:

- events[]

- purchases[]

- sessions[]

- attribution_data[]

OUTPUT:

- segments[]

- segment_scores[]

- lifecycle_stage

RULES:

- backend-only execution

- deterministic rules

- identity-aware classification

---

RFM CONTRACT:

INPUT:

- recency

- frequency

- monetary_value

OUTPUT:

- rfm_score

- segment_classification

RULES:

- configurable thresholds

- historical versioning required

REFERENCE:

 [oai_citation:4‡triplewhale.com](https://www.triplewhale.com/blog/customer-segmentation?utm_source=chatgpt.com)

---

CHURN CONTRACT:

INPUT:

- inactivity_window

- engagement_drop

- purchase_history

OUTPUT:

- churn_risk_score

- risk_segment

RULES:

- score-based only

- no AI hallucinated prediction

---

CAMPAIGN SYNC CONTRACT:

INPUT:

- segment_id

- sync_destination

OUTPUT:

- sync_status

- synced_users

RULES:

- audit logging mandatory

- deduplication required

REFERENCE:

 [oai_citation:5‡Cometly](https://www.cometly.com/post/northbeam-vs-attribution-platforms?utm_source=chatgpt.com)

---

## 🗄️ REQUIRED TABLES

segment_definitions

segment_versions

segment_memberships

segment_membership_history

rfm_scores

lifecycle_states

user_identity_map

segment_overlap

segment_sync_logs

segment_recompute_jobs

segment_audit_logs

segment_events

segment_campaign_links

segment_health

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- segment dashboards

- segment cards

- donut charts

- analytics tables

- realtime subscriptions

- filters

- pagination

- export actions

- loading/error/empty states

- campaign launch buttons

CLAUDE MUST NOT IMPLEMENT:

- identity resolution engine

- behavioral scoring engine

- predictive segmentation engine

- autonomous audience generation

- probabilistic user stitching

- realtime recompute orchestration

- campaign automation engine

REFERENCE:

 [oai_citation:6‡Cometly](https://www.cometly.com/post/northbeam-vs-attribution-platforms?utm_source=chatgpt.com)

---

## 🛡️ GOVERNANCE BOUNDARIES

SEGMENT GOVERNANCE:

- segment definitions versioned

- lifecycle rules auditable

- historical memberships immutable

- campaign sync logged

SECURITY:

- org-level audience isolation

- RBAC for audience exports

- campaign launch permissions enforced

COMPLIANCE:

- deleted users removable

- consent-aware segmentation

- export logs immutable

- audience sync traceable

REFERENCE:

 [oai_citation:7‡triplewhale.com](https://www.triplewhale.com/blog/customer-segmentation?utm_source=chatgpt.com)

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- AI-generated segments

- autonomous lifecycle modeling

- predictive churn AI

- lookalike generation

- automated campaign orchestration

- AI-generated personalization

- autonomous retention strategies

RULE:

- segmentation must remain deterministic initially

REFERENCE:

 [oai_citation:8‡sarasanalytics.com](https://www.sarasanalytics.com/blog/customer-segmentation-analysis?utm_source=chatgpt.com)

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend segmentation logic

- browser-side RFM calculations

- auto-generated fake segments

- uncached audience recomputes

- silent user merges

- direct SQL audience queries from frontend

- automatic AI lifecycle mutation

- segment creation on GET requests

---

## 🔴 SEGMENTATION SEMANTICS

SEGMENT TYPES:

- lifecycle

- behavioral

- value-based

- retention-based

- engagement-based

- acquisition-based

RULES:

- segments may overlap

- lifecycle state separate from value state

- churn risk separate from inactivity

- VIP status cohort-aware

SYSTEM MUST TRACK:

- segment freshness

- confidence score

- audience overlap

- sync health

- lifecycle progression

REFERENCE:

 [oai_citation:9‡triplewhale.com](https://www.triplewhale.com/blog/customer-segmentation?utm_source=chatgpt.com)

---

## 📊 STRATEGIC SEGMENT INTELLIGENCE

IF:

- VIP users declining

AND

- new users increasing

THEN:

- retention quality deterioration

---

IF:

- returning users flat

AND

- CAC rising

THEN:

- acquisition dependency risk

---

IF:

- churn-risk users growing rapidly

THEN:

- lifecycle breakdown risk

---

IF:

- one segment dominates revenue

THEN:

- concentration dependency risk

---

IF:

- engagement rising

BUT

- revenue stagnant

THEN:

- monetization inefficiency risk

REFERENCE:

 [oai_citation:10‡northbeam.io](https://www.northbeam.io/blog/user-segmentation-strategies-in-marketing-audience-personalization?utm_source=chatgpt.com)

✅ DONE