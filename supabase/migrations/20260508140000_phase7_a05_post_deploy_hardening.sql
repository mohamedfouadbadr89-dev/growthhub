-- ===========================================================================
-- 20260508140000_phase7_a05_post_deploy_hardening.sql
-- Phase 7 Sub-pass A0.5 — post-deploy hardening cleanup (additive, reversible)
-- ===========================================================================
-- Scope (per SYSTEM_CONTROL execution authorization 2026-05-08, continuation #15):
--
--   (A) RPC hardening — close 3 advisor WARNs introduced by Sub-pass A0:
--         function_search_path_mutable on deduct_credits / refund_credits /
--         log_ai_usage. Resolution per Supabase advisor remediation:
--         `SET search_path = public` on each function. Function bodies are
--         REPLACED with bit-identical logic; only the search_path setting
--         is added. SECURITY INVOKER (default) is preserved — this is NOT
--         an authority escalation; it is path-injection defense-in-depth.
--
--   (B) PHASE2_PARTITION_RLS_FOLLOWUP — close 9 advisor ERRORs:
--         rls_disabled_in_public on campaign_metrics_2026_q1 through
--         campaign_metrics_2027_q4 + campaign_metrics_default. Postgres
--         partition RLS does NOT auto-inherit from the parent partitioned
--         table; each child partition needs its own ENABLE ROW LEVEL
--         SECURITY + matching policy. Backend currently mitigates via
--         supabaseAdmin (service_role) parent-table queries only — service
--         role bypasses RLS regardless. This migration is defense-in-depth
--         against any future direct-partition access path. Policy is
--         identical to the parent's `campaign_metrics_org_isolation`:
--         USING (org_id = (auth.jwt() ->> 'org_id')).
--
-- OUT OF SCOPE — explicitly DEFERRED:
--   - Phase 7 Sub-pass A1 (instrumentation: log_ai_usage call sites at
--     ai/execute, ai-suggestions, decision-generator, creative-generator;
--     deduct_credits enforcement on previously unmetered AI surfaces)
--   - Stripe API client / webhook handler / billing UI
--   - Real Meta/Google CREATE handlers (Phase 6 Sub-pass C)
--   - Phase X broader (MCP routing, tool governance)
--   - decisions table RLS (Phase 3 anomaly DEPRECATED — governance-tolerated;
--     not in this scope)
--   - set_updated_at_now function search_path (pre-existing; Phase 0/1 era)
--
-- Reversal:
--   -- Revert RPC hardening (functions revert to pre-A0.5 mutable search_path)
--   -- by re-applying their A0 bodies (omit SET search_path).
--   -- Revert partition RLS:
--   ALTER TABLE public.campaign_metrics_2026_q1 DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "campaign_metrics_2026_q1_org_isolation" ON public.campaign_metrics_2026_q1;
--   -- (repeat for each partition)
-- ===========================================================================


-- ─── (A) RPC search_path hardening ────────────────────────────────────────
-- Identical bodies to 20260508130000_phase7_a0_credits_substrate.sql, with
-- `SET search_path = public` added to each function definition. Operationally
-- identical behavior; only the resolution scope of unqualified names is
-- pinned to the `public` schema, preventing search_path-injection vectors.

CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_org_id TEXT,
  p_amount INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'deduct_credits: p_amount must be a positive integer (got %)', p_amount
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.organizations
     SET credits_balance = credits_balance - p_amount
   WHERE org_id = p_org_id
     AND credits_balance >= p_amount
   RETURNING credits_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN -1;
  END IF;

  INSERT INTO public.credits_ledger (org_id, delta, reason)
  VALUES (p_org_id, -p_amount, 'deduct');

  RETURN v_new_balance;
END;
$$;


CREATE OR REPLACE FUNCTION public.refund_credits(
  p_org_id TEXT,
  p_amount INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
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
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.credits_ledger (org_id, delta, reason)
  VALUES (p_org_id, p_amount, 'refund');

  RETURN v_new_balance;
END;
$$;


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
SET search_path = public
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


-- ─── (B) PHASE2_PARTITION_RLS_FOLLOWUP ─────────────────────────────────────
-- Enable RLS + add org-scoped policy on each of the 9 child partitions of
-- the partitioned `campaign_metrics` table. Policy is identical to the
-- parent's `campaign_metrics_org_isolation` policy — same `USING` clause,
-- same `ALL` command coverage. Backend behavior unchanged: supabaseAdmin
-- service_role bypasses RLS by design; this is defense-in-depth only.

ALTER TABLE public.campaign_metrics_2026_q1 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_metrics_2026_q1_org_isolation" ON public.campaign_metrics_2026_q1;
CREATE POLICY "campaign_metrics_2026_q1_org_isolation" ON public.campaign_metrics_2026_q1
  USING (org_id = (auth.jwt() ->> 'org_id'));

ALTER TABLE public.campaign_metrics_2026_q2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_metrics_2026_q2_org_isolation" ON public.campaign_metrics_2026_q2;
CREATE POLICY "campaign_metrics_2026_q2_org_isolation" ON public.campaign_metrics_2026_q2
  USING (org_id = (auth.jwt() ->> 'org_id'));

ALTER TABLE public.campaign_metrics_2026_q3 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_metrics_2026_q3_org_isolation" ON public.campaign_metrics_2026_q3;
CREATE POLICY "campaign_metrics_2026_q3_org_isolation" ON public.campaign_metrics_2026_q3
  USING (org_id = (auth.jwt() ->> 'org_id'));

ALTER TABLE public.campaign_metrics_2026_q4 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_metrics_2026_q4_org_isolation" ON public.campaign_metrics_2026_q4;
CREATE POLICY "campaign_metrics_2026_q4_org_isolation" ON public.campaign_metrics_2026_q4
  USING (org_id = (auth.jwt() ->> 'org_id'));

ALTER TABLE public.campaign_metrics_2027_q1 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_metrics_2027_q1_org_isolation" ON public.campaign_metrics_2027_q1;
CREATE POLICY "campaign_metrics_2027_q1_org_isolation" ON public.campaign_metrics_2027_q1
  USING (org_id = (auth.jwt() ->> 'org_id'));

ALTER TABLE public.campaign_metrics_2027_q2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_metrics_2027_q2_org_isolation" ON public.campaign_metrics_2027_q2;
CREATE POLICY "campaign_metrics_2027_q2_org_isolation" ON public.campaign_metrics_2027_q2
  USING (org_id = (auth.jwt() ->> 'org_id'));

ALTER TABLE public.campaign_metrics_2027_q3 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_metrics_2027_q3_org_isolation" ON public.campaign_metrics_2027_q3;
CREATE POLICY "campaign_metrics_2027_q3_org_isolation" ON public.campaign_metrics_2027_q3
  USING (org_id = (auth.jwt() ->> 'org_id'));

ALTER TABLE public.campaign_metrics_2027_q4 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_metrics_2027_q4_org_isolation" ON public.campaign_metrics_2027_q4;
CREATE POLICY "campaign_metrics_2027_q4_org_isolation" ON public.campaign_metrics_2027_q4
  USING (org_id = (auth.jwt() ->> 'org_id'));

ALTER TABLE public.campaign_metrics_default ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_metrics_default_org_isolation" ON public.campaign_metrics_default;
CREATE POLICY "campaign_metrics_default_org_isolation" ON public.campaign_metrics_default
  USING (org_id = (auth.jwt() ->> 'org_id'));
