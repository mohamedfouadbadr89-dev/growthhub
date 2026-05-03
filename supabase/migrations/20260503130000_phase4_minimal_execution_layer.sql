-- ===========================================================================
-- 20260503130000_phase4_minimal_execution_layer.sql
-- Phase 4 minimal execution layer
-- ===========================================================================
-- Scope (per SYSTEM_CONTROL execution authorization 2026-05-03):
--   - actions_library  : system reference catalogue, RLS authenticated-read,
--                        unique on (platform, action_type) for idempotent seed
--   - decision_history : per-org execution audit log, RLS by org_id,
--                        FK to organizations + ai_decisions
--
-- Deviations from specs/004-execution-layer/data-model.md (deliberate):
--   - confidence_score is NUMERIC 0..1 (matches ai_decisions canonical scale,
--     not the legacy 0..100 from the anomaly-engine `decisions` table which
--     is deprecated as of Phase 3 close).
--   - Linking column is `ai_decision_id REFERENCES ai_decisions(id)` instead
--     of `decision_id REFERENCES decisions(id)` — `decisions` is the legacy
--     anomaly engine and is malformed in the live DB.
--   - `automation_rule_id` and `automation_run_id` columns intentionally
--     omitted; user-authorized scope excludes the automation engine. Will be
--     added in a follow-up migration when Phase 4-automation is unlocked.
--   - `trace_id` column added so action executions can be correlated with
--     the originating AI flow's `ai_logs` / `ai_decisions.trace_id`.
-- ===========================================================================


-- ─── actions_library ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actions_library (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform          TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'shopify')),
  action_type       TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  parameter_schema  JSONB NOT NULL DEFAULT '{"fields":[]}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT actions_library_platform_action_type_key UNIQUE (platform, action_type)
);

ALTER TABLE actions_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "actions_library_authenticated_read" ON actions_library;
CREATE POLICY "actions_library_authenticated_read" ON actions_library
  FOR SELECT
  USING (auth.jwt()->>'org_id' IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_actions_library_platform
  ON actions_library(platform);
CREATE INDEX IF NOT EXISTS idx_actions_library_action_type
  ON actions_library(action_type);

-- Seed default action catalogue (idempotent via UNIQUE on platform+action_type)
INSERT INTO actions_library (platform, action_type, name, description, parameter_schema) VALUES
  ('meta', 'pause_campaign',
   'Pause Meta Campaign',
   'Pause a Meta Ads campaign immediately.',
   '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"}]}'::jsonb),
  ('meta', 'increase_budget',
   'Increase Meta Campaign Budget',
   'Increase a Meta campaign daily budget by a percentage.',
   '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"},{"name":"percent","type":"number","required":true,"label":"Increase Percent"}]}'::jsonb),
  ('meta', 'decrease_budget',
   'Decrease Meta Campaign Budget',
   'Decrease a Meta campaign daily budget by a percentage.',
   '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"},{"name":"percent","type":"number","required":true,"label":"Decrease Percent"}]}'::jsonb),
  ('google', 'pause_campaign',
   'Pause Google Campaign',
   'Pause a Google Ads campaign immediately.',
   '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"}]}'::jsonb),
  ('meta', 'send_alert_email',
   'Send Alert Email',
   'Notify org admins about a flagged condition.',
   '{"fields":[{"name":"subject","type":"string","required":true,"label":"Subject"},{"name":"body","type":"string","required":true,"label":"Body"}]}'::jsonb)
ON CONFLICT (platform, action_type) DO NOTHING;


-- ─── decision_history ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decision_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              TEXT NOT NULL REFERENCES organizations(org_id),

  -- CONSTITUTION-mandated audit fields (CLAUDE.md §9 "Decision History")
  decision            TEXT NOT NULL,
  action_taken        TEXT NOT NULL,
  trigger_condition   TEXT NOT NULL,
  data_used           JSONB NOT NULL DEFAULT '{}'::jsonb,
  result              TEXT NOT NULL CHECK (result IN ('success', 'failed', 'skipped')),
  ai_explanation      TEXT,
  confidence_score    NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Canonical AI linkage (Phase 3 ai_decisions). Both nullable for pure manual ops.
  ai_decision_id      UUID REFERENCES ai_decisions(id),
  trace_id            UUID,

  executed_by         TEXT NOT NULL CHECK (executed_by IN ('manual', 'automation')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE decision_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decision_history_org_isolation" ON decision_history;
CREATE POLICY "decision_history_org_isolation" ON decision_history
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

CREATE INDEX IF NOT EXISTS idx_decision_history_org_created
  ON decision_history(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_history_ai_decision
  ON decision_history(org_id, ai_decision_id) WHERE ai_decision_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_history_trace
  ON decision_history(org_id, trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_history_executed_by
  ON decision_history(org_id, executed_by);
