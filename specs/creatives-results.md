creatives-results.md

## 🔒 SYSTEM ENFORCEMENT LAYER

AI_GATEWAY: REQUIRED
AI_SOURCE: API_GATEWAY_ONLY

RULES:
- ❌ NO direct AI calls from frontend
- ❌ NO AI generation on GET requests
- ❌ NO "if missing → generate"
- ✅ AI only triggered via POST endpoints
- ✅ ALL AI responses must be cached

CACHE:
- required for all AI outputs
- key: org_id + entity_id + type

RATE LIMIT:
- per user
- per org
- prevent duplicate execution within 60s

---

## 🧱 DATABASE SOURCE

DB_PROVIDER: SUPABASE_ONLY

RULES:
- ❌ NO local database
- ❌ NO prisma migrations
- ❌ NO mock data in production
- ✅ ALL tables must exist in Supabase
- ✅ ALL writes go through Supabase API / RPC

---

## 🔐 SECRETS MANAGEMENT

VAULT: SUPABASE_VAULT

USE:
- OpenRouter keys
- BYOK users
- external APIs

RULES:
- ❌ NEVER expose keys to frontend
- ❌ NEVER log secrets
- ✅ fetch at runtime only

---

## ⚡ AI EXECUTION RULE

- AI must NEVER run on page load
- AI must be triggered ONLY by user action
- AI must be cached after execution

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
POST /api/v1/creatives/generate

Purpose:

* generate new variants

RULES:

- user-triggered only
- cached per org_id + concept
- rate-limited

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

creative_versions

* id
* creative_id
* snapshot (jsonb)
* created_at

## ⚠️ VERSION CONTROL

- every generated variant is stored as version
- top performer always linked to latest stable version
- rollback supported
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

## ⚡ PERFORMANCE

- cache creative results
- invalidate on new generation
- reuse predicted metrics
⸻
## ⚡ REAL-TIME CREATIVE PERFORMANCE

SOURCE: SUPABASE REALTIME

CHANNEL:

- creatives:{org_id}

EVENTS:

- creative_updated
- metrics_updated
- new_variant_generated

RULE:

- UI must update instantly
⸻

🧠 6. AI Layer

* scoring engine
* hook analysis
* visual analysis
* audience matching
* performance prediction

⸻
## 🧠 AI GUARDRAILS

AI MUST NOT:

- generate misleading ads
- violate platform policies
- exceed character limits

OUTPUT MUST INCLUDE:

- confidence_score
- predicted_metrics
- reasoning

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


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔗 DECISION INTEGRATION

- creatives may have linked decisions:
  - fatigue detected
  - low conversion
  - scaling opportunity

SOURCE:

- decision engine

## 🔗 POST-LAUNCH FEEDBACK

- track real performance after push

FIELDS:

- actual_ctr
- actual_roas

---

RULE:

- compare predicted vs actual
- update scoring model