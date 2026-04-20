# Tasks: Intelligence Layer — AI Decision Engine

**Input**: Design documents from `specs/003-intelligence-layer/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and update environment configuration.

- [ ] T001 Install `openai@^4` package in `backend/` (`npm install openai`)
- [ ] T002 [P] Add `OPENROUTER_API_KEY` and `OPENROUTER_DEFAULT_MODEL=google/gemini-2.0-flash-001` to `backend/.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and shared backend services that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Create `supabase/migrations/20260420000003_intelligence.sql` — ALTER `organizations` to add `credits_balance INTEGER NOT NULL DEFAULT 1000` and `vault_byok_openrouter_secret_id UUID`; CREATE `decision_runs`, `decisions`, `alerts`, `alert_thresholds` tables with full RLS (all with `org_id`); partial unique index `ON decision_runs(org_id) WHERE status = 'in_progress'`; unique constraint on `alert_thresholds(org_id, type)`; CREATE `deduct_credit(p_org_id TEXT)` SQL function that atomically runs `UPDATE organizations SET credits_balance = credits_balance - 1 WHERE org_id = p_org_id AND credits_balance >= 1 AND plan_type = 'subscription' RETURNING credits_balance`; all indexes from data-model.md
- [ ] T004 [P] Create `backend/src/services/ai/openrouter.ts` — export `getOpenRouterClient(apiKey: string): OpenAI` factory that instantiates `new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1', defaultHeaders: { 'HTTP-Referer': 'https://growthhub.app', 'X-Title': 'GrowthHub' } })`; export `generateDecisionExplanation(client, context): Promise<{ explanation, confidence_rationale, recommended_action }>` that calls `chat.completions.create` with structured JSON prompt (system + user message) requesting `explanation`, `confidence_rationale`, `recommended_action` fields; model from `process.env.OPENROUTER_DEFAULT_MODEL`
- [ ] T005 [P] Create `backend/src/services/intelligence/anomaly-detection.ts` — export `detectAnomalies(orgId: string): Promise<AnomalyCandidate[]>` that runs PostgreSQL window function query (`AVG(roas) OVER (PARTITION BY campaign_id ORDER BY date ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)` — same for spend and conversions) against `campaign_metrics`, filters to latest row per campaign, requires `data_points >= 3`, evaluates thresholds: ROAS_DROP (latest < avg × 0.70), SPEND_SPIKE (latest > avg × 3.0), CONVERSION_DROP (latest < avg × 0.60); returns typed array with campaign_id, platform, type, trigger_condition string, data_snapshot JSONB
- [ ] T006 [P] Create `backend/src/services/intelligence/alert-detection.ts` — export `detectAlerts(orgId: string, runId: string): Promise<number>` that fetches per-org alert thresholds (with system defaults: ROAS_BELOW_THRESHOLD=1.5, SPEND_EXCEEDED=10000) from `alert_thresholds`, queries latest day's `campaign_metrics`, compares against thresholds, skips campaigns with existing active alert of same type within 24h (dedup), inserts new `alerts` rows with severity (critical if breach > 2× threshold, else warning); returns count of alerts inserted
- [ ] T007 Create `backend/src/services/intelligence/decision-generator.ts` — export `generateDecisionsForOrg(orgId: string, runId: string): Promise<number>` that: (1) fetches org `plan_type` and `vault_byok_openrouter_secret_id`; (2) resolves OpenAI client via billing gate — `ltd` path reads BYOK key from Vault using `readSecret()`, `subscription` path calls `supabaseAdmin.rpc('deduct_credit', { p_org_id: orgId })` per decision and uses `process.env.OPENROUTER_API_KEY`; (3) for each anomaly from `detectAnomalies`: computes `confidence_score` (base 100 - delta_pct × 0.5, +10 if data_points≥7, +5 if 2+ consecutive days, capped 0–100) and `priority_score` (ROAS_DROP×90, CONVERSION_DROP×85, SPEND_SPIKE×70, SCALING_OPPORTUNITY×40 multiplied by confidence/100); (4) generates AI explanation or sets `ai_status='credits_exhausted'`/`'ai_unavailable'` on failure; (5) marks existing active decisions for same (org_id, campaign_id, type) as `stale`; (6) upserts new `decisions` rows; returns total decisions written
- [ ] T008 Create `backend/src/services/intelligence/index.ts` — export `dispatchIntelligence(orgId: string, trigger: 'sync_complete' | 'manual'): Promise<{ runId: string }>` that: (1) inserts a `decision_runs` row with status `in_progress` (throws on unique conflict = 409 duplicate run); (2) calls `generateDecisionsForOrg(orgId, runId)` and `detectAlerts(orgId, runId)` sequentially; (3) updates `decision_runs` to `completed` with counts or `failed` with error_message; returns `runId`

