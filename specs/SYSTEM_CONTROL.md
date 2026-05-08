# SYSTEM STATE — SOURCE OF TRUTH

## CURRENT PHASE
Phase 5 — ⚠️ PARTIAL 2026-05-07 (canonical migration AUTHORED at `supabase/migrations/20260507140000_phase5_creatives.sql`; existing backend code/services already in place from prior scaffolding — `services/creatives/{brand-kit,creative-generator,copy-generation,image-generation,storage}.ts` + `routes/v1/{creatives,brand-kit}.ts` + 5 frontend mocked-shell pages; awaits `supabase db push` deploy + `/creatives/*` + `/brand-kit/*` 503-gate lift). Phase 0 + Phase 1 + Phase 2 + Phase 3 (linear) + Phase 4 minimal + Phase 4 Part 2 + 13 backend hardening passes ALL CLOSED. · Next: deploy migration → verify → lift gates. Phase 7 substrate columns (`organizations.plan_type` + `vault_byok_openrouter_secret_id`) added in this migration as the MINIMAL forward-positioning required by Phase 5 FR-011 BYOK gate; this is NOT Phase 7 monetization implementation (no Stripe, no billing UI, no plan upgrade flow).

---

## SYSTEM STATUS

* Frontend: SHELLED — Stitch UI shells completed across all routing-map pages; live API wiring is partial. Wired-and-now-live (Phase 2): `app/integrations/page.tsx`, `app/integrations/connect/page.tsx`, `app/dashboard/overview/page.tsx`, `app/dashboard/channels/page.tsx`, `app/api/integrations/callback/[platform]/route.ts`. Wired-but-deferred-target: `app/decisions/[id]/page.tsx` (waiting on Phase 3 anomaly-engine unlock). Mocked: 33 pages governance-bound to Phase 3 anomaly engine / Phase 4 Part 2 / Phase 5 / Phase 6 frontend / Phase 7 unlocks per Phases.md. Mocked-shell state is INTENTIONAL, not drift.
* Backend: OPERATIONAL — Phase 0 closed; Phase 1 closed (active surface); Phase 2 closed; Phase 3 closed; Phase 4 (minimal slice) closed; 4 real action handlers live
* Integrations: ✅ READY — OAuth + sync infrastructure live behind /api/v1/integrations and /api/v1/metrics; per-org credential storage via Supabase Vault is operational. Real platform credentials (META_APP_ID/SECRET, GOOGLE_ADS_CLIENT_ID/SECRET/DEVELOPER_TOKEN, SHOPIFY_API_KEY/SECRET, OAUTH_REDIRECT_BASE_URL) must be populated in env before user-facing OAuth flows succeed; missing values produce explicit runtime errors per route, not startup-fail (Phase 2 OAuth env intentionally NOT in startup-fail list — connect routes only consume them on demand).
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

Status: ✅ CLOSED (2026-05-07)

