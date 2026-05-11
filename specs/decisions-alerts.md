decisions-alerts.md (FIXED)

🔒 SYSTEM ENFORCEMENT LAYER

AI_GATEWAY: REQUIRED
AI_SOURCE: API_GATEWAY_ONLY

RULES:

* ❌ NO direct AI calls from frontend
* ❌ NO AI generation on GET requests
* ❌ NO “if missing → generate”
* ✅ AI only triggered via POST endpoints
* ✅ ALL AI responses must be cached

CACHE:

* required for all AI outputs
* key: org_id + entity_id + type

RATE LIMIT:

* per user
* per org
* prevent duplicate execution within 60s

⸻

⚡ AI EXECUTION RULE

* AI must NEVER run on page load
* AI must be triggered ONLY by user action
* AI must be cached after execution

⸻

📄 PAGE

decisions/alerts/page.tsx

⸻

🌐 3. API Contracts (FIXED)

GET /api/v1/decisions/alerts

Query:

* severity
* platform
* mode

Response:
AlertsResponse

⸻

POST /api/v1/decisions/alerts/:id/execute

Purpose:

* execute suggested action

⸻

POST /api/v1/decisions/alerts/:id/ignore

Purpose:

* ignore alert

⸻

🧾 9. Comments (FOR CLAUDE) (FIXED)

Replace static UI with:

GET /api/v1/decisions/alerts

⸻

🔴 REALTIME STRATEGY

FALLBACK:

* GET /api/v1/decisions/alerts every 15s

⸻

⚠️ NOTES (IMPORTANT FIX)

* route is now fully aligned:
    * page → decisions/alerts
    * api → /api/v1/decisions/alerts
* no mismatch
* Claude Code will not hallucinate endpoints
* consistent with system architecture

⸻
ALERTS SYSTEM POSITIONING

alerts page is:

* operational anomaly monitoring surface

* realtime signal intelligence layer

* execution risk visibility center

* platform stability monitoring cockpit

alerts page is NOT:

* AI generation interface

* workflow builder

* autonomous execution engine

* remediation automation layer

⸻

🔗 SYSTEM POSITIONING

signal detection engine

→ anomaly intelligence layer

→ alerts orchestration engine

→ decisions engine

→ automation governance

⸻

⚠️ ALERT GOVERNANCE ENGINE

alerts MUST support:

* critical anomaly escalation

* degradation detection

* platform instability monitoring

* execution conflict detection

* remediation recommendation routing

RULES:

* alerts are READ-ONLY in frontend

* frontend MUST NEVER create alerts

* alerts originate ONLY from backend intelligence systems

* stale alerts MUST auto-expire visually

⸻

🧬 ALERT CLASSIFICATION ENGINE

alert severity MUST support:

* critical

* warning

* info

* degraded

* resolved

* suppressed

⸻

RULES:

* critical alerts MUST override lower severity visibility

* resolved alerts MUST remain historically traceable

* suppressed alerts MUST remain audit-visible in backend only

⸻

📊 SIGNAL INTELLIGENCE ENGINE

alerts MUST expose:

* signal_confidence

* anomaly_score

* affected_entity_count

* propagation_risk

* execution_impact

* system_health_dependency

RULES:

* signal confidence MUST be backend-generated

* frontend MUST remain visualization-only

⸻

⚠️ PLATFORM HEALTH ORCHESTRATION

platform health layer MUST monitor:

* Meta API degradation

* Google Ads API latency

* TikTok instability

* attribution outages

* auth token failures

* sync degradation

* rate-limit pressure

RULES:

* degraded platforms MUST reduce alert confidence

* unaffected platforms continue processing normally

* auth failures MUST escalate immediately

⸻

🧠 ROOT CAUSE ENGINE

root cause analysis MUST support:

* signal latency detection

* attribution degradation

* audience fatigue analysis

* creative decay detection

* budget volatility detection

* execution anomaly tracing

