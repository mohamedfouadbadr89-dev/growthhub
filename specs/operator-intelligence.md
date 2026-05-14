# Operator Intelligence — Master Spec (UMBRELLA)

## Status
PLANNING. Generated 2026-05-14. Layered surfaces on top of the closed-and-hardened automation engine. No backend rewrites. No new orchestration. No schema rewrites. Single-writer preserved.

## Purpose

Convert the already-mature backend (validator → persist → auto-fire → approval gate → dedupe → executor → audit chain) into a **visible, navigable, enterprise-grade operator platform**. The intelligence is already inside the system — this plan surfaces it.

## Hard architectural constraints (NON-NEGOTIABLE)

| Invariant | Enforcement | Anything in this plan MUST preserve |
|---|---|---|
| Single-writer | Only `executeAction` writes `decision_history` | No alternate writers |
| AI Output Contract | `utils/aiValidator.ts` hard-rejects | Never persist unvalidated AI output |
| Idempotency | `(org_id, execution_id)` partial unique index | Replay returns original row |
| Org isolation | `authMiddleware` server-side `org_id` + RLS | Never read `org_id` from body |
| Approval policy | Centralized `actionRequiresApproval(action_type)` | No distributed conditionals |
| Audit trail | `decision_history` + `automation_runs.result_data{trigger_source}` | No skipped audit writes |
| Trace correlator | `request_id` + `trace_id` | No new tracing system |
| LIVE flag governance | Per-handler env flag + allowlist + startup fail-fast | No unflagged real-mode handlers |
| Auto-fire dedupe | App-level `(rule_id, ai_decision_id)` check | No parallel auto-fire workers |

## The 8 operator intelligence layers

| # | Layer | Detail spec | Effort | Class |
|---|---|---|---|---|
| 1 | Automation Explainability | `specs/automation-explainability.md` | S | FE-only |
| 2 | AI Reasoning Visibility | `specs/ai-operator-center.md` (folded) | M | BE additive endpoints + FE |
| 3 | Recommended Automations | `specs/recommended-automations.md` | M | BE additive endpoint + FE |
| 4 | Action Catalog FE Wiring | `specs/action-catalog-fe.md` | S | FE-only |
| 5 | AI Operator Center | `specs/ai-operator-center.md` | M | BE additive endpoints + FE |
| 6 | Execution Timeline | `specs/execution-timeline.md` | S/M | FE-only (BE optional perf) |
| 7 | Approval Intelligence | `specs/approval-intelligence.md` | M | BE additive (`status='skipped_approval'` row pattern) + FE |
| 8 | Governance Dashboard | `specs/governance-dashboard.md` | L | BE additive aggregate endpoint + FE |

## Backend Reuse Matrix

Maps existing backend capabilities to the operator surfaces that consume them. Every cell marked ✅ is reused — no new system created.

| Capability | Source | Explain (1) | Reasoning (2) | Recs (3) | Catalog (4) | OperCenter (5) | Timeline (6) | Approval (7) | Governance (8) |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `ai_logs` table | `services/ai/persistence.ts:186-230` | | ✅ | | | ✅ | ✅ | | ✅ |
| `automation_runs` table | `migrations/20260507130000_phase4_part2_automation.sql` | ✅ | ✅ | ✅ | | ✅ | ✅ | ✅ | ✅ |
| `decision_history` table | `migrations/20260503130000_phase4_minimal_execution_layer.sql` | ✅ | ✅ | | ✅ | ✅ | ✅ | ✅ | ✅ |
| `result_data.trigger_source` | `automation-engine.ts:461-540` | ✅ | | ✅ | | | ✅ | ✅ | ✅ |
| `ai_decisions.reasoning_steps` | `aiValidator.ts:1-100` | ✅ | ✅ | ✅ | | ✅ | ✅ | | |
| `ai_decisions.category` | `aiValidator.ts:84-98`, `persistence.ts:127-133` | ✅ | ✅ | ✅ | | ✅ | ✅ | | ✅ |
| `decision_history.impact_snapshot` | `migrations/20260503150000_phase4_decision_history_impact_snapshot.sql` | ✅ | | | | ✅ | ✅ | | ✅ |
| `decision_history.execution_id` | `migrations/20260503140000_phase4_decision_history_idempotency.sql` | | | | ✅ | ✅ | ✅ | | ✅ |
| `decision_history.trace_id` + `request_id` | `middleware/tracing.ts` | | ✅ | | | ✅ | ✅ | | ✅ |
| `actionRequiresApproval` policy | `automation-engine.ts:80-93` | ✅ | | ✅ | ✅ | | | ✅ | ✅ |
| LIVE flags + allowlists | `index.ts:115-132`, `action-executor.ts` per-handler | | | | ✅ | | | | ✅ |
| `actions_library` catalog | `routes/v1/actions.ts:36-114` | | | ✅ | ✅ | | | | ✅ |
| `automation_rules` | `routes/v1/automation.ts:51-312` | ✅ | | ✅ | | | ✅ | ✅ | ✅ |
| `log_ai_usage` RPC rows | `execute-ai-decision.ts:272-303` | | ✅ | | | ✅ | | | ✅ |

