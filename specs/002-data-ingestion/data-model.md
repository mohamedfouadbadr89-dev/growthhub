# Data Model: Phase 2 — Data Ingestion

## Entity: integrations

Represents a single authorized connection between an Organization and an
external ad platform. Unique per `(org_id, platform)` — one active connection
per platform per org.

```sql
CREATE TABLE integrations (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        TEXT NOT NULL REFERENCES organizations(org_id),
  platform                      TEXT NOT NULL
                                  CHECK (platform IN ('meta', 'google', 'shopify')),
  status                        TEXT NOT NULL DEFAULT 'connected'
                                  CHECK (status IN ('connected', 'disconnected', 'error')),
  vault_refresh_token_secret_id UUID,         -- Supabase Vault secret ID (encrypted token)
  last_synced_at                TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform)     -- FR-008: prevent duplicate per platform per org
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON integrations
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_integrations_org_id ON integrations(org_id);
```

**Notes**:
- `vault_refresh_token_secret_id` references a Supabase Vault secret. The backend
  reads the actual token via `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = vault_refresh_token_secret_id`.
- On disconnect, `status` is set to `'disconnected'`; the Vault secret is deleted.
  Historical synced data is preserved.
- For Meta/Google, the token is an OAuth2 refresh token. For Shopify, it is a
  permanent access token (Shopify access tokens don't expire).

---

## Entity: ad_accounts

An advertising account discovered from a connected integration. One integration
may expose multiple ad accounts (e.g., a Google Ads MCC manager account).

```sql
CREATE TABLE ad_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                TEXT NOT NULL REFERENCES organizations(org_id),
  integration_id        UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  platform_account_id   TEXT NOT NULL,   -- e.g. "act_123456789" (Meta), "1234567890" (Google)
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
```

**Notes**:
- Discovered during the first sync after connection. If the user has multiple ad
  accounts on one platform, all are stored.
- `ON DELETE CASCADE` ensures ad_accounts are removed if the parent integration
  is deleted.
- Shopify does not have ad accounts; a single pseudo-account row is created per
  Shopify integration to maintain the consistent data model.

---

## Entity: campaign_metrics

Daily performance snapshot per campaign per ad account. Partitioned by `date`
(quarterly) to keep query performance fast as data accumulates.

```sql
CREATE TABLE campaign_metrics (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  ad_account_id   UUID NOT NULL REFERENCES ad_accounts(id),
  date            DATE NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'shopify')),
  campaign_id     TEXT NOT NULL,   -- platform-native campaign/product ID
  campaign_name   TEXT,
  spend           NUMERIC(14, 4) NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  conversions     BIGINT NOT NULL DEFAULT 0,
  revenue         NUMERIC(14, 4) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, date),          -- partition key must be in PK
  UNIQUE (org_id, ad_account_id, campaign_id, date)  -- FR-006: prevent duplication per sync
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

-- Default partition for overflow (pre-2026 backfill, post-2027 data)
CREATE TABLE campaign_metrics_default PARTITION OF campaign_metrics DEFAULT;

ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;

-- RLS on parent applies to all partitions (PostgreSQL 10+)
CREATE POLICY "org_isolation" ON campaign_metrics
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_campaign_metrics_org_date
  ON campaign_metrics(org_id, date DESC);
CREATE INDEX idx_campaign_metrics_ad_account_date
  ON campaign_metrics(ad_account_id, date DESC);
```

**Notes**:
- `UNIQUE (org_id, ad_account_id, campaign_id, date)` enforces SC-006: re-running
  a sync for the same date produces identical records (upsert, not insert).
  Use `INSERT … ON CONFLICT DO UPDATE` for idempotent sync writes.
- For Shopify: `campaign_id` stores the Shopify order ID; `revenue` = `totalPriceSet`;
  `spend`, `impressions`, `clicks`, `conversions` default to 0.
- For Google Ads: `spend` = `cost_micros / 1_000_000`.
- Historical backfill on first connect covers the previous 30 days.

---

## Entity: sync_logs

Immutable record of every sync attempt. Never updated or deleted.

```sql
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

-- Org members can read their own sync history; backend inserts via service_role
CREATE POLICY "org_read" ON sync_logs
  FOR SELECT USING (org_id = auth.jwt()->>'org_id');

-- No UPDATE or DELETE policies — immutable by design (FR-011)

CREATE INDEX idx_sync_logs_org_id ON sync_logs(org_id);
CREATE INDEX idx_sync_logs_integration_id ON sync_logs(integration_id);
CREATE INDEX idx_sync_logs_created_at ON sync_logs(created_at DESC);
```

**Notes**:
- Created with `status = 'in_progress'` at job start. The Inngest job updates it
  to `'success'` or `'failed'` on completion (backend only, via `service_role_key`).
- `records_written` counts campaign_metrics rows inserted/upserted in this sync.
- `error_message` populated on failure; surfaced to the user on the Integrations page.
- No `org_id` FK constraint — mirrors `audit_logs` pattern; allows logging even if
  the org record is in a transitional state.

---

## Relationships

```
organizations (org_id)
  └── integrations (org_id → org_id)
        ├── ad_accounts (integration_id → id, org_id → org_id)
        │     └── campaign_metrics (ad_account_id → id, org_id)
        └── sync_logs (integration_id → id, org_id)
```

## RLS Verification Checklist (per constitution)

After applying the migration, verify:
- [ ] `SELECT * FROM integrations` as anon role → 0 rows
- [ ] `SELECT * FROM ad_accounts` as anon role → 0 rows
- [ ] `SELECT * FROM campaign_metrics` as anon role → 0 rows
- [ ] `SELECT * FROM sync_logs` as anon role → 0 rows
- [ ] JWT with `org_id = 'org_A'` cannot read rows where `org_id = 'org_B'` across all 4 tables
- [ ] `service_role_key` can INSERT into all tables (backend sync requirement)
- [ ] `UPSERT` on `campaign_metrics` with same `(org_id, ad_account_id, campaign_id, date)` produces exactly 1 row
