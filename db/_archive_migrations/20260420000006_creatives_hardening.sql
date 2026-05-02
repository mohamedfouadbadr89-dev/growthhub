-- Phase 5 Hardening
-- Adds: batch credit deduction/refund RPCs + storage RLS policies

-- ============================================================
-- deduct_credits — atomically deducts p_amount credits for subscription orgs
-- Returns new balance, or -1 if insufficient / not subscription
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_credits(p_org_id TEXT, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be positive';
  END IF;

  UPDATE organizations
     SET credits_balance = credits_balance - p_amount
   WHERE org_id      = p_org_id
     AND plan_type   = 'subscription'
     AND credits_balance >= p_amount
  RETURNING credits_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RETURN -1;  -- insufficient credits or not a subscription org
  END IF;

  RETURN new_balance;
END;
$$;

-- ============================================================
-- refund_credits — atomically adds p_amount credits (subscription orgs only)
-- Used to compensate for failed generation jobs
-- ============================================================
CREATE OR REPLACE FUNCTION refund_credits(p_org_id TEXT, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RETURN;
  END IF;

  UPDATE organizations
     SET credits_balance = credits_balance + p_amount
   WHERE org_id    = p_org_id
     AND plan_type = 'subscription';
END;
$$;

-- ============================================================
-- Add credits_deducted column to creative_generations
-- Enables safe refund if a job fails after credits were charged
-- ============================================================
ALTER TABLE creative_generations
  ADD COLUMN IF NOT EXISTS credits_deducted INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Storage RLS: restrict read access to files under own org_id prefix
-- Applies when the bucket is set to Private in the Supabase dashboard
-- The service_role key (backend) bypasses RLS and retains full access
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename  = 'objects'
       AND policyname = 'creatives_org_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "creatives_org_read" ON storage.objects
        FOR SELECT
        USING (
          bucket_id = 'creatives'
          AND (storage.foldername(name))[1] = auth.jwt()->>'org_id'
        )
    $policy$;
  END IF;
END $$;
