actions-overview.md

PAGE: dashboard/actions/page.tsx

⸻

🧩 1. UI → Data Mapping

Pending Actions:

* id
* title
* platform
* impact_score
* urgency
* effort
* created_at

⸻

Recommended Actions:

* id
* title
* linked_decision_id
* expected_impact
* confidence
* effort

⸻

Executed Actions (History):

* id
* title
* executed_at
* status
* performance_delta

⸻

Filters:

* platform
* urgency
* status

⸻

Bulk Actions:

* selected_ids[]
* action_type (execute / schedule)

⸻

🧱 2. Data Shape (Normalized)

type Action = {
  id: string
  title: string
  description: string

  source: "decision" | "automation" | "manual"
  platform: "meta" | "google" | "tiktok"

  impact_score: number
  urgency: "low" | "medium" | "high"
  effort: "low" | "medium" | "high"

  confidence?: number

  status: "pending" | "executed" | "failed"

  created_at: string
  executed_at?: string

  performance_delta?: number
}

type ActionsResponse = {
  pending: Action[]
  recommended: Action[]
  history: Action[]
}


⸻

🌐 3. API Contracts

GET /api/v1/actions

Query:

* platform
* urgency
* status

Response:
ActionsResponse

⸻

POST /api/v1/actions/:id/execute

⸻

POST /api/v1/actions/bulk

Body:

* action_ids[]

⸻

POST /api/v1/actions/:id/schedule

⸻

🗄️ 4. DB Schema

actions

* id
* org_id
* title
* description
* source
* platform
* impact_score
* urgency
* effort
* status
* created_at
* executed_at

⸻

action_logs

* id
* action_id
* status
* result
* performance_delta
* timestamp

⸻

⚙️ 5. Execution Logic

Priority:

priority = impact_score × urgency_weight

⸻

Execution Flow:

* validate action
* check API availability
* execute
* log result
* update metrics

⸻

💳 6. Credits System

execute action → consumes credits

bulk execution → higher cost

⸻

🧠 7. AI Usage Classification

action_generation → MEDIUM
execution → NONE

⸻

📊 8. Marketing Rules

if impact_score high + effort low → auto execute suggestion

if urgency high → push to top

if repeated action → suggest automation

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/actions

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* backend handles execution
* frontend triggers only

⸻

Security:

* filter by org_id

⸻

Performance:

* cache actions list

⸻

Future:

feeds:

* automation engine
* decision feedback loop

⸻

✅ DONE