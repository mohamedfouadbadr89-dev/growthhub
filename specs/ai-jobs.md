## 🧠 AI BACKGROUND JOBS

PURPOSE:
- run AI outside user requests

JOBS:
- generate actions
- generate recommendations
- refresh insights
- detect anomalies

TRIGGERS:
- cron (every X hours)
- manual trigger

RULES:
- NO AI on GET
- NO AI per request
- ALL results cached

CACHE:
- key: org_id + entity_id + type
- TTL:
  insights → 24h
  recommendations → 12h

FLOW:
1. fetch data
2. run AI via OpenRouter
3. store result in DB/cache
4. reuse in UI

FAILSAFE:
- if AI fails → keep old data

## 🔗 SYSTEM INTEGRATION (CRITICAL)

AI jobs MUST feed:

- decision engine
- alerts engine
- actions engine

---

RULE:

- AI MUST NOT create final outputs directly for UI
- AI MUST create structured signals ONLY

FLOW:

AI → signals → decisions → actions → execution

## ⚠️ JOB IDEMPOTENCY

RULE:

- same job MUST NOT run twice for same org + type within window

KEY:

- org_id + job_type + time_window

---

IF already executed:
→ skip

## ⏱️ JOB PRIORITY

types:

- critical (alerts / anomalies) → near real-time
- standard (recommendations) → scheduled
- low (insights refresh) → batch

---

RULE:

- critical jobs MUST preempt others


## ⚡ EVENT-DRIVEN JOBS

TRIGGERS:

- decision_created
- alert_triggered
- campaign_updated

---

RULE:

- jobs MUST NOT rely on cron only
- MUST react to system events


## ⚡ RUNTIME TRUTH

AI BACKGROUND JOBS ARE:

- asynchronous

- event-sensitive

- cache-dependent

- reliability-critical

- eventually consistent

RULES:

- AI jobs produce signals, NOT final UI

- recommendations decay over time

- anomaly detection quality depends on data freshness

- jobs may execute with partial system state

- event-driven execution reduces stale intelligence

SYSTEM TRUTH PRIORITY:

1. verified source data

2. event stream integrity

3. orchestration policy

4. cached AI signals

5. decision engine

6. UI consumption layer

NEVER:

- generate UI-facing conclusions directly from jobs

- execute AI synchronously on dashboards

- trust stale recommendations blindly

- allow duplicate job execution

---

## 🔄 COMPETITOR LIFECYCLE

AI JOB FLOW:

event / cron

→ job scheduler

→ idempotency validation

→ data aggregation

→ orchestration layer

→ AI execution

→ signal normalization

→ confidence scoring

→ cache persistence

→ decision engine ingestion

→ alerts/actions generation

ANOMALY FLOW:

metric deviation

→ threshold validation

→ anomaly detection

→ confidence calculation

→ alert signal

→ decision engine

→ recommended actions

RULES:

- signals are intermediate intelligence

- actions require downstream validation

- recommendations separated from execution

- AI jobs must remain reproducible

REFERENCE MODELS:

- Datadog anomaly pipelines

- Triple Whale intelligence refresh

- Northbeam async attribution pipelines

- Temporal workflow orchestration

- Airflow event-driven DAG patterns

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- signal versioning

- anomaly confidence methodology

- recommendation freshness scoring

- stale signal thresholds

- retry escalation policy

- job cancellation semantics

- distributed job locking

- signal lineage tracking

- orchestration replayability

- model version governance

- AI degradation handling

- event deduplication

- cron drift handling

- queue prioritization policies

- cross-job dependencies

- anomaly suppression rules

- recommendation conflict resolution

- signal expiration lifecycle

REQUIRED BEFORE SCALE:

- canonical signal framework

- job orchestration governance

- anomaly taxonomy

- AI lifecycle management model

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- AI signals are always accurate

- cron timing guarantees freshness

- cached recommendations remain valid

- anomalies imply root cause certainty

- one signal source is sufficient

- event streams are complete

- background AI is cheaper operationally

RISKS:

- stale recommendations

- duplicated jobs

- alert storms

- false anomaly detection

- contradictory recommendations

- invalid decision signals

- runaway compute costs

- delayed business reactions

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- POST /api/v1/jobs/execute

