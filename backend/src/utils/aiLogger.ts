/**
 * AI Interaction Logging Layer — Phase 3 component.
 *
 * SOURCE OF TRUTH:
 *  - Phases.md Phase 3 → "Log every AI request + response", store
 *                        "prompt, response, model, latency".
 *  - SYSTEM_CONTROL.md  → AI logging is a Phase 3 completion-gate item.
 *  - CONSTITUTION.md §3 → "Fail Loudly" — every background job must
 *                          log its result (success/failed/skipped).
 *
 * ARCHITECTURE BOUNDARY (this file is PASSIVE only):
 *  - This module ONLY emits structured log events.
 *  - It MUST NOT execute AI calls.
 *  - It MUST NOT wrap, retry, or coordinate any flow.
 *  - It MUST NOT touch the database.
 *  - Lifecycle wiring (request → raw → validated/error) belongs to the
 *    AI Orchestration layer (Phase X), which will call into this logger.
 *
 * Surface:
 *  - Types:       AILogLevel, AILogPhase, AILogEntry, AILogSink
 *  - Emit:        logAIInteraction(entry)
 *  - Trace:       newTraceId()
 *  - Sink ctrl:   setAILogSink(sink), resetAILogSink()
 *
 * The logger NEVER throws. A sink failure falls through to a last-resort
 * console.error so a log line is always produced; absence is impossible.
 */

import { randomUUID } from 'node:crypto'
import type { AIResponse, AIValidationDetail } from './aiValidator.js'

// ─── Types ────────────────────────────────────────────────────────────

export type AILogLevel = 'info' | 'warn' | 'error'

export type AILogPhase =
  | 'request'
  | 'raw'
  | 'validated'
  | 'validation_error'
  | 'transport_error'
  // Emitted by the persistence layer (services/ai/persistence.ts).
  // Additive — passive logger semantics preserved; orchestration still
  // owns the lifecycle, this just gives it two more vocabulary entries.
  | 'persisted'
  | 'persistence_error'

export interface AILogEntry {
  trace_id: string
  ts: string
  phase: AILogPhase
  level: AILogLevel
  model: string
  /** Free-form label set by orchestration, e.g. "decision-explanation". */
  kind?: string
  org_id?: string
  user_id?: string
  /** Measured by orchestration — logger does not time anything. */
  latency_ms?: number
  prompt?: unknown
  raw?: unknown
  validated?: AIResponse
  error?: {
    code?: string
    name?: string
    message: string
    detail?: AIValidationDetail
  }
}

export type AILogSink = (entry: AILogEntry) => void

// ─── Default sink ─────────────────────────────────────────────────────

const defaultSink: AILogSink = (entry) => {
  const line = `[AI] ${safeStringify(entry)}`
  if (entry.level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line)
  } else if (entry.level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(line)
  } else {
    // eslint-disable-next-line no-console
    console.log(line)
  }
}

let currentSink: AILogSink = defaultSink

export function setAILogSink(sink: AILogSink): void {
  currentSink = sink
}

export function resetAILogSink(): void {
  currentSink = defaultSink
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Generate a correlation id for a single AI interaction.
 *
 * Pure utility — does NOT start a timer, allocate state, or open a
 * "context" object. Orchestration creates the id once per AI call and
 * threads it through the events it chooses to emit.
 */
export function newTraceId(): string {
  return randomUUID()
}

/**
 * Emit a single AI log event. Never throws.
 *
 * The caller is responsible for:
 *   - choosing the right `phase` and `level`,
 *   - measuring `latency_ms`,
 *   - generating / threading `trace_id` (use `newTraceId()`),
 *   - filling `org_id` / `user_id` from request context,
 *   - attaching `prompt`, `raw`, `validated`, or `error` as appropriate.
 *
 * If the sink itself throws, we fall back to `console.error` so a record
 * always reaches stderr. The original sink failure is reported alongside.
 */
export function logAIInteraction(entry: AILogEntry): void {
  try {
    currentSink(entry)
  } catch (sinkErr) {
    try {
      // eslint-disable-next-line no-console
      console.error(
        '[AI] log sink threw — falling back to console',
        (sinkErr as Error)?.message,
        safeStringify(entry),
      )
    } catch {
      /* truly unrecoverable — give up rather than crash the caller */
    }
  }
}

// ─── Internals ────────────────────────────────────────────────────────

/**
 * JSON.stringify that survives circular refs and BigInt without throwing.
 * Logging must never crash the caller.
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>()
  try {
    return JSON.stringify(value, (_key, v) => {
      if (typeof v === 'bigint') return `${v.toString()}n`
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v as object)) return '[Circular]'
        seen.add(v as object)
      }
      return v
    })
  } catch (err) {
    return `[unserializable: ${(err as Error)?.message ?? 'unknown'}]`
  }
}
