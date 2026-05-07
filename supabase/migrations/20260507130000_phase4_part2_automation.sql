-- =====================================================================
-- Phase 4 Part 2 — Automation Engine (canonical migration; 2026-05-07)
-- =====================================================================
-- Authority chain (in order):
--   1. specs/SYSTEM_CONTROL.md → Phase 4 Part 2 unlock authorized
--   2. specs/004-execution-layer/data-model.md → schema authority
--   3. specs/004-execution-layer/contracts/automation.md → API authority
--   4. CANONICAL AI SYSTEM resolution (SYSTEM_CONTROL.md):
--        Legacy `decisions` table = DEPRECATED; canonical AI surface is
--        `ai_decisions` (Phase 3 close).
--      → "decision_id REFERENCES decisions(id)" in spec data-model is
--        REPLACED with "ai_decision_id REFERENCES ai_decisions(id)"
--        per the explicit Phase 4 Part 2 unlock instruction
--        "Do NOT reactivate the deprecated legacy decisions table".
--
-- Phase locks preserved:
--   - actions_library: untouched (already deployed Phase 4 minimal)
--   - decision_history: ADDITIVE column extension (automation_rule_id,
--     automation_run_id) — both NULLABLE so existing rows are unaffected;
--     the original ai_decision_id linkage continues to be the canonical
--     AI association.
--   - decision_runs: NOT touched (Phase 3 anomaly DEFERRED + DEPRECATED)
--   - decisions (legacy): NOT touched
--
-- Architecture invariants preserved:
--   - org_id present on every new table
--   - RLS enabled on every new table
--   - service_role bypasses RLS by design (backend single writer)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. automation_rules
-- ---------------------------------------------------------------------
-- Org-scoped IF→THEN rules. Each rule binds a trigger_type +
-- min_confidence_threshold to an action_template. Rule trigger_type is
-- a categorical label (ROAS_DROP / SPEND_SPIKE / CONVERSION_DROP /
-- SCALING_OPPORTUNITY) inherited from spec data-model.md. Auto-firing
-- against `ai_decisions` is governance-deferred until the AI Output
-- Contract emits a categorical field — see automation-engine.ts
-- documentation. CRUD + manual rule execution flows are operational
-- regardless.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_rules (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   TEXT NOT NULL REFERENCES organizations(org_id),
  name                     TEXT NOT NULL,
  trigger_type             TEXT NOT NULL
                             CHECK (trigger_type IN ('ROAS_DROP', 'SPEND_SPIKE', 'CONVERSION_DROP', 'SCALING_OPPORTUNITY')),
  min_confidence_threshold INTEGER NOT NULL DEFAULT 70
                             CHECK (min_confidence_threshold BETWEEN 0 AND 100),
  action_template_id       UUID NOT NULL REFERENCES actions_library(id),
  action_params            JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled                  BOOLEAN NOT NULL DEFAULT true,
  run_count                INTEGER NOT NULL DEFAULT 0,
  last_fired_at            TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_rules_org_isolation" ON automation_rules
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_automation_rules_org_id
  ON automation_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger
  ON automation_rules(org_id, trigger_type, enabled);


-- ---------------------------------------------------------------------
-- 2. automation_runs
-- ---------------------------------------------------------------------
-- One record per automation rule execution. Operational ledger of the
-- automation engine.
--
-- Spec data-model.md declared `decision_id UUID REFERENCES decisions(id)`.
-- The legacy `decisions` table is DEPRECATED per CANONICAL AI SYSTEM
-- resolution. Substituted with `ai_decision_id UUID REFERENCES
-- ai_decisions(id)` to match the canonical Phase 3 surface, mirroring
-- the same substitution Phase 4 minimal made on `decision_history`.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              TEXT NOT NULL REFERENCES organizations(org_id),
  automation_rule_id  UUID NOT NULL REFERENCES automation_rules(id),
  ai_decision_id      UUID REFERENCES ai_decisions(id),
  action_template_id  UUID NOT NULL REFERENCES actions_library(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
  result_data         JSONB,
  error_message       TEXT,
  executed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_runs_org_isolation" ON automation_runs
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_automation_runs_org_id
  ON automation_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_rule_id
  ON automation_runs(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_executed_at
  ON automation_runs(org_id, executed_at DESC);


-- ---------------------------------------------------------------------
-- 3. decision_history — additive column extension
-- ---------------------------------------------------------------------
-- Phase 4 minimal close (20260503130000_phase4_minimal_execution_layer.sql)
-- shipped decision_history WITHOUT automation columns. Phase 4 Part 2
-- adds them as NULLABLE — preserves existing rows verbatim and allows
-- Phase 4 minimal-shape inserts (manual executions without rule context)
-- to continue unchanged.
--
-- The `ai_decision_id` column is already present from the Phase 4
-- minimal migration. We do NOT add a `decision_id` column (that would
-- reference the deprecated `decisions` table — forbidden by governance).
-- ---------------------------------------------------------------------
ALTER TABLE decision_history
  ADD COLUMN IF NOT EXISTS automation_rule_id UUID REFERENCES automation_rules(id);

ALTER TABLE decision_history
  ADD COLUMN IF NOT EXISTS automation_run_id UUID REFERENCES automation_runs(id);

CREATE INDEX IF NOT EXISTS idx_decision_history_automation_rule_id
  ON decision_history(automation_rule_id) WHERE automation_rule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_history_automation_run_id
  ON decision_history(automation_run_id) WHERE automation_run_id IS NOT NULL;


-- =====================================================================
-- End of Phase 4 Part 2 — Automation canonical migration.
--
-- Post-migration verification (run in Supabase SQL editor or psql):
--   SELECT tablename FROM pg_tables
--    WHERE schemaname='public'
--      AND tablename IN ('automation_rules', 'automation_runs');
--   -- expect 2 rows.
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='decision_history'
--      AND column_name IN ('automation_rule_id', 'automation_run_id');
--   -- expect 2 rows.
--
--   SELECT polname FROM pg_policy
--    WHERE polrelid::regclass::text IN ('automation_rules', 'automation_runs');
--   -- expect 2 RLS policies.
--
-- Next governed steps (require subsequent authorization or operator):
--   1. supabase db push — deploy this migration.
--   2. Lift /automation/* 503 gate in backend/src/routes/v1/index.ts
--      (only AFTER deploy verified).
--   3. Auto-firing of automation_rules against ai_decisions stream
--      remains GOVERNANCE-DEFERRED: Phase 3 anomaly engine (which
--      provided categorized decisions like ROAS_DROP) is DEPRECATED+
--      DEFERRED. The runtime path for matching automation_rules.
--      trigger_type against an AI decision requires either Phase 3
--      anomaly unlock OR an extension of the AI Output Contract to
--      include a `category` field on ai_decisions.result. Until then,
--      the automation engine ships in MANUAL-EXECUTION mode only:
--      operators / admins fire a rule via POST /automation/rules/:id/execute.
-- =====================================================================
