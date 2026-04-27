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

✅ DONE