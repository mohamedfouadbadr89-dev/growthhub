-- ===========================================================================
-- 20260509120000_phase7_stripe_webhook_dedup.sql
-- Phase 7 webhook hardening — additive dedup substrate
-- ===========================================================================
-- Scope (per SYSTEM_CONTROL execution authorization 2026-05-09, continuation #22):
--   Adds the `processed_stripe_events` table to backstop the Stripe webhook
--   handler's idempotency-by-event_id flow. Stripe retries non-2xx responses
--   for hours and may also re-deliver successful events on operator-side
--   reconfiguration; without dedup the webhook can double-grant credits or
--   double-upsert subscriptions on retry. The single-row PK INSERT acts as
--   an atomic "have I seen this event_id before" gate before the handler
--   runs its dispatch.
--
-- Pattern: INSERT INTO processed_stripe_events (event_id, ...) ON CONFLICT
-- semantics — caller catches Postgres 23505 (unique violation) on retry
-- and returns {received:true, deduped:true} 200 ack to Stripe so retries
-- terminate cleanly without re-processing.
--
-- Schema rationale:
--   - `event_id TEXT PRIMARY KEY` — Stripe event ids are stable strings
--     (e.g. "evt_3Ab..."); using them as PK gives free atomic dedup.
--   - `event_type TEXT` — captured for operator triage (which event types
--     are seeing replay storms?). NULLABLE because dedup conflict can
--     occur before the JSON parse if the body is malformed.
--   - `received_at TIMESTAMPTZ` — for retention pruning + observability.
--   - RLS enabled with NO policies — system-only access. service_role
--     (the only writer/reader) bypasses RLS regardless. Defense-in-depth
--     against any future direct PostgREST exposure.
--
-- Future operations (not in this pass):
--   - Periodic prune of rows older than N days (e.g. 30) via cron/Inngest
--     to keep table size bounded. Stripe never replays events >30 days
--     old, so a 30-day window is sufficient.
--
-- Reversal:
--   DROP TABLE IF EXISTS public.processed_stripe_events;
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id    TEXT PRIMARY KEY,
  event_type  TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies. service_role bypasses RLS; the table is system-only.

CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_received_at
  ON public.processed_stripe_events(received_at DESC);
