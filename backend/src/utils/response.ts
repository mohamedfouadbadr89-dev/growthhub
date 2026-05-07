/**
 * Phase 1 — Standard response envelope.
 *
 * SOURCE OF TRUTH:
 *   - PHASES.md Phase 1 ("Standard response format: { success, data, error }")
 *   - SYSTEM_CONTROL.md PATCH QUEUE position 4 (parallel-safe with Phase 0)
 *   - CONSTITUTION.md §3 "Fail Loudly" — every failure must carry request_id
 *
 * Wire shape (additive request_id from tracingMiddleware so the envelope is
 * self-correlating at the JSON layer, matching the X-Request-ID response
 * header that tracingMiddleware already emits and the request_id field
 * that errorHandler already writes on 5xx):
 *
 *   success:  { success: true,  data: <T>,                      request_id }
 *   failure:  { success: false, error: { message, ...extras },  request_id }
 *
 * The legacy mixed shapes that this helper replaces:
 *   - inline `c.json({ error: '...' }, 4xx)` (auth, actions, history, campaigns)
 *   - inline `c.json(result)` for success (campaigns list/get, history list/get)
 *   - `errorHandler` 500 body `{ error: 'Internal Server Error', request_id }`
 *   - `deferredPhase` 503 body `{ success: false, error: { phase, message, router }, request_id }`
 *   - `aiRouter` body `{ success, data | error: { phase, message, ... } }` (no request_id)
 *
 * All of those collapse onto the canonical shape here. Frontend
 * `lib/api-client.ts` consumes this exclusively (unwraps `data` on success;
 * surfaces `error.message` on failure).
 *
 * NOT a replacement for app.onError(errorHandler). 5xx-class infrastructure
 * failures still throw → errorHandler emits the canonical failure body
 * itself; routes do NOT call `fail()` for unhandled DB/transport errors
 * (CONSTITUTION §1.1 — operator-loud, client-sanitized).
 */

import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ApiSuccess<T> = {
  success: true
  data: T
  request_id: string | null
}

export type ApiFailure = {
  success: false
  error: { message: string } & Record<string, unknown>
  request_id: string | null
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

const getRequestId = (c: Context): string | null => {
  // Defensive read — tracingMiddleware mounts at app level (index.ts) and
  // runs before every route, so this is normally always populated. Match
  // the same defensive pattern used in errorHandler so a missing tracing
  // chain never crashes the response path itself.
  try {
    const v = c.get('requestId' as never) as unknown
    return typeof v === 'string' && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export function ok<T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200,
) {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    request_id: getRequestId(c),
  }
  return c.json(body, status)
}

export function fail(
  c: Context,
  message: string,
  status: ContentfulStatusCode,
  extras: Record<string, unknown> = {},
) {
  const body: ApiFailure = {
    success: false,
    error: { message, ...extras },
    request_id: getRequestId(c),
  }
  return c.json(body, status)
}