RULES:

* root causes MUST remain backend-computed

* no frontend inference allowed

⸻

🔁 REMEDIATION ENGINE

suggested remediation MUST support:

* remediation_priority

* execution_complexity

* rollback_compatibility

* automation_support

* estimated_recovery_window

RULES:

* remediation execution MUST require backend validation

* remediation state MUST sync from execution engine

⸻

🔴 EXECUTION SAFETY CONTROLS

before execute_suggestion:

system MUST validate:

* platform operational health

* execution conflicts

* cooldown windows

* rollback availability

* org-level permissions

RULES:

* failed validation MUST block execution

* frontend MUST only display validation outcomes

⸻

📡 ALERT CORRELATION ENGINE

system MUST support:

* cross-platform alert correlation

* signal clustering

* duplicate anomaly collapse

* cascading failure detection

* dependency-aware escalation

RULES:

* duplicate alerts MUST collapse visually

* correlated alerts MUST preserve lineage references

⸻

🧠 SYSTEM STABILITY ENGINE

stability score MUST combine:

* API reliability

* realtime sync health

* attribution quality

* execution latency

* signal consistency

* anomaly density

RULES:

* stability score MUST remain backend-controlled

* frontend MUST NOT calculate health metrics

⸻

📊 ALERT FREQUENCY INTELLIGENCE

frequency analytics MUST support:

* anomaly spikes

* rolling alert density

* platform instability trends

* historical anomaly comparison

* volatility forecasting

RULES:

* alert trends MUST remain cached

* analytics MUST use precomputed aggregates

⸻

🔴 HEALTH SCAN ENGINE

health scans MUST expose:

* pixel health

* API latency

* auth validity

* webhook integrity

* realtime sync status

* attribution continuity

RULES:

* health scans MUST update via realtime events

* failed scans MUST trigger alert escalation

⸻

🧬 THRESHOLD GOVERNANCE ENGINE

threshold system MUST support:

* org-level thresholds

* platform-specific thresholds

* dynamic anomaly sensitivity

* execution-aware thresholds

* risk-adjusted escalation

RULES:

* thresholds MUST remain backend-controlled

* frontend MUST NOT mutate thresholds directly

* threshold updates REQUIRE validation

⸻

🛡️ ALERT EXECUTION GOVERNANCE

execute suggestion MUST support:

* approval requirements

* execution readiness

* rollback verification

* remediation tracking

* audit logging

RULES:

* all executions MUST be logged

* no optimistic execution state

* execution state MUST sync from backend

⸻

🌐 REALTIME ALERT ORCHESTRATION

SOURCE:

SUPABASE_REALTIME

CHANNELS:

* alerts_stream:{org_id}

* anomaly_signals:{org_id}

* platform_health:{org_id}

* execution_alerts:{org_id}

EVENTS:

alert_created

alert_updated

alert_resolved

alert_suppressed

platform_degraded

auth_failure

signal_cluster_detected

execution_conflict_detected

RULES:

* new alerts MUST prepend instantly

* resolved alerts MUST patch-update in-place

* duplicate realtime events MUST collapse

⸻

⚠️ FALLBACK STRATEGY

fallback polling:

GET /api/v1/decisions/alerts every 15s

RULES:

* fallback polling ONLY if realtime disconnects

* polling MUST reconcile stale state safely

⸻

🔒 SECURITY & GOVERNANCE

RULES:

* org_id isolation REQUIRED

* no cross-org alert visibility

* no frontend remediation authority

* no realtime mutation authority

* no hidden execution retries

⸻

📊 UI ENHANCEMENT RULES

alert cards SHOULD expose:

* anomaly confidence

* execution impact

* platform dependency

* remediation complexity

* rollback compatibility

* propagation risk

⸻

system stability panel SHOULD expose:

* platform reliability trends

* realtime sync quality

* API degradation state

* anomaly pressure

⸻

