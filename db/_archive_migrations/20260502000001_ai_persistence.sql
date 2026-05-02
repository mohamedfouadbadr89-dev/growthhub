-- ===========================================================================
-- 20260502000001_ai_persistence.sql
-- Phase 3 — AI persistence (Path A: new tables, leave existing decisions alone)
-- ===========================================================================
-- Mirrors db/schema.sql ai_decisions / ai_logs sections exactly. Per CLAUDE.md
-- "DATABASE EXECUTION PROTOCOL" §1, the canonical definition is in schema.sql;
-- this migration is the executable form.
-- ===========================================================================


-- ─── ai_decisions ──────────────────────────────────────────────────────────
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

ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_decisions_org_isolation" ON ai_decisions
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

CREATE INDEX IF NOT EXISTS idx_ai_decisions_org_created
  ON ai_decisions(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_org_status
  ON ai_decisions(org_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_org_trace
  ON ai_decisions(org_id, trace_id);


-- ─── ai_logs ───────────────────────────────────────────────────────────────
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

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_logs_org_isolation" ON ai_logs
  FOR ALL
  USING      (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

CREATE INDEX IF NOT EXISTS idx_ai_logs_org_created
  ON ai_logs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_org_trace
  ON ai_logs(org_id, trace_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_org_phase
  ON ai_logs(org_id, phase);
