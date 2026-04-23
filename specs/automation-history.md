automation-history.md

PAGE: dashboard/automation/history/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

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

⸻

Stats

* efficiency_gain
* time_saved

⸻

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
    result: "executed" | "skipped" | "failed"
    details?: string
  }

  status: "success" | "failed" | "skipped"

  ai_insight?: {
    explanation: string
    suggestion?: string
    confidence: number
  }

  created_at: string
}


 3. API Contracts

⸻

Get History

GET /api/v1/automation/history

Query:

* date_range
* workflow_id
* status

⸻

Get Single Decision

GET /api/v1/automation/history/:id

4. DB Schema

⸻

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

⸻

⚙️ 5. Execution Logic

⸻

On Each Workflow Run:

1. trigger fires  
2. evaluate conditions  
3. execute action  
4. store result  


Status Logic

if executed → success  
if condition false → skipped  
if error → failed  

⸻

🧠 6. AI Layer

⸻

AI Explanation

Used ONLY when:

* user expands decision
* or opens insights panel

⸻

Output:

* why decision happened
* what could be improved

⸻

⸻

💳 7. Credits System

* AI explanation → LOW cost
* normal logs → FREE

⸻

⸻

🧠 8. AI Usage Classification

* decision_explanation → LOW
* execution → NONE

⸻

⸻

📊 9. Marketing Rules

⸻

Example:

if ROAS < target → skip scaling  

🧾 10. Comments (FOR CLAUDE)

⸻

Replace static UI with:

GET /api/v1/automation/history

Requirements:

* pagination
* expandable rows
* real-time updates (optional)

⸻

Security:

* org_id filtering
* audit-safe logs

⸻

Performance:

* index by workflow_id
* cache recent runs

⸻

Important:

* logs = source of truth
* must NOT be editable