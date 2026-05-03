/**
 * AI Output Contract Validator — Phase 3 gate.
 *
 * SOURCE OF TRUTH:
 *  - CLAUDE.md §AI SYSTEM LAYERS  → AI Output Contract
 *  - Phases.md   Phase 3          → "AI responses MUST be validated before saving to DB",
 *                                    "Reject invalid AI output (no silent failures)",
 *                                    "If confidence_score < 0.7 → mark decision as needs_review"
 *  - CONSTITUTION.md §3           → "Fail Loudly"
 *  - SYSTEM_CONTROL.md HARD LOCK  → "AI MUST NOT write to DB before validation layer exists"
 *
 * Contract:
 *   {
 *     type:             "dashboard" | "insight" | "decision",
 *     result:           <any JSON value>,
 *     confidence_score: number,                          // finite, 0..1 inclusive
 *     reasoning_steps:  Array<{ step: string;            // non-empty
 *                                insight: string }>,     // non-empty; min length 1
 *     status:           "active" | "needs_review",       // DERIVED — see below
 *   }
 *
 * `reasoning_steps` records the AI's step-by-step rationale (Phases.md Phase 3
 * "Decision Engine — reasoning_steps (JSONB)"). It exists so every persisted
 * decision is auditable: every row carries WHY it was made, not just WHAT.
 *
 * `status` is DERIVED inside this layer, NEVER accepted from input:
 *     status === 'needs_review'   iff confidence_score <  NEEDS_REVIEW_THRESHOLD (0.7)
 *     status === 'active'         iff confidence_score >= NEEDS_REVIEW_THRESHOLD
 * If the input carries a `status` field it is ignored and recomputed —
 * the AI does not get to forge its own approval state. Phases.md Phase 3:
 * "If confidence_score < 0.7 → mark decision as needs_review."
 *
 * No persistence path may bypass `validateAIResponse` / `safeValidateAIResponse`.
 */

export const AI_OUTPUT_TYPES = ['dashboard', 'insight', 'decision'] as const
export type AIOutputType = (typeof AI_OUTPUT_TYPES)[number]

/**
 * Phases.md Phase 3: decisions with confidence_score < 0.7 are marked needs_review.
 * Single source of truth for the threshold across the codebase.
 */
export const NEEDS_REVIEW_THRESHOLD = 0.7

export const AI_DECISION_STATUSES = ['active', 'needs_review'] as const
export type AIDecisionStatus = (typeof AI_DECISION_STATUSES)[number]

/**
 * Single source of truth for the active/needs_review rule.
 *
 * Used by `validateAIResponse` (to populate `AIResponse.status`) AND by
 * `needsReview()` so the rule cannot drift between call sites. Any new
 * code that needs the active/needs_review verdict MUST go through
 * `deriveStatus` or read the already-derived `AIResponse.status`.
 */
export function deriveStatus(confidence_score: number): AIDecisionStatus {
  return confidence_score < NEEDS_REVIEW_THRESHOLD ? 'needs_review' : 'active'
}

/**
 * One entry in the AI's chain of thought. Both fields are required and
 * non-empty (after trim). The validator strips unknown keys so the
 * persisted shape is stable; that stripping is documented here, not silent.
 */
export interface ReasoningStep {
  step: string
  insight: string
}

export interface AIResponse {
  type: AIOutputType
  // `unknown` (not `any`) is intentional and CONSTITUTION-compliant:
  // the contract permits any JSON shape here — callers narrow after validation.
  result: unknown
  confidence_score: number
  reasoning_steps: ReasoningStep[]
  /**
   * DERIVED — never accepted from input. Always computed from
   * confidence_score via deriveStatus() inside the validator.
   * Callers cannot construct an AIResponse without going through the
   * validator, so this field is guaranteed consistent everywhere.
   */
  status: AIDecisionStatus
}

export interface AIValidationDetail {
  field: string
  reason: string
  received: unknown
}

/**
 * Typed error so callers can distinguish AI contract failures from
 * generic runtime errors and route them to the AI logging layer.
 */