## Page Mapping Matrix

Every existing automation/decision/operator page + its target upgrade.

| Page | Current state | Current problems | Existing APIs | Missing APIs | Reusable systems | Target upgraded UX |
|---|---|---|---|---|---|---|
| `app/automation/page.tsx` | redirect → /automation/history (#86) | none | – | – | – | (unchanged) |
| `app/automation/history/page.tsx` | LIVE — joins rules + ai_decisions + actions_library | "Growth Suggestion" still mock; no per-trigger filter; impact_snapshot only on detail | `/automation/runs` | none | result_data primitive renderer (#39), reasoning panel (#37), category chip (#38), trigger_source chip (#110) | **Layer 1 + Layer 6**: dedicated explainability drawer; trigger-source filter chip; per-rule sparkline; timeline-interleave with `decision_history` |
| `app/automation/builder/page.tsx` | mock (Phase 6 deferred) | governance-deferred — DO NOT WIRE without phase unlock | – | – | – | OUT OF SCOPE this plan |
| `app/automation/strategies/page.tsx` | mock (Phase 6 deferred) | governance-deferred | – | – | – | OUT OF SCOPE |
| `app/actions/page.tsx` | mock (MOCK_ACTIONS hardcoded) | not wired to live catalog | – | none — `/api/v1/actions` already exists | actions_library catalog, parameter_schema | **Layer 4**: swap MOCK to `GET /api/v1/actions`; filter by platform/action_type; show `requires_approval` per row |
| `app/actions/[id]/page.tsx` | mock | no execute wire | – | none — `/api/v1/actions/:id` + `:id/execute` exist | parameter_schema-derived form | **Layer 4**: render parameter_schema form; submit to existing execute endpoint |
| `app/actions/logs/page.tsx` | LIVE | KPI strip shows "—"; no trace_id pivot; impact_snapshot raw JSON | `/history`, `/history/:id` | none | impact_snapshot, trace_id | **Layer 5 + 6**: trace_id pivot link; impact_snapshot diff view |
| `app/actions/automation/page.tsx` | LIVE (full CRUD post-#111) | requires_approval badge only; no "blocked auto-fire" visibility; no per-rule sparkline | `/automation/rules` (GET/POST/PATCH/:id/execute), `/automation/runs`, `/actions` | one additive: aggregate "auto-fire blocked count" (optional) | requires_approval flag, trigger_source | **Layer 1 + 3 + 7**: per-rule sparkline; "approval-required" filter; recommended-rules card; pending-approvals badge |
| `app/dashboard/automation/decision-center/page.tsx` | mock (deferred) | governance-deferred; calls non-existent endpoint | – | – | – | OUT OF SCOPE (legacy shell; would conflict with new Operator Center surface) |
| `app/decisions/page.tsx` | mock (Phase 3 deferred) | governance-deferred — `/decisions/*` 503-gated | – | – | (legacy chain dormant) | OUT OF SCOPE — re-pointing to `ai_decisions` is a NEW endpoint decision; deferred to operator authorization |
| `app/decisions/[id]/page.tsx` | partial — calls 503-gated `/decisions/:id` | hardcoded fictional UUIDs in DECISION_ACTION_MAP | `/actions/:id/execute` (live) | new `GET /api/v1/ai/decisions/:id` (Layer 2/5) | ai_decisions row, validator-guaranteed shape | **Layer 2 + 5**: re-point detail fetch at `/ai/decisions/:id` (additive endpoint) |
| `app/decisions/history/page.tsx` | redirect → /automation/history (#108) | none | – | – | – | (unchanged) |
| `app/decisions/alerts/page.tsx` ... `audience/page.tsx` | mock (Phase 3 deferred) | governance-deferred | – | – | – | OUT OF SCOPE |

## Safe Implementation Order (LOWEST → HIGHEST RISK)

### Phase α — FE-only additive (NO backend changes)
Risk: **near-zero**. Every endpoint already exists; failure modes are isolated to FE render bugs.

1. **Layer 4 · Action Catalog FE Wiring** — `app/actions/page.tsx` + `app/actions/[id]/page.tsx` swap MOCK → real `/api/v1/actions`
2. **Layer 1 · Automation Explainability** — `app/automation/history/page.tsx` dedicated explainability drawer + trigger-source filter chip + per-rule sparkline on `app/actions/automation/page.tsx`
3. **Layer 6 · Execution Timeline** (FE-only variant) — new `app/automation/timeline/page.tsx` interleaving `/automation/runs` + `/history` by timestamp

### Phase β — BE additive read-only endpoints (NO writes, NO orchestration touch)
Risk: **low**. New endpoints under v1 router; auth middleware reused; no executor touch.

4. **Layer 2/5 partial · AI Decision read endpoints** — `GET /api/v1/ai/decisions` + `GET /api/v1/ai/decisions/:id`. Unblocks `app/decisions/[id]/page.tsx` (currently 503).
5. **Layer 5 · AI Operator Center** — `GET /api/v1/ai/logs?trace_id=…` over existing `ai_logs` table. New FE console page.
6. **Layer 3 · Recommended Automations** — `GET /api/v1/automation/recommendations` (SQL aggregate over `ai_decisions.category` vs `automation_rules.trigger_type`). FE card on `/actions/automation`.

### Phase γ — BE additive JSONB extension (NO schema migration)
Risk: **low-medium**. New `automation_runs` row variants with `status='skipped'` + structured `result_data.skip_reason`; everything additive. Approval policy code path untouched — only the SKIP branch persists a row instead of stdout-only log.

7. **Layer 7 · Approval Intelligence** — extend `automation-engine.ts` auto_fire_blocked path to INSERT `automation_runs` with `status='skipped'` + `result_data.skip_reason='approval_required'`. FE "Pending Approvals" view filtering by this status.

### Phase δ — BE additive aggregate endpoint
Risk: **medium**. New aggregate endpoint reads across multiple tables; expensive query needs proper indexing review.

8. **Layer 8 · Governance Dashboard** — `GET /api/v1/governance/summary` aggregating counts across `automation_rules`, `automation_runs`, `decision_history`, `actions_library`. New `/governance/page.tsx`.

## FE-only Additive Work (Phase α)

| Task | File | Existing endpoints used | LOC estimate |
|---|---|---|---|
| Wire Action Catalog list | `app/actions/page.tsx` | `GET /api/v1/actions` | ~150 |
| Wire Action Catalog detail + execute form | `app/actions/[id]/page.tsx` | `GET /api/v1/actions/:id` + `POST /api/v1/actions/:id/execute` | ~250 |
| Explainability drawer on history | `app/automation/history/page.tsx` | (existing JOIN payload) | ~120 |
| Trigger-source filter chip | `app/automation/history/page.tsx` | (existing JOIN payload) | ~30 |
| Per-rule 7-day sparkline | `app/actions/automation/page.tsx` | `/automation/runs?rule_id=…` (existing) | ~80 |
| Execution Timeline page | `app/automation/timeline/page.tsx` (new) | `/automation/runs` + `/history` | ~300 |

## BE Additive Endpoint Work (Phase β)

| Endpoint | Verb | Org-scoped? | Reads from | Why safe |
|---|---|---|---|---|
| `/api/v1/ai/decisions` | GET | yes | `ai_decisions` | Mirror of `/history` pattern; no write; no executor touch |
| `/api/v1/ai/decisions/:id` | GET | yes | `ai_decisions` | UUID-gated; PGRST116 discriminator pattern |
| `/api/v1/ai/logs` | GET | yes | `ai_logs` | Read-only; `?trace_id=` filter |
| `/api/v1/automation/recommendations` | GET | yes | `ai_decisions` ⋈ `automation_rules` | Read-only aggregate |
| `/api/v1/governance/summary` | GET | yes | multi-table aggregate | Read-only; cache-friendly; no writes |

All endpoints:
- Mount under existing `v1` router (auth + RLS already applied)
- Return canonical `{success, data, error, request_id}` envelope
- Use `c.get('orgId')` server-side (never trust body)
- Throw on errors → existing `errorHandler` triple-sink (Sentry + stdout + sanitized 500)

## Phase γ — JSONB Extension Strategy (Approval Intelligence)

The single permitted additive write extension: persist `auto_fire_blocked` events.

**Implementation point:** `automation-engine.ts:278-296` — the SKIP branch currently does:
```
console.info(`[automation] auto_fire_blocked …`)
continue
```

**Additive extension** (no schema change):
- Insert into `automation_runs` with `status='skipped'` (already in CHECK enum)
- `result_data = { trigger_source: 'auto_fire', skip_reason: 'approval_required', action_type, skipped_at }`
- Continue to next rule (no real provider call)

**Safety:**
- `automation_runs.status` CHECK enum already includes `'skipped'` (no migration)
- No `decision_history` write (executor is the only writer there — invariant preserved)
- No real provider call (this is the SKIP path)
- Dedupe gate runs BEFORE this branch — no duplicate skip rows
- FE can filter via existing `/automation/runs?status=skipped`

## Out-of-Scope Work (would violate architecture)

The following are explicitly REJECTED from this plan. Each would violate at least one hard constraint:

| Proposal | Why rejected |
|---|---|
| Reactivate `/decisions/*` or `/alerts/*` 503-gated routers | Governance-deferred per SYSTEM_CONTROL.md; legacy `decisions` table malformed |
| Wire `app/automation/builder/page.tsx` to backend | Phase 6 deferred; would need new table OR aggressive mapping — both require governance unlock |
| Wire `app/automation/strategies/page.tsx` | Phase 6 deferred; same as above |
| Reactivate `decision-generator.ts` legacy chain | Writes legacy `decisions` table; #29 guard intentional |
| Reactivate commented-out Inngest functions | Operator authorization required; would re-fire Phase 3 zombie 42P01 storm |
| Create `services/automation/` parallel directory | Would create duplicate-system drift — canonical path is `services/execution/` |
| New executor or orchestration layer | Violates single-writer invariant |
| New approval engine | Violates centralized `actionRequiresApproval` policy |
| FE direct-call to Meta/Google/Shopify | Violates "backend single source of truth" |
| Schema rewrites on `automation_runs.status` CHECK enum | Migration risk; existing enum sufficient |
| New unique constraint on `automation_runs(rule_id, ai_decision_id)` | PG NULL distinctness breaks manual fires |
| `decision_history.executed_by` CHECK enum extension | Backward compat risk; `result_data.trigger_source` already covers the discriminator |
| Mock data in any new surface | Violates "NO mock systems" |

## Quick Wins (highest value / lowest risk)

Ordered by operator impact ÷ effort:

1. **Action Catalog wiring** (Layer 4) — replaces 100% MOCK with 100% live; ~400 LOC FE-only; unlocks operator action discovery
2. **Explainability drawer** (Layer 1) — surfaces existing reasoning_steps + category + trigger_source already in the payload; ~150 LOC FE-only
3. **Trigger-source filter chip** (Layer 1) — 30 LOC; immediate scan-ability for auto vs manual
4. **AI Decision detail endpoint** (Layer 2) — unblocks `app/decisions/[id]/page.tsx` from 503-gated path; ~80 LOC BE
5. **Recommended Automations** (Layer 3) — proactively suggests rules; pre-fills Create form (#111); ~200 LOC BE+FE

## Dependency Order

```
                ┌─ Layer 4 (Catalog FE) ─── independent ──┐
                │                                          │
Phase α ───────┼─ Layer 1 (Explainability) ── indep ───┐  │
                │                                       │  │
                └─ Layer 6 FE (Timeline) ── indep ─┐    │  │
                                                   │    │  │
Phase β ┌─ Layer 2/5 (AI read endpoints) ──────────┼────┼──┤
        │                                          │    │  │
        ├─ Layer 5 (AI Operator Center) — needs ───┴────┘  │
        │                            (Layer 2 endpoints)    │
        │                                                   │
        └─ Layer 3 (Recommendations) — independent ────────┤
                                                            │
Phase γ ─── Layer 7 (Approval Intel) — needs (Layer 1 + ───┘
                                              policy hook)
                                                            
Phase δ ─── Layer 8 (Governance Dashboard) — depends on ALL ABOVE
            (aggregates everything)
```

**Critical path:** Layers can ship in parallel within a phase. The only hard dependency is Layer 8 → all others (it's a meta-aggregator).

## Implementation Phases (rollout sequencing)

| Phase | Sprint | Layers | Class | Total LOC est |
|---|---|---|---|---|
| α | 1 | 4 + 1 + 6 (FE only) | FE-only additive | ~900 |
| β | 2 | 2/5 endpoints + 5 FE + 3 endpoint+FE | BE additive read-only | ~600 |
| γ | 3 | 7 (block-event JSONB row write + FE) | BE additive JSONB | ~200 |
| δ | 4 | 8 (aggregate endpoint + dashboard) | BE additive aggregate + FE | ~500 |

Total estimated work: ~2200 LOC across 4 phases.

## Safe Release Strategy

Each layer ships behind a soft "operator preview" pattern:
- New FE pages mount under existing dashboard nav (`/automation/*`, `/actions/*`, `/governance/*`)
- No feature flag needed — existing data is the gate (empty states render gracefully)
- BE additive endpoints land BEFORE FE consumers; FE can be deployed without code-level coordination
- Each phase ships independently; rollback is `git revert` of the FE-only or BE-only diff

## No-breakage guarantees (CUMULATIVE)

Every layer in this plan guarantees:
1. Existing `executeAction` pipeline untouched
2. `decision_history` writes only from existing single-writer
3. `actionRequiresApproval` policy untouched (Phase γ adds an audit row beside the existing SKIP, not a policy change)
4. RLS + org_id enforcement preserved on every new query
5. Canonical envelope on every new endpoint
6. AI Output Contract validator never bypassed
7. Idempotency partial unique index never duplicated/removed
8. No Inngest function re-registration
9. No reactivation of legacy `decisions`/`alerts` tables
10. No new schema migration

## Cross-references

Detail specs for each layer:
- `specs/automation-explainability.md` — Layer 1
- `specs/ai-operator-center.md` — Layer 2 + 5 (folded)
- `specs/recommended-automations.md` — Layer 3
- `specs/action-catalog-fe.md` — Layer 4
- `specs/execution-timeline.md` — Layer 6
- `specs/approval-intelligence.md` — Layer 7
- `specs/governance-dashboard.md` — Layer 8

## Verdict

Every layer in this plan **reuses existing systems**. No backend rewrite. No new orchestration. No schema rewrite. No bypass of any governance invariant. The roadmap is **2200 LOC of additive code across 4 phases**, transforming the closed-and-hardened automation engine into a visible operator platform.
