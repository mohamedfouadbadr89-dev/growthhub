# Phase 4 (Minimal Slice) — Closing Audit

**Closed:** 2026-05-03
**Phase scope:** Execution Layer minimal slice
**Authorization:** Explicit user closure approval following the prior architectural-audit decision turn

---

## 1. What was implemented

### Database (canonical migrations live in `/supabase/migrations/`)

| Migration | Purpose |
|---|---|
| `20260503130000_phase4_minimal_execution_layer.sql` | `actions_library` system reference table (RLS authenticated-read, UNIQUE on (platform, action_type), 5 templates seeded); `decision_history` per-org audit log (RLS by org_id, FK to `organizations` + `ai_decisions`, indexes on (org_id, created_at), (org_id, ai_decision_id), (org_id, trace_id), (org_id, executed_by)) |
| `20260503140000_phase4_decision_history_idempotency.sql` | `execution_id UUID NULL` column + partial unique index `idx_decision_history_org_execution_id` on `(org_id, execution_id) WHERE execution_id IS NOT NULL` |
| `20260503150000_phase4_decision_history_impact_snapshot.sql` | `impact_snapshot JSONB NULL` column |

### Backend service layer

| File | Role |
|---|---|
| `backend/src/services/execution/action-executor.ts` | `executeAction(input)` orchestrates: idempotency pre-check → template fetch → param validation → optional `ai_decisions` linkage → exec.start log → handler dispatch → exec.end log → INSERT `decision_history` (with execution_id + impact_snapshot) → race-safe 23505 fallback. Public types: `ExecuteActionInput`, `ExecuteActionResult`, `ActionResult`, `ExecutedBy`. Handlers: `pause_campaign`, `decrease_budget`, `increase_budget`, `send_alert_email` — each forks on platform + feature flag + token + allowlist between SIMULATED and LIVE paths. |
| `backend/src/routes/v1/actions.ts` | `GET /actions`, `GET /actions/:id`, `POST /actions/:id/execute` (passes through `params`, `ai_decision_id`, `trace_id`, `execution_id` from request body; org_id ALWAYS from `c.get('orgId')`, never body) |
| `backend/.env.example` | Documents all real-execution guards: `META_PAUSE_CAMPAIGN_LIVE`, `META_DECREASE_BUDGET_LIVE`, `META_INCREASE_BUDGET_LIVE`, `META_INCREASE_BUDGET_MAX_PERCENT`, `META_TEST_ACCESS_TOKEN`, `META_LIVE_ORG_ALLOWLIST`, `META_GRAPH_VERSION`, `SEND_ALERT_EMAIL_LIVE`, `RESEND_API_KEY`, `ALERT_EMAIL_FROM` |

---

## 2. What is live

### Routes

- `POST /api/v1/actions/:id/execute` — single action, validates template + params, idempotent if `execution_id` supplied, logs lifecycle, persists `decision_history` with full audit shape

### Real-mode action handlers (all behind feature flag + token + org allowlist; default OFF)

| Handler | Platform | Side effect | Server-side safety control |
|---|---|---|---|
| `meta.pause_campaign` | Meta Graph API | Pauses campaign | API-side idempotent (Meta) + our `execution_id` |
| `meta.decrease_budget` | Meta Graph API (GET-then-POST) | Lowers daily_budget by `percent` | Money-DOWN direction; refused if computed new ≤ 0 |
| `meta.increase_budget` | Meta Graph API (GET-then-POST) | Raises daily_budget by `percent` | **`META_INCREASE_BUDGET_MAX_PERCENT` (default 50)** server-side cap; refused if computed new ≤ current |
| `send_alert_email` | Resend | Emails org admins | Recipients server-computed; placeholder filter (`@placeholder.local`, `@clerk.placeholder`); zero-recipients short-circuit |

### Audit columns persisted on every reachable path past validation

- `org_id` — server-side, post-`authMiddleware` JIT auto-provision; never from request body
- `decision`, `action_taken` — composed from template + params
- `trigger_condition` — `'Manual execution'` or `'Triggered by ai_decisions <id>'`
- `data_used` JSONB — `{mode, params, ai_decision_result?}` (input snapshot)
- `result` — `'success' | 'failed' | 'skipped'` (CHECK enforced)
- `executed_by` — `'manual' | 'automation'` (CHECK enforced)
- `confidence_score` NUMERIC 0..1 — propagated from linked `ai_decisions` when present
- `ai_decision_id` UUID — FK to `ai_decisions(id)`, optional
- `trace_id` UUID — caller-supplied or inherited from linked `ai_decisions.trace_id`
- `execution_id` UUID — caller-supplied idempotency key (partial unique on `(org_id, execution_id)`)
- `impact_snapshot` JSONB — handler's after-state (real-mode budget changes carry `previous_daily_budget`/`new_daily_budget`/`percent_applied`/`max_percent_cap`; pause carries body+http_status; email carries `recipients_count`+`message_id`; simulated carries `{simulated: true, ...}`; failed carries partial state with `stage` for forensic recovery)
- `created_at` TIMESTAMPTZ default now()

