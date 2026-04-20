-- Phase 2: Data Ingestion
-- Tables: integrations, ad_accounts, campaign_metrics (partitioned), sync_logs

-- ============================================================
-- Table: integrations
-- ============================================================
CREATE TABLE integrations (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        TEXT NOT NULL REFERENCES organizations(org_id),
  platform                      TEXT NOT NULL
                                  CHECK (platform IN ('meta', 'google', 'shopify')),
  status                        TEXT NOT NULL DEFAULT 'connected'
                                  CHECK (status IN ('connected', 'disconnected', 'error')),
  vault_refresh_token_secret_id UUID,
  last_synced_at                TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON integrations
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_integrations_org_id ON integrations(org_id);

-- ============================================================
-- Table: ad_accounts
-- ============================================================
CREATE TABLE ad_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                TEXT NOT NULL REFERENCES organizations(org_id),
  integration_id        UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  platform_account_id   TEXT NOT NULL,
  name                  TEXT NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'USD',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, integration_id, platform_account_id)
);

ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON ad_accounts
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_ad_accounts_org_id ON ad_accounts(org_id);
CREATE INDEX idx_ad_accounts_integration_id ON ad_accounts(integration_id);

-- ============================================================
-- Table: campaign_metrics (partitioned by date)
-- ============================================================
CREATE TABLE campaign_metrics (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  ad_account_id   UUID NOT NULL REFERENCES ad_accounts(id),
  date            DATE NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'shopify')),
  campaign_id     TEXT NOT NULL,
  campaign_name   TEXT,
  spend           NUMERIC(14, 4) NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  conversions     BIGINT NOT NULL DEFAULT 0,
  revenue         NUMERIC(14, 4) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, date),
  UNIQUE (org_id, ad_account_id, campaign_id, date)
) PARTITION BY RANGE (date);

-- Quarterly partitions 2026
CREATE TABLE campaign_metrics_2026_q1 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE campaign_metrics_2026_q2 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE campaign_metrics_2026_q3 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE campaign_metrics_2026_q4 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Quarterly partitions 2027
CREATE TABLE campaign_metrics_2027_q1 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE campaign_metrics_2027_q2 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');
CREATE TABLE campaign_metrics_2027_q3 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2027-07-01') TO ('2027-10-01');
CREATE TABLE campaign_metrics_2027_q4 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2027-10-01') TO ('2028-01-01');

-- Default partition for overflow (pre-2026 or post-2027 data)
CREATE TABLE campaign_metrics_default PARTITION OF campaign_metrics DEFAULT;

ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON campaign_metrics
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_campaign_metrics_org_date
  ON campaign_metrics(org_id, date DESC);
CREATE INDEX idx_campaign_metrics_ad_account_date
  ON campaign_metrics(ad_account_id, date DESC);

-- ============================================================
-- Table: sync_logs (immutable — no UPDATE/DELETE policies)
-- ============================================================
CREATE TABLE sync_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  integration_id  UUID NOT NULL REFERENCES integrations(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'success', 'failed')),
  records_written INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read" ON sync_logs
  FOR SELECT USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_sync_logs_org_id ON sync_logs(org_id);
CREATE INDEX idx_sync_logs_integration_id ON sync_logs(integration_id);
CREATE INDEX idx_sync_logs_created_at ON sync_logs(created_at DESC);
