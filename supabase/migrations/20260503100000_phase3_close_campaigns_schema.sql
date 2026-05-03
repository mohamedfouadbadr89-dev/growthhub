-- ===========================================================================
-- 20260503100000_phase3_close_campaigns_schema.sql
-- Phase 3 close-out: align campaigns schema with backend service code.
-- ===========================================================================
-- Problem (verified live): the live `campaigns` table only had
--   (id uuid, name text, status text, created_at timestamp without time zone)
-- but backend/src/services/campaigns/campaigns.ts queries and writes:
--   org_id, name, platform, status, daily_budget, targeting, ad_account_id,
--   platform_campaign_id, ai_suggestions, created_at (with tz), updated_at
-- AND filters by org_id. Missing org_id raised 42703, propagated through the
-- supabase-js client as a rejected promise, escaped Hono's onError on at
-- least one path, and triggered backend/src/index.ts process.exit(1) via the
-- unhandledRejection handler — taking the server down between AI calls.
--
-- Constitutional compliance enforced here:
--   - org_id NOT NULL with FK to organizations(org_id)  (CONSTITUTION §1.2)
--   - Row Level Security ENABLED                        (CONSTITUTION §1.5)
--   - org_id-scoped policy                              (CLAUDE.md §3 isolation)
--
-- Safety: campaigns is empty (0 rows verified pre-migration). DROP CASCADE
-- removes only the broken table and any of its own dependents. ai_decisions /
-- ai_logs / users / organizations are untouched.
-- ===========================================================================

DROP TABLE IF EXISTS campaigns CASCADE;

CREATE TABLE campaigns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               TEXT NOT NULL REFERENCES organizations(org_id),
  name                 TEXT NOT NULL,
  platform             TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'shopify')),
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','active','paused','completed','archived')),
  daily_budget         NUMERIC,
  targeting            JSONB NOT NULL DEFAULT '{}'::jsonb,
  ad_account_id        UUID,
  platform_campaign_id TEXT,
  ai_suggestions       JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name, platform)
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_org_isolation" ON campaigns
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_campaigns_org_status  ON campaigns(org_id, status);
CREATE INDEX idx_campaigns_org_created ON campaigns(org_id, created_at DESC);

-- Auto-update `updated_at` on row changes so backend code (which patches
-- status/budget/targeting/name without touching updated_at) still maintains
-- an accurate last-modified timestamp.
CREATE OR REPLACE FUNCTION set_updated_at_now() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();
