-- ─────────────────────────────────────────────────────────────────────────
-- Phase 0 hardening — ai_usage_ledger
--
-- ADDITIVE table per AI_OPERATING_MODEL.md §12 ("Required Tables (Additive
-- Only)") and §7 ("LLM Cost Governance — AI usage tracking + AI budget
-- protection + operator-visible consumption metrics"). Continuation #40,
-- 2026-05-12.
--
-- PURPOSE:
--   Operation-type-classified credit-consumption ledger for the 3-tier AI
--   architecture defined in AI_OPERATING_MODEL.md §3:
--     - Tier 1 (stats + rules, no LLM)    → NOT ledger-recorded (no LLM cost)
--     - Tier 2 (scheduled daily digest)   → operation_type='daily_digest'
--     - Tier 3 (operator-triggered)       → operation_type matches surface
--
-- RELATIONSHIP TO ai_usage_logs (Phase 7 Sub-pass A1a, continuation #16):
--   ai_usage_logs   = per-call PROVIDER observability (model, tokens_in,
--                     tokens_out, latency) — currently writes cost_credits=0
--                     because cost-derivation is provider-coupled.
--   ai_usage_ledger = per-operation CLASSIFICATION substrate with operation_type
--                     + credit_cost — enables per-tier / per-op analytics
--                     ("how many daily digests did this org get this month?")
--                     that ai_usage_logs cannot answer.
--   Both coexist; NEITHER replaces the other. ai_usage_logs is the canonical
--   provider-observability substrate; ai_usage_ledger is the canonical
--   credit-classification substrate. Future analytics views may JOIN both;
--   no rewrite of either is implied.
--
-- WHY ADDITIVE:
--   AI_OPERATING_MODEL.md §13 line 612: "Existing canonical systems MUST NOT
--   be replaced." Adding operation_type to ai_usage_logs would mean modifying
--   the canonical Sub-pass A1a contract. A new sibling table preserves the
--   closed-slice invariant + the explicit operator-authorized table name
--   from AI_OPERATING_MODEL.md §12.
--
-- ORG ISOLATION:
--   - TEXT org_id REFERENCES organizations(org_id) — same pattern as
--     ai_decisions / ai_logs / ai_usage_logs.
--   - RLS policy uses auth.jwt()->>'org_id' predicate — verbatim same shape
--     as 20260502000001_ai_persistence.sql (ai_decisions / ai_logs).
--   - service_role bypasses RLS by design; policy is defense-in-depth.
--
-- HARD LOCK PRESERVATION:
--   - No canonical contract modified.
--   - No closed-slice schema touched.
--   - No production startup behavior changed.
--   - No destructive operations.
--   - Reversible via DROP TABLE (no FK from older tables).
--
-- DOWN-MIGRATION (manual, not auto-run):
--   DROP POLICY IF EXISTS "ai_usage_ledger_org_isolation" ON ai_usage_ledger;
--   DROP INDEX IF EXISTS idx_ai_usage_ledger_org_op;
--   DROP INDEX IF EXISTS idx_ai_usage_ledger_org_created;
--   DROP TABLE IF EXISTS ai_usage_ledger;
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL REFERENCES organizations(org_id),
  -- Operation-type taxonomy per AI_OPERATING_MODEL.md §3 (3-tier model)
  -- and §6 (Free vs Credit-Based Operations). The CHECK constraint locks
  -- the enum at the schema layer; new operation types REQUIRE an additive
  -- migration (intentional friction — prevents silent ledger pollution
  -- from typo'd or speculative operation types).
  operation_type  TEXT NOT NULL CHECK (operation_type IN (
    'ai_decision_generate',     -- Tier 3 — /ai/decisions/generate
    'ai_execute',                -- Tier 3 — /ai/execute
    'creative_copy',             -- Tier 3 — /creatives/generate (copy)
    'creative_image',            -- Tier 3 — /creatives/generate (image)
    'daily_digest',              -- Tier 2 — scheduled daily digest (reserved)
    'conversational_query',      -- Tier 3 — conversational AI (reserved)
    'strategic_recommendation'   -- Tier 3 — multi-step reasoning (reserved)
  )),
  -- Credit cost actually consumed (post-deduction). Zero is valid for
  -- LTD-plan orgs (BYOK; no platform credits consumed) — the row still
  -- records that the operation happened, just at zero cost. Per
  -- AI_OPERATING_MODEL.md §7: "LTD plans MUST use BYOK."
  credit_cost     INTEGER NOT NULL DEFAULT 0 CHECK (credit_cost >= 0),
  -- Optional FK to the ai_decisions row produced by this operation.
  -- NULL for creative_copy / creative_image (those write to
  -- creative_generations, not ai_decisions) and for any future operation
  -- that doesn't produce a canonical ai_decisions row.
  ai_decision_id  UUID REFERENCES ai_decisions(id),
  -- Outer HTTP request_id from tracingMiddleware (Phase 0). Joins to
  -- [req]/[err]/[exec]/[AI] correlator chain for full-stack debugging.
  request_id      TEXT,
  -- Free-form per-operation metadata (model, tokens, etc.). Schema-less
  -- by design — analytics views can extract whatever fields are useful
  -- without forcing column adds. Common keys: { model, tokens_in,
  -- tokens_out, plan_type, byok }.
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────
-- Primary access pattern: "show this org's recent AI usage" (Decision
-- Center analytics, billing-page consumption display, support triage).
CREATE INDEX idx_ai_usage_ledger_org_created
  ON ai_usage_ledger (org_id, created_at DESC);

-- Secondary access pattern: "how many daily_digest ops did this org get
-- this month?" — operator-visible per-tier analytics per
-- AI_OPERATING_MODEL.md §7 ("operator-visible consumption metrics").
CREATE INDEX idx_ai_usage_ledger_org_op
  ON ai_usage_ledger (org_id, operation_type, created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────
-- Same TEXT-predicate pattern as ai_decisions / ai_logs / ai_usage_logs
-- (auth.jwt()->>'org_id'). service_role bypasses; policy is defense-in-depth.
ALTER TABLE ai_usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_ledger_org_isolation" ON ai_usage_ledger
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

-- ─── Verification (informational, runs at apply time) ───────────────────
-- Confirms the table is reachable and RLS is enabled. No-op assertion;
-- migration would have failed earlier if either condition were false.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'ai_usage_ledger' AND relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'ai_usage_ledger created without RLS — refusing to proceed';
  END IF;
END $$;
