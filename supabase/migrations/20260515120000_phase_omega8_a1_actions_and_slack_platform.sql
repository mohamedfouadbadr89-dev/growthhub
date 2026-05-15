-- ===========================================================================
-- 20260515120000_phase_omega8_a1_actions_and_slack_platform.sql
-- Phase Ω.8A.1 — Action Ecosystem Expansion · Bundle A.1 (Slack + Email digest)
-- ===========================================================================
-- Scope (per ACTION_ECOSYSTEM_PLAN.md §3 Sub-pass A.4 + operator authorization
-- 2026-05-15): add the two communication-channel action handlers
-- `slack.post_message` and `email.send_digest` to the canonical catalog.
-- Both are Tier-1 internal-notify operations (OPERATIONS_TAXONOMY.md §2.4) —
-- no spend impact, no approval gate, default LIVE flag OFF.
--
-- This migration is purely additive:
--   1. integrations.provider_secret_id  — new NULLABLE column. Holds the
--      Vault secret id of a NON-OAuth platform credential (Slack incoming
--      webhook URL). Distinct from vault_refresh_token_secret_id which holds
--      OAuth refresh tokens. A given integrations row populates EXACTLY ONE
--      of the two credential columns; enforced at the handler layer by
--      backend/src/services/integrations/shape-registry.ts assertCredentialShape().
--   2. integrations.platform CHECK     — extended to allow 'slack'. Slack is
--      a connectable provider whose credential is a per-org incoming webhook
--      URL (NOT an OAuth refresh token), so it needs an integrations row.
--   3. actions_library.platform CHECK  — extended to allow 'slack' and
--      'email'. Required for the two seed INSERTs below to satisfy the
--      column constraint. 'email' is a logical platform id (no per-org
--      integrations row — Resend is a system-wide RESEND_API_KEY), mirroring
--      how 'send_alert_email' was seeded under platform='meta' previously;
--      Phase Ω.8 corrects that drift by giving email its own platform id.
--   4. Two new rows in actions_library  — see the §14.1 6-field governance
--      comment block preceding each INSERT.
--
-- NO new tables. NO RLS changes (actions_library keeps its system-global
-- authenticated-read policy; integrations keeps its org-isolation policy).
-- NO data migration. NO FK additions. NO index changes.
--
-- Deferred-evolution note — integrations.platform CHECK:
--   The platform CHECK enum grows one provider at a time, each behind an
--   explicit migration. Adding 'slack' here does NOT pre-authorize tiktok /
--   linkedin / etc.; each future provider extends the enum in its own
--   Phase Ω.8 sub-pass migration. The CHECK is intentionally a closed enum,
--   not an open TEXT column, so an unconnectable platform string can never
--   land an integrations row.
--
-- Reversal:
--   DELETE FROM actions_library
--    WHERE (platform, action_type) IN
--          (('slack','post_message'), ('email','send_digest'));
--   ALTER TABLE actions_library DROP CONSTRAINT IF EXISTS actions_library_platform_check;
--   ALTER TABLE actions_library ADD  CONSTRAINT actions_library_platform_check
--     CHECK (platform IN ('meta','google','shopify'));
--   ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_platform_check;
--   ALTER TABLE integrations ADD  CONSTRAINT integrations_platform_check
--     CHECK (platform IN ('meta','google','shopify'));
--   ALTER TABLE integrations DROP COLUMN IF EXISTS provider_secret_id;
--   (Reversal requires zero 'slack' integrations rows to exist.)
--
-- Real-mode handlers (Slack incoming-webhook POST + Resend digest send) are
-- gated behind SLACK_POST_MESSAGE_LIVE / EMAIL_SEND_DIGEST_LIVE env flags
-- (default false → simulated). The ACTION_HANDLERS entries return simulated
-- success when the flags are OFF, matching the established
-- pause_campaign / send_alert_email simulated-fallthrough pattern.
-- ===========================================================================

