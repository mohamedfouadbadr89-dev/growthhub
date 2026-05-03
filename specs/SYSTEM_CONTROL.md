# SYSTEM STATE — SOURCE OF TRUTH

## CURRENT PHASE
Phase 4 (minimal slice) — ✅ CLOSED 2026-05-03 · Next focus: Phase 0 + Phase 1 foundation patches (parallel)

---

## SYSTEM STATUS

* Frontend: COMPLETED
* Backend: OPERATIONAL — Phase 3 closed; Phase 4 (minimal slice) closed; 4 real action handlers live
* Integrations: NOT CONNECTED (Phase 2 deferred)
* AI: WORKING (real OpenRouter, validated, persisted)
* Execution: WORKING (idempotent, logged, audit-complete via impact_snapshot + trace_id)

---

## PHASE COMPLETION STATUS

### Phase 0 — Architecture Lock

Status: PARTIAL

Missing:
- [ ] request tracing ID
- [ ] centralized logging (user_id + org_id) — currently `console.log` includes both, but no structured-log middleware

Patch Type: Backend middleware (SAFE)

Completion Condition:
✔ كل request فيه tracing_id  
✔ كل log فيه user_id + org_id  

---

### Phase 1 — Foundation

Status: PARTIAL

Missing:
- [ ] metadata JSONB columns
- [ ] created_by / updated_by
- [ ] standard response format

Patch Type: DB + Middleware (SAFE)

Completion Condition:
✔ كل tables فيها metadata  
✔ كل responses بنفس الفورمات  
✔ audit fields موجودة

---

### Phase 2 — Data Ingestion

Status: DEFERRED

Reason:
❗ مش محتاج دلوقتي علشان Phase 3 / Phase 4-minimal — handlers are simulated until Phase 2 unlocks; one Meta sandbox token bridges the gap for the test org

Resume Condition:
👉 لما نحتاج real data بدل mock / static, OR لما نحتاج multi-tenant credential storage (per-org tokens replace the single shared sandbox token)

---

### Phase 3 — Intelligence Layer

Status: ✅ CLOSED (2026-05-03)

Deliverables (all met):
- [x] AI validation layer (`backend/src/utils/aiValidator.ts`)
- [x] reasoning_steps (validated; required; min length 1; non-empty step+insight)
- [x] AI logging (passive logger with structured AILogEntry, console sink active)
- [x] confidence handling (deriveStatus single-source-of-truth at NEEDS_REVIEW_THRESHOLD = 0.7)
- [x] AI persistence (`backend/src/services/ai/persistence.ts`, type-gated to require validated AIResponse)
- [x] Unified execution flow (`backend/src/services/ai/execute-ai-decision.ts`)
- [x] HTTP entry point (`POST /api/v1/ai/execute`)
- [x] Live row in `ai_decisions` from real Clerk-authenticated end-to-end run
- [x] CLOSING_AUDIT.md exists in repo root

Exit Gate (✅ all satisfied):
✔ AI returns valid output (contract enforced both at type-system and runtime)  
✔ Every decision is persisted in DB  
✔ AI logging works (prompt + response + latency)  
✔ Decisions carry confidence_score  
✔ Decisions < 0.7 → status='needs_review' derived in validator  

---

### Phase 4 (minimal slice) — Execution Layer

Status: ✅ CLOSED (2026-05-03)

Closing audit: `CLOSING_AUDIT_PHASE4.md` at repo root

