## 🤖 AI CONNECTORS LAYER

PURPOSE:
- unify all AI providers (Claude / OpenAI / Open-source)
- enable MCP + function calling hybrid

---

## 🔌 PROVIDERS

providers:

- claude (MCP native)
- openai (function calling)
- openrouter (multi-model)
- open_source (custom agent runtime)

---

## 🔑 AUTH MODE

AUTH_MODE: BYOK_ONLY

RULES:
- user MUST provide API key
- NO platform credits usage
- keys stored in Supabase Vault
- NEVER exposed to frontend

SUPPORTED KEYS:

- anthropic_key
- openai_key
- openrouter_key

---

## ⚙️ EXECUTION ENGINE

IF provider = claude
→ use MCP server

IF provider = openai
→ convert tools → function calling

IF provider = open_source
→ agent runtime

---

## 🧠 TOOL REGISTRY (UNIFIED)

ALL tools must follow:

{
  name: string
  description: string
  input_schema: object
}

---

## 🔄 EXECUTION FLOW

User → AI → Tool Call → API → DB → Response → AI → UI

---

## ⚠️ RULES

- NO AI execution on GET
- AI triggered ONLY via POST
- ALL responses cached
- rate limit per org + user


## ⚡ RUNTIME TRUTH

AI CONNECTORS ARE:

- provider-dependent

- schema-sensitive

- latency-variable

- capability-asymmetric

- security-critical

RULES:

- providers expose different tool semantics

- MCP ≠ function calling

- model behavior differs structurally

- provider reliability fluctuates

- tool compatibility is not universal

SYSTEM TRUTH PRIORITY:

1. org authentication

2. BYOK validation

3. provider availability

4. tool schema validation

5. orchestration policy

6. cached AI outputs

NEVER:

- assume provider parity

- expose provider keys to frontend

- trust provider outputs blindly

- bypass connector normalization

- execute AI directly from UI

---

## 🔄 COMPETITOR LIFECYCLE

CONNECTOR FLOW:

BYOK validation

→ vault retrieval

→ provider routing

→ tool normalization

→ execution orchestration

→ provider execution

→ structured response validation

→ caching

→ audit logging

→ UI delivery

CLAUDE FLOW:

request

→ MCP translation

→ tool execution

→ structured response

OPENAI FLOW:

request

→ function conversion

→ function execution

→ structured response

OPEN SOURCE FLOW:

request

→ runtime orchestration

→ agent execution

→ normalized response

RULES:

- connectors abstract provider differences

- orchestration independent from provider

- execution fully auditable

- responses normalized before UI

REFERENCE MODELS:

- Anthropic MCP ecosystem

- OpenAI function calling

- LangChain provider abstraction

- Vercel AI SDK

- LiteLLM routing architecture

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- provider failover policy

- model capability registry

- connector health scoring

- streaming normalization

- token accounting methodology

- tool compatibility matrix

- execution timeout hierarchy

- provider-specific retries

- model deprecation lifecycle

- response normalization schemas

- provider quota tracking

- tool translation conflicts

- cross-provider caching strategy

- execution observability

- provider cost governance

- connector versioning

- multimodal support lifecycle

- structured output guarantees

REQUIRED BEFORE SCALE:

- canonical connector abstraction layer

- provider governance framework

- capability compatibility registry

- unified execution schema

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- all providers support tools equally

- MCP and function calling behave identically

- structured outputs are guaranteed

- provider latency is stable

- cached outputs remain universally valid

- open-source runtimes are deterministic

- provider safety layers are sufficient

RISKS:

- provider drift

- malformed tool calls

- inconsistent reasoning quality

- execution incompatibility

- hidden token cost explosions

- schema mismatches

- unstable orchestration behavior

- broken dashboard rendering

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/ai/providers

- GET /api/v1/ai/models

- GET /api/v1/ai/provider-health

- POST /api/v1/ai/validate-key

- POST /api/v1/ai/cache/invalidate

- GET /api/v1/ai/tool-compatibility

- GET /api/v1/ai/execution-history

