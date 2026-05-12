# AI Operating Model — GrowthHub

Status: AUTHORITATIVE

Scope: Product Direction + AI Governance + Execution Philosophy

Priority: HIGH

Last Updated: 2026-05-12

---

# 1. Product Identity

GrowthHub is NOT a fully autonomous AI marketing platform.

GrowthHub is an:

"Approval-first AI co-pilot for paid acquisition."

The platform is designed around:

- operator trust

- explainable AI

- reversible automation

- bounded AI cost

- auditability

- controlled autonomy

The system MUST prioritize:

- reliability over hype

- sustainability over aggressive autonomy

- explainability over black-box execution

- operator approval over uncontrolled spend execution

---

# 2. Core Product Philosophy

The platform MUST follow:

HYBRID APPROVAL-FIRST AUTOMATION.

NOT:

- fully autonomous AI

- pure recommendation-only dashboards

- uncontrolled AI execution

GrowthHub operates as:

AI Suggests

→ Operator Reviews

→ Operator Approves

→ Engine Executes

→ System Audits

The operator always remains in control of spend-increasing actions.

---

# 3. AI Architecture Philosophy

The system SHALL operate under a 3-tier execution model.

---

## Tier 1 — Statistical + Rules Engine (No LLM)

Purpose:

continuous low-cost automation.

Characteristics:

- zero LLM cost

- rules-based

- statistical anomaly detection

- continuous execution

- economically scalable

Examples:

- ROAS anomaly detection

- spend spike detection

- pacing alerts

- threshold rules

- auto-pause safety rules

- KPI summaries

- performance monitoring

Tier 1 is the PRIMARY execution layer.

LLMs MUST NOT be required for core automation.

---

## Tier 2 — Scheduled AI Summaries

Purpose:

bounded-cost AI reasoning.

Characteristics:

- scheduled execution

- maximum ONE LLM digest per org per day

- AI summarizes events already detected by Tier 1

- reasoning MUST remain grounded in real metrics

Examples:

- daily digest

- AI summaries

- executive overview

- anomaly explanations

Tier 2 exists for synthesis and operator visibility.

NOT for continuous autonomous execution.

---

## Tier 3 — Operator-Triggered AI

Purpose:

high-value on-demand AI operations.

Characteristics:

- operator-triggered only

- credit-based

- bounded usage

- explicit cost control

Examples:

- conversational AI queries

- strategic recommendations

- anomaly explanations

- creative generation

- AI-generated ad copy

- AI-generated visuals

Tier 3 is the ONLY layer allowed to consume significant AI credits/tokens.

---

# 4. Autonomy Rules

The platform SHALL enforce action-class-based autonomy.

---

## Allowed Autonomous Actions

The following MAY auto-execute:

- anomaly alerts

- notifications

- read-only insights

- KPI summaries

- auto-pause safety rules

- spend reduction actions

- reversible low-risk actions

These MUST remain:

- fully auditable

- reversible

- logged

- idempotent

---

## Approval-Required Actions

The following MUST require operator approval by default:

- budget increases

- campaign launches

- audience expansion

- bid strategy changes

- creative publishing

- social posting

- cross-channel reallocations

- customer-facing communications

The AI MUST NEVER silently increase spend.

---

# 5. AI Trust Model

GrowthHub is an:

EXPLAINABLE AI SYSTEM.

Every AI decision MUST include:

- reasoning_steps

- confidence_score

- triggering data

- action classification

- audit history

- execution result

The platform MUST fail loudly, never silently.

---

# 6. Economic Model

The system MUST remain economically sustainable.

---

## Free / Included Operations

The following SHALL remain non-credit operations:

- statistical calculations

- anomaly detection

- rule matching

- action execution

- dashboards

- KPI monitoring

These are math/rules operations.

NOT LLM operations.

---

## Credit-Based Operations

The following SHALL consume credits:

- conversational AI

- strategic recommendations

- AI explanations

- creative generation

- advanced synthesis

- multi-step reasoning

---

# 7. LLM Cost Governance

The platform MUST implement:

- per-org rate limits

- bounded scheduled AI usage

- AI usage tracking

- AI budget protection

- operator-visible consumption metrics

LTD plans MUST use BYOK.

The platform MUST NOT absorb unlimited AI costs for LTD users.

---

# 8. Decision Center Philosophy

The Decision Center is NOT a passive feed.

The Decision Center SHALL function as:

AN APPROVAL QUEUE.

Operators MUST be able to:

- approve

- reject

- edit

- inspect reasoning

- inspect confidence

- inspect action previews

before high-risk actions execute.

---

# 9. Competitive Positioning

GrowthHub SHALL NOT position itself as:

- "fully autonomous AI"

- "replace your media buyer"

- "AI marketing manager"

GrowthHub SHALL position itself as:

"The AI co-pilot for paid acquisition."

Core messaging:

- AI that asks before it acts

- Every decision auditable

- Every action reversible

- Explainable automation

- Trust-first AI operations

---

# 10. MVP Direction

The MVP priority order SHALL be:

