📄 dashboard-cohort.md

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

✅ DONE