health scan panel SHOULD expose:

* sync freshness

* webhook integrity

* auth expiration risk

* platform dependency warnings

⸻

🧠 ALERT MEMORY ENGINE

system MUST preserve:

* historical anomaly behavior

* remediation effectiveness

* false-positive rates

* escalation history

* suppression outcomes

USED FOR:

* future anomaly weighting

* confidence refinement

* escalation tuning

⸻

📚 COMPETITOR REFERENCE CONTEXT

REFERENCE SYSTEMS:

[Madgicx Platform](https://madgicx.com/?utm_source=chatgpt.com)

[Madgicx Meta Dashboard](https://academy.madgicx.com/lessons/facebook-dashboard?utm_source=chatgpt.com)

[Madgicx One-Click Report](https://academy.madgicx.com/lessons/one-click-report?utm_source=chatgpt.com)

[Madgicx Automated Reporting](https://madgicx.com/products/automated-reporting?utm_source=chatgpt.com)

[Madgicx Multi-Account Dashboard Analysis](https://madgicx.com/blog/best-dashboards-for-managing-multiple-ad-account?utm_source=chatgpt.com)

REFERENCE PATTERNS:

* anomaly visibility semantics

* operational monitoring UX

* cross-channel observability

* alert aggregation patterns

* blended execution intelligence

* reporting orchestration semantics

⸻

🧠 COMPETITIVE POSITIONING

CURRENT POSITION:

already visually stronger than:

* Madgicx alerts monitoring

* Revealbot operational alerts

* Birch anomaly visibility

CURRENT ADVANTAGES:

* governance-first architecture

* execution-aware alerts

* backend-authoritative intelligence

* enterprise operational semantics

* realtime anomaly orchestration direction

STILL MISSING:

* dependency graph tracing

* anomaly propagation topology

* correlated alert intelligence

* execution conflict visualization

* rollback-aware remediation visibility

* alert confidence propagation

TARGET POSITION:

enterprise marketing operations observability platform —

NOT alerts dashboard

⸻

🚫 FRONTEND IMMUTABILITY RULES

RULES:

* DO NOT redesign UI

* DO NOT modify component hierarchy

* DO NOT replace existing UX semantics

* DO NOT move layout structure

* ONLY replace static data with backend integrations

⸻

🧱 UI PROTECTION LAYER

existing alerts UI is considered:

* production-grade

* institutional-grade

* operationally mature

backend integrations MUST adapt to existing UI —

NOT redesign it.

⸻

🔥 CLAUDE IMPLEMENTATION ADDITION

Implement runtime-safe integrations for alerts page.

Rules:

* DO NOT modify UI structure

* Replace mock/static data only

* Use React Query

* Use realtime subscriptions

* Keep anomaly logic in backend

* Add loading/error/empty states

* Cache alerts aggressively

* Prevent duplicate execute actions

* Prevent optimistic alert mutations

* Reconcile realtime updates safely

* Scope ALL requests by org_id

* Keep execution validation backend-authoritative

Alert Lifecycle Semantics

States:

* detected
* acknowledged
* escalated
* suppressed
* resolved
* archived

Rules:

* alerts MUST remain traceable
* alert suppression MUST remain auditable
* duplicate alerts MUST collapse safely

⸻

🧠 Alert Recommendation Engine

Alert remediation MUST analyze:

* anomaly severity
* attribution degradation
* API integrity
* execution risk
* signal confidence
* historical recurrence

Rules:

* alert recommendations MUST NOT auto-execute
* remediation MUST remain explainable

⸻

📡 Competitor Analysis

Competitors usually provide:

* basic threshold alerts
* Slack notifications
* rule-based warnings

Examples:

* Revealbot Alerts & Automation￼
* Bïrch Automation Rules￼

Current system direction:

* operational intelligence alerts
* attribution-aware alerting
* root cause visibility
* governance-aware remediation
* realtime operational diagnostics
✅ DONE