- POST /api/v1/ai/provider-test

- POST /api/v1/ai/fallback

- GET /api/v1/ai/provider-metrics

MISSING STATES:

- provider_degraded

- provider_unavailable

- invalid_api_key

- quota_exceeded

- incompatible_tool

- normalization_failed

- partial_response

- cache_hit

- stale_response

- awaiting_provider

MISSING FILTERS:

- provider

- model

- execution_mode

- org_id

- cache_status

- latency_bucket

- connector_version

---

## 🌐 REQUIRED BACKEND CONTRACTS

CONNECTOR CONTRACT:

INPUT:

- org_id

- provider

- model

- prompt

- tools[]

- execution_mode

OUTPUT:

- execution_id

- normalized_response

- provider_metadata

- cache_status

RULES:

- backend-only execution

- BYOK validation mandatory

- normalized outputs required

- provider abstraction enforced

---

TOOL NORMALIZATION CONTRACT:

INPUT:

- unified_tool_schema

- provider

- provider_capabilities

OUTPUT:

- provider_tool_payload

- compatibility_status

RULES:

- unified schema source of truth

- provider-safe conversion required

- unsupported tools rejected safely

---

PROVIDER HEALTH CONTRACT:

INPUT:

- provider

- execution_metrics

- latency

- failure_rate

OUTPUT:

- provider_health_score

- availability_status

- degradation_flags[]

RULES:

- health continuously monitored

- degraded providers flagged

- orchestration aware of health state

---

CACHE CONTRACT:

INPUT:

- org_id

- provider

- request_hash

- execution_context

OUTPUT:

- cached_response

- freshness_state

- expiration_time

RULES:

- provider-aware cache keys

- stale cache detectable

- org isolation mandatory

---

## 🗄️ REQUIRED TABLES

ai_providers

ai_provider_models

ai_provider_health

ai_provider_quotas

ai_provider_failures

ai_provider_metrics

ai_connector_versions

ai_execution_logs

ai_execution_cache

ai_execution_traces

ai_tool_registry

ai_tool_compatibility

ai_tool_normalization

ai_model_capabilities

ai_key_registry

ai_key_audit

ai_key_rotations

ai_rate_limits

ai_usage_tracking

ai_response_validation

ai_cost_tracking

ai_fallback_events

connector_orchestration_logs

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- provider selector UI

- connector dashboards

- provider health monitoring

- model capability tables

- execution logs UI

- cache indicators

- fallback state handling

- loading/error states

- usage analytics

- tool compatibility viewers

CLAUDE MUST NOT IMPLEMENT:

- provider-side orchestration engines

- unrestricted runtime execution

- autonomous provider switching

- self-modifying connector logic

- frontend AI routing

- direct provider API exposure

- unsafe open-source execution

- hidden execution retries

RULE:

- connectors unify providers

- NOT autonomous execution systems

---

## 🛡️ GOVERNANCE BOUNDARIES

CONNECTOR GOVERNANCE:

- provider mappings versioned

- tool schemas immutable historically

- execution logs auditable

- normalization deterministic

SECURITY:

- BYOK enforced

- provider keys vault-only

- org isolation mandatory

- no frontend provider access

COMPLIANCE:

- provider usage traceable

- execution history retained

- token usage auditable

- cache lineage reproducible

RULES:

- all executions attributable

- all providers normalized

- all connector behavior observable

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- autonomous provider optimization

- self-healing connector systems

- AI-controlled provider routing

- recursive provider chaining

- autonomous model switching

- self-modifying orchestration

- autonomous cost optimization

- unrestricted open-source agent runtimes

RULE:

- controlled abstraction first

- autonomous infrastructure later

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend provider execution

- exposed API keys

- uncached AI execution storms

- direct provider-specific UI logic

- hidden provider switching

- unrestricted agent runtime execution

- cross-org connector reuse

- automatic execution retries without limits

- raw provider response rendering

- GET-triggered AI execution

RULE:

- connectors abstract providers safely

- NOT expose raw AI infrastructure

---