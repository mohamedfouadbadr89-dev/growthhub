campaigns-execution-focus.md

⸻

🧩 1. UI → Data Mapping

📊 KPI Cards

* spend
* revenue
* roas

⸻

⚡ Execution First Actions

* action_id
* type
* trigger
* button_execute

⸻

📈 Trend Toggle

* spend
* revenue
* roas

⸻

🎯 Ad Sets + Inline Edit

* budget_editable
* cpa_editable

⸻

🧠 Insight Panel

* alert
* description

⸻

⚠️ Risk Engine

* risk_score
* probability
* visualization

⸻

🧱 2. Data Shape

type ExecutionView = {
kpis: {
spend: number
revenue: number
roas: number
}

actions: {
id: string
type: string
trigger: string
}[]

trend: {
date: string
spend: number
revenue: number
roas: number
}[]

adsets: {
id: string
budget: number
cpa: number
editable: boolean
}[]

insight: {
message: string
}

risk: {
score: number
probability: number
}
}

3. API Contracts

GET /api/v1/campaigns/{id}/execution

POST /api/v1/actions/execute

⸻

🗄️ 4. DB Schema

same as campaign detail + execution logs

⸻

⚙️ 5. Execution Logic

* prioritize actions over analytics
* allow inline editing
* real-time updates

⸻

🧠 6. AI Layer

* action prioritization
* risk prediction

⸻

💳 7. Credits System

* execution suggestions → MEDIUM

⸻

🧠 8. AI Usage Classification

* action_engine → HIGH

⸻

📊 9. Marketing Rules

* fast scaling if ROAS high
* block risky actions

⸻

🧾 10. Comments

* execution-first UX
* minimal friction
* real-time feedback