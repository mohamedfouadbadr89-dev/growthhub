automation-builder.md

PAGE: automation/builder/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

Canvas (Workflow Builder)

Nodes

* id
* type (trigger | condition | action)
* title
* description
* position (x, y)
* config

⸻

Connections

* from_node_id
* to_node_id

⸻

⸻

Top Actions

* test_workflow
* save_draft
* activate_workflow

⸻

⸻

AI Builder Input

* prompt_input
* suggestions[]

⸻

⸻

Node Configuration Panel

Selected Node

* node_id
* node_type

⸻

Rule Config

* metric
* operator
* value
* timeframe

⸻

⸻

Logic Preview

* parsed_logic_tree

⸻

⸻

🧱 2. Data Shape


type AutomationWorkflow = {
  id: string
  name: string
  status: "draft" | "active" | "paused"

  nodes: {
    id: string
    type: "trigger" | "condition" | "action"
    position: { x: number; y: number }

    data: {
      title: string
      description?: string

      config: {
        metric?: string
        operator?: ">" | "<" | "="
        value?: number
        timeframe?: string

        action_type?: string
        action_value?: number
        target?: string
      }
    }
  }[]

  edges: {
    from: string
    to: string
  }[]

  created_at: string
  updated_at: string
}


🌐 3. API Contracts

Create Workflow

POST /api/v1/automation/workflows

Update Workflow

PUT /api/v1/automation/workflows/:id

Get Workflow

GET /api/v1/automation/workflows/:id

Activate Workflow

POST /api/v1/automation/workflows/:id/activate

Test Workflow

POST /api/v1/automation/workflows/:id/test

AI Generate Workflow

POST /api/v1/automation/workflows/generate

Input:

* prompt

⸻

⸻

🗄️ 4. DB Schema

⸻

automation_workflows

* id
* org_id
* name
* status
* nodes (jsonb)
* edges (jsonb)
* created_at
* updated_at

⸻

automation_versions

* id
* workflow_id
* snapshot (jsonb)
* created_at

⸻

⸻

⚙️ 5. Execution Logic

⸻

Workflow Engine

1. trigger fires  
2. evaluate condition nodes  
3. if true → execute action  
4. log result  

Node Execution

Trigger

* listens to event (conversion, spend update, etc)

⸻

Condition

if metric operator value → pass
else → stop


Action

* update budget
* pause campaign
* send notification
* trigger webhook

⸻

⸻

🧠 6. AI Layer

⸻

AI Builder

Input:

* natural language prompt

Example:

"Pause campaigns with low ROAS"

⸻

Output:

* generated nodes
* connected workflow

⸻

Suggestions

* prebuilt prompts
* strategy-based shortcuts

⸻

⸻

💳 7. Credits System

* AI generation → MEDIUM cost
* test workflow → FREE
* activation → FREE

⸻

⸻

🧠 8. AI Usage Classification

* workflow_generation → MEDIUM
* node_suggestions → LOW

⸻

⸻

📊 9. Marketing Rules

⸻

Example Logic

if ROAS < 2.5 → reduce budget  
if ROAS > 3 → scale  
if frequency > 3.5 → rotate creatives  

⸻

⸻

🧾 10. Comments (FOR CLAUDE)

⸻

Replace static UI with:

GET /api/v1/automation/workflows/:id

Requirements:

* drag & drop nodes
* connect nodes visually
* live config editing
* undo / redo (optional)

⸻

Security:

* org_id isolation
* validate actions before execution

⸻

Performance:

* debounce updates
* autosave draft

⸻

Important:

* workflows must be saved before activation
* test mode must NOT affect real campaigns