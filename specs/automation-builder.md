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

## 🧠 FRONTEND STATE CONTRACT (REQUIRED)

STATE:

const [workflow, setWorkflow] = useState<AutomationWorkflow>()
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

DERIVED:

const selectedNode = workflow.nodes.find(n => n.id === selectedNodeId)

---

## 🔁 UI RENDER RULES

- Canvas MUST map over workflow.nodes to render nodes
- Each node MUST use:
  node.id as key
  node.position for placement
  node.data.title / description

- Connections MUST map from workflow.edges

---

## 🎛️ CONFIG PANEL BINDING

- Config panel MUST read from selectedNode.data.config

- On change:
  update via setWorkflow:

setWorkflow(prev => ({
  ...prev,
  nodes: prev.nodes.map(n =>
    n.id === selectedNodeId
      ? {
          ...n,
          data: {
            ...n.data,
            config: {
              ...n.data.config,
              [field]: value
            }
          }
        }
      : n
  )
}))

---

## ➕ NODE CREATION RULE

- Add node MUST:

1. generate id
2. assign type
3. set default config
4. push into workflow.nodes

---

## 🔗 EDGE CREATION RULE

- Connecting nodes MUST push:

{
  from: sourceNodeId,
  to: targetNodeId
}

into workflow.edges

---

## 🚫 HARD RULES

- NO static JSX nodes
- NO hardcoded logic in UI
- ALL logic MUST come from workflow state



WORKFLOW ORCHESTRATION SEMANTICS LAYER

PURPOSE

automation builder is:

* workflow composition layer
* orchestration editor
* runtime-safe workflow generator

automation builder is NOT:

* execution engine
* campaign mutation layer
* direct automation runtime

⸻

🔗 BUILDER SYSTEM BOUNDARY

workflow_builder
→ produces
workflow_definition
→ consumed by
automation_runtime
→ dispatches
executeAction()

⸻

RULES:

* builder NEVER executes actions directly
* builder NEVER mutates campaigns directly
* builder ONLY generates orchestration definitions
* runtime execution belongs to execution engine ONLY

⸻

BLOCK:

* NO direct executeAction() from builder
* NO external API execution from frontend
* NO direct campaign updates from canvas nodes

⸻

🧬 WORKFLOW GRAPH SEMANTICS

NODE TYPES

supported_nodes:

* trigger
* condition
* branch
* delay
* action
* approval
* rollback
* notification
* ai_recommendation
* split_test
* webhook
* custom_logic

⸻

NODE LIFECYCLE

node_states:

* draft
* configured
* validated
* active
* paused
* failed
* archived

⸻

RULE:

* invalid nodes MUST block activation
* archived nodes MUST remain immutable
* failed nodes MUST surface runtime diagnostics

⸻

🔁 ORCHESTRATION FLOW MODEL

canonical_runtime_flow:

event
→ trigger node
→ condition evaluation
→ routing logic
→ approval gate
→ action queue
→ execution engine
→ execution logs
→ feedback signals
→ optimization layer

⸻

🧠 VISUAL WORKFLOW ENGINE

CANVAS SEMANTICS

canvas MUST support:

* graph-based orchestration
* directional edge validation
* multi-branch logic
* node grouping
* zoom/pan virtualization
* realtime node updates
* execution overlays
* state-aware rendering

⸻

NODE POSITION SYSTEM

RULES:

* node positions MUST persist
* canvas state MUST restore
* edges MUST recompute dynamically
* disconnected nodes MUST surface warnings

⸻

🔗 EDGE ORCHESTRATION RULES

edges represent:

* execution order
* dependency routing
* conditional branching

⸻

VALIDATION:

BLOCK IF:

* circular loops detected
* orphan nodes detected
* invalid branch merges
* missing terminal action
* isolated action nodes

⸻

⚠️ APPROVAL ORCHESTRATION

approval nodes required for:

* high budget impact
* campaign pausing
* bid spikes
* bulk mutations
* external webhooks

⸻

approval_states:

* pending
* approved
* rejected
* expired

⸻

RULES:

* rejected flows MUST terminate safely
* expired approvals MUST invalidate execution
* approval events MUST be logged

⸻

🧪 SIMULATION & DRY RUN ENGINE

simulation_mode: REQUIRED

simulation MUST include:

* projected spend delta
* projected ROAS delta
* estimated execution frequency
* affected entities
* rollback feasibility
* execution risk

⸻

RULES:

* simulations MUST NOT mutate real systems
* dry runs MUST use historical snapshots
* simulations MUST remain isolated per org

⸻

🔒 WORKFLOW SAFETY LAYER

EXECUTION SAFETY

safety_checks:

* budget thresholds
* duplicate actions
* recursive loops
* unsafe scaling
* platform policy violations
* missing permissions

⸻

BLOCK IF:

* risk_score > allowed_threshold
* workflow overlaps existing active workflow
* cooldown conflict exists
* execution frequency exceeds limits

⸻

⏱ COOLDOWN + THROTTLING

workflow MUST define:

* cooldown_minutes
* max_runs_per_hour
* max_runs_per_day
* concurrency_limit

⸻

RULES:

