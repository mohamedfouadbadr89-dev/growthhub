campaigns-detail.md

PAGE: dashboard/campaigns/[id]/page.tsx

⸻

🧩 1. UI → Data Mapping

📊 KPI Summary

* total_spend
* total_revenue
* roas
* change_percent

⸻

⚡ Direct Execution Layer

* action_id
* action_type (increase_budget | shift_budget)
* trigger_condition
* risk_level (SAFE | STRATEGIC)
* status (ready | executed)

⸻

📈 Trend Analysis

* date
* spend
* revenue
* roas

⸻

🎯 Ad Sets Table

* adset_id
* name
* status
* budget
* spend
* roas
* cpa
* created_at

⸻

🎨 Creatives (Expanded Row)

* creative_id
* type (video | static)
* performance_roas

⸻

🧠 AI Insight

* alert_title
* description
* affected_entities
* metric_change

⸻

💡 Recommendations

* recommendation_id
* title
* description
* impact_level

⸻

⚠️ Risk Analysis

* risk_type
* probability
* description

⸻

🧱 2. Data Shape

type CampaignDetail = {
summary: {
spend: number
revenue: number
roas: number
change_percent: number
}

actions: {
id: string
type: string
trigger: string
risk: string
status: string
}[]

trend: {
date: string
spend: number
revenue: number
roas: number
}[]

adsets: {
id: string
name: string
status: string
budget: number
spend: number
roas: number
cpa: number
created_at: string
}[]

creatives: {
id: string
type: string
roas: number
}[]

ai_insight: {
title: string
description: string
metric_change: string
}

recommendations: {
id: string
title: string
description: string
impact: string
}[]

risk: {
type: string
probability: number
description: string
}
}


 3. API Contracts

GET /api/v1/campaigns/{id}

POST /api/v1/campaigns/action

POST /api/v1/campaigns/recommendations/apply

⸻

🗄️ 4. DB Schema

campaigns
adsets
creatives
campaign_metrics
recommendations
risks

⸻

⚙️ 5. Execution Logic

* detect high ROAS → suggest scale
* detect CPA spike → trigger alert
* map creatives to performance
* evaluate risk probability

⸻

🧠 6. AI Layer

* detect anomalies (CPA / ROAS drop)
* generate recommendations
* predict execution risk

⸻

💳 7. Credits System

* insight generation → LOW
* recommendations → MEDIUM

⸻

🧠 8. AI Usage Classification

* anomaly_detection → MEDIUM
* recommendations → HIGH

⸻

📊 9. Marketing Rules

* ROAS > 4 → scale
* CPA increase > 20% → alert
* low ROAS adset → optimize

⸻

🧾 10. Comments

* expandable rows for creatives
* inline budget editing
* action execution buttons