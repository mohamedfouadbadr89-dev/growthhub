-- ===========================================================================
-- 20260503140000_phase4_decision_history_idempotency.sql
-- Phase 4 — execution idempotency
-- ===========================================================================
-- Per Phases.md Phase 4: "Execution MUST be idempotent" + "Add: execution_id (unique)".
--
-- Strictly additive:
--   1) ADD COLUMN decision_history.execution_id UUID  (NULLABLE — back-compat
--      with existing rows and existing callers that don't supply a key)
--   2) Partial UNIQUE index on (org_id, execution_id) WHERE execution_id IS NOT NULL
--      — enforces idempotency ONLY for callers that opt in by supplying a key,
--      leaving table semantics unchanged for everyone else.
--      Scoped to (org_id, execution_id) so cross-org keys cannot collide and
--      per-org idempotency holds.
--
-- No destructive change. No table rename. No FK change. No RLS change.
-- ===========================================================================

ALTER TABLE decision_history
  ADD COLUMN IF NOT EXISTS execution_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_history_org_execution_id
  ON decision_history(org_id, execution_id)
  WHERE execution_id IS NOT NULL;