Deliverables (all met):
- [x] `actions_library` table (system reference, RLS authenticated-read, 5 templates seeded, UNIQUE on platform+action_type)
- [x] `decision_history` table (per-org audit log, RLS by org_id, FK to organizations + ai_decisions)
- [x] `execution_id` idempotency (NULLABLE column + partial unique index on `(org_id, execution_id)`)
- [x] `impact_snapshot` (JSONB column populated from each handler's after-state)
- [x] `executed_by` (CHECK ∈ `{manual, automation}`; default `manual`)
- [x] `executeAction(input)` service — validates template + params, logs lifecycle, idempotency-aware, dispatches handler, inserts decision_history (`backend/src/services/execution/action-executor.ts`)
- [x] `POST /api/v1/actions/:id/execute` route — accepts `params`, optional `ai_decision_id`, `trace_id`, `execution_id` (idempotency key)
- [x] **4 real-mode action handlers behind feature flags + token + org allowlist:**
  - [x] `meta.pause_campaign` (Meta Graph API single POST)
  - [x] `meta.decrease_budget` (Meta Graph API GET-then-POST, money-DOWN direction)
  - [x] `meta.increase_budget` (Meta Graph API GET-then-POST, money-UP direction, `META_INCREASE_BUDGET_MAX_PERCENT` server-side cap)
  - [x] `send_alert_email` (Resend, recipients server-computed from org admins, placeholder filter)
- [x] Structured `[exec]` console logger emitting phases: `exec.start`, `exec.api_call`, `exec.api_response`, `exec.end`, `exec.error`
- [x] Live verification: idempotency rejects duplicate `(org_id, execution_id)` (`SQLSTATE 23505`); cross-org reuse permitted; NULL execution_id allows multiple inserts
- [x] Type-check clean (`tsc --noEmit -p backend/tsconfig.json` → 0 errors at every step)
- [x] CONSTITUTION compliance: org isolation, fail-loud, no silent failures, no schema-bypass

Exit Gate (✅ all satisfied):
✔ All non-deferred Phases.md Phase 4 explicit deliverables met (actions_library, decision_history, real APIs, idempotent execution, log every result, data snapshot, org_id enforced, execution_id, impact_snapshot, execution_mode)  
✔ Idempotency live-verified at the DB constraint level  
✔ Server-side max-cap on the only money-UP real action  
✔ Multi-action handler set proven by handler-shape SQL smoke (success / simulated / failed-handler)  

---

### Phase 4 Part 2 — Automation Engine + Multi-Platform

Status: 🔒 DEFERRED

Out of scope of the closed minimal slice; sequenced behind explicit unlock conditions. Items:

- [ ] `automation_rules` table (org-scoped IF→THEN playbooks)
- [ ] `automation_runs` table (per-rule execution ledger)
- [ ] Automation engine code (`services/execution/automation-engine.ts` is currently a dead-code skeleton)
- [ ] `google.pause_campaign` real-mode handler (currently simulated)
- [ ] `meta.*_budget` for non-test orgs (currently single-tenant via shared `META_TEST_ACCESS_TOKEN`)
- [ ] Phase 4 SQL functions (e.g. impact_snapshot ledger views, execution_id usage analytics)
- [ ] Per-org rate limiting on action execution
- [ ] `process.exit(1)` softening on unhandledRejection (cross-cutting concern, broader than Phase 4)

Unlock Condition (ALL of):
✔ Phase 2 (integrations / OAuth / per-org credential storage) live, OR explicit user authorization for a controlled single-tenant extension  
✔ Per-org Meta token (or equivalent) addressable from `executeAction` instead of the shared sandbox env var  
✔ For Google: developer_token + customer_id resolution path live  
✔ Decision on whether automation should fire on `ai_decisions` writes synchronously vs via a queued job (Inngest)  

---

### Phase X — AI Orchestration

Status: 🔄 SPLIT

- "Linear pipeline" portion (single trace through validate → log → persist via `executeAIDecision`): ✅ shipped as Phase 3 close
- "Broader" portion (MCP routing, tool-governance, DB log-sink fan-out for ai_logs, strategy_tag enum): 🔒 LOCKED until Phase 4 Part 2 stable

Unlock Condition for the broader Phase X:
✔ Phase 4 Part 2 stable + automation engine working with ai_decisions linkage

Documentation:
- `specs/009-ai-orchestration/spec.md` describes the full Phase X surface; only the linear-pipeline portion is implemented today.

---

## CANONICAL AI SYSTEM (RESOLUTION)

| Concept | Canonical | Status |
|---|---|---|
| AI Output Contract storage | **`ai_decisions`** | active, working, has rows |
| AI lifecycle audit | **`ai_logs`** (schema present; DB sink wiring deferred to broader Phase X) | console-active, DB-pending |
| Decision-to-action audit | **`decision_history`** | active; idempotent; carries impact_snapshot + trace_id + ai_decision_id |
| Legacy anomaly engine | **`decisions`** table | DEPRECATED — malformed in live DB; not used by current pipeline; future decision: revive separately or retire entirely |

All Phase 4+ links to AI use `ai_decisions(id)` and `ai_decisions.trace_id`. The legacy `decisions` table is no longer referenced by any Phase 4 code.

---

## PATCH QUEUE (EXECUTION RULE)

Priority Order:

1. ✅ Phase 3 (core) — DONE
2. ✅ Phase 4 minimal slice — DONE
3. **Phase 0 patch** (tracing_id + structured logging) — next
4. Phase 1 patch (metadata + audit fields + response format) — parallel-safe with #3
5. Phase 2 (integrations + per-org credentials) — when real data is needed OR before Phase 4 Part 2
6. Phase 4 Part 2 (automation engine + multi-platform real handlers, after Phase 2)
7. Phase X broader (MCP, tool governance, DB log sink fan-out)

---

## EXECUTION RULES

- NEVER switch phase until completion condition is met
- ALWAYS apply patches in parallel where they don't conflict (Phase 0 + Phase 1 are parallel-safe)
- DO NOT skip blocker validation
- Frontend MUST NOT break

---

## NEXT ACTION (STRICT)

👉 Phase 4 minimal slice CLOSED. Next options (any safe to pick, both parallel-safe):

A) **Phase 0 patch** — add request tracing_id middleware + structured logger including org_id + user_id on every line. Lowest blast radius, highest observability return; benefits both closed phases (3 + 4) and any future Phase 4 Part 2 / Phase 2 work.

