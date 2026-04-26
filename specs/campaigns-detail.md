campaigns-detail.md

🔒 SYSTEM ENFORCEMENT LAYER

AI_GATEWAY: REQUIRED
AI_SOURCE: API_GATEWAY_ONLY

RULES:

* NO direct AI calls from frontend
* NO AI generation on GET requests
* NO “if missing → generate”
* AI only triggered via POST endpoints
* ALL AI responses must be cached

CACHE:

* required for all AI outputs
* key: org_id + entity_id + type

RATE LIMIT:

* per user
* per org
* prevent duplicate execution within 60s

⸻

🧱 DATABASE SOURCE

DB_PROVIDER: SUPABASE_ONLY

RULES:

* NO local database
* NO prisma migrations
* NO mock data in production
* ALL tables must exist in Supabase
* ALL writes go through Supabase API / RPC

⸻

🔐 SECRETS MANAGEMENT

VAULT: SUPABASE_VAULT

USE:

* OpenRouter keys
* BYOK users
* external APIs

RULES:

* NEVER expose keys to frontend
* NEVER log secrets
* fetch at runtime only

⸻

⚡ AI EXECUTION RULE

* AI must NEVER run on page load
* AI must be triggered ONLY by user action
* AI must be cached after execution

⸻

PAGE: campaigns/[id]/page.tsx

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
* risk_level (SAFE | STRATEGIC | HIGH)
* status (ready | executed | blocked | pending_approval)

RULES:

* NO auto execution
* ALL actions require user confirmation
* HIGH risk actions require additional approval
* execution must pass backend validation

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

RULES:

* MUST be fetched from cache/DB
* MUST NOT trigger AI automatically

⸻

💡 Recommendations

* recommendation_id
* title
* description
* impact_level

RULES:

* generated via backend only
* applied only via POST endpoint
* NO auto-apply

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
risk: “low” | “medium” | “high”
status: “ready” | “executed” | “blocked” | “pending_approval”
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

⸻

🌐 3. API Contracts

GET /api/v1/campaigns/{id}
→ returns FULL campaign data (NO AI execution)

⸻

POST /api/v1/campaigns/{id}/insights/regenerate

RULES:

* triggers AI insight generation
* must go through AI Gateway
* cached per campaign_id
* rate-limited

⸻

POST /api/v1/campaigns/action

RULES:

* requires user confirmation
* must pass validation layer
* must include risk check
* MUST NOT execute if risk = HIGH (unless override)

⸻

POST /api/v1/campaigns/recommendations/apply

RULES:

* manual trigger only
* must pass validation
* no auto-apply

⸻

🗄️ 4. DB Schema

campaigns
adsets
creatives
campaign_metrics
recommendations
risks
ai_insights (cached)

⸻

⚙️ 5. Execution Logic

* detect signals (ROAS, CPA) → backend only
* generate suggestions → NOT execution
* execution requires:

1. validation layer:
    * risk evaluation
    * constraint checks
    * budget safety
2. approval layer:
    * required for medium/high risk
3. execution decision:
    * approved → execute
    * blocked → log only
    * pending → wait

⸻

🧠 6. AI Layer

AI Usage

* anomaly detection (backend only)
* recommendation generation (POST only)
* risk prediction (precomputed / cached)

RULES:

* NO AI in GET
* NO auto-trigger
* ALL AI must be cached

⸻

🧠 AI Cost Protection

* insights generated ONCE per campaign
* reused across sessions
* regenerated manually only

⸻

💳 7. Credits System

* insight generation → LOW
* recommendations → MEDIUM
* viewing data → FREE

⸻

🧠 8. AI Usage Classification

* anomaly_detection → MEDIUM
* recommendations → HIGH
* execution → NONE

⸻

📊 9. Marketing Rules

* ROAS > 4 → suggest scale
* CPA increase > 20% → alert
* low ROAS adset → suggest optimization

NOTE:

* rules generate suggestions ONLY
* NEVER trigger execution

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:
GET /api/v1/campaigns/{id}

⸻

Execution UI

* must include confirmation modal
* must display risk level before execution
* must allow cancel

⸻

Security

* org_id filtering
* no cross-org data access

⸻

Performance

* cache campaign metrics
* lazy load creatives

⸻

Important

* NO auto execution
* NO AI on page load
* ALL execution must pass validation + approval