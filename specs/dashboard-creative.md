
📄 dashboard-creative.md


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

PAGE: dashboard/creative/page.tsx

⸻

🧩 1. UI → Data Mapping

Creative Performance Cards:

* creative_id
* creative_name
* platform (meta / tiktok / google)
* thumbnail_url
* spend
* revenue
* roas
* ctr
* hook_rate
* thumb_stop_rate
* trend_percentage

⸻

Top Creatives Section:

* top_creatives[] (sorted by performance)

⸻

Creative Breakdown Table:

* creative_name
* platform
* impressions
* clicks
* ctr
* conversions
* revenue
* roas
* status

⸻

Filters:

* date_range
* platform
* campaign_id

⸻

🧱 2. Data Shape (Normalized)

type Creative = {
  id: string
  name: string
  platform: "meta" | "tiktok" | "google"
  thumbnail_url: string

  metrics: {
    spend: number
    revenue: number
    roas: number
    ctr: number
    hook_rate: number
    thumb_stop_rate: number
    trend: number
  }

  status: "winning" | "stable" | "fatigue" | "losing"
}

type CreativeResponse = {
  creatives: Creative[]

  top_creatives: Creative[]

  summary: {
    total_spend: number
    total_revenue: number
    avg_roas: number
  }
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/creatives

Query:

* date_range
* platform
* campaign_id

Response:
CreativeResponse

⸻

GET /api/v1/dashboard/creatives/:id

Purpose:

* detailed creative view

⸻

🗄️ 4. DB Schema (Initial)

creatives

* id
* org_id
* name
* platform
* thumbnail_url
* created_at

⸻

creative_metrics

* id
* org_id
* creative_id
* date
* impressions
* clicks
* spend
* revenue
* conversions
* created_at

⸻

creative_scores

* id
* org_id
* creative_id
* hook_rate
* thumb_stop_rate
* ctr
* roas
* trend
* score
* created_at

⸻

⚙️ 5. Execution Logic

Metrics Engine:

ctr = clicks / impressions  
roas = revenue / spend

⸻

Hook Rate:

* video watch first 3 seconds / impressions

⸻

Thumb Stop Rate:

* scroll stop events / impressions

⸻

Creative Score:

score = weighted formula:

0.4 * roas  
+ 0.2 * ctr  
+ 0.2 * hook_rate  
+ 0.2 * thumb_stop_rate

⸻

Status Logic:

if roas > 3 AND ctr high → winning  
if roas stable → stable  
if ctr dropping → fatigue  
if roas < 1.5 → losing

⸻

Trend:

trend = performance vs previous period

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

None

This page is analytics only

⸻

📊 8. Marketing Rules (Not AI)

Winning creatives:

* scale budget
* duplicate

⸻

Fatigue creatives:

* refresh hook
* test new angle

⸻

Losing creatives:

* pause immediately

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/creatives

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* do not calculate metrics in frontend
* backend handles scoring

⸻

Security:

* every query must include org_id
* no direct DB access from frontend

⸻

Performance:

* cache top creatives
* aggregate daily metrics

⸻

Future Integration:

feeds:

* creative generation AI
* decision engine

⸻

## 🧠 AI Layer

NONE

RULES:
- strictly no AI
- backend scoring only


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔴 REALTIME STRATEGY

SOURCE: SUPABASE_REALTIME

MODE: HIGH-FREQUENCY (CREATIVE CRITICAL)

---

1. BROADCAST

CHANNEL:

- creative_metrics:{org_id}

EVENTS:

creative_update:
- creative_id
- spend
- revenue
- roas
- ctr
- hook_rate
- thumb_stop_rate

status_update:
- creative_id
- status (winning / fatigue / losing)

top_creatives_update:
- top_creatives[]

---

RULES:

- top creatives MUST update instantly
- status MUST reflect latest performance
- scoring MUST NOT happen in frontend

---

2. POSTGRES_CHANGES

TABLES:

- creative_metrics (INSERT)
- creative_scores (UPDATE)

---

3. FALLBACK

- refetch GET /api/v1/dashboard/creatives every 30s

---

SECURITY:

- org_id scoped channels

## ⚠️ SCORING RULE

- ALL creative scoring MUST be backend-only
- frontend MUST NOT derive status
- status MUST be delivered from API

REASON:

- consistency with decision engine
- avoid mismatch across system


COMPETITOR INTELLIGENCE LAYER

PRIMARY REFERENCES:

- Motion

- Triple Whale

- Segwise

- Marpipe

- VidMob

- Pencil

- Foreplay

- MotionApp

- AppsFlyer Creative Analytics

BENCHMARK AREAS:

- creative fatigue detection

- hook analysis

- thumbstop analysis

- ROAS lifecycle tracking

- creative scoring systems

- creative clustering

- creative iteration velocity

- creative winner detection

- creative decay tracking

- cross-platform performance normalization

REFERENCE:

[Motion Creative Fatigue Framework](https://motionapp.com/blog/ad-fatigue?utm_source=chatgpt.com)

[Segwise Creative Analytics Guide](https://segwise.ai/blog/creative-analytics-track-measure-improve-ad-performance?utm_source=chatgpt.com)

---

## ⚡ RUNTIME TRUTH

CREATIVES ARE:

- volatile

- platform-sensitive

- audience-sensitive

- lifecycle-dependent

- attribution-sensitive

RULES:

- winning creatives decay over time

- CTR alone is insufficient

- ROAS fluctuates by attribution windows

- hook effectiveness changes by audience

- creatives may perform differently across placements

- frequency impacts fatigue state

- realtime metrics are eventually consistent

SYSTEM TRUTH PRIORITY:

1. verified ad platform metrics

2. attribution engine

3. conversion events

4. spend data

5. creative scoring

6. dashboard aggregates

NEVER:

- assume a winning creative remains winning

- calculate scoring in frontend

- classify fatigue solely from ROAS

- merge platform metrics blindly

- trust partial attribution windows

REFERENCE:

 [oai_citation:0‡Motion](https://motionapp.com/blog/ad-fatigue?utm_source=chatgpt.com)

---

## 🔄 COMPETITOR LIFECYCLE

CREATIVE FLOW:

creative upload

→ platform delivery

→ impression accumulation

→ hook evaluation

→ engagement analysis

→ conversion attribution

→ fatigue detection

→ score recalculation

→ status transition

→ scale / refresh / pause

LIFECYCLE STATES:

- testing

- learning

- scaling

- saturated

- fatigue

- retired

RULES:

- creatives require historical context

- lifecycle transitions are gradual

- fatigue is signal-based

- platform delivery impacts performance

REFERENCE:

 [oai_citation:1‡Darkroom Agency](https://www.darkroomagency.com/observatory/what-is-performance-creative-and-how-does-it-drive-results?utm_source=chatgpt.com)

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- attribution windows

- placement normalization

- frequency thresholds

- platform weighting

- audience overlap

- creative version lineage

- creative iteration hierarchy

- hook taxonomy

- visual taxonomy

- fatigue confidence scoring

- creative saturation rules

- benchmark normalization

- platform-specific CTR standards

- engagement quality weighting

- organic vs paid separation

- creative refresh lifecycle

- multi-asset creatives

- creative variants

- UGC vs branded classification

- holdout testing

- asset inheritance

REQUIRED BEFORE SCALE:

- canonical creative taxonomy

- creative lifecycle governance

- attribution standardization

- fatigue scoring model

REFERENCE:

 [oai_citation:2‡segwise.ai](https://segwise.ai/blog/creative-analytics-track-measure-improve-ad-performance?utm_source=chatgpt.com)

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- high CTR means profitability

- high ROAS means scalability

- fatigue equals creative failure

- hook rate equals purchase intent

- platform metrics are identical

- attribution windows are stable

- one creative works across all audiences

- spend growth means creative health

RISKS:

- false winner detection

- overscaling fatigued creatives

- incorrect budget allocation

- delayed fatigue response

- platform reporting mismatch

- creative duplication waste

- inaccurate executive reporting

REFERENCE:

 [oai_citation:3‡Hawky](https://hawky.ai/blog/identify-fix-creative-fatigue-ads?utm_source=chatgpt.com)

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/dashboard/creatives/overview

- GET /api/v1/dashboard/creatives/top

- GET /api/v1/dashboard/creatives/fatigue

- GET /api/v1/dashboard/creatives/trends

- GET /api/v1/dashboard/creatives/benchmarks

- GET /api/v1/dashboard/creatives/platforms

- GET /api/v1/dashboard/creatives/history

- GET /api/v1/dashboard/creatives/variants

- POST /api/v1/dashboard/creatives/refresh

- POST /api/v1/dashboard/creatives/export

MISSING FILTERS:

- adset_id

- ad_id

- placement

- audience_segment

- funnel_stage

- creative_type

- lifecycle_state

- fatigue_status

- format

- attribution_model

MISSING STATES:

- delayed_attribution

- learning_phase

- partial_sync

- stale_metrics

- fatigue_detected

- low_confidence

- recalculating

- awaiting_conversion_window

- incomplete_platform_data

---

## 🌐 REQUIRED BACKEND CONTRACTS

CREATIVE SCORING CONTRACT:

INPUT:

- impressions

- clicks

- spend

- conversions

- revenue

- hook_rate

- thumb_stop_rate

OUTPUT:

- score

- status

- trend

- fatigue_level

RULES:

- backend-only scoring

- deterministic formulas

- historical comparison mandatory

REFERENCE:

 [oai_citation:4‡segwise.ai](https://segwise.ai/blog/creative-analytics-track-measure-improve-ad-performance?utm_source=chatgpt.com)

---

FATIGUE DETECTION CONTRACT:

INPUT:

- rolling_ctr

- rolling_roas

- frequency

- hook_decay

- engagement_decay

OUTPUT:

- fatigue_status

- fatigue_score

- recommended_action

RULES:

- no frontend fatigue inference

- rolling windows required

- platform-aware thresholds

REFERENCE:

 [oai_citation:5‡Hawky](https://hawky.ai/blog/identify-fix-creative-fatigue-ads?utm_source=chatgpt.com)

---

TOP CREATIVE CONTRACT:

INPUT:

- scoring

- attribution

- trend

- spend_threshold

OUTPUT:

- ranked_creatives[]

RULES:

- minimum spend threshold required

- exclude insufficient data

- deduplicate variants

---

CREATIVE TREND CONTRACT:

INPUT:

- current_period

- previous_period

OUTPUT:

- trend_percentage

- lifecycle_state

RULES:

- compare equivalent windows

- exclude incomplete attribution periods

---

## 🗄️ REQUIRED TABLES

creative_variants

creative_lifecycle

creative_fatigue

creative_benchmarks

creative_platform_metrics

creative_status_history

creative_score_history

creative_taxonomy

creative_elements

creative_hooks

creative_audiences

creative_sync_logs

creative_refresh_jobs

creative_alerts

creative_versioning

creative_performance_windows

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- creative dashboards

- top creative cards

- fatigue tables

- creative galleries

- filters

- sorting

- search

- pagination

- export actions

- realtime subscriptions

- loading/error/empty states

- platform badges

- trend indicators

CLAUDE MUST NOT IMPLEMENT:

- creative scoring engine

- fatigue prediction engine

- attribution reconciliation

- automated creative optimization

- autonomous creative scaling

- platform bid optimization

- creative generation systems

- creative semantic analysis engine

REFERENCE:

 [oai_citation:6‡segwise.ai](https://segwise.ai/blog/creative-analytics-track-measure-improve-ad-performance?utm_source=chatgpt.com)

---

## 🛡️ GOVERNANCE BOUNDARIES

CREATIVE GOVERNANCE:

- score formulas versioned

- fatigue logic auditable

- creative lifecycle immutable historically

- attribution windows standardized

SECURITY:

- org-level isolation mandatory

- platform tokens server-side only

- creative assets permission-scoped

COMPLIANCE:

- creative audit logs immutable

- export activity logged

- asset ownership traceable

RULES:

- all platform syncs audited

- all recalculations logged

- all scoring deterministic

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- AI-generated creative scoring

- autonomous creative generation

- AI fatigue prediction

- AI hook analysis

- multimodal semantic creative analysis

- automated ad duplication

- autonomous scaling recommendations

- AI-generated creative briefs

RULE:

- analytics must remain deterministic initially

REFERENCE:

 [oai_citation:7‡segwise.ai](https://segwise.ai/blog/creative-analytics-track-measure-improve-ad-performance?utm_source=chatgpt.com)

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend ROAS calculations

- frontend fatigue scoring

- browser-side attribution logic

- automatic AI creative generation on GET

- uncached scoring recomputation

- fake creative metrics

- hidden score manipulation

- direct platform API calls from frontend

- automatic scaling execution

- auto-generated creative statuses in UI

---

## 🔴 CREATIVE FATIGUE SEMANTICS

FATIGUE SIGNALS:

- CTR decay

- rising CPC

- falling ROAS

- hook rate decline

- frequency saturation

- conversion decay

RULES:

- fatigue is gradual

- fatigue != failure

- creatives may recover with audience refresh

- hook decay may occur before ROAS decay

- frequency is lagging indicator

REFERENCE:

 [oai_citation:8‡Hawky](https://hawky.ai/blog/identify-fix-creative-fatigue-ads?utm_source=chatgpt.com)

---

## 📊 STRATEGIC CREATIVE INTELLIGENCE

IF:

- CTR rising

AND

- ROAS falling

THEN:

- low-intent engagement risk

---

IF:

- hook rate strong

BUT

- conversion weak

THEN:

- messaging mismatch risk

---

IF:

- ROAS strong

BUT

- frequency rapidly rising

THEN:

- fatigue risk emerging

---

IF:

- one creative dominates spend

THEN:

- creative concentration dependency risk

---

IF:

- creatives refreshing frequently

BUT

- performance stagnant

THEN:

- strategic creative framework failure

REFERENCE:

 [oai_citation:9‡Motion](https://motionapp.com/blog/ad-fatigue?utm_source=chatgpt.com)

 

✅ DONE