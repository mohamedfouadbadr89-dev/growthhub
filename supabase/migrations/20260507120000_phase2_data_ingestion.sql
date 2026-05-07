-- =====================================================================
-- Phase 2 — Data Ingestion (canonical migration; authored 2026-05-07)
-- =====================================================================
-- Authority chain (in order):
--   1. specs/SYSTEM_CONTROL.md    → Phase 2 unlock prep authorized
--   2. specs/002-data-ingestion/data-model.md  → schema authority
--   3. specs/002-data-ingestion/contracts/backend-api.md  → API authority
--   4. Backend runtime code in:
--        backend/src/routes/v1/connect.ts
--        backend/src/routes/v1/integrations.ts
--        backend/src/routes/v1/metrics.ts
--        backend/src/services/sync/{meta,google,shopify,index}.ts
--        backend/src/jobs/inngest.ts
--        backend/src/lib/{vault,oauth-state}.ts
--      → runtime amendment authority (see "Runtime amendments" below)
--
-- NOT referenced (per CLAUDE.md MIGRATION SINGLE SOURCE OF TRUTH):
--   /db/_archive_migrations/* — archive only; never executed
--
-- Runtime amendments to data-model.md (overrides documentation per
-- governance rule "runtime evidence overrides documentation"):
--   - campaign_metrics adds `integration_id UUID REFERENCES integrations(id)`.
--     Backend code (sync/meta.ts:84, sync/google.ts:138, sync/shopify.ts:98,
--     connect.ts:183, jobs/inngest.ts:81) writes this column on every
--     sync upsert; migrating without it would produce 42703 undefined_column
--     on first sync.
--
-- Phase locks preserved:
--   - Phase 4 minimal slice (actions_library, decision_history): UNTOUCHED.
--   - Phase 3 (ai_decisions, ai_logs, campaigns): UNTOUCHED.
--   - Legacy `decisions` table: UNTOUCHED (governance-deprecated).
--
-- Architecture invariants preserved:
--   - org_id present on every table.
--   - RLS enabled on every table.
--   - service_role bypasses RLS by design (backend single writer).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. integrations
-- ---------------------------------------------------------------------
-- One authorized connection between an Organization and an external
-- platform. Unique per (org_id, platform). Credentials are stored in
-- Supabase Vault; this table holds only the secret reference id.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integrations (
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

CREATE POLICY "integrations_org_isolation" ON integrations
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations(org_id);


-- ---------------------------------------------------------------------
-- 2. ad_accounts
-- ---------------------------------------------------------------------
-- An advertising account discovered from a connected integration. One
-- integration may expose multiple ad accounts. Cascades on integration
-- delete (preserves historical data via campaign_metrics retention
-- which is org-scoped, not integration-scoped per spec FR-006).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              TEXT NOT NULL REFERENCES organizations(org_id),
  integration_id      UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  platform_account_id TEXT NOT NULL,
  name                TEXT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'USD',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, integration_id, platform_account_id)
);

ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_accounts_org_isolation" ON ad_accounts
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_ad_accounts_org_id          ON ad_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_integration_id  ON ad_accounts(integration_id);


-- ---------------------------------------------------------------------
-- 3. campaign_metrics  (PARTITIONED BY RANGE (date))
-- ---------------------------------------------------------------------
-- Daily performance snapshot per campaign per ad account. Quarterly
-- partitions for predictable maintenance + a default partition for
-- backfill / overflow.
--
-- Runtime amendment: integration_id column added per backend
-- sync/{meta,google,shopify}.ts upsert payloads. Spec data-model.md
-- did not include it; runtime evidence drives the amendment.
--
-- UNIQUE (org_id, ad_account_id, campaign_id, date) enforces SC-006:
-- re-running a sync for the same date produces identical records (the
-- backend uses INSERT … ON CONFLICT DO UPDATE for idempotent upserts).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  ad_account_id   UUID NOT NULL REFERENCES ad_accounts(id),
  integration_id  UUID REFERENCES integrations(id),
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

-- 2026 quarterly partitions
CREATE TABLE IF NOT EXISTS campaign_metrics_2026_q1 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS campaign_metrics_2026_q2 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS campaign_metrics_2026_q3 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS campaign_metrics_2026_q4 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- 2027 quarterly partitions
CREATE TABLE IF NOT EXISTS campaign_metrics_2027_q1 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS campaign_metrics_2027_q2 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');
CREATE TABLE IF NOT EXISTS campaign_metrics_2027_q3 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2027-07-01') TO ('2027-10-01');
CREATE TABLE IF NOT EXISTS campaign_metrics_2027_q4 PARTITION OF campaign_metrics
  FOR VALUES FROM ('2027-10-01') TO ('2028-01-01');

-- Default partition catches pre-2026 backfill or post-2027 overflow.
CREATE TABLE IF NOT EXISTS campaign_metrics_default PARTITION OF campaign_metrics DEFAULT;

ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;

-- RLS on parent applies to every partition (PostgreSQL 10+).
CREATE POLICY "campaign_metrics_org_isolation" ON campaign_metrics
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_org_date
  ON campaign_metrics(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_ad_account_date
  ON campaign_metrics(ad_account_id, date DESC);


-- ---------------------------------------------------------------------
-- 4. sync_logs
-- ---------------------------------------------------------------------
-- Immutable record of every sync attempt. Created with
-- status='in_progress' at job start; updated to 'success' or 'failed'
-- on completion via service_role (bypasses RLS for backend writers).
-- No UPDATE/DELETE policies — read-only for org members.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_logs (
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

CREATE POLICY "sync_logs_org_read" ON sync_logs
  FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_sync_logs_org_id          ON sync_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration_id  ON sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at      ON sync_logs(created_at DESC);


-- =====================================================================
-- End of Phase 2 — Data Ingestion canonical migration.
--
-- Post-migration verification (run in Supabase SQL editor or psql):
--   SELECT tablename FROM pg_tables
--    WHERE schemaname='public'
--      AND tablename IN ('integrations','ad_accounts','campaign_metrics','sync_logs');
--   -- expect 4 rows + the campaign_metrics_* partition rows.
--
--   SELECT polname, polrelid::regclass
--     FROM pg_policy
--    WHERE polrelid::regclass::text IN (
--      'integrations','ad_accounts','campaign_metrics','sync_logs'
--    );
--   -- expect 4 RLS policies.
--
-- Next governed steps (require subsequent authorization):
--   1. supabase db push — deploy this migration to the live project.
--   2. Lift the 503 gates on /integrations/* and /metrics/* in
--      backend/src/routes/v1/index.ts (only AFTER deploy verified).
--   3. Phase 4 Part 2 unlock becomes possible once per-org tokens flow
--      through executeAction (replacing the shared META_TEST_ACCESS_TOKEN).
-- =====================================================================