-- ── 1. integrations.provider_secret_id ─────────────────────────────────────
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS provider_secret_id UUID;

COMMENT ON COLUMN integrations.provider_secret_id IS
  'Supabase Vault secret id for a NON-OAuth per-org platform credential '
  '(e.g. a Slack incoming-webhook URL). Mutually exclusive with '
  'vault_refresh_token_secret_id: OAuth providers (meta/google/shopify) '
  'populate vault_refresh_token_secret_id and leave this NULL; webhook/'
  'API-key providers (slack) populate this and leave '
  'vault_refresh_token_secret_id NULL. The single-credential-column '
  'invariant is enforced per-request by shape-registry.ts '
  'assertCredentialShape() before any handler resolves the secret. '
  'NULLABLE — most integrations rows leave it NULL.';

-- ── 2. integrations.platform CHECK — add 'slack' ───────────────────────────
ALTER TABLE integrations
  DROP CONSTRAINT IF EXISTS integrations_platform_check;
ALTER TABLE integrations
  ADD  CONSTRAINT integrations_platform_check
  CHECK (platform IN ('meta', 'google', 'shopify', 'slack'));

-- ── 3. actions_library.platform CHECK — add 'slack' + 'email' ──────────────
ALTER TABLE actions_library
  DROP CONSTRAINT IF EXISTS actions_library_platform_check;
ALTER TABLE actions_library
  ADD  CONSTRAINT actions_library_platform_check
  CHECK (platform IN ('meta', 'google', 'shopify', 'slack', 'email'));

-- ── 4. Seed actions_library rows ───────────────────────────────────────────
-- ACTION_RUNTIME_RULES.md §14.1 — 6-field governance block (one per row).
--
-- slug:                 slack.post_message
-- operation category:   Notify (OPERATIONS_TAXONOMY.md §2.4)
-- spend-risk tier:      1 — Internal-only (ACTION_RUNTIME_RULES.md §11)
-- approval gate:        NONE — tier 1 is not in
--                       SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES
-- LIVE flag:            SLACK_POST_MESSAGE_LIVE (default false → simulated)
-- execution-safety:     best-effort (ACTION_RUNTIME_RULES.md §12) — a failed
--                       Slack post is logged + audited 'failed' but never
--                       halts a caller; the destination channel is bound by
--                       the per-org incoming-webhook URL chosen at connect time.
INSERT INTO actions_library (platform, action_type, name, description, parameter_schema) VALUES
  ('slack', 'post_message',
   'Post Slack Message',
   'Post a message to your team''s connected Slack channel via incoming webhook.',
   '{"fields":[
       {"name":"message","type":"string","required":true,"label":"Message"},
       {"name":"title","type":"string","required":false,"label":"Title"}
     ]}'::jsonb)
ON CONFLICT (platform, action_type) DO NOTHING;

-- slug:                 email.send_digest
-- operation category:   Notify (OPERATIONS_TAXONOMY.md §2.4 — planned internal)
-- spend-risk tier:      1 — Internal-only (ACTION_RUNTIME_RULES.md §11)
-- approval gate:        NONE — tier 1 is not in
--                       SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES
-- LIVE flag:            EMAIL_SEND_DIGEST_LIVE (default false → simulated)
-- execution-safety:     best-effort (ACTION_RUNTIME_RULES.md §12) — recipients
--                       are computed server-side from users.role='admin';
--                       the structured digest is run through the deterministic
--                       normalizeForEmail() pipeline before send.
INSERT INTO actions_library (platform, action_type, name, description, parameter_schema) VALUES
  ('email', 'send_digest',
   'Send Email Digest',
   'Send a formatted plain-text digest email to your organization admins.',
   '{"fields":[
       {"name":"subject","type":"string","required":true,"label":"Subject"},
       {"name":"digest","type":"object","required":true,"label":"Digest"}
     ]}'::jsonb)
ON CONFLICT (platform, action_type) DO NOTHING;
