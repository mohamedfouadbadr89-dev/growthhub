# Quickstart: Intelligence Layer — Integration Scenarios

These scenarios validate the Phase 3 implementation end-to-end. Run them in order after deployment.

---

## Prerequisites

- Phase 2 deployed and working: at least one integration connected, at least one sync completed with `campaign_metrics` rows in the database.
- Backend environment variables set: `OPENROUTER_API_KEY`, `OPENROUTER_DEFAULT_MODEL=google/gemini-2.0-flash-001`.
- For LTD org test: a second org with `plan_type = 'ltd'` and a valid BYOK key stored in Supabase Vault.

---

## Scenario 1: Automated Decision Generation After Sync

**Goal**: Verify decision generation is triggered automatically after a sync completes.

1. Trigger a manual integration sync: `POST /api/v1/integrations/:id/sync`
2. Wait for the Inngest `sync-integration` job to complete (check Inngest dashboard or `sync_logs`).
3. Verify an `intelligence/decisions.requested` event was fired (visible in Inngest event log).
4. Verify the `generateDecisions` Inngest function ran for the org.
5. Query `GET /api/v1/decisions` — expect at least one decision record if the org has 3+ days of campaign data.

**Pass criteria**: Decision records exist and have `ai_status = 'completed'` (or `'ai_unavailable'` if OpenRouter is unreachable).

---

## Scenario 2: Manual Refresh — Trigger and Deduplication

**Goal**: Verify the manual refresh endpoint works and prevents duplicate runs.

1. Call `POST /api/v1/decisions/refresh` — expect `202 { status: 'in_progress' }`.
2. Immediately call `POST /api/v1/decisions/refresh` again — expect `409 { error: 'Decision generation already in progress' }`.
3. Wait for the run to complete. Call `GET /api/v1/decisions/run-status` — expect `status: 'completed'`.
4. Call `POST /api/v1/decisions/refresh` again — expect `202` (new run, previous one completed).

**Pass criteria**: First call returns 202, second call returns 409, third call after completion returns 202.

---

## Scenario 3: Decisions Overview Page — Real Data

**Goal**: Verify the Decisions Overview page shows real decisions sorted by priority.

1. Open `/decisions` in the browser.
2. Verify decisions are listed, each showing: platform, anomaly type, confidence score, recommended action summary.
3. Verify decisions are sorted by priority score (highest first — ROAS_DROP and CONVERSION_DROP should appear before SCALING_OPPORTUNITY).
4. Click the "Refresh Decisions" button — verify loading state appears and disappears when complete.

**Pass criteria**: Page renders with real data; sort order matches priority score; refresh button works.

---

## Scenario 4: Decision Detail Page

**Goal**: Verify the Decision Detail page shows full AI explanation and data snapshot.

1. From the Decisions Overview, click any decision card.
2. Verify the detail page shows: anomaly type, platform, trigger condition, data snapshot (with actual metric values), AI explanation, confidence score with rationale, and recommended action.
3. For a decision with `ai_status = 'credits_exhausted'`, verify the page shows "Add credits to see AI analysis" instead of a blank field.

**Pass criteria**: All fields render; AI explanation is visible for completed decisions; graceful fallback for credits_exhausted.

---

## Scenario 5: Alerts Center

**Goal**: Verify threshold alerts are generated and can be dismissed.

1. Temporarily lower the `ROAS_BELOW_THRESHOLD` threshold to `9999.0` in `alert_thresholds` (or set it so any campaign triggers it).
2. Trigger a decision refresh: `POST /api/v1/decisions/refresh`.
3. Open `/decisions/alerts` — verify at least one alert appears with breach details.
4. Click "Dismiss" on an alert — verify it disappears from the active view.
5. Restore the original threshold.

**Pass criteria**: Alert appears with correct breach value and threshold value; dismiss works; dismissed alert no longer shows in active view.

---

## Scenario 6: Billing Separation — LTD vs Subscription

**Goal**: Verify the platform AI key is never used for LTD orgs.

1. With a `subscription` org that has credits > 0: trigger refresh. Verify decisions are generated and `credits_balance` decremented by the number of decisions (check via Supabase dashboard).
2. With the same `subscription` org, set `credits_balance = 0` directly in Supabase. Trigger refresh. Verify: rule-based detection still runs (decisions created), but `ai_status = 'credits_exhausted'` on all new decisions.
3. With an `ltd` org that has a BYOK key: trigger refresh. Verify decisions are generated using the org's key (check server logs — no `OPENROUTER_API_KEY` used, only the vaulted key).
4. With an `ltd` org that has NO BYOK key: trigger refresh. Verify decisions are created but `ai_status = 'ai_unavailable'` with a message prompting the user to add a key.

**Pass criteria**: All four paths behave as described; platform key never appears in logs for LTD org requests.

---

## Scenario 7: Multi-Tenant Isolation

**Goal**: Verify an org can never access another org's decisions.

1. With Org A's token, generate some decisions via refresh.
2. Note the decision IDs.
3. With Org B's token, call `GET /api/v1/decisions/:id` using Org A's decision ID.
4. Expect `404 { error: 'Decision not found' }`.
5. Call `GET /api/v1/decisions` with Org B's token — verify no Org A decisions appear.

**Pass criteria**: 404 on cross-org access; list endpoint returns only own-org data.
