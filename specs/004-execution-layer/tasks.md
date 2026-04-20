# Tasks: Execution Layer — Actions, Automation & Decision History

**Input**: Design documents from `specs/004-execution-layer/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration creating all 4 new tables, seed data, and RLS — blocks all other work.

- [ ] T001 Create `supabase/migrations/20260420000004_execution.sql` — CREATE TABLE `actions_library` (id UUID, platform, action_type, name, description, parameter_schema JSONB, no org_id — system global); CREATE TABLE `automation_rules` (id UUID, org_id, name, trigger_type CHECK IN ROAS_DROP/SPEND_SPIKE/CONVERSION_DROP/SCALING_OPPORTUNITY, min_confidence_threshold 0–100, action_template_id FK→actions_library, action_params JSONB, enabled BOOLEAN DEFAULT true, run_count INT DEFAULT 0, last_fired_at, created_at, updated_at); CREATE TABLE `automation_runs` (id UUID, org_id, automation_rule_id FK→automation_rules, decision_id FK→decisions nullable, action_template_id FK→actions_library, status CHECK IN pending/success/failed/skipped, result_data JSONB, error_message, executed_at); CREATE TABLE `decision_history` (id UUID, org_id, decision TEXT, action_taken TEXT, trigger_condition TEXT, data_used JSONB, result CHECK IN success/failed/skipped, ai_explanation TEXT nullable, confidence_score INT nullable, decision_id FK→decisions nullable, automation_rule_id FK→automation_rules nullable, automation_run_id FK→automation_runs nullable, executed_by CHECK IN manual/automation, created_at); ALTER TABLE decision_runs ADD COLUMN IF NOT EXISTS rules_executed INT DEFAULT 0; RLS ENABLE + org_id policies on automation_rules/automation_runs/decision_history; SELECT-only RLS (USING true) on actions_library; all indexes from data-model.md; INSERT seed data for 8 action templates (pause_campaign/increase_budget/decrease_budget/send_alert_email for meta+google) with fixed UUIDs 00000000-0000-0000-0000-000000000001 through 00000000-0000-0000-0000-000000000008 ON CONFLICT DO NOTHING

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core execution services that all user story routes depend on.

**⚠️ CRITICAL**: No user story work can begin until T002–T004 are complete.

- [ ] T002 [P] Create `backend/src/services/execution/action-executor.ts` — define `ActionHandler = (params, ctx: { orgId, campaignId?, platform }) => Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }>`; define `ACTION_HANDLERS: Record<string, ActionHandler>` with mocked implementations for `pause_campaign`, `increase_budget`, `decrease_budget`, `send_alert_email` (each returns `{ success: true, result_data: { simulated: true, action_type, ...params } }`); export `executeAction(templateId: string, params: Record<string, unknown>, orgId: string, decisionId?: string): Promise<{ historyId: string; result: string; resultData: Record<string, unknown> }>` that: (1) fetches template from `actions_library` by id (404 if not found); (2) validates required params against `parameter_schema.fields` (throws `{ code: 'MISSING_PARAMETER', field }` for missing required fields); (3) checks org has `status='connected'` integration for template's platform via `supabaseAdmin.from('integrations')` (throws `{ code: 'INTEGRATION_NOT_CONNECTED', platform }` if none); (4) if `decisionId` provided, fetches decision's `data_snapshot`, `ai_explanation`, `confidence_score`, `trigger_condition` from `decisions` table; (5) calls `ACTION_HANDLERS[template.action_type]`; (6) inserts `decision_history` record with all constitution-mandated fields (`decision`, `action_taken`, `trigger_condition`, `data_used`, `result`, `ai_explanation`, `confidence_score`, `decision_id`, `executed_by='manual'`, `org_id`); (7) returns `{ historyId, result, resultData }`
- [ ] T003 Create `backend/src/services/execution/automation-engine.ts` — export `dispatchAutomation(orgId: string, runId: string): Promise<number>` that: (1) fetches all `enabled=true` automation_rules for org with join to actions_library (to get platform); (2) fetches run's started_at from `decision_runs` where `id=runId`; (3) fetches all `status='active'` decisions for org created since run started_at; (4) for each decision, finds matching rules where `rule.trigger_type = decision.type` AND `decision.confidence_score >= rule.min_confidence_threshold`; (5) for each (decision, rule) match: resolves params by replacing `campaign_id: 'auto'` with `decision.data_snapshot?.campaign_id ?? decision.campaign_id`, calls `executeAction(rule.action_template_id, resolvedParams, orgId, decision.id)` wrapped in try/catch, inserts `automation_runs` record with `status=success/failed`, updates `automation_rules` SET `run_count = run_count + 1, last_fired_at = now()` WHERE id=rule.id; (6) returns total rules executed count
- [ ] T004 Modify `backend/src/services/intelligence/index.ts` — add `import { dispatchAutomation } from '../execution/automation-engine.js'`; after `alertsGenerated = await detectAlerts(orgId, runId)` add `const rulesExecuted = await dispatchAutomation(orgId, runId)`; add `rules_executed: rulesExecuted` to the `decision_runs` UPDATE payload in the completed branch

**Checkpoint**: Execution services ready. All user story routes can now be implemented.

---

## Phase 3: User Story 1 — Browse & Execute Actions from Actions Library (Priority: P1) 🎯 MVP

**Goal**: Actions Library page lists all system action templates; Action Detail page renders dynamic parameter form and executes the action; result appears in Decision History.

**Independent Test**: With the seed migration applied, navigate to `/actions`, see 8 templates grouped by platform, click "Pause Campaign (Meta)", fill in `campaign_id`, click Execute, verify `/api/v1/history` contains a new record with `result=success` and `executed_by=manual` within 5 seconds.

- [ ] T005 [P] [US1] Create `backend/src/routes/v1/actions.ts` — Hono router with: `GET /` (query `supabaseAdmin.from('actions_library').select(*)`, optional `platform` and `action_type` query params as filters, returns `{ actions, total }`); `GET /:id` (returns single template or 404); `POST /:id/execute` (read `params` and optional `decision_id` from JSON body; call `executeAction(id, params, orgId, decision_id)` imported from `../../services/execution/action-executor.js`; on `INTEGRATION_NOT_CONNECTED` error return 422 `{ error, code }`; on `MISSING_PARAMETER` error return 400 `{ error, code }`; on not found return 404; on success return 200 `{ history_id, result, result_data }`)
- [ ] T006 [US1] Mount `actionsRouter` in `backend/src/routes/v1/index.ts` — add `import { actionsRouter } from './actions.js'` and `v1.route('/actions', actionsRouter)` after existing route registrations
- [ ] T007 [P] [US1] Rewrite `app/actions/page.tsx` — `"use client"`, `useAuth()` + `apiClient`; `useEffect` fetching `GET /api/v1/actions`; group templates by platform (meta/google/shopify) as separate sections; each template card shows platform badge (blue=meta/orange=google/green=shopify), action_type badge, name, description, link to `/actions/:id`; loading state with `Loader2`; empty state if no actions; use design tokens (font-sans headings, font-body text, bg-white cards, shadow-sm, rounded-2xl)
- [ ] T008 [P] [US1] Rewrite `app/actions/[id]/page.tsx` — `"use client"`, extract `id` from `useParams()`; `useEffect` fetching `GET /api/v1/actions/:id`; render action name, platform badge, description; render parameter form dynamically from `parameter_schema.fields` (each field: label, text input, required marker); "Execute" button calls `POST /api/v1/actions/:id/execute` with `{ params: formValues }`; on success show green result banner with `history_id` and link to `/automation/history`; on 422 show "Platform not connected" error with link to `/integrations`; on 400 show field-level validation error; loading/disabled state during execution; 404 state for unknown action

**Checkpoint**: User Story 1 fully functional — manual execution from Actions Library works end-to-end.

---

## Phase 4: User Story 2 — View Decision History (Memory System) (Priority: P2)

**Goal**: Decision History page shows every execution (manual or automated) with full context — the system's memory and learning loop.

**Independent Test**: After executing any action (US1), navigate to `/automation/history` and verify the record shows decision label, action_taken, trigger_condition, result badge, confidence score, executed_by badge, and timestamp. Click into a record and verify `data_used` and `ai_explanation` are visible.

- [ ] T009 [P] [US2] Create `backend/src/routes/v1/history.ts` — Hono router with: `GET /` (query `decision_history` for org_id, supports `executed_by`, `result`, `decision_id` query param filters, `limit` default 50 / `offset` default 0, ORDER BY created_at DESC, returns `{ history, total, limit, offset }` — SELECT all columns EXCEPT `data_used` for list view to keep payload small); `GET /:id` (returns full record including `data_used` JSONB and `ai_explanation`; 404 if not found or org_id mismatch)
- [ ] T010 [US2] Mount `historyRouter` in `backend/src/routes/v1/index.ts` — add `import { historyRouter } from './history.js'` and `v1.route('/history', historyRouter)`
- [ ] T011 [P] [US2] Rewrite `app/automation/history/page.tsx` — `"use client"`, `useAuth()` + `apiClient`; `useEffect` fetching `GET /api/v1/history`; render records sorted newest-first; each row shows: `decision` text (truncated), `action_taken`, result badge (success=green/failed=red/skipped=gray), `executed_by` badge (manual=blue/automation=purple), `confidence_score`%, timestamp (timeAgo helper); clicking a row expands an inline detail panel showing `trigger_condition`, `data_used` key-value pairs, `ai_explanation` (or "AI explanation not available"), `confidence_score` bar; empty state "No execution history yet"; stats row showing total/success/failed counts

**Checkpoint**: Decision History is live and captures all executions from US1.

---

## Phase 5: User Story 3 — Build & Manage Automation Rules (Priority: P3)

**Goal**: Users can create IF→THEN rules, enable/disable them, and the automation engine fires matching rules after each decision generation run.

**Independent Test**: Create a rule "IF ROAS_DROP AND confidence ≥ 70 THEN Pause Campaign (Meta)", enable it, trigger a decision refresh that generates a ROAS_DROP decision with confidence ≥ 70, and verify an automation_run record and a decision_history record both exist with `executed_by=automation`.

- [ ] T012 [P] [US3] Create `backend/src/routes/v1/automation.ts` — Hono router (register static paths BEFORE parameterized): `GET /rules` (query automation_rules for org joined to actions_library for template name, returns `{ rules, total }`); `POST /rules` (validate trigger_type in enum, min_confidence_threshold 0–100, action_template_id exists in actions_library; insert; return 201); `PATCH /rules/:id` (update enabled/min_confidence_threshold/action_params for rule belonging to org; 404 if not found or wrong org; return updated rule); `DELETE /rules/:id` (delete rule for org; 404 if not found or wrong org; return `{ deleted: true }`); `GET /runs` (query automation_runs for org joined to automation_rules for rule name and actions_library for action name, supports `status`/`rule_id` filters, `limit`/`offset`, ORDER BY executed_at DESC, returns `{ runs, total, limit, offset }`)
- [ ] T013 [US3] Mount `automationRouter` in `backend/src/routes/v1/index.ts` — add `import { automationRouter } from './automation.js'` and `v1.route('/automation', automationRouter)`
- [ ] T014 [P] [US3] Rewrite `app/actions/automation/page.tsx` — `"use client"`, `useAuth()` + `apiClient`; `useEffect` fetching `GET /api/v1/automation/rules` and `GET /api/v1/actions` (for template picker); render rules list: each rule shows name, `trigger_type` badge, `min_confidence_threshold`%, action template name, `run_count`, `last_fired_at` (timeAgo), enable/disable toggle (calls `PATCH /api/v1/automation/rules/:id` with `{ enabled }` and updates optimistically), delete button (calls `DELETE /api/v1/automation/rules/:id`); "New Rule" button opens an inline form with: name input, trigger_type select (ROAS_DROP/SPEND_SPIKE/CONVERSION_DROP/SCALING_OPPORTUNITY), min confidence threshold number input (0–100), action template select populated from actions list (grouped by platform), submit calls `POST /api/v1/automation/rules`; empty state "No automation rules yet — create your first rule"; use design tokens

**Checkpoint**: Automation rules are fully functional — create, enable/disable, delete, and auto-fire after decision generation.

---

## Phase 6: User Story 4 — View Execution Logs (Priority: P4)

**Goal**: Dedicated Execution Logs page showing every automation run — operational health view for the automation engine.

**Independent Test**: After at least one automation rule fires (from US3 test), navigate to `/actions/logs` and verify the run appears with rule name, action name, status badge, and timestamp.

- [ ] T015 [P] [US4] Rewrite `app/actions/logs/page.tsx` — `"use client"`, `useAuth()` + `apiClient`; `useEffect` fetching `GET /api/v1/automation/runs`; render runs sorted newest-first; each entry shows: status badge (success=green/failed=red/skipped=gray), rule name, action name, executed_at (timeAgo); on failure show `error_message` in a red sub-row; stats row showing total/success/failed counts; empty state "No automation runs yet — rules will appear here once a decision refresh runs with matching rules active"; use design tokens (bg-white cards, rounded-2xl, shadow-sm)

**Checkpoint**: Execution Logs page shows real automation run data.

---

## Phase 7: User Story 5 — Manual Execution from Decision Detail Page (Priority: P5)

**Goal**: "Execute Recommended Action" button on the Decision Detail page closes the loop — one click from AI insight to executed action.

**Independent Test**: Navigate to `/decisions/:id` for a ROAS_DROP decision on a Meta campaign, click "Execute Recommended Action", enter a campaign_id, confirm, and verify a success toast appears and `/api/v1/history` has a new record with `decision_id` matching the decision and `executed_by=manual`.

- [ ] T016 [US5] Modify `app/decisions/[id]/page.tsx` — in the "Recommended Action" section add an "Execute" button; on click show a confirmation modal (use a simple inline state-driven overlay) with: action name resolved from decision type + platform (ROAS_DROP→pause_campaign, SPEND_SPIKE→decrease_budget, CONVERSION_DROP→pause_campaign, SCALING_OPPORTUNITY→increase_budget; map to platform-specific template IDs using a `DECISION_ACTION_MAP` constant), a `campaign_id` text input, a `reason` text input (pre-filled with decision.trigger_condition); on confirm call `POST /api/v1/actions/:templateId/execute` with `{ params: { campaign_id, reason }, decision_id: id }`; show success toast "Action executed — view in Decision History" with link to `/automation/history`; show error toast on 422 (not connected) or other failure; add `executing` boolean state to disable button during in-flight request; import `apiClient` and `useAuth` (already present in file)

**Checkpoint**: Full US5 complete — one-click execution from Decision Detail to Decision History.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final task tracking completion.

- [ ] T017 Mark all tasks T001–T016 complete in `specs/004-execution-layer/tasks.md` (replace `- [ ]` with `- [x]` for all tasks)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: T002 can run in parallel with T001; T003 requires T002 (calls executeAction); T004 requires T003 (calls dispatchAutomation)
- **US1 (Phase 3)**: Requires T004 — T005/T007/T008 parallel; T006 requires T005
- **US2 (Phase 4)**: Requires T001 (DB) — T009/T011 parallel; T010 requires T009
- **US3 (Phase 5)**: Requires T004 (dispatchAutomation wired) — T012/T014 parallel; T013 requires T012
- **US4 (Phase 6)**: Requires T013 (GET /automation/runs endpoint available)
- **US5 (Phase 7)**: Requires T006 (POST /actions/:id/execute endpoint available)
- **Polish (Phase 8)**: Requires all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 complete. MVP deliverable.
- **US2 (P2)**: Depends on T001 (DB only). Fully independent of US1 backend. Parallel-safe.
- **US3 (P3)**: Depends on T004 (dispatchAutomation in intelligence/index.ts). Parallel-safe with US1/US2.
- **US4 (P4)**: Depends on T013 (automation router mounted, GET /runs available). Frontend-only phase.
- **US5 (P5)**: Depends on T006 (actions execute endpoint mounted). Extends existing file.

### Within Each User Story

- Backend route → mount in index.ts → frontend page
- Foundational services always before routes that use them

---

## Parallel Opportunities

### Phase 2 (Foundational) — T002 parallel with T001

```
T001 (migration) ─────────────────────────────────────┐
T002 (action-executor.ts) [parallel with T001]         ├→ T003 (automation-engine.ts) → T004 (intelligence/index.ts)
```

### After Phase 2 completes — US1, US2, US3 backend routes can start in parallel

```
Phase 2 complete → then:
  US1: T005 → T006 → T007/T008 [parallel]
  US2: T009 → T010 → T011 [parallel with US1]
  US3: T012 → T013 → T014 [parallel with US1/US2]
