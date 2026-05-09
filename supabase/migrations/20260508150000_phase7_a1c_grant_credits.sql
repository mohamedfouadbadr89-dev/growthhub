-- ===========================================================================
-- 20260508150000_phase7_a1c_grant_credits.sql
-- Phase 7 Sub-pass A1c — grant_credits RPC (additive substrate)
-- ===========================================================================
-- Scope (per SYSTEM_CONTROL execution authorization 2026-05-08, continuation #18):
--   Add a third credits-mutation RPC to complete the substrate trio:
--     deduct_credits  — gate before AI/creative work          (Sub-pass A0)
--     refund_credits  — undo a prior deduct on failure path    (Sub-pass A0)
--     grant_credits   — POSITIVE balance increment with        (THIS PASS)
--                       caller-supplied audit reason
--
--   Runtime evidence justifying this minimal additive migration:
--     1. `refund_credits` has hardcoded `reason='refund'` in the ledger row.
--        Reusing it for Stripe purchase grants would emit semantically
--        incorrect audit rows (CONSTITUTION §3 + auditability concerns).
--     2. Atomic UPDATE-balance + INSERT-ledger requires a transactional
--        guarantee. Inline supabaseAdmin chaining cannot guarantee atomicity
--        across the two writes.
--     3. The webhook handler in this pass needs a primitive that can be
--        called from many future event paths (Stripe payment, promo grant,
--        manual admin grant) with distinct `reason` audit tags.
--
-- ZERO consumer code changes in THIS migration; the new RPC is invoked from
-- `backend/src/routes/webhooks/stripe.ts` (added in the same pass) when an
-- `invoice.payment_succeeded` event carries `metadata.credits_to_grant`.
--
-- HARD LOCK invariants preserved verbatim:
--   - Phase 4 minimal slice (actions_library / decision_history) UNTOUCHED
--   - Phase 5 (creatives) UNTOUCHED
--   - Phase 6 Sub-pass A/B UNTOUCHED
--   - Phase 7 Sub-pass A0/A0.5/A1a/A1b substrate UNTOUCHED at column level
--   - Legacy `decisions` table NOT reactivated
--   - SECURITY INVOKER (default) preserved — no privilege escalation
--   - SET search_path = public matches A0.5 hardening pattern
--
-- Reversal:
--   DROP FUNCTION IF EXISTS public.grant_credits(TEXT, INTEGER, TEXT, TEXT, UUID);
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.grant_credits(
  p_org_id   TEXT,
  p_amount   INTEGER,
  p_reason   TEXT,
  p_ref_type TEXT,
  p_ref_id   UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'grant_credits: p_amount must be a positive integer (got %)', p_amount
      USING ERRCODE = '22023';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'grant_credits: p_reason must be a non-empty string'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.organizations
     SET credits_balance = credits_balance + p_amount
   WHERE org_id = p_org_id
   RETURNING credits_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'grant_credits: organization % not found', p_org_id
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.credits_ledger (org_id, delta, reason, ref_type, ref_id)
  VALUES (p_org_id, p_amount, p_reason, p_ref_type, p_ref_id);

  RETURN v_new_balance;
END;
$$;