B) **Phase 1 patch** — add metadata JSONB + created_by/updated_by columns to core tables; standardize response envelope across routes.

C) **Phase 2 unlock prep** — only if you authorize multi-tenant credential storage; required prerequisite for Phase 4 Part 2 (real handlers per-org) and `google.pause_campaign`.

🚫 DO NOT:
- Touch Phase 2 without explicit authorization
- Build automation engine before Phase 2 lands
- Reactivate legacy `decisions` table without an explicit decision
- Re-open the closed Phase 4 minimal slice

---

## DECISION RULE (VERY IMPORTANT)

If:

- Phase incomplete → KEEP WORKING on current minimal scope
- Phase complete → MOVE per priority order above
- Phase blocked → APPLY parallel patches (0 or 1) ONLY

---

🚨 HARD LOCK (UPDATED 2026-05-03 — Phase 4 close)

AI MUST NOT:
- write to DB before validation layer exists ✅ (enforced at type-system + control flow)
- call external APIs without logging ✅ (passive logger emits request/raw on every call)

EXECUTION (Phase 4 minimal — closed) MUST NOT:
- bypass `actions_library` template lookup
- skip required-parameter validation
- write to `decision_history` without server-side org_id
- run automation logic — automation engine is NOT in the closed slice
- exceed `META_INCREASE_BUDGET_MAX_PERCENT` (default 50) on a single increase_budget call
- bypass the partial unique index on `(org_id, execution_id)` when `execution_id` is supplied
- email anyone outside the calling org's admin set; placeholder emails (@placeholder.local, @clerk.placeholder) are filtered

If violated → STOP execution

---

## REAL SYSTEM CAPABILITIES (RUNTIME TRUTH — UPDATED 2026-05-03 PHASE 4 CLOSE)

- AI: ✅ WORKING — real OpenRouter, validated, persisted, type-gated
- Decisions: ✅ persisted in `ai_decisions` (canonical); legacy `decisions` table deprecated
- AI Logging: ✅ console-level structured `[AI]` lines via `aiLogger`; DB sink fan-out pending (broader Phase X)
- Data Source: STATIC / NO real ingestion (Phase 2 deferred)
- Auth: ✅ FULLY WORKING — Clerk JWT verification + JIT auto-provisioning of org+user rows in `authMiddleware`
- Backend API: ✅ WORKING (Hono); `POST /api/v1/ai/execute` and `POST /api/v1/actions/:id/execute` live
- org_id enforcement: ✅ middleware-level + RLS-level on every Phase 3/4 table
- Execution Layer: ✅ CLOSED — actions_library + decision_history; idempotent; impact_snapshot persisted; 4 real-mode handlers behind flags; structured `[exec]` audit logs
- Real Action Surface (live, behind flags + token + allowlist):
  - `meta.pause_campaign`
  - `meta.decrease_budget`
  - `meta.increase_budget` (with server-side max-percent cap)
  - `send_alert_email` (Resend; org-admin recipients only; placeholder filter)
- Real Action Surface (deferred — Phase 4 Part 2):
  - `google.pause_campaign` (Phase 2 prerequisite)
  - per-org tokens for any of the above (Phase 2 prerequisite)

---

## CURRENT EXECUTION TARGET (STRICT)

Focus next on:

- Phase 0 patch (tracing_id + structured logging) AND/OR
- Phase 1 patch (metadata + audit fields + response format)

DO NOT:

- start Phase 4 Part 2 (automation engine + multi-platform real handlers) before Phase 2 unlock
- start integrations (Phase 2) without explicit unlock
- modify legacy `decisions` table without explicit re-architecture decision
- re-open Phase 4 minimal slice

CURRENT GOAL:

Harden the foundation (tracing + structured logging + audit fields) so Phase 4 Part 2 and the broader Phase X can land cleanly when their unlock conditions are met.

IF goal unclear → STOP (no guessing)

---

