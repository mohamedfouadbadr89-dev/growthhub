📄 dashboard-overview.md

PAGE: dashboard/overview/page.tsx

⸻

🧩 1. UI → Data Mapping

AI Summary:

* performance_vs_benchmark
* top_campaign
* recommendation_action

⸻

KPI Cards:

* revenue
* profit
* roas
* spend
* mer
* change_percent per metric

⸻

Trend Chart:

* date
* revenue
* spend

⸻

Highlights:

* wins[]
* issues[]

⸻

Campaign Table:

* id
* name
* platform
* spend
* revenue
* roas
* status

⸻

🧱 2. Data Shape (Normalized)

type DashboardOverview = {
  summary: {
    performance_vs_benchmark: number
    top_driver: {
      campaign_id: string
      campaign_name: string
      platform: "meta" | "google" | "tiktok"
      roas: number
    }
    recommendation: {
      action: string
      amount: number
      from_channel: string
      to_channel: string
    }
    generated_at: string
  }

  kpis: {
    revenue: number
    profit: number
    spend: number
    roas: number
    mer: number
    change: {
      revenue: number
      profit: number
      roas: number
      spend: number
      mer: number
    }
  }

  trend: {
    date: string
    revenue: number
    spend: number
  }[]

  highlights: {
    wins: {
      id: string
      message: string
      impact_score: number
    }[]
    issues: {
      id: string
      message: string
      severity: "low" | "medium" | "high"
    }[]
  }

  campaigns: {
    id: string
    name: string
    platform: string
    spend: number
    revenue: number
    roas: number
    status: "active" | "paused" | "warning"
  }[]
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/overview

Query:

* date_range=7d | 30d | 90d

Response:
DashboardOverview

⸻

POST /api/v1/dashboard/summary/regenerate

Purpose:

* regenerate AI summary

Rules:

* costs credits for subscription users
* uses BYOK for LTD users

⸻

🗄️ 4. DB Schema (Initial)

daily_metrics

* id
* org_id
* date
* revenue
* spend
* profit
* roas
* mer
* created_at

⸻

ai_summaries

* id
* org_id
* type (dashboard_summary)
* content (jsonb)
* tokens_used
* cost
* created_at

⸻

highlights

* id
* org_id
* type (win | issue)
* message
* severity
* impact_score
* created_at

⸻

⚙️ 5. Execution Logic

Metrics Engine:

revenue = SUM(revenue)
spend = SUM(spend)
profit = revenue - spend
roas = revenue / spend
mer = revenue / total_spend

⸻

Top Driver:

select campaign with highest ROAS

⸻

Highlights (RULE-BASED, NOT AI):

if roas > 3 → win
if roas < 1.5 → issue
if profit < 0 → critical issue

⸻

AI Summary:

* fetch latest from ai_summaries
* if missing → generate via OpenRouter
* DO NOT auto-regenerate on page load

⸻

💳 6. Credits System

if plan_type === "ltd":

* use BYOK key from vault
* no credits deducted

else:

* regenerate summary → deduct credits
* normal load → no credits

⸻

🧠 7. AI Usage Classification

dashboard_summary → LOW cost
decision_engine → MEDIUM
creative_generation → HIGH

⸻

📊 8. Marketing Rules (NOT AI)

if roas > 3 → scale
if roas < 1.5 → stop
if spend high + low return → reallocate budget

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/overview

⸻

Requirements:

* loading state
* error handling
* empty state

⸻

Security:

* must include org_id filtering
* no direct DB calls from frontend

⸻

Performance:

* cache response (Redis optional)

⸻

Important:

* AI summary must be cached
* regenerate only on user action

⸻

✅ DONE