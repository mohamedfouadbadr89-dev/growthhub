-- ===========================================================================
-- 20260508130000_phase7_a0_credits_substrate.sql
-- Phase 7 Sub-pass A0 — minimal monetization runtime substrate
-- ===========================================================================
-- Scope (per SYSTEM_CONTROL execution authorization 2026-05-08, continuation #14):
--   Close the Phase 5 ↔ Phase 7 silent runtime drift by introducing the
--   credits-runtime substrate that `routes/v1/creatives.ts:POST /generate`
--   and `services/creatives/creative-generator.ts` already reference but
--   that does NOT exist in the live database.
--
--   Specifically:
--     - creatives.ts:86      → supabaseAdmin.rpc('deduct_credits',  ...)
--     - creatives.ts:121,148 → supabaseAdmin.rpc('refund_credits',  ...)
--     - creative-generator.ts:208 → supabaseAdmin.rpc('refund_credits', ...)
--
--   Pre-this-migration: every non-LTD org (default plan_type='subscription')
--   hitting POST /creatives/generate triggered:
--     "function deduct_credits(...) does not exist" (Postgres 42883)
--   silently breaking the active hardened Phase 5 surface.
--
--   This migration makes the substrate exist. ZERO backend code changes;
--   the route/service code already calls these RPCs verbatim. Once deployed
--   the call sites resolve to live functions and the active surface
--   becomes operational for default-plan orgs.
--
-- Strict scope (operator-authorized, minimal-diff):
--   1. organizations.credits_balance INTEGER column (NOT NULL DEFAULT 0,
--      CHECK >= 0) — additive on existing closed-phase table; safe per
--      Phase 5 precedent (Phase 5 added plan_type + vault_byok_* same way)
--   2. ai_usage_logs table (per Phases.md §Phase 7 NEW: "Add: ai_usage_logs,
--      cost_per_call") — RLS by org_id; FK to organizations
--   3. credits_ledger table — immutable audit trail of every credits
--      delta (deduct/refund/grant); RLS by org_id; FK to organizations
--   4. deduct_credits(p_org_id TEXT, p_amount INTEGER) RETURNS INTEGER
--      — atomic conditional UPDATE; returns new balance OR -1 if insufficient.
--      Matches the existing route caller contract (line 90: "if newBalance < 0").
--   5. refund_credits(p_org_id TEXT, p_amount INTEGER) RETURNS INTEGER
--      — atomic UPDATE; returns new balance. Caller ignores return value.
--   6. log_ai_usage(...) RETURNS UUID — INSERT into ai_usage_logs +
--      credits_ledger; called from future Sub-pass A1 wiring (no current
--      callers).
--
-- OUT OF SCOPE — explicitly DEFERRED to Sub-pass A1 + A2:
--   - Stripe API client / webhook handler / billing routes
--   - Plan upgrade route
--   - BYOK key storage routes
--   - Wiring log_ai_usage call sites into ai/execute and ai-suggestions
--   - Settings/billing/BYOK frontend UI
--
-- Architecture invariants preserved:
--   - Single-writer backend (RPCs run server-side via service-role)
--   - org_id-from-JWT-only (RPCs take p_org_id from server-side caller; no
--     client input path)
--   - Canonical envelope (no route changes; existing routes unchanged)
--   - Request_id correlator chain (RPCs do not log; route-level logging
--     unchanged)
--   - Deferred-router 503 gating (untouched)
--   - HARD LOCK invariants (untouched — Phase 4 minimal slice unchanged)
--   - Phase 5 closure state (organizations.plan_type / vault_byok_* unchanged;
--     creatives/creative_generations/creatives tables unchanged; storage
--     bucket unchanged)
--   - Phase 6 closure state (campaigns service / actions_library / Sub-pass A
--     natural-key lookup all unchanged)
--   - Legacy `decisions` table NOT reactivated
--
-- Reversal:
--   DROP FUNCTION IF EXISTS public.log_ai_usage(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, UUID, UUID);
--   DROP FUNCTION IF EXISTS public.refund_credits(TEXT, INTEGER);
--   DROP FUNCTION IF EXISTS public.deduct_credits(TEXT, INTEGER);
--   DROP TABLE IF EXISTS public.credits_ledger;
--   DROP TABLE IF EXISTS public.ai_usage_logs;
--   ALTER TABLE public.organizations DROP COLUMN IF EXISTS credits_balance;
-- ===========================================================================


-- ─── 1. organizations.credits_balance ─────────────────────────────────────
-- Additive column. NOT NULL DEFAULT 0 → all existing rows initialize at 0
-- (operators grant initial credits via subsequent INSERT into credits_ledger
-- + UPDATE on this column, OR via direct privileged UPDATE during onboarding).
-- CHECK >= 0 → DB-level invariant that balance never goes negative; the
-- deduct_credits RPC enforces this via conditional UPDATE rather than relying
-- on the constraint to throw.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS credits_balance INTEGER NOT NULL DEFAULT 0
    CHECK (credits_balance >= 0);


-- ─── 2. ai_usage_logs ──────────────────────────────────────────────────────
-- Per-call AI usage log per Phases.md Phase 7 NEW. One row per AI invocation.
-- Future call sites (Sub-pass A1) write here from ai/execute, ai-suggestions,
-- decision-generator, creative-generator, and any other AI-bearing service.
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL REFERENCES public.organizations(org_id),
  user_id         TEXT,                          -- nullable: system/job-driven calls
  model           TEXT NOT NULL,                  -- 'anthropic/claude-...', 'openai/gpt-...', etc.
  tokens_in       INTEGER NOT NULL DEFAULT 0 CHECK (tokens_in  >= 0),
  tokens_out      INTEGER NOT NULL DEFAULT 0 CHECK (tokens_out >= 0),
  cost_credits    INTEGER NOT NULL DEFAULT 0 CHECK (cost_credits >= 0),
  request_id      TEXT,                          -- HTTP-level correlator (tracingMiddleware)
  trace_id        UUID,                          -- AI-flow correlator (aiLogger.newTraceId)
  ai_decision_id  UUID REFERENCES public.ai_decisions(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_logs_org_scoped" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_logs_org_scoped" ON public.ai_usage_logs
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_org_id_created_at
  ON public.ai_usage_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_trace_id
  ON public.ai_usage_logs(trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_ai_decision_id
  ON public.ai_usage_logs(ai_decision_id) WHERE ai_decision_id IS NOT NULL;


-- ─── 3. credits_ledger ────────────────────────────────────────────────────
-- Immutable audit trail of every credits movement. Every deduct/refund/grant
-- is appended here. Reads off the live `organizations.credits_balance`
-- column for current state; reads from this ledger for audit history.
CREATE TABLE IF NOT EXISTS public.credits_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL REFERENCES public.organizations(org_id),
  delta       INTEGER NOT NULL,                  -- positive = credit, negative = debit
  reason      TEXT NOT NULL,                      -- 'deduct' | 'refund' | 'grant' | future tags
  ref_type    TEXT,                               -- 'creative_generation' | 'ai_call' | 'subscription' | ...
  ref_id      UUID,                               -- correlator into the originating record
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credits_ledger_org_scoped" ON public.credits_ledger;
CREATE POLICY "credits_ledger_org_scoped" ON public.credits_ledger
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_credits_ledger_org_id_created_at
  ON public.credits_ledger(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_ref
  ON public.credits_ledger(ref_type, ref_id) WHERE ref_id IS NOT NULL;


-- ─── 4. deduct_credits RPC ────────────────────────────────────────────────
-- Caller contract (per backend/src/routes/v1/creatives.ts:86-92):
--   Input:  p_org_id TEXT, p_amount INTEGER
--   Output: INTEGER
--           - new balance (>= 0) if deduction succeeded
--           - -1 if insufficient (NO deduction performed; safe to reject)
--
-- Atomicity: the conditional UPDATE either deducts AND returns new balance,
-- or no-ops AND we synthesize -1. There is NO partial-deduction state.
-- The CHECK constraint on credits_balance is defense-in-depth; the
-- conditional WHERE prevents the constraint from ever firing.
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_org_id TEXT,
  p_amount INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'deduct_credits: p_amount must be a positive integer (got %)', p_amount
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  UPDATE public.organizations
     SET credits_balance = credits_balance - p_amount
   WHERE org_id = p_org_id
     AND credits_balance >= p_amount
   RETURNING credits_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    -- Either org doesn't exist OR balance was insufficient. Caller treats
    -- both as "insufficient" (-1) — same user-facing meaning, and the
    -- caller already filters by authenticated org_id upstream so the
    -- "org doesn't exist" branch is unreachable in practice.
    RETURN -1;
  END IF;

  INSERT INTO public.credits_ledger (org_id, delta, reason)
  VALUES (p_org_id, -p_amount, 'deduct');

  RETURN v_new_balance;
END;
$$;


-- ─── 5. refund_credits RPC ────────────────────────────────────────────────
-- Caller contract (per backend/src/routes/v1/creatives.ts:121,148 +
-- backend/src/services/creatives/creative-generator.ts:208):
--   Input:  p_org_id TEXT, p_amount INTEGER
--   Output: INTEGER (new balance after refund — caller ignores)
--
-- Used to reverse a prior deduct_credits when downstream work fails.
-- Idempotency is the caller's responsibility (caller tracks creditsDeducted
-- and only invokes refund once); this RPC just performs an atomic add.
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_org_id TEXT,
  p_amount INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'refund_credits: p_amount must be a positive integer (got %)', p_amount
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.organizations
     SET credits_balance = credits_balance + p_amount
   WHERE org_id = p_org_id
   RETURNING credits_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'refund_credits: organization % not found', p_org_id
      USING ERRCODE = 'P0002'; -- no_data_found
  END IF;

  INSERT INTO public.credits_ledger (org_id, delta, reason)
  VALUES (p_org_id, p_amount, 'refund');

  RETURN v_new_balance;
END;
$$;


-- ─── 6. log_ai_usage RPC ─────────────────────────────────────────────────
-- Forward-positioning per Phases.md §Phase 7 NEW. No call sites in this
-- pass; Sub-pass A1 will instrument ai/execute, ai-suggestions,
-- decision-generator, creative-generator with explicit log_ai_usage calls
-- carrying request_id + trace_id + ai_decision_id correlators.
--
-- The function performs TWO writes:
--   1. INSERT ai_usage_logs row (per-call detail)
--   2. INSERT credits_ledger row (-cost_credits, reason='ai_call')
-- It does NOT modify organizations.credits_balance — that path is owned
-- by deduct_credits which carries the gate-and-reject semantics. log_ai_usage
-- is post-facto observability, not the metering primitive.
CREATE OR REPLACE FUNCTION public.log_ai_usage(
  p_org_id          TEXT,
  p_user_id         TEXT,
  p_model           TEXT,
  p_tokens_in       INTEGER,
  p_tokens_out      INTEGER,
  p_cost_credits    INTEGER,
  p_request_id      TEXT,
  p_trace_id        UUID,
  p_ai_decision_id  UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.ai_usage_logs (
    org_id, user_id, model, tokens_in, tokens_out, cost_credits,
    request_id, trace_id, ai_decision_id
  ) VALUES (
    p_org_id, p_user_id, p_model,
    COALESCE(p_tokens_in,  0),
    COALESCE(p_tokens_out, 0),
    COALESCE(p_cost_credits, 0),
    p_request_id, p_trace_id, p_ai_decision_id
  )
  RETURNING id INTO v_log_id;

  IF p_cost_credits IS NOT NULL AND p_cost_credits > 0 THEN
    INSERT INTO public.credits_ledger (org_id, delta, reason, ref_type, ref_id)
    VALUES (p_org_id, -p_cost_credits, 'ai_call', 'ai_usage_logs', v_log_id);
  END IF;

  RETURN v_log_id;
END;
$$;
