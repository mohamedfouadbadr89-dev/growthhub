# Action Catalog FE Wiring — Spec (Layer 4)

## Status
PLANNING. Phase α (FE-only additive). Pure swap from MOCK to live data on already-existing endpoints.

## Purpose
The `actions_library` catalog has been fully wired backend-side since Phase 4 minimal close. `app/actions/page.tsx` and `app/actions/[id]/page.tsx` still render hardcoded mocks. This layer replaces the mocks with the canonical catalog + parameter-schema-derived execute form. **Zero backend changes.**

## Operator problem solved
- "Which actions can I run, on which platform, with what parameters?"
- "I want to manually execute a single action without setting up a rule — what's the form?"
- "Which actions require approval before auto-firing? Show me at list level."

## Operator problem NOT solved by this layer
- "Show me actions I've recently executed" → that's `/actions/logs` (already wired)
- "Show me rules that use this action" → out of scope for Layer 4; could be a Layer 8 cross-link

## Existing systems reused

| System | File:line | Reused for |
|---|---|---|
| `actions_library` table | `migrations/20260503130000_phase4_minimal_execution_layer.sql` | Catalog data |
| `GET /api/v1/actions` | `routes/v1/actions.ts:36-114` | List with platform/action_type filters |
| `GET /api/v1/actions/:id` | `routes/v1/actions.ts:83-130` | Single template detail |
| `POST /api/v1/actions/:id/execute` | `routes/v1/actions.ts:132-243` | Manual execute via canonical executor |
| `parameter_schema` JSONB | `actions_library` column | Form field derivation |
| `actionRequiresApproval` (#102) | `automation-engine.ts:80-93` | Approval badge per action |
| Executor governance stack | `action-executor.ts:127+` | All gates (idempotency, rate limit, LIVE flag) applied automatically |

## Backend files reused (zero modifications)
- Everything above; no backend edits in this layer.

## Frontend files MODIFIED
- **MODIFY** `app/actions/page.tsx` (currently mock-shell)
- **MODIFY** `app/actions/[id]/page.tsx` (currently mock-shell)

## Existing endpoints reused
- `GET /api/v1/actions?platform=&action_type=` (filter via canonical INVALID_FILTER 400 on bad values)
- `GET /api/v1/actions/:id` (UUID-gated)
- `POST /api/v1/actions/:id/execute` (org-scoped via executor; idempotency via `execution_id` body; full audit chain)

## Additive endpoints required
**NONE.** All endpoints already exist and are operator-tested via the existing `app/actions/automation/page.tsx` Create form (#111).

## UI architecture

### `app/actions/page.tsx` (replace MOCK_ACTIONS)

```
ActionsLibraryPage
├── Header (title + filters)
│   ├── Platform filter chip group: [All | Meta | Google | Shopify]
│   ├── action_type free-text search (client-side substring match on name)
│   └── "Approval-required only" toggle (derived from action_type set)
├── Actions grid (cards)
│   ├── For each action:
│   │   ├── Platform pill + action_type technical label
│   │   ├── name (title) + description
│   │   ├── parameter_schema preview: "Takes 3 params: campaign_id, percent, …"
│   │   ├── requires_approval badge (if action_type in centralized set)
│   │   └── "View / Execute" → /actions/:id
└── Empty state: "No actions match your filters" (or "Catalog empty — operator: check actions_library seed")
```

### `app/actions/[id]/page.tsx` (replace mock detail)

```
ActionDetailPage
├── Header: name + platform + action_type + requires_approval badge
├── Section: Description
├── Section: Parameters (parameter_schema-derived form)
│   └── For each param in parameter_schema.properties:
│       ├── Label = key name (humanized)
│       ├── Required indicator (per parameter_schema.required[])
│       ├── Input type derived from JSON schema type:
│       │   • string → text input
│       │   • number / integer → number input (with min/max from schema)
│       │   • boolean → checkbox
│       │   • enum → select
│       │   • object/array → JSON textarea (paste raw)
│       └── Description tooltip (from parameter_schema.properties[key].description)
├── Section: Execute
│   ├── Idempotency key field (optional; auto-generated UUID v4 client-side if blank)
│   ├── "Execute" button → POST /api/v1/actions/:id/execute
│   │   body: { params: <form values>, execution_id: <uuid> }
│   └── Result panel (replaces button on success):
│       ├── Outcome: success / failed / skipped (canonical envelope)
│       ├── decision_history.id link → /actions/logs/:history_id
│       ├── idempotent_replay flag (from result_data) — if true: yellow "Replay returned original row" warning
│       └── trace_id (display only; pivot link post-Layer 5)
└── Section: Recent runs (last 10)
    └── Calls /history?action_template_id=:id (existing — checks if route accepts this filter; if not, client-side filter)
```

## UX flows

### Flow 1: Operator browses the catalog
1. Operator opens `/actions`
2. Sees all action templates from real `actions_library` (today: meta.pause_campaign, meta.increase_budget, meta.decrease_budget, meta.create_campaign, google.pause_campaign, google.create_campaign, send_alert_email)
3. Filters by platform=Meta → 4 cards
4. Toggles "Approval-required only" → 2 cards (increase_budget + create_campaign)
5. Clicks "Pause Meta Campaign" → /actions/:id

### Flow 2: Operator executes a manual action
1. From the detail page, operator fills the parameter_schema-derived form (campaign_id, etc.)
2. Clicks "Execute"
3. FE generates a fresh execution_id (UUID v4)
4. POSTs to `/api/v1/actions/:id/execute`
5. Backend: actions_library lookup → parameter validation → idempotency check → rate limit → handler → audit write
6. FE receives canonical envelope → renders Result panel with decision_history.id link
7. Operator clicks link → lands on `/actions/logs/:id` to see the full audit row

### Flow 3: Operator triggers an idempotent replay
1. Operator re-submits the same form (same execution_id from a copy/paste)
2. Backend detects existing (org_id, execution_id) row → returns original
3. FE Result panel shows `idempotent_replay=true` warning
4. Operator understands no duplicate side effect occurred

## Audit implications
- Every execute goes through `executeAction` → existing audit chain
- Every execute writes `decision_history` row with `executed_by='manual'`
- No new audit writes outside the executor pipeline
- Single-writer invariant preserved

## Governance implications
- Org isolation: `actions_library` is system-global (RLS authenticated-read), but EXECUTION is org-scoped via the executor's existing `c.get('orgId')`
- RLS: not relevant for catalog read; enforced on every executor write
- Approval policy: `requires_approval` badge derived from `actionRequiresApproval(action_type)` — visual hint only, doesn't change the auto-fire gate (manual fire bypasses by design)
- LIVE flag governance: not visible to operator at FE level (would belong in Layer 8 governance dashboard); manual fire still subject to LIVE flag in executor (simulated mode if flag off)
- Single-writer: preserved
- Idempotency: FE generates execution_id but executor is the canonical authority

## Safe additive implementation strategy

### Step 1: Wire `app/actions/page.tsx` (~150 LOC)
- Remove `MOCK_ACTIONS` constant
- Add `useEffect` fetching `/api/v1/actions`
- Render cards from real data
- Add filter state (platform, search, approval-only)
- Compute `requires_approval` client-side via a small action-type set CONSTANT (mirror of backend) OR call a tiny BE endpoint for the set
  - **Decision:** mirror the set client-side as a constant matching `automation-engine.ts:SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES`. Single source remains backend (this is display-only).
  - Alternative: extend `/api/v1/actions` response with `requires_approval: boolean` server-computed per row (truly single-source). PREFERRED if BE owner agrees — see "Optional BE extension" below.

### Step 2: Wire `app/actions/[id]/page.tsx` (~250 LOC)
- Fetch `/api/v1/actions/:id` on mount
- Build schema-derived form (recursive renderer over `parameter_schema.properties`)
- Generate execution_id client-side via `crypto.randomUUID()`
- POST handler reuses existing `apiClient`
- Result panel renders canonical envelope

### Step 3: Optional BE extension (single-line — preferred)
- Extend `/api/v1/actions` response to include `requires_approval` per row, computed via existing `actionRequiresApproval` import (same pattern as #102 on `/automation/rules`)
- Same one-line change: `requires_approval: actionRequiresApproval(row.action_type)` in the mapper
- Removes FE-side mirror set risk

## Rollout order
1. Optional BE extension to `/api/v1/actions` (1 line — ships first if approved)
2. `app/actions/page.tsx` swap (~150 LOC)
3. `app/actions/[id]/page.tsx` swap (~250 LOC)

Each independent; can ship as 3 commits.

## Implementation complexity
- **Effort:** S
- **LOC estimate:** ~400 FE (+ 1 line BE if extension landed)
- **Risk:** near-zero (endpoints proven by #111 Create form)
- **Test surface:** parameter_schema renderer correctness across the 7 existing action templates; empty catalog state; bad params 400 propagation

## No-breakage guarantees
1. Existing `/api/v1/actions` endpoint untouched (or extended with one additive field if option 3 chosen)
2. Executor pipeline untouched
3. Audit trail unchanged — manual fires write `executed_by='manual'` as today
4. Idempotency replay path unchanged
5. Existing `/actions/logs` still consumes the same audit table
6. `/actions/automation` Create form (#111) still works — uses the same `actions_library` fetch
7. No new mutations introduced
8. No schema change