**Checkpoint**: Shared services ready. All user story backend routes can now be implemented.

---

## Phase 3: User Story 1 — Automated Anomaly Detection & Decision Generation (Priority: P1) 🎯 MVP

**Goal**: AI decision engine runs automatically after each sync and generates prioritized decision records. Decisions Overview page shows real data.

**Independent Test**: Trigger `POST /api/v1/decisions/refresh`, wait 60s, verify `GET /api/v1/decisions` returns records with `ai_status='completed'` (or graceful fallback), and `app/decisions/page.tsx` renders them sorted by priority_score.

- [ ] T009 [P] [US1] Create `backend/src/routes/v1/decisions.ts` — Hono router with all decision endpoints: `GET /` (list with query params `type`, `platform`, `status`, `limit`, `offset`; queries `decisions` scoped to `orgId`; returns paginated `{ decisions, total, limit, offset }`); `GET /run-status` (returns latest `decision_runs` row for org — MUST be registered before `/:id`); `POST /refresh` (calls `dispatchIntelligence(orgId, 'manual')`, returns 202 with `run_id`; catches duplicate run conflict and returns 409); `GET /:id` (returns full decision with `data_snapshot` — returns 404 if not found or wrong org)
- [ ] T010 [US1] Extend `backend/src/jobs/inngest.ts` — add new `generateDecisions` Inngest function `{ id: 'generate-decisions', triggers: [{ event: 'intelligence/decisions.requested' }] }` that calls `dispatchIntelligence(orgId, 'sync_complete')` from `../services/intelligence/index.js`; extend the existing `syncIntegration` function's success path to `await step.sendEvent('trigger-decisions', { name: 'intelligence/decisions.requested', data: { orgId } })` after updating `last_synced_at`; add `generateDecisions` to the `functions` export array
- [ ] T011 [US1] Mount `decisionsRouter` in `backend/src/routes/v1/index.ts` — import and add `v1.route('/decisions', decisionsRouter)` after existing route registrations
- [ ] T012 [US1] Rewrite `app/decisions/page.tsx` — replace static data with: `useEffect` fetching `GET /api/v1/decisions` via `apiClient`; "Refresh Decisions" button calling `POST /api/v1/decisions/refresh`; loading state using `Loader2` from lucide-react; no-data empty state with link to `/integrations`; render decision cards sorted by `priority_score` showing platform icon, anomaly type badge, confidence score, recommended action summary; preserve existing visual design from static shell

**Checkpoint**: User Story 1 fully functional. Can trigger refresh, see decisions, and verify AI explanations appear.

---

## Phase 4: User Story 2 — Decision Detail & AI Reasoning (Priority: P2)

**Goal**: Clicking a decision card navigates to a detail page showing full AI explanation, data snapshot, confidence rationale, and recommended action.

**Independent Test**: Navigate directly to `/decisions/:id` with a valid decision ID and verify all fields render including `data_snapshot` metrics, `ai_explanation`, `confidence_score`, and `recommended_action`. Verify a cross-org ID returns a not-found state.

