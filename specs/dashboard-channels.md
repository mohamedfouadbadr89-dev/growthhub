📄 dashboard-channels.md

PAGE: dashboard/channels/page.tsx

⸻

🧩 1. UI → Data Mapping

Channel Cards:

* channel_id
* channel_name (meta / google / tiktok / etc)
* channel_type (social / search / growth)
* spend
* revenue
* roas
* trend_percentage
* efficiency_score

⸻

Channel Comparison Chart:

* date
* channel
* spend
* revenue
* roas

⸻

Channel Breakdown Table:

* channel_name
* spend
* revenue
* roas
* efficiency
* status

⸻

Filters:

* date_range
* channel
* campaign_id

⸻

🧱 2. Data Shape (Normalized)

type Channel = {
  id: string
  name: "meta" | "google" | "tiktok" | "youtube" | "linkedin"
  type: "social" | "search" | "growth"

  metrics: {
    spend: number
    revenue: number
    roas: number
    trend: number
    efficiency: number
  }

  status: "scaling" | "stable" | "declining" | "critical"
}

type ChannelResponse = {
  channels: Channel[]

  comparison: {
    date: string
    channel: string
    spend: number
    revenue: number
    roas: number
  }[]

  summary: {
    total_spend: number
    total_revenue: number
    avg_roas: number
  }
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/channels

Query:

* date_range
* channel
* campaign_id

Response:
ChannelResponse

⸻

GET /api/v1/dashboard/channels/:id

Purpose:

* detailed channel performance

⸻

🗄️ 4. DB Schema (Initial)

channels

* id
* org_id
* name
* type
* created_at

⸻

channel_metrics

* id
* org_id
* channel_id
* date
* spend
* revenue
* impressions
* clicks
* conversions
* created_at

⸻

channel_scores

* id
* org_id
* channel_id
* roas
* trend
* efficiency
* score
* created_at

⸻

⚙️ 5. Execution Logic

Metrics Engine:

roas = revenue / spend

⸻

Efficiency Score:

efficiency = weighted formula:

0.5 * roas  
+ 0.3 * ctr  
+ 0.2 * conversion_rate

⸻

Trend:

trend = current_period vs previous_period

⸻

Status Logic:

if roas > 3 AND trend positive → scaling  
if roas stable → stable  
if roas dropping → declining  
if roas < 1.5 → critical

⸻

Chart Logic:

aggregate metrics by date + channel

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

None

This page is analytics only

⸻

📊 8. Marketing Rules (Not AI)

Scaling channels:

* increase budget
* expand audience

⸻

Declining channels:

* optimize creatives
* adjust targeting

⸻

Critical channels:

* reduce spend
* investigate funnel

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/channels

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* do not calculate metrics in frontend
* backend handles aggregation

⸻

Security:

* every query must include org_id
* no direct DB access from frontend

⸻

Performance:

* cache channel metrics
* pre-aggregate daily

⸻

Future Integration:

feeds:

* decision engine
* budget allocator

⸻

✅ DONE