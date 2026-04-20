# Tasks: Phase 2 — Data Ingestion

**Input**: Design documents from `specs/002-data-ingestion/`
**Prerequisites**: plan.md ✅ spec.md ✅ data-model.md ✅ contracts/backend-api.md ✅ research.md ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
**Tests**: No test tasks generated (not requested in specification).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no in-phase dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add Phase 2 dependencies so all subsequent phases compile.

- [x] T001 Install `inngest` package in backend (`cd backend && npm install inngest`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared backend helpers, and route registration that MUST exist before any user story work can start.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Create `supabase/migrations/20260420000002_data_ingestion.sql` — 4 tables (`integrations`, `ad_accounts`, `campaign_metrics` partitioned by date, `sync_logs`) with full RLS per `data-model.md`
- [x] T003 [P] Create `backend/src/lib/vault.ts` — Supabase Vault helpers: `createSecret(value): Promise<string>`, `readSecret(id): Promise<string>`, `deleteSecret(id): Promise<void>` using `supabaseAdmin.rpc` and `vault.decrypted_secrets` view
- [x] T004 [P] Create `backend/src/lib/oauth-state.ts` — signed JWT state token helpers: `generateState(orgId, platform): string` (10-min expiry, signed with `OAUTH_STATE_SECRET` or `CLERK_SECRET_KEY`), `validateState(token): { orgId, platform }` (throws on expired/invalid)
- [x] T005 Update `backend/src/routes/v1/index.ts` to import and mount `connectRouter` at `/integrations/connect`, `integrationsRouter` at `/integrations`, `metricsRouter` at `/metrics`, and register Inngest serve handler at `GET|PUT|POST /api/inngest`

**Checkpoint**: Migration applied + vault/oauth-state libs exist + all routes registered → user story implementation can begin.

---

## Phase 3: User Story 1 — Connect an Ad Platform (Priority: P1) 🎯 MVP

**Goal**: A user can authorize Meta Ads, Google Ads, or Shopify from the Integrations page and see it listed as "Connected" with an initial sync queued.

**Independent Test**: Call `POST /api/v1/integrations/connect/start` with `{ platform: "meta" }`, receive a valid `authUrl`. Simulate the OAuth callback via `POST /api/v1/integrations/connect/complete` with a valid `state` and a mock `code`. Verify `integrations` table has a row with `status = 'connected'` and `vault_refresh_token_secret_id` is set. Visit `/integrations` and confirm the platform appears as Connected.

- [x] T006 [US1] Create `backend/src/routes/v1/connect.ts` — implement `POST /connect/start`: validate `platform` field, check for duplicate integration (return 400 if already connected), call `generateState()`, build platform-specific OAuth authorization URL using env vars, return `{ authUrl, state }`
- [x] T007 [US1] Add `POST /connect/complete` to `backend/src/routes/v1/connect.ts` — validate `state` via `validateState()`, exchange `code` for tokens using platform OAuth token endpoint, call `createSecret()` to store the refresh/access token in Vault, insert row into `integrations` table with `vault_refresh_token_secret_id`, return `{ integrationId, platform, status: "connected" }`
- [x] T008 [P] [US1] Create `backend/src/routes/v1/integrations.ts` — implement `GET /api/v1/integrations`: query `integrations` table filtered by `orgId`, return array matching contract in `contracts/backend-api.md`
- [x] T009 [US1] Add `DELETE /api/v1/integrations/:id` to `backend/src/routes/v1/integrations.ts` — verify integration belongs to `orgId` (404 if not), call `deleteSecret(vault_refresh_token_secret_id)`, set `status = 'disconnected'` in DB, return 204
- [x] T010 [US1] Create `app/api/integrations/callback/[platform]/route.ts` — Next.js `GET` handler: extract `code` and `state` from query params (redirect to `/integrations?error=oauth_failed` if missing), call backend `POST /api/v1/integrations/connect/complete` with Clerk session token, redirect to `/integrations?connected=<platform>` on success or `/integrations?error=oauth_failed` on failure
- [x] T011 [US1] Update `app/integrations/page.tsx` — fetch integrations list from `GET /api/v1/integrations` using `apiClient` + `auth().getToken()` (Server Component), render each platform card with status badge ("Connected" / "Disconnected"), last-synced timestamp, and "Disconnect" button
- [x] T012 [P] [US1] Update `app/integrations/connect/page.tsx` — add "Connect" buttons for Meta, Google, Shopify; each calls `POST /api/v1/integrations/connect/start` server-side, then redirects the browser to the returned `authUrl`; show `?connected=<platform>` success toast and `?error=oauth_failed` error message from query params

**Checkpoint**: US1 fully functional — user can connect a platform, see it listed as Connected, and disconnect it.

---

## Phase 4: User Story 2 — Automatic Daily Data Sync (Priority: P2)

**Goal**: Once a platform is connected, the system automatically pulls daily campaign metrics + Shopify revenue into `campaign_metrics` via a scheduled Inngest job. Sync history is visible on the Integrations page.

**Independent Test**: Trigger `syncIntegration` Inngest function manually with a valid `integrationId`. Verify `campaign_metrics` has rows for the last 30 days scoped to the correct `org_id`. Verify `sync_logs` has a `status = 'success'` entry with `records_written > 0`. Check idempotency: trigger again for the same date range and confirm row count is unchanged.

- [x] T013 [P] [US2] Create `backend/src/services/sync/meta.ts` — `syncMeta(integration, supabaseAdmin): Promise<number>`: read access token via `readSecret()`, fetch last-30-day insights from Meta Marketing API v21.0 `GET /act_{id}/insights?fields=spend,impressions,clicks,actions,action_values&date_preset=last_30d`, upsert rows into `campaign_metrics` with `onConflict: 'org_id,ad_account_id,campaign_id,date'`, return records written count
- [x] T014 [P] [US2] Create `backend/src/services/sync/google.ts` — `syncGoogle(integration, supabaseAdmin): Promise<number>`: read token via `readSecret()`, refresh OAuth token if needed, call Google Ads API v19 `searchStream` endpoint with GAQL selecting `campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, segments.date` for last 30 days with `developer-token` header, upsert into `campaign_metrics` (cost_micros / 1_000_000 = spend), return records written
- [x] T015 [P] [US2] Create `backend/src/services/sync/shopify.ts` — `syncShopify(integration, supabaseAdmin): Promise<number>`: read access token via `readSecret()`, query Shopify Admin GraphQL `orders` with `first: 250, after: endCursor` cursor pagination for last 30 days, upsert into `campaign_metrics` with `campaign_id = order.id`, `revenue = totalPriceSet.shopMoney.amount`, `spend/impressions/clicks/conversions = 0`, return records written
- [x] T016 [US2] Create `backend/src/services/sync/index.ts` — `dispatchSync(integration, supabaseAdmin): Promise<number>`: switch on `integration.platform` to call `syncMeta`, `syncGoogle`, or `syncShopify`; throw on unknown platform
- [x] T017 [US2] Create `backend/src/jobs/inngest.ts` — export `inngest = new Inngest({ id: 'growthhub' })` and two functions: (1) `dailySyncAll` cron `"0 2 * * *"` — query all `status='connected'` integrations, fan out one `integration/sync.requested` event per integration; (2) `syncIntegration` triggered by `integration/sync.requested` event — insert `sync_logs` row (`status='in_progress'`), call `dispatchSync()`, update `integrations.last_synced_at`, update `sync_logs` row (`status='success'`, `records_written`); catch errors to set `status='failed'` + `error_message`; export `functions = [dailySyncAll, syncIntegration]`
- [x] T018 [US2] Add `GET /api/v1/integrations/:id/sync-logs` to `backend/src/routes/v1/integrations.ts` — verify integration belongs to `orgId`, query `sync_logs` ordered by `created_at DESC` with `?limit` and `?offset` query params (default limit 20), return array per contract
- [x] T019 [US2] Update `app/integrations/page.tsx` to display sync log data — add "Last synced" timestamp (from `lastSyncedAt` field), show most recent sync status badge ("Syncing" / "Success" / "Failed"), show error message if `status = 'failed'`

**Checkpoint**: US2 fully functional — daily Inngest job fires, data populates `campaign_metrics`, sync logs are visible on the Integrations page.

---

## Phase 5: User Story 3 — Manual Re-Sync Trigger (Priority: P3)

**Goal**: User clicks "Sync now" on any connected integration, a sync job is queued within 5 seconds, and status feedback is shown on the page.

**Independent Test**: Call `POST /api/v1/integrations/:id/sync` with a valid integration ID → receive `202 { jobId, message }`. Call it again immediately → receive `409 Conflict`. Verify `sync_logs` shows a new `in_progress` entry.

- [x] T020 [US3] Add `POST /api/v1/integrations/:id/sync` to `backend/src/routes/v1/integrations.ts` — verify integration is `status='connected'` (404 if not), check for existing `in_progress` sync log for this integration (return 409 if found), call `inngest.send({ name: 'integration/sync.requested', data: { integrationId, orgId } })`, return `202 { jobId, message: 'Sync queued' }`
- [x] T021 [US3] Update `app/integrations/page.tsx` — add "Sync now" button to each connected integration card; button calls `POST /api/v1/integrations/:id/sync` via `apiClient`, disables itself and shows "Syncing…" while in progress, re-enables on completion or error; show toast on success/failure

**Checkpoint**: US3 fully functional — manual sync queues within 5 seconds, duplicate requests are rejected with a user-visible message.

---

## Phase 6: User Story 4 — Dashboard Shows Real Data (Priority: P4)

**Goal**: Dashboard Overview and Channels pages display real aggregate metrics from `campaign_metrics` for the org's selected date range, replacing placeholder content.

**Independent Test**: Ensure at least one sync has completed (US1 + US2 prerequisite). Call `GET /api/v1/metrics/summary?from=2026-04-01&to=2026-04-20` → receive `{ spend, impressions, clicks, conversions, revenue, roas, dateRange }` with non-zero values. Call `GET /api/v1/metrics/channels` → receive per-platform breakdown. Visit `/dashboard/overview` and verify real numbers are rendered.

- [x] T022 [US4] Create `backend/src/routes/v1/metrics.ts` — implement `GET /metrics/summary`: validate `from` and `to` query params (400 if missing/invalid), run SQL `SELECT SUM(spend), SUM(impressions), SUM(clicks), SUM(conversions), SUM(revenue) FROM campaign_metrics WHERE org_id = :orgId AND date >= :from AND date <= :to` via `supabaseAdmin`, compute `roas = revenue / spend` (0 if spend is 0), return object per contract
- [x] T023 [US4] Add `GET /metrics/channels` to `backend/src/routes/v1/metrics.ts` — same date range validation, run same query with `GROUP BY platform`, return array per contract
- [x] T024 [P] [US4] Update `app/dashboard/overview/page.tsx` — replace placeholder KPI values with real data: call `GET /api/v1/metrics/summary` via `apiClient` + `auth().getToken()` using a default 30-day date range; render `spend`, `impressions`, `clicks`, `conversions`, `revenue`, `roas`; show "Connect a platform to see data" empty state if no integrations exist (caught via 0-valued response or empty check)
- [x] T025 [P] [US4] Update `app/dashboard/channels/page.tsx` — replace placeholder channel breakdown with real data from `GET /api/v1/metrics/channels` using same default date range; render per-platform rows for meta / google / shopify; show empty state if no data

**Checkpoint**: US4 fully functional — dashboard displays real synced metrics scoped to the authenticated organization.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Environment documentation, edge case hardening, and end-to-end validation.

- [x] T026 [P] Update `backend/.env.example` — add all Phase 2 vars: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `META_APP_ID`, `META_APP_SECRET`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `OAUTH_REDIRECT_BASE_URL`
- [x] T027 Validate end-to-end flow per `specs/002-data-ingestion/quickstart.md` Scenarios 1–6 — connect Meta integration, trigger sync, verify `campaign_metrics` populated, verify dashboard shows real data, verify org isolation (Scenario 5), verify duplicate sync idempotency (Scenario 6)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
  - T003 and T004 are parallel to each other
- **Phase 3 (US1)**: Depends on Phase 2 completion
  - T006 → T007 (sequential: complete must use start's helpers)
  - T008, T012 are parallel to T006/T007 (different files)
  - T009, T010, T011 depend on T006/T007/T008 being in place
- **Phase 4 (US2)**: Depends on Phase 3 (US1) completion — sync requires connected integrations
  - T013, T014, T015 are fully parallel (different platform files)
  - T016 depends on T013/T014/T015 completing
  - T017 depends on T016
  - T018 is parallel to T013–T015 (different route file)
  - T019 depends on T018
- **Phase 5 (US3)**: Depends on Phase 4 (US2) — sync trigger needs Inngest function registered
  - T020 and T021 are sequential (route first, then UI)
- **Phase 6 (US4)**: Depends on Phase 4 (US2) — metrics query requires synced data
  - T022 → T023 (sequential: same file)
  - T024 and T025 are parallel (different page files, both depend on T022/T023)
- **Phase 7 (Polish)**: Depends on all user stories — validation requires working system

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no story dependencies
- **US2 (P2)**: Depends on US1 — needs connected integration rows to sync
- **US3 (P3)**: Depends on US2 — "Sync now" endpoint triggers the same Inngest function
- **US4 (P4)**: Depends on US2 — dashboard needs synced `campaign_metrics` rows to query

---

## Parallel Execution Examples

### Phase 2 Parallel Opportunities

```
T003: Create backend/src/lib/vault.ts
T004: Create backend/src/lib/oauth-state.ts
(both in parallel — different files, no mutual dependency)
```

### Phase 3 Parallel Opportunities (after T005)

```
T006 + T007: backend/src/routes/v1/connect.ts  (sequential within)
T008: backend/src/routes/v1/integrations.ts    (parallel to T006/T007)
T012: app/integrations/connect/page.tsx         (parallel to T006–T009)
```

### Phase 4 Parallel Opportunities (after Phase 3 complete)

```
T013: backend/src/services/sync/meta.ts
T014: backend/src/services/sync/google.ts
T015: backend/src/services/sync/shopify.ts
T018: backend/src/routes/v1/integrations.ts (sync-logs endpoint)
(all four fully parallel — no shared files)
```

### Phase 6 Parallel Opportunities (after T022/T023)

```
T024: app/dashboard/overview/page.tsx
T025: app/dashboard/channels/page.tsx
(both parallel — different files, both depend on metrics routes)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 + Phase 2 (Setup + Foundational)
2. Complete Phase 3 (US1: Connect Platform)
3. **STOP and VALIDATE**: User can connect Meta/Google/Shopify and see it listed
4. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → Connect flow works → **Demo: Platform connects**
3. Phase 4 (US2) → Data syncs daily → **Demo: Campaign metrics in DB**
4. Phase 5 (US3) → Manual re-sync → **Demo: On-demand refresh**
5. Phase 6 (US4) → Dashboard live → **Demo: Full connect-to-dashboard loop**
6. Phase 7 → Hardened and documented

---

## Summary

| Phase | Story | Tasks | Key Files |
|-------|-------|-------|-----------|
| 1: Setup | — | T001 | `backend/package.json` |
| 2: Foundational | — | T002–T005 | migration SQL, `vault.ts`, `oauth-state.ts`, routes index |
| 3: US1 Connect | P1 | T006–T012 | `connect.ts`, `integrations.ts`, callback route, pages |
| 4: US2 Daily Sync | P2 | T013–T019 | `sync/meta|google|shopify.ts`, `sync/index.ts`, `inngest.ts` |
| 5: US3 Manual Sync | P3 | T020–T021 | `integrations.ts` (sync endpoint), page "Sync now" button |
| 6: US4 Dashboard | P4 | T022–T025 | `metrics.ts`, overview + channels pages |
| 7: Polish | — | T026–T027 | `.env.example`, e2e validation |

**Total tasks**: 27
**Parallel opportunities**: T003/T004, T008/T012, T013/T014/T015/T018, T024/T025
**Suggested MVP scope**: Phases 1–3 (US1: Connect Platform)