- [ ] T013 [P] [US2] Rewrite `app/decisions/[id]/page.tsx` — replace static data with: extract `id` from `useParams()`; `useEffect` fetching `GET /api/v1/decisions/:id` via `apiClient`; render trigger condition, `data_snapshot` metric values (roas, spend, conversions, date_range) as a data table; render `ai_explanation` text or a `ai_status` fallback message ("Add credits to see AI analysis" for `credits_exhausted`, "AI analysis unavailable" for `ai_unavailable`); render `confidence_score` as percentage bar with `confidence_rationale` label; render `recommended_action` in a highlighted action card; 404/not-found state for missing or cross-org decisions; preserve existing visual design

**Checkpoint**: Clicking any decision card on the Overview navigates to a populated detail page.

---

## Phase 5: User Story 3 — Alerts Center: Threshold-Based Triggers (Priority: P3)

**Goal**: The Alerts Center shows active threshold breach alerts with breach details. Users can dismiss alerts.

**Independent Test**: Temporarily lower a ROAS threshold to 9999 in `alert_thresholds` (or direct DB insert), trigger a refresh, verify alert appears on `app/decisions/alerts/page.tsx`, and dismiss it successfully.

- [ ] T014 [P] [US3] Create `backend/src/routes/v1/alerts.ts` — Hono router with: `GET /` (list alerts with query params `status` default `active`, `type`, `platform`, `limit`, `offset`; scoped to orgId; returns `{ alerts, total, limit, offset }` sorted by `created_at DESC`); `PATCH /:id/dismiss` (sets `status='resolved'`, `resolved_at=now()` for active alert belonging to org; returns 404 if not found, 409 if already resolved)
- [ ] T015 [US3] Mount `alertsRouter` in `backend/src/routes/v1/index.ts` — import and add `v1.route('/alerts', alertsRouter)`
- [ ] T016 [P] [US3] Rewrite `app/decisions/alerts/page.tsx` — replace static data with: `useEffect` fetching `GET /api/v1/alerts` via `apiClient`; render alerts grouped by severity (critical first, then warning); each card shows platform, campaign_id, alert type badge, `breached_value` vs `threshold_value`, time elapsed since alert fired; "Dismiss" button calling `PATCH /api/v1/alerts/:id/dismiss` and removing alert from view on success; empty state ("No active alerts"); preserve existing visual design

**Checkpoint**: Alerts Center shows real threshold violations and dismiss works end-to-end.

---

## Phase 6: User Story 4 — Opportunities Page: Growth Signal Detection (Priority: P4)

**Goal**: Opportunities page surfaces campaigns with SCALING_OPPORTUNITY decisions (ROAS > 3.5x for 5+ days).

**Independent Test**: Seed `campaign_metrics` with a ROAS of 4.0x for 5 consecutive days, trigger a refresh, and verify a decision of type `SCALING_OPPORTUNITY` appears on `app/decisions/opportunities/page.tsx`.

- [ ] T017 [P] [US4] Rewrite `app/decisions/opportunities/page.tsx` — replace static data with: `useEffect` fetching `GET /api/v1/decisions?type=SCALING_OPPORTUNITY&status=active` via `apiClient`; render opportunity cards sorted by `priority_score` (highest ROAS first) showing platform, campaign_id, `trigger_condition` (average ROAS + streak days), `recommended_action`; empty state ("No scaling opportunities detected — keep running campaigns and check back after your next sync"); preserve existing visual design

**Checkpoint**: Opportunities page shows only SCALING_OPPORTUNITY decisions with real data.

---

## Phase 7: User Story 5 — Manual Decision Refresh with Polling (Priority: P5)

**Goal**: "Refresh Decisions" button on the Overview page shows live progress by polling run status every 3 seconds.

**Independent Test**: Click "Refresh Decisions", verify a loading/spinner state appears immediately, click it again before completion and verify it is disabled or shows "in progress", wait for completion and verify the decision list refreshes automatically without a page reload.

- [ ] T018 [US5] Add polling to `app/decisions/page.tsx` — extend the existing refresh button implementation: after `POST /decisions/refresh` returns 202, start polling `GET /api/v1/decisions/run-status` every 3000ms using `setInterval`; stop polling when `status` is `completed` or `failed`; on completion, re-fetch decisions list; disable the "Refresh Decisions" button while polling is active and show a spinner; if initial refresh returns 409 (already in progress), start polling immediately; display a "Refresh in progress…" status label during polling

