# Recommended Automations — Spec (Layer 3)

## Status
PLANNING. Phase β (BE additive endpoint + FE card).

## Purpose
Surface AI-driven rule suggestions to operators. The AI already emits `category` on every decision (Path F per `aiValidator.ts:84-98`). When operators receive many decisions in a category but have no rule with matching `trigger_type`, the system can proactively recommend creating one. Closes the gap between "AI sees a pattern" and "operator acts on it".

## Operator problem solved
- "I keep seeing ROAS_DROP decisions but I haven't set up an auto-pause rule yet — why isn't the system suggesting one?"
- "Which categories of decisions am I missing automation coverage for?"
- "When I open the Create Rule form, I want it pre-filled with the right trigger_type based on what's been happening."

## Existing systems reused

| System | File:line | Reused for |
|---|---|---|
| `ai_decisions.category` | `aiValidator.ts:84-98`, `persistence.ts:127-133` | Recommendation grouping key |
| `automation_rules.trigger_type` | `migrations/20260507130000_phase4_part2_automation.sql` | "Is rule already present?" check |
| `actions_library` catalog | `routes/v1/actions.ts:36-114` | Suggested action templates per category |
| `actionRequiresApproval` | `automation-engine.ts:80-93` | Mark recommendations whose action would auto-fire-block |
| Create Rule form (#111) | `app/actions/automation/page.tsx` | Pre-fill target |
| AI Output Contract `category` | `aiValidator.ts:84-98` | Guaranteed presence (optional but emitted by system prompt) |

## Backend files reused (zero modifications)
- `backend/src/utils/response.ts` — envelope
- `backend/src/middleware/auth.ts` — org_id
- `backend/src/lib/supabase.ts` — query client

## Backend files MODIFIED (additive only)
- **MODIFY** `backend/src/routes/v1/automation.ts` — add GET `/recommendations` handler at the bottom of the existing router (before export)

## Frontend files MODIFIED
- **MODIFY** `app/actions/automation/page.tsx` — add `RecommendationsCard` component above existing rules grid

## Existing endpoints reused
- `GET /api/v1/automation/rules` (read existing rules to compute the "gap")
- `POST /api/v1/automation/rules` (Create form target; reused by recommendation click-through)
- `GET /api/v1/actions` (catalog of action templates)

## Additive endpoints required

### `GET /api/v1/automation/recommendations`
- **Returns:** `{success, data: {recommendations: [...], total}, request_id}` where each recommendation is:
  ```
  {
    category: string,                    // e.g., "ROAS_DROP"
    decision_count_30d: number,          // how many AI decisions in this category in the last 30 days
    avg_confidence: number,              // 0-1
    suggested_action_template_id: string,// UUID from actions_library
    suggested_action_name: string,       // e.g., "Pause Meta Campaign"
    suggested_action_type: string,       // e.g., "meta.pause_campaign"
    requires_approval: boolean,          // computed via actionRequiresApproval
    suggested_min_confidence_threshold: number, // e.g., 70 (default)
    suggested_name: string,              // e.g., "Auto-pause on ROAS drop"
    rationale: string                    // e.g., "12 ROAS_DROP decisions in 30 days with no matching rule"
  }
  ```
- **Logic (read-only SQL aggregate):**
  1. SELECT category, COUNT(*) decision_count, AVG(confidence_score) avg_conf FROM ai_decisions WHERE org_id=? AND category IS NOT NULL AND created_at > now()-30d GROUP BY category
  2. SELECT DISTINCT trigger_type FROM automation_rules WHERE org_id=? AND enabled=true
  3. Categories present in #1 but absent in #2 → recommendation candidates
  4. For each candidate, map category → suggested action via static map (see below)
  5. Filter out candidates with `decision_count_30d < 3` (avoid noise)
- **Category → action map** (CONSTANT in the route file — single source of truth):
  ```
  ROAS_DROP            → meta.pause_campaign           (safe; no approval needed)
  CONVERSION_DROP      → meta.pause_campaign           (safe)
  SPEND_SPIKE          → meta.decrease_budget          (safe; under MAX_PERCENT cap)
  SCALING_OPPORTUNITY  → meta.increase_budget          (requires_approval=true)
  ```
- **Org-scoped:** every query filters by `c.get('orgId')`
- **Empty state:** returns `{recommendations: [], total: 0}` — not 404

## UI architecture

### `RecommendationsCard` in `app/actions/automation/page.tsx`

Renders only when `recommendations.length > 0`. Placement: between header KPI strip and rules grid.

```
RecommendationsCard
├── Header: "Recommended Automations" + count badge
├── For each recommendation:
│   ├── Category chip (color-coded by severity)
│   ├── Rationale text ("12 ROAS_DROP decisions in 30 days with no matching rule")
│   ├── Suggested action: "Pause Meta Campaign" (+ requires_approval badge if true)
│   ├── Avg confidence ring (data-grounded; from real AI outputs)
│   └── Actions:
│       ├── "Create Rule" → opens existing Create form (#111) with prefilled state
│       └── "Dismiss" → client-side hide (no persistence — re-appears tomorrow if pattern continues)
└── Footer: "View all AI decisions →" → link to /operator/ai (Layer 5)
```

### Create-form prefill contract
Clicking "Create Rule" calls existing `setShowCreateForm(true)` then sets `createForm` state to:
```
{
  name: recommendation.suggested_name,
  trigger_type: recommendation.category,
  action_template_id: recommendation.suggested_action_template_id,
  min_confidence_threshold: recommendation.suggested_min_confidence_threshold,
  enabled: !recommendation.requires_approval,  // approval-required rules default to disabled
                                                // (operator must explicitly enable)
}
```

All existing form validation + POST flow unchanged.

## UX flows

### Flow 1: Operator sees a recommendation and accepts it
1. Operator opens `/actions/automation`
2. RecommendationsCard renders 2 cards: ROAS_DROP (15 decisions, no rule) + SPEND_SPIKE (5 decisions, no rule)
3. Operator clicks "Create Rule" on ROAS_DROP card
4. Create form opens with prefilled name "Auto-pause on ROAS drop", trigger_type=ROAS_DROP, action_template_id=meta.pause_campaign UUID, threshold=70, enabled=true
5. Operator reviews + clicks "Create Rule"
6. Existing #111 POST handler executes
7. Card disappears (rule now exists; next refresh recomputes recommendations)

### Flow 2: Operator sees an approval-required recommendation
1. Operator opens `/actions/automation`
2. RecommendationsCard shows SCALING_OPPORTUNITY card with "Approval Required" badge
3. Operator clicks "Create Rule"
4. Create form opens with enabled=FALSE (forced) + warning banner "This action requires manual approval — rule will be created disabled"
5. Operator reviews + creates the rule (disabled)
6. Auto-fire never triggers; operator manually fires when ready (existing manual-fire path)

### Flow 3: Operator dismisses noisy recommendations
1. Operator clicks "Dismiss" on a recommendation
2. Card hides client-side (no API call — dismiss is local state)
3. Next page load: recommendation re-appears (the underlying pattern still exists)
4. To permanently silence: operator creates the rule with `enabled=false`

## Audit implications
- No new audit writes from this layer
- Recommendations are computed on read; no persistence
- Rule creation via the recommendation flow uses the existing audited POST `/rules` path (no audit-trail bypass)

## Governance implications
- Org isolation: GROUP BY category is org-scoped via `.eq('org_id', orgId)` on both queries
- RLS: applies to all read queries
- `actionRequiresApproval` policy: surfaced in recommendation payload + enforced in prefill (enabled=false for approval-required)
- Single-writer: not touched
- AI Output Contract: not touched — endpoint reads `category` which validator already guarantees as optional-but-typed

## Safe additive implementation strategy

### Step 1: Backend endpoint (~150 LOC)
- Add handler in `backend/src/routes/v1/automation.ts` (single new route at bottom)
- Constant map `CATEGORY_ACTION_SUGGESTIONS` in route file (single source of truth)
- Two SELECT queries + in-memory diff
- Reuse `actionRequiresApproval` import from automation-engine
- Reuse `UUID_LIKE` regex (none needed here — no path params)

### Step 2: Frontend card (~150 LOC)
- New `RecommendationsCard` component in same file (or extract to `components/automation/RecommendationsCard.tsx`)
- Fetch alongside rules+runs+actions in existing useEffect (4-way Promise.all)
- Click handler reuses existing `setCreateForm` + `setShowCreateForm(true)` machinery
- Empty state: card doesn't render when recommendations array is empty

### Step 3: Optional enhancement (later, not in initial ship)
- Persist dismissals in `users.preferences` JSONB or new lightweight `recommendation_dismissals` table — DEFERRED; out of scope

## Rollout order
1. Endpoint ships first (no FE consumer = no-op)
2. FE card consumes endpoint
3. Verify with operator-supplied test org with high decision volume

## Implementation complexity
- **Effort:** M
- **LOC estimate:** ~300 (150 BE + 150 FE)
- **Risk:** low — read-only aggregate; no executor touch
- **Test surface:** org with 0 decisions (empty), org with decisions but all categories covered (empty), org with uncovered category (1+ recommendation)

## No-breakage guarantees
1. Existing rule CRUD flow untouched
2. Existing Create form prefill is additive (extends `createForm` state with values already typed)
3. Category → action map is the only new source of truth; can't conflict with backend (it's IN the backend)
4. `requires_approval` derived from existing `actionRequiresApproval` — single policy source
5. No new mutations
6. No schema change
7. Empty/error states handled gracefully (card doesn't render)
