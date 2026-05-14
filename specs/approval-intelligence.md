# Approval Intelligence — Spec (Layer 7)

## Status
PLANNING. Phase γ (BE additive JSONB extension to existing table — NO schema change). The single permitted write extension in this entire roadmap.

## Purpose
Today the auto-fire approval gate (`automation-engine.ts:283-299`) logs `auto_fire_blocked` to stdout and continues to the next rule. The blocked event is invisible to operators except via PM2/journald grep. This layer persists each blocked event as an `automation_runs` row with `status='skipped'` and structured `result_data.skip_reason='approval_required'`, surfacing a Pending Approvals view where operators can review and one-click "Approve & Fire" via the existing manual-rule-execute path.

## Operator problem solved
- "How many spend-increasing decisions were blocked from auto-firing this week?"
- "Show me the queue of decisions that need my approval before they can fire."
- "I want to approve and fire a blocked rule in one click — not navigate three pages."
- "Did the AI try to launch a campaign last night and get blocked? Show me."

## Existing systems reused

| System | File:line | Reused for |
|---|---|---|
| `automation_runs` table | `migrations/20260507130000_phase4_part2_automation.sql` | Store skipped events as rows |
| `automation_runs.status` CHECK enum | (same migration) | Already includes `'skipped'` — no schema change |
| `result_data` JSONB column | (same migration) | Carries `skip_reason`, `action_type`, `skipped_at` |
| `actionRequiresApproval` policy | `automation-engine.ts:80-93` | Trigger for the skipped-row insert |
| `/automation/runs?status=skipped` | `routes/v1/automation.ts:391-474` | Filter for the FE Approvals view |
| `POST /automation/rules/:id/execute` | `automation.ts:328-388` | Operator "Approve & Fire" click-through |
| Auto-fire dedupe | `automation-engine.ts:298-369` | Runs BEFORE the new SKIP write — no duplicate skip rows |

## Backend files MODIFIED (additive only)
- **MODIFY** `backend/src/services/execution/automation-engine.ts` — extend the existing auto_fire_blocked SKIP branch to insert an `automation_runs` row before the `continue`. Existing log line preserved.

## Frontend files (NEW or MODIFIED)
- **MODIFY** `app/actions/automation/page.tsx` — add "Pending Approvals" KPI card + filter chip
- **NEW** `app/automation/approvals/page.tsx` — dedicated Pending Approvals view
- **MODIFY** `components/dashboard/Sidebar.tsx` — add "Approvals" sub-nav entry under Automation

## Existing endpoints reused
- `GET /api/v1/automation/runs?status=skipped` — list pending approvals (filter is already supported)
- `POST /api/v1/automation/rules/:id/execute` body `{ ai_decision_id }` — "Approve & Fire" click-through (existing path; bypasses approval gate by design — manual fire = implicit operator approval)

## Additive endpoints required
**NONE.** Both endpoints already exist. The only additive change is in `automation-engine.ts` (a single INSERT into `automation_runs` on the existing SKIP branch).

## UI architecture

### `app/automation/approvals/page.tsx`

```
ApprovalsPage
├── Header (title + count "X pending")
├── Filter row
│   ├── Action type filter: [All | meta.increase_budget | meta.create_campaign | google.create_campaign]
│   └── Age filter: [Last 24h | Last 7d | All]
├── Approvals list
│   └── For each skipped run:
│       ├── Rule name + action_type chip (with "Approval Required" badge)
│       ├── AI decision summary: category, confidence ring, reasoning_steps (first step only)
│       ├── data_used preview: campaign_id + metric delta
│       ├── Age ("4h ago")
│       └── Actions:
│           ├── "Approve & Fire" → POST /api/v1/automation/rules/:rule_id/execute with body {ai_decision_id}
│           │   Backend: existing executeRule path → bypasses approval gate → fires action
│           │   On success: skipped row stays (audit history); a NEW pending row is created with status=success/failed
│           ├── "Review Decision" → /operator/ai/:ai_decision_id (Layer 2/5)
│           └── "Dismiss" → marks row consumed (client-side state; option later: persist on automation_runs.result_data.dismissed_at)
└── Empty state: "No pending approvals — auto-fire policy hasn't blocked anything in this window"
```

