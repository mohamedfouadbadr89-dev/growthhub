campaigns-execution-focus.md

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

PAGE: app/campaigns/[id]/page.tsx

⸻

🧩 1. UI → Data Mapping

📊 KPI Cards

* spend
* revenue
* roas

⸻

⚡ Execution First Actions

* action_id
* type
* trigger
* button_execute

RULES:

* execution MUST require confirmation modal
* execution MUST display risk level before action
* execution MUST pass backend validation
* HIGH risk actions MUST be blocked or require override
* NO auto execution

⸻

📈 Trend Toggle

* spend
* revenue
* roas

⸻

🎯 Ad Sets + Inline Edit

* budget_editable
* cpa_editable

RULES:

* inline edits MUST go through API
* MUST validate values (budget limits / CPA thresholds)
* MUST NOT apply changes without confirmation

⸻

🧠 Insight Panel

* alert
* description

RULES:

* MUST NOT trigger AI on load
* MUST fetch cached insights only

⸻

⚠️ Risk Engine

* risk_score
* probability
* visualization

RULES:

* risk MUST be precomputed or cached
* MUST be shown BEFORE execution
* MUST be used in validation layer

⸻

🧱 2. Data Shape

type ExecutionView = {
kpis: {
spend: number
revenue: number
roas: number
}

actions: {
id: string
type: string
trigger: string
risk_level?: “low” | “medium” | “high”
status?: “ready” | “blocked” | “pending_approval”
}[]

trend: {
date: string
spend: number
revenue: number
roas: number
}[]

adsets: {
id: string
budget: number
cpa: number
editable: boolean
}[]

insight: {
message: string
}

risk: {
score: number
probability: number
}
}

⸻

🌐 3. API Contracts

GET /api/v1/campaigns/{id}/execution
→ returns execution-ready data (NO AI execution)

⸻

POST /api/v1/actions/execute

RULES:

* MUST require confirmation
* MUST include action_id + campaign_id
* MUST pass validation layer
* MUST include risk evaluation
* MUST NOT execute if risk = HIGH (unless override)

⸻

POST /api/v1/campaigns/{id}/execution/insights/regenerate

RULES:

* triggers AI insights
* cached per campaign
* rate-limited
* manual trigger only

⸻

🗄️ 4. DB Schema

campaigns
adsets
campaign_metrics
execution_logs
risk_scores
ai_insights

⸻

⚙️ 5. Execution Logic

* prioritize actions visually (UX)
* DO NOT auto-execute anything

Execution Flow:

1. user clicks execute
2. confirmation modal يظهر
3. validation layer:
    * check risk
    * check budget constraints
    * check campaign state
4. decision:
    * approved → execute
    * blocked → show reason
    * pending → require approval
5. execute action
6. log result

⸻

🧠 6. AI Layer

AI Usage

* action prioritization (backend only)
* risk prediction (cached / precomputed)

RULES:

* NO AI execution in UI
* NO AI on GET
* ALL AI via POST only
* ALL AI cached

⸻

🧠 AI Cost Protection

* prioritization generated periodically (not per request)
* reused across sessions
* regenerated manually or via background job

⸻

💳 7. Credits System

* execution suggestions → MEDIUM
* insights generation → LOW
* execution → FREE

⸻

🧠 8. AI Usage Classification

* action_engine → HIGH (controlled backend)
* execution → NONE

⸻

📊 9. Marketing Rules

* high ROAS → suggest scaling
* high CPA → suggest reduction
* risky actions → block or require approval

NOTE:

* rules generate suggestions ONLY
* NEVER trigger execution

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:
GET /api/v1/campaigns/{id}/execution

⸻

UX Rules

* execution-first UI BUT NOT unsafe
* minimal friction WITH validation (NOT zero validation)
* always show risk before execution

⸻

Security

* org_id filtering
* no cross-org execution

⸻

Performance

* cache risk scores
* lazy load insights

⸻

Important

* NO auto execution
* NO AI on page load
* ALL execution must pass validation + approval

## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI
