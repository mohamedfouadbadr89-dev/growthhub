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


🧠 AUDIENCE INTELLIGENCE POSITIONING

audience page is:

* audience intelligence orchestration layer
* saturation & overlap monitoring cockpit
* acquisition efficiency optimization surface
* audience lifecycle management system

audience page is NOT:

* ad creation engine
* campaign manager
* direct execution layer
* autonomous targeting engine

⸻

🧬 SYSTEM POSITIONING

attribution engine
→ audience intelligence engine
→ saturation analysis layer
→ recommendation engine
→ execution governance layer

⸻

🔒 AUDIENCE GOVERNANCE ENGINE

RULES:

* frontend is visualization-only
* audience recommendations MUST originate from backend
* audience calculations MUST remain backend authoritative
* audience mutations REQUIRE execution engine validation
* audience recommendations MUST be explainable

⸻

🧠 AUDIENCE INTELLIGENCE ENGINE

audience engine MUST analyze:

* attributed ROAS
* LTV quality
* CAC efficiency
* overlap density
* audience fatigue
* saturation acceleration
* payback efficiency
* frequency velocity
* creative dependency

RULES:

* ROAS-only decisions are prohibited
* long-term value MUST influence recommendations
* attribution quality affects confidence score

⸻

📊 AUDIENCE HEALTH ENGINE

health score MUST combine:

* attributed ROAS
* trend momentum
* saturation risk
* overlap pressure
* LTV quality
* CAC efficiency
* payback speed
* creative fatigue correlation

RULES:

* health score MUST remain backend-computed
* frontend MUST NOT calculate scoring logic
* unhealthy audiences MUST degrade recommendation confidence

⸻

⚠️ SATURATION ORCHESTRATION ENGINE

saturation engine MUST support:

* frequency escalation detection
* audience fatigue scoring
* delivery compression analysis
* CPM inflation tracking
* impression concentration detection
* creative exhaustion correlation

RULES:

* saturation MUST update incrementally
* saturation spikes MUST trigger realtime events
* critical saturation MUST escalate immediately

⸻

📡 OVERLAP ANALYSIS ENGINE

overlap engine MUST support:

* cross-campaign overlap
* platform overlap
* cross-channel audience reuse
* overlap density clustering
* cannibalization detection

RULES:

* overlap calculations MUST be precomputed
* overlap spikes MUST reduce scaling recommendations
* high overlap MUST trigger diversification suggestions

⸻

🧠 RECOMMENDATION ENGINE

recommendation engine MUST support:

* expand
* refine
* shift
* scale
* diversify
* suppress
* refresh

RULES:

* recommendations MUST include reasoning
* recommendations MUST expose confidence
* recommendations MUST expose expected impact
* recommendations MUST expose execution risk

⸻

📊 RECOMMENDATION EXPLAINABILITY

every recommendation MUST expose:

* why generated
* affected metrics
* estimated performance impact
* saturation dependency
* overlap dependency
* risk level
* rollback safety

RULES:

* frontend MUST display backend reasoning only
* no client-generated recommendations

⸻

🔴 EXECUTION SAFETY LAYER

before apply/push:

system MUST validate:

* audience eligibility
* platform health
* active execution conflicts
* budget governance rules
* org permissions
* rollout compatibility

RULES:

* execution validation REQUIRED
* failed validation MUST block action
* no optimistic execution state

⸻

🛡️ PUSH TO CAMPAIGN GOVERNANCE

push actions MUST route through:

execution engine
→ validation layer
→ rollout orchestration
→ audit logging

RULES:

* no direct audience mutation
* all pushes MUST remain reversible
* rollout state MUST sync from backend

⸻

📈 AUDIENCE VALUE INTELLIGENCE

EVERY audience MUST expose:

* avg_ltv
* ltv_cac_ratio
* payback_days
* retention_quality
* repeat_purchase_score
* attributed_revenue

RULES:

* scaling MUST prioritize LTV efficiency
* high ROAS + weak LTV = unstable audience
* low CAC + weak retention = caution state

⸻

🔗 ATTRIBUTION INTELLIGENCE

audience performance MUST use:

* attributed revenue
* modeled attribution
* blended attribution confidence
* post-purchase value quality

RULES:

* raw platform revenue is prohibited
* attribution degradation MUST reduce confidence
* unstable attribution MUST trigger warnings

⸻

🧬 REALTIME ORCHESTRATION

SOURCE:

SUPABASE_REALTIME

CHANNELS:

* audience_updates:{org_id}
* saturation_updates:{org_id}
* overlap_updates:{org_id}
* recommendation_updates:{org_id}

EVENTS:

audience_performance_update
saturation_spike
frequency_update
overlap_detected
recommendation_created
recommendation_dismissed
audience_health_changed

RULES:

* realtime updates MUST patch state incrementally
* duplicate events MUST collapse safely
* critical updates MUST prepend instantly

⸻

⚠️ FALLBACK STRATEGY

fallback polling:

GET /api/v1/audiences/recommendations every 30–60s

