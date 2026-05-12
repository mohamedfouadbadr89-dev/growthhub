MCP ORCHESTRATION LAYER

PURPOSE:

* control how AI uses tools
* enforce deterministic behavior
* prevent hallucination & unsafe execution
* enable multi-step reasoning

⸻

⚠️ CORE PRINCIPLE

MCP ≠ tool calling
MCP = controlled execution system

AI does NOT randomly call tools
ORCHESTRATION layer decides when & how

⸻

🧠 EXECUTION FLOW

1. INPUT CLASSIFICATION

IF user intent =

* data request → FETCH
* analysis → ANALYZE
* optimization → RECOMMEND
* action → SUGGEST (NOT EXECUTE)

⸻

2. TOOL SELECTION RULES

IF request contains:

* “campaign”, “roas”, “spend”
    → use get_campaigns
* “creative”, “ad”, “hook”
    → use get_creatives
* “action”, “optimization”, “fix”
    → use get_actions

RULES:

* NEVER call multiple tools blindly
* ALWAYS validate necessity
* LIMIT tool calls per request (max = 3)

⸻

3. EXECUTION MODES

MODE 1 — DIRECT RESPONSE

IF answer can be generated from context
→ NO tool call

⸻

MODE 2 — SINGLE TOOL

IF user asks for specific data

Example:
“show top campaigns”

→ call get_campaigns

⸻

MODE 3 — MULTI-STEP (CRITICAL)

IF request requires reasoning

Example:
“why my campaigns are bad?”

FLOW:

1. get_campaigns
2. detect low ROAS
3. get_creatives (optional)
4. analyze
5. respond with insight

⸻

🔁 MULTI-STEP ENGINE

RULES:

* each step MUST validate previous output
* STOP if data is insufficient
* DO NOT hallucinate missing data
* chain max steps = 3

⸻

🧠 RESPONSE TYPES

DATA RESPONSE

* raw structured data
* minimal explanation

⸻

INSIGHT RESPONSE

* root cause
* explanation
* no execution

⸻

RECOMMENDATION RESPONSE

* clear action
* expected impact
* confidence score

⸻

🚫 EXECUTION RULES

* AI MUST NOT execute actions
* AI MUST NOT call execution APIs
* AI MUST only suggest

Execution handled by:
→ /actions API only

⸻

🔒 SAFETY LAYER

BLOCK IF:

* missing org_id
* no data returned
* tool failure
* prompt injection detected

⸻

🧠 CONTEXT MANAGEMENT

INPUT:

* user prompt
* org_id
* last queries (optional)

RULES:

* limit context size
* prioritize recent data
* NEVER mix orgs

⸻

⚡ PERFORMANCE RULES

* prefer cached data
* avoid repeated tool calls
* timeout per tool = 5s

⸻

🧠 TOOL GOVERNANCE

TOOLS MUST:

* return structured data
* be scoped by org_id
* have clear input schema

⸻

🔁 FALLBACK

IF tool fails:

1. retry once
2. fallback to cached data
3. if still fail → return safe message

⸻

🧠 CONFIDENCE SYSTEM

each response MUST include:

* confidence_score (0 → 1)

LOW confidence IF:

* missing data
* partial results

⸻

🔗 DECISION INTEGRATION

AI MUST:

* read decision signals if available
* prioritize high-impact insights

⸻

🧨 CRITICAL RULES

* NO hallucination
* NO guessing
* NO execution
* NO cross-org data
* NO auto AI

⸻

🧠 FINAL OUTPUT FORMAT

{
type: “data” | “insight” | “recommendation”,
result: {},
confidence_score: number
}

⸻

🚀 SUMMARY

This layer:

* turns AI into agent
* controls tool usage
* enables safe reasoning
* prevents chaos

## 🔗 DASHBOARD GENERATION

WHEN:

- prompt contains "dashboard"
- or "show performance"

THEN:

- call get_campaigns
- call get_creatives
- aggregate data
- return structured dashboard


## ⚡ RUNTIME TRUTH

ORCHESTRATION IS:

- deterministic

- policy-driven

- context-sensitive

- tool-governed

- reliability-critical

RULES:

- orchestration decides execution path

- AI reasoning is constrained by policies

- tools are capability-scoped

- multi-step reasoning increases failure risk

- orchestration quality determines trustworthiness

SYSTEM TRUTH PRIORITY:

1. orchestration policy

2. org isolation

3. tool validation

4. structured tool output

5. reasoning engine

6. final response formatting

NEVER:

- allow unconstrained tool usage

- let AI choose arbitrary execution flows

- trust incomplete tool outputs

- continue multi-step chains blindly

- mix reasoning and execution authority

---

## 🔄 COMPETITOR LIFECYCLE

ORCHESTRATION FLOW:

intent detection

→ execution classification

→ policy validation

→ tool necessity validation

→ orchestration planning

→ tool execution

→ response validation

→ reasoning synthesis

→ confidence scoring

→ structured response delivery

MULTI-STEP FLOW:

request

→ fetch data

→ validate completeness

→ optional enrichment

→ reasoning

→ recommendation synthesis

→ confidence scoring

RULES:

- orchestration must remain deterministic

- every step validated independently

- response generation separated from execution

- orchestration policy centrally governed

REFERENCE MODELS:

- Anthropic MCP orchestration

- LangChain agent planning

- OpenAI function routing

- Retool workflow governance

- Temporal deterministic workflows

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- orchestration policy versioning

- reasoning graph structure

- intent confidence thresholds

