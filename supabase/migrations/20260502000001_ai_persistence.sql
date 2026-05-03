-- ===========================================================================
-- 20260502000001_ai_persistence.sql
-- Phase 3 — AI persistence: ai_decisions + ai_logs (Path A)
-- ===========================================================================
-- Per CLAUDE.md "DATABASE MIGRATIONS — SINGLE SOURCE OF TRUTH":
--   /supabase/migrations is the ONLY valid migration directory.
--
-- WHY THIS MIGRATION IS DESTRUCTIVE (but safe):
--
--   The live database contains an out-of-band `ai_logs` table whose
--   columns and types diverge from the canonical Phase 3 shape — verified
--   across multiple `supabase db push` failures:
--     • org_id was UUID instead of TEXT
--     • policy was named "org_isolation_ai_logs" (wrong convention)
--     • column "trace_id" missing entirely
--     • likely other column / type drift not yet surfaced
--
--   Both `ai_logs` and `ai_decisions` are CONFIRMED EMPTY (0 rows,
--   verified via the Supabase dashboard 2026-05-02). Reconciling
--   column-by-column on a live table with this much drift is brittle —
--   each fix surfaces another unknown gap. DROP TABLE … CASCADE +
--   CREATE produces the exact canonical schema in one shot, with no
--   data loss because there is no data, and CASCADE cleans up every
--   dependent policy / index / FK regardless of name.
--
--   Supabase records this migration in supabase_migrations.schema_migrations
--   on first success; the destructive `DROP TABLE` will not run a second
--   time unless someone explicitly resets migration history.
--
-- TYPE ALIGNMENT:
--   organizations.org_id is TEXT, so referencing tables use TEXT and
--   the RLS predicate compares directly: org_id = auth.jwt()->>'org_id'
-- ===========================================================================


-- ─── 1. Tear down any prior partial state ──────────────────────────────────
-- IF EXISTS keeps this safe on a clean DB (no-op if tables missing).
-- CASCADE drops attached policies, indexes, FK constraints in one go.
DROP TABLE IF EXISTS ai_logs      CASCADE;
DROP TABLE IF EXISTS ai_decisions CASCADE;


-- ─── 2. ai_decisions ───────────────────────────────────────────────────────
CREATE TABLE ai_decisions (
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


-- ─── 3. ai_logs ────────────────────────────────────────────────────────────
CREATE TABLE ai_logs (
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


-- ─── 4. Row-level security ─────────────────────────────────────────────────
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs      ENABLE ROW LEVEL SECURITY;


-- ─── 5. Canonical org-isolation policies (TEXT predicate, no casts) ────────
CREATE POLICY "ai_decisions_org_isolation" ON ai_decisions
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

CREATE POLICY "ai_logs_org_isolation" ON ai_logs
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');


-- ─── 6. Indexes ────────────────────────────────────────────────────────────
CREATE INDEX idx_ai_decisions_org_created ON ai_decisions(org_id, created_at DESC);
CREATE INDEX idx_ai_decisions_org_status  ON ai_decisions(org_id, status);
CREATE INDEX idx_ai_decisions_org_trace   ON ai_decisions(org_id, trace_id);

CREATE INDEX idx_ai_logs_org_created ON ai_logs(org_id, created_at DESC);
CREATE INDEX idx_ai_logs_org_trace   ON ai_logs(org_id, trace_id);
CREATE INDEX idx_ai_logs_org_phase   ON ai_logs(org_id, phase);
