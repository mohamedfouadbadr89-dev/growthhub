action-execution-log.md

PAGE: actions/logs/page.tsx

⸻

🧩 1. UI → Data Mapping

Logs Table:

* action_id
* title
* status
* result
* performance_delta
* timestamp

⸻

Filters:

* status
* platform
* date_range

⸻

🧱 2. Data Shape

type ActionLog = {
  action_id: string
  title: string

  status: "success" | "failed" | "partial"

  result: string
  performance_delta: number

  timestamp: string
}

type LogsResponse = {
  logs: ActionLog[]
}

3. API Contracts

GET /api/v1/actions/logs

Query:

* status
* date_range

Response:
LogsResponse

⸻

🗄️ 4. DB Schema

action_logs

⸻

⚙️ 5. Execution Logic

logs created after every execution

⸻

💳 6. Credits

no credits

⸻

🧠 7. AI Usage

none

⸻

📊 8. Rules

if failure rate high → alert

⸻

🧾 9. Comments

pure tracking page

⸻

✅ DONE