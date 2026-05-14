# Automation Explainability — Spec (Layer 1)

## Status
PLANNING. Phase α (FE-only additive). Highest-priority layer per `specs/operator-intelligence.md`.

## Purpose
Surface the WHY behind every automation run. The backend already emits `reasoning_steps`, `category`, `trigger_source`, `confidence_score`, and `result_data` provenance — operators currently see fragments. This layer consolidates them into a single explainability drawer per run.

## Operator problem solved
- "I see a rule fired — why this rule, why now, what data drove it?"
- "Was this auto-fired or did someone manually trigger it?"
- "Did it produce expected impact, or was the AI confidence misleading?"
- "Which decisions did the AI skip-and-why?" (cross-references Layer 7)

## Existing systems reused

| System | File:line | Reused for |
|---|---|---|
| `/automation/runs` JOIN payload | `routes/v1/automation.ts:451-455` | All explainability data already in payload |
| `ai_decisions.reasoning_steps` | `aiValidator.ts:84-98` | Step-by-step AI rationale |
| `ai_decisions.category` | `persistence.ts:127-133` | Categorical trigger tag |
| `ai_decisions.confidence_score` | `aiValidator.ts:1-100` | Confidence ring |
| `automation_rules.name` | (join) | Rule attribution |
| `actions_library.{name, platform, action_type}` | (join) | Action identification |
| `result_data.trigger_source` | `automation-engine.ts:461-540` | auto-fire vs manual-fire |
| `result_data` primitive keys (#39 renderer) | `app/automation/history/page.tsx:663-692` | Execution provenance (mode, http_status, token_source, idempotent_replay) |

## Backend files reused (READ ONLY — zero modifications)

- `backend/src/routes/v1/automation.ts:390-474` (GET /runs)
- `backend/src/services/execution/automation-engine.ts` (no change — only consume what it writes)
- `backend/src/utils/aiValidator.ts` (read-only — schema guarantees `reasoning_steps` non-empty)

## Frontend files touched (NEW or MODIFIED)

- **MODIFY** `app/automation/history/page.tsx`
- **MODIFY** `app/actions/automation/page.tsx`

## Existing endpoints reused
- `GET /api/v1/automation/runs?status=&rule_id=&limit=&offset=` (full JOIN payload)
- `GET /api/v1/automation/rules` (for cross-link from history row → rule card)

## Additive endpoints required
**NONE.** All data already in the existing `/automation/runs` response payload.

## UI architecture

### Component additions to `app/automation/history/page.tsx`

```
HistoryPage
├── (existing) Filter toolbar
│   └── (NEW) TriggerSourceChip filter: [All | Auto-fire | Manual fire]
├── (existing) Row cards
│   └── (existing) Auto-fire/Manual-fire chip per #110
│       └── (NEW) Click row → open ExplainabilityDrawer (right-side slide-over)
└── (NEW) ExplainabilityDrawer
    ├── Header: rule name + trigger_source chip + result badge
    ├── Section 1: AI Reasoning
    │   ├── confidence_score ring (existing data)
    │   ├── category chip (existing data)
    │   └── reasoning_steps numbered list (existing data, promoted from inline)
    ├── Section 2: Trigger Context
    │   ├── trigger_condition (from decision_history.trigger_condition — already on row)
    │   └── data_used preview (truncated; "View full" → /actions/logs/:id)
    ├── Section 3: Action Outcome
    │   ├── action_taken + actions_library.action_type
    │   ├── ai_explanation (from decision_history.ai_explanation)
    │   └── result_data primitive table (mode, stage, http_status, token_source, idempotent_replay, original_history_id)
    └── Section 4: Cross-references
        ├── Linked AI decision ID → /decisions/:id (post-Layer 2)
        ├── Linked rule → /actions/automation?highlight=:rule_id
        └── trace_id (display only; pivot link post-Layer 5)
```

### Component additions to `app/actions/automation/page.tsx`

```
RuleCard
├── (existing) name, trigger_type, action chip, requires_approval badge
└── (NEW) RuleSparkline (last 7 days)
    └── Per-day bucket count from /automation/runs?rule_id=:id (lightweight call on card mount)
```

## UX flows

### Flow 1: Operator inspects why a rule fired
1. Operator opens `/automation/history`
2. Sees row with "Auto-fire" violet chip, result "Success"
3. Clicks row → drawer slides in
4. Reads AI Reasoning section: confidence 87%, category=ROAS_DROP, 3 reasoning_steps
5. Reads Trigger Context: "ROAS dropped 28% over 72h window for campaign X"
6. Reads Action Outcome: paused Meta campaign X; idempotent_replay=false; http_status=200
7. Closes drawer; trust calibrated

### Flow 2: Operator filters to manual fires only
1. Operator clicks "Manual fire" chip in filter toolbar
2. List filters client-side (no refetch — data already in payload)
3. Sees only operator-triggered runs; reviews for accountability

### Flow 3: Operator inspects rule cadence
1. Operator opens `/actions/automation`
2. Sees rule card with sparkline showing 12 fires in last 7 days, mostly 2-3/day
3. Spots a 0-fire day → opens history filtered by that rule → confirms no AI decisions matched that day

## Audit implications
- **No new audit writes.** Layer is read-only.
- Drawer renders existing `decision_history` + `automation_runs` content; nothing new persisted.
- Cross-link to `/actions/logs/:id` reuses existing GET `/history/:id` endpoint with `data_used` + `impact_snapshot`.

## Governance implications
- Org isolation: preserved (every fetch goes through existing org-scoped endpoints)
- RLS: preserved (no new tables queried)
- Approval policy: not touched
- Single-writer: not touched (no new writes anywhere)

## Safe additive implementation strategy

1. Add `triggerSourceFilter` state to `app/automation/history/page.tsx` (default "All")
2. Add client-side filter in `filtered` memo: include only entries whose `entry.resultData?.trigger_source` matches selected filter (or all if "All")
3. Add filter chip group to existing filter toolbar
4. Lift expanded-row content into a separate `ExplainabilityDrawer` component (extract from current expanded JSX); convert collapse/expand into open/close drawer
5. Drawer is right-side slide-over (Tailwind `fixed inset-y-0 right-0 w-[480px]`)
6. On `app/actions/automation/page.tsx`: add `RuleSparkline` component fetching `/automation/runs?rule_id=…&limit=50` once per card mount
7. Bucket runs by day in client-side memo; render 7-bar SVG

No backend changes. No new endpoints. No new types beyond local prop interfaces.

## Rollout order
1. Filter chip (30 LOC — smallest, immediate value)
2. Drawer extraction (~120 LOC — UX improvement; data unchanged)
3. Rule sparkline (~80 LOC — needs per-card fetch; can ship last)

Each is independent; can ship as 3 separate commits.

## Implementation complexity
- **Effort:** S
- **LOC estimate:** ~230 total across 2 files
- **Risk:** near-zero (FE-only; existing data; existing endpoints)
- **Test surface:** visual inspection of drawer + filter; sparkline empty-state on rules with 0 runs

## No-breakage guarantees
1. `/automation/runs` endpoint untouched (payload contract unchanged)
2. Existing collapsed-row UX preserved as fallback if drawer fails to mount
3. Filter chip default "All" → no behavior change for users who don't click it
4. Sparkline rendering wrapped in try/catch → render `—` on empty/error (already-shipped pattern in the file)
5. No new API mutations
6. No new state in URL (filter is page-local)
7. Drawer close on Esc / outside-click — no navigation side effects