- retry escalation logic

- chain interruption semantics

- hallucination scoring

- orchestration observability

- reasoning replayability

- fallback prioritization

- cache invalidation hierarchy

- orchestration state persistence

- tool conflict resolution

- multi-tool dependency graphs

- reasoning timeout escalation

- tool prioritization weighting

- safe degradation logic

- structured recommendation schema

- recommendation confidence calibration

REQUIRED BEFORE SCALE:

- orchestration governance framework

- canonical reasoning lifecycle

- deterministic orchestration policy model

- orchestration observability system

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- AI reasoning is reliable by default

- tools always return valid data

- orchestration chains are deterministic automatically

- confidence scores equal truth

- more tools improve answers

- cached responses remain accurate indefinitely

- multi-step reasoning guarantees better insights

RISKS:

- hallucinated reasoning chains

- infinite orchestration loops

- invalid recommendations

- misleading confidence scores

- excessive tool costs

- stale cached insights

- cross-tool inconsistency

- unsafe autonomous behavior

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- POST /api/v1/orchestration/plan

- POST /api/v1/orchestration/validate

- POST /api/v1/orchestration/cancel

- GET /api/v1/orchestration/policies

- GET /api/v1/orchestration/executions

- GET /api/v1/orchestration/traces

- GET /api/v1/orchestration/confidence

- POST /api/v1/orchestration/replay

- POST /api/v1/orchestration/cache/invalidate

- GET /api/v1/orchestration/health

MISSING STATES:

- planning

- awaiting_tool

- insufficient_data

- reasoning_failed

- hallucination_risk

- partial_reasoning

- degraded_mode

- cache_fallback

- validation_failed

- orchestration_blocked

MISSING FILTERS:

- orchestration_mode

- confidence_level

- execution_depth

- reasoning_type

- tool_chain

- provider

- org_id

---

## 🌐 REQUIRED BACKEND CONTRACTS

ORCHESTRATION CONTRACT:

INPUT:

- org_id

- prompt

- context

- orchestration_policy

- available_tools[]

OUTPUT:

- execution_plan

- selected_tools[]

- reasoning_mode

- validation_status

RULES:

- deterministic planning required

- tool necessity validation mandatory

- org isolation enforced

---

MULTI-STEP CONTRACT:

INPUT:

- prior_step_output

- orchestration_state

- confidence_score

OUTPUT:

- next_step

- stop_reason

- validation_result

RULES:

- max chain depth enforced

- every step validated

- insufficient data terminates chain

---

CONFIDENCE CONTRACT:

INPUT:

- data_completeness

- tool_health

- attribution_quality

- reasoning_quality

OUTPUT:

- confidence_score

- confidence_factors[]

- warning_flags[]

RULES:

- confidence explainable

- no fabricated certainty

- low-confidence explicitly surfaced

---

RECOMMENDATION CONTRACT:

INPUT:

- validated_data

- reasoning_output

- orchestration_policy

OUTPUT:

- recommendation

- expected_impact

- confidence_score

- supporting_signals[]

RULES:

- recommendation ≠ execution

- no autonomous action execution

- evidence-linked responses only

---

## 🗄️ REQUIRED TABLES

orchestration_policies

orchestration_executions

orchestration_traces

orchestration_steps

orchestration_failures

orchestration_cache

orchestration_rules

orchestration_rate_limits

reasoning_graphs

reasoning_sessions

reasoning_confidence

reasoning_failures

tool_selection_logs

tool_validation_logs

intent_classifications

execution_plans

fallback_events

hallucination_flags

response_validations

dashboard_generation_logs

dashboard_widget_bindings

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- orchestration dashboards

- execution trace viewers

- reasoning visualizations

- confidence indicators

- orchestration monitoring

- tool-chain visual flows

- recommendation UI

- dashboard widgets

- loading/error/fallback states

CLAUDE MUST NOT IMPLEMENT:

- autonomous execution engines

- recursive self-improving orchestration

- unrestricted multi-agent systems

- self-modifying orchestration rules

- execution authority bypass

- unrestricted tool chaining

- autonomous budget execution

- autonomous campaign optimization

RULE:

- orchestration controls AI

- AI does NOT control orchestration

---

## 🛡️ GOVERNANCE BOUNDARIES

ORCHESTRATION GOVERNANCE:

- orchestration rules immutable historically

- reasoning traces auditable

- confidence scoring reproducible

- tool chains traceable

SECURITY:

- org isolation mandatory

- orchestration policy server-side only

- execution permissions enforced

- prompt injection filtering required

COMPLIANCE:

- orchestration history retained

- recommendations attributable

- dashboard generations reproducible

- reasoning lineage preserved

RULES:

- every orchestration auditable

- every recommendation explainable

- every tool call attributable

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- autonomous execution agents

- recursive self-planning systems

- self-improving orchestration

- unrestricted multi-agent collaboration

- autonomous optimization loops

- self-modifying reasoning graphs

- AI-controlled execution permissions

- autonomous business actions

RULE:

- reliability before autonomy

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- unrestricted orchestration loops

- frontend orchestration engines

- hidden tool chains

- automatic execution APIs

- unconstrained multi-agent execution

- self-modifying orchestration policies

- hallucinated confidence scores

- cross-org orchestration context

- direct execution from recommendations

- autonomous action triggering

RULE:

- orchestration is controlled infrastructure

- NOT autonomous intelligence


Legacy decisions table is deprecated.
ai_decisions is the canonical AI decision system.
No new runtime writers may target the legacy decisions table.
---