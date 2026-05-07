# SYSTEM STATE — SOURCE OF TRUTH

## CURRENT PHASE
Phase 0 + Phase 1 foundation patches — ✅ CLOSED 2026-05-07 (verified runtime evidence across 13 backend hardening passes; details in PHASE COMPLETION STATUS below) · Next: Phase 2 unlock decision (governance-locked; explicit user authorization required) OR continue holding pattern

---

## SYSTEM STATUS

* Frontend: SHELLED — Stitch UI shells completed across all routing-map pages; live API wiring is partial (5 pages reach `apiClient`; 34 mocked). Wiring of mocked surfaces is governance-bound to Phase 2 / Phase 3 anomaly engine / Phase 4 Part 2 / Phase 5 / Phase 7 unlocks per Phases.md. Mocked-shell state is INTENTIONAL, not drift.
* Backend: OPERATIONAL — Phase 0 closed; Phase 1 closed (active surface); Phase 3 closed; Phase 4 (minimal slice) closed; 4 real action handlers live
* Integrations: NOT CONNECTED (Phase 2 deferred)
* AI: WORKING (real OpenRouter, validated, persisted)
* Execution: WORKING (idempotent, logged, audit-complete via impact_snapshot + trace_id)

---

## PHASE COMPLETION STATUS

### Phase 0 — Architecture Lock

Status: ✅ CLOSED (2026-05-07)

Deliverables (all met):
- [x] request tracing_id middleware — `backend/src/middleware/tracing.ts` mints UUID per HTTP request, sets `c.get('requestId')`, echoes `X-Request-ID` header; honors valid incoming UUIDs
- [x] centralized structured request logger — `backend/src/middleware/request-logger.ts` emits `[req] in/out` with request_id; mounted on `*` at app level (`backend/src/index.ts:167-168`)
- [x] log-line correlator chain — `[req]`, `[err]`, `[exec]`, `[AI]`, `[auth]`, `[clerk-webhook]` lines all carry `request_id` and (when authenticated) `user_id` + `org_id`. Verified across 13 backend runtime hardening passes.

Patch Type: Backend middleware (SAFE) — landed

Exit Gate (✅ all satisfied):
✔ كل request فيه tracing_id  
✔ كل log فيه user_id + org_id  

---

### Phase 1 — Foundation

Status: ✅ CLOSED for active surface (2026-05-07); metadata-JSONB requirement is governance-bound to deferred phases (see below)

Active-surface deliverables (all met):
- [x] standard response envelope — `backend/src/utils/response.ts` exports `ok()` / `fail()` emitting canonical `{ success, data, error: { message, code? }, request_id }`. 77 active-route call sites (14 ok + 63 fail) plus errorHandler + deferredPhase wrapper all conform.
- [x] created_by / updated_by audit columns — populated server-side from Clerk JWT `userId` in `auth.ts` JIT (organizations + users), `createCampaign`, `updateCampaign`. Never read from request body.
- [x] Clerk webhook audit — `created_by` populated from `data.created_by` in `organization.created` event handler.

Governance-deferred deliverable (NOT a current defect):
- [ ] metadata JSONB on `decisions`, `creatives`, `automation_runs` (per Phases.md Phase 1 list) — all three tables are governed by deferred phases:
  - `decisions` → Phase 3 anomaly engine (legacy table malformed; canonical AI surface migrated to `ai_decisions`)
  - `creatives` → Phase 5 (DEFERRED)
  - `automation_runs` → Phase 4 Part 2 (DEFERRED)
  This deliverable lands at the corresponding phase unlock. Not classified as Phase 1 incomplete.

Patch Type: DB + Middleware (SAFE) — active-surface portion landed

Exit Gate (active surface ✅):
✔ كل responses بنفس الفورمات  
✔ audit fields موجودة على active write paths
✔ metadata JSONB → governance-bound to phase unlocks (NOT a Phase 1 blocker)

---

### Phase 2 — Data Ingestion

Status: PARTIAL — unlock prep authorized 2026-05-07; canonical schema migration AUTHORED but NOT YET DEPLOYED

