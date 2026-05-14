# Governance Dashboard — Spec (Layer 8)

## Status
PLANNING. Phase δ (BE additive aggregate endpoint + FE page). Final layer — meta-aggregator over all prior surfaces.

## Purpose
Single-page operator view of GOVERNANCE health across the org: rules, runs, approvals, AI decisions, LIVE-flag posture, RLS coverage, rate-limit headroom, audit completeness. Reads from every table touched by prior layers; writes nothing. Treats the system as the system: surfaces the invariants enforced by CONSTITUTION.md + CLAUDE.md as numbers an operator can read.

## Operator problem solved
- "Is my org's automation healthy? Are rules running? Is anything stuck?"
- "What's the LIVE-mode matrix — which actions are real vs simulated for my org?"
- "How many approval-required actions are pending? How many were auto-fire-blocked this week?"
- "What's the audit-trail completeness — every run has a decision_history row?"
- "Am I close to my rate limit?"

## Existing systems reused

| System | File:line | Reused for |
|---|---|---|
| `automation_rules` | (migration) | Count, enabled-count, requires_approval-count |
| `automation_runs` | (migration) | Counts by status (success/failed/skipped/pending), trigger_source split |
| `decision_history` | (migration) | Audit completeness ratio, recent rate |
| `ai_decisions` | (migration) | AI activity volume, category mix |
| `actions_library` | (migration) | LIVE-flag mode per action type |
| `actionRequiresApproval` | `automation-engine.ts:80-93` | Approval-policy register |
| `LIVE_FLAG_DEPENDENCIES` | `backend/src/index.ts:115-132` | LIVE-mode matrix |
| `ACTION_EXECUTION_MAX_PER_MINUTE` env | `action-executor.ts:115-119` | Rate-limit ceiling display |
| Trace correlator | `middleware/tracing.ts` | Audit completeness check (runs with matching history) |

## Backend files MODIFIED (additive only)
- **MODIFY** `backend/src/routes/v1/automation.ts` OR new mount `backend/src/routes/v1/governance.ts` — add GET `/api/v1/governance/summary` handler

## Frontend files (NEW)
- **NEW** `app/governance/page.tsx`
- **MODIFY** `components/dashboard/Sidebar.tsx` — add "Governance" top-level nav (or under Settings)

## Existing endpoints reused
- `GET /api/v1/automation/rules` (rules detail link-through)
- `GET /api/v1/automation/runs` (runs detail link-through)
- `GET /api/v1/actions` (actions catalog link-through)

## Additive endpoints required

### `GET /api/v1/governance/summary`
- **Returns:** `{success, data: <summary object>, request_id}` where summary is:
  ```
  {
    rules: {
      total: number,
      enabled: number,
      disabled: number,
      requires_approval: number   // server-computed via actionRequiresApproval
    },
    runs_last_7d: {
      success: number,
      failed: number,
      skipped: number,
      skipped_approval_required: number,
      pending: number,
      auto_fire: number,
      manual_rule_fire: number
    },
    audit: {
      decision_history_rows_last_7d: number,
      runs_with_history_ratio: number,    // (runs with status=success ∧ result_data has history link) / runs total — sanity ratio
      idempotent_replays_last_7d: number  // count of result_data.idempotent_replay === true
    },
    ai: {
      decisions_last_7d: number,
      by_category: Record<string, number>,
      avg_confidence: number
    },
    rate_limit: {
      max_per_minute: number,             // from env (operator-visible)
      peak_observed_last_24h: number      // derived from decision_history counts in rolling minute window (1 SQL)
    },
    live_flags: {
      // Static snapshot from process.env at request time (per-org allowlist included)
      meta_pause_campaign: { live: boolean, org_allowlisted: boolean },
      meta_decrease_budget: { live: boolean, org_allowlisted: boolean },
      meta_increase_budget: { live: boolean, org_allowlisted: boolean },
      meta_create_campaign: { live: boolean, org_allowlisted: boolean },
      google_pause_campaign: { live: boolean, org_allowlisted: boolean },
      google_create_campaign: { live: boolean, org_allowlisted: boolean },
      send_alert_email: { live: boolean }
    },
    approval_policy: {
      // The centralized SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES set
      // surfaced as data so operators can see the policy without code-read
      protected_action_types: string[]
    },
    generated_at: string  // ISO timestamp
  }
  ```
- **Logic:** ~7 SQL COUNTs + small env reads. All read-only. Heavy-cache candidate (60s TTL acceptable).
- **Org-scoped:** every COUNT uses `WHERE org_id = c.get('orgId')`
- **Perf:** if any single query slows, partial index hints in a follow-up migration are an option — but NOT in this layer's scope

## UI architecture

### `app/governance/page.tsx`

