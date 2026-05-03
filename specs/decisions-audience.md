decisions-audience.md

🔒 SYSTEM ENFORCEMENT LAYER
AI_GATEWAY: REQUIRED AI_SOURCE: API_GATEWAY_ONLY

RULES:

❌ NO direct AI calls from frontend
❌ NO AI generation on GET requests
❌ NO "if missing → generate"
✅ AI only triggered via POST endpoints
✅ ALL AI responses must be cached
CACHE:

required for all AI outputs
key: org_id + entity_id + type
RATE LIMIT:

per user
per org
prevent duplicate execution within 60s
🧱 DATABASE SOURCE
DB_PROVIDER: SUPABASE_ONLY

RULES:

❌ NO local database
❌ NO prisma migrations
❌ NO mock data in production
✅ ALL tables must exist in Supabase
✅ ALL writes go through Supabase API / RPC
🔐 SECRETS MANAGEMENT
VAULT: SUPABASE_VAULT

USE:

OpenRouter keys
BYOK users
external APIs
RULES:

❌ NEVER expose keys to frontend
❌ NEVER log secrets
✅ fetch at runtime only
⚡ AI EXECUTION RULE
AI must NEVER run on page load
AI must be triggered ONLY by user action
AI must be cached after execution
PAGE: decisions/audience/page.tsx

⸻

🧩 1. UI → Data Mapping

Audience Cards:

audience_id
audience_name
platform (meta / google / tiktok)
audience_type (lookalike / broad / retargeting)
size_range
roas
cpa
trend_percentage
⸻

AI Recommendation:

recommendation_text
recommendation_type (expand / refine / shift / scale)
⸻

Audience Analysis:

overlap_percentage
unique_users_percentage
saturation_level
frequency
trend
⸻

Actions:

apply_change
push_to_campaign
dismiss
⸻

Filters:

platform
audience_type
⸻

Sidebar Metrics:

audience_health_score
health_status
industry_percentile
⸻

Saturation Alerts:

alert_id
message
severity
⸻

Quick Insights:

avg_roas
reach_growth
⸻

🧱 2. Data Shape (Normalized)

type Audience = { id: string name: string

platform: "meta" | "google" | "tiktok" type: "lookalike" | "broad" | "retargeting"

size_min: number size_max: number

metrics: { roas?: number cpa?: number trend: number }

analysis: { overlap: number unique_users: number saturation: number frequency: number }

recommendation: { type: "expand" | "refine" | "shift" | "scale" message: string }

status: "healthy" | "warning" | "critical" }

type AudienceResponse = { audiences: Audience[]

summary: { health_score: number health_status: string industry_percentile: number }

alerts: { id: string message: string severity: string }[]

insights: { avg_roas: number reach_growth: number } }

API Contracts
GET /api/v1/audiences/recommendations

Query:

platform
type
Response: AudienceResponse

⸻

POST /api/v1/audiences/:id/apply

Purpose:

apply audience optimization
⸻

POST /api/v1/audiences/:id/push

Purpose:

push audience to campaigns
⸻

POST /api/v1/audiences/:id/dismiss

Purpose:

dismiss recommendation
⸻

🗄️ 4. DB Schema

audiences

id
org_id
name
platform
type
size_min
size_max
created_at
⸻

audience_metrics

id
org_id
audience_id
roas
cpa
trend
date
⸻

audience_analysis

id
org_id
audience_id
overlap
unique_users
saturation
frequency
⸻

audience_recommendations

id
org_id
audience_id
type
message
created_at
⸻

⚙️ 5. Execution Logic

Audience Engine:

analyze based on:

ROAS performance
CPA trends
frequency growth
audience saturation
⸻

Saturation Logic:

IF frequency > threshold → saturation high

⸻

IF saturation > 80% → critical

⸻

Overlap:

calculate audience overlap across campaigns

⸻

Recommendation Engine:

IF high performance + rising frequency → expand

IF CPA rising → refine

IF saturation high → shift audience

IF strong performance → scale

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

audience_recommendation → MEDIUM

pattern_detection → LOW

⸻

📊 8. Marketing Rules (CRITICAL)

IF saturation high → expand audience OR refresh

⸻

IF CPA rising → refine targeting

⸻

IF ROAS high → scale budget

⸻

IF overlap high → diversify audiences

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/audiences/recommendations

⸻

Requirements:

loading state
error state
empty state
⸻

Important:

all recommendations from backend
frontend only renders
⸻

Security:

filter by org_id
⸻

Performance:

cache audience insights
precompute analysis
⸻

🔥 CLAUDE IMPLEMENTATION PROMPT

Implement all API integrations for this page.

Rules:

DO NOT modify UI
Replace static data with API
Use React Query
Add loading / error / empty states
Keep all calculations in backend
⸻

Future:

feeds:

decision engine
budget allocator
creative strategy
⸻

🧬 SCHEMA CONTROL
schema.sql is source of truth
no runtime creation
AUTH: CLERK

all requests must include org_id

NO auto AI

NO fallback AI

🔗 AUDIENCE VALUE LAYER
EVERY audience MUST include:

avg_ltv
ltv_cac_ratio
payback_days
SOURCE:

LTV engine
attribution engine
RULE:

audience decisions MUST NOT depend on ROAS only
MUST include long-term value
⚠️ ATTRIBUTION INTEGRATION
audience performance MUST use:

attributed revenue
NOT raw revenue
RULE:

ROAS = attributed_revenue / spend

🔴 REALTIME STRATEGY
SOURCE: SUPABASE_REALTIME

CHANNEL:

audience_updates:{org_id}

EVENTS:

audience_performance_update
frequency_update
saturation_update
RULES:

frequency MUST update in real-time
saturation MUST update incrementally
CPA spikes trigger alert instantly
FALLBACK:

refetch every 30–60s
🧠 AUDIENCE HEALTH SCORE
score =

0.3 * roas + 0.2 * trend + 0.2 * (1 - saturation) + 0.15 * (1 - overlap) + 0.15 * ltv_score

STATUS:

80 → healthy
50–80 → warning
<50 → critical

⚠️ EXECUTION SAFETY
audience endpoints MUST NOT execute directly
FLOW:

create action
send to execution engine
validate
execute
RULE:

NO direct execution from audience layer

✅ DONE