Deliverables (all met):
- [x] Backend code: `connect.ts`, `integrations.ts`, `metrics.ts`, `vault.ts`, `oauth-state.ts`, `services/sync/{meta,google,shopify,index}.ts`, `jobs/inngest.ts` (per `specs/002-data-ingestion/tasks.md` T001–T021)
- [x] Frontend OAuth callback: `app/api/integrations/callback/[platform]/route.ts` (T010)
- [x] Frontend integrations + dashboard wiring: `app/integrations/page.tsx`, `app/integrations/connect/page.tsx`, `app/dashboard/overview/page.tsx`, `app/dashboard/channels/page.tsx` (T011, T012, T024, T025)
- [x] Canonical migration AUTHORED: `supabase/migrations/20260507120000_phase2_data_ingestion.sql` (Phase 2 unlock-prep step, 2026-05-07 continuation #2). Authored from `specs/002-data-ingestion/data-model.md` authority + one runtime-evidenced amendment (`campaign_metrics.integration_id` column required by `services/sync/{meta,google,shopify}.ts`). Tables: `integrations`, `ad_accounts`, `campaign_metrics` (PARTITIONED BY date, 8 quarterly + default partitions), `sync_logs`; all with RLS + org_id-scoped policies + indexes.
- [x] Migration DEPLOYED via `supabase db push` (operator-confirmed 2026-05-07); 4 tables verified live in production
- [x] 503 gates LIFTED on `/integrations/*` and `/metrics/*` in `backend/src/routes/v1/index.ts` (2026-05-07 continuation #3)
- [x] Multi-tenant credential storage operational: `integrations.vault_refresh_token_secret_id` references Supabase Vault; per-org tokens replace the legacy single shared `META_TEST_ACCESS_TOKEN` sandbox env var for newly-connected orgs

Patch Type: DB migration + route gate-lift (SAFE — additive; tables orthogonal to all existing closed-phase tables; gates lifted only on schema-backed routes)

Exit Gate (✅ all satisfied):
✔ Migration deployed and 4 tables + 4 RLS policies live in production
✔ 503 gates lifted on `/integrations/*` and `/metrics/*`
✔ Phase 2 wired frontend (`app/integrations/page.tsx`, dashboard overview/channels) reaches live backend instead of hitting 503
✔ Phase 4 Part 2 unlock condition partially satisfied: per-org Meta tokens addressable from `executeAction` once tokens flow through `vault_refresh_token_secret_id` (vs the shared sandbox env). Google/Shopify per-org tokens identically addressable.

Known follow-ups (NOT Phase 2 blockers; tracked for future patches):
- Phase 2 routes (`integrations.ts`, `connect.ts`, `metrics.ts`) emit LEGACY response envelopes (bare arrays, `{error:'...'}`, `{error,message}`) rather than the canonical Phase 1 `{success, data, error:{message,code}, request_id}` shape used by the active hardened surface (auth, ai, actions, history, campaigns). The wired frontend (`api-client` + `integrations/page.tsx` + dashboard pages) currently consumes the LEGACY shape directly. Migrating these routes onto the canonical envelope is a future Phase-1-cross-cutting patch requiring coordinated frontend changes; **deferred to keep Phase 2 ship without breaking the wired frontend.** Tagged as `PHASE2_ENVELOPE_FOLLOWUP` in this doc.
- Phase 2 OAuth env vars (META_APP_ID/SECRET, GOOGLE_ADS_*, SHOPIFY_API_KEY/SECRET, OAUTH_REDIRECT_BASE_URL) are NOT in the startup-fail-fast list. Missing values produce per-route runtime errors when users attempt OAuth flows. Promoting these to startup-fail-fast (matching the LIVE_FLAG_DEPENDENCIES pattern) is a future hardening task; tagged as `PHASE2_OAUTH_ENV_FAILFAST_FOLLOWUP`.

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

Status: ✅ CLOSED (2026-05-07) — schema deployed via `supabase db push`; PR #5 merged into main (commit `df2f243`); `/automation/*` 503 gate lifted; manual-execute path operational. Auto-firing on AI decision stream remains DEFERRED-BY-GOVERNANCE (cross-phase dependency, see "Governance-BLOCKED" subsection below).

Authored / shipped 2026-05-07:
- [x] `automation_rules` table (org-scoped, RLS, trigger_type enum, min_confidence_threshold, action_template_id FK, action_params JSONB, run counters)
- [x] `automation_runs` table (org-scoped, RLS; uses `ai_decision_id` REFERENCES ai_decisions(id) — substituted for spec's deprecated `decisions(id)` per CANONICAL AI SYSTEM resolution)
- [x] `decision_history` extended with nullable `automation_rule_id` + `automation_run_id` columns (additive; preserves Phase 4 minimal close)
- [x] Canonical migration: `supabase/migrations/20260507130000_phase4_part2_automation.sql` — authored from `specs/004-execution-layer/data-model.md` with one runtime-evidenced amendment (substituted `ai_decisions(id)` for deprecated `decisions(id)` per "Do NOT reactivate the deprecated legacy decisions table" instruction)
- [x] Automation engine rewritten (`backend/src/services/execution/automation-engine.ts`): exports `evaluateRulesForAIDecision(orgId, aiDecisionId)`, `executeRule(orgId, ruleId, aiDecisionId?)`, and a legacy-shim `dispatchAutomation(orgId, runId)` retained for spec-conformance but explicitly dormant. Uses canonical `ai_decisions` exclusively; does not reference deprecated `decisions` table. Confidence comparison normalizes ai_decisions.confidence_score (NUMERIC 0–1) against rule.min_confidence_threshold (INTEGER 0–100).
- [x] Automation router canonicalized (`backend/src/routes/v1/automation.ts`): GET/POST/PATCH/DELETE `/rules`, GET `/runs`, plus new `POST /rules/:id/execute` for manual rule firing. Canonical `ok()/fail()` envelope, UUID + body-shape + LIST validation parity with the rest of the active hardened surface.
- [x] `google.pause_campaign` real-mode handler added to `action-executor.ts` (`realGooglePauseCampaign`). Behind `GOOGLE_PAUSE_CAMPAIGN_LIVE` flag + `GOOGLE_LIVE_ORG_ALLOWLIST` (defaults OFF; mirrors Meta pattern). Reads per-org refresh token via Phase 2 Vault (`integrations.vault_refresh_token_secret_id` → `readSecret`), refreshes OAuth at `oauth2.googleapis.com/token`, resolves customer_id from `ad_accounts.platform_account_id`, calls Google Ads API `customers/{cid}/campaigns:mutate` with `developer-token` header. Tokens never logged.
- [x] Per-org execution rate limit added to `executeAction`: env-configurable `ACTION_EXECUTION_MAX_PER_MINUTE` (default 60); DB-backed count of `decision_history` inserts in last 60s; throws `code: 'RATE_LIMITED'` with `retryAfterSeconds`. Idempotent replays do NOT count (early-returned upstream of the guard). Set to 0 to disable.
- [x] `executeAction` `ExecuteActionInput` extended with optional `automationRuleId` + `automationRunId` for Phase 4 Part 2 audit linkage. Both written into `decision_history` INSERT (NULLABLE; manual executions leave NULL).
- [x] `LIVE_FLAG_DEPENDENCIES` startup-fail-fast extended with `GOOGLE_PAUSE_CAMPAIGN_LIVE → [GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET]`.

Completed (continuation #5, 2026-05-07):
- [x] `supabase db push` — deployed migration to production
- [x] Verified deploy via PR #5 merge into main + canonical migration in `/supabase/migrations/20260507130000_phase4_part2_automation.sql` (10664 bytes)
- [x] Lifted `/automation/*` 503 gate in `backend/src/routes/v1/index.ts` (single-line removal + governance comment block; 4 remaining deferred gates preserved)

Pending (DEFERRED-BY-GOVERNANCE — separate phase scopes):
- [ ] Frontend wiring of `/automation/*` mocked surfaces (Phase 7 frontend-integration scope)

Governance-BLOCKED (require explicit cross-phase authorization):
- [ ] Auto-firing of automation_rules on every `ai_decisions` INSERT — requires either:
  - (a) Phase 3 anomaly engine unlock (would categorize decisions like ROAS_DROP / SPEND_SPIKE / etc. — but Phase 3 anomaly is DEPRECATED+DEFERRED per CANONICAL AI SYSTEM), OR
  - (b) AI Output Contract extension to include `result.category` field on `ai_decisions` (cross-phase change to closed Phase 3 schema), OR
  - (c) post-persist hook in `services/ai/execute-ai-decision.ts` calling `evaluateRulesForAIDecision(org_id, decision_id)` — would extend the closed Phase 3 linear pipeline
  Until any of (a)–(c) is authorized, automation_rules fire ONLY via `POST /api/v1/automation/rules/:id/execute` (manual / admin).

- [ ] `meta.*_budget` for non-test orgs (still single-tenant via shared `META_TEST_ACCESS_TOKEN` — Phase 2 vault flow is in place; per-org Meta refresh-token migration is a future hardening matching the google.pause_campaign pattern).

- [ ] `process.exit(1)` softening on `unhandledRejection` (cross-cutting concern, broader than Phase 4 — separate governance discussion).

Spec-vs-runtime adaptation log (governance-driven):
- Spec data-model.md `automation_runs.decision_id REFERENCES decisions(id)` → migrated to `ai_decision_id REFERENCES ai_decisions(id)` per "Do NOT reactivate decisions table" + Phase 4 minimal close pattern.
- Spec data-model.md `decision_history.decision_id REFERENCES decisions(id)` → NOT added; current schema already uses `ai_decision_id REFERENCES ai_decisions(id)` (Phase 4 minimal close); legacy `decision_id` column was deliberately omitted there.
- Spec data-model.md `ALTER TABLE decision_runs ADD COLUMN rules_executed` → NOT added; `decision_runs` table does not exist in canonical schema (Phase 3 anomaly DEFERRED).
- Spec dispatchAutomation `for-each (rule, active-decision-from-decision_runs-cycle)` pattern → REPLACED with `evaluateRulesForAIDecision(orgId, aiDecisionId)` (per-AI-decision invocation; no decision_runs cycle).
- Spec automation_rules trigger_type matching `decision.type` → adapted to match `ai_decisions.result.category` JSONB path (a soft semantic dependency on AI Output Contract; rule won't auto-fire if AI doesn't emit category).

Patch Type: DB migration + backend code (SAFE — additive schema; canonical envelope preserved; HARD LOCK invariants preserved verbatim)

Exit Gate (✅ all satisfied):
✔ Migration deployed; 2 new tables + 2 added columns + 2 RLS policies live in production
✔ /automation/* 503 gate lifted (continuation #5)
✔ Auto-firing path explicitly accepted as governance-deferred (cross-phase dependency tracked)
✔ Manual-execute path operational via `POST /api/v1/automation/rules/:id/execute`
✔ All HARD LOCK invariants from Phase 4 minimal close preserved verbatim
✔ Closed Phase 3 linear pipeline UNTOUCHED
✔ Legacy `decisions` table NOT reactivated (canonical AI surface remains `ai_decisions`)

---

### Phase 5 — AI Creatives

Status: ⚠️ PARTIAL — unlock authorized 2026-05-07; canonical schema migration AUTHORED but NOT YET DEPLOYED. Existing scaffolding (services + routes + frontend pages) was already in place from earlier development; this unlock provides the missing schema substrate.

Authored / shipped (continuation #6, 2026-05-07):
- [x] Backend services (pre-existing scaffolding): `services/creatives/{brand-kit,copy-generation,creative-generator,image-generation,storage,index}.ts` (per FR-001..FR-013)
- [x] Backend routes (pre-existing, behind 503): `routes/v1/{creatives,brand-kit}.ts`
- [x] Frontend mocked-shell pages (pre-existing): `app/creatives/{page,archive,brand-kit,editor,results}/page.tsx` (5 pages)
- [x] Canonical migration: `supabase/migrations/20260507140000_phase5_creatives.sql` — 3 new tables (`brand_kits`, `creative_generations`, `creatives`) + 2 organizations columns (`plan_type`, `vault_byok_openrouter_secret_id` — Phase 7 substrate required by Phase 5 FR-011 BYOK gate; documented as the source of currently-active 42703 in `creative-generator.ts:resolveApiKey` defensive comment) + 1 storage bucket (`creatives`, private, signed-URL access). All RLS + indexes per spec.

Spec-vs-runtime adaptation log (governance-driven):
- Spec functional requirements (FR-001..FR-013) → schema captures Brand Kit (one per org, FR-002), Creative Generation (job ledger, FR-005), Creative (per-output rows, FR-007/FR-009/FR-010), and FR-011 BYOK substrate.
- Spec assumes `creatives` Storage bucket exists ahead of time → migration creates it idempotently via `INSERT INTO storage.buckets ... ON CONFLICT DO NOTHING`.
- Code references `organizations.plan_type` + `vault_byok_openrouter_secret_id` (creative-generator.ts:19-22) → migration adds them as NULLABLE/`subscription`-default substrate. This is the MINIMAL forward-positioning of Phase 7 schema columns required by Phase 5 FR-011 — it does NOT implement Phase 7 monetization (no Stripe, no billing UI, no plan upgrade flow, no credits ledger).
- Frontend pages currently mocked-shells with no `apiClient` coupling → no PHASE5_ENVELOPE_FOLLOWUP risk; routes can be canonicalized in a future pass without breaking frontend.

Pending (require subsequent authorization or operator):
- [ ] `supabase db push` — deploy authored migration
- [ ] Verify deploy via post-migration SQL (3 new tables + 2 added organizations columns + 3 RLS policies + 1 storage bucket)
- [ ] Lift `/creatives/*` + `/brand-kit/*` 503 gates in `backend/src/routes/v1/index.ts` (ONLY after deploy verified)
- [ ] Operator-side env: `SILICONFLOW_API_KEY` (image generation per CLAUDE.md TECH STACK), `SUPABASE_STORAGE_BUCKET=creatives` (default already matches)
- [ ] Frontend wiring of `app/creatives/*` mocked pages (Phase 7 frontend-integration scope)
- [ ] PHASE5_ENVELOPE_FOLLOWUP — canonicalize `creatives.ts`/`brand-kit.ts` from legacy envelope to Phase 1 ok()/fail() (low-risk; frontend not coupled)

Patch Type: DB migration + storage bucket (SAFE — additive schema; existing backend services + routes operate against new schema; HARD LOCK invariants preserved)

Exit Gate (PARTIAL until):
✔ Migration deployed and 3 new tables + 2 added columns + 1 storage bucket + 3 RLS policies live in production
✔ /creatives/* + /brand-kit/* 503 gates lifted
✔ At least one Brand Kit save + one copy generation + one image generation fully exercised end-to-end
✔ Phase 7 substrate columns confirmed populated/queryable without runtime drift

---

### Phase X — AI Orchestration

Status: 🔄 SPLIT

- "Linear pipeline" portion (single trace through validate → log → persist via `executeAIDecision`): ✅ shipped as Phase 3 close
- "Broader" portion (MCP routing, tool-governance, DB log-sink fan-out for ai_logs, strategy_tag enum): 🔒 LOCKED until Phase 4 Part 2 stable

Unlock Condition for the broader Phase X:
✔ Phase 4 Part 2 stable + automation engine working with ai_decisions linkage (✅ now satisfied)

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
6. ✅ Phase 2 (data ingestion) — DONE (2026-05-07): migration `20260507120000_phase2_data_ingestion.sql` deployed via `supabase db push`; 4 canonical tables live; 503 gates lifted on `/integrations/*` and `/metrics/*`; wired frontend (integrations + dashboard overview/channels) reaches live backend. Multi-tenant credential storage operational via Supabase Vault.
7. ✅ Phase 4 Part 2 (automation engine + multi-platform real handlers) — DONE (2026-05-07): canonical migration `20260507130000_phase4_part2_automation.sql` deployed via `supabase db push`; PR #5 merged into main (commit `df2f243`); 2 canonical tables (automation_rules, automation_runs) + 2 nullable decision_history columns live in production; `/automation/*` 503 gate lifted; automation engine + google.pause_campaign + per-org rate limiting operational. AUTO-FIRING on AI decision stream remains GOVERNANCE-BLOCKED (cross-phase dependency); manual-execute path operational via `POST /automation/rules/:id/execute`.
8. ⚠️ Phase 5 (AI Creatives) — IN PROGRESS (2026-05-07): canonical migration `20260507140000_phase5_creatives.sql` AUTHORED; backend services + routes + 5 frontend mocked pages already in place from prior scaffolding. REMAINING: `supabase db push` deploy + 503-gate lift on `/creatives/*` + `/brand-kit/*`. Migration adds 3 new tables (brand_kits, creative_generations, creatives) + 2 organizations columns (Phase 7 BYOK substrate; minimal forward-positioning required by Phase 5 FR-011) + 1 private storage bucket.
9. Phase X broader (MCP, tool governance, DB log-sink fan-out, strategy_tag enum) — REQUIRES EXPLICIT AUTHORIZATION; Phase 4 Part 2 prerequisite now satisfied. Specs: `specs/mcp-orchestration.md`, `specs/mcp-integration.md`, `specs/ai-execution.md`, `specs/009-ai-orchestration/spec.md`.
9. Frontend wiring of remaining mocked surfaces — bound to each owning phase's unlock state (Phase 6 campaigns frontend wiring, Phase 7 frontend integration scope for settings/billing/team)
10. PHASE2_ENVELOPE_FOLLOWUP — migrate `integrations.ts`/`connect.ts`/`metrics.ts` onto canonical Phase 1 `{success, data, error:{message,code}, request_id}` envelope (currently emit legacy bare-array / `{error:'...'}` shapes). Coordinated frontend update to api-client/page consumers required. NOT a Phase 2 blocker; deferred for future Phase-1-cross-cutting patch.
11. PHASE2_OAUTH_ENV_FAILFAST_FOLLOWUP — promote META_APP_ID/SECRET, GOOGLE_ADS_*, SHOPIFY_API_KEY/SECRET, OAUTH_REDIRECT_BASE_URL to startup-fail-fast (matches LIVE_FLAG_DEPENDENCIES pattern). NOT a Phase 2 blocker; runtime errors today are explicit per-route.

---

## EXECUTION RULES

- NEVER switch phase until completion condition is met
- ALWAYS apply patches in parallel where they don't conflict (Phase 0 + Phase 1 are parallel-safe)
- DO NOT skip blocker validation
- Frontend MUST NOT break

---

## NEXT ACTION (STRICT)

👉 Phase 5 (AI Creatives) UNLOCK AUTHORIZED + IN PROGRESS (2026-05-07). Schema migration AUTHORED at `supabase/migrations/20260507140000_phase5_creatives.sql`; backend services + routes + 5 frontend pages already scaffolded. REMAINING: deploy via `supabase db push` + lift `/creatives/*` + `/brand-kit/*` 503 gates.

✅ Closed since last NEXT ACTION:
- D) Phase 4 Part 2 unlock — schema deployed + automation engine canonicalized + google.pause_campaign real-mode handler + per-org rate limiting + manual-execute path + 503 gate lifted ✅

⚠️ IN PROGRESS:
- E) Phase 5 (AI Creatives) — schema authored continuation #6; deploy + gate-lift pending. NOT YET CLOSED until `supabase db push` + verify + gate-lift.

🔒 GOVERNANCE-LOCKED (require explicit authorization):
- F) Phase X broader — MCP routing + tool governance + DB log-sink fan-out + strategy_tag enum. Specs: `specs/mcp-orchestration.md`, `specs/mcp-integration.md`, `specs/ai-execution.md`, `specs/009-ai-orchestration/spec.md`. Prerequisites: Phase 4 Part 2 stable (now satisfied). Note: extending the closed Phase 3 linear pipeline (`services/ai/execute-ai-decision.ts`) for any post-persist hook needed by Phase X broader will require its own minimal-diff cross-phase authorization.
- G) Phase 6 frontend wiring, Phase 7 (monetization, BYOK UI, Stripe, credits, settings real wiring) — each blocked by its own unlock. Phase 5 unlock added the minimal Phase 7 substrate columns (`organizations.plan_type`, `vault_byok_openrouter_secret_id`) but NOT the Phase 7 monetization implementation itself.
- H) Auto-firing of automation_rules on AI decision stream — cross-phase dependency; requires either AI Output Contract `result.category` extension OR closed-Phase-3 post-persist hook OR Phase 3 anomaly engine unlock. Manual-execute path operational today.

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
- Data Source: ✅ READY — Phase 2 closed 2026-05-07; integrations + ad_accounts + campaign_metrics + sync_logs tables live; OAuth + Inngest sync infrastructure operational. Real platform data flows once user OAuths a platform (requires META_APP_ID/SECRET, GOOGLE_ADS_*, SHOPIFY_API_KEY/SECRET in env).
- Auth: ✅ FULLY WORKING — Clerk JWT verification + JIT auto-provisioning of org+user rows in `authMiddleware`
- Automation Engine: ✅ READY — Phase 4 Part 2 closed 2026-05-07; automation_rules + automation_runs tables live; CRUD + manual-execute via `POST /api/v1/automation/rules/:id/execute`. Auto-firing on AI decision stream remains DEFERRED-BY-GOVERNANCE (cross-phase).
- Per-org execution rate limit: ✅ ACTIVE — `ACTION_EXECUTION_MAX_PER_MINUTE` (default 60) gates `executeAction` on every non-replay invocation; idempotent replays not counted.
- Real Action Surface (live, behind flags + token + allowlist):
  - `meta.pause_campaign`
  - `meta.decrease_budget`
  - `meta.increase_budget` (with server-side max-percent cap)
  - `send_alert_email` (Resend; org-admin recipients only; placeholder filter)
  - `google.pause_campaign` (Phase 4 Part 2; per-org Vault refresh-token; OAuth refresh; customer_id from ad_accounts; behind GOOGLE_PAUSE_CAMPAIGN_LIVE flag + GOOGLE_LIVE_ORG_ALLOWLIST)
- Backend API: ✅ WORKING (Hono); `POST /api/v1/ai/execute`, `POST /api/v1/actions/:id/execute`, `GET /api/v1/integrations`, `POST /api/v1/integrations/connect/start`, `POST /api/v1/integrations/connect/complete`, `DELETE /api/v1/integrations/:id`, `POST /api/v1/integrations/:id/sync`, `GET /api/v1/integrations/:id/sync-logs`, `GET /api/v1/metrics/summary`, `GET /api/v1/metrics/channels`, `GET/POST/PATCH/DELETE /api/v1/automation/rules`, `POST /api/v1/automation/rules/:id/execute`, `GET /api/v1/automation/runs` all live
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

Phase 0 + Phase 1 + Phase 2 + Phase 3 (linear) + Phase 4 minimal + Phase 4 Part 2 slices CLOSED. Phase 5 IN PROGRESS (continuation #6, 2026-05-07): schema migration authored; deploy + gate-lift pending. Active-surface backend runtime hardening SATURATED. SEO baseline allow-list and drift cleanup CLOSED.

Active execution target (within current authorization):

Phase 5 deploy → verify → gate-lift on `/creatives/*` + `/brand-kit/*`. Operator-side work (`supabase db push` + verify) is the next governance-blocked dependency.

Subsequent items in the PATCH QUEUE require explicit phase unlock:

- Phase X broader — needs explicit authorization. Prerequisites NOW satisfied: Phase 4 Part 2 stable. Spec authority: `specs/mcp-orchestration.md`, `specs/mcp-integration.md`, `specs/ai-execution.md`, `specs/009-ai-orchestration/spec.md`.
- Phase 6 frontend wiring / Phase 7 — each blocked by its own unlock.
- Auto-firing on AI decision stream — cross-phase dependency.
- PHASE2_ENVELOPE_FOLLOWUP / PHASE2_OAUTH_ENV_FAILFAST_FOLLOWUP / PHASE5_ENVELOPE_FOLLOWUP — non-blocker hardening tasks deferred until coordinated frontend updates can land alongside.

Holding pattern (default):

- Maintain governance lock until next authorization arrives
- Preserve all closed-slice invariants verbatim
- Preserve Phase 5 503 gates on `/creatives/*` + `/brand-kit/*` until deploy is verified
- Reject any work that crosses into Phase X broader / Phase 6 frontend wiring / Phase 7 without explicit authorization
- Preserve remaining deferred-phase 503 gates: `/decisions/*`, `/alerts/*` (each tied to Phase 3 anomaly DEPRECATED+DEFERRED state)

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
- `20260507120000_phase2_data_ingestion.sql` (Phase 2 — integrations, ad_accounts, campaign_metrics partitioned, sync_logs; deployed 2026-05-07 via `supabase db push`; 4 tables verified live in production)
- Authored, NOT YET DEPLOYED:
  - `20260507130000_phase4_part2_automation.sql` (Phase 4 Part 2 — automation_rules, automation_runs, decision_history extension columns; deployed 2026-05-07 via `supabase db push`; PR #5 merged into main commit `df2f243`; tables verified live; `/automation/*` gate lifted)
- Authored, NOT YET DEPLOYED:
  - `20260507140000_phase5_creatives.sql` (Phase 5 — brand_kits + creative_generations + creatives tables; organizations.plan_type + vault_byok_openrouter_secret_id columns as Phase 7 substrate for FR-011 BYOK gate; private `creatives` storage bucket; awaits `supabase db push` + `/creatives/*` + `/brand-kit/*` 503-gate lift)
- Schema: ALIGNED with code (Phase 0 + Phase 1 + Phase 2 + Phase 3 + Phase 4 minimal + Phase 4 Part 2 — all fully closed; Phase 5 awaits deploy)
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

2026-05-07 (continuation #3) — Phase 2 unlock COMPLETED. Operator confirmed: PR merged into `main`; local main synced; `supabase db push` completed successfully; 4 canonical Phase 2 tables (integrations, ad_accounts, campaign_metrics, sync_logs) verified live in production Supabase. Executed final unlock step: lifted 503 gates on `/integrations/*` and `/metrics/*` in `backend/src/routes/v1/index.ts` (removed two `v1.use(...)` deferredPhase lines; preserved gates on `/decisions/*`, `/alerts/*`, `/automation/*`, `/creatives/*`, `/brand-kit/*` per their respective unowned phases). Wired frontend now reaches live backend: `app/integrations/page.tsx` (GET /api/v1/integrations), `app/integrations/connect/page.tsx` (POST connect/start), `app/api/integrations/callback/[platform]/route.ts` (POST connect/complete), `app/dashboard/overview/page.tsx` (GET /api/v1/metrics/summary), `app/dashboard/channels/page.tsx` (GET /api/v1/metrics/channels). Phase 2 status: PARTIAL → CLOSED. CURRENT PHASE updated. SYSTEM STATUS Integrations line corrected: NOT CONNECTED → READY. REAL SYSTEM CAPABILITIES Data Source line corrected: STATIC → READY. PATCH QUEUE position #6 closed; positions #10 and #11 added for non-blocker follow-ups (PHASE2_ENVELOPE_FOLLOWUP for canonical-envelope migration of legacy Phase 2 routes, PHASE2_OAUTH_ENV_FAILFAST_FOLLOWUP for startup-fail-fast on OAuth env). Backend tsc → 0 errors. Phase locks preserved: Phase 4 minimal slice UNTOUCHED, Phase 3 UNTOUCHED, Phase 4 Part 2 STILL DEFERRED (now its prerequisites are satisfied; awaits explicit unlock authorization), all other deferred routers still 503-gated. Architecture invariants intact: single-writer backend, org_id enforcement, canonical envelope on active hardened surface (auth/ai/actions/history/campaigns), request_id correlator chain, all 13 prior closed backend hardening passes. Known remaining envelope inconsistency on Phase 2 routes (legacy bare-array + `{error:'...'}` shapes) explicitly tracked as non-blocker follow-up; the wired frontend was already coupled to the legacy shapes, so canonicalizing the envelope requires coordinated frontend update beyond Phase 2 scope.

2026-05-07 (continuation #6) — Phase 5 (AI Creatives) UNLOCK AUTHORIZED + EXECUTED (schema-prep step; deploy + gate-lift pending). Authored canonical migration `supabase/migrations/20260507140000_phase5_creatives.sql` from `specs/005-ai-creatives/spec.md` authority + runtime evidence in existing backend services (`backend/src/services/creatives/{brand-kit,creative-generator,copy-generation,image-generation,storage}.ts`) and routes (`backend/src/routes/v1/{creatives,brand-kit}.ts`). Migration creates 3 new tables: `brand_kits` (one per org, FR-002), `creative_generations` (job ledger with status enum + ROAS source context, FR-003..FR-005, FR-008, FR-013), `creatives` (per-output rows with type discriminator + content_url/content_text + performance_score CHECK 0-100, FR-007/FR-009/FR-010); ADDS 2 organizations columns (`plan_type` TEXT NOT NULL DEFAULT 'subscription' CHECK + `vault_byok_openrouter_secret_id` UUID NULLABLE) as MINIMAL Phase 7 substrate required by Phase 5 FR-011 BYOK gate (documented in `creative-generator.ts:resolveApiKey` defensive comment as the source of currently-active 42703 schema drift); CREATES 1 private storage bucket `creatives` (idempotent ON CONFLICT DO NOTHING) for image creative storage per CLAUDE.md TECH STACK + `services/creatives/storage.ts` expectations. All 3 new tables RLS-enabled with `org_id = auth.jwt()->>'org_id'` policies + per-table indexes. Phase 5 status: DEFERRED → PARTIAL. CURRENT PHASE updated. PATCH QUEUE: position #8 promoted to Phase 5 IN PROGRESS; positions renumbered (Phase X broader → #9). NEXT ACTION + CURRENT EXECUTION TARGET reflect new state. NO 503 gates lifted — gates remain in place on `/creatives/*` and `/brand-kit/*` until `supabase db push` deploy is verified (matches Phase 2 + Phase 4 Part 2 unlock-prep pattern). NO backend code touched (existing scaffolding preserved verbatim — no canonicalization, no rewrites; tracked as future PHASE5_ENVELOPE_FOLLOWUP). NO frontend pages wired (5 mocked-shells preserved). NO new dependencies added. NO Phase 7 monetization implementation (no Stripe, no billing UI, no plan upgrade flow, no credits ledger — only the schema substrate Phase 5 code already references). Phase locks preserved: Phase 4 minimal slice UNTOUCHED; Phase 4 Part 2 UNTOUCHED; Phase 3 linear pipeline UNTOUCHED; Phase 2 UNTOUCHED at column level (FK references added: creative_generations references ad_accounts as upstream context, no schema changes to existing Phase 2 tables); legacy `decisions` table NOT reactivated. Architecture invariants intact: single-writer backend, org_id enforcement (every new table has `org_id` REFERENCES organizations + RLS policy), canonical envelope on hardened active surface (auth/ai/actions/history/campaigns/automation), request_id correlator chain, all 13 prior closed backend hardening passes preserved. Auto-firing on AI decision stream (Phase 4 Part 2 cross-phase dependency) remains GOVERNANCE-BLOCKED.

2026-05-07 (continuation #5) — Phase 4 Part 2 CLOSED. Operator confirmed: PR #5 merged into `main` (commit `df2f243`); local main synced; `supabase db push` completed; 2 canonical Phase 4 Part 2 tables (automation_rules, automation_runs) + 2 nullable decision_history columns (automation_rule_id, automation_run_id) verified live in production Supabase. Read-only governance audit completed (continuation #4½ within continuation #5) confirming: 11 canonical migrations live, 14 active routers mounted, 5 deferred-router 503 gates active, all HARD LOCK invariants intact, backend tsc 0, frontend tsc 0, single-writer/org_id/canonical-envelope/request_id-correlator/PGRST116-discriminator parity all preserved across hardened surface, FINAL SYSTEM STATUS = GOVERNANCE SAFE WITH WARNINGS (warnings all explicitly tracked, no undocumented drift). Executed final unlock step: lifted `/automation/*` 503 gate in `backend/src/routes/v1/index.ts` (single-line removal at line 91 + governance comment block; +8/-1 LOC; minimal-diff). Preserved: 4 remaining deferred gates (`/decisions/*`, `/alerts/*`, `/creatives/*`, `/brand-kit/*`); `/automation` router mount at line 112 unchanged; all closed-slice invariants verbatim. Phase 4 Part 2 status: PARTIAL → CLOSED. CURRENT PHASE updated. SYSTEM STATUS Automation Engine + Per-org rate limit + Real Action Surface (added google.pause_campaign live) + Backend API endpoint list (added 5 new automation endpoints) all updated. PATCH QUEUE position #7 closed; position #8 (Phase X broader) is now next governed item, requiring explicit unlock authorization. NEXT ACTION + CURRENT EXECUTION TARGET reflect closure. Backend tsc → 0 errors. Frontend tsc → 0 errors. Phase locks preserved: Phase 4 minimal slice UNTOUCHED (HARD LOCK invariants verbatim); Phase 3 linear pipeline UNTOUCHED; Phase 2 UNTOUCHED; legacy `decisions` table NOT reactivated. Auto-firing of automation_rules on AI decision stream remains GOVERNANCE-BLOCKED (cross-phase dependency tracked under PATCH QUEUE position #7 G-clause); manual-execute path via `POST /api/v1/automation/rules/:id/execute` operational.

2026-05-07 (continuation #4) — Phase 4 Part 2 UNLOCK AUTHORIZED + EXECUTED (schema/code shipped; deploy + gate-lift pending). Authored canonical migration `supabase/migrations/20260507130000_phase4_part2_automation.sql` (CREATE automation_rules, CREATE automation_runs, ALTER decision_history ADD nullable automation_rule_id + automation_run_id, RLS + indexes). Per "Do NOT reactivate decisions table" governance rule, substituted spec data-model.md `decision_id REFERENCES decisions(id)` with `ai_decision_id REFERENCES ai_decisions(id)` on automation_runs (mirroring Phase 4 minimal close pattern); did NOT add `decision_id` column to decision_history; did NOT alter `decision_runs` (Phase 3 anomaly DEFERRED, table absent). Rewrote `backend/src/services/execution/automation-engine.ts` end-to-end: removed deprecated `decisions` table reference; new exports `evaluateRulesForAIDecision(orgId, aiDecisionId)` + `executeRule(orgId, ruleId, aiDecisionId?)`; legacy `dispatchAutomation(orgId, runId)` retained as dormant spec-conformance shim; confidence comparison normalizes ai_decisions.confidence_score (0–1 NUMERIC) against rule.min_confidence_threshold (0–100 INTEGER); trigger-type matching uses `ai_decisions.result.category` JSONB path (governance-soft dependency). Canonicalized `backend/src/routes/v1/automation.ts` to use ok()/fail() Phase 1 envelope across GET/POST/PATCH/DELETE /rules + GET /runs; added new `POST /rules/:id/execute` for manual rule firing; UUID + body-shape + LIST + INVALID_FILTER + INVALID_TYPE validation parity with rest of active hardened surface. Added `realGooglePauseCampaign` real-mode handler to `backend/src/services/execution/action-executor.ts` (Google Ads API v19 customers/{cid}/campaigns:mutate; per-org Vault refresh-token resolution; OAuth refresh; customer_id from `ad_accounts.platform_account_id`; structured `[exec]` lifecycle logs; tokens never logged); behind `GOOGLE_PAUSE_CAMPAIGN_LIVE` flag + `GOOGLE_LIVE_ORG_ALLOWLIST`, mirroring Meta pattern. Extended `executeAction` with optional `automationRuleId` + `automationRunId` (threaded into decision_history INSERT). Added per-org execution rate limit: `ACTION_EXECUTION_MAX_PER_MINUTE` (default 60); DB-backed count of decision_history inserts in last 60s; throws `code: 'RATE_LIMITED'` with `retryAfterSeconds: 60`; idempotent replays not counted (early-returned). Promoted `GOOGLE_PAUSE_CAMPAIGN_LIVE` to `LIVE_FLAG_DEPENDENCIES` startup-fail-fast (deps: GOOGLE_ADS_DEVELOPER_TOKEN + GOOGLE_ADS_CLIENT_ID + GOOGLE_ADS_CLIENT_SECRET). Phase 4 Part 2 status: DEFERRED → PARTIAL. NOT lifted: `/automation/*` 503 gate (preserved until deploy verified). NOT touched: action-executor.ts existing 4 real handlers (Meta pause/decrease/increase + Resend send_alert_email) + idempotency + impact_snapshot — all Phase 4 minimal close invariants preserved verbatim. NOT touched: legacy `decisions` table (still DEPRECATED). NOT touched: closed Phase 3 linear pipeline `services/ai/execute-ai-decision.ts` (post-persist hook for auto-firing is GOVERNANCE-BLOCKED). Backend tsc → 0 errors. HARD LOCK preserved verbatim. REAL SYSTEM CAPABILITIES preserved (will be updated to add google.pause_campaign live + automation engine status post-deploy). Auto-firing of automation_rules on AI decision stream is GOVERNANCE-BLOCKED behind Phase 3 anomaly DEPRECATED+DEFERRED state — manual-execute path is operational via `POST /api/v1/automation/rules/:id/execute`; cross-phase authorization required for automatic triggering (extend AI Output Contract with category field OR install post-persist hook in execute-ai-decision.ts OR unlock Phase 3 anomaly engine).




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