# Data Model: Phase 1 — Foundation

## Entity: organizations

Primary tenant unit. Created automatically when a user signs up.

```sql
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL UNIQUE,  -- Clerk Organization ID (e.g. "org_xxx")
  name        TEXT NOT NULL,
  plan_type   TEXT NOT NULL DEFAULT 'subscription'
                CHECK (plan_type IN ('subscription', 'ltd')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON organizations
  FOR ALL USING (org_id = auth.jwt()->>'org_id');
```

**Notes**:
- `org_id` is the Clerk Organization ID string, used as the tenant key
  across all tables and JWT claims.
- `plan_type` seeded as `subscription` for all new sign-ups; updated to
  `ltd` during AppSumo redemption flow (Phase 7).

---

## Entity: users

Represents an authenticated user scoped to their Organization.

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL REFERENCES organizations(org_id),
  clerk_id    TEXT NOT NULL UNIQUE,  -- Clerk User ID (e.g. "user_xxx")
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
```

**Notes**:
- `clerk_id` is the Clerk User ID used to look up the user in webhook handlers.
- Phase 1 always sets `role = 'admin'` since each org has one founding member.
  Team member invites (Phase 7) will create `role = 'member'` records.

---

## Entity: subscriptions

Tracks billing plan and status per Organization.

```sql
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
```

**Notes**:
- Created with `status = 'trialing'` on sign-up. Stripe fields populated
  in Phase 7 when billing is wired up.
- `byok_openrouter_key` for LTD users is stored in Supabase Vault (not this
  table) — accessed via `vault.decrypted_secrets` from the backend only.

---

## Entity: audit_logs

Immutable record of all sensitive operations. Never updated or deleted.

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL,
  actor_id    TEXT NOT NULL,   -- clerk_id of the user who performed the action
  action      TEXT NOT NULL,   -- e.g. "user.created", "org.created", "auth.token_rejected"
  resource    TEXT,            -- e.g. "users", "organizations"
  resource_id TEXT,            -- ID of the affected resource
  metadata    JSONB,           -- additional context (IP, user agent, diff, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs: org members can read their own org's logs; no one can update/delete
CREATE POLICY "org_read" ON audit_logs
  FOR SELECT USING (org_id = auth.jwt()->>'org_id');

-- Backend (service_role) can insert from Railway — bypasses RLS intentionally
-- No UPDATE or DELETE policies — immutable by design

CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

**Notes**:
- The backend (service_role_key) inserts records. Frontend can only read
  via the standard org-scoped RLS policy.
- No `org_id` FK constraint — allows logging events even when org creation
  is in progress (edge case protection).

---

## Relationships

```
organizations (org_id)
  ├── users (org_id → org_id)
  ├── subscriptions (org_id → org_id)
  └── audit_logs (org_id, no FK — immutable log)
```

## RLS Verification Checklist (per constitution)

After applying migrations, verify:
- [ ] `SELECT * FROM organizations` as anon role → 0 rows
- [ ] `SELECT * FROM users` as anon role → 0 rows
- [ ] `SELECT * FROM subscriptions` as anon role → 0 rows
- [ ] `SELECT * FROM audit_logs` as anon role → 0 rows
- [ ] JWT with `org_id = 'org_A'` cannot read rows where `org_id = 'org_B'`
- [ ] `service_role_key` can INSERT into all tables (backend requirement)
