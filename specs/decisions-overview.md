decisions-overview.md

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
PAGE: decisions/page.tsx

⸻

🧩 1. UI → Data Mapping

Decision Priority Strip:

critical_count
high_impact_count
quick_wins_count
⸻

🧠 AI Layer
SOURCE: BACKEND ONLY

RULES:

NO AI execution in frontend
NO generation inside UI
ALL decisions precomputed from backend
UI only renders decision output
⚠️ Execution Rules
decisions are READ-ONLY in UI
apply / ignore only triggers API
no local computation
⸻

Recommended Action (backend-generated)

Real-Time Signals:

signal_type (cpa_spike / ctr_increase / demand_spike)
platform
value
timestamp
⸻

Decision Feed:

decision_id
title
platform
campaign_id
risk_level
impact_value
confidence_score
urgency
status
⸻

Decision Metrics:

confidence
risk
root_cause
urgency
status
⸻

⸻

Decision Reasoning (from backend only):

reasoning_text (precomputed) ⸻
System Pulse (Right Panel):

active_decisions
system_confidence
estimated_impact
performance_change
⸻

Operational Status:

integration_name
status
last_sync
data_health
⸻

Filters:

platform
impact
status
time_range
⸻

🧱 2. Data Shape (Normalized)

type Decision = { id: string title: string platform: "meta" | "google" | "tiktok" campaign_id?: string

impact_value: number confidence: number

risk: "low" | "medium" | "high" urgency: string

status: "new" | "applied" | "ignored"

root_cause: string

reasoning: string

recommendation: { action: string type: "scale" | "pause" | "reallocate" | "refresh" }

created_at: string }

type Signal = { id: string type: "cpa_spike" | "ctr_increase" | "demand_spike" platform: string value: number timestamp: string }

type DecisionSummary = { risks_detected: number opportunities_detected: number top_issue: string top_opportunity: string }

type DecisionStats = { critical: number high_impact: number quick_wins: number }

type SystemPulse = { active_decisions: number avg_confidence: number estimated_impact: number performance_change: number }

type DecisionResponse = { stats: DecisionStats summary: DecisionSummary signals: Signal[] decisions: Decision[] system_pulse: SystemPulse }

🌐 3. API Contracts

GET /api/v1/decisions

Query:

date_range
platform
status
impact
Response: DecisionResponse

⸻

GET /api/v1/decisions/:id

Response: Decision

⸻

POST /api/v1/decisions/:id/apply

Purpose:

apply decision action
⸻

POST /api/v1/decisions/:id/ignore

Purpose:

ignore decision
⸻

🗄️ 4. DB Schema

decisions

id
org_id
title
platform
campaign_id
impact_value
confidence
risk
urgency
status
root_cause
reasoning
action_type
action_text
created_at
⸻

decision_signals

id
org_id
type
platform
value
timestamp
⸻

decision_logs

id
org_id
decision_id
action (applied / ignored)
user_id
created_at
⸻

system_pulse

id
org_id
active_decisions
avg_confidence
estimated_impact
performance_change
created_at
⸻

⚙️ 5. Execution Logic

Decision Scoring:

score = (impact_value * 0.5) + (confidence * 0.5)

⸻

Risk Classification:

IF confidence > 85 AND impact high → high confidence decision

IF risk high AND urgency low → deprioritize

⸻

Impact Estimation:

impact = predicted_revenue_change over 30 days

⸻

Signals Engine:

detect anomalies:

CPA spike
CTR drop
ROAS decline
search demand spike
⸻

Decision Generation:

combine:

signals
performance metrics
thresholds
⸻

💳 6. Credits System

if decision is AI-generated:

consumes low credits
if applying decision:

no credits
⸻

🧠 7. AI Usage Classification

decision_generation → MEDIUM

signal_detection → LOW

future:

autonomous decision engine
⸻

📊 8. Marketing Rules (CRITICAL)

IF CPA spikes → reduce spend OR refresh creatives

⸻

IF ROAS drops below threshold → pause campaign

⸻

IF CTR increases significantly → scale campaign

⸻

IF new audience signal detected → expand targeting

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/decisions

⸻

Requirements:

loading state
error state
empty state
⸻

Important:

ALL decision logic in backend
frontend only renders
⸻

Security:

filter by org_id
⸻

Performance:

cache decisions
stream real-time signals (WebSocket recommended)
⸻

🔥 CLAUDE IMPLEMENTATION PROMPT (ADD THIS TO EVERY PAGE)

Use this prompt inside Claude:

Implement all API integrations for this page.

Rules:

DO NOT modify UI structure
ONLY replace static data with API calls
Use React Query for fetching
Add loading, error, empty states
Keep all business logic in backend
Ensure org_id is always included
Use proper typing based on provided interfaces
Optimize with caching and memoization
⸻

Future:

feeds:

decision engine
automation system
budget allocator
⸻

🧬 SCHEMA CONTROL
schema.sql is source of truth
no runtime creation
AUTH: CLERK

all requests must include org_id

NO auto AI

