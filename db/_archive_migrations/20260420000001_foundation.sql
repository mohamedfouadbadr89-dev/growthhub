-- Phase 1 Foundation: organizations, users, subscriptions, audit_logs
-- All tables have RLS enabled and org_id for multi-tenant isolation.

-- ============================================================
-- organizations
-- ============================================================
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  plan_type   TEXT NOT NULL DEFAULT 'subscription'
                CHECK (plan_type IN ('subscription', 'ltd')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON organizations
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL REFERENCES organizations(org_id),
  clerk_id    TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'admin'
                CHECK (role IN ('admin', 'member')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON users
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_clerk_id ON users(clerk_id);

-- ============================================================
-- subscriptions
-- ============================================================
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              TEXT NOT NULL REFERENCES organizations(org_id),
  plan_type           TEXT NOT NULL DEFAULT 'subscription'
                        CHECK (plan_type IN ('subscription', 'ltd')),
  status              TEXT NOT NULL DEFAULT 'trialing'
                        CHECK (status IN ('trialing', 'active', 'canceled', 'past_due')),
  stripe_customer_id  TEXT,
  stripe_sub_id       TEXT,
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON subscriptions
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);

-- ============================================================
-- audit_logs  (immutable — no UPDATE/DELETE policies)
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL,
  actor_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  resource    TEXT,
  resource_id TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- org members can read their own audit logs; no UPDATE/DELETE policies by design
CREATE POLICY "org_read" ON audit_logs
  FOR SELECT USING (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
