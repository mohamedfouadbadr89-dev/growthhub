📄 dashboard-attribution.md

PAGE: dashboard/attribution/page.tsx

⸻

🧩 1. UI → Data Mapping

Attribution Summary:

* total_revenue
* attributed_revenue
* unattributed_revenue
* attribution_coverage (%)
* attribution_model

⸻

Attribution Breakdown (Channels):

* channel
* attributed_revenue
* attribution_share (%)

⸻

Customer Journey:

* user_id
* touchpoints (array)
  * channel
  * timestamp
  * campaign_id
* conversion_value

⸻

Top Conversion Paths:

* path (meta → google → direct)
* conversions
* revenue

⸻

Filters:

* date_range
* attribution_model (last_click / first_click / linear / data_driven)

⸻

🧱 2. Data Shape (Normalized)

type AttributionTouchpoint = {
  channel: string
  campaign_id: string
  timestamp: string
}

type CustomerJourney = {
  user_id: string
  touchpoints: AttributionTouchpoint[]
  conversion_value: number
}

type AttributionResponse = {
  summary: {
    total_revenue: number
    attributed_revenue: number
    unattributed_revenue: number
    coverage: number
    model: string
  }

  channels: {
    channel: string
    revenue: number
    share: number
  }[]

  journeys: CustomerJourney[]

  top_paths: {
    path: string[]
    conversions: number
    revenue: number
  }[]
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/attribution

Query:

* date_range
* model

Response:
AttributionResponse

⸻

POST /api/v1/dashboard/attribution/recalculate

Purpose:

* recompute attribution using selected model

⸻

🗄️ 4. DB Schema (Initial)

customer_journeys

* id
* org_id
* user_id
* conversion_value
* conversion_date
* created_at

⸻

touchpoints

* id
* org_id
* journey_id
* channel
* campaign_id
* timestamp

⸻

attribution_results

* id
* org_id
* model
* channel
* attributed_revenue
* share
* created_at

⸻

⚙️ 5. Execution Logic

Attribution Models:

Last Click:

* assign 100% to last touchpoint

⸻

First Click:

* assign 100% to first touchpoint

⸻

Linear:

* divide revenue equally across touchpoints

⸻

Data-Driven (future AI):

* weighted based on performance

⸻

Revenue Attribution:

attributed_revenue = Σ assigned revenue per touchpoint

⸻

Coverage:

coverage = attributed_revenue / total_revenue

⸻

Top Paths:

group journeys by path sequence

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

Optional (future):

* data-driven attribution

⸻

📊 8. Marketing Rules (CRITICAL)

IF unattributed_revenue > 20%  
→ tracking problem (fix attribution setup)

⸻

IF meta has high assist but low last-click  
→ increase top-funnel budget

⸻

IF google is closing conversions  
→ protect bottom-funnel budget

⸻

IF one channel dominates attribution  
→ dependency risk

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/attribution

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* do NOT compute attribution in frontend
* backend handles attribution logic
* MUST precompute attribution results

⸻

Security:

* always filter by org_id

⸻

Performance:

* cache attribution results
* recompute only when needed

⸻

Future:

feeds:

* decision engine
* budget allocation
* automation rules

⸻

✅ DONE