-- ===========================================================================
-- 20260503150000_phase4_decision_history_impact_snapshot.sql
-- Phase 4 — impact_snapshot persistence on decision_history
-- ===========================================================================
-- Per Phases.md Phase 4: "Add: ... impact_snapshot (before/after)"
--
-- Strictly additive:
--   ADD COLUMN decision_history.impact_snapshot JSONB  (NULLABLE — back-compat
--   with existing rows; existing callers do nothing differently; new rows
--   from executeAction will populate it from each handler's result_data,
--   which already carries the after-state for real-mode actions
--   (previous_daily_budget + new_daily_budget for budget changes;
--   http_status + body for pause/POST; recipients_count + message_id for
--   email; {simulated: true, ...} for simulated).
--
-- No destructive change. No table rename. No FK change. No RLS change.
-- ===========================================================================

ALTER TABLE decision_history
  ADD COLUMN IF NOT EXISTS impact_snapshot JSONB;
