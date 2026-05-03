/**
 * Phase 0 — request tracing.
 *
 * SOURCE OF TRUTH:
 *  - SYSTEM_CONTROL.md "Phase 0 — Architecture Lock"
 *      Completion Condition: ✔ كل request فيه tracing_id
 *  - CONSTITUTION.md §3 "Fail Loudly" — every event must be locatable.
 *
 * Generates a per-HTTP-request identifier (UUID v4) and stores it in the
 * Hono request context as `requestId`. Echoed back to the client in the
 * `X-Request-ID` response header for client-side correlation.
 *
 * If the client sends an `X-Request-ID` header that already looks UUID-like,
 * we honor it (so an API gateway / front-end can propagate its own trace).
 * Anything not UUID-like is rejected and replaced with our own — prevents
 * log injection (control characters, newlines, very long values, etc.).
 *
 * Distinct from:
 *   - aiLogger.newTraceId()     → per-AI-flow id (one HTTP request can
 *                                  contain multiple AI flows)
 *   - decision_history.trace_id → links action execution back to ai_decisions
 *
 * The request_id is the OUTERMOST correlation id — one per HTTP request,
 * wrapping all AI flows / execution events that occur during the request.
 */

import { createMiddleware } from 'hono/factory'
import { randomUUID } from 'node:crypto'

const UUID_LIKE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

export const tracingMiddleware = createMiddleware<{
  Variables: { requestId: string }
}>(async (c, next) => {
  const incoming = c.req.header('X-Request-ID')
  const requestId =
    incoming && UUID_LIKE.test(incoming) ? incoming : randomUUID()

  c.set('requestId', requestId)
  c.header('X-Request-ID', requestId)

  await next()
})
