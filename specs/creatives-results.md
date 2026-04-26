creatives-results.md

PAGE: creatives/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

Top Performer (Hero)

* creative_id
* score
* concept_title
* description
* tags[]
    * platform
    * format
* preview_url

⸻

Predicted Impact

* roas_uplift
* volume_growth
* confidence_score

⸻

Generated Variants

* creative_id
* thumbnail
* score
* platform
* format
* headline
* metrics
    * ctr
    * engagement
    * conversion

⸻

Actions

* edit_creative
* push_to_campaign
* share_creative

⸻

Right Panel (AI Insight)

* insight_text
* recommendation
* performance_matrix
    * visual_retention
    * emotional_resonance
    * cta_clarity
* audience_fit

⸻

⸻

🧱 2. Data Shape

type Creative = {
id: string
score: number

concept: {
title: string
description: string
}

tags: {
platform: string
format: string
}

preview_url: string

metrics: {
ctr: number
engagement: number
conversion: "low" | "medium" | "high"
}
}

type CreativeResults = {
top_performer: Creative
predicted_impact: {
roas_uplift: number
volume_growth: number
confidence: number
}

variants: Creative[]
}

⸻

🌐 3. API Contracts

GET /api/v1/creatives/results

POST /api/v1/creatives/:id/push

POST /api/v1/creatives/:id/share

⸻

⸻

🗄️ 4. DB Schema

creatives

* id
* org_id
* concept (jsonb)
* tags (jsonb)
* preview_url
* score
* created_at

⸻

creative_metrics

* id
* creative_id
* ctr
* engagement
* conversion
* created_at

⸻

⸻

⚙️ 5. Execution Logic

1. fetch generated creatives
2. rank by score
3. identify top performer
4. calculate predicted impact
5. return variants

⸻

⸻

🧠 6. AI Layer

* scoring engine
* hook analysis
* visual analysis
* audience matching
* performance prediction

⸻

⸻

💳 7. Credits System

* generate creatives → HIGH
* view results → FREE

⸻

⸻

🧠 8. AI Usage Classification

* creative_generation → HIGH
* scoring → MEDIUM

⸻

⸻

📊 9. Marketing Rules

* high CTR → prioritize
* high engagement → boost
* low conversion → optimize CTA

⸻

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/creatives/results

Requirements:

* grid rendering
* sorting (score / CTR / engagement)
* fast filtering