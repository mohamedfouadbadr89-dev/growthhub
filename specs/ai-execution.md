## ⚙️ AI EXECUTION ENGINE

ENDPOINTS:

POST /api/v1/ai/execute
POST /api/v1/mcp/execute
GET /api/v1/mcp/tools

---

## EXECUTION LOGIC

if provider = claude:
  → MCP

if provider = openai:
  → function calling

if provider = open_source:
  → agent runtime

---

## RULES:

- NO AI on GET
- MUST use cache
- MUST validate org_id


## 🎯 DASHBOARD MODE

IF prompt contains:

- dashboard
- performance
- report

THEN:

- switch to dashboard_generator mode
- return widgets instead of text


RUNTIME TRUTH

AI EXECUTION IS:

- provider-dependent

- latency-sensitive

- tool-sensitive

- context-sensitive

- non-deterministic

RULES:

- MCP execution differs from function calling

- providers return structurally different outputs

- tool availability changes dynamically

- AI responses may partially fail

- dashboard generation is stateful

SYSTEM TRUTH PRIORITY:

1. execution validation

2. org authorization

3. tool permissions

4. cached outputs

5. provider responses

6. rendered UI

NEVER:

- trust raw provider output blindly

- expose tool execution directly to frontend

- execute AI from GET requests

- bypass org validation

---

## 🔄 COMPETITOR LIFECYCLE

AI EXECUTION FLOW:

request

→ auth validation

→ org validation

→ provider routing

→ tool discovery

→ capability validation

→ execution orchestration

→ structured response generation

→ caching

→ widget rendering

→ audit logging

DASHBOARD FLOW:

prompt

→ intent classification

→ dashboard mode routing

→ widget orchestration

→ data hydration

→ UI payload generation

RULES:

- dashboard mode requires structured outputs

- provider routing deterministic

- tools permission-scoped

- execution auditable

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- tool permission hierarchy

- MCP capability registry

- execution retries

- timeout policies

- streaming behavior

- provider fallback rules

- structured output schemas

- widget hydration lifecycle

- hallucination handling

- execution cancellation

- concurrency limits

- agent memory lifecycle

- prompt versioning

- execution trace persistence

- provider health scoring

- dashboard schema registry

- execution sandboxing

- tool failure recovery

- partial execution semantics

REQUIRED BEFORE SCALE:

- canonical execution schema

- provider abstraction model

- dashboard widget registry

- execution governance framework

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- all providers behave identically

- MCP tools are always available

- function calls are deterministic

- dashboard prompts are safe

- cached outputs always valid

- widget outputs structurally stable

- AI-generated dashboards are trustworthy

RISKS:

- unsafe tool execution

- malformed widgets

- hallucinated dashboards

- provider drift

- execution loops

- invalid cache reuse

- org data leakage

- broken UI hydration

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- POST /api/v1/ai/validate

- POST /api/v1/ai/cancel

- GET /api/v1/ai/providers

- GET /api/v1/ai/executions

- GET /api/v1/ai/executions/:id

- GET /api/v1/mcp/capabilities

- GET /api/v1/dashboard/widgets

- POST /api/v1/dashboard/render

- POST /api/v1/ai/retry

- POST /api/v1/ai/cache/invalidate

MISSING FILTERS:

- provider

- execution_status

- tool_type

- dashboard_mode

- execution_source

- latency_bucket

MISSING STATES:

- executing

- partial_success

- timeout

- cache_hit

- cache_stale

- tool_unavailable

- invalid_widget

- provider_degraded

- execution_cancelled

- awaiting_tools

---

## 🌐 REQUIRED BACKEND CONTRACTS

AI EXECUTION CONTRACT:

INPUT:

- org_id

- provider

- prompt

- tools[]

- execution_mode

OUTPUT:

- execution_id

- structured_response

- widgets[]

- cache_status

- execution_metadata

RULES:

- org validation mandatory

- backend-only execution

- execution fully auditable

- cache-aware execution

---

MCP EXECUTION CONTRACT:

INPUT:

- tool_id

- provider

- permissions

- execution_context

OUTPUT:

- tool_response

- execution_trace

- validation_status

RULES:

- permission-scoped tools only

- sandboxed execution

- trace logging mandatory

---

DASHBOARD GENERATION CONTRACT:

INPUT:

- dashboard_prompt

- org_context

- widget_registry

- datasource_registry

OUTPUT:

- widgets[]

- layout

- datasource_bindings

- render_schema

RULES:

- widgets only

- no raw hallucinated text

- schema validation required

- frontend-safe payload only

---

## 🗄️ REQUIRED TABLES

ai_executions

ai_execution_logs

ai_execution_cache

ai_provider_registry

ai_provider_health

mcp_tools

mcp_tool_permissions

mcp_execution_logs

dashboard_widget_registry

dashboard_render_jobs

dashboard_widget_cache

execution_failures

execution_traces

prompt_versions

tool_capabilities

tool_registry_versions

dashboard_schemas

widget_validation_logs

execution_rate_limits

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- provider routing UI

- dashboard widgets

- execution states

- loading/error states

- execution logs UI

- dashboard rendering

- widget hydration

- execution monitoring

- cache indicators

CLAUDE MUST NOT IMPLEMENT:

- unrestricted tool execution

- provider failover engines

- autonomous agent loops

- self-modifying prompts

- execution orchestration engines

- tool sandbox runtime

- unrestricted MCP access

- unsafe dashboard generation

---

## 🛡️ GOVERNANCE BOUNDARIES

AI GOVERNANCE:

- all executions logged

- prompt versions immutable

- tool executions auditable

- cache lineage traceable

SECURITY:

- org-level isolation mandatory

- tool permissions enforced

- provider secrets server-side only

- execution sandboxing mandatory

COMPLIANCE:

- execution history retained

- tool usage logged

- dashboard renders reproducible

- audit trail immutable

RULES:

- all AI outputs attributable

- all dashboard widgets schema-validated

- all tool executions permission-scoped

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- autonomous agents

- self-improving prompts

- multi-agent orchestration

- recursive tool execution

- autonomous dashboard mutation

- self-healing execution systems

- unrestricted AI planning

- persistent autonomous memory

RULE:

- orchestration before autonomy

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- AI execution on GET

- direct provider calls from frontend

- uncached dashboard generation

- unrestricted MCP execution

- frontend tool orchestration

- hidden prompt mutation

- raw provider output rendering

- automatic recursive execution

- org-unscoped AI execution

- unsafe widget rendering

RULE:

- execution is backend-governed

- NOT frontend-controlled

---
