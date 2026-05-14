# Execution Timeline — Spec (Layer 6)

## Status
PLANNING. Phase α (FE-only). Optional Phase β BE convenience endpoint for perf only — pure additive.

## Purpose
Operators today must check three pages to reconstruct what happened in a time window: `/automation/history` (auto/manual runs), `/actions/logs` (decision_history audit), and `/operator/ai` (AI decisions, post-Layer 5). This layer interleaves all three streams into a single chronological timeline view, scoped to the operator's org.

## Operator problem solved
- "What happened between 14:00 and 16:00 today across automation, manual fires, AI decisions?"
- "I need a single chronological narrative for a customer report."
- "I want to spot causality: which AI decision led to which run led to which audit row?"

## Existing systems reused

| System | File:line | Reused for |
|---|---|---|
| `automation_runs` table | `migrations/20260507130000_phase4_part2_automation.sql` | Run events |
| `decision_history` table | `migrations/20260503130000_phase4_minimal_execution_layer.sql` | Audit rows |
| `ai_decisions` table | `migrations/20260502000001_ai_persistence.sql` | AI emit events |
| `executed_at` / `created_at` columns | (all 3 tables) | Time-bucket sort key |
| `trace_id` correlator | `middleware/tracing.ts` | Cross-stream grouping |

## Backend files reused (zero modifications in Phase α; optional 1 endpoint in Phase β)
- `routes/v1/automation.ts` (GET /runs — existing)
- `routes/v1/history.ts` (GET / — existing)
- `routes/v1/ai.ts` (GET /decisions — added in Layer 2/5)

## Frontend files (NEW)
- **NEW** `app/automation/timeline/page.tsx`
- **MODIFY** `components/dashboard/Sidebar.tsx` — add "Timeline" sub-nav entry under Automation

## Existing endpoints reused
- `GET /api/v1/automation/runs?limit=100&offset=…`
- `GET /api/v1/history?limit=100&offset=…`
- `GET /api/v1/ai/decisions?limit=100&offset=…` (depends on Layer 2/5 ship)

## Additive endpoints required (Phase α: NONE; Phase β: 1 optional)

### Phase α — pure FE-only
Three parallel fetches; interleave client-side by timestamp. Acceptable up to ~300 events per stream.

### Phase β (OPTIONAL, perf only)
`GET /api/v1/timeline?from=&to=&limit=&offset=`
- Server-side UNION over 3 tables with normalized event shape:
  ```
  { kind: 'ai_decision' | 'automation_run' | 'decision_history',
    id, occurred_at, trace_id, request_id, summary }
  ```
- Reduces 3 round-trips to 1
- Reduces FE-side merge complexity
- NO NEW DATA — just a join over existing tables
- Org-scoped via `c.get('orgId')`
- **DEFERRED until perf measurement justifies it**

## UI architecture

### `app/automation/timeline/page.tsx`

```
TimelinePage
├── Header (title + date-range picker, default = last 24h)
├── Filter row
│   ├── Event types: [✓ AI Decisions] [✓ Auto-fires] [✓ Manual fires] [✓ Audit rows]
│   ├── trace_id search (filter to single trace; pivots all three streams)
│   └── Refresh button
├── Timeline (vertical scrolling)
│   └── Day headers ("Today", "Yesterday", "Tue May 12")
│       └── Time-bucketed events (chronological DESC):
│           ├── AI decision event (purple dot, trace_id chip, category, confidence)
│           ├── Auto-fire run event (violet dot, rule.name → action.name, trigger_source='auto_fire')
│           ├── Manual rule fire event (slate dot, rule.name → action.name, trigger_source='manual_rule_fire')
│           ├── Manual action execute event (emerald dot, action.name, executed_by='manual')
│           └── Click event → expands inline detail OR cross-links:
│               • AI decision → /operator/ai/:decision_id
│               • Run → row's decision_history detail
│               • Audit → /actions/logs (or expanded inline)
└── Pagination (load next time window)
```

### Trace-grouping mode
When `trace_id` filter is active, events for that trace render with vertical connector lines between them — visualizes the AI decision → rule match → execution → audit chain.

## UX flows

### Flow 1: Operator reconstructs last hour
1. Operator opens `/automation/timeline`
2. Default last-24h range; sees mixed event stream
3. Filters event types to "Auto-fires only"
4. Sees 6 auto-fires in the last hour
5. Clicks one → expands inline to show rule name, action, result, AI decision link

### Flow 2: Operator pivots from a customer report trace_id
1. Customer reports issue with trace_id `abc-123`
2. Operator pastes trace_id in filter
3. Timeline filters to only that trace's events:
   - 14:32:01 — AI decision generated (category=ROAS_DROP, conf=0.87)
   - 14:32:02 — Auto-fire rule matched (Auto-pause on ROAS drop)
   - 14:32:03 — Action executed (meta.pause_campaign, http_status=200)
   - 14:32:04 — Audit row written (decision_history.id=…)
4. Vertical connectors show the chain visually
5. Operator screenshots → sends to customer; resolution under 2 minutes

### Flow 3: Operator reviews overnight automation activity
1. Operator opens timeline first thing in the morning
2. Picks "Yesterday 22:00 → Today 08:00"
3. Sees all events with auto-fires highlighted
4. Spots a failed run → clicks → reads error_message
5. Decides if rule needs adjustment (links to `/actions/automation`)

## Audit implications
- READ-ONLY in Phase α
- Phase β endpoint (if landed) is also READ-ONLY
- No writes anywhere
- Existing audit chain untouched

## Governance implications
- Org isolation: every fetch is org-scoped via existing endpoints
- RLS: enforced on every read query
- AI Output Contract: not touched (just reads `ai_decisions`)
- Single-writer: not touched
- Approval policy: not relevant (observation only)

## Safe additive implementation strategy

### Phase α (Sprint 1)
1. Create `app/automation/timeline/page.tsx`
2. State: date range, event-type filters, trace_id filter
3. Three parallel fetches in useEffect: `/automation/runs`, `/history`, `/ai/decisions` (if Layer 2/5 shipped)
4. Client-side merge: flatten + sort DESC by timestamp
5. Render as scrollable list with day headers
6. Add Sidebar entry

### Phase β (only if perf justifies — DEFERRED)
1. Add `GET /api/v1/timeline` handler (UNION ALL across 3 tables, ORDER BY occurred_at DESC)
2. Switch FE to single-fetch
3. Keep Phase α path as fallback

## Rollout order
1. Phase α FE-only page (~300 LOC)
2. Sidebar nav entry (~5 LOC)
3. (Optional Phase β — measure first)

## Implementation complexity
- **Effort:** S/M (Phase α only)
- **LOC estimate:** ~300 FE
- **Risk:** low (existing endpoints; pure merge logic)
- **Test surface:** empty stream (no events in range); single-event stream; 3-stream interleave correctness; trace_id filter narrowing

## No-breakage guarantees
1. No existing endpoints modified in Phase α
2. No new endpoints in Phase α
3. Existing pages (`/automation/history`, `/actions/logs`) unchanged
4. Sidebar nav additive (no removal)
5. Page degrades gracefully if Layer 2/5 endpoints not yet shipped (just hides AI decision events)
6. Phase β endpoint (if ever shipped) is purely additive — Phase α path remains as fallback
