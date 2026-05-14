/**
 * Approval-queue enqueue rule — continuation #51.
 *
 * SOURCE OF TRUTH:
 *   - specs/AI_OPERATING_MODEL.md §4 "Approval-Required Actions"
 *   - specs/AI_OPERATING_MODEL.md §13 missing-semantics preservation
 *   - approval_queue substrate: supabase/migrations/20260512210000_phase0_approval_queue.sql (#43)
 *   - dispatcher service: backend/src/services/approvals/dispatcher.ts (#50)
 *
 * SCOPE:
 *   This module is the CLASSIFIER + ENQUEUER for the approval-flow. It
 *   answers the question "should this AI decision require operator
 *   approval before any action fires?" and, when yes, INSERTs a
 *   `pending` row into approval_queue. The dispatcher (#50) handles
 *   the post-enqueue WRITE-chain transitions.
 *
 * GOVERNANCE INVARIANTS (operator constraints at #51 authorization):
 *
 *   1. reuse existing approval_queue schema
 *      → No migration. INSERTs into the table as-is (#43 substrate).
 *
 *   2. preserve auto-fire path unchanged
 *      → This module does NOT modify evaluateRulesForAIDecision or
 *        action-executor.ts. Both auto-fire (#23 / #24) and approval
 *        enqueue run as parallel fire-and-forget hooks post-persist.
 *
 *   3. approval path must remain parallel, not replacing existing flow
 *      → Both paths run on every AI decision. The operator is
 *        responsible for keeping APPROVAL_REQUIRED_CATEGORIES disjoint
 *        from any automation_rule.trigger_type currently configured —
 *        if a category appears in BOTH the auto-fire rule set AND the
 *        approval list, double-execution will happen. Disjointness is
 *        an operator deployment policy, not enforced in code.
 *
 *   4. threshold/risk logic must be config-driven or isolated
 *      → All policy lives in env vars below with safe-no-op defaults.
 *        Zero category names + zero confidence thresholds are INVENTED
 *        by Claude. Operator activates the rule by setting env vars;
 *        operator tunes thresholds via env edits + redeploy (no code
 *        changes required for runtime policy adjustments).
 *
 *   5. minimal-diff only
 *      → 1 new service file + 1 integration call in execute-ai-decision.ts
 *
 *   6. no destructive migration / no new infrastructure / no FE wiring
 *      → All satisfied. INSERTs use schema defaults for
 *        action_template_id (NULL) and action_params ('{}'); operator
 *        edits via SQL/ops tooling OR future Decision Center FE
 *        (currently HARD LOCK per NEXT ACTION line 364) before
 *        approving.
 *
 * ENVIRONMENT VARIABLES (operator-controlled; safe-no-op defaults):
 *
 *   APPROVAL_REQUIRED_CATEGORIES
 *     Comma-separated, case-insensitive list of AI Output Contract
 *     `category` values that trigger enqueue.
 *     Default: EMPTY → enqueue rule INACTIVE (no behavior change vs
 *     pre-#51). The auto-fire chain continues exactly as before;
 *     no rows are added to approval_queue from the AI pipeline.
 *     Example operator activation:
 *       APPROVAL_REQUIRED_CATEGORIES=BUDGET_INCREASE,CAMPAIGN_LAUNCH,AUDIENCE_EXPANSION
 *
 *   APPROVAL_MIN_CONFIDENCE
 *     Minimum AI Output Contract `confidence_score` to trigger enqueue
 *     (range [0, 1]). AI decisions below this confidence are NOT
 *     enqueued — operator policy to avoid queue spam from low-confidence
 *     suggestions.
 *     Default: 0 → any confidence enqueues (when category matches).
 *     Example operator activation:
 *       APPROVAL_MIN_CONFIDENCE=0.7
 *
 *   APPROVAL_ENQUEUE_NEEDS_REVIEW_ONLY
 *     'true' to enqueue ONLY decisions with derived status='needs_review'
 *     (confidence < NEEDS_REVIEW_THRESHOLD = 0.7 per aiValidator.ts).
 *     Default: 'false' → both 'active' and 'needs_review' decisions
 *     are eligible. Provides a secondary policy lever: operator may
 *     prefer "auto-fire for high-confidence active decisions, require
 *     approval only for low-confidence needs-review ones".
 *
 * RELATIONSHIP TO #23/#24 AUTO-FIRE CHAIN:
 *   Both chains read input.org_id + decision_id; both are fire-and-forget
 *   .then(noop, errorLog) post-persistAIDecision; neither is aware of
 *   the other. Operator-side disjointness (category lists) prevents
 *   double-execution. No coupling, no shared state.
 */

