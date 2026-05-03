# Tasks: Frontend → Backend Integration

**Input**: Design documents from `specs/007-frontend-api-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- No test tasks (not requested in spec)

---

## Phase 1: Setup (Environment)

**Purpose**: Ensure environment is configured before any code changes.

- [X] T001 Verify `.env.local` exists at repo root with `NEXT_PUBLIC_BACKEND_URL=http://72.62.131.250:3001`; create if missing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure changes that MUST be complete before any page can reach the backend.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `hono/cors` middleware to `backend/src/index.ts` immediately after `app.use('*', logger())` — allow origin `http://localhost:3000`, methods GET/POST/PUT/PATCH/DELETE/OPTIONS, header Content-Type/Authorization, credentials true
- [X] T003 Enhance `lib/api-client.ts`: add status-specific error messages (401→"Your session expired — please sign in again", 403→"Access Denied — contact your administrator", 404→"Resource not found", ≥500→"Server error — try again in a few moments"); wrap the entire fetch in try/catch so network errors (fetch throws) produce `ApiError(0, "Connection failed — check your internet connection")`

**Checkpoint**: Backend now returns CORS headers; api-client produces friendly error messages for all failure modes.

---

## Phase 3: User Story 1 — Live Dashboard Data (Priority: P1) 🎯 MVP

**Goal**: Dashboard Overview shows real metrics from the backend; hardcoded campaign rows and chart bars are replaced with API data.

**Independent Test**: Navigate to Dashboard → see KPI tiles load from `/api/v1/metrics/summary`; campaigns table shows real org campaigns or a "No active campaigns" empty state. No "Spring Collection 2024" or similar mock rows appear.

- [X] T004 [US1] Remove hardcoded `campaigns` const array (lines 36–41) from `app/dashboard/overview/page.tsx`
- [X] T005 [US1] Remove hardcoded `chartBars` and `days` consts from `app/dashboard/overview/page.tsx`
- [X] T006 [US1] Add `campaigns` state and fetch from `GET /api/v1/campaigns?limit=5&status=active` in `app/dashboard/overview/page.tsx`; use `apiClient` with `getToken()`
- [X] T007 [US1] Add loading skeleton, error state with Retry, and empty state ("No active campaigns") for the campaigns table section in `app/dashboard/overview/page.tsx`
- [X] T008 [US1] Replace static chart bars in `app/dashboard/overview/page.tsx` with bars derived from the campaigns API response (use spend values proportionally) or a static decorative placeholder if no trend data is available from the campaigns endpoint

**Checkpoint**: Dashboard shows all 4 UI states. No hardcoded campaign or chart data remains.

---

## Phase 4: User Story 2 — Brand Kit & Creatives Real Data (Priority: P1)

**Goal**: Brand Kit persists changes to the backend; Creatives displays real generation results.

**Independent Test**: Open Brand Kit → update tone of voice → save → refresh → value persists. Open Creatives → see generation history or purposeful empty state.

- [X] T009 [P] [US2] Read `app/brand-kit/page.tsx` — verify it calls `GET /api/v1/brand-kit` on mount, calls `PUT /api/v1/brand-kit` on save, calls `POST /api/v1/brand-kit/logo` on file upload, and implements all 4 UI states (loading skeleton, error with Retry, empty state, success); add any missing states or API calls
- [X] T010 [P] [US2] Read `app/creatives/page.tsx` — verify it calls `GET /api/v1/creatives` on mount and `POST /api/v1/creatives` on generation submit, and implements all 4 UI states; add any missing states or API calls

**Checkpoint**: Brand Kit and Creatives are fully live. Data persists on refresh.

---

## Phase 5: User Story 3 — Decisions & Actions Live Data (Priority: P2)

**Goal**: Decisions, Action library, Action detail, Execution logs, and Automation status all show real backend data with all 4 UI states.

**Independent Test**: Navigate to each page — see loading skeleton → data or purposeful empty state. No static arrays in source. No console errors.

- [X] T011 [P] [US3] Read `app/decisions/page.tsx` — verify `GET /api/v1/decisions` on mount with all 4 UI states; add any missing loading/error/empty states
- [X] T012 [P] [US3] Read `app/decisions/[id]/page.tsx` — verify `GET /api/v1/decisions/:id` on mount with all 4 UI states including 404 handling ("Decision not found"); add if missing
- [X] T013 [P] [US3] Read `app/decisions/alerts/page.tsx` — verify `GET /api/v1/alerts` on mount with all 4 UI states; add API call and states if page is still static
- [X] T014 [P] [US3] Read `app/actions/page.tsx` — verify `GET /api/v1/actions` on mount with all 4 UI states; add any missing states
- [X] T015 [US3] Read `app/actions/[id]/page.tsx` — verify `GET /api/v1/actions/:id` on mount and `POST /api/v1/actions/:id/execute` on execute button, with all 4 UI states; add if missing
- [X] T016 [P] [US3] Read `app/actions/logs/page.tsx` — verify it fetches execution history from `GET /api/v1/history` with all 4 UI states; add if missing
- [X] T017 [P] [US3] Read `app/actions/automation/page.tsx` — verify `GET /api/v1/automation` on mount with all 4 UI states; add if missing

