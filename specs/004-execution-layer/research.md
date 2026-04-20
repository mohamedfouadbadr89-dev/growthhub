# Research: Execution Layer — Actions, Automation & Decision History

**Feature**: Phase 4 — Execution Layer
**Date**: 2026-04-20

---

## Decision 1: Action Executor Pattern

**Decision**: Registry/strategy pattern — `ACTION_HANDLERS: Record<action_type, Handler>` where each handler is a function `(params, orgId, campaignId) => Promise<ExecutionResult>`.

**Rationale**: Phase 4 executions are mocked (simulated). Phase 6 will replace handlers with real platform API calls. The registry pattern makes this a surgical replacement per action_type rather than a full rewrite. Adding a new action type means adding one entry to the registry, not modifying the orchestrator.

**Handler signature**:
```typescript
type ActionHandler = (params: Record<string, unknown>, context: ExecutionContext) => Promise<ExecutionResult>
type ExecutionResult = { success: boolean; result_data: Record<string, unknown>; error_message?: string }
type ExecutionContext = { orgId: string; campaignId?: string; platform: string }
```

**Phase 4 mock pattern**: Each handler simulates a 200–500ms delay then returns `{ success: true, result_data: { simulated: true, action: 'pause_campaign', campaignId } }`.

**Alternatives considered**:
- Command pattern with classes: More boilerplate, no benefit at this scale.
- Inline switch statement in executor: Doesn't scale, hard to replace handlers in Phase 6.

---

## Decision 2: Automation Rule Execution Timing

**Decision**: Call `dispatchAutomation(orgId, runId)` inline at the end of `dispatchIntelligence()` in `backend/src/services/intelligence/index.ts`, after `generateDecisionsForOrg` and `detectAlerts` complete.

**Rationale**: Keeping automation in the same Inngest function (`generate-decisions`) ensures decisions exist in the DB before rules fire. No extra event round-trip, no timing window where rules could fire against stale decisions. The `decision_runs` record is updated with `rules_executed` count.

**Rule matching algorithm**:
1. Fetch all `enabled = true` automation_rules for the org.
2. Fetch all `status = 'active'` decisions created in this run (filter by `created_at >= run.started_at`).
3. For each decision: find rules where `rule.trigger_type = decision.type` AND `decision.confidence_score >= rule.min_confidence_threshold`.
4. For each matching (decision, rule) pair: execute action, create `automation_run`, create `decision_history`.

**Alternatives considered**:
- Separate Inngest event `automation/rules.requested`: More decoupled but adds latency and a second event fan-out. Unnecessary for Phase 4 scale.
- Cron-based polling: Would miss the immediate post-decision window.

---

## Decision 3: Decision History Schema (Constitution-Mandated)

**Decision**: Implement `decision_history` with EXACTLY the fields specified in `Phases.md` and the Constitution, plus foreign keys and execution metadata.

**Rationale**: The Constitution (Principle III) states this table is subject to investor due diligence and MUST NOT be simplified. The schema is non-negotiable.

**Required fields** (from Constitution/Phases.md):
- `decision` TEXT — what was decided (trigger_condition label)
- `action_taken` TEXT — what was executed (action template name + params summary)
- `trigger_condition` TEXT — what caused it (rule name + original condition)
- `data_used` JSONB — data snapshot at decision time
- `result` TEXT — 'success' | 'failed' | 'skipped'
- `ai_explanation` TEXT — why the AI decided this (nullable)
- `confidence_score` INTEGER — 0-100 (nullable)

**Additional fields for linking and querying**:
- `org_id` TEXT NOT NULL (multi-tenancy)
- `decision_id` UUID (FK → decisions.id, nullable — manual executions may not link to a decision)
- `automation_rule_id` UUID (FK → automation_rules.id, nullable — manual executions have no rule)
- `automation_run_id` UUID (FK → automation_runs.id, nullable — manual executions have no run)
- `executed_by` TEXT — 'manual' | 'automation'
- `created_at` TIMESTAMPTZ

---

## Decision 4: Action Template Seeding Strategy

**Decision**: Seed action templates via SQL migration `INSERT ... ON CONFLICT DO NOTHING`. Templates are system-owned (no `org_id`), globally available to all organizations.

**Rationale**: Action templates are product-defined — they're not user data. Using a migration ensures templates are consistently seeded on every database (local, staging, prod). `ON CONFLICT DO NOTHING` makes re-running migrations idempotent.

**Initial seed set** (Phase 4):
| id | platform | action_type | name |
|----|----------|-------------|------|
| seed-01 | meta | pause_campaign | Pause Campaign (Meta) |
| seed-02 | meta | increase_budget | Increase Budget 20% (Meta) |
| seed-03 | meta | decrease_budget | Decrease Budget 20% (Meta) |
| seed-04 | google | pause_campaign | Pause Campaign (Google) |
| seed-05 | google | increase_budget | Increase Budget 20% (Google) |
| seed-06 | google | decrease_budget | Decrease Budget 20% (Google) |
| seed-07 | meta | send_alert_email | Send Alert Email |
| seed-08 | google | send_alert_email | Send Alert Email |

**parameter_schema JSONB example** (pause_campaign):
```json
{
  "fields": [
    { "name": "campaign_id", "type": "string", "required": true, "label": "Campaign ID" },
    { "name": "reason",      "type": "string", "required": false, "label": "Reason (optional)" }
  ]
}
```

**Alternatives considered**:
- Admin UI for template management: Over-engineered for Phase 4.
- Hardcoded in TypeScript only: Not queryable or extensible.

---

## Decision 5: Integration Pre-flight Check

**Decision**: Before any action executes, the action executor checks that the org has a `status = 'connected'` integration for the target platform. Failure throws `{ code: 'INTEGRATION_NOT_CONNECTED', platform }`.

**Rationale**: FR-013 and FR-014 require a clear error when the platform is not connected. The backend must enforce this — not just the frontend — to prevent silent failures.

**Implementation**:
```typescript
const { data: integration } = await supabaseAdmin
  .from('integrations')
  .select('id')
  .eq('org_id', orgId)
  .eq('platform', platform)
  .eq('status', 'connected')
  .single()
if (!integration) {
  throw Object.assign(new Error(`Platform ${platform} not connected`), { code: 'INTEGRATION_NOT_CONNECTED' })
}
```

The API route catches this and returns HTTP 422 with `{ error: 'Platform not connected', code: 'INTEGRATION_NOT_CONNECTED' }`.

---

## Decision 6: Manual Execution API Design

**Decision**: Single endpoint `POST /api/v1/actions/:id/execute` handles both manual executions from the Actions Library and from the Decision Detail page. The request body accepts an optional `decision_id` field. If present, the executor fetches the linked decision's `data_snapshot`, `ai_explanation`, and `confidence_score` to populate the `decision_history` record.

**Rationale**: One endpoint keeps the backend simple. The frontend determines whether to include `decision_id` based on context (Action Detail page = no decision_id; Decision Detail page = includes decision_id).

**Request body**:
```json
{
  "params": { "campaign_id": "123456", "reason": "ROAS below threshold" },
  "decision_id": "uuid-optional"
}
```

**Response**:
```json
{
  "history_id": "uuid",
  "result": "success",
  "result_data": { "simulated": true }
}
```
