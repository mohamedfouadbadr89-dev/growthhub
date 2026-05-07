import type { ErrorHandler, Context } from 'hono'
import * as Sentry from '@sentry/node'

/**
 * Global Hono error handler.
 *
 * SOURCE OF TRUTH:
 *  - CONSTITUTION.md §3 "Fail Loudly" — every failure must produce a
 *    correlator the operator can pivot from sink to sink.
 *  - Phase 0 lock — `tracingMiddleware` mints a per-request UUID and
 *    sets `c.set('requestId', …)`; `requestLoggerMiddleware` emits
 *    structured `[req] in/out` log lines including the same `request_id`.
 *
 * This handler propagates that same `request_id` into THREE sinks:
 *
 *   1. Sentry event scope (tag: `request_id`)
 *      → Sentry → log aggregator pivot deterministic.
 *   2. stdout (`console.error`) prefix
 *      → PM2 / journald grep deterministic.
 *   3. JSON 500 response body (additive `request_id` field)
 *      → client-side / curl correlation deterministic; matches the
 *        `X-Request-ID` response header that `tracingMiddleware`
 *        already echoes.
 *
 * The original `err` object is preserved verbatim in the console.error
 * call so Node's native stack-trace formatting still fires.
 *
 * Body shape (Phase 1 envelope — backend/src/utils/response.ts):
 *   { "success": false,
 *     "error": { "message": "Internal Server Error" },
 *     "request_id": "..." }
 *
 * The `request_id` field is preserved at the top level (same position as
 * the X-Request-ID response header tracingMiddleware emits) so client
 * correlators continue to work without an envelope walk.
 */

Sentry.init({ dsn: process.env.SENTRY_DSN })

const getRequestId = (c: Context): string | null => {
  try {
    const v = c.get('requestId' as never) as unknown
    return typeof v === 'string' && v.length > 0 ? v : null
  } catch {
    // Context variable not set (e.g., handler invoked before tracing
    // middleware in some non-standard mount) — degrade to null rather
    // than crash inside the error handler itself.
    return null
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  const request_id = getRequestId(c)

  Sentry.withScope((scope) => {
    if (request_id) scope.setTag('request_id', request_id)
    Sentry.captureException(err)
  })

  // Preserve the full Error object reference so Node's native stack
  // formatter still runs in stdout. Prefix with request_id so PM2 /
  // journald grep can pivot from a Sentry event to the stack.
  // eslint-disable-next-line no-console
  console.error(`[err] request_id=${request_id ?? '<missing>'}`, err)

  // Canonical Phase 1 failure envelope. Cannot delegate to fail()
  // (utils/response.ts) here because that helper re-reads requestId
  // from the context — this handler has already resolved it once and
  // we want to preserve the resolved value in case the context get()
  // throws on a malformed chain. Body shape is identical.
  return c.json(
    {
      success: false,
      error: { message: 'Internal Server Error' },
      request_id,
    },
    500,
  )
}
