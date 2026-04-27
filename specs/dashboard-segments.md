📄 dashboard-segments.md


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

PAGE: dashboard/segment/page.tsx

⸻

🧩 1. UI → Data Mapping

Segments Overview:

* segment_name
* users_count
* revenue
* avg_order_value
* ltv
* conversion_rate

⸻

Top Segments:

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

🧱 2. Data Shape (Normalized)

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
  segments: Segment[]

  top_segments: {
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

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/segments

Query:

* date_range
* segment_type

Response:
SegmentResponse

⸻

GET /api/v1/dashboard/segments/:id

Response:
Segment

⸻

🗄️ 4. DB Schema (Initial)

segments

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

⸻

Returning:

* repeat buyers

⸻

VIP:

* high LTV + high AOV

⸻

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

🧠 7. AI Usage Classification

Future:

* AI segmentation (cluster users automatically)

⸻

📊 8. Marketing Rules (Not AI)

If:

* VIP segment growing

Then:

* increase retention budget

⸻

If:

* churn_risk high

Then:

* trigger retention campaigns

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/segments

⸻

Important:

* segmentation logic must be in backend
* frontend only renders

⸻

Security:

* filter by org_id

⸻

Performance:

* cache segment calculations

⸻

Future:

feeds:

* audience insights
* decision engine

⸻

## 🧠 AI Layer

NONE

RULES:
- segmentation is rule-based
- no AI inference


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI

## 🔴 REALTIME STRATEGY

SOURCE: SUPABASE_REALTIME

MODE: EVENT-DRIVEN (USER LEVEL)

---

1. BROADCAST

CHANNEL:

- segment_updates:{org_id}

EVENTS:

segment_user_update:
- user_id
- segment_type (new → vip / churn_risk)

segment_metrics_update:
- segment_id
- users_count
- revenue
- ltv
- conversion_rate

top_segments_update:
- segment_id
- performance_score
- growth_rate

---

RULES:

- segment counts MUST update instantly
- top segments MUST reflect latest ranking
- segment_type MUST always be latest classification

---

2. POSTGRES_CHANGES

TABLES:

- segments (UPDATE)
- segment_metrics (INSERT)

---

3. FALLBACK

- refetch GET /api/v1/dashboard/segments every 60s

---

SECURITY:

- org_id isolation

## ⚠️ SEGMENTATION RULE

- segmentation MUST be backend-only
- frontend MUST NOT assign users to segments
- all segment logic centralized in backend

REASON:

- consistency across system
- integration with decision engine

## ⚠️ LTV CALCULATION RULE

- LTV MUST be cohort-based (not global average)
- calculate per segment cohort

RECOMMENDED:

LTV = avg_revenue_per_user over lifetime window

---

OPTIONAL:

- 30-day LTV
- 60-day LTV
- predicted LTV (future)

✅ DONE