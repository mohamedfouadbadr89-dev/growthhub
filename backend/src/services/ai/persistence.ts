/**
 * AI Persistence Layer — Phase 3.
 *
 * SOURCE OF TRUTH:
 *  - CLAUDE.md §3        → "All DB queries go through Backend API",
 *                          "service_role_key lives on Backend only",
 *                          org_id mandatory on every query.
 *  - CLAUDE.md §AI       → AI Output Contract (validation gate is upstream).
 *  - CONSTITUTION.md §1  → never query DB without org_id, never bypass auth,
 *                          never write to DB from frontend.
 *  - CONSTITUTION.md §3  → Fail Loudly; never silent on errors.
 *  - Phases.md Phase 3   → "AI responses MUST be validated before saving to DB"
 *                          "Log every AI request + response …
 *                           Store: prompt, response, model, latency."
 *  - SYSTEM_CONTROL.md   → HARD LOCK lifted now that validation + logging exist.
 *
 * Architectural rules enforced HERE:
 *
 *   1. Inputs require a fully-validated AIResponse — TypeScript blocks
 *      construction of one outside the validator, so unvalidated payloads
 *      can't reach the INSERT.
 *
 *   2. `org_id` is ALWAYS provided by the caller from server-side request
 *      context (Hono c.get('orgId') after authMiddleware). It is NEVER
 *      read from the AIResponse, the prompt, or any client field.
 *
 *   3. Persistence emits its OWN log entries via the passive logger:
 *        - 'persisted'           on successful insert
 *        - 'persistence_error'   on any failure
 *      The log is emitted AFTER the DB call returns, so even if the DB
 *      throws, the failure is recorded; the original validated_response
 *      log entry (emitted upstream by orchestration) is independent and
 *      already on disk before this function runs.
 *
 *   4. Persistence NEVER swallows errors. DB failures rethrow so the
 *      caller can roll back / alert / surface a 5xx.
 *
 *   5. This module does NOT execute AI calls, run validation, or wire
 *      the logger sink. Those are orchestration concerns (Phase X).
 */

import { supabaseAdmin } from '../../lib/supabase.js'
import { logAIInteraction, type AILogEntry } from '../../utils/aiLogger.js'
import type { AIResponse } from '../../utils/aiValidator.js'

// ─── Types ────────────────────────────────────────────────────────────

export interface PersistAIDecisionInput {
  /** A validated AI Output Contract row. Type system blocks unvalidated payloads. */
  response: AIResponse
  /** Server-side, from auth context. NEVER from client input. */
  org_id: string
  /** Correlation id from aiLogger.newTraceId(); links to ai_logs rows. */
  trace_id: string
  /** Optional — for downstream observability when orchestration has it. */
  model?: string
  user_id?: string
}

export interface PersistAILogInput {
  /** Server-side, from auth context. */
  org_id: string
  /** Pre-built log entry from aiLogger (orchestration assembles it). */
  entry: AILogEntry
}

export interface PersistAIDecisionResult {
  id: string
}

export interface PersistAILogResult {
  id: string
}

// ─── ai_decisions ─────────────────────────────────────────────────────

/**
 * Insert a validated AIResponse into ai_decisions.
 *
 * - Type system enforces the validation gate (input.response is AIResponse).
 * - org_id is taken from the SERVER-SIDE caller context only.
 * - On success: emits a 'persisted' info log carrying the new row id.
 * - On failure: emits a 'persistence_error' error log AND rethrows so
 *   the caller can surface the failure (CONSTITUTION §3 "Fail Loudly").
 */