NO fallback AI

🔴 REALTIME STRATEGY
SOURCE: SUPABASE_REALTIME

MODE: HYBRID

BROADCAST (PRIMARY)
CHANNEL:

decisions_stream:{org_id}
EVENTS:

decision_created:

id
title
platform
impact_value
confidence
risk
urgency
timestamp
decision_updated:

id
status
impact_value
confidence
decision_applied:

id
status
decision_ignored:

id
status
POSTGRES_CHANGES (SECONDARY)
TABLES:

decision_signals (INSERT)
system_pulse (UPDATE)
RULES:

decisions MUST be precomputed (NO realtime AI)
UI MUST prepend new decisions
updates MUST be in-place (no full reload)
FALLBACK:

GET /api/v1/decisions every 20s
SECURITY:

org_id scoped channels
RLS enforced


🧬 EXECUTION STATE CONSISTENCY

execution state MUST remain synchronized across:

* realtime channels
* execution engine
* workflow engine
* automation control center

RULES:

* stale execution states MUST auto-expire
* frontend runtime state MUST reconcile with backend snapshots
* execution conflicts MUST invalidate outdated runtime views

⸻

📸 EXECUTION SNAPSHOT ENGINE

before execution mutation:

system MUST create:

* execution snapshot
* budget snapshot
* targeting snapshot
* bidding snapshot
* automation state snapshot

RULES:

* rollback REQUIRES snapshot
* snapshots MUST remain immutable
* snapshots MUST be org-scoped

⸻

⚠️ EXECUTION CONFLICT RESOLVER

detect conflicts between:

* automations
* manual actions
* decision engine
* workflow engine
* budget allocator

RULES:

* conflicting executions MUST pause automatically
* higher priority workflows override lower priority
* manual override MUST invalidate queued executions

⸻

🕸️ RUNTIME DEPENDENCY GRAPH

track automation dependencies between:

* workflows
* decisions
* executions
* rollback chains
* platform dependencies

RULES:

* dependent execution failures MUST propagate warnings
* broken dependency chains MUST reduce automation confidence

⸻

⚡ EXECUTION THROTTLING ENGINE

system MUST dynamically throttle:

* execution frequency
* budget mutations
* scaling velocity
* retry frequency

BASED ON:

* platform health
* failure rate
* anomaly pressure
* API instability

RULES:

* throttling MUST remain backend-controlled
* frontend MUST display throttling state only

⸻

🧠 EXECUTION CONFIDENCE MODEL

execution confidence MUST combine:

* platform stability
* signal quality
* historical execution success
* validation integrity
* realtime sync reliability

OUTPUT:

* execution_confidence_score
* execution_risk_score

⸻

🌐 PLATFORM DEGRADATION CASCADE

IF platform instability increases:

system MUST progressively:

1. reduce execution cadence
2. reduce scaling aggressiveness
3. disable high-risk automations
4. enter degraded mode
5. emergency pause affected platform

RULES:

* unaffected platforms MUST continue execution
* degradation severity MUST remain platform-scoped

⸻

🔐 APPROVAL GOVERNANCE

high-risk automations MAY require:

* manual approval
* multi-user approval
* admin validation
* finance validation

RULES:

* approval logic MUST remain backend-controlled
* frontend approval state is read-only
* approval history MUST remain auditable

⸻

♻️ EXECUTION RECOVERY ENGINE

system MUST support:

* failed execution recovery
* partial execution recovery
* rollback recovery
* queue restoration

RULES:

* recovery MUST require validation
* recovery cannot bypass governance layer
* failed recovery attempts MUST be logged

⸻

🧠 AUTOMATION FATIGUE ENGINE

detect excessive automation activity.

INDICATORS:

* repeated mutations
* excessive budget changes
* repeated pause/resume cycles
* unstable execution patterns

RULES:

* fatigue MUST reduce automation aggressiveness
* severe fatigue MAY trigger cooldown mode

⸻

📡 EXECUTION OBSERVABILITY

system MUST expose:

* execution throughput
* queue latency
* realtime sync lag
* execution bottlenecks
* retry pressure
* execution saturation

RULES:

* observability metrics MUST stream from backend
* frontend MUST remain read-only

⸻

🛡️ SAFETY SCORE ENGINE

system MUST calculate:

* automation_safety_score
* rollback_readiness_score
* platform_stability_score
* execution_integrity_score

RULES:

* safety scoring MUST remain backend-generated
* scores MUST update via realtime events

⸻

🧠 RUNTIME MEMORY LAYER

system MUST preserve:

* historical execution outcomes
* rollback history
* automation effectiveness
* failure patterns
* anomaly sequences

USED FOR:

* execution prioritization
* risk adjustment
* automation optimization

⸻

📈 LIVE EXECUTION TIMELINE

activity feed MUST support:

* execution timeline ordering
* rollback visualization
* approval events
* anomaly markers
* execution dependency events

RULES:

* latest events MUST prepend first
* duplicate events MUST collapse
* stale events MUST visually decay

⸻

🔗 DECISION EXECUTION LINKING