```
GovernanceDashboard
├── Header: "Governance — Org Health" + generated_at + refresh button
├── Section 1: Rules
│   ├── Total / Enabled / Disabled (3 KPI cards)
│   ├── "Approval-required: X" with badge + link to /actions/automation?filter=requires_approval
│   └── Health pulse: enabled ratio + auto-fire-eligible ratio
├── Section 2: Runs (last 7d)
│   ├── Stacked bar by status
│   ├── Pie by trigger_source (auto_fire vs manual_rule_fire)
│   └── "Pending approvals: X" → /automation/approvals (Layer 7)
├── Section 3: Audit Completeness
│   ├── decision_history rows last 7d
│   ├── runs-with-history ratio (target 100%)
│   └── idempotent_replays_last_7d (interesting only if non-zero)
├── Section 4: AI Activity
│   ├── decisions_last_7d (sparkline)
│   ├── by_category distribution
│   └── avg_confidence ring
├── Section 5: Rate-limit headroom
│   ├── peak_observed_last_24h / max_per_minute (gauge)
│   └── If peak > 80% of cap → amber warning
├── Section 6: LIVE-flag matrix
│   ├── For each gated action: status (LIVE / SIMULATED) + org allowlist membership
│   └── Color: green=live+allowed; amber=live+not-allowlisted-but-flag-on; gray=simulated
├── Section 7: Approval Policy (audit-visible)
│   └── List of protected_action_types (display only)
└── Section 8: Cross-links
    ├── → /operator/ai (Layer 5)
    ├── → /automation/history (Layer 1)
    ├── → /automation/timeline (Layer 6)
    └── → /automation/approvals (Layer 7)
```

## UX flows

### Flow 1: Operator daily health check
1. Operator opens `/governance` first thing in the morning
2. Scans Rules section: 12 rules, 9 enabled, 3 require approval
3. Runs section: 84 last 7d, 78 success, 4 failed, 2 pending
4. Audit completeness: 100% ratio — every run has a history row
5. Rate-limit: peak 14/60 yesterday — headroom fine
6. LIVE matrix: all simulated (pre-launch state) — green-equivalent
7. Click "Pending approvals" → drill into Layer 7

### Flow 2: Operator post-incident triage
1. Customer complaint comes in: "your AI changed our budget without permission"
2. Operator opens `/governance` → checks LIVE matrix
3. Sees meta.increase_budget is LIVE for this org → confirms real call possible
4. Checks Approval Policy → confirms `meta.increase_budget` IS in protected set
5. Pivots to `/automation/approvals` → finds the pending row (the increase WAS blocked)
6. Concludes: customer is mistaken; the call never went through (skipped, not executed)
7. Sends customer the trace_id and skip evidence

### Flow 3: Operator capacity planning
1. Operator opens `/governance` weekly
2. Rate-limit section shows peak 45/60 over the last week
3. Decides to raise `ACTION_EXECUTION_MAX_PER_MINUTE` env from 60 to 90
4. (Future: maybe a self-service operator knob — but env change is fine today)

## Audit implications
- READ-ONLY. No writes.
- Endpoint is heavy on SELECT — must include reasonable LIMITs and rely on existing indexes
- All counts are org-scoped — no cross-org leakage

## Governance implications
- Org isolation: every query has `.eq('org_id', orgId)` server-side
- RLS: enforced on every query
- Single-writer: not touched
- Approval policy: surfaced as data (not modified)
- LIVE flag governance: surfaced as data (not modified)
- AI Output Contract: not touched
- Trace correlator: not directly touched

## Safe additive implementation strategy

### Step 1: BE endpoint (~200 LOC)
- Create `backend/src/routes/v1/governance.ts` (small dedicated router)
- Mount under existing `v1.route('/governance', governanceRouter)`
- Single GET `/summary` handler
- 7-10 parallel `supabaseAdmin.from(...).select('*', { count: 'exact', head: true })` queries via `Promise.all`
- Compute derived numbers in TypeScript
- Read LIVE flag env at handler time (per-request — small cost; cacheable later if needed)
- Return canonical envelope

### Step 2: FE page (~300 LOC)
- New `app/governance/page.tsx`
- Single fetch on mount via `apiClient`
- Render 8 sections per architecture above
- Refresh button re-fetches
- All cross-links use existing canonical routes

### Step 3: Sidebar entry
- Add "Governance" top-level link OR under Settings (operator preference)

## Rollout order
1. BE endpoint lands (no FE consumer = no operator-visible change yet)
2. Verify perf on a real org (run EXPLAIN on the slowest query if needed)
3. FE dashboard
4. Sidebar entry

## Implementation complexity
- **Effort:** L
- **LOC estimate:** ~500 (~200 BE + ~300 FE)
- **Risk:** medium (aggregate query perf; need to verify against real data)
- **Test surface:**
  - Empty org: every count returns 0, page renders gracefully
  - Org with high run volume: query latency acceptable (<500ms target)
  - LIVE flag matrix correctly reflects env state per org
  - org-isolation: org A cannot see org B's counts

## No-breakage guarantees
1. New endpoint mount is additive (existing routes untouched)
2. No writes anywhere
3. No new tables; no schema change
4. No new RLS policy (relies on existing per-table policies)
5. LIVE flag matrix is computed at request time — reflects current process env (no caching surprises)
6. Approval policy `protected_action_types` is sourced from `automation-engine.ts:SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES` import — single source of truth
7. Page degrades gracefully if endpoint returns partial data (each section's fetch is optional)
8. Refresh button re-fetches without page reload (single-state component)

## Future enhancements (DEFERRED)
- Per-org rate-limit override (would need new column on `organizations` — out of scope)
- Per-org LIVE flag override (would need DB table for allowlists — out of scope; currently env-driven)
- Push notifications when approval queue exceeds threshold (would need email or web-push infra — out of scope)
- Compliance export (PDF/CSV of all governance data) — additive but separate spec