export class AIValidationError extends Error {
  readonly code = 'AI_VALIDATION_FAILED' as const
  constructor(public readonly detail: AIValidationDetail) {
    super(`AI validation failed at "${detail.field}": ${detail.reason}`)
    this.name = 'AIValidationError'
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Throwing variant. Use inside services where an upstream try/catch or
 * Hono `onError` boundary will record the failure to AI logs.
 *
 * Throws AIValidationError on every contract violation. Never returns
 * a partially-valid object; never silently coerces.
 */
export function validateAIResponse(input: unknown): AIResponse {
  if (input === null || input === undefined) {
    throw new AIValidationError({
      field: '<root>',
      reason: 'AI response is null or undefined',
      received: input,
    })
  }

  if (!isPlainObject(input)) {
    throw new AIValidationError({
      field: '<root>',
      reason: 'AI response must be a JSON object',
      received: Array.isArray(input) ? 'array' : typeof input,
    })
  }

  const { type, result, confidence_score, reasoning_steps } = input

  if (
    typeof type !== 'string' ||
    !(AI_OUTPUT_TYPES as readonly string[]).includes(type)
  ) {
    throw new AIValidationError({
      field: 'type',
      reason: `must be one of ${AI_OUTPUT_TYPES.join(' | ')}`,
      received: type,
    })
  }

  if (result === undefined) {
    throw new AIValidationError({
      field: 'result',
      reason: 'must be present',
      received: result,
    })
  }

  if (typeof confidence_score !== 'number' || !Number.isFinite(confidence_score)) {
    throw new AIValidationError({
      field: 'confidence_score',
      reason: 'must be a finite number',
      received: confidence_score,
    })
  }

  if (confidence_score < 0 || confidence_score > 1) {
    throw new AIValidationError({
      field: 'confidence_score',
      reason: 'must be between 0 and 1 inclusive',
      received: confidence_score,
    })
  }

  const normalizedSteps = validateReasoningSteps(reasoning_steps)

  // `status` is intentionally NOT destructured from `input`. It is
  // recomputed from confidence_score so the AI cannot forge its own
  // approval state. See header comment: "DERIVED — never accepted from input".
  return {
    type: type as AIOutputType,
    result,
    confidence_score,
    reasoning_steps: normalizedSteps,
    status: deriveStatus(confidence_score),
  }
}

/**
 * Validates the `reasoning_steps` field of an AI response.
 *
 * Rules (all enforced — no silent coercion, no empty-string acceptance):
 *   - must be an array
 *   - must contain at least one step
 *   - each element must be a plain object
 *   - each element's `step` must be a non-empty string (after trim)
 *   - each element's `insight` must be a non-empty string (after trim)
 *
 * Returns a normalized array containing ONLY the contract fields
 * (`step`, `insight`); any extra keys on the input are stripped so
 * what gets persisted matches the schema exactly. Stripping is
 * documented behavior, not a silent failure — invalid contract
 * fields still throw.
 *
 * Field paths in errors use `reasoning_steps[i].step` etc. so AI
 * logger callers can pinpoint the offending element.
 */
function validateReasoningSteps(input: unknown): ReasoningStep[] {
  if (!Array.isArray(input)) {
    throw new AIValidationError({
      field: 'reasoning_steps',
      reason: 'must be an array',
      received:
        input === undefined ? 'undefined' :
        input === null ? 'null' :
        typeof input,
    })
  }

  if (input.length === 0) {
    throw new AIValidationError({
      field: 'reasoning_steps',
      reason: 'must contain at least one step',
      received: input,
    })
  }

  const out: ReasoningStep[] = []
  for (let i = 0; i < input.length; i++) {
    const entry: unknown = input[i]
    if (!isPlainObject(entry)) {
      throw new AIValidationError({
        field: `reasoning_steps[${i}]`,
        reason: 'must be a JSON object',
        received:
          Array.isArray(entry) ? 'array' :
          entry === null ? 'null' :
          typeof entry,
      })
    }

    const { step, insight } = entry

    if (typeof step !== 'string' || step.trim().length === 0) {
      throw new AIValidationError({
        field: `reasoning_steps[${i}].step`,
        reason: 'must be a non-empty string',
        received: step,
      })
    }

    if (typeof insight !== 'string' || insight.trim().length === 0) {
      throw new AIValidationError({
        field: `reasoning_steps[${i}].insight`,
        reason: 'must be a non-empty string',
        received: insight,
      })
    }

    out.push({ step, insight })
  }

  return out
}

/**
 * Discriminated-union variant. Use at API edges that already have a
 * structured error path and prefer no exceptions. Cannot be ignored
 * silently — TypeScript forces the caller to narrow on `ok`.
 */
export type AIValidationResult =
  | { ok: true; value: AIResponse }
  | { ok: false; error: AIValidationDetail }

export function safeValidateAIResponse(input: unknown): AIValidationResult {
  try {
    return { ok: true, value: validateAIResponse(input) }
  } catch (e) {
    if (e instanceof AIValidationError) return { ok: false, error: e.detail }
    throw e
  }
}

/**
 * Phases.md Phase 3: "If confidence_score < 0.7 → mark decision as needs_review".
 *
 * Reads the already-derived `status` field rather than re-applying the
 * threshold — this keeps the rule in exactly ONE place (`deriveStatus`).
 * Either function works as the predicate; both will always agree.
 */
export function needsReview(response: AIResponse): boolean {
  return response.status === 'needs_review'
}
