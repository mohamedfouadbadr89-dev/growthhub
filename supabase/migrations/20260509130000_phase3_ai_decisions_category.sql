-- ===========================================================================
-- Phase 3 ↔ Phase 4 P2 BRIDGE — AI Output Contract Category Formalization
-- Path F (hybrid): nullable column + fallback shim + prompt emission
-- ===========================================================================
-- Per CLAUDE.md "DATABASE MIGRATIONS — SINGLE SOURCE OF TRUTH":
--   /supabase/migrations is the ONLY valid migration directory.
--
-- WHY THIS MIGRATION EXISTS:
--   The auto-fire hook landed in continuation #23 (post-persist call to
--   evaluateRulesForAIDecision in services/ai/execute-ai-decision.ts) is
--   architecturally wired but DORMANT in production because the AI Output
--   Contract never emits `result.category`, the JSONB path the automation
--   engine compares against rule.trigger_type. Verified runtime evidence:
--     • aiValidator.ts contract = {type, result, confidence_score,
--       reasoning_steps, status} — no category field
--     • routes/v1/ai.ts systemPrompts (×2) demand exactly those four
--       keys and FORBID any other key ("not include … any keys other
--       than the four above")
--     • automation-engine.ts extractCategory() returns null when
--       result.category is absent → no rule auto-fires categorically
--
-- PATH F SCOPE (this migration):
--   Add a NULLABLE `category` TEXT column on ai_decisions. Validator,
--   persistence, prompts, and the engine extractCategory shim are
--   updated in the same minimal-diff pass. Existing ai_decisions rows
--   retain NULL category — they cannot retro-trigger any rule, which is
--   the intended safety property (no unexpected back-fired automations
--   on historical data).
--
-- WHY NULLABLE (not NOT NULL):
--   - All ~existing rows pre-migration have no category value
--   - AI responses without category remain valid (backwards-compat with
--     any in-flight prompt tuning); fallback shim in automation-engine
--     can still extract from result.category JSONB path
--   - Operator-controlled rollout: enable category emission gradually
--     by tuning prompt + validator behavior; never breaks an existing
--     /api/v1/ai/execute caller
--
-- ROLLBACK:
--   ALTER TABLE ai_decisions DROP COLUMN category;
--   (column is purely additive; no FKs, no constraints, no indexes
--    other than the one below; safe to drop on rollback.)
-- ===========================================================================

ALTER TABLE ai_decisions
  ADD COLUMN IF NOT EXISTS category TEXT NULL;

-- Partial index supports the automation-engine's per-decision lookup
-- when (eventually) we want to query "all decisions matching a rule's
-- trigger_type". Unused on the auto-fire hot path (which already has
-- ai_decisions.id), but cheap insurance for future read patterns.
-- Partial (WHERE category IS NOT NULL) keeps the index footprint minimal
-- while the column rolls out.
CREATE INDEX IF NOT EXISTS ix_ai_decisions_category_org
  ON ai_decisions (org_id, category)
  WHERE category IS NOT NULL;
