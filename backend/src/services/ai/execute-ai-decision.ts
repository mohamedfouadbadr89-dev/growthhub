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
import { supabaseAdmin } from '../../lib/supabase.js'
import { evaluateRulesForAIDecision } from '../execution/automation-engine.js'

// ─── Types ────────────────────────────────────────────────────────────

export interface ExecuteAIDecisionInput {
  /** Server-side from request context (c.get('orgId')). NEVER from client. */
  org_id: string
  /** Server-side user id (Clerk sub) when present. Optional metadata. */
  user_id?: string
  /**
   * Outer per-HTTP-request correlator from tracingMiddleware
   * (c.get('requestId')). Stamped on every [AI] log line so an operator
   * can pivot from a single HTTP request's [req] envelope to all the
   * AI activity it triggered. Optional for non-HTTP orchestration paths.
   */
  request_id?: string
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
  // request_id (when present) provides outer per-HTTP-request correlation
  // alongside the per-AI-flow trace_id; both flow through the same `tag`
  // spread so all 5 emission sites below pick them up automatically.
  const tag = {
    trace_id,
    request_id: input.request_id,
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
      request_id: input.request_id,
      model: input.model,
      user_id: input.user_id,
    })

    // ── 7. usage observability (Phase 7 Sub-pass A1a, continuation #16) ──
    // Fire-and-forget log_ai_usage row. Observability ONLY — p_cost_credits=0
    // (no enforcement; deduct_credits gating is Sub-pass A1b scope per
    // operator authorization). Tokens passed as 0/0 because providerCall is
    // a provider-agnostic thunk returning `unknown`; extracting OpenRouter-
    // specific `usage.prompt_tokens` / `usage.completion_tokens` would couple
    // this orchestration to a specific provider (architecture invariant
    // documented at ExecuteAIDecisionInput.providerCall). Real token
    // extraction is deferred to Sub-pass A1b alongside cost-derivation.
    //
    // Failure handling: .then(noop, noop) swallows both success and DB
    // failure; the AI flow has already completed successfully and returned
    // its decision — observability writes never fail the user-facing path.
    // CONSTITUTION §3 "Fail Loudly" is preserved upstream by persistAIDecision
    // which throws on its own failure before this fire-and-forget runs.
    void supabaseAdmin
      .rpc('log_ai_usage', {
        p_org_id: input.org_id,
        p_user_id: input.user_id ?? null,
        p_model: input.model,
        p_tokens_in: 0,
        p_tokens_out: 0,
        p_cost_credits: 0,
        p_request_id: input.request_id ?? null,
        p_trace_id: trace_id,
        p_ai_decision_id: decision_id,
      })
      .then(
        () => null,
        () => null,
      )

    // ── 8. auto-fire automation rules (Phase 4/6 bridge, continuation #23) ──
    //
    // Operator-authorized post-persist hook. Closes the Decision → Action
    // loop per CLAUDE.md §1 ("AI thinks + decides + executes + learns")
    // and the "AUTO-FIRING on AI decision stream" governance-blocked item
    // tracked since Phase 4 Part 2 close (continuation #5).
    //
    // Path 3 (of the 3 governed paths identified at Phase 4 P2 close):
    // post-persist hook calling evaluateRulesForAIDecision. Selected over
    // (a) Phase 3 anomaly engine unlock (DEPRECATED) and
    // (b) AI Output Contract `result.category` schema extension
    //     (cross-phase change to closed Phase 3 ai_decisions schema).
    //
    // EXECUTION ORDERING GUARANTEE:
    //   1. AI response validation               (line ~205)
    //   2. ai_decisions INSERT committed        (line ~263, persistAIDecision)
    //   3. log_ai_usage fire-and-forget         (line ~287, observability)
    //   4. evaluateRulesForAIDecision fire-and-forget  ← THIS HOOK (line ~318)
    //   5. return decision to caller            (line ~325)
    //
    // FAILURE-ISOLATION GUARANTEE:
    //   - This hook runs AFTER decision_id is committed; the AI flow's
    //     primary-success contract (decision persisted + returned) is
    //     already met before any rule evaluation begins.
    //   - .then(noop, errorLog) swallows ALL automation failures —
    //     malformed rules / handler dispatch errors / external Meta/Google
    //     API failures / RLS denial / Vault timeouts / etc. — none of
    //     these can propagate up to the AI caller.
    //   - evaluateRulesForAIDecision itself catches per-rule errors
    //     internally (each rule still records an automation_runs row with
    //     status='failed' + error_message; the loop continues to the next
    //     rule). Only infrastructure-level errors (DB unreachable on
    //     ai_decisions / automation_rules SELECT) bubble up — those land
    //     in the .catch logger here for operator triage.
    //
    // IDEMPOTENCY-PRESERVATION:
    //   - executeAction (the canonical sole executor invoked transitively
    //     via fireRule) preserves its `(org_id, execution_id)` partial
    //     unique-index gate. Auto-fire dispatches do NOT supply
    //     execution_id (they intentionally always-run on every AI decision
    //     stream event matching their trigger), so the index acts only as
    //     a per-rule duplicate-protection safety net for retries within
    //     the same Inngest function attempt.
    //
    // ORG-ISOLATION:
    //   - input.org_id is forwarded directly. evaluateRulesForAIDecision
    //     scopes both the ai_decisions lookup AND the automation_rules
    //     query by orgId. RLS policies on both tables (org_id = jwt.org_id
    //     pattern) provide defense-in-depth — though service-role bypasses
    //     RLS, the explicit `.eq('org_id', orgId)` filter is the primary
    //     gate.
    //
    // CANONICAL-EXECUTOR INVARIANT:
    //   - executeAction remains the sole executor surface. This hook does
    //     NOT call provider APIs directly; it does NOT introduce a parallel
    //     execution engine; it does NOT bypass the actions_library
    //     template lookup. evaluateRulesForAIDecision → fireRule →
    //     executeAction is the established Phase 4 P2 chain.
    void evaluateRulesForAIDecision(input.org_id, decision_id)
      .then(
        (result) => {
          // Continuation #28 (2026-05-12) — item P observability-parity log.
          // Symmetric counterpart to the failure-branch logger below; closes
          // the asymmetric observability gap tracked since #23 (only the
          // FAILURE branch logged; SUCCESS runs were silent at the [AI]
          // console stream). NO behavior change; pure observability extension
          // of the existing #23 hook surface. Logged only when at least one
          // rule actually fired — silent for the (typical) no-match case so
          // we don't flood logs for every AI decision that doesn't match a
          // categorical rule trigger.
          if (result && result.rulesFired > 0) {
            // eslint-disable-next-line no-console
            console.log(
              `[AI] auto-fire automation rules fired=${result.rulesFired} ai_decision_id=${decision_id} org_id=${input.org_id} trace_id=${trace_id} run_ids=${JSON.stringify(result.runIds)}`,
            )
          }
        },
        (autoFireErr: unknown) => {
          // CONSTITUTION §3 "Fail Loudly" — automation infra failures
          // visible to operators via stdout. Does NOT propagate to caller.
          // eslint-disable-next-line no-console
          console.error(
            `[AI] auto-fire automation rules failed for ai_decision_id=${decision_id} org_id=${input.org_id} trace_id=${trace_id}: ${(autoFireErr as Error)?.message ?? 'unknown'}`,
          )
        },
      )

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
