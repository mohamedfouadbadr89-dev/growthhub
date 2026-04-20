-- Phase 3 Intelligence Layer: decisions, alerts, alert_thresholds, decision_runs
-- Adds credits_balance + vault_byok_openrouter_secret_id to organizations.

-- ============================================================
-- ALTER organizations
-- ============================================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS credits_balance INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS vault_byok_openrouter_secret_id UUID;

-- ============================================================
-- decision_runs  (created first — referenced by decisions and alerts)
-- ============================================================
CREATE TABLE decision_runs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               TEXT NOT NULL REFERENCES organizations(org_id),
  trigger              TEXT NOT NULL CHECK (trigger IN ('sync_complete', 'manual')),
  status               TEXT NOT NULL DEFAULT 'in_progress'
                         CHECK (status IN ('in_progress', 'completed', 'failed')),
  decisions_generated  INTEGER DEFAULT 0,
  alerts_generated     INTEGER DEFAULT 0,
  error_message        TEXT,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at         TIMESTAMPTZ
);

ALTER TABLE decision_runs ENABLE ROW LEVEL SECURITY;

-- Users can read their own org's runs; only backend writes (service_role bypasses RLS)
CREATE POLICY "org_read" ON decision_runs
  FOR SELECT USING (org_id = auth.jwt()->>'org_id');

-- Prevent concurrent runs for the same org
CREATE UNIQUE INDEX idx_decision_runs_one_active
  ON decision_runs(org_id)
  WHERE status = 'in_progress';

CREATE INDEX idx_decision_runs_org_started ON decision_runs(org_id, started_at DESC);

-- ============================================================
-- decisions
-- ============================================================
CREATE TABLE decisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                TEXT NOT NULL REFERENCES organizations(org_id),
  integration_id        UUID NOT NULL REFERENCES integrations(id),
  ad_account_id         UUID REFERENCES ad_accounts(id),
  campaign_id           TEXT NOT NULL,
  platform              TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'shopify')),
  type                  TEXT NOT NULL CHECK (type IN (
                           'ROAS_DROP', 'SPEND_SPIKE', 'CONVERSION_DROP', 'SCALING_OPPORTUNITY'
                         )),
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'stale', 'dismissed')),
  trigger_condition     TEXT NOT NULL,
  data_snapshot         JSONB NOT NULL,
  ai_explanation        TEXT,
  ai_status             TEXT NOT NULL DEFAULT 'pending'
                          CHECK (ai_status IN (
                            'pending', 'completed', 'credits_exhausted', 'ai_unavailable'
                          )),
  confidence_score      INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  confidence_rationale  TEXT,
  recommended_action    TEXT NOT NULL,
  priority_score        NUMERIC(6,2) NOT NULL DEFAULT 0,
  decision_run_id       UUID NOT NULL REFERENCES decision_runs(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON decisions
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_decisions_org_active ON decisions(org_id, priority_score DESC)
  WHERE status = 'active';
CREATE INDEX idx_decisions_org_created ON decisions(org_id, created_at DESC);
CREATE INDEX idx_decisions_campaign_type ON decisions(org_id, campaign_id, type);

-- ============================================================
-- alerts
-- ============================================================
CREATE TABLE alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           TEXT NOT NULL REFERENCES organizations(org_id),
  integration_id   UUID NOT NULL REFERENCES integrations(id),
  campaign_id      TEXT NOT NULL,
  platform         TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'shopify')),
  type             TEXT NOT NULL CHECK (type IN ('SPEND_EXCEEDED', 'ROAS_BELOW_THRESHOLD')),
  severity         TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  breached_value   NUMERIC(15,4) NOT NULL,
  threshold_value  NUMERIC(15,4) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  resolved_at      TIMESTAMPTZ,
  decision_run_id  UUID NOT NULL REFERENCES decision_runs(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON alerts
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_alerts_org_active ON alerts(org_id, created_at DESC)
  WHERE status = 'active';
CREATE INDEX idx_alerts_org_created ON alerts(org_id, created_at DESC);

-- ============================================================
-- alert_thresholds  (per-org config; system defaults apply when absent)
-- ============================================================
CREATE TABLE alert_thresholds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           TEXT NOT NULL REFERENCES organizations(org_id),
  type             TEXT NOT NULL CHECK (type IN ('SPEND_EXCEEDED', 'ROAS_BELOW_THRESHOLD')),
  threshold_value  NUMERIC(15,4) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, type)
);

ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON alert_thresholds
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

-- ============================================================
-- detect_anomaly_candidates  — returns latest-day metrics per campaign with 7-day rolling avgs
-- ============================================================
CREATE OR REPLACE FUNCTION detect_anomaly_candidates(p_org_id TEXT)
RETURNS TABLE (
  campaign_id     TEXT,
  platform        TEXT,
  integration_id  UUID,
  ad_account_id   UUID,
  date            DATE,
  roas            NUMERIC,
  spend           NUMERIC,
  conversions     NUMERIC,
  roas_avg_7d     NUMERIC,
  spend_avg_7d    NUMERIC,
  conv_avg_7d     NUMERIC,
  data_points     BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH rolling AS (
    SELECT
      cm.campaign_id,
      cm.platform,
      cm.integration_id,
      cm.ad_account_id,
      cm.date,
      cm.roas,
      cm.spend,
      cm.conversions,
      AVG(cm.roas)         OVER w AS roas_avg_7d,
      AVG(cm.spend)        OVER w AS spend_avg_7d,
      AVG(cm.conversions)  OVER w AS conv_avg_7d,
      COUNT(*)             OVER w AS data_points
    FROM campaign_metrics cm
    WHERE cm.org_id = p_org_id
      AND cm.date >= CURRENT_DATE - INTERVAL '30 days'
    WINDOW w AS (
      PARTITION BY cm.campaign_id
      ORDER BY cm.date
      ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
    )
  ),
  latest AS (
    SELECT DISTINCT ON (campaign_id) *
    FROM rolling
    ORDER BY campaign_id, date DESC
  )
  SELECT
    campaign_id, platform, integration_id, ad_account_id, date,
    roas, spend, conversions,
    roas_avg_7d, spend_avg_7d, conv_avg_7d, data_points
  FROM latest
  WHERE data_points >= 3;
$$;

-- ============================================================
-- get_latest_campaign_metrics  — latest day's spend/roas per campaign for alert checks
-- ============================================================
CREATE OR REPLACE FUNCTION get_latest_campaign_metrics(p_org_id TEXT)
RETURNS TABLE (
  campaign_id     TEXT,
  platform        TEXT,
  integration_id  UUID,
  roas            NUMERIC,
  spend           NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (campaign_id)
    cm.campaign_id,
    cm.platform,
    cm.integration_id,
    cm.roas,
    cm.spend
  FROM campaign_metrics cm
  WHERE cm.org_id = p_org_id
    AND cm.date >= CURRENT_DATE - INTERVAL '2 days'
  ORDER BY campaign_id, date DESC;
$$;

-- ============================================================
-- deduct_credit  — atomically deducts 1 credit for subscription orgs
-- Returns the new balance, or NULL if deduction was not possible
-- (zero credits OR plan_type != 'subscription')
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_credit(p_org_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE organizations
    SET credits_balance = credits_balance - 1
  WHERE org_id = p_org_id
    AND plan_type = 'subscription'
    AND credits_balance >= 1
  RETURNING credits_balance INTO new_balance;

  RETURN new_balance;  -- NULL if no row updated
END;
$$;
