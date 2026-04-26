automation-history.md

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

PAGE: automation/history/page.tsx

⸻

🧩 1. UI → Data Mapping

Filters

* date_range
* workflow_id
* status (all | success | failed | skipped)

⸻

Decision Feed

Each item:

* id
* workflow_id
* decision_name
* timestamp
* action_taken
* status
* impact

⸻

Expanded Details

* trigger_condition
* evaluated_data
* decision_reason
* execution_result

⸻

AI Insights Panel

* explanation
* recommendation
* confidence_score

RULES:

* MUST NOT auto-load AI
* MUST require user action (expand / click)
* MUST use cached result if exists
* MUST call POST endpoint only

⸻

Stats

* efficiency_gain
* time_saved

⸻

🧱 2. Data Shape

type AutomationHistory = {
id: string
workflow_id: string

decision: {
name: string
timestamp: string
}

trigger: {
condition: string
}

evaluation: {
metric: string
value: number
}

action: {
type: string
result: “executed” | “skipped” | “failed”
risk_level?: “low” | “medium” | “high”
validation_passed?: boolean
details?: string
}

status: “success” | “failed” | “skipped”

ai_insight?: {
explanation: string
suggestion?: string
confidence: number
}

created_at: string
}

⸻

🌐 3. API Contracts

Get History

GET /api/v1/automation/history

Query:

* date_range
* workflow_id
* status

⸻

Get Single Decision

GET /api/v1/automation/history/:id

⸻

Generate AI Explanation

POST /api/v1/automation/history/:id/explain

RULES:

* triggers AI explanation
* cached per decision_id
* rate-limited
* must go through AI Gateway

⸻

🗄️ 4. DB Schema

automation_runs

* id
* org_id
* workflow_id
* trigger_data (jsonb)
* evaluation_data (jsonb)
* action_data (jsonb)
* status
* created_at

⸻

automation_logs

* id
* run_id
* message
* level
* created_at

⸻

⚙️ 5. Execution Logic

On Each Workflow Run:

1. trigger fires
2. evaluate conditions
3. validation layer:
    * check constraints
    * check risk level
    * check approval requirement
4. execution decision:
    * if approved → execute
    * if blocked → log only
    * if pending → wait for approval
5. execute action (if allowed)
6. store result

⸻

🧠 6. AI Layer

AI Explanation

Used ONLY when:

* user expands decision
* or opens insights panel

RULES:

* NEVER auto-trigger
* MUST use cached result if available
* MUST go through POST endpoint

⸻

🧾 Execution Metadata

* execution_source: (manual | automation | system)
* approval_status: (approved | auto-approved | blocked)
* validation_passed: boolean

⸻

🛑 Safety Logging

* log ALL blocked executions
* log risk level per action
* log rollback events

⸻

🧠 AI Cost Protection

* explanation generated ONCE per decision
* reused across sessions
* stored in cache

⸻

Output

* why decision happened
* what could be improved

⸻

💳 7. Credits System

* AI explanation → LOW cost
* normal logs → FREE

⸻

🧠 8. AI Usage Classification

* decision_explanation → LOW
* execution → NONE

⸻

📊 9. Marketing Rules

Example:

* if ROAS < target → skip scaling

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:
GET /api/v1/automation/history

Requirements:

* pagination
* expandable rows
* real-time updates (optional)

⸻

Security

* org_id filtering
* audit-safe logs

⸻

Performance

* index by workflow_id
* cache recent runs

⸻

Important

* logs = source of truth
* must NOT be editable
* must include validation + approval state