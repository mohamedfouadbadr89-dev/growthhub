
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

PAGE: app/automation/history/page.tsx

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


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI
## 🔗 FEEDBACK LOOP

automation history MUST feed:

- decision engine
- strategy scoring
- risk model

---

RULE:

- failed executions reduce strategy score
- successful executions increase confidence


## ⚠️ ANOMALY DETECTION

IF:

- repeated failures
- abnormal execution frequency
- negative impact

→ trigger alert
→ auto pause strategy


## 🛑 AUTO PAUSE RULE

IF:

- failure_rate > threshold
OR
- risk detected

→ pause workflow automatically


## 🔴 REALTIME HISTORY

CHANNEL:

automation_runs:{org_id}

EVENTS:

- run_started
- run_completed
- run_failed

---

RULE:

- UI MUST update instantly


## 🧠 EXECUTION QUALITY SCORE

score =

0.5 * success_rate +
0.3 * impact +
0.2 * stability

---

USE:

- detect bad automations


## 🧠 AI LEARNING LAYER

AI explanations MUST feed:

- strategy improvement
- decision refinement

---

RULE:

AI ≠ just explanation  
AI = feedback signal


## 🔗 FULL AUTOMATION FLOW

Decision → Strategy → Workflow → Execution → Logs → Feedback → Decision

---

RULE:

- system MUST learn continuously


## ⚡ RUNTIME TRUTH

AUTOMATION HISTORY SYSTEMS ARE:

- append-only

- audit-critical

- execution-linked

- risk-aware

- eventually-consistent

- feedback-driven

- organization-scoped

RULES:

- automation logs are source of truth

- execution history is immutable

- AI explanations are secondary metadata

- execution state may evolve asynchronously

- approval state must remain historically accurate

- failed executions are equally important as successful ones

- realtime feeds may lag provider state briefly

SYSTEM TRUTH PRIORITY:

1. execution logs

2. validation state

3. approval state

4. execution result

5. automation workflow state

6. AI explanation cache

7. UI rendering

NEVER:

- edit execution history

- infer missing execution states

- auto-generate fake explanations

- mutate logs from frontend

- trust frontend state as source of truth

- overwrite historical approvals

---

## 🔄 COMPETITOR LIFECYCLE SEMANTICS

AUTOMATION FLOW:

decision generated

→ strategy evaluation

→ workflow trigger

→ validation checks

→ approval checks

→ execution dispatch

→ execution result

→ logging

→ feedback scoring

→ strategy refinement

RULES:

- workflows evolve over time

- failures affect future confidence

- execution quality influences strategy

- realtime updates are event-driven

- AI explanations are delayed enrichments

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- workflow retry lineage

- execution replay protection

- partial execution semantics

- rollback lineage

- multi-step workflow dependencies

- execution cancellation tracking

- delayed provider confirmation handling

- execution reconciliation policy

- strategy decay rules

- feedback scoring normalization

- anomaly sensitivity thresholds

- confidence degradation logic

- execution deduplication policy

- approval expiration behavior

- workflow pause recovery

- historical strategy snapshots

REQUIRED BEFORE SCALE:

- canonical workflow execution model

- execution reconciliation framework

- feedback scoring governance

- automation reliability standards

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- successful execution means positive impact

- skipped actions are harmless

- provider responses are final immediately

- automation confidence remains static

- AI explanations are authoritative

- realtime events arrive in order

- workflows behave deterministically forever

- execution history is complete instantly

RISKS:

- inaccurate automation confidence

- hidden execution failures

- duplicated executions

- false-positive anomaly alerts

- stale strategy scoring

- invalid rollback assumptions

- incorrect operational decisions

- audit inconsistency

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/automation/history/stats

- GET /api/v1/automation/history/anomalies

- GET /api/v1/automation/history/quality-score

- GET /api/v1/automation/history/feedback

- GET /api/v1/automation/history/:id/logs

- GET /api/v1/automation/history/:id/approval

- POST /api/v1/automation/history/:id/retry

- POST /api/v1/automation/history/:id/pause

- POST /api/v1/automation/history/:id/resume

- POST /api/v1/automation/history/:id/rollback

MISSING STATES:

- awaiting_approval

- rollback_triggered

- partial_execution

- execution_reconciled

- stale_feedback

- anomaly_detected

- strategy_paused

- retry_pending

- delayed_provider_confirmation

- low_confidence_execution

---

## 🌐 REQUIRED BACKEND CONTRACTS

AUTOMATION HISTORY CONTRACT:

INPUT:

- org_id

- workflow_id

- filters

OUTPUT:

- execution_history[]

- validation_state

- approval_state

- execution_metadata

RULES:

- immutable logs required

- org isolation mandatory

- pagination required

---

AI EXPLANATION CONTRACT:

INPUT:

- decision_id

- cached_result

- execution_context

OUTPUT:

- explanation

- recommendation

- confidence_score

RULES:

- POST-only execution

- cached explanations mandatory

- AI NEVER auto-triggered

---

EXECUTION FEEDBACK CONTRACT:

INPUT:

- execution_result

- impact

- stability

- failure_rate

OUTPUT:

- execution_quality_score

- strategy_signal

- anomaly_signal

RULES:

- deterministic scoring required

- failed executions weighted negatively

- feedback stored historically

---

ANOMALY DETECTION CONTRACT:

INPUT:

- execution_frequency

- failure_rate

- impact

- workflow_behavior

OUTPUT:

- anomaly_detected

- severity

- pause_recommended

RULES:

- backend-only evaluation

- historical context required

- auto-pause policy auditable

---

## 🗄️ REQUIRED TABLES

automation_execution_history

automation_feedback_scores

automation_quality_scores

automation_anomalies

automation_execution_metadata

automation_approval_history

automation_validation_history

automation_pause_events

automation_retry_history

automation_realtime_events

automation_strategy_feedback

automation_confidence_history

automation_rollback_history

automation_execution_windows

automation_execution_metrics

automation_alert_links

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- automation history tables

- expandable rows

- realtime feed UI

- filters

- pagination

- export actions

- AI insight panels

- confidence indicators

- execution badges

- loading/error/empty states

- anomaly indicators

CLAUDE MUST NOT IMPLEMENT:

- execution authority

- anomaly detection engine

- feedback scoring engine

- auto-pause orchestration

- rollback orchestration

- execution reconciliation engine

- workflow retry engine

- AI execution systems

---

## 🛡️ GOVERNANCE BOUNDARIES

AUTOMATION GOVERNANCE:

- execution history immutable

- approvals historically preserved

- validation logs auditable

- AI explanations traceable

- feedback scoring reproducible

SECURITY:

- strict org isolation mandatory

- backend-only execution authority

- AI explanations permission-scoped

- approval states protected

COMPLIANCE:

- audit logs retained

- execution lineage immutable

- rollback history preserved

- anomaly triggers traceable

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- autonomous workflow optimization

- AI-driven execution changes

- self-healing automations

- adaptive anomaly thresholds

- AI-generated workflow creation

- autonomous rollback execution

- automatic strategy mutation

RULE:

- automation governance must remain deterministic initially

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- editable automation history

- frontend execution mutation

- automatic AI execution

- hidden retry execution

- uncached AI explanations

- fake execution logs

- frontend anomaly scoring

- cross-org workflow visibility

- silent workflow mutation

- AI-triggered execution actions

---