import { supabaseAdmin } from '../../lib/supabase.js'
import type { AIResponse } from '../../utils/aiValidator.js'

// ─── Config resolvers (env-var-driven; safe-no-op defaults) ────────────

function getApprovalRequiredCategories(): Set<string> {
  const raw = process.env.APPROVAL_REQUIRED_CATEGORIES ?? ''
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0),
  )
}

function getMinConfidence(): number {
  const raw = process.env.APPROVAL_MIN_CONFIDENCE
  if (!raw) return 0
  const n = parseFloat(raw)
  if (isNaN(n) || n < 0 || n > 1) {
    // Loud warn for misconfigured env (silent-permissive at 0 is the
    // safe choice when invalid; matches the budget-enforcer.ts:91
    // pattern from #41).
    console.warn(
      `[approvals-enqueue] env APPROVAL_MIN_CONFIDENCE invalid (${raw}); ` +
        `falling back to 0 (any confidence enqueues)`,
    )
    return 0
  }
  return n
}

function getNeedsReviewOnly(): boolean {
  return process.env.APPROVAL_ENQUEUE_NEEDS_REVIEW_ONLY === 'true'
}

// ─── Startup validation (Continuation #52) ─────────────────────────────
//
// Operator-authorized config-format validator. Emits `[STARTUP][approvals]`
// warnings for malformed env values; NEVER throws, NEVER changes runtime
// behavior. The runtime resolvers above are fail-soft (invalid → safe
// fallback), so a misconfigured env produces a no-op rule. Surfacing
// validation at startup gives operators an earlier signal than waiting
// for the first AI decision to produce a `[approvals-enqueue]` warn.
//
// Constraint compliance:
//   - preserve empty-default inactive behavior:
//       unset / empty APPROVAL_REQUIRED_CATEGORIES → SILENT (no warn).
//       Inactive default must NOT trigger boot noise.
//   - no behavior change to execution flow:
//       this function only logs. The runtime classifier and INSERT
//       helper still consume env values exactly as before #52.
//   - minimal-diff:
//       single exported function + a few lines of boot-time invocation.
//
// Category name format rule:
//   Categories are matched against `AIResponse.category` after
//   uppercase normalization (see getApprovalRequiredCategories). A
//   well-formed label starts with a letter and contains only
//   [A-Z0-9_] — matching the convention surfaced in ai.ts systemPrompt
//   (ROAS_DROP, SPEND_SPIKE, CONVERSION_DROP, SCALING_OPPORTUNITY).
//   Categories that fail this shape are warned but NOT removed —
//   the runtime classifier still attempts an exact-match lookup
//   against normalized category, so a malformed label is harmless
//   (it just won't match anything the AI produces). The warn lets
//   the operator notice + fix.

const CATEGORY_LABEL_REGEX = /^[A-Z][A-Z0-9_]*$/

