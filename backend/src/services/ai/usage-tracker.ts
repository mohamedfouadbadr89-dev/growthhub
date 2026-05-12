/**
 * AI Usage Ledger — recording substrate.
 *
 * SOURCE OF TRUTH:
 *   - specs/AI_OPERATING_MODEL.md §7 ("LLM Cost Governance — AI usage
 *     tracking + AI budget protection + operator-visible consumption metrics")
 *   - specs/AI_OPERATING_MODEL.md §12 ("Required Tables (Additive Only)
 *     — ai_usage_ledger")
 *   - supabase/migrations/20260512190000_phase0_ai_usage_ledger.sql
 *
 * SCOPE:
 *   This module records operation-type-classified credit-consumption rows
 *   to the `ai_usage_ledger` table. It DOES NOT:
 *     - gate AI calls (existing `deduct_credits` RPC remains the gate)
 *     - measure tokens (existing `log_ai_usage` RPC owns provider observability)
 *     - emit log lines (caller can wrap with `[AI] ledger=...` if needed)
 *
 *   Two substrates coexist by design (continuation #40):
 *     - ai_usage_logs  (Phase 7 A1a)  = per-call provider observability
 *     - ai_usage_ledger (Phase 0 #40) = per-operation classification ledger
 *
 *   Future analytics may JOIN them; neither replaces the other.
 *
 * INVOCATION PATTERN:
 *   Fire-and-forget after AI operation success. NEVER fails the caller's
 *   user-visible path. Mirrors the existing `log_ai_usage` fire-and-forget
 *   pattern in execute-ai-decision.ts:288 and creative-generator.ts:175.
 *
 * ORG ISOLATION:
 *   Caller passes orgId explicitly (extracted from Clerk JWT by middleware).
 *   This module NEVER reads org_id from request bodies or AI output —
 *   same invariant as persistAIDecision and log_ai_usage.
 */

import { supabaseAdmin } from '../../lib/supabase.js'

/**
 * Operation-type enum — MUST match the CHECK constraint in
 * 20260512190000_phase0_ai_usage_ledger.sql. Adding a new operation type
 * requires an additive migration (intentional friction per migration
 * file's enum-lock rationale).
 */
export type AIUsageOperationType =
  | 'ai_decision_generate'    // Tier 3 — /api/v1/ai/decisions/generate
  | 'ai_execute'              // Tier 3 — /api/v1/ai/execute
  | 'creative_copy'           // Tier 3 — /api/v1/creatives/generate (copy)
  | 'creative_image'          // Tier 3 — /api/v1/creatives/generate (image)
  | 'daily_digest'            // Tier 2 — scheduled daily digest (reserved)
  | 'conversational_query'    // Tier 3 — conversational AI (reserved)
  | 'strategic_recommendation' // Tier 3 — multi-step reasoning (reserved)

export interface RecordAIUsageInput {
  org_id: string
  operation_type: AIUsageOperationType
  /**
   * Credit cost actually consumed (post-deduct_credits, not pre-flight).
   * Zero is valid for LTD-plan orgs (BYOK; no platform credits consumed).
   */
  credit_cost?: number
  /**
   * Optional FK to the ai_decisions row this operation produced.
   * NULL for creative_copy / creative_image (those write to
   * creative_generations, not ai_decisions).
   */
  ai_decision_id?: string | null
  /**
   * Outer HTTP request_id from tracingMiddleware. Enables joining to
   * [req]/[err]/[exec]/[AI] correlator chain for full-stack debugging.
   */
  request_id?: string | null
  /**
   * Free-form per-operation metadata. Common keys: model, tokens_in,
   * tokens_out, plan_type, byok. Stored as JSONB; schema-less by design.
   */
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget recording of an AI operation in the usage ledger.
 *
 * Returns void; both success and DB failure are swallowed. The caller's
 * primary path (AI operation) has already completed when this runs —
 * observability writes never fail the user-facing path. CONSTITUTION §3
 * "Fail Loudly" is preserved upstream by the AI pipeline's own persistence
 * + validation layers; this module is observability-only.
 *
 * Operator-visible failures land in stdout via the catch handler below
 * with `[ai-usage-ledger]` prefix for grep-ability.
 */
export function recordAIUsage(input: RecordAIUsageInput): void {
  void supabaseAdmin
    .from('ai_usage_ledger')
    .insert({
      org_id:         input.org_id,
      operation_type: input.operation_type,
      credit_cost:    input.credit_cost ?? 0,
      ai_decision_id: input.ai_decision_id ?? null,
      request_id:     input.request_id ?? null,
      metadata:       input.metadata ?? null,
    })
    .then(
      ({ error }) => {
        if (error) {
          // Soft warn — does not propagate. The ledger is observability-only;
          // an INSERT failure here does NOT void the AI operation's success.
          // Operators can grep [ai-usage-ledger] in stdout to detect ledger drift.
          // Continuation #48 — request_id correlation for grep parity with
          // [req]/[err]/[exec]/[AI] chain. Caller threads input.request_id
          // when invoked from an HTTP request (both /ai routes + creative-
          // generator do); falls back to 'no-request-id' for non-HTTP callers
          // (e.g., future Tier 2 daily_digest cron).
          console.warn(
            `[ai-usage-ledger][req=${input.request_id ?? 'no-request-id'}] ` +
              `insert failed org=${input.org_id} op=${input.operation_type} ` +
              `error=${error.message}`,
          )
        }
      },
      (err) => {
        console.warn(
          `[ai-usage-ledger][req=${input.request_id ?? 'no-request-id'}] ` +
            `insert threw org=${input.org_id} op=${input.operation_type} ` +
            `error=${(err as Error)?.message ?? 'unknown'}`,
        )
      },
    )
}