Authored:
- [x] Backend code: `connect.ts`, `integrations.ts`, `metrics.ts`, `vault.ts`, `oauth-state.ts`, `services/sync/{meta,google,shopify,index}.ts`, `jobs/inngest.ts` — all in place from earlier scaffolding (Phase 2 tasks T001–T021 marked complete in `specs/002-data-ingestion/tasks.md`)
- [x] Frontend OAuth callback: `app/api/integrations/callback/[platform]/route.ts`
- [x] Canonical migration: `supabase/migrations/20260507120000_phase2_data_ingestion.sql` — authored from `specs/002-data-ingestion/data-model.md` with one runtime-evidenced amendment (`campaign_metrics.integration_id` column, required by `services/sync/{meta,google,shopify}.ts` upsert payloads). Tables: `integrations`, `ad_accounts`, `campaign_metrics` (PARTITIONED BY date, 8 quarterly + default partitions), `sync_logs`. All four with RLS + org_id-scoped policies + indexes.

Pending (require subsequent authorization):
- [ ] `supabase db push` — deploy authored migration to live project
- [ ] Verify deploy via post-migration SQL (4 tables + RLS policies present)
- [ ] Lift 503 gates on `/integrations/*` and `/metrics/*` in `backend/src/routes/v1/index.ts` (ONLY after deploy verified)
- [ ] Verify end-to-end OAuth + sync flow per `specs/002-data-ingestion/quickstart.md` Scenarios 1–6

Patch Type: DB migration (SAFE — additive; tables are new and orthogonal to all existing closed-phase tables)

Exit Gate:
✔ Migration deployed and 4 tables + 4 RLS policies verified
✔ 503 gates lifted on `/integrations/*` and `/metrics/*`
✔ One end-to-end OAuth → sync → dashboard-data flow proven for at least one platform (Meta, Google, or Shopify)
✔ Phase 4 Part 2 unlock condition (per-org tokens addressable from `executeAction`) becomes satisfiable

Resume Condition (from prior status):
👉 Reached: "multi-tenant credential storage" path established via Vault helpers + `integrations.vault_refresh_token_secret_id` column, replacing the single shared `META_TEST_ACCESS_TOKEN` sandbox env var in production for newly-connected orgs.

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
3. ✅ Phase 0 patch (tracing_id + structured logging) — DONE (2026-05-07)
4. ✅ Phase 1 patch (envelope + audit columns) — DONE (2026-05-07) for active surface; metadata-JSONB on `decisions`/`creatives`/`automation_runs` is bound to those phases' unlocks (NOT a Phase 1 blocker)
5. **13 backend runtime-hardening passes** — DONE (cumulative, closed) — UUID/body/path validation parity, LIST validation parity, PGRST116 discriminator parity, request_id triple-sink, ai-suggestions silent-write fix, pushCampaign discriminator, auth.ts canonical normalization, AI empty-prompt protection, body-limit cap, smoke-flag gate, LIVE-flag dependency fail-fast, deferred-router 503 gating
6. ⚠️ Phase 2 unlock prep — IN PROGRESS (2026-05-07): canonical schema migration AUTHORED at `supabase/migrations/20260507120000_phase2_data_ingestion.sql`; backend code + frontend callback already in place. REMAINING: `supabase db push` deploy + 503-gate lift on `/integrations/*` + `/metrics/*` + end-to-end verification. Schema-prep step is what was authorized this turn; deploy + gate-lift await separate authorization.
7. Phase 4 Part 2 (automation engine + multi-platform real handlers) — blocked behind #6
8. Phase X broader (MCP, tool governance, DB log-sink fan-out, strategy_tag enum) — blocked behind #7
9. Frontend wiring of remaining mocked surfaces — bound to each owning phase's unlock state (Phase 7 frontend integration scope)

---

## EXECUTION RULES

- NEVER switch phase until completion condition is met
- ALWAYS apply patches in parallel where they don't conflict (Phase 0 + Phase 1 are parallel-safe)
- DO NOT skip blocker validation
- Frontend MUST NOT break

---

## NEXT ACTION (STRICT)