export function validateApprovalEnqueueConfig(): void {
  const tag = '[STARTUP][approvals]'

  // ── APPROVAL_REQUIRED_CATEGORIES ─────────────────────────────────────
  const rawCategories = process.env.APPROVAL_REQUIRED_CATEGORIES
  if (rawCategories !== undefined && rawCategories !== '') {
    const entries = rawCategories.split(',').map((s) => s.trim())
    const nonEmpty = entries.filter((s) => s.length > 0)

    if (nonEmpty.length === 0) {
      // Set to something parse-valid but produces zero categories
      // (e.g., "," or ",,," or "   "). Rule will be inactive even though
      // the operator clearly intended to activate it.
      console.warn(
        `${tag} APPROVAL_REQUIRED_CATEGORIES set (${JSON.stringify(rawCategories)}) ` +
          `but contains no non-empty entries after split + trim. ` +
          `Approval enqueue rule will be INACTIVE. ` +
          `Example: APPROVAL_REQUIRED_CATEGORIES=BUDGET_INCREASE,CAMPAIGN_LAUNCH`,
      )
    } else {
      const normalized = nonEmpty.map((s) => s.toUpperCase())

      // Check for duplicates (same label after normalization)
      const seen = new Set<string>()
      const duplicates: string[] = []
      for (const c of normalized) {
        if (seen.has(c)) duplicates.push(c)
        seen.add(c)
      }
      if (duplicates.length > 0) {
        console.warn(
          `${tag} APPROVAL_REQUIRED_CATEGORIES contains duplicate entries ` +
            `(after case-insensitive normalization): ${JSON.stringify(duplicates)}. ` +
            `Duplicates are harmless (Set dedup) but indicate likely typos.`,
        )
      }

      // Check each label's shape
      const malformed = normalized.filter((c) => !CATEGORY_LABEL_REGEX.test(c))
      if (malformed.length > 0) {
        console.warn(
          `${tag} APPROVAL_REQUIRED_CATEGORIES contains entries that do not ` +
            `match the expected category-label shape (uppercase alphanumeric + ` +
            `underscores, starting with a letter): ${JSON.stringify(malformed)}. ` +
            `These will not match any AI Output Contract category (which uses ` +
            `labels like BUDGET_INCREASE, CAMPAIGN_LAUNCH, ROAS_DROP). The ` +
            `entries will remain in the set but produce zero matches.`,
        )
      }

      // Informational: confirm how many categories the rule will check
      // against. Helps operators verify their env is being read.
      // eslint-disable-next-line no-console
      console.log(
        `${tag} approval enqueue rule ACTIVE with ${seen.size} unique ` +
          `categor${seen.size === 1 ? 'y' : 'ies'}: ` +
          `${Array.from(seen).sort().join(', ')}`,
      )
    }
  }
  // Unset/empty case is silent by design (preserves inactive default).

  // ── APPROVAL_MIN_CONFIDENCE ───────────────────────────────────────────
  const rawMinConfidence = process.env.APPROVAL_MIN_CONFIDENCE
  if (rawMinConfidence !== undefined && rawMinConfidence !== '') {
    const n = parseFloat(rawMinConfidence)
    if (isNaN(n)) {
      console.warn(
        `${tag} APPROVAL_MIN_CONFIDENCE is not a number ` +
          `(${JSON.stringify(rawMinConfidence)}). ` +
          `Runtime will fall back to 0 (any confidence enqueues). ` +
          `Expected: float between 0 and 1, e.g. APPROVAL_MIN_CONFIDENCE=0.7`,
      )
    } else if (n < 0 || n > 1) {
      console.warn(
        `${tag} APPROVAL_MIN_CONFIDENCE out of range ` +
          `(${n}; must be in [0, 1]). ` +
          `Runtime will fall back to 0. ` +
          `Note: AI Output Contract confidence_score is bounded [0, 1] ` +
          `(aiValidator.ts NEEDS_REVIEW_THRESHOLD = 0.7).`,
      )
    }
    // Valid value: silent.
  }

  // ── APPROVAL_ENQUEUE_NEEDS_REVIEW_ONLY ────────────────────────────────
  const rawNeedsReview = process.env.APPROVAL_ENQUEUE_NEEDS_REVIEW_ONLY
  if (rawNeedsReview !== undefined && rawNeedsReview !== '') {
    if (rawNeedsReview !== 'true' && rawNeedsReview !== 'false') {
      console.warn(
        `${tag} APPROVAL_ENQUEUE_NEEDS_REVIEW_ONLY has non-boolean value ` +
          `(${JSON.stringify(rawNeedsReview)}). ` +
          `Runtime treats anything other than 'true' as 'false'. ` +
          `Expected: 'true' or 'false' (lowercase). ` +
          `Current effective value: false.`,
      )
    }
    // Valid 'true' / 'false' is silent.
  }
}

