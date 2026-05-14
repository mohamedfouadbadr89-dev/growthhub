# AI Operator Center — Spec (Layers 2 + 5, folded)

## Status
PLANNING. Phase β (BE additive read-only endpoints + FE). Folds AI Reasoning Visibility (Layer 2) and AI Operator Center (Layer 5) since both consume the same backend tables.

## Purpose
Unblock the AI surface. The validator, persistence, log sink, and usage RPC have been emitting structured rows since Phase 3 — none of it is operator-visible today. This layer adds 3 read-only endpoints + 1 console page so operators can inspect AI decisions, reasoning, logs, and usage end-to-end.

## Operator problem solved
- "What did the AI decide for my org today, and why?"
- "An execution failed — was the AI output malformed or did the executor reject it?"
- "How many AI calls did we burn this week and on which model?"
- "I have a `request_id` from a customer report — show me everything that happened in that trace."

## Existing systems reused

| System | File:line | Reused for |
|---|---|---|
| `ai_decisions` table | `migrations/20260502000001_ai_persistence.sql` + `migrations/20260509130000_phase3_ai_decisions_category.sql` | Decision list + detail |
| `ai_logs` table | `services/ai/persistence.ts:186-230` | Per-trace lifecycle phases |
| AI Output Contract | `utils/aiValidator.ts:1-100` | Response shape guarantee |
| `log_ai_usage` RPC rows | `execute-ai-decision.ts:272-303` | Per-call usage observability |
| `request_id`/`trace_id` correlator | `middleware/tracing.ts`, propagated through `[req]`/`[AI]`/`[exec]` logs | Cross-table pivot |

## Backend files reused (zero modifications)

- `backend/src/utils/response.ts` — `ok()`/`fail()` envelope helpers
- `backend/src/middleware/auth.ts` — auth + org_id injection
- `backend/src/middleware/error.ts` — error handler triple-sink
- `backend/src/lib/supabase.ts` — supabaseAdmin client

## Backend files MODIFIED (additive only)

- **NEW** `backend/src/routes/v1/ai.ts` (existing file — add new GET handlers; existing POST handlers untouched)
  - Lines added: GET `/decisions`, GET `/decisions/:id`, GET `/logs`
- **MODIFY** `backend/src/routes/v1/index.ts` — already mounts `/ai` router; nothing further

## Frontend files (NEW or MODIFIED)

- **NEW** `app/operator/ai/page.tsx` — main operator console (decisions + logs + usage tabs)
- **NEW** `app/operator/ai/[decision_id]/page.tsx` — single decision deep view
- **MODIFY** `app/decisions/[id]/page.tsx` — re-point fetch from 503-gated `/decisions/:id` to new `/ai/decisions/:id`
- **MODIFY** `components/dashboard/Sidebar.tsx` — add "AI Operator" nav entry under existing section

## Existing endpoints reused
- `POST /api/v1/ai/decisions/generate` (referenced; not re-implemented)
- `POST /api/v1/ai/execute` (referenced; not re-implemented)
- `GET /api/v1/automation/runs` (cross-link from decision detail to runs that consumed it)
- `GET /api/v1/history` (cross-link to audit rows)

## Additive endpoints required

### `GET /api/v1/ai/decisions`
- **Query params:** `limit` (default 50, max 100), `offset` (default 0), `category` (optional enum filter), `status` (optional, derived from confidence_score per validator)
- **Returns:** `{success, data: {decisions: [...], total}, request_id}` where each decision row carries `{id, category, confidence_score, reasoning_steps, type, result, trace_id, created_at}`
- **Filters:** org_id server-side (RLS + explicit `.eq('org_id', orgId)`)
- **Ordering:** `created_at DESC`
- **Pattern source:** mirrors `routes/v1/history.ts:55-112` (NaN-safe limit, MAX_LIMIT clamp, INVALID_FILTER on bad category)

### `GET /api/v1/ai/decisions/:id`
- **Path:** UUID-gated via existing `UUID_LIKE` regex
- **Returns:** `{success, data: <full ai_decisions row>, request_id}`
- **Discriminator:** PGRST116 = genuine not-found → 404 NOT_FOUND envelope; any other PG error → throw → errorHandler
- **Pattern source:** mirrors `routes/v1/history.ts:114-155`

### `GET /api/v1/ai/logs`
- **Query params:** `trace_id` (required UUID), `limit` (default 100, max 500)
- **Returns:** `{success, data: {logs: [...], total}, request_id}` where each log carries `{id, phase, model, latency_ms, prompt_excerpt, error_excerpt, created_at}`
- **NOTE:** `prompt` and `raw` columns are NOT returned in the list response (large blobs, cost-sensitive). Excerpts truncated to 500 chars.
- **Filter:** org_id server-side + `trace_id` filter
- **Empty trace:** returns `{logs: [], total: 0}` (200) — no 404

## UI architecture

### `app/operator/ai/page.tsx`
```
AIOperatorPage
├── Header (title + trace_id search box)
├── Tabs
│   ├── Decisions (default)
│   │   ├── Filter row (category, date range)
│   │   ├── Decisions table:
│   │   │   columns: created_at | category | confidence ring | type | reasoning preview | actions
│   │   │   row-click → /operator/ai/:decision_id
│   │   └── Pagination
│   ├── Logs
│   │   └── Empty state: "Enter a trace_id in search to view AI lifecycle"
│   │   └── When trace_id present: linear lifecycle timeline (request → raw → validated → persisted → [transport_error|validation_error|persistence_error])
│   └── Usage (read-only over log_ai_usage RPC rows)
│       └── Stacked-by-day chart: calls per model, total tokens (always 0 today — provider-agnostic), p50/p95 latency
└── Footer: link to /actions/logs for downstream execution audit
```

