/**
 * Phase 3 — Unified AI execution flow.
 *
 * Glue function that ties the three Phase 3 components — validator,
 * passive logger, and persistence — into one controlled top-to-bottom
 * call. Without this, every consumer would compose the three by hand
 * and the failure-ordering rules from Phases.md Phase 3 would drift.
 *
 * SOURCE OF TRUTH:
 *  - CLAUDE.md §AI SYSTEM LAYERS  → AI Output Contract
 *  - CLAUDE.md §3                 → org_id mandatory, server-side only;
 *                                    backend is single writer.
 *  - CONSTITUTION.md §1           → never bypass auth, never query DB
 *                                    without org_id, fail loudly.
 *  - CONSTITUTION.md §3           → "Fail Loudly" — every step's failure
 *                                    must produce a log entry before the
 *                                    error reaches the caller.
 *  - Phases.md Phase 3            → "Log every AI request + response …
 *                                    AI responses MUST be validated
 *                                    before saving to DB … Reject invalid
 *                                    AI output (no silent failures)."
 *  - SYSTEM_CONTROL.md            → HARD LOCK requires validation layer
 *                                    before DB writes. This function is
 *                                    the only sanctioned producer of
 *                                    persistAIDecision inputs.
 *
 * SCOPE — what this file is NOT:
 *  - NOT MCP / tool governance (Phase X concern)
 *  - NOT a DB-sink fan-out for ai_logs (Phase X concern)
 *  - NOT retry / backoff (caller's responsibility)
 *  - NOT streaming (single-shot Promise<unknown> from the provider thunk)
 *
 * Lifecycle (strict order):
 *
 *     emit  "request"        ─ before the provider call
 *     time  provider thunk   ─ caller-supplied async () => unknown
 *       throws ─→ emit "transport_error" ─→ throw AIPipelineError('transport')
 *       resolves ─→ continue
 *     emit  "raw"             ─ unmodified provider payload
 *     run   validateAIResponse
 *       throws ─→ emit "validation_error" ─→ throw AIPipelineError('validation')
 *     emit  "validated"       ─ contract-conformant AIResponse
 *     run   persistAIDecision ─ this emits its own "persisted" / "persistence_error"
 *       throws ─→ throw AIPipelineError('persistence')
 *     return { trace_id, decision_id, response }
 *
 * Confidence logic is already centralised inside the validator (it derives
 * AIResponse.status from confidence_score via deriveStatus). The validated
 * response carries the canonical 'active' / 'needs_review' value, and the
 * persistence layer writes that field verbatim. No extra confidence math
 * happens here — single source of truth preserved.
 */

import { validateAIResponse, AIValidationError, type AIResponse } from '../../utils/aiValidator.js'
import { logAIInteraction, newTraceId } from '../../utils/aiLogger.js'
import { persistAIDecision } from './persistence.js'

// ─── Types ────────────────────────────────────────────────────────────

export interface ExecuteAIDecisionInput {
  /** Server-side from request context (c.get('orgId')). NEVER from client. */
  org_id: string
  /** Server-side user id (Clerk sub) when present. Optional metadata. */
  user_id?: string
  /** Model identifier — stamped on every log entry and persisted. */
  model: string
  /** Free-form label for what kind of AI call this is. e.g. "decision-explanation". */
  kind?: string
  /**
   * Prompt payload as it was sent to the provider. Recorded verbatim
   * in the "request" log entry — JSONB on disk, so any JSON shape works.
   */
  prompt: unknown
  /**
   * The actual provider call, presented as a thunk so this function can:
   *   1. emit the "request" log before invoking it,
   *   2. measure latency around it,
   *   3. catch transport errors without coupling to a specific client,
   *   4. be unit-tested with a stubbed thunk.
   * Must resolve to an unknown payload — validation is performed here, not by the thunk.
   */
  providerCall: () => Promise<unknown>
}

export interface ExecuteAIDecisionResult {
  /** Correlation id for the entire AI call lifecycle (links ai_logs rows). */
  trace_id: string
  /** Primary key of the row inserted into ai_decisions. */
  decision_id: string
  /** The validated AIResponse (already includes derived status, reasoning_steps, etc.). */
  response: AIResponse
}

/**
 * Typed pipeline error so callers can distinguish failure phases without
 * re-parsing string messages. The original cause is preserved.
 */
