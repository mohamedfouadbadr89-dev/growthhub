campaigns-list.md

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

⸻

🗄️ 4. DB Schema

campaigns
campaign_metrics

⸻

⚙️ 5. Execution Logic

* aggregate campaign metrics
* sort by performance
* filter by status/platform

⸻

🧠 6. AI Layer

* highlight top campaigns
* flag underperformers

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