### `app/operator/ai/[decision_id]/page.tsx`
```
DecisionDeepView
├── Hero: category chip + confidence ring + created_at + trace_id
├── Section 1: AI Output (raw)
│   ├── type, result (JSON), reasoning_steps numbered list
│   └── status (derived from confidence by validator)
├── Section 2: Trace
│   └── Inline render of /ai/logs?trace_id=…
├── Section 3: Downstream effects
│   ├── automation_runs for this ai_decision_id (existing /automation/runs?ai_decision_id filter — add this filter if not present; otherwise client-side filter)
│   └── decision_history for runs that fired (existing /history?automation_run_id filter — see Layer 4 page mapping note)
└── Section 4: Actions
    └── "Fire rule against this decision" — opens modal to pick rule, POSTs to existing /automation/rules/:id/execute with body {ai_decision_id}
```

## UX flows

### Flow 1: Operator triages a customer report
1. Customer reports "the AI made the wrong call this morning"
2. Operator copies trace_id from customer report (or finds it via `/operator/ai` Decisions tab filter by today)
3. Operator pastes trace_id in `/operator/ai` Logs tab
4. Sees linear lifecycle: request → raw → validated (status='completed') → persisted
5. Clicks the validated row → expands to show validated AI output (reasoning_steps, confidence)
6. Navigates to "Downstream effects" → sees the rule that fired + run result + decision_history row
7. Full pivot: from customer complaint → AI decision → rule → action → audit row in 30 seconds

### Flow 2: Operator audits AI confidence calibration
1. Operator opens `/operator/ai` Decisions tab
2. Filters by category=ROAS_DROP, last 30 days
3. Scans confidence rings: most are 80%+; spots a 32% decision
4. Clicks row → reads reasoning_steps for the low-confidence call
5. Checks Downstream effects — confirms no rule fired (confidence threshold gate caught it)
6. Trust calibrated

### Flow 3: Operator re-points existing `/decisions/[id]` page
1. Phase 3 anomaly is deferred; `/decisions/*` router is 503-gated
2. Existing `app/decisions/[id]/page.tsx` hits `/decisions/:id` → always 503
3. Layer 2 endpoint `/ai/decisions/:id` lands → FE re-points fetch (single-line URL change in the page)
4. Page now renders real data from `ai_decisions` (the canonical AI table)
5. Removes the hardcoded fictional `DECISION_ACTION_MAP` UUIDs at lines 10-15 (replace with dynamic action selection from `/actions` per Layer 4)

## Audit implications
- All 3 endpoints are READ-ONLY. No writes anywhere.
- Existing audit trail unchanged: AI decisions still inserted by the canonical pipeline (`services/ai/execute-ai-decision.ts`).
- New surfaces only READ from existing audit tables.

## Governance implications
- Org isolation: every query filters by `c.get('orgId')` server-side
- RLS: enforced on `ai_decisions` + `ai_logs` (existing migration policies)
- AI Output Contract: not touched — endpoints just SELECT validated rows
- Single-writer: not touched
- Approval policy: not relevant (this layer is observation, not execution)

## Safe additive implementation strategy

### Step 1: Add 3 GET handlers in `backend/src/routes/v1/ai.ts`
- Each follows the mirror pattern (mirrors `routes/v1/history.ts`)
- Each uses `c.get('orgId')` for isolation
- Each emits canonical envelope via `ok()`/`fail()`
- UUID gating reused from existing `UUID_LIKE` constant
- INVALID_FILTER pattern reused from existing closed-enum validation

### Step 2: Build `app/operator/ai/page.tsx` skeleton
- Tabs scaffold (existing pattern in dashboard pages)
- Decisions tab calls `apiClient('/api/v1/ai/decisions?limit=50', token)`
- Logs tab gated on `trace_id` input

### Step 3: Build `app/operator/ai/[decision_id]/page.tsx`
- Hero + 4 sections per architecture above
- "Fire rule against this decision" modal reuses existing `POST /automation/rules/:id/execute` with body

### Step 4: Re-point `app/decisions/[id]/page.tsx`
- Replace fetch URL from `/api/v1/decisions/:id` → `/api/v1/ai/decisions/:id`
- Remove `DECISION_ACTION_MAP` fictional UUIDs
- Render real `ai_decisions` shape

### Step 5: Sidebar nav
- Add "AI Operator" entry under existing dashboard nav

## Rollout order
1. BE endpoints (~200 LOC) — ship behind no flag; existing clients don't call them
2. FE Operator Center page (~250 LOC)
3. FE Decision Deep View page (~200 LOC)
4. FE re-point of `/decisions/[id]` (~30 LOC)
5. Sidebar entry (~10 LOC)

Each step shippable independently.

## Implementation complexity
- **Effort:** M
- **LOC estimate:** ~700 total (200 BE + 500 FE)
- **Risk:** low (read-only endpoints; pattern-replicated from existing handlers)
- **Test surface:** UUID gating; PGRST116 discriminator; trace_id filter; large-payload truncation

## No-breakage guarantees
1. Existing `POST /api/v1/ai/*` endpoints untouched
2. AI Output Contract validator untouched
3. `ai_decisions` + `ai_logs` table schema untouched
4. New endpoints mount under existing v1 router (auth + canonical envelope inherited)
5. Re-point of `/decisions/[id]` removes a known-broken 503 path → strict improvement
6. No new mutations
7. No reactivation of `/decisions/*` 503-gated router (we mount under `/ai/*` instead — distinct path)
