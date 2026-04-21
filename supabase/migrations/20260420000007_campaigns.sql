-- Phase 6: Campaigns
-- Separate org-managed campaign records from campaign_metrics (sync-read only)

CREATE TABLE IF NOT EXISTS campaigns (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               TEXT        NOT NULL,
  name                 TEXT        NOT NULL,
  platform             TEXT        NOT NULL CHECK (platform IN ('meta', 'google')),
  status               TEXT        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  daily_budget         NUMERIC(14,4),
  targeting            JSONB       NOT NULL DEFAULT '{}',
  ad_account_id        UUID        REFERENCES ad_accounts(id) ON DELETE SET NULL,
  platform_campaign_id TEXT,
  ai_suggestions       JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Org isolation: one campaign record per (org, name, platform)
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_unique
  ON campaigns (org_id, name, platform);

CREATE INDEX IF NOT EXISTS idx_campaigns_org_id     ON campaigns (org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_status ON campaigns (org_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_platform ON campaigns (org_id, platform);

-- Auto-update updated_at on any row change
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- RLS: users see only their own org's campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_org_read_write" ON campaigns
  USING  (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

-- New action seeds: push-to-platform via Phase 4 execution layer
INSERT INTO actions_library (id, platform, action_type, name, description, parameter_schema, is_active)
VALUES
  (
    '00000000-0000-0000-0000-000000000009',
    'meta',
    'create_campaign',
    'Create Campaign (Meta)',
    'Create and activate a new Meta ad campaign with the specified targeting and budget.',
    '{"fields":[{"name":"campaign_name","type":"string","required":true,"label":"Campaign Name"},{"name":"daily_budget","type":"number","required":true,"label":"Daily Budget ($)"},{"name":"targeting","type":"object","required":false,"label":"Targeting Parameters"}]}',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'google',
    'create_campaign',
    'Create Campaign (Google)',
    'Create and activate a new Google Ads campaign with the specified targeting and budget.',
    '{"fields":[{"name":"campaign_name","type":"string","required":true,"label":"Campaign Name"},{"name":"daily_budget","type":"number","required":true,"label":"Daily Budget ($)"},{"name":"targeting","type":"object","required":false,"label":"Targeting Parameters"}]}',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Add create_campaign handler to action-executor registry (simulated, like other Phase 4 handlers)
-- No SQL needed — the create_campaign type is registered in action-executor.ts