// ─── Public classifier (pure; no side effects) ─────────────────────────

/**
 * Decide whether a validated AI decision should be enqueued for
 * operator approval. Pure function — no DB I/O. Caller invokes the
 * enqueue helper below when this returns true.
 *
 * Decision rule (all must hold to enqueue):
 *   1. response.category is a non-empty string
 *   2. category is in APPROVAL_REQUIRED_CATEGORIES env (case-insensitive)
 *   3. response.confidence_score >= APPROVAL_MIN_CONFIDENCE env
 *   4. (if APPROVAL_ENQUEUE_NEEDS_REVIEW_ONLY=true) response.status === 'needs_review'
 *
 * Empty APPROVAL_REQUIRED_CATEGORIES (default) makes this function
 * return false for every input — the enqueue rule is inactive out of
 * the box. This is the safe-no-op default per constraint #4.
 */
export function shouldEnqueueForApproval(response: AIResponse): boolean {
  if (!response.category || response.category.trim().length === 0) {
    return false
  }

  const required = getApprovalRequiredCategories()
  if (required.size === 0) {
    // No env-configured categories → rule inactive. Fast-path return.
    return false
  }

  if (!required.has(response.category.toUpperCase())) {
    return false
  }

  if (response.confidence_score < getMinConfidence()) {
    return false
  }

  if (getNeedsReviewOnly() && response.status !== 'needs_review') {
    return false
  }

  return true
}

// ─── Fire-and-forget enqueue helper ────────────────────────────────────

export interface EnqueueAIDecisionInput {
  org_id: string
  ai_decision_id: string
  category: string
  request_id?: string | null
}

/**
 * INSERT a `pending` approval_queue row for the given AI decision.
 * Fire-and-forget — failures log to stdout via [approvals-enqueue][req=...]
 * prefix; never propagate to the AI pipeline caller. Same observability-
 * only contract as recordAIUsage (#40) and the auto-fire hook (#23).
 *
 * Schema fields populated:
 *   org_id              = caller's authenticated org (NEVER from request body)
 *   ai_decision_id      = the just-persisted ai_decisions.id (NOT NULL FK)
 *   action_template_id  = (default NULL) — operator edits via SQL/ops
 *                          tooling OR future Decision Center FE before
 *                          approving. Notification-only approvals stay
 *                          NULL and dispatcher (#50) skips dispatch.
 *   action_params       = (default '{}')
 *   state               = (default 'pending')
 *   operator_note       = (default NULL)
 *   operator_user_id    = (default NULL — set on approve/reject)
 *   created_at          = (default now())
 *   updated_at          = (default now())
 */
export function enqueueAIDecisionForApproval(input: EnqueueAIDecisionInput): void {
  void supabaseAdmin
    .from('approval_queue')
    .insert({
      org_id: input.org_id,
      ai_decision_id: input.ai_decision_id,
      // action_template_id / action_params / state / operator_* / timestamps
      // all default per the migration's column defaults.
    })
    .then(
      ({ error }) => {
        if (error) {
          // Loud warn with request_id correlation per #48/#49 pattern.
          // Soft fail — the auto-fire chain (#23) is still running in
          // parallel and the AI decision row is already persisted.
          console.warn(
            `[approvals-enqueue][req=${input.request_id ?? 'no-request-id'}] ` +
              `enqueue failed org=${input.org_id} ai_decision=${input.ai_decision_id} ` +
              `category=${input.category} error=${error.message}`,
          )
        }
      },
      (err) => {
        console.warn(
          `[approvals-enqueue][req=${input.request_id ?? 'no-request-id'}] ` +
            `enqueue threw org=${input.org_id} ai_decision=${input.ai_decision_id} ` +
            `category=${input.category} error=${(err as Error)?.message ?? 'unknown'}`,
        )
      },
    )
}
