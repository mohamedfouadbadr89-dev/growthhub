-- ─────────────────────────────────────────────────────────────────────────
-- Phase 0 hardening — approval_queue (substrate-only)
--
-- ADDITIVE table per AI_OPERATING_MODEL.md §12 ("Required Tables (Additive
-- Only) — approval_queue") + operator priority #5 "Approval-queue substrate
-- preparation". Continuation #43, 2026-05-12.
--
-- ⚠️ SUBSTRATE-ONLY SHIP ⚠️
--
-- This migration ships the TABLE + RLS + indexes ONLY. It does NOT ship:
--   - any backend HTTP route (no /api/v1/approvals/* yet)
--   - any service-layer integration with execute-ai-decision.ts
--   - any consumer code that INSERTs rows
--   - any flow that READS rows
--   - any FE consumer
--   - any approval-state lifecycle logic
--   - any approval-threshold semantics
--
-- All of that lives behind §13 missing-semantics gates that explicitly
-- require operator decision:
--
--   §13 line 530–548 ("REQUIRE explicit semantics before implementation"):
--     - approval thresholds
--     - reversible vs irreversible actions
--     - spend-risk classification
--     - action severity scoring
--     - AI confidence escalation
--     - org-level automation permissions
--     - per-plan AI budgets         ← already preserved via #42 (org_ai_limits write API NOT shipped)
--     - operator override policies
--
--   §13 line 548: "Claude MUST NOT invent these semantics autonomously."
--
-- ⚠️ STATE OF THIS TABLE AT MIGRATION-APPLY TIME ⚠️
--
--   - 0 rows expected
--   - 0 writers exist anywhere in the codebase
--   - 0 readers exist anywhere in the codebase
--   - the table is INERT until operator authorizes the next layer
--
-- The migration exists so that:
--   (a) the schema is reserved in the canonical migration tree (per
--       AI_OPERATING_MODEL.md §12 explicit table-name authorization);
--   (b) future writers/readers land in additive continuations without
--       requiring a fresh schema decision under time pressure;
--   (c) operator may INSERT rows manually via SQL/ops tooling to seed
--       the queue with synthetic-test approvals if desired before any
--       application-layer flow exists.
--
-- ─────────────────────────────────────────────────────────────────────────
-- SCHEMA DESIGN — WHY THESE COLUMNS
--
-- The shape captures the minimum that AI_OPERATING_MODEL.md §8 (Decision
-- Center Philosophy) already specifies — operators MUST be able to:
--   - approve
--   - reject
--   - edit
--   - inspect reasoning
--   - inspect confidence
--   - inspect action previews
--
-- so the table needs to reference the upstream ai_decision (reasoning +
-- confidence already live on `ai_decisions`) AND carry the proposed action
-- envelope (action_template_id + action_params) so the operator can preview
-- before approving. State enum carries the lifecycle. Everything else
-- (thresholds / classifications / per-plan rules) is operator-decision
-- and intentionally NOT modeled here.
--
-- The action_template_id FK points at actions_library; the same FK shape
-- as automation_runs.action_template_id (NOT NULL there; NULL allowed
-- here because not every approval-required action requires a template
-- — future Tier 3 conversational AI may produce free-form approval items).
-- ─────────────────────────────────────────────────────────────────────────
-- DOWN-MIGRATION (manual, not auto-run):
--   DROP POLICY IF EXISTS "approval_queue_org_isolation" ON approval_queue;
--   DROP INDEX IF EXISTS idx_approval_queue_org_state_created;
--   DROP INDEX IF EXISTS idx_approval_queue_org_ai_decision;
--   DROP TRIGGER IF EXISTS approval_queue_updated_at_trigger ON approval_queue;
--   DROP FUNCTION IF EXISTS approval_queue_set_updated_at();
--   DROP TABLE IF EXISTS approval_queue;
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approval_queue (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             TEXT NOT NULL REFERENCES organizations(org_id),
  -- The AI decision that produced this approval-required item. Always
  -- present — every approval row originates from a canonical ai_decisions
  -- row (operator-visible reasoning + confidence already live there).
  -- NOT NULL because every approval needs an upstream cause; "manual
  -- operator approvals without ai_decisions" is out of scope for v1
  -- substrate and would require operator decision on semantics.
  ai_decision_id     UUID NOT NULL REFERENCES ai_decisions(id),
  -- Proposed action template (actions_library row). NULL allowed because
  -- not every approval-required item maps to a template — future Tier 3
  -- conversational outputs may produce approval items without a discrete
  -- action template (e.g., "do you want me to draft this email" — copy
  -- preview only). For Tier 1/Tier 4 auto-fire candidates this will be
  -- populated.
  action_template_id UUID REFERENCES actions_library(id),
  -- Proposed action parameters. The operator inspects this before
  -- approving; the engine consumes this on dispatch if approved. JSONB
  -- because action_params shape is per-action-template (matches existing
  -- automation_rules.action_params + decision_history convention).
  -- DEFAULT '{}' so a NULL never leaks into action-executor dispatch.
  action_params      JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Lifecycle state. The enum is intentionally minimal — operator
  -- transitions are authoritative per §8 (approve / reject / edit). The
  -- 'expired' state is reserved for a future TTL job (not implemented in
  -- this substrate ship). 'executed' lands the row in terminal state
  -- after the engine dispatches the approved action.
  state              TEXT NOT NULL DEFAULT 'pending' CHECK (state IN (
    'pending',
    'approved',
    'rejected',
    'expired',
    'executed'
  )),
  -- Free-form operator note attached at approve/reject time. Substrate
  -- only — no enforcement of when/how it gets populated. NULL allowed.
  operator_note      TEXT,
  -- Clerk user_id of the operator who transitioned the state. NULL
  -- while state='pending' (no operator action yet). Populated when
  -- state transitions away from 'pending'. Persistence-only; no FK to
  -- organizations.users since that table relationship lives in Clerk.
  operator_user_id   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────
-- Primary access pattern for the FUTURE Decision Center FE consumer:
-- "show me this org's pending approvals, newest first." Covered by a
-- composite (org_id, state, created_at DESC) — efficient even when the
-- queue grows.
CREATE INDEX idx_approval_queue_org_state_created
  ON approval_queue (org_id, state, created_at DESC);

-- Secondary access pattern: lookup by ai_decision_id (e.g., did this
-- decision already produce an approval row? avoid duplicate-enqueue).
-- Org-scoped to keep the index narrow.
CREATE INDEX idx_approval_queue_org_ai_decision
  ON approval_queue (org_id, ai_decision_id);

-- ─── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_queue_org_isolation" ON approval_queue
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

-- ─── updated_at trigger ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION approval_queue_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_queue_updated_at_trigger
  BEFORE UPDATE ON approval_queue
  FOR EACH ROW
  EXECUTE FUNCTION approval_queue_set_updated_at();

-- ─── Verification (informational, runs at apply time) ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'approval_queue' AND relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'approval_queue created without RLS — refusing to proceed';
  END IF;
END $$;
