-- Phase 4: Execution Layer
-- Tables: actions_library, automation_rules, automation_runs, decision_history

-- ─── actions_library (system-global, no org_id) ───────────────────────────────
CREATE TABLE IF NOT EXISTS actions_library (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'shopify')),
  action_type      TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  parameter_schema JSONB NOT NULL DEFAULT '{"fields":[]}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE actions_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY actions_library_select ON actions_library FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_actions_library_platform    ON actions_library(platform);
CREATE INDEX IF NOT EXISTS idx_actions_library_action_type ON actions_library(action_type);

-- ─── automation_rules ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   TEXT NOT NULL,
  name                     TEXT NOT NULL,
  trigger_type             TEXT NOT NULL CHECK (trigger_type IN ('ROAS_DROP','SPEND_SPIKE','CONVERSION_DROP','SCALING_OPPORTUNITY')),
  min_confidence_threshold INTEGER NOT NULL DEFAULT 70 CHECK (min_confidence_threshold BETWEEN 0 AND 100),
  action_template_id       UUID NOT NULL REFERENCES actions_library(id),
  action_params            JSONB NOT NULL DEFAULT '{}',
  enabled                  BOOLEAN NOT NULL DEFAULT true,
  run_count                INTEGER NOT NULL DEFAULT 0,
  last_fired_at            TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_rules_org_isolation ON automation_rules
  USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX IF NOT EXISTS idx_automation_rules_org_id  ON automation_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(org_id, trigger_type, enabled);

-- ─── automation_runs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              TEXT NOT NULL,
  automation_rule_id  UUID NOT NULL REFERENCES automation_rules(id),
  decision_id         UUID REFERENCES decisions(id),
  action_template_id  UUID NOT NULL REFERENCES actions_library(id),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','skipped')),
  result_data         JSONB,
  error_message       TEXT,
  executed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_runs_org_isolation ON automation_runs
  USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX IF NOT EXISTS idx_automation_runs_org_id      ON automation_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_rule_id     ON automation_runs(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_executed_at ON automation_runs(org_id, executed_at DESC);

-- ─── decision_history (CRITICAL — constitution-mandated memory table) ──────────
CREATE TABLE IF NOT EXISTS decision_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              TEXT NOT NULL,
  -- Constitution-mandated fields (exact names required)
  decision            TEXT NOT NULL,
  action_taken        TEXT NOT NULL,
  trigger_condition   TEXT NOT NULL,
  data_used           JSONB NOT NULL DEFAULT '{}',
  result              TEXT NOT NULL CHECK (result IN ('success','failed','skipped')),
  ai_explanation      TEXT,
  confidence_score    INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  -- Linking fields
  decision_id         UUID REFERENCES decisions(id),
  automation_rule_id  UUID REFERENCES automation_rules(id),
  automation_run_id   UUID REFERENCES automation_runs(id),
  executed_by         TEXT NOT NULL CHECK (executed_by IN ('manual','automation')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE decision_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_history_org_isolation ON decision_history
  USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX IF NOT EXISTS idx_decision_history_org_id      ON decision_history(org_id);
CREATE INDEX IF NOT EXISTS idx_decision_history_created_at  ON decision_history(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_history_decision_id ON decision_history(decision_id) WHERE decision_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_history_executed_by ON decision_history(org_id, executed_by);

-- ─── Extend decision_runs with rules_executed counter ─────────────────────────
ALTER TABLE decision_runs ADD COLUMN IF NOT EXISTS rules_executed INTEGER NOT NULL DEFAULT 0;

-- ─── Seed actions_library ─────────────────────────────────────────────────────
INSERT INTO actions_library (id, platform, action_type, name, description, parameter_schema) VALUES
  ('00000000-0000-0000-0000-000000000001', 'meta',   'pause_campaign',  'Pause Campaign (Meta)',         'Pauses an active Meta Ads campaign immediately.',          '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"},{"name":"reason","type":"string","required":false,"label":"Reason (optional)"}]}'),
  ('00000000-0000-0000-0000-000000000002', 'meta',   'increase_budget', 'Increase Budget 20% (Meta)',    'Increases the daily budget of a Meta campaign by 20%.',    '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"}]}'),
  ('00000000-0000-0000-0000-000000000003', 'meta',   'decrease_budget', 'Decrease Budget 20% (Meta)',    'Decreases the daily budget of a Meta campaign by 20%.',    '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"}]}'),
  ('00000000-0000-0000-0000-000000000004', 'google', 'pause_campaign',  'Pause Campaign (Google)',       'Pauses an active Google Ads campaign immediately.',        '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"},{"name":"reason","type":"string","required":false,"label":"Reason (optional)"}]}'),
  ('00000000-0000-0000-0000-000000000005', 'google', 'increase_budget', 'Increase Budget 20% (Google)', 'Increases the daily budget of a Google campaign by 20%.',  '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"}]}'),
  ('00000000-0000-0000-0000-000000000006', 'google', 'decrease_budget', 'Decrease Budget 20% (Google)', 'Decreases the daily budget of a Google campaign by 20%.',  '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"}]}'),
  ('00000000-0000-0000-0000-000000000007', 'meta',   'send_alert_email','Send Alert Email (Meta)',       'Sends an alert email notification for a Meta campaign.',   '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"},{"name":"message","type":"string","required":true,"label":"Alert Message"}]}'),
  ('00000000-0000-0000-0000-000000000008', 'google', 'send_alert_email','Send Alert Email (Google)',     'Sends an alert email notification for a Google campaign.', '{"fields":[{"name":"campaign_id","type":"string","required":true,"label":"Campaign ID"},{"name":"message","type":"string","required":true,"label":"Alert Message"}]}')
ON CONFLICT (id) DO NOTHING;