1. Approval Queue

2. Statistical Anomaly Engine

3. Daily Digest

4. AI Budget Tracking

5. Scheduled Sync Activation

6. Observability + Rate Limits

The following are explicitly DEFERRED:

- attribution platform expansion

- multi-channel beyond Meta/Google/Shopify

- fully autonomous execution

- Phase X broader unlocks

- aggressive frontend surface expansion

---

# 11. Hard Product Rules

The system MUST NEVER:

- silently increase ad spend

- execute irreversible high-risk actions autonomously

- allow unlimited AI usage without limits

- persist non-auditable AI decisions

- bypass AI Output Contract validation

- bypass approval requirements

- hide execution reasoning

---

# 12. Final Product Direction

GrowthHub SHALL become:

"A trustworthy AI operations layer for paid acquisition teams."

NOT:

- an autonomous black-box AI buyer

- a generic AI dashboard

- a pure creative-generation tool

The moat is:

- explainability

- auditability

- bounded autonomy

- execution safety

- operator trust

- AI governance

- economic sustainability


# 13. Governance + Execution Boundaries

---

## Runtime Truth

GrowthHub is currently:

- backend-heavy

- governance-locked

- partially surfaced in frontend

- execution-capable

- NOT yet fully operator-wired

The backend architecture is significantly more mature than the frontend surface.

Frontend mocked-shells are INTENTIONAL unless explicitly unlocked.

DEFERRED != MISSING.

---

## Competitor Lifecycle Reality

The industry repeatedly proved that:

- fully autonomous SMB ad-buying systems fail commercially

- operator-trust is more important than autonomy depth

- explainability beats black-box execution

- rules + statistics outperform continuous LLM execution economically

- AI cost explosions destroy SMB SaaS margins

GrowthHub MUST optimize for:

- sustainability

- trust

- reliability

- bounded AI execution

NOT hype-driven autonomy.

---

## Missing Semantics

The following concepts REQUIRE explicit semantics before implementation:

- approval thresholds

- reversible vs irreversible actions

- spend-risk classification

- action severity scoring

- AI confidence escalation

- org-level automation permissions

- per-plan AI budgets

- operator override policies

Claude MUST NOT invent these semantics autonomously.

---

## Dangerous Assumptions

Claude MUST NEVER assume:

- autonomous execution is desired by default

- all AI actions should auto-fire

- all frontend shells should be wired

- more AI usage equals better product value

- attribution infrastructure is required for MVP

- creative generation is the core moat

- LLMs should replace rules/statistics

- enterprise patterns are viable for SMB pricing

---

## Required Backend Contracts

The following backend concepts are REQUIRED before broad AI activation:

- approval queue contracts

- AI budget tracking

- per-org AI rate limiting

- anomaly classification contracts

- action-risk classification

- execution audit contracts

- AI usage ledger

- approval-state persistence

---

## Required Tables (Additive Only)

Potential additive tables allowed under governance:

- anomaly_seeds

- ai_usage_ledger

- approval_queue

- action_risk_profiles

- org_ai_limits

These MUST remain additive.

Existing canonical systems MUST NOT be replaced.

---

## Execution Boundaries

Claude MAY safely implement:

- additive migrations

- bounded observability

- approval queue infrastructure

- anomaly detection systems

- rate limits

- AI usage tracking

- audit improvements

- operator visibility improvements

- idempotency hardening

- scheduled bounded AI workflows

Claude MUST NOT autonomously implement:

- unrestricted autonomous execution

- uncontrolled cron-driven AI loops

- unlimited LLM execution

- attribution-engine rewrites

- speculative orchestration systems

- new parallel AI pipelines

- broad frontend rewrites

- architecture resets

---

## Governance Boundaries

The following REQUIRE explicit operator authorization:

- Phase unlocks

- wiring deferred frontend shells

- autonomous spend-increasing execution

- new platform expansions

- irreversible schema redesigns

- attribution architecture

- MCP broad unlocks

- removal of governance locks

- execution-policy relaxation

---

## What MUST Remain Deferred

The following remain intentionally deferred:

- fully autonomous ad-buying

- multi-platform expansion beyond current core

- enterprise orchestration layers

- speculative AI agent systems

- attribution platform competition

- aggressive social auto-posting

- uncontrolled creative auto-publishing

These are NOT missing features.

---

## What Should NEVER Exist

The platform MUST NEVER introduce:

- black-box autonomous spend escalation

- silent AI execution

- non-auditable AI actions

- unlimited AI execution loops

- hidden LLM costs

- parallel orchestration systems

- shadow AI pipelines

- direct frontend DB writes

- speculative AI agent swarms

- uncontrolled multi-agent execution

- non-idempotent action dispatch

- approval bypasses

- AI self-authorization systems

---

## Canonical Product Constraint

GrowthHub is fundamentally:

- an explainable automation platform

- an operator-trust platform

- a bounded AI execution system

NOT:

- an AGI ad buyer

- an autonomous growth hacker

- an unrestricted AI agent platform

- a black-box optimization engine