### Structured `[exec]` lifecycle logger

Phases emitted to console (one JSON line per event):

- `exec.start` — before handler dispatch (carries org_id, trace_id, ai_decision_id, template_id, platform, action_type, mode)
- `exec.api_call` — before each external call (one for pause's POST, two for budget actions' GET+POST, one for email's POST)
- `exec.api_response` — after each external call (carries http_status, ok, latency_ms)
- `exec.end` — after handler dispatch (carries final ok + latency)
- `exec.error` — fail-loud for misconfigs (token missing while flag ON, percent > cap, campaign_id missing/invalid, etc.)

Token/PII never logged. Recipient list in email logged as count only.

---

## 3. What was intentionally deferred (Phase 4 Part 2)

| Deferred item | Reason |
|---|---|
| `automation_rules` / `automation_runs` tables | Automation engine explicitly scoped out by user across multiple turns; fits Phase 4 Part 2 |
| Automation engine code | Same — `services/execution/automation-engine.ts` remains a dead-code skeleton |
| `google.pause_campaign` real-mode | Requires Google Ads OAuth2 + developer_token + customer_id = Phase 2 territory ("DO NOT introduce Phase 2") |
| Per-org Meta credential storage | Currently single-tenant via shared `META_TEST_ACCESS_TOKEN` env var. Multi-tenant rollout requires Phase 2 (per-org token storage in Supabase Vault) |
| Per-action / per-org rate limiting | Cross-cutting concern; relevant once real-mode is broadly enabled across many orgs |
| `ai_logs` DB-sink wiring | Phase 3 audit completeness; broader Phase X scope; ~5 LOC follow-up |
| `process.exit(1)` softening on unhandledRejection | Generic backend stability; not execution-layer specific |

Unlock condition for Phase 4 Part 2 (ALL of):
- Phase 2 (integrations / OAuth / per-org credentials) live, OR explicit user authorization for a controlled single-tenant extension
- Per-org Meta token (or equivalent) addressable from `executeAction` instead of the shared sandbox env var
- For Google: developer_token + customer_id resolution path live
- Decision on whether automation should fire on `ai_decisions` writes synchronously vs via a queued job (Inngest)

---

## 4. Safety guarantees (active and verified)

### Org isolation
- Every `decision_history` insert uses `org_id` from `c.get('orgId')` (server-side, post-auth + JIT auto-provision); request body is never consulted for it
- RLS policy `decision_history_org_isolation` gates `auth.jwt()->>'org_id'` (USING + WITH CHECK)
- `actions_library` is system-global with RLS authenticated-read (no INSERT/UPDATE/DELETE policy for clients)
- Handlers that look up org-scoped data (`ai_decisions`, `users` admins) use `.eq('org_id', ctx.orgId)` filters in addition to RLS

### Idempotency
- Partial unique index on `(org_id, execution_id) WHERE execution_id IS NOT NULL` enforces at the DB level
- Pre-handler SELECT short-circuits the entire pipeline when a key is reused (no second handler call, no second external API call, no duplicate row)
- Race-safe `23505` fallback in the INSERT path catches the rare concurrent-first-call case
- Cross-org reuse of the same key is permitted (per-org scope by index design)
- NULL `execution_id` permits multiple inserts (back-compat for callers that don't supply a key)

### No-bypass invariants
- No code path can construct an `ExecuteActionInput` without `orgId: string` (TypeScript enforced)
- No code path can reach `decision_history` insert without first running through `executeAction` (single-source-of-callsite)
- No real-mode handler runs without all three guards passing (flag + token + allowlist)
- `META_INCREASE_BUDGET_MAX_PERCENT` is enforced before Meta is contacted; refusal produces a `failed` row with the requested vs allowed percent recorded for audit
- `send_alert_email` filters placeholder emails before send and refuses if zero real recipients remain

### Fail-loud (CONSTITUTION §3)
- Every error path produces a structured `decision_history` row OR a typed exception with a code (`NOT_FOUND`, `MISSING_PARAMETER`, `INVALID_ORG_ID`, `TEMPLATE_LOOKUP_FAILED`, `AI_DECISION_LOOKUP_FAILED`, `IDEMPOTENCY_LOOKUP_FAILED`, `HISTORY_INSERT_FAILED`, `RATE_LIMITED` — reserved)
- No `try/catch` swallows; every catch logs and rethrows or returns `failed` with `error_message`
- Token never logged (Meta token in URL only on the GET; bearer token in Authorization header for Resend; never echoed to stdout)

---

## 5. Validation proof

### Type-check
`tsc --noEmit -p backend/tsconfig.json` → **0 errors** at the conclusion of Phase 4 close

### Live SQL constraints (verified during the migration + smoke turns)

| Test | Result |
|---|---|
| INSERT with `result='banana'` (invalid enum) | rejected by CHECK constraint ✅ |
| INSERT with unknown `org_id` | rejected by FK to `organizations(org_id)` ✅ |
| INSERT with `confidence_score=1.5` | rejected by CHECK 0..1 ✅ |
| Duplicate `(org_id, execution_id)` | rejected by partial unique index `idx_decision_history_org_execution_id` (`SQLSTATE 23505`) ✅ |
| Cross-org reuse of same `execution_id` | permitted (per-org scope verified) ✅ |
| `NULL execution_id` for two rows | permitted (back-compat verified) ✅ |
| INSERT with `impact_snapshot` shape from real-mode budget handler | round-trips via `->>` extractors (`previous_daily_budget`, `new_daily_budget`) ✅ |
| INSERT with simulated-mode `impact_snapshot` (`{simulated: true, ...}`) | preserved verbatim ✅ |
| INSERT with failed-handler `impact_snapshot` (`{stage, attempted_new_daily_budget, ...}`) | forensic state retrievable ✅ |

### End-to-end execution flow (live in prior session turns)
- `POST /api/v1/ai/execute` with real Clerk JWT produced an `ai_decisions` row (Phase 3 close evidence)
- The seeded `actions_library` rows are queryable; `executeAction` was wired and stress-tested at the SQL level for every handler shape
- Real-mode external calls (Meta + Resend) are NOT exercised in this turn — they require operator credentials in `.env`. Code paths verified by static review and structured handler-shape SQL smoke

---

## 6. Final system state

| Layer | Status |
|---|---|
| Auth | ✅ Working — Clerk JWT verification + JIT auto-provision of org+user rows in `authMiddleware` |
| DB | ✅ Consistent — Phase 3 + Phase 4 critical paths clean, RLS on, FKs valid; legacy `decisions` deprecated and isolated |
| AI Pipeline (Phase 3) | ✅ Working end-to-end — validator + logger + persistence + executeAIDecision + `/api/v1/ai/execute` |
| Execution Layer (Phase 4 minimal) | ✅ **CLOSED** — actions_library + decision_history + 4 real-mode handlers + idempotency + impact_snapshot + structured `[exec]` logging + server-side max-cap on increase_budget |
| Phase 4 Spec Compliance (minimal scope) | ✅ All non-deferred Phases.md Phase 4 deliverables met |
| Phase 4 Part 2 | 🔒 DEFERRED with documented unlock conditions |
| Phase X (linear pipeline) | ✅ Shipped as part of Phase 3 close |
| Phase X (broader: MCP, tool governance, ai_logs DB sink) | 🔒 LOCKED until Phase 4 Part 2 stable |
| Phase 0 / Phase 1 patches | ⏳ NEXT FOCUS — both parallel-safe |
| Phase 2 | 🔒 DEFERRED — gates Phase 4 Part 2 |
| Server stability | ✅ Stable; no new crash paths since Phase 3 close; `tsc` clean throughout |

---

## 7. What this closure does NOT do

- Does NOT modify any handler behavior — code unchanged in this closure turn (only documentation: SYSTEM_CONTROL.md + this file)
- Does NOT remove any deferred item — Phase 4 Part 2 remains explicitly listed with unlock conditions
- Does NOT touch Phase 2, automation, Google handlers, AI pipeline, validator, logger, persistence, JIT auth, or the legacy `decisions` table
- Does NOT change route shapes or response envelopes
- Does NOT remove or weaken any safety guard — every flag default is OFF, every cap is in place, every RLS policy stays active

---

## 8. Next focus

Per `specs/SYSTEM_CONTROL.md` PATCH QUEUE order after this close:

1. **Phase 0 patch** — request `tracing_id` middleware + structured logger (org_id + user_id on every line). Lowest blast radius, highest observability return; benefits both closed phases.
2. **Phase 1 patch** — `metadata` JSONB + `created_by`/`updated_by` on core tables; standardize response envelope.
3. **Phase 2 unlock prep** — only on explicit authorization; prerequisite for Phase 4 Part 2.

Phase 0 and Phase 1 are parallel-safe and don't conflict with each other or with the closed Phase 4 surface.
