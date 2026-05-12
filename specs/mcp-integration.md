
## 🔌 MCP INTEGRATION

PURPOSE:
- expose system tools to AI via MCP

---

## 🌐 MCP SERVER ENDPOINTS

GET /api/v1/mcp/tools
POST /api/v1/mcp/execute

---

## 🧠 TOOL SCHEMA

example:

{
  "name": "get_campaigns",
  "description": "Fetch campaign performance",
  "input_schema": {
    "type": "object",
    "properties": {
      "date_range": { "type": "string" }
    }
  }
}

---

## 🔄 EXECUTION FLOW

Claude → MCP Client → MCP Server → API → DB → Response

---

## 🔐 SECURITY

- allowlist tools only
- validate input
- no dynamic execution
- rate limit per tool

---

## ⚠️ IMPORTANT

- MCP = TOOL ACCESS ONLY
- NOT execution engine


## ⚡ RUNTIME TRUTH

MCP IS:

- tool-access infrastructure

- permission-sensitive

- schema-dependent

- execution-proxied

- security-critical

RULES:

- MCP does NOT execute business logic directly

- MCP only exposes approved tools

- tools are provider-facing abstractions

- tool outputs may vary structurally

- tool availability changes dynamically

SYSTEM TRUTH PRIORITY:

1. tool allowlist

2. permission validation

3. schema validation

4. API execution

5. database truth

6. tool response formatting

NEVER:

- treat MCP as autonomous execution

- expose raw DB access through MCP

- allow arbitrary tool invocation

- bypass schema validation

---

## 🔄 COMPETITOR LIFECYCLE

MCP FLOW:

tool registration

→ schema validation

→ capability exposure

→ provider discovery

→ execution request

→ permission validation

→ API execution

→ response normalization

→ audit logging

→ cached response delivery

RULES:

- tools are versioned

- tool schemas immutable historically

- providers consume structured contracts

- execution fully auditable

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- tool versioning

- capability registry

- tool deprecation lifecycle

- schema migration rules

- tool permission inheritance

- execution timeout policies

- retry behavior

- response normalization

- streaming semantics

- tool health monitoring

- execution observability

- cache invalidation rules

- org-level tool permissions

- execution trace retention

- concurrency limits

- tool dependency graphs

- execution sandboxing

- structured error contracts

REQUIRED BEFORE SCALE:

- canonical tool registry

- tool governance framework

- execution observability model

- capability lifecycle standards

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- all tools are safe

- provider input is trustworthy

- schemas remain stable

- tool outputs are deterministic

- tool permissions are static

- MCP tools should expose internal APIs

- execution responses are frontend-safe

RISKS:

- unsafe tool execution

- privilege escalation

- malformed responses

- schema drift

- org data leakage

- execution loops

- insecure provider access

- broken dashboard rendering

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/mcp/capabilities

- GET /api/v1/mcp/tools/:id

- POST /api/v1/mcp/validate

- POST /api/v1/mcp/test

- POST /api/v1/mcp/disable

- GET /api/v1/mcp/executions

- GET /api/v1/mcp/health

- GET /api/v1/mcp/audit

- POST /api/v1/mcp/cache/invalidate

MISSING STATES:

- tool_disabled

- schema_invalid

- execution_timeout

- permission_denied

- provider_unavailable

- partial_execution

- stale_tool

- deprecated_tool

- unhealthy_tool

- awaiting_validation

MISSING FILTERS:

- provider

- tool_category

- execution_status

- org_id

- capability_type

- tool_version

---

## 🌐 REQUIRED BACKEND CONTRACTS

TOOL REGISTRY CONTRACT:

INPUT:

- tool_definition

- schema

- permissions

- provider_compatibility

OUTPUT:

- tool_id

- version

- validation_status

RULES:

- schemas validated before registration

- immutable versioning required

- org-safe exposure only

---

MCP EXECUTION CONTRACT:

INPUT:

- org_id

- tool_name

- provider

- payload

- execution_context

OUTPUT:

- execution_id

- normalized_response

- validation_status

- execution_metadata

RULES:

- allowlist-only execution

- no dynamic code execution

- audit logging mandatory

- permission validation mandatory

---

TOOL VALIDATION CONTRACT:

INPUT:

- schema

- payload

- provider_context

OUTPUT:

- validation_result

- violations[]

- normalized_payload

RULES:

- strict schema enforcement

- reject invalid payloads

- sanitize unsafe input

---

## 🗄️ REQUIRED TABLES

mcp_tools

mcp_tool_versions

mcp_tool_permissions

mcp_tool_registry

mcp_execution_logs

mcp_execution_cache

mcp_tool_health

mcp_tool_audit

mcp_provider_mapping

mcp_capabilities

mcp_schema_versions

mcp_execution_failures

mcp_rate_limits

mcp_permission_matrix

mcp_validation_logs

mcp_tool_dependencies

mcp_tool_usage

mcp_execution_traces

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- tool discovery UI

- MCP dashboards

- execution logs UI

- tool catalog

- schema viewers

- loading/error states

- capability tables

- execution monitoring

- permission indicators

CLAUDE MUST NOT IMPLEMENT:

- unrestricted tool execution

- arbitrary code execution

- provider-side sandboxing

- autonomous tool chaining

- schema mutation engines

- permission escalation

- unsafe runtime execution

- direct DB execution tools

RULE:

- MCP exposes tools

- NOT unrestricted runtime execution

---

## 🛡️ GOVERNANCE BOUNDARIES

MCP GOVERNANCE:

- tool schemas versioned

- execution logs immutable

- tool permissions auditable

- capability changes traceable

SECURITY:

- org-level isolation mandatory

- allowlist-only tools

- strict schema validation

- server-side execution only

COMPLIANCE:

- execution history retained

- tool usage logged

- schema changes auditable

- provider access traceable

RULES:

- all tool executions attributable

- all responses normalized

- all tool permissions enforced

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- autonomous tool orchestration

- recursive tool chaining

- self-registering tools

- self-modifying schemas

- unrestricted agent execution

- provider-generated tools

- dynamic runtime code execution

- autonomous capability discovery

RULE:

- controlled infrastructure first

- autonomy later

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- direct SQL tools exposed via MCP

- unrestricted shell execution

- dynamic eval execution

- frontend MCP execution

- provider-controlled permissions

- raw DB access from providers

- auto-generated tools

- hidden tool mutation

- uncached execution storms

- org-unscoped tool access

RULE:

- MCP is controlled tool exposure

- NOT autonomous infrastructure

---