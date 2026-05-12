
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


## ⚡ RUNTIME TRUTH

CAMPAIGNS ARE:

- platform-dependent

- attribution-sensitive

- budget-sensitive

- lifecycle-based

- latency-affected

- decision-linked

- execution-constrained

RULES:

- campaign performance changes continuously

- ROAS is delayed by attribution windows

- platform metrics may not match instantly

- spend spikes may temporarily distort performance

- status transitions require historical context

- realtime metrics are eventually consistent

- campaigns may be impacted by external delivery factors

SYSTEM TRUTH PRIORITY:

1. platform metrics

2. attribution engine

3. spend data

4. conversion data

5. decision engine

6. campaign scoring

7. UI aggregates

NEVER:

- classify campaign health from single snapshot

- calculate status in frontend

- assume platform metrics are synchronized

- trust partial attribution windows

- mutate campaign state from UI directly

---

## 🔄 COMPETITOR LIFECYCLE

CAMPAIGN FLOW:

campaign created

→ learning phase

→ delivery scaling

→ optimization phase

→ saturation detection

→ efficiency decline

→ warning state

→ critical state

→ pause / duplicate / refresh

RULES:

- campaigns require historical evaluation

- scaling introduces volatility

- platform learning affects ROAS stability

- campaign decay is gradual

- delivery instability may mimic poor performance

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- attribution window model

- platform normalization

- learning phase thresholds

- delivery instability semantics

- budget pacing rules

- bid strategy relationships

- audience overlap handling

- cross-platform campaign mapping

- campaign hierarchy

- objective normalization

- frequency thresholds

- spend anomaly detection

- delayed conversion reconciliation

- campaign fatigue semantics

- benchmark normalization

- risk scoring thresholds

REQUIRED BEFORE SCALE:

- canonical campaign lifecycle model

- attribution governance framework

- campaign health standardization

- delivery anomaly semantics

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- high ROAS means scalability

- low spend means low risk

- declining ROAS means campaign failure

- stable CTR means healthy delivery

- platform attribution windows are identical

- duplicated campaigns behave identically

- realtime metrics are complete instantly

- paused campaigns stop spend immediately

RISKS:

- false-positive campaign alerts

- premature pausing

- overscaling unstable campaigns

- duplicated budget waste

- attribution mismatch

- delayed anomaly detection

- invalid executive reporting

- incorrect optimization decisions

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/campaigns/overview

- GET /api/v1/campaigns/alerts

- GET /api/v1/campaigns/trends

- GET /api/v1/campaigns/benchmarks

- GET /api/v1/campaigns/history

- GET /api/v1/campaigns/platforms

- GET /api/v1/campaigns/:id/decisions

- GET /api/v1/campaigns/:id/anomalies

- POST /api/v1/campaigns/bulk/pause

- POST /api/v1/campaigns/bulk/duplicate

- POST /api/v1/campaigns/export

MISSING FILTERS:

- objective

- ad_account_id

- audience

- bid_strategy

- lifecycle_state

- risk_level

- alert_state

- attribution_model

- delivery_status

MISSING STATES:

- learning

- scaling

- warning

- critical

- paused

- stale_metrics

- attribution_pending

- delivery_limited

- anomaly_detected

- awaiting_approval

---

## 🌐 REQUIRED BACKEND CONTRACTS

CAMPAIGN LIST CONTRACT:

INPUT:

- org_id

- filters

- pagination

- sorting

OUTPUT:

- campaigns[]

- aggregated_metrics

- linked_decisions

- active_alerts

RULES:

- org isolation mandatory

- pagination required

- sorting backend-only

- deterministic aggregation required

---

CAMPAIGN STATUS CONTRACT:

INPUT:

- roas

- spend

- trend

- attribution_window

- delivery_health

OUTPUT:

- lifecycle_state

- risk_level

- warning_flags

RULES:

- backend-only status evaluation

- historical comparison mandatory

- deterministic thresholds required

---

BULK EXECUTION CONTRACT:

INPUT:

- campaign_ids[]

- action

- org_id

OUTPUT:

- execution_results[]

- blocked_campaigns[]

- partial_success

RULES:

- validate every campaign individually

- support partial execution

- high-risk campaigns require approval

- all executions logged

---

CAMPAIGN ALERT CONTRACT:

INPUT:

- spend

- roas

- delivery

- anomaly_signals

OUTPUT:

- alerts[]

- severity

- recommended_action

RULES:

- alerts backend-generated only

- deterministic thresholds

- cached outputs required

---

## 🗄️ REQUIRED TABLES

campaign_status_history

campaign_alerts

campaign_trends

campaign_benchmarks

campaign_delivery_health

campaign_risk_scores

campaign_execution_logs

campaign_bulk_actions

campaign_lifecycle

campaign_platform_metrics

campaign_attribution_windows

campaign_anomalies

campaign_decision_links

campaign_sync_logs

campaign_performance_windows

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- campaign tables

- filters

- sorting

- pagination

- realtime subscriptions

- status badges

- bulk action UI

- export actions

- loading/error/empty states

- risk indicators

- trend indicators

CLAUDE MUST NOT IMPLEMENT:

- campaign scoring engine

- attribution reconciliation

- delivery optimization engine

- autonomous campaign scaling

- autonomous budget allocation

- automatic pausing systems

- anomaly detection engine

- risk evaluation engine

---

## 🛡️ GOVERNANCE BOUNDARIES

CAMPAIGN GOVERNANCE:

- campaign status historically traceable

- risk evaluation auditable

- execution logs immutable

- attribution windows standardized

- bulk actions logged

SECURITY:

- org isolation mandatory

- backend-only execution authority

- campaign actions permission-scoped

- realtime channels org-scoped

COMPLIANCE:

- campaign exports logged

- bulk actions auditable

- execution approvals traceable

- historical metrics immutable

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- AI-driven campaign optimization

- autonomous scaling

- automatic pausing

- predictive budget allocation

- AI-generated campaign strategies

- autonomous duplication systems

- dynamic bid optimization

- AI anomaly correction

RULE:

- campaign management must remain deterministic initially

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend ROAS calculations

- frontend risk scoring

- browser-side attribution logic

- automatic AI execution on GET

- uncached campaign recomputation

- hidden campaign mutations

- direct platform API calls from frontend

- cross-org campaign visibility

- automatic scaling execution

- frontend-generated statuses

---