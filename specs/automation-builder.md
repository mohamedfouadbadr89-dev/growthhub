automation-builder.md

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

PAGE: automation/builder/page.tsx

⸻

🧩 1. UI → Data Mapping

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

Top Actions

* test_workflow
* save_draft
* activate_workflow

RULES:

* activate_workflow MUST NOT execute immediately
* MUST pass validation + approval before activation
* test_workflow MUST NOT affect real campaigns

⸻

AI Builder Input

* prompt_input
* suggestions[]

RULES:

* AI generation MUST be user-triggered
* suggestions MUST be cached
* NO auto-generation

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

Logic Preview

* parsed_logic_tree

⸻

🧱 2. Data Shape

type AutomationWorkflow = {
id: string
name: string
status: “draft” | “active” | “paused”

nodes: {
id: string
type: “trigger” | “condition” | “action”
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

validation?: {
passed: boolean
errors?: string[]
risk_level?: “low” | “medium” | “high”
}

created_at: string
updated_at: string
}

⸻

🌐 3. API Contracts

Create Workflow

POST /api/v1/automation/workflows

⸻

Update Workflow

PUT /api/v1/automation/workflows/:id

⸻

Get Workflow

GET /api/v1/automation/workflows/:id

⸻

Activate Workflow

POST /api/v1/automation/workflows/:id/activate

RULES:

* MUST pass validation layer
* MUST check risk level
* MUST require approval for medium/high risk
* MUST NOT auto-execute actions on activation

⸻

Test Workflow

POST /api/v1/automation/workflows/:id/test

RULES:

* simulation only
* MUST NOT affect real campaigns
* MUST NOT execute real actions

## 🧪 WORKFLOW SIMULATION ENGINE

INPUT:

- historical data
- current state

OUTPUT:

- expected executions
- projected impact
- risk exposure

RULE:

- simulation MUST NOT execute real actions
- results MUST be cached
⸻

AI Generate Workflow

POST /api/v1/automation/workflows/generate

RULES:

* user-triggered only
* cached per prompt
* rate-limited

Input:

* prompt

⸻

🗄️ 4. DB Schema

automation_workflows

* id
* org_id
* name
* status
* nodes (jsonb)
* edges (jsonb)
* created_at
* updated_at

## ⚠️ EXECUTION VERSION LOCK

- active workflows MUST use fixed version

RULE:

- editing workflow creates new version
- running workflow NOT affected

⸻

automation_versions

* id
* workflow_id
* snapshot (jsonb)
* created_at

⸻

validation_logs

* id
* workflow_id
* errors
* risk_level
* created_at

⸻

⚙️ 5. Execution Logic

Workflow Engine (SAFE)

1. trigger fires
2. evaluate condition nodes
3. validation layer:
    * check constraints
    * check risk level
    * check action safety
4. execution decision:
    * if approved → allow execution
    * if blocked → log only
    * if pending → wait approval
5. execution handled by execution engine (NOT builder)
6. log result

⸻

Node Execution

Trigger

* listens to event (conversion, spend update, etc)

⸻

Condition

* if metric operator value → pass
* else → stop

⸻

Action

* update budget
* pause campaign
* send notification
* trigger webhook

RULES:

* MUST NOT execute inside builder
* MUST be executed via execution engine only

⸻

🧠 6. AI Layer

AI Builder

Input:

* natural language prompt

Example:
“Pause campaigns with low ROAS”

Output:

* generated nodes
* connected workflow

## 🧠 AI SAFETY GUARDRAILS

AI MUST NOT:

- generate high-risk actions without warning
- create full shutdown workflows
- exceed budget thresholds

AI OUTPUT MUST INCLUDE:

- risk_score
- explanation
- required approval
⸻

AI Builder Rules

* AI generates draft workflows ONLY
* workflows MUST be reviewed before activation
* NO auto-activation
* NO execution permissions

⸻

⚠️ Validation Layer

* validate all nodes before activation
* block unsafe actions (budget spikes, full shutdowns)
* enforce platform constraints

⸻

🔒 Activation Rules

* activation requires validation pass
* high-impact workflows require approval
* unsafe workflows MUST be blocked

⸻

🧠 AI Cost Protection

* generation triggered manually
* cached per prompt
* reused across sessions

⸻

💳 7. Credits System

* AI generation → MEDIUM cost
* test workflow → FREE
* activation → FREE

⸻

🧠 8. AI Usage Classification

* workflow_generation → MEDIUM
* node_suggestions → LOW
* execution → NONE

⸻

📊 9. Marketing Rules

Example Logic:

* if ROAS < 2.5 → reduce budget
* if ROAS > 3 → scale
* if frequency > 3.5 → rotate creatives

NOTE:

* rules generate logic ONLY
* NEVER trigger execution

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:
GET /api/v1/automation/workflows/:id

⸻

UX Requirements

* drag & drop nodes
* connect nodes visually
* live config editing
* undo / redo (optional)

⸻

Security

* org_id isolation
* validate actions before execution

⸻

Performance

* debounce updates
* autosave draft

⸻

Important

* workflows must be saved before activation
* test mode MUST NOT affect real campaigns
* builder MUST NOT execute actions directly

## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🧠 WORKFLOW GRAPH VALIDATION

VALIDATE:

- no circular loops
- max depth limit
- valid trigger → condition → action flow

BLOCK IF:

- action before trigger
- multiple triggers without routing logic
- disconnected nodes


## 🛑 EXECUTION LIMITS

PER WORKFLOW:

- max executions per hour
- max budget impact per day
- max actions per run

BLOCK IF:

- thresholds exceeded


## 🔴 EVENT-DRIVEN ENGINE

SOURCE: SUPABASE REALTIME

CHANNELS:

- decisions:{org_id}
- alerts:{org_id}
- metrics:{org_id}

TRIGGERS MUST LISTEN TO EVENTS:

- decision_created
- alert_triggered
- metric_updated


## 🔗 DECISION-BASED TRIGGERS

TRIGGER TYPES:

- decision_based
- alert_based
- metric_based

PRIORITY:

decision > alert > metric


## 🔗 FULL SYSTEM FLOW

1. data ingestion
2. signal detection
3. decision generation
4. workflow trigger
5. validation layer
6. execution engine
7. logging
8. feedback loop

RULE:

system MUST be event-driven