### `app/actions/automation/page.tsx` additions

```
(existing) KPI strip
├── (existing) Total Rules
├── (existing) Recent Success Rate
├── (existing) Last Fire
└── (NEW) Pending Approvals
    ├── Count (from /automation/runs?status=skipped&limit=1 — returns total in canonical envelope)
    └── "Review →" → /automation/approvals
```

## UX flows

### Flow 1: Operator reviews and approves a blocked auto-fire
1. AI emits SCALING_OPPORTUNITY decision (confidence=0.92)
2. Auto-fire rule matches but action_type=`meta.increase_budget` → `actionRequiresApproval()=true` → SKIP
3. Backend (NEW): INSERTs `automation_runs` row with status='skipped', result_data.skip_reason='approval_required'
4. Operator opens `/actions/automation` next morning → sees "Pending Approvals: 3" in KPI
5. Clicks → lands on `/automation/approvals`
6. Reviews top row: AI says "Increase Meta budget on campaign X by 25% — confidence 0.92"
7. Operator inspects reasoning, agrees
8. Clicks "Approve & Fire"
9. Backend: existing `executeRule` path runs — bypasses approval gate (manual = implicit approval), fires the action
10. Result panel: success, new `automation_runs` row written (status='success', trigger_source='manual_rule_fire')
11. Skipped row still in audit history (immutable, per `decision_history` and `automation_runs` immutability invariant)

### Flow 2: Operator monitors approval queue accumulating
1. Operator opens dashboard mid-day, sees "Pending Approvals: 12"
2. Clicks → filters to "Last 24h" + action_type=`meta.create_campaign`
3. Sees AI has been suggesting 4 new campaigns
4. Decides 2 are useful, 2 are noise
5. Approves 2 via "Approve & Fire", dismisses the other 2 (client-side hide)

### Flow 3: Operator audits past blocks
1. Operator filters by action_type + "Last 7d"
2. Counts blocks → calibrates whether approval-required threshold is too strict or too lax for their org
3. (Future: feed this counter into Layer 8 Governance Dashboard)

