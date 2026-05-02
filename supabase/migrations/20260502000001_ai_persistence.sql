-- ===========================================================================
-- 20260502000001_ai_persistence.sql
-- Phase 3 — AI persistence: ai_decisions + ai_logs (Path A)
-- ===========================================================================
-- Per the updated CLAUDE.md "DATABASE MIGRATIONS — SINGLE SOURCE OF TRUTH":
--   /supabase/migrations is the ONLY valid migration directory.
--   /db/_archive_migrations is archive only and MUST NEVER be referenced.
--
-- IDEMPOTENT by design. Two starting states are supported:
--
--   (A) CLEAN DB
--       - CREATE TABLE creates both tables with `org_id TEXT NOT NULL`.
--       - The reconciliation DO block is a no-op (no UUID columns to fix).
--
--   (B) LIVE DB with prior out-of-band table creation
--       - `ai_logs` already exists with `org_id UUID` (verified via
--         information_schema query against the live database; see
--         project notes 2026-05-02).
--       - CREATE TABLE IF NOT EXISTS is a no-op for the existing tables.
--       - The reconciliation DO block detects the wrong-type column,
--         drops any dependent broken policy, and converts the column
--         to TEXT via `ALTER COLUMN ... TYPE TEXT USING org_id::text`.
--
-- TYPE ALIGNMENT:
--   `organizations.org_id` is TEXT in the live DB. ALL referencing
--   tables MUST also use TEXT. RLS predicates compare directly:
--       org_id = auth.jwt()->>'org_id'
--   Both sides are TEXT — no cast required, no `::uuid` anywhere.
--
-- IDEMPOTENT PRIMITIVES USED:
--   - CREATE TABLE IF NOT EXISTS
--   - ENABLE ROW LEVEL SECURITY (re-enable is a no-op)
--   - DO $$ ... EXECUTE ... $$ guarded by information_schema check
--   - DROP POLICY IF EXISTS + CREATE POLICY  (drop/create idiom; Postgres
--     has no CREATE POLICY IF NOT EXISTS)
--   - CREATE INDEX IF NOT EXISTS
-- ===========================================================================


-- ─── ai_decisions  (clean-DB shape) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_decisions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             TEXT NOT NULL REFERENCES organizations(org_id),
  type               TEXT NOT NULL CHECK (type IN ('dashboard', 'insight', 'decision')),
  result             JSONB NOT NULL,
  confidence_score   NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status             TEXT NOT NULL CHECK (status IN ('active', 'needs_review')),
  reasoning_steps    JSONB NOT NULL,
  trace_id           UUID NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── ai_logs  (clean-DB shape) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               TEXT NOT NULL REFERENCES organizations(org_id),
  trace_id             UUID NOT NULL,
  phase                TEXT NOT NULL CHECK (phase IN (
                         'request',
                         'raw',
                         'validated',
                         'validation_error',
                         'transport_error',
                         'persisted',
                         'persistence_error'
                       )),
  model                TEXT NOT NULL,
  prompt               JSONB,
  raw_response         JSONB,
  validated_response   JSONB,
  latency_ms           INTEGER,
  error                JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── Reconcile pre-existing wrong-type columns (live-DB case) ──────────────
-- Runs ONLY when the column is currently UUID; otherwise no-op.
-- Drops the broken policy first because changing column type while a
-- policy references it can be rejected by Postgres depending on version.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'ai_logs'
      AND column_name  = 'org_id'
      AND data_type    = 'uuid'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "ai_logs_org_isolation" ON ai_logs';
    EXECUTE 'ALTER TABLE ai_logs ALTER COLUMN org_id TYPE TEXT USING org_id::text';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'ai_decisions'
      AND column_name  = 'org_id'
      AND data_type    = 'uuid'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "ai_decisions_org_isolation" ON ai_decisions';
    EXECUTE 'ALTER TABLE ai_decisions ALTER COLUMN org_id TYPE TEXT USING org_id::text';
  END IF;
END $$;


-- ─── RLS + policies (TEXT-only predicate, no casts) ────────────────────────
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_decisions_org_isolation" ON ai_decisions;
CREATE POLICY "ai_decisions_org_isolation" ON ai_decisions
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

DROP POLICY IF EXISTS "ai_logs_org_isolation" ON ai_logs;
CREATE POLICY "ai_logs_org_isolation" ON ai_logs
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');


-- ─── Indexes (idempotent) ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_decisions_org_created
  ON ai_decisions(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_org_status
  ON ai_decisions(org_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_org_trace
  ON ai_decisions(org_id, trace_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_org_created
  ON ai_logs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_org_trace
  ON ai_logs(org_id, trace_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_org_phase
  ON ai_logs(org_id, phase);
