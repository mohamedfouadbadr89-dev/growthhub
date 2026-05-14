-- ─────────────────────────────────────────────────────────────────────────
-- Phase 0 hardening — org_ai_limits (per-org per-op-type daily-cap override)
--
-- ADDITIVE table per AI_OPERATING_MODEL.md §12 ("Required Tables (Additive
-- Only) — org_ai_limits"). Continuation #42, 2026-05-12. Sibling-batched
-- with `GET /api/v1/billing/usage` endpoint and rate-limit response
-- headers — same priority cluster (operator: 3. Per-org AI limits +
-- 4. Rate limiting + AI usage enforcement).
--
-- PURPOSE:
--   Per-org override substrate for the daily cap enforced by
--   `backend/src/services/ai/budget-enforcer.ts` (continuation #41).
--   The enforcer's effective-limit resolution chain becomes:
--
--     1. org_ai_limits row for (org_id, operation_type)
--     2. env var AI_DAILY_LIMIT_<UPPER_OP_TYPE>
--     3. DAILY_LIMIT_DEFAULTS code constant
--
--   Each layer is operator-controlled: (1) operator INSERT/UPDATE via
--   ops tooling; (2) operator deploy-config; (3) code constant subject
--   to operator-authored migration. Claude does NOT invent per-plan
--   tiering — per AI_OPERATING_MODEL.md §13 line 530 ("per-plan AI
--   budgets" require explicit operator decision) the write API for
--   this table is intentionally NOT shipped this turn. The table +
--   read-side helper land; the write surface awaits operator decision
--   on per-plan default semantics (admin tool? per-plan automatic seed?
--   manual ops console?).
--
-- WHY ADDITIVE:
--   §13 line 612 "Existing canonical systems MUST NOT be replaced."
--   Substrate-only ship; existing budget-enforcer + ai_usage_ledger +
--   organizations.plan_type all preserved verbatim.
--
-- RELATIONSHIP TO ai_usage_ledger (continuation #40):
--   ai_usage_ledger = "what AI operations happened" (audit + analytics)
--   org_ai_limits   = "what limits apply to which org" (policy override)
--
--   The enforcer reads BOTH: it counts current usage from the ledger
--   and compares against the limit from this table (or fallback chain).
--
-- ORG ISOLATION:
--   - TEXT org_id REFERENCES organizations(org_id) — same pattern as
--     ai_decisions / ai_logs / ai_usage_logs / ai_usage_ledger.
--   - RLS policy uses auth.jwt()->>'org_id' — verbatim parity with the
--     other AI-substrate tables.
--   - service_role bypasses RLS by design; policy is defense-in-depth.
--
-- UNIQUENESS:
--   - (org_id, operation_type) UNIQUE — exactly one override per org
--     per op type. Operator UPDATE to change a limit; INSERT for first-
--     time override; DELETE to revert to env/default fallback.
--
-- HARD LOCK PRESERVATION:
--   - No canonical contract modified.
--   - No existing migration touched.
--   - No production startup behavior change (enforcer reads optional
--     row; missing table = lookup error = fail-open per #41 semantics).
--   - Reversible via DROP TABLE.
--
-- DOWN-MIGRATION (manual, not auto-run):
--   DROP POLICY IF EXISTS "org_ai_limits_org_isolation" ON org_ai_limits;
--   DROP INDEX IF EXISTS idx_org_ai_limits_org_op;
--   DROP TABLE IF EXISTS org_ai_limits;
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_ai_limits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL REFERENCES organizations(org_id),
  -- Operation type subset that this row overrides. MUST match the same
  -- enum used by ai_usage_ledger.operation_type. Enforced at the
  -- migration level (CHECK constraint) for symmetry; budget-enforcer.ts
  -- type-system narrowing AIUsageOperationType remains the runtime gate.
  operation_type  TEXT NOT NULL CHECK (operation_type IN (
    'ai_decision_generate',
    'ai_execute',
    'creative_copy',
    'creative_image',
    'daily_digest',
    'conversational_query',
    'strategic_recommendation'
  )),
  -- Effective daily cap for (org_id, operation_type). NULL is NOT
  -- allowed: an override row's existence is the signal that the org has
  -- a non-default policy. To revert to env/default fallback, DELETE the
  -- row rather than NULL the limit.
  --
  -- Zero is intentionally allowed and meaningful: an explicit "0 daily
  -- limit" effectively disables the operation for the org (useful for
  -- temporary suspension / abuse mitigation / quota exhaustion at the
  -- billing layer).
  daily_limit     INTEGER NOT NULL CHECK (daily_limit >= 0),
  -- Free-form operator-visible note. Schema-less by design; not used by
  -- enforcer. Example uses: ticket reference, customer-success rationale,
  -- emergency-suspension reason.
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_ai_limits_unique_per_op UNIQUE (org_id, operation_type)
);

-- ─── Indexes ────────────────────────────────────────────────────────────
-- Primary access pattern: budget-enforcer.ts looks up the row by
-- (org_id, operation_type). The UNIQUE constraint above already creates
-- a btree index covering this exact lookup; no additional index needed.
-- Adding (org_id) index for "list all overrides for this org" admin
-- queries.
CREATE INDEX idx_org_ai_limits_org
  ON org_ai_limits (org_id);

-- ─── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE org_ai_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_ai_limits_org_isolation" ON org_ai_limits
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

-- ─── updated_at trigger ─────────────────────────────────────────────────
-- Auto-maintain updated_at on UPDATE so operator UPDATEs leave a
-- timestamp without requiring every UPDATE call site to remember.
CREATE OR REPLACE FUNCTION org_ai_limits_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_ai_limits_updated_at_trigger
  BEFORE UPDATE ON org_ai_limits
  FOR EACH ROW
  EXECUTE FUNCTION org_ai_limits_set_updated_at();

-- ─── Verification (informational, runs at apply time) ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'org_ai_limits' AND relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'org_ai_limits created without RLS — refusing to proceed';
  END IF;
END $$;