## Audit implications
- NEW: `automation_runs` rows for skipped events are added to the audit ledger
- These rows are IMMUTABLE per the existing `automation_runs` invariant — no updates after insert except the standard `status` transition (skipped → skipped; the row stays skipped forever even if operator later approves via manual fire — the manual fire creates a NEW row)
- `decision_history` is NOT written by the SKIP path — preserves single-writer invariant (only `executeAction` writes there, and SKIP doesn't execute)
- All existing audit trail untouched

## Governance implications
- Org isolation: every INSERT/SELECT scoped by `org_id` (already in `automation-engine.ts:299-365` context)
- RLS: `automation_runs` RLS policy already in place; service_role bypass for backend
- Approval policy: UNCHANGED. The policy still blocks auto-fire. The new write is BESIDE the block (audit trail of the block), not a policy modification.
- Single-writer for `decision_history`: PRESERVED. SKIP path doesn't write there.
- Dedupe: preserved. Dedupe check runs BEFORE the approval gate (lines 298-369 in current implementation). Skipped rows for (rule_id, ai_decision_id) are deduped along with success rows — no duplicate skip rows on Inngest retry.
- LIVE flag governance: not relevant (SKIP path never reaches handler)
- Trace correlator: skipped row gets `trace_id` from the ai_decision context

## Safe additive implementation strategy

### Step 1: Backend extension to automation-engine.ts (~25 LOC)
The current SKIP branch at lines 278-296:
```
if (actionRequiresApproval(actionType)) {
  console.info(`[automation] auto_fire_blocked org_id=… rule_id=… …`)
  continue
}
```

Becomes (additive only):
```
if (actionRequiresApproval(actionType)) {
  console.info(`[automation] auto_fire_blocked org_id=… rule_id=… …`)
  // Continuation #XYZ — persist the skip as an automation_runs row
  // so operators can see/act on pending approvals. status='skipped'
  // is already in the CHECK enum; result_data is freely-shaped JSONB.
  // No decision_history write (single-writer invariant preserved —
  // executor is the only writer there; SKIP doesn't execute).
  try {
    const { error: skipErr } = await supabaseAdmin
      .from('automation_runs')
      .insert({
        org_id: orgId,
        automation_rule_id: rawRule.id,
        ai_decision_id: decision.id,
        action_template_id: rawRule.action_template_id,
        status: 'skipped',
        result_data: {
          trigger_source: 'auto_fire',
          skip_reason: 'approval_required',
          action_type: actionType,
          skipped_at: new Date().toISOString(),
        },
        executed_at: new Date().toISOString(),
      })
    if (skipErr) {
      console.error(`[automation] skip_persist_failed org_id=${orgId} rule_id=${rawRule.id}: ${skipErr.message}`)
      // Best-effort — do NOT abort the loop. Log retains in stdout.
    }
  } catch (err) {
    console.error(`[automation] skip_persist_exception:`, err)
  }
  continue
}
```

**Failure mode:** if the persist fails, we still continue (best-effort) — operator visibility of the underlying decision exists in `ai_decisions`. The console line is the fallback record.

### Step 2: FE Pending Approvals view (~250 LOC)
- New page consumes `GET /automation/runs?status=skipped&limit=50&offset=0`
- Approve & Fire button hits existing `POST /automation/rules/:id/execute`
- "Review Decision" cross-link to Layer 2/5

### Step 3: FE KPI card on `/actions/automation` (~50 LOC)
- Lightweight count fetch (limit=1 returns total in canonical envelope)
- Click-through to new approvals page

## Rollout order
1. BE extension lands first (skipped rows start accumulating; no FE consumer yet — invisible operator-side)
2. Verify rows shape via direct SQL inspection
3. FE Approvals page (~250 LOC)
4. FE KPI card on automation cockpit (~50 LOC)
5. Sidebar entry

## Implementation complexity
- **Effort:** M
- **LOC estimate:** ~325 (~25 BE + ~300 FE)
- **Risk:** low-medium (single new INSERT path; best-effort error handling preserves continue-loop invariant)
- **Test surface:**
  - SKIP path runs the INSERT
  - INSERT failure does not break the loop
  - "Approve & Fire" creates a NEW success/failed row (does not modify skipped row)
  - Dedupe gate still works (skipped rows count toward dedupe → re-trigger same (rule, decision) doesn't create duplicate skip)
  - Empty queue empty state

## No-breakage guarantees
1. `decision_history` writes still come ONLY from `executeAction` (single-writer preserved)
2. `automation_runs.status` CHECK enum unchanged — `'skipped'` already valid
3. Approval policy code path UNCHANGED — only an additional INSERT was added to the SKIP branch
4. Dedupe check still runs before this branch
5. Auto-fire success/failure paths untouched
6. Manual rule fire path untouched (still bypasses approval gate by design)
7. "Approve & Fire" reuses existing `POST /rules/:id/execute` — no new mutation endpoint
8. Best-effort INSERT error handling — block-and-continue semantics preserved if persist fails
9. No new schema migration
10. No new table
11. No new column
12. No new RLS policy

## Future enhancements (DEFERRED / OUT OF SCOPE)
- Auto-expire skipped rows after N days (would need a Inngest scheduled job — operator authorization required to register)
- "Bulk approve" — would mean multiple manual fires; safer to keep one-at-a-time review
- Persistent dismissal of skipped rows (would extend `result_data` with `dismissed_at`/`dismissed_by` — additive, can ship later)
- Operator can EDIT the rule's `min_confidence_threshold` directly from the queue (already possible via existing PATCH `/rules/:id`)
