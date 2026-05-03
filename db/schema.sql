-- ===========================================================================
-- db/schema.sql — Canonical schema (Growth OS / GrowthHub)
-- ===========================================================================
--
-- Per CLAUDE.md "DATABASE EXECUTION PROTOCOL":
--   1. ALL database changes MUST be written here AND in db/migrations/*.sql.
--   2. Tables not yet present in this file remain canonical in their existing
--      migration files under db/migrations/. Each new schema change adds the
--      affected tables here AND ships a matching migration.
--
-- This file currently contains:
--   - ai_decisions  (Phase 3 — validated AI Output Contract storage)
--   - ai_logs       (Phase 3 — per-interaction log persistence)
--
-- Tables defined elsewhere (canonical source = original migration):
--   - organizations, users, subscriptions, audit_logs ...... db/migrations/20260420000001_foundation.sql
--   - integrations, ad_accounts, sync_logs, campaign_metrics  db/migrations/20260420000002_data_ingestion.sql
--   - decisions, alerts, alert_thresholds, decision_runs ... db/migrations/20260420000003_intelligence.sql
--   - actions, automation_rules, automation_runs, decision_history
--                                                            db/migrations/20260420000004_execution.sql
--   - creatives ............................................ db/migrations/20260420000005_creatives.sql
--                                                           + db/migrations/20260420000006_creatives_hardening.sql
--   - campaigns ............................................ db/migrations/20260420000007_campaigns.sql
--
-- The existing `decisions` table (Phase 2 anomaly pipeline) is intentionally
-- NOT modified by this file. Phase 3 AI output is persisted in `ai_decisions`.
-- ===========================================================================


-- ===========================================================================
-- ai_decisions — validated AI Output Contract rows
-- ===========================================================================
-- One row per successfully-validated AI response (i.e. one row per AIResponse
-- returned from validateAIResponse / safeValidateAIResponse). The validator
-- is the only path that may produce inputs to this table — service code is
-- typed to require an AIResponse parameter, so unvalidated payloads cannot
-- reach the INSERT.
--
-- `status` is enforced by CHECK to match the AIDecisionStatus union derived
-- inside the validator. `confidence_score` is NUMERIC in 0..1 (matches the
-- contract; do not multiply to 0..100 — that's the legacy `decisions` table).
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

-- Org isolation: client-side reads and any non-service-role writes are
-- restricted to the caller's org. Backend uses service_role which bypasses
-- RLS by design (CLAUDE.md §3 "service_role_key lives on Backend only").
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


-- ===========================================================================
-- ai_logs — per-interaction structured log entries
-- ===========================================================================
-- Mirrors the AILogEntry shape produced by backend/src/utils/aiLogger.ts.
-- Multiple rows per AI call (one per phase), all sharing one trace_id so
-- the lifecycle of a single interaction can be reconstructed in audit.
--
-- `prompt`, `raw_response`, `validated_response`, `error` are JSONB so
-- structured payloads are preserved verbatim — Phase 3 forbids silent
-- coercion of AI input/output.
--
-- `latency_ms` is nullable because the `request` phase event has no
-- elapsed time to record (it IS the start).
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