## PHASE 4 (MINIMAL SLICE) — DELIVERABLE CHECKLIST (CLOSED)

- [x] actions_library (system reference, seeded, RLS authenticated-read)
- [x] decision_history (org-scoped, RLS, FK to organizations + ai_decisions, trace_id)
- [x] execution_id idempotency (partial unique index `(org_id, execution_id)`)
- [x] impact_snapshot persistence (JSONB after-state per audit row)
- [x] executed_by (`manual` | `automation`) discriminator
- [x] executeAction service — validates, logs, dispatches, persists
- [x] POST /api/v1/actions/:id/execute route — full body shape (params + idempotency key + ai_decision_id + trace_id)
- [x] 4 real-mode handlers (Meta pause, Meta decrease_budget, Meta increase_budget, Resend send_alert_email)
- [x] Structured `[exec]` lifecycle logging (start / api_call / api_response / end / error)
- [x] Server-side max-percent cap on increase_budget (`META_INCREASE_BUDGET_MAX_PERCENT`, default 50)
- [x] Type-check 0 errors
- [x] Constraint enforcement verified live (CHECK on result enum, FK to organizations, partial unique index, CHECK on executed_by)

Out of scope (Phase 4 Part 2):
- [ ] automation_rules / automation_runs
- [ ] automation engine code
- [ ] google.pause_campaign real-mode (Phase 2 prerequisite)
- [ ] per-org credential storage (Phase 2 prerequisite)
- [ ] per-org rate limiting (cross-cutting; future)

---

## SAFE EXECUTION ORDER (REFERENCE)

1. Validate AI output (NO DB WRITE) — `validateAIResponse`
2. If valid → allow persistence — type-gated in `persistAIDecision`
3. Log AI interaction — `logAIInteraction` (passive)
4. Apply confidence rules — `deriveStatus`
5. Execute action (when triggered) — `executeAction`:
   a. idempotency pre-check on `(org_id, execution_id)` — return cached row on hit
   b. fetch template from `actions_library` (no execution if missing)
   c. validate required params per `parameter_schema` (no execution if missing)
   d. resolve optional `ai_decisions` linkage (org-scoped lookup)
   e. emit `[exec] phase=exec.start`
   f. dispatch handler (real or simulated based on flags + token + allowlist)
   g. emit `[exec] phase=exec.end`
   h. INSERT `decision_history` row with `executed_by`, `result`, `ai_decision_id`, `trace_id`, `execution_id`, `impact_snapshot`
   i. on `23505` race: SELECT existing row, return idempotent reply

NEVER:
- save before validation
- skip logging
- bypass confidence logic
- bypass actions_library lookup
- skip parameter validation
- write decision_history without server-side org_id
- exceed META_INCREASE_BUDGET_MAX_PERCENT on a single call
- email outside the calling org's admin set
- store a placeholder email recipient in any external send

---

## DATABASE STATE

- Supabase project: CONNECTED
- Migration directory (canonical): `/supabase/migrations`
- Live migrations:
  - `20260428090320_remote_schema.sql`
  - `20260428091421_remote_schema.sql`
  - `20260429090032_remote_schema.sql`
  - `20260502000001_ai_persistence.sql` (Phase 3 — ai_decisions, ai_logs)
  - `20260503100000_phase3_close_campaigns_schema.sql` (Phase 3 close — campaigns RLS + org_id)
  - `20260503130000_phase4_minimal_execution_layer.sql` (Phase 4 — actions_library, decision_history)
  - `20260503140000_phase4_decision_history_idempotency.sql` (Phase 4 — execution_id + partial unique index)
  - `20260503150000_phase4_decision_history_impact_snapshot.sql` (Phase 4 — impact_snapshot column)
- Schema: ALIGNED with code (Phase 3 + Phase 4 minimal — fully closed)
- Legacy: `/db/_archive_migrations/` — ARCHIVE ONLY, never referenced

RULE:

Claude MUST read:
- the canonical migration file for the table being touched
- before ANY DB usage, confirm the table schema matches the code's `from(...).select(...)` shape

---

## LAST UPDATE

2026-05-03 — Phase 4 (minimal slice) CLOSED. CLOSING_AUDIT_PHASE4.md generated. Phase 4 Part 2 explicitly scoped as DEFERRED with documented unlock conditions. PATCH QUEUE updated; Phase 0 + Phase 1 are now the active focus (parallel-safe). HARD LOCK refreshed to incorporate Phase 4 invariants (max-percent cap, idempotency unique index, recipient placeholder filter). REAL SYSTEM CAPABILITIES enumerates the live action surface and the deferred surface explicitly.