**Checkpoint**: All Decisions and Actions pages are live. Every page has loading/error/empty/success states.

---

## Phase 6: User Story 4 — Integrations & Automation History (Priority: P2)

**Goal**: Integrations page shows real platform connection status. Automation History shows complete decision memory with all fields.

**Independent Test**: Open Integrations → see Meta and Google cards with real status (connected/disconnected) and last sync time. Open Automation History → see table of past decisions with result badges, confidence scores, AI explanations.

- [X] T018 [P] [US4] Read `app/integrations/page.tsx` — verify `GET /api/v1/integrations` on mount with all 4 UI states; add any missing states; ensure platform cards show real `status`, `last_sync_at`, and `account_name` from API response
- [X] T019 [P] [US4] Read `app/integrations/connect/page.tsx` — verify OAuth connect flow calls `POST /api/v1/integrations/connect/:provider`; add loading/error states if missing
- [X] T020 [P] [US4] Read `app/automation/history/page.tsx` — verify `GET /api/v1/history` on mount with all 4 UI states; confirm table renders `decision`, `action_taken`, `trigger_condition`, `result` badge, `confidence_score`, `ai_explanation`, and `created_at`; add any missing columns or states

**Checkpoint**: All pages in all four user stories are connected to the backend with proper UI states.

---

## Phase 7: Polish & Verification

**Purpose**: Confirm zero mock data remains; TypeScript compiles clean; environment is secure.

- [X] T021 Run `grep -r "Spring Collection\|Brand Search EMEA\|UGC Influencer\|Retargeting Phase\|chartBars" app/ lib/` — must return zero results; if any match found, remove the hardcoded data from that file
- [X] T022 Run `npx tsc --noEmit` from repo root; fix all TypeScript type errors before proceeding
- [X] T023 Verify `.env.local` is listed in `.gitignore`; add it if missing
- [X] T024 Commit all changes on branch `claude/init-growthhub-PaRUm` with message "feat: connect all frontend pages to backend API (Phase 7)" and push with `git push -u origin claude/init-growthhub-PaRUm`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — highest priority, do first
- **US2 (Phase 4)**: Depends on Phase 2 — can run in parallel with US1 if desired
- **US3 (Phase 5)**: Depends on Phase 2 — start after US1 complete
- **US4 (Phase 6)**: Depends on Phase 2 — start after US2 complete, can parallel with US3
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: No story dependencies — start after Foundational
- **US2 (P1)**: No story dependencies — can run in parallel with US1
- **US3 (P2)**: No story dependencies beyond Foundational
- **US4 (P2)**: No story dependencies beyond Foundational

### Within Each User Story

- Tasks marked [P] within the same story touch different files — safe to parallelize
- Tasks without [P] must run sequentially (same file edits)

### Parallel Opportunities

```bash
# Phase 2: Run T002 and T003 sequentially (T003 depends on T002 for context, same logical unit)
# Phase 3: T004→T005→T006→T007→T008 sequentially (same file)
# Phase 4: T009 and T010 can run in parallel (different files)
# Phase 5: T011, T012, T013, T014, T016, T017 can run in parallel; T015 sequential
# Phase 6: T018, T019, T020 can run in parallel (different files)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003) — CRITICAL
3. Complete Phase 3: US1 Dashboard (T004–T008)
4. **STOP and VALIDATE**: Network tab shows `72.62.131.250:3001` calls with JWT; no mock campaign rows; all 4 states work
5. If valid, continue to US2

### Incremental Delivery

1. Setup + Foundational → CORS and API client working
2. US1 → Dashboard live → verify with quickstart.md Scenarios 1–3
3. US2 → Brand Kit + Creatives live → verify Scenarios 6–7
4. US3 → Decisions + Actions live → verify Scenarios 9
5. US4 → Integrations + History live → verify Scenario 10
6. Polish → Zero mock data, clean TypeScript, committed

---

## Notes

- [P] tasks = different files, safe to parallelize within the same phase
- [Story] label maps each task to its user story for traceability
- No new backend routes needed — all API endpoints exist from Phases 1–6
- `hono/cors` is already in the hono package — zero new dependencies
- The api-client.ts already uses `NEXT_PUBLIC_BACKEND_URL` — do NOT rename to `NEXT_PUBLIC_API_URL`
- Campaigns pages (`app/campaigns/`) are already connected (Phase 6) — excluded from this task list