RULES:

* polling ONLY during realtime disconnect
* stale audience state MUST reconcile safely

⸻

📊 AUDIENCE CARD ENRICHMENT

audience cards SHOULD expose:

* recommendation confidence
* estimated incremental revenue
* saturation velocity
* overlap density
* audience freshness
* creative dependency
* LTV quality indicator
* execution safety indicator

⸻

📉 SATURATION RISK ENGINE

risk engine MUST expose:

* rising frequency clusters
* CPM inflation risks
* creative exhaustion risks
* overlap collision risks
* attribution instability risks

RULES:

* risks MUST be ranked dynamically
* critical risks MUST affect recommendation ordering

⸻

📚 LEARNING & MEMORY ENGINE

system MUST preserve:

* historical audience behavior
* saturation history
* recommendation effectiveness
* false-positive recommendations
* scaling outcomes
* refresh effectiveness

USED FOR:

* future recommendation weighting
* confidence calibration
* saturation forecasting
* overlap prediction

⸻

🧠 COMPETITOR REFERENCE CONTEXT

REFERENCE SYSTEMS:

[Madgicx AI Marketer](https://madgicx.com/ai-marketer?utm_source=chatgpt.com)

[Madgicx Automation Engine](https://academy.madgicx.com/lessons/introduction-madgicx-automations?utm_source=chatgpt.com)

[Madgicx Platform Overview](https://madgicx.com/?utm_source=chatgpt.com)

[Madgicx Business Dashboard](https://madgicx.com/why-madgicx?utm_source=chatgpt.com)

[Madgicx Audience Automation & Reporting](https://madgicx.com/products/facebook-ad-automation-and-optimization-software?utm_source=chatgpt.com)

[Madgicx Intelligent Automation Analysis](https://madgicx.com/blog/intelligent-automation-platform?utm_source=chatgpt.com)

REFERENCE PATTERNS:

* audience saturation intelligence
* automation orchestration
* recommendation semantics
* audience optimization UX
* cross-platform analytics
* operational scaling workflows

⸻

🧠 COMPETITIVE POSITIONING

CURRENT POSITION:

already stronger visually than:

* Madgicx audience optimization
* Revealbot audience workflows
* AdEspresso optimization surfaces

CURRENT ADVANTAGES:

* enterprise-grade operational semantics
* execution governance direction
* audience intelligence architecture
* realtime saturation orchestration
* attribution-aware foundation

STILL MISSING:

* predictive saturation forecasting
* audience dependency graph
* overlap topology visualization
* recommendation confidence scoring
* rollout simulation layer
* audience lifecycle timeline
* audience freshness decay modeling

TARGET POSITION:

enterprise audience intelligence operating system —
NOT audience recommendation dashboard

⸻

🚫 FRONTEND IMMUTABILITY RULES

RULES:

* DO NOT redesign UI
* DO NOT alter layout structure
* DO NOT change component hierarchy
* ONLY replace static data with backend integrations
* preserve operational semantics exactly

⸻

🧱 UI PROTECTION LAYER

existing UI is considered:

* institutional-grade
* enterprise-ready
* operationally mature
* visually differentiated from competitors

backend systems MUST adapt to UI —
NOT the opposite.

⸻

🔥 CLAUDE IMPLEMENTATION ADDITION

Implement runtime-safe audience integrations.

Rules:

* Replace static/mock data only
* Use React Query
* Add loading/error/empty states
* Add realtime subscriptions
* Keep calculations backend-only
* Prevent duplicate execution requests
* Prevent optimistic audience mutations
* Cache recommendations aggressively
* Scope ALL queries by org_id
* Reconcile realtime updates safely
* Route actions through execution engine only
* Keep frontend visualization-only

⸻

🧠 STRATEGIC DIFFERENTIATION

Most competitors focus on:

* automation
* rule engines
* media buying shortcuts

This system direction is different:

* audience observability
* attribution-aware intelligence
* governance-first execution
* realtime saturation intelligence
* enterprise operational monitoring
* execution-safe recommendation orchestration

That positioning is significantly harder to copy.

Audience Lifecycle Engine

States:

* discovered
* analyzed
* saturated
* expanded
* diversified
* deprecated

Rules:

* audience recommendations MUST remain reversible
* audience changes MUST preserve attribution lineage

⸻

🧠 Audience Recommendation Semantics

Audience engine MUST analyze:

* saturation
* overlap
* LTV quality
* CAC stability
* retention quality
* frequency drift
* attributed revenue

Rules:

* audience scaling MUST NOT depend on ROAS alone
* long-term value MUST influence decisions

⸻

📊 Competitor Analysis

Competitors mainly optimize:

* audience expansion
* ad scaling
* rules automation

References:

* Madgicx AI Optimization￼
* Madgicx AI Media Buyer Review￼
* Amanda AI vs Madgicx￼

Current system direction:

* audience intelligence
* attribution-aware segmentation
* saturation observability
* LTV-driven recommendations
* realtime audience health scoring

✅ DONE