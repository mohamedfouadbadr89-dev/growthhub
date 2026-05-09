-- ===========================================================================
-- 20260508120000_phase6_create_campaign_templates.sql
-- Phase 6 (Campaigns) Sub-pass A — additive seed
-- ===========================================================================
-- Scope (per SYSTEM_CONTROL execution authorization 2026-05-08, continuation #11):
--   Seed two `actions_library` rows so `pushCampaign` (services/campaigns/
--   campaigns.ts) can resolve the create-campaign template by natural key
--   instead of the prior fictional hardcoded UUIDs
--   ('00000000-0000-0000-0000-000000000009',
--    '00000000-0000-0000-0000-000000000010') which were never seeded — every
--   POST /api/v1/campaigns/:id/push attempt 404'd on template lookup.
--
-- This migration is purely additive:
--   - 2 new rows in `actions_library` (no schema/column changes)
--   - Idempotent via existing UNIQUE (platform, action_type) constraint from
--     20260503130000_phase4_minimal_execution_layer.sql:35
--   - No fixed UUIDs — gen_random_uuid() default applies; service code
--     resolves by (platform, action_type) natural key
--   - No RLS changes — actions_library is system-global with the existing
--     authenticated-read policy
--   - No FK additions, no constraints, no indexes
--
-- Reversal:
--   DELETE FROM actions_library
--    WHERE platform IN ('meta', 'google') AND action_type = 'create_campaign';
--
-- Real-mode handlers (Meta Ads CREATE + Google Ads CREATE platform calls)
-- are DEFERRED to a later pass per operator-authorized deferral criteria
-- (external-write risk, provider complexity, startup-env coupling, surface
-- expansion). The action-executor.ts ACTION_HANDLERS entry added in this
-- pass returns simulated success only — matching the established
-- pause_campaign/increase_budget/decrease_budget simulated-fallthrough
-- pattern.
-- ===========================================================================

INSERT INTO actions_library (platform, action_type, name, description, parameter_schema) VALUES
  ('meta', 'create_campaign',
   'Create Meta Campaign',
   'Create a new Meta Ads campaign from a draft record.',
   '{"fields":[
       {"name":"campaign_name","type":"string","required":true,"label":"Campaign Name"},
       {"name":"daily_budget","type":"number","required":false,"label":"Daily Budget"},
       {"name":"targeting","type":"object","required":false,"label":"Targeting"}
     ]}'::jsonb),
  ('google', 'create_campaign',
   'Create Google Campaign',
   'Create a new Google Ads campaign from a draft record.',
   '{"fields":[
       {"name":"campaign_name","type":"string","required":true,"label":"Campaign Name"},
       {"name":"daily_budget","type":"number","required":false,"label":"Daily Budget"},
       {"name":"targeting","type":"object","required":false,"label":"Targeting"}
     ]}'::jsonb)
ON CONFLICT (platform, action_type) DO NOTHING;
