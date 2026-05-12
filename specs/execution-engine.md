## ⚙️ CENTRAL EXECUTION ENGINE

PURPOSE:
- single entry point for ALL executions

RULES:
- NO execution from pages
- NO execution from AI
- ONLY via /api/v1/execution

FLOW:
1. receive action request
2. validate:
   - org_id
   - permissions
   - risk level
   - platform constraints
3. decision:
   - approved → execute
   - blocked → log
   - pending → require approval
4. execute via provider API
5. log result

RISK CONTROL:
- HIGH → block or require override
- MEDIUM → require confirmation
- LOW → allow

LOGGING:
- ALL executions logged
- include risk + validation + result

DEPENDENCIES:
- actions
- campaigns
- automations

IMPORTANT:
- this is the ONLY execution authority

## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## ⚡ RUNTIME TRUTH

EXECUTION SYSTEMS ARE:

- centralized

- permission-gated

- risk-aware

- provider-dependent

- audit-critical

- deterministic

- organization-scoped

RULES:

- ALL execution flows through central engine

- pages MUST NEVER execute directly

- AI MUST NEVER execute directly

- execution requires org isolation

- execution decisions are policy-driven

- provider APIs are untrusted boundaries

- execution results are eventually consistent

- failures must be recoverable

SYSTEM TRUTH PRIORITY:

1. execution policies

2. permission validation

3. risk engine

4. approval system

5. provider response

6. UI execution state

NEVER:

- execute from frontend

- allow AI direct execution

- bypass approval policies

- trust provider success blindly

- mutate execution state client-side

- skip audit logging

---

## 🔄 COMPETITOR LIFECYCLE SEMANTICS

EXECUTION FLOW:

request submitted

→ org validation

→ permission validation

→ risk classification

→ approval evaluation

→ provider constraint checks

→ execution dispatch

→ provider response validation

→ result logging

→ execution audit persistence

RULES:

- execution is policy-controlled

- approvals may interrupt flow

- retries require safeguards

- provider failures are isolated

- execution history immutable

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- retry policies

- execution cancellation

- rollback actions

- execution concurrency limits

- provider timeout policies

- execution priority queues

- partial execution handling

- execution deduplication strategy

- provider rate limit recovery

- execution replay protection

- distributed execution coordination

- long-running execution handling

- failed approval expiration

- execution batching

- provider health degradation handling

- emergency stop policies

REQUIRED BEFORE SCALE:

- canonical execution governance

- retry orchestration strategy

- rollback policy framework

- provider failure recovery model

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- provider execution succeeded fully

- approvals are always valid

- retries are harmless

- execution is idempotent automatically

- provider APIs are deterministic

- frontend state reflects actual execution

- permissions remain valid during execution

- risk levels are static

RISKS:

- duplicate execution

- unauthorized actions

- provider-side drift

- partial automation failure

- execution replay

- approval bypass

- irreversible provider mutations

- inconsistent operational state

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- POST /api/v1/execution/validate

- POST /api/v1/execution/approve

- POST /api/v1/execution/reject

- POST /api/v1/execution/retry

- POST /api/v1/execution/cancel

- GET /api/v1/execution/history

- GET /api/v1/execution/:id

- GET /api/v1/execution/pending

- POST /api/v1/execution/rollback

- POST /api/v1/execution/simulate

MISSING STATES:

- awaiting_approval

- partially_executed

- rollback_required

- retry_pending

- execution_timeout

- provider_failure

- validation_failed

- execution_blocked

- risk_override_required

- duplicate_execution_detected

---

## 🌐 REQUIRED BACKEND CONTRACTS

EXECUTION VALIDATION CONTRACT:

INPUT:

- org_id

- clerk_user_id

- action_type

- provider

- payload

OUTPUT:

- allowed

- risk_level

- approval_required

- validation_errors[]

RULES:

- backend-only validation

- deterministic enforcement required

- org isolation mandatory

---

RISK ENGINE CONTRACT:

INPUT:

- action

- provider

- budget

- automation_scope

OUTPUT:

- risk_level

- recommended_policy

- override_required

RULES:

- centralized risk evaluation only

- risk policies versioned

- audit required

---

EXECUTION DISPATCH CONTRACT:

INPUT:

- validated_action

- provider_payload

OUTPUT:

- execution_id

- provider_response

- execution_status

RULES:

- provider execution isolated

- retries controlled centrally

- provider errors normalized

---

AUDIT CONTRACT:

INPUT:

- execution_id

- actor_id

- org_id

- action

- risk_level

- result

OUTPUT:

- immutable_execution_log

RULES:

- ALL executions logged

- failures logged equally

- approval chain preserved

---

## 🗄️ REQUIRED TABLES

execution_requests

execution_results

execution_audit_logs

execution_risk_scores

execution_approvals

execution_overrides

execution_failures

execution_retries

execution_provider_logs

execution_validation_logs

execution_policies

execution_rate_limits

execution_lock_state

provider_constraints

provider_health

execution_rollbacks

execution_conflicts

execution_priority_queue

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- execution dashboards

- execution history tables

- approval UIs

- risk badges

- execution logs rendering

- loading/error/empty states

- execution filters

- retry buttons

- approval workflows UI

- status visualization

CLAUDE MUST NOT IMPLEMENT:

- execution authority

- provider execution engine

- risk evaluation engine

- approval enforcement engine

- rollback orchestration

- provider authentication handling

- concurrency coordination

- execution replay protection

---

## 🛡️ GOVERNANCE BOUNDARIES

EXECUTION GOVERNANCE:

- execution policies centralized

- approval chains immutable

- risk decisions auditable

- provider interactions traceable

- execution logs non-editable

SECURITY:

- strict org isolation mandatory

- backend-only execution authority

- provider secrets server-side only

- no frontend execution tokens

COMPLIANCE:

- execution history retained

- approval logs immutable

- override actions traceable

- failed executions auditable

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- autonomous execution

- AI-triggered execution

- self-healing execution systems

- adaptive risk scoring AI

- automatic override approval

- AI-generated execution plans

- autonomous provider switching

RULE:

- execution authority must remain deterministic initially

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend provider execution

- direct AI execution authority

- uncached execution retries

- hidden approval bypasses

- automatic high-risk execution

- provider API calls from browser

- execution without audit logs

- silent retries

- cross-org execution context

- execution outside central engine

---