```

### After T013 completes

```
T013 complete → T015 (US4 frontend, uses GET /automation/runs)
T006 complete → T016 (US5, uses POST /actions/:id/execute)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: T001 (migration)
2. Phase 2: T002 → T003 → T004 (execution services + intelligence wiring)
3. Phase 3: T005 → T006 → T007 → T008 (actions route + frontend)
4. **STOP and VALIDATE**: Run quickstart scenarios 1–2 from quickstart.md
5. Verify `/actions` shows 8 templates, execution works, history records appear

### Incremental Delivery

1. Setup + Foundational → services ready
2. US1 → Actions Library + manual execution live (MVP!)
3. US2 → Decision History page live
4. US3 → Automation Rules + auto-firing live
5. US4 → Execution Logs page live
6. US5 → Decision Detail execute button live
7. Polish → task completion

### Critical Implementation Notes

- **Route order in automation.ts**: Register `GET /rules` and `GET /runs` BEFORE any `/:id` routes
- **action_params 'auto' resolution**: In automation-engine.ts, replace `campaign_id: 'auto'` with `decision.data_snapshot?.campaign_id ?? decision.campaign_id` before calling executeAction
- **decision_history fields are non-negotiable**: The constitution mandates exact field names — `decision`, `action_taken`, `trigger_condition`, `data_used`, `result`, `ai_explanation`, `confidence_score`
- **Pre-flight vs post-flight logging**: INTEGRATION_NOT_CONNECTED and MISSING_PARAMETER throw BEFORE history insertion; execution failures (handler throws) insert history with `result='failed'`
- **index.ts mount order**: actions → automation → history, all after existing routes
- **DECISION_ACTION_MAP in decisions/[id]/page.tsx**: `{ ROAS_DROP: { meta: 'seed-01', google: 'seed-04' }, SPEND_SPIKE: { meta: 'seed-03', google: 'seed-06' }, CONVERSION_DROP: { meta: 'seed-01', google: 'seed-04' }, SCALING_OPPORTUNITY: { meta: 'seed-02', google: 'seed-05' } }` using the fixed seed UUIDs
