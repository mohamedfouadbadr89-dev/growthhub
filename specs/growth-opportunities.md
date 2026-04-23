growth-opportunities.md

PAGE: dashboard/growth-opportunities/page.tsx

⸻

🧩 1. UI → Data Mapping

Quick Wins:

* opportunity_id
* title
* description
* uplift_percentage
* confidence
* effort (low / medium / high)
* type (scale / pause / optimize)

⸻

High Impact Plays:

* strategy_id
* title
* description
* projected_growth
* confidence_score

⸻

Reasoning Engine:

* reason_type (saturation / predictive / efficiency)
* message

⸻

Experimental Ideas:

* idea_id
* title
* description
* category (new_channel / retention / optimization)
* effort
* confidence
* expected_impact

⸻

Actions:

* execute
* view_details

⸻

Sidebar → Strategic Mapping:

* impact
* effort

⸻

Portfolio Summary:

* total_upside
* revenue_estimate

⸻

Coverage:

* optimization_percentage
* pending_actions

⸻

Platform Mix:

* meta_percentage
* google_percentage
* tiktok_percentage

⸻

AI Tip:

* tip_text

⸻

🧱 2. Data Shape (Normalized)

type Opportunity = {
  id: string
  title: string
  description: string

  type: "quick_win" | "high_impact" | "experiment"

  metrics: {
    uplift?: number
    projected_growth?: number
    confidence: number
  }

  effort: "low" | "medium" | "high"

  category?: "scale" | "pause" | "optimize" | "expand"

  reasoning?: {
    type: string
    message: string
  }

  status: "pending" | "executed" | "dismissed"
}

type GrowthResponse = {
  quick_wins: Opportunity[]
  high_impact: Opportunity[]
  experiments: Opportunity[]

  summary: {
    total_upside: number
    revenue_estimate: number
    optimization_coverage: number
    pending_actions: number
  }

  platform_mix: {
    meta: number
    google: number
    tiktok: number
  }

  ai_tip: string
}


3. API Contracts

GET /api/v1/growth/opportunities

Query:

* platform
* impact
* effort

Response:
GrowthResponse

⸻

POST /api/v1/growth/:id/execute

Purpose:

* execute opportunity

⸻

POST /api/v1/growth/:id/dismiss

Purpose:

* dismiss opportunity

⸻

🗄️ 4. DB Schema

growth_opportunities

* id
* org_id
* title
* description
* type
* category
* effort
* created_at

⸻

growth_metrics

* id
* opportunity_id
* uplift
* projected_growth
* confidence

⸻

growth_reasoning

* id
* opportunity_id
* type
* message

⸻

growth_summary

* org_id
* total_upside
* revenue_estimate
* optimization_coverage
* pending_actions

⸻

platform_mix

* org_id
* meta_percentage
* google_percentage
* tiktok_percentage

⸻

⚙️ 5. Execution Logic

Opportunity Engine:

generate opportunities based on:

* performance gaps
* budget inefficiencies
* audience saturation
* creative performance

⸻

Quick Wins Logic:

low effort + high impact
→ immediate execution

⸻

High Impact Logic:

high impact + medium/high effort
→ strategic recommendation

⸻

Experiment Logic:

new ideas based on:

* trends
* new channels
* AI predictions

⸻

Scoring:

impact_score = projected_growth * confidence

⸻

Prioritization:

sort by:

1. impact_score
2. effort (low first)

⸻

💳 6. Credits System

execute opportunity → consume credits

⸻

🧠 7. AI Usage Classification

opportunity_generation → HIGH

predictive_modeling → HIGH

reasoning_engine → MEDIUM

⸻

📊 8. Marketing Rules (CRITICAL)

IF high uplift + low effort
→ execute immediately

⸻

IF high impact + high effort
→ plan strategy

⸻

IF repeated inefficiency
→ create automation

⸻

IF saturation detected
→ expand OR diversify

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/growth/opportunities

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* backend generates all opportunities
* frontend renders only

⸻

Performance:

* cache opportunities
* batch calculations

⸻

Security:

* filter by org_id

⸻

🔥 CLAUDE IMPLEMENTATION PROMPT


⸻

Future:

feeds:

* decision engine
* automation engine
* budget allocator

⸻

✅ DONE