every automation execution MUST reference:

* source_decision_id
* source_signal_id
* workflow_origin
* execution_chain_id

RULES:

* execution lineage MUST remain traceable
* orphan executions are NOT allowed

⸻

🧬 EXECUTION TOPOLOGY ENGINE

system MUST visualize:

* automation relationships
* execution dependencies
* rollback propagation
* platform execution clusters
* runtime bottlenecks

RULES:

* topology MUST remain backend-generated
* frontend topology graph MUST be read-only

⸻

📊 EXECUTION VELOCITY ENGINE

system MUST track:

* execution acceleration
* execution slowdown
* automation burst frequency
* mutation velocity

RULES:

* abnormal execution velocity MUST trigger warnings
* excessive velocity MAY reduce execution sensitivity

⸻

⚠️ ANOMALY PRESSURE ENGINE

system MUST calculate:

* anomaly_density
* anomaly_frequency
* anomaly_severity
* anomaly_spread_rate

RULES:

* rising anomaly pressure MUST reduce automation aggressiveness
* severe anomaly clusters MAY trigger emergency safeguards

⸻

🔄 RUNTIME RECONCILIATION ENGINE

system MUST continuously reconcile:

* execution states
* realtime events
* queue states
* rollback states
* platform runtime snapshots

RULES:

* reconciliation conflicts MUST trigger validation mode
* unresolved mismatches MUST surface operational alerts

⸻

🧾 EXECUTION AUDIT CHAIN

every execution MUST preserve:

* origin source
* triggering condition
* approval chain
* rollback references
* execution mutations
* validation snapshots

RULES:

* audit chain MUST remain immutable
* audit chain MUST be org-scoped

⸻

🚫 FRONTEND STRUCTURE PROTECTION

RULES:

* DO NOT redesign UI
* DO NOT restructure layout hierarchy
* DO NOT modify spacing system
* DO NOT replace existing design system
* DO NOT alter visual semantics
* DO NOT rename existing components
* DO NOT change card architecture
* ONLY integrate backend/runtime data into existing UI structure

⸻

🧬 UI IMMUTABILITY RULE

existing UI structure is considered production-grade.

backend integrations MUST adapt to UI —
NOT the opposite.

⸻

⚠️ RUNTIME UI PROTECTION

frontend MUST NEVER:

* simulate execution success
* fake optimistic runtime updates
* generate local execution states
* mutate execution authority
* bypass governance validation

ALL runtime truth comes from backend orchestration layer.

⸻

🧠 COMPETITIVE EXECUTION POSITIONING

CURRENT POSITIONING:

stronger governance semantics than:

* Madgicx
* Revealbot
* Birch

CURRENT ADVANTAGES:

* enterprise execution governance
* runtime isolation semantics
* orchestration-first architecture
* rollback governance direction
* execution safety modeling

STILL MISSING:

* dependency tracing
* runtime topology visibility
* execution lineage visualization
* anomaly intelligence surface
* conflict orchestration visibility
* execution confidence propagation

TARGET POSITION:

execution operating system —
NOT automation dashboard

⸻

📚 COMPETITOR REFERENCE CONTEXT

REFERENCE SYSTEMS:

Madgicx Automation Overview
[Madgicx Automation Overview](https://academy.madgicx.com/lessons/how-to-monitor-automation-performance?utm_source=chatgpt.com)

Madgicx Custom Automation
[Madgicx Custom Automation](https://academy.madgicx.com/lessons/how-madgicx-custom-automation-works?utm_source=chatgpt.com)

Madgicx Automation Tactics
[Madgicx Automation Tactics](https://academy.madgicx.com/lessons/madgicx-automation-tactics?utm_source=chatgpt.com)

Madgicx Operational Automation Concepts
[Madgicx Automation Introduction](https://academy.madgicx.com/lessons/introduction-madgicx-automations?utm_source=chatgpt.com)

Runtime Monitoring Reference Model
[Runtime Monitoring Instrumentation Techniques](https://arxiv.org/abs/1708.07229?utm_source=chatgpt.com)

Decision Lifecycle Engine

Stages:

* detected
* analyzed
* recommended
* validated
* queued
* executed
* monitored
* rolled_back
* archived

Rules:

* every decision MUST have lifecycle state
* no direct execution from recommendation layer
* rollback MUST remain available

⸻

🧠 Recommendations Intelligence Layer

Decision recommendations MUST combine:

* attribution quality
* LTV impact
* CAC efficiency
* trend velocity
* saturation risk
* confidence score
* operational risk

Rules:

* recommendations MUST be explainable
* frontend MUST remain render-only
* scoring backend authoritative

⸻

📊 Competitor Positioning

Reference competitors:

* Madgicx￼
* Bïrch / Revealbot￼
* Revealbot Automation￼

Current advantage:

* stronger operational observability
* governance-first architecture
* institutional intelligence semantics
* decision orchestration direction

Still missing:

* simulation layer
* decision dependency graph
* multi-step execution plans
* rollback analytics
* strategic forecasting