- POST /api/v1/jobs/retry

- POST /api/v1/jobs/cancel

- GET /api/v1/jobs/status

- GET /api/v1/jobs/history

- GET /api/v1/jobs/queue

- GET /api/v1/signals

- GET /api/v1/signals/history

- POST /api/v1/signals/recompute

- POST /api/v1/anomalies/acknowledge

- GET /api/v1/anomalies

- GET /api/v1/recommendations

MISSING STATES:

- queued

- running

- skipped

- stale_signal

- retrying

- degraded_ai

- awaiting_dependencies

- partial_signal

- anomaly_pending

- duplicate_prevented

- expired_signal

MISSING FILTERS:

- job_type

- signal_type

- priority

- execution_status

- anomaly_type

- org_id

- freshness_window

---

## 🌐 REQUIRED BACKEND CONTRACTS

AI JOB CONTRACT:

INPUT:

- org_id

- job_type

- trigger_source

- execution_window

- orchestration_policy

OUTPUT:

- job_id

- signal_ids[]

- execution_status

- cache_status

- confidence_scores[]

RULES:

- idempotency enforced

- async execution only

- execution fully auditable

---

SIGNAL CONTRACT:

INPUT:

- validated_data

- ai_output

- orchestration_metadata

OUTPUT:

- signal_type

- signal_payload

- confidence_score

- expiration_window

RULES:

- structured output only

- no direct UI prose

- versioned signals required

---

ANOMALY CONTRACT:

INPUT:

- historical_metrics

- realtime_metrics

- thresholds

- attribution_context

OUTPUT:

- anomaly_type

- severity

- confidence_score

- affected_entities[]

RULES:

- deterministic thresholds preferred

- anomaly reproducible

- explainability required

---

JOB IDEMPOTENCY CONTRACT:

INPUT:

- org_id

- job_type

- execution_window

OUTPUT:

- execution_allowed

- prior_job_id

- deduplication_status

RULES:

- duplicate prevention mandatory

- distributed locking required

- replay-safe execution

---

## 🗄️ REQUIRED TABLES

ai_jobs

ai_job_runs

ai_job_locks

ai_job_failures

ai_job_retries

ai_job_priorities

ai_job_schedules

ai_job_events

ai_signals

ai_signal_versions

ai_signal_cache

ai_signal_expiration

anomaly_events

anomaly_scores

recommendation_signals

decision_signals

signal_lineage

signal_dependencies

job_execution_traces

job_orchestration_logs

job_queue_metrics

signal_confidence

event_processing_logs

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- job monitoring dashboards

- signal visualizations

- anomaly tables

- execution logs UI

- retry buttons

- queue visualizations

- signal confidence indicators

- stale signal warnings

- loading/error/fallback states

CLAUDE MUST NOT IMPLEMENT:

- autonomous action execution

- recursive job spawning

- self-modifying AI jobs

- unrestricted anomaly generation

- autonomous budget allocation

- uncontrolled AI orchestration

- direct execution pipelines

- hidden signal mutation

RULE:

- AI generates signals

- NOT autonomous business execution

---

## 🛡️ GOVERNANCE BOUNDARIES

AI JOB GOVERNANCE:

- job runs immutable historically

- signal lineage traceable

- anomaly logic auditable

- recommendation generation reproducible

SECURITY:

- org isolation mandatory

- queue permissions enforced

- AI execution server-side only

- event ingestion validated

COMPLIANCE:

- signal history retained

- anomaly triggers logged

- recommendations attributable

- execution traces immutable

RULES:

- every signal explainable

- every job attributable

- every anomaly reproducible

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- autonomous decision execution

- self-prioritizing AI systems

- recursive signal generation

- autonomous anomaly remediation

- self-improving orchestration

- autonomous strategic planning

- multi-agent job ecosystems

- AI-controlled execution queues

RULE:

- intelligence before autonomy

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- AI jobs on GET requests

- synchronous dashboard AI generation

- uncached recommendation generation

- duplicate concurrent job execution

- direct UI rendering from AI jobs

- cross-org signal contamination

- autonomous action triggering

- hidden recommendation mutations

- unrestricted AI retries

- frontend AI orchestration

RULE:

- background AI produces governed signals

- NOT uncontrolled automation

---