export class AIPipelineError extends Error {
  readonly code = 'AI_PIPELINE_FAILED' as const
  constructor(
    public readonly phase: 'transport' | 'validation' | 'persistence',
    public readonly trace_id: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${phase}] ${message}`)
    this.name = 'AIPipelineError'
  }
}

// ─── Public entry point ──────────────────────────────────────────────

/**
 * Run the full Phase 3 AI flow for a single decision.
 *
 * Caller is responsible for:
 *   - obtaining org_id (and optionally user_id) from the authenticated
 *     Hono request context BEFORE calling this function;
 *   - constructing the providerCall thunk (i.e. the actual OpenRouter
 *     call), which this function will await once.
 *
 * On success, returns the trace_id, the persisted ai_decisions.id, and
 * the validated AIResponse. On any failure, an AIPipelineError is thrown
 * AFTER the corresponding log entry has been emitted; the audit trail
 * is therefore complete even if the caller does nothing with the error.
 */
export async function executeAIDecision(
  input: ExecuteAIDecisionInput,
): Promise<ExecuteAIDecisionResult> {
  // Server-side org_id sanity (defense in depth — auth middleware already enforces).
  if (!input.org_id || typeof input.org_id !== 'string') {
    throw new Error(
      'executeAIDecision: org_id is required and must come from server-side request context',
    )
  }

  const trace_id = newTraceId()

  // Common fields stamped on every log entry for this trace.
  const tag = {
    trace_id,
    model: input.model,
    kind: input.kind,
    org_id: input.org_id,
    user_id: input.user_id,
  } as const

  // ── 1. request ────────────────────────────────────────────────────
  logAIInteraction({
    ...tag,
    ts: new Date().toISOString(),
    phase: 'request',
    level: 'info',
    prompt: input.prompt,
  })

  // ── 2. provider call (timed) ──────────────────────────────────────
  const t0 = Date.now()
  let raw: unknown
  try {
    raw = await input.providerCall()
  } catch (err) {
    const latency_ms = Date.now() - t0
    const e = err as Error
    logAIInteraction({
      ...tag,
      ts: new Date().toISOString(),
      phase: 'transport_error',
      level: 'error',
      latency_ms,
      error: { name: e?.name ?? 'Error', message: e?.message ?? String(err) },
    })
    throw new AIPipelineError(
      'transport',
      trace_id,
      e?.message ?? 'provider call failed',
      err,
    )
  }
  const latency_ms = Date.now() - t0

  // ── 3. raw ────────────────────────────────────────────────────────
  logAIInteraction({
    ...tag,
    ts: new Date().toISOString(),
    phase: 'raw',
    level: 'info',
    latency_ms,
    raw,
  })

  // ── 4. validate ───────────────────────────────────────────────────
  let validated: AIResponse
  try {
    validated = validateAIResponse(raw)
  } catch (err) {
    if (err instanceof AIValidationError) {
      logAIInteraction({
        ...tag,
        ts: new Date().toISOString(),
        phase: 'validation_error',
        level: 'warn',
        latency_ms,
        raw,
        error: {
          code: err.code,
          name: err.name,
          message: err.message,
          detail: err.detail,
        },
      })
      throw new AIPipelineError('validation', trace_id, err.message, err)
    }

    // Unexpected non-validation error from inside the validator code path.
    const e = err as Error
    logAIInteraction({
      ...tag,
      ts: new Date().toISOString(),
      phase: 'validation_error',
      level: 'error',
      latency_ms,
      raw,
      error: { name: e?.name ?? 'Error', message: e?.message ?? String(err) },
    })
    throw new AIPipelineError(
      'validation',
      trace_id,
      `validator threw unexpectedly: ${e?.message ?? String(err)}`,
      err,
    )
  }

  // ── 5. validated ──────────────────────────────────────────────────
  // Confidence-derived status is already computed inside the validator
  // (AIResponse.status). No extra logic needed here.
  logAIInteraction({
    ...tag,
    ts: new Date().toISOString(),
    phase: 'validated',
    level: 'info',
    latency_ms,
    validated,
  })

  // ── 6. persist ────────────────────────────────────────────────────
  // persistAIDecision emits its own 'persisted' / 'persistence_error'
  // log entries; orchestration does NOT duplicate them here.
  // Type system enforces that only a validated AIResponse can flow in.
  try {
    const { id: decision_id } = await persistAIDecision({
      response: validated,
      org_id: input.org_id,
      trace_id,
      model: input.model,
      user_id: input.user_id,
    })
    return { trace_id, decision_id, response: validated }
  } catch (err) {
    const e = err as Error
    throw new AIPipelineError(
      'persistence',
      trace_id,
      e?.message ?? 'persistence failed',
      err,
    )
  }
}