* duplicate events MUST collapse
* repeated executions MUST throttle
* execution storms MUST auto-block

⸻

🔁 ROLLBACK ORCHESTRATION

rollback_supported: true

rollback_graph MUST support:

* restore budget
* resume campaign
* revert bids
* restore previous workflow state

⸻

RULES:

* rollback snapshots REQUIRED
* rollback events MUST audit
* rollback MUST include reason metadata

⸻

🧠 AI WORKFLOW GENERATION

AI generation is:

* assistive only
* recommendation-based
* draft-only generation

⸻

AI MUST generate:

* workflow graph
* node structure
* conditions
* explanations
* risk assessment
* approval requirements

⸻

AI MUST NOT:

* auto-activate workflows
* bypass validation
* create destructive flows silently
* create execution loops

⸻

🧠 AI REASONING OUTPUT

generated workflow MUST include:

* why_generated
* supporting_signals[]
* estimated_impact
* risk_score
* approval_requirement
* simulation_summary

⸻

📊 BUILDER RUNTIME OBSERVABILITY

EXECUTION VISIBILITY

builder MUST surface:

* execution history
* node execution count
* last execution time
* failure rate
* average runtime
* blocked executions
* rollback history

⸻

🧾 AUDIT + EVENT SYSTEM

workflow audit logs MUST include:

* workflow_id
* execution_id
* trigger_event
* validation_result
* approval_state
* execution_duration
* rollback_status
* affected_entities
* user_id
* org_id

⸻

🔴 REALTIME EVENT ENGINE

SOURCE:

SUPABASE_REALTIME

CHANNELS:

* workflow_runtime:{org_id}
* workflow_state:{org_id}
* workflow_validation:{org_id}

⸻

EVENTS:

* workflow_activated
* workflow_paused
* execution_started
* execution_completed
* execution_failed
* rollback_triggered
* approval_requested
* approval_resolved

⸻

RULES:

* realtime events MUST deduplicate
* frontend MUST subscribe safely
* execution updates MUST stream incrementally

⸻

🧬 VERSIONING + SNAPSHOTS

IMMUTABLE EXECUTION SNAPSHOT

active workflows MUST use:

* frozen graph
* frozen validation rules
* frozen risk profile

⸻

RULE:

editing workflow MUST create:

* new workflow version
* new validation cycle
* new execution snapshot

⸻

🔗 BUILDER ↔ STRATEGY RELATIONSHIP

strategy templates:

* generate starter workflows

builder:

* edits orchestration graph

runtime:

* executes validated workflow

⸻

RULES:

* strategies own templates
* builder owns orchestration editing
* runtime owns execution

⸻

📊 UI REQUIREMENTS

BUILDER CANVAS

canvas MUST support:

* drag/drop nodes
* connection previews
* execution overlays
* minimap
* zoom controls
* undo/redo
* node duplication
* branch visualization

⸻

RIGHT CONFIG PANEL

config panel MUST expose:

* node metadata
* execution risk
* approval requirements
* validation state
* compatible platforms
* cooldown settings
* rollback support

⸻

AI DRAWER

AI drawer MUST expose:

* prompt history
* cached generations
* recommendation reasoning
* risk warnings
* suggested templates

⸻

🧠 COMPETITOR SEMANTIC REFERENCES

REFERENCE MODELS:

Madgicx:

* automation templates
* AI workflow recommendations
* stop-loss orchestration
* scaling automations
* recommendation ranking
Braze Canvas:

* orchestration graph semantics
* journey builder logic
* execution lifecycle
* validation + approval semantics

Triple Whale:

* profitability-aware automation
* blended signal orchestration

Northbeam:

* attribution-aware decisions
* anomaly-driven triggers

Lifetimely:

* LTV-aware workflow prioritization
* cohort-driven automation semantics

AdCreative.ai:

* creative fatigue lifecycle
* creative rotation semantics

Markifact:

* orchestration operations semantics
* workflow lifecycle management

Revealbot:

* advanced automation rules
* multi-platform execution semantics
⸻

⚠️ GOVERNANCE RULES

HARD LOCKS

* NO direct execution from builder UI
* NO executeAction() from frontend
* NO runtime workflow mutation
* NO AI auto-activation
* NO unsafe workflow bypass

⸻

🧠 FUTURE PHASE ALIGNMENT

THIS PAGE DEPENDS ON:

* automation runtime engine
* validation engine
* approval engine
* rollback engine
* signals engine
* realtime orchestration layer
* execution observability layer

⸻

CURRENT STATUS:

frontend builder shell = implemented
workflow runtime = partial
approval engine = partial
rollback engine = not implemented
execution observability = partial
AI orchestration generation = partial

⸻

🧾 SAFE IMPLEMENTATION ORDER

1. workflow graph API
2. validation engine
3. approval engine
4. simulation engine
5. rollback system
6. realtime orchestration
7. execution observability
8. AI workflow generation hardening

⸻

DO NOT IMPLEMENT:

* autonomous execution
* self-modifying workflows
* unrestricted AI orchestration
* direct runtime mutation
* unsafe multi-step execution

WITHOUT EXPLICIT GOVERNANCE AUTHORIZATION