👉 Phase 0 + Phase 1 patches CLOSED (2026-05-07). All parallel-safe foundation patches are landed. Active-surface backend runtime hardening is SATURATED. The PATCH QUEUE next item (#6 — Phase 2 unlock prep) is governance-locked and requires EXPLICIT user authorization.

✅ Closed since last NEXT ACTION:
- A) Phase 0 patch — tracing_id + structured request logger ✅
- B) Phase 1 patch — canonical envelope + audit columns on active surface ✅
- 13 backend runtime hardening passes (validation parity, request_id correlator, silent-write closures, etc.) ✅

🔒 GOVERNANCE-LOCKED (require explicit authorization):
- C) Phase 2 unlock prep — multi-tenant credential storage; prerequisite for Phase 4 Part 2 real handlers per-org and `google.pause_campaign`
- D) Phase 4 Part 2 — automation engine + multi-platform handlers (blocked by C)
- E) Phase X broader — MCP / tool governance / DB log-sink fan-out / strategy_tag enum (blocked by D)
- F) Phase 5 (creatives), Phase 6 frontend wiring, Phase 7 (monetization, BYOK, Stripe, credits, settings real wiring) — each blocked by its own unlock

🟢 Governance-NEUTRAL (allowed without phase unlock):
- SEO baseline only — `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `app/opengraph-image.tsx`, root `metadata` cleanup. NOT a phase deliverable; production-baseline only. NO marketing strategy / blog / docs / public-funnel work — those are governance-locked.
- Drift cleanup of orphan/zombie surfaces — `app/dashboard/saas/page.tsx` (Stitch template residue, broken types), `app/dashboard/channel/` singular duplicate, hardcoded `/campaigns/1` placeholder in `Sidebar.tsx`. Each is removable with minimal diff and breaks no phase.

🚫 DO NOT:
- Touch Phase 2 without explicit authorization
- Build automation engine before Phase 2 lands
- Reactivate legacy `decisions` table without an explicit decision
- Re-open the closed Phase 4 minimal slice
- Re-open closed Phase 0 / Phase 1 patches
- Re-open the 13 closed backend runtime hardening passes
- Wire mocked frontend surfaces ahead of their owning phase unlock
- Implement BYOK / Stripe / credits / onboarding / public marketing without Phase 7 unlock

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

All Phase 0 + Phase 1 foundation patches are CLOSED (2026-05-07). Active-surface backend runtime hardening is SATURATED. SEO baseline allow-list and drift cleanup are CLOSED (2026-05-07 continuation). Phase 2 unlock prep is IN PROGRESS (2026-05-07 continuation #2): canonical schema migration AUTHORED at `supabase/migrations/20260507120000_phase2_data_ingestion.sql`; deploy + 503-gate lift await separate authorization.

Active execution target (within current authorization):

NONE — schema-prep step is complete. Remaining Phase 2 unlock-prep steps (deploy via `supabase db push`, post-deploy SQL verification, 503-gate lift on `/integrations/*` + `/metrics/*`, end-to-end OAuth+sync verification) require subsequent authorization because each carries operational risk: deploy applies real DB migrations; gate-lift exposes routes that fail with 42P01 if deploy didn't actually land.

Holding pattern (default):

- Maintain governance lock until next authorization arrives
- Preserve all closed-slice invariants verbatim
- Preserve Phase 2 503 gates on `/integrations/*` + `/metrics/*` until deploy is verified
- Reject any work that would lift gates prematurely or that crosses into Phase 4 Part 2 / Phase X broader / Phase 5 / Phase 6 frontend wiring / Phase 7 without explicit authorization

DO NOT:

- start Phase 4 Part 2 (automation engine + multi-platform real handlers) before Phase 2 unlock
- start integrations (Phase 2) without explicit unlock
- modify legacy `decisions` table without explicit re-architecture decision
- re-open Phase 4 minimal slice
- re-open closed Phase 0 / Phase 1 patches
- re-open the 13 closed backend runtime hardening passes
- wire mocked frontend pages ahead of their owning phase unlock
- implement BYOK / Stripe / credits / onboarding / public marketing without Phase 7 unlock

CURRENT GOAL:

Hold governance lock. Phase foundation is hardened; the system is ready for Phase 2 unlock when explicitly authorized. Phase 4 Part 2 and broader Phase X will land cleanly given the foundation now in place.

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
  - `20260503170252_remote_schema.sql` (remote sync — drift fix)
- Authored, NOT YET DEPLOYED:
  - `20260507120000_phase2_data_ingestion.sql` (Phase 2 unlock prep — integrations, ad_accounts, campaign_metrics partitioned, sync_logs; awaits `supabase db push` + 503-gate lift)
- Schema: ALIGNED with code (Phase 3 + Phase 4 minimal — fully closed; Phase 2 awaits deploy)
- Legacy: `/db/_archive_migrations/` — ARCHIVE ONLY, never referenced

RULE:

Claude MUST read:
- the canonical migration file for the table being touched
- before ANY DB usage, confirm the table schema matches the code's `from(...).select(...)` shape

---

## LAST UPDATE

2026-05-03 — Phase 4 (minimal slice) CLOSED. CLOSING_AUDIT_PHASE4.md generated. Phase 4 Part 2 explicitly scoped as DEFERRED with documented unlock conditions. PATCH QUEUE updated; Phase 0 + Phase 1 are now the active focus (parallel-safe). HARD LOCK refreshed to incorporate Phase 4 invariants (max-percent cap, idempotency unique index, recipient placeholder filter). REAL SYSTEM CAPABILITIES enumerates the live action surface and the deferred surface explicitly.

2026-05-07 — Phase 0 + Phase 1 foundation patches CLOSED via runtime evidence (verified across 13 backend runtime hardening passes). Phase 0: tracingMiddleware + requestLoggerMiddleware + correlator chain across `[req]/[err]/[exec]/[AI]/[auth]/[clerk-webhook]`. Phase 1: canonical envelope (`backend/src/utils/response.ts`) + audit columns on active write paths (auth.ts JIT, createCampaign, updateCampaign). Phase 1 metadata-JSONB on `decisions/creatives/automation_runs` reclassified as governance-bound to those phases' unlocks (NOT a Phase 1 blocker). 13 cumulative backend hardening passes (UUID/body/path/LIST validation parity, PGRST116 discriminator parity, request_id triple-sink, ai-suggestions silent-write fix, pushCampaign discriminator, auth.ts canonical normalization, AI empty-prompt guard, body-limit cap, smoke-flag gate, LIVE-flag dependency fail-fast, deferred-router 503 gating) added to PATCH QUEUE position #5 as DONE. SYSTEM STATUS line corrected: Frontend re-classified from "COMPLETED" to "SHELLED" per runtime evidence (5 pages wired / 34 mocked; mocked-shell state is INTENTIONAL per Phases.md phase scope, NOT drift). NEXT ACTION + CURRENT EXECUTION TARGET updated to reflect saturation: no in-scope active execution target remains; allowed governance-neutral moves are SEO baseline (allow-list) and orphan drift cleanup; all other paths require explicit phase unlock authorization. HARD LOCK preserved verbatim; REAL SYSTEM CAPABILITIES preserved verbatim; PHASE 4 CHECKLIST preserved verbatim; SAFE EXECUTION ORDER preserved verbatim; DATABASE STATE preserved verbatim; TOOLING / EXECUTION CONSTRAINT preserved verbatim. NO code, schema, contract, or migration changes this turn.

2026-05-07 (continuation) — Governance-neutral allow-list executed end-to-end. (1) Drift cleanup: removed three orphan/zombie surfaces — `app/dashboard/saas/page.tsx` (Stitch template residue, broken types, no Sidebar/routing-map reference), `app/dashboard/channel/page.tsx` (singular duplicate of `/dashboard/channels`), `lib/data/mock-data.ts` (Stitch demo dataset that only fed the two orphan pages); removed hardcoded `/campaigns/1` placeholder Sidebar entry and now-unused `BarChart2` import (`components/dashboard/Sidebar.tsx`). (2) SEO baseline created (allow-list only, per SEO SPECIAL RULE; no marketing/blog/docs/funnel work): `app/sitemap.ts` (root only, authenticated SaaS surface intentionally minimal), `app/robots.ts` (public-allow root + auth pages, disallow all authenticated /dashboard, /campaigns, /decisions, /actions, /automation, /creatives, /integrations, /settings, /api), `app/manifest.ts` (PWA manifest using CLAUDE.md §8 design tokens), `app/opengraph-image.tsx` (1200×630 brand image via next/og), `app/layout.tsx` root metadata refreshed (Stitch placeholder copy "Precision Curator Dashboard" → "GrowthHub — AI-powered Growth Operating System"; added openGraph + twitter + robots fields + metadataBase). Frontend tsc → 0 errors (saas/page.tsx pre-existing error eliminated). Backend tsc → 0 errors. Phase locks preserved: NO deferred phase opened, NO schema/contract/migration changes, NO mocked-shell pages wired, NO frontend-backend bridge created beyond static metadata files. Architecture invariants intact: single-writer backend, org_id enforcement, deferred-router 503 gating, canonical envelope, request_id correlator chain, all 13 prior closed hardening passes. Governance-neutral scope is now exhausted; further moves require explicit Phase 2 / Phase 4 Part 2 / Phase X / Phase 5 / Phase 6 frontend / Phase 7 unlock authorization.

2026-05-07 (continuation #2) — Phase 2 unlock prep AUTHORIZED and STARTED. Discovered runtime drift: Phase 2 backend code (connect.ts, integrations.ts, metrics.ts, vault.ts, oauth-state.ts, jobs/inngest.ts, services/sync/{meta,google,shopify,index}.ts) + frontend callback (`app/api/integrations/callback/[platform]/`) all in place; specs/002-data-ingestion/tasks.md marks T001–T027 complete. BUT canonical migration was missing from `/supabase/migrations/` — only existed in forbidden `/db/_archive_migrations/` directory (per CLAUDE.md MIGRATION SOURCE OF TRUTH rule, archive is never referenced for execution). Executed schema-prep step ONLY (not deploy or gate-lift): authored `supabase/migrations/20260507120000_phase2_data_ingestion.sql` from `specs/002-data-ingestion/data-model.md` authority, with one runtime-evidenced amendment — added `campaign_metrics.integration_id UUID REFERENCES integrations(id)` to match runtime upsert payloads in services/sync/{meta,google,shopify}.ts (per "runtime evidence overrides documentation" governance rule). Migration creates 4 tables: integrations, ad_accounts, campaign_metrics (PARTITIONED BY date with 8 quarterly partitions + default), sync_logs; all with RLS + org_id-scoped policies + indexes. Phase 2 status: DEFERRED → PARTIAL. DATABASE STATE updated to list authored-but-not-yet-deployed migration. PATCH QUEUE position #6 reclassified IN PROGRESS. NEXT ACTION + CURRENT EXECUTION TARGET reflect new state. NO 503 gates lifted — gates remain in place on `/integrations/*` and `/metrics/*` until `supabase db push` deploy is verified. NO backend code touched; tsc still 0 errors. Phase locks preserved: Phase 4 minimal slice (actions_library, decision_history) UNTOUCHED; Phase 3 (ai_decisions, ai_logs, campaigns) UNTOUCHED; Phase 4 Part 2 STILL DEFERRED behind Phase 2 deploy + per-org token plumbing. Architecture invariants intact: single-writer backend, org_id enforcement, deferred-router gating preserved on all currently-deferred routers, canonical envelope, request_id correlator chain, all 13 prior closed hardening passes preserved.




TOOLING / EXECUTION CONSTRAINT

AI MUST NOT:

* invent auxiliary infrastructure outside the repository architecture
* create parallel execution systems
* introduce standalone debug frameworks
* create speculative tooling layers
* bypass the canonical migration/runtime/logging flow
* introduce ad-hoc orchestration utilities outside the approved system structure

Python/runtime tooling is ALLOWED only when:

* it operates inside the existing repository architecture
* it supports the current system control flow
* it does not create architectural drift
* it does not bypass canonical migrations, runtime flow, logging, or validation layers
* it remains fully aligned with CURRENT PHASE constraints

FORBIDDEN:

* shadow infrastructure
* parallel audit systems
* speculative execution frameworks
* temporary orchestration layers
* non-canonical runtime paths

If tooling requires introducing a new operational layer:
STOP and report the architectural requirement instead of inventi