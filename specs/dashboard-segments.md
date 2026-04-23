📄 dashboard-segments.md

PAGE: dashboard/segments/page.tsx

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

✅ DONE