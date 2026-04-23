action-detail.md

PAGE: dashboard/actions/[id]/page.tsx

⸻

🧩 1. UI → Data Mapping

Action Header:

* id
* title
* description
* platform
* source

⸻

Impact & Confidence:

* impact_score
* confidence

⸻

Execution Plan:

* steps[]
* estimated_time
* automation_possible

⸻

Simulation:

* projected_revenue
* cost_impact
* roas_change

⸻

Risk Analysis:

* risks[]
* severity
* worst_case

⸻

Execution Logs:

* status
* result
* timestamp

⸻

🧱 2. Data Shape


type ActionDetail = {
  id: string
  title: string
  description: string

  platform: string
  source: string

  impact_score: number
  confidence: number

  execution_plan: {
    steps: string[]
    estimated_time: string
    automation_possible: boolean
  }

  simulation: {
    revenue: number
    cost_change: number
    roas_change: number
  }

  risks: {
    id: string
    message: string
    severity: "low" | "medium" | "high"
  }[]

  logs: {
    status: string
    result: string
    timestamp: string
  }[]
}


3. API Contracts

GET /api/v1/actions/:id

Response:
ActionDetail

⸻

POST /api/v1/actions/:id/execute

⸻

🗄️ 4. DB Schema

extends actions + action_logs

⸻

⚙️ 5. Execution Logic

simulate before execute

if risk high → require confirmation

⸻

💳 6. Credits

simulation → small cost
execution → standard cost

⸻

🧠 7. AI Usage

simulation → MEDIUM

⸻

📊 8. Rules

if confidence < 70% → show warning

if risk high → block auto execution

⸻

🧾 9. Comments

backend owns simulation

⸻

✅ DONE