export async function persistAIDecision(
  input: PersistAIDecisionInput,
): Promise<PersistAIDecisionResult> {
  // org_id sanity — defense in depth. Caller is supposed to inject from
  // c.get('orgId'); if it's empty here, that's a programmer error and
  // we fail loudly rather than write a row without org isolation.
  if (!input.org_id || typeof input.org_id !== 'string') {
    const err = new Error(
      'persistAIDecision: org_id missing or invalid — refusing to write',
    )
    logAIInteraction(buildPersistenceErrorLog({
      org_id: input.org_id ?? '<missing>',
      trace_id: input.trace_id,
      model: input.model ?? '<unknown>',
      user_id: input.user_id,
      error: err,
    }))
    throw err
  }

  // service_role bypasses RLS by design; this is the ONLY path that writes
  // ai_decisions, so org isolation is enforced by the explicit org_id
  // value we just validated above (not by RLS, not by client claim).
  const { data, error } = await supabaseAdmin
    .from('ai_decisions')
    .insert({
      org_id: input.org_id,
      type: input.response.type,
      result: input.response.result,
      confidence_score: input.response.confidence_score,
      status: input.response.status,
      reasoning_steps: input.response.reasoning_steps,
      trace_id: input.trace_id,
    })
    .select('id')
    .single()

  if (error || !data) {
    const wrapped = error
      ? new Error(`persistAIDecision: ${error.message}`)
      : new Error('persistAIDecision: insert returned no row')
    logAIInteraction(buildPersistenceErrorLog({
      org_id: input.org_id,
      trace_id: input.trace_id,
      model: input.model ?? '<unknown>',
      user_id: input.user_id,
      error: wrapped,
    }))
    throw wrapped
  }

  logAIInteraction({
    trace_id: input.trace_id,
    ts: new Date().toISOString(),
    phase: 'persisted',
    level: 'info',
    model: input.model ?? '<unknown>',
    org_id: input.org_id,
    user_id: input.user_id,
    validated: input.response,
  })

  return { id: data.id as string }
}

// ─── ai_logs ──────────────────────────────────────────────────────────

/**
 * Persist a single AILogEntry into ai_logs.
 *
 * This is the DB sink used by the orchestration layer when it wires
 * `setAILogSink(...)` to fan-out console + DB. Calling this directly is
 * also fine for one-off captures.
 *
 * IMPORTANT: this function does NOT call logAIInteraction on its own
 * success path — that would create infinite recursion if it were the
 * sink. On failure it emits a `persistence_error` via the IN-PROCESS
 * console fallback (logAIInteraction → default sink → console.error)
 * so the failure is still visible even if the caller has no other sink.
 *
 * The entry is carried verbatim where the DB shape allows. Fields not
 * present in the entry (e.g. `prompt` on a `validated` event) become
 * NULL, which the schema allows.
 */
export async function persistAILog(
  input: PersistAILogInput,
): Promise<PersistAILogResult> {
  if (!input.org_id || typeof input.org_id !== 'string') {
    const err = new Error(
      'persistAILog: org_id missing or invalid — refusing to write',
    )
    // Fall back to console-only — re-emitting to the configured sink
    // would re-enter THIS function if the sink is the DB sink.
    // eslint-disable-next-line no-console
    console.error(`[AI] persistAILog org_id missing — ${err.message}`)
    throw err
  }

  const { entry } = input

  const { data, error } = await supabaseAdmin
    .from('ai_logs')
    .insert({
      org_id: input.org_id,
      trace_id: entry.trace_id,
      phase: entry.phase,
      model: entry.model,
      // JSONB columns — undefined values become NULL in the row.
      prompt: entry.prompt ?? null,
      raw_response: entry.raw ?? null,
      validated_response: entry.validated ?? null,
      latency_ms: entry.latency_ms ?? null,
      error: entry.error ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    const message = error
      ? `persistAILog: ${error.message}`
      : 'persistAILog: insert returned no row'
    // Console-only — see comment above on recursion risk.
    // eslint-disable-next-line no-console
    console.error(`[AI] ${message} (trace_id=${entry.trace_id} phase=${entry.phase})`)
    throw new Error(message)
  }

  return { id: data.id as string }
}

// ─── Internals ────────────────────────────────────────────────────────

function buildPersistenceErrorLog(args: {
  org_id: string
  trace_id: string
  model: string
  user_id?: string
  error: Error
}): AILogEntry {
  return {
    trace_id: args.trace_id,
    ts: new Date().toISOString(),
    phase: 'persistence_error',
    level: 'error',
    model: args.model,
    org_id: args.org_id,
    user_id: args.user_id,
    error: {
      name: args.error.name,
      message: args.error.message,
    },
  }
}
