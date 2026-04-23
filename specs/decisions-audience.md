decisions-audience.md

PAGE: decisions/audience/page.tsx

⸻

🧩 1. UI → Data Mapping

Audience Cards:

* audience_id
* audience_name
* platform (meta / google / tiktok)
* audience_type (lookalike / broad / retargeting)
* size_range
* roas
* cpa
* trend_percentage

⸻

AI Recommendation:

* recommendation_text
* recommendation_type (expand / refine / shift / scale)

⸻

Audience Analysis:

* overlap_percentage
* unique_users_percentage
* saturation_level
* frequency
* trend

⸻

Actions:

* apply_change
* push_to_campaign
* dismiss

⸻

Filters:

* platform
* audience_type

⸻

Sidebar Metrics:

* audience_health_score
* health_status
* industry_percentile

⸻

Saturation Alerts:

* alert_id
* message
* severity

⸻

Quick Insights:

* avg_roas
* reach_growth

⸻

🧱 2. Data Shape (Normalized)


type Audience = {
  id: string
  name: string

  platform: "meta" | "google" | "tiktok"
  type: "lookalike" | "broad" | "retargeting"

  size_min: number
  size_max: number

  metrics: {
    roas?: number
    cpa?: number
    trend: number
  }

  analysis: {
    overlap: number
    unique_users: number
    saturation: number
    frequency: number
  }

  recommendation: {
    type: "expand" | "refine" | "shift" | "scale"
    message: string
  }

  status: "healthy" | "warning" | "critical"
}

type AudienceResponse = {
  audiences: Audience[]

  summary: {
    health_score: number
    health_status: string
    industry_percentile: number
  }

  alerts: {
    id: string
    message: string
    severity: string
  }[]

  insights: {
    avg_roas: number
    reach_growth: number
  }
}


 3. API Contracts

GET /api/v1/audiences/recommendations

Query:

* platform
* type

Response:
AudienceResponse

⸻

POST /api/v1/audiences/:id/apply

Purpose:

* apply audience optimization

⸻

POST /api/v1/audiences/:id/push

Purpose:

* push audience to campaigns

⸻

POST /api/v1/audiences/:id/dismiss

Purpose:

* dismiss recommendation

⸻

🗄️ 4. DB Schema

audiences

* id
* org_id
* name
* platform
* type
* size_min
* size_max
* created_at

⸻

audience_metrics

* id
* org_id
* audience_id
* roas
* cpa
* trend
* date

⸻

audience_analysis

* id
* org_id
* audience_id
* overlap
* unique_users
* saturation
* frequency

⸻

audience_recommendations

* id
* org_id
* audience_id
* type
* message
* created_at

⸻

⚙️ 5. Execution Logic

Audience Engine:

analyze based on:

* ROAS performance
* CPA trends
* frequency growth
* audience saturation

⸻

Saturation Logic:

IF frequency > threshold
→ saturation high

⸻

IF saturation > 80%
→ critical

⸻

Overlap:

calculate audience overlap across campaigns

⸻

Recommendation Engine:

IF high performance + rising frequency
→ expand

IF CPA rising
→ refine

IF saturation high
→ shift audience

IF strong performance
→ scale

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

audience_recommendation → MEDIUM

pattern_detection → LOW

⸻

📊 8. Marketing Rules (CRITICAL)

IF saturation high
→ expand audience OR refresh

⸻

IF CPA rising
→ refine targeting

⸻

IF ROAS high
→ scale budget

⸻

IF overlap high
→ diversify audiences

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/audiences/recommendations

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* all recommendations from backend
* frontend only renders

⸻

Security:

* filter by org_id

⸻

Performance:

* cache audience insights
* precompute analysis

⸻

🔥 CLAUDE IMPLEMENTATION PROMPT

Implement all API integrations for this page.

Rules:
- DO NOT modify UI
- Replace static data with API
- Use React Query
- Add loading / error / empty states
- Keep all calculations in backend


⸻

Future:

feeds:

* decision engine
* budget allocator
* creative strategy

⸻

✅ DONE

