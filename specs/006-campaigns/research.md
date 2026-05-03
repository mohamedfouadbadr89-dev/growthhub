# Research: Phase 6 — Campaigns

## Decision 1: Campaign Table Design

**Decision**: Separate `campaigns` table (org-managed records) distinct from `campaign_metrics` (sync-read data).

**Rationale**: `campaign_metrics` is an append-only partitioned table owned by the sync layer. Mixing mutable campaign management state with it would violate the append-only design and complicate partitioning. A separate `campaigns` table allows full CRUD, status management, and storing AI suggestions without touching the sync layer.

**Alternatives considered**:
- Reuse `campaign_metrics` campaign_name field as the source of truth: rejected because campaign_metrics is read-only and doesn't store management fields (budget, targeting, status).
- Separate `campaigns` table linked to `campaign_metrics` by `(campaign_name, platform)`: chosen approach.

---

## Decision 2: Aggregated Metrics on Campaign List

**Decision**: Aggregate `campaign_metrics` by `(campaign_name, platform)` for the last 30 days on every GET /campaigns request. No materialized view for now.

**Rationale**: Campaign list calls are infrequent user-initiated requests (not polling). The query is simple (SUM/GROUP BY). Adding a materialized view is premature until load is measured. The 30-day filter on an indexed (org_id, date DESC) column is already fast.

**Alternatives considered**:
- Materialized view refreshed daily: adds complexity, adds stale-data risk, premature optimization.
- Denormalized summary columns on `campaigns`: requires background sync job, out of scope.

---

## Decision 3: Decisions Overlay on Campaign Detail

**Decision**: Join `decisions` table on `campaign_name` (case-insensitive ILIKE) to surface relevant AI decisions on Campaign Detail.

**Rationale**: Decisions are currently linked to anomalies which are linked to campaigns by name. There is no foreign key from decisions to campaigns. String match is the only practical join key. `ILIKE` handles minor capitalization differences.

**Alternatives considered**:
- Add `campaign_id FK` to decisions table: requires backfilling all existing decisions, deferred to a future cleanup phase.
- Client-side filter: would require fetching all decisions, wasteful.

---

## Decision 4: AI Suggestions Endpoint Design

**Decision**: Synchronous `POST /campaigns/:id/ai-suggestions` endpoint — generates and persists suggestions, returns result in the same response.

**Rationale**: Targeting suggestions are fast (single OpenRouter prompt, < 30s target). Async/Inngest jobs add complexity with no benefit at this latency range. Persisting suggestions to `campaigns.ai_suggestions` lets users see them after refresh.

**Alternatives considered**:
- Inngest job: over-engineered for a single-prompt request.
- Stateless (generate on every request, don't persist): loses suggestions on reload, violates FR-010.

---

## Decision 5: Push to Platform Design

**Decision**: Reuse the existing Phase 4 `executeAction()` service. Add `create_campaign` seeds (Meta + Google) to `actions_library`. `POST /campaigns/:id/push` calls `executeAction` with campaign params pre-filled.

**Rationale**: The entire Phase 4 execution layer (executeAction, decision_history logging, error handling) is already tested and wired. Building a new push pathway would duplicate it. Adding two new action seeds is the minimal change that delivers the push capability.

**Alternatives considered**:
- Direct Meta/Google API call from campaigns service: bypasses the execution layer, loses decision_history logging, violates architecture.
- Separate `campaign_push_jobs` table: overkill — the existing `automation_runs` and `decision_history` tables already capture execution state.

---

## Decision 6: BYOK Gate for AI Suggestions

**Decision**: Reuse the existing `resolveApiKey(orgId)` helper from the creatives service for AI suggestion generation. LTD users without a configured key receive a 402 BYOK_REQUIRED error.

**Rationale**: The billing gate pattern is identical to Phase 5 (creatives). Reusing it avoids diverging billing logic across features. AI suggestions consume 1 credit (subscription users) — cheaper than creative generation.

**Credit cost**: 1 credit per AI suggestion request (subscription users).