**Checkpoint**: Full US5 complete. Refresh button is live and self-updating.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final environment config and task completion.

- [ ] T019 [P] Add `OPENROUTER_API_KEY=sk-or-xxx` to `backend/.env.example` (if not already present from T002)
- [ ] T020 Mark all tasks complete in `specs/003-intelligence-layer/tasks.md` (replace `- [ ]` with `- [x]` for all T001–T019)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Requires Phase 2 — MVP deliverable
- **US2 (Phase 4)**: Requires T009 (GET /:id endpoint created in US1) — then parallel with US3/US4
- **US3 (Phase 5)**: Requires Phase 2 — parallel with US2/US4/US5
- **US4 (Phase 6)**: Requires T009 (GET /decisions?type= endpoint) — parallel with US2/US3
- **US5 (Phase 7)**: Requires T012 (Decisions Overview page exists) — extends that page
- **Polish (Phase 8)**: Requires all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (Phase 2). No story dependencies.
- **US2 (P2)**: Depends on T009 (decisions router). Frontend-only; independently testable.
- **US3 (P3)**: Depends on Foundational (Phase 2). No story dependencies. Parallel-safe with US1/US2.
- **US4 (P4)**: Depends on T009 (decisions router, SCALING_OPPORTUNITY filter). Parallel-safe with US2/US3.
- **US5 (P5)**: Depends on T012 (Decisions Overview page). Extends existing file.

### Within Each User Story

- Backend route → mount in index.ts → frontend page
- Foundational services always before routes that use them

---

## Parallel Opportunities

### Phase 2 (Foundational) — run T004, T005, T006 in parallel

```
T003 (migration) → then:
  T004 (openrouter.ts)       [parallel]
  T005 (anomaly-detection.ts) [parallel]
  T006 (alert-detection.ts)  [parallel]
→ T007 (decision-generator.ts — needs T004, T005, T006)
→ T008 (index.ts — needs T007)
```

### After Phase 2 completes — US1, US3 can start in parallel

```
Phase 2 complete → then:
  US1: T009 → T010 → T011 → T012
  US3: T014 → T015 → T016   [parallel with US1]
```

### After T009 completes — US2 and US4 can start

```
T009 complete → then:
  US2: T013          [parallel]
  US4: T017          [parallel]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001, T002)
2. Phase 2: Foundational (T003–T008)
3. Phase 3: US1 (T009–T012)
4. **STOP and VALIDATE**: Run quickstart scenarios 1–3 from quickstart.md
5. Verify `app/decisions/page.tsx` shows real decisions with AI explanations

### Incremental Delivery

1. Setup + Foundational → services ready
2. US1 → Decisions Overview live with real data (MVP!)
3. US2 → Decision Detail page live
4. US3 → Alerts Center live
5. US4 → Opportunities page live
6. US5 → Refresh button polling live
7. Polish → env vars, task completion

### Critical Implementation Notes

- **Route order in decisions.ts**: Register `GET /run-status` BEFORE `GET /:id` — Hono matches in registration order and `/:id` will capture the string `'run-status'` if registered first
- **Inngest functions export**: After adding `generateDecisions` to `inngest.ts`, it must be added to the `functions` array — the `serve()` call in `backend/src/index.ts` uses this array
- **BYOK null check**: If `ltd` org has `vault_byok_openrouter_secret_id = null`, set `ai_status = 'ai_unavailable'` on all decisions; do NOT call `readSecret(null)`
- **Stale decision logic**: Before upserting new decisions, run `UPDATE decisions SET status = 'stale' WHERE org_id = $1 AND campaign_id = $2 AND type = $3 AND status = 'active'` for each detected anomaly
- **deduct_credit RPC**: Called once per AI explanation attempt. If it returns no rows (credits = 0), skip AI generation for that decision, set `ai_status = 'credits_exhausted'`, still insert the decision record with rule-based fields populated
