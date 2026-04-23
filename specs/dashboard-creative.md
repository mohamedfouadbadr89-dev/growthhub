📄 dashboard-creative.md

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

✅ DONE