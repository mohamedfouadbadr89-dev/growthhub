/**
 * Phase 0 — centralized structured request logger.
 *
 * SOURCE OF TRUTH:
 *  - SYSTEM_CONTROL.md "Phase 0 — Architecture Lock"
 *      Completion Conditions:
 *        ✔ كل request فيه tracing_id
 *        ✔ كل log فيه user_id + org_id
 *  - CONSTITUTION.md §3 "Fail Loudly" — emit on success AND failure paths.
 *
 * Replaces hono/logger()'s plain-text output with structured JSON lines:
 *
 *   [req] {"phase":"in",  "ts":..., "request_id":..., "method":"POST", "path":"/..."}
 *   [req] {"phase":"out", "ts":..., "request_id":..., "method":"POST", "path":"/...",
 *          "status":200, "latency_ms":42, "level":"info", "org_id":..., "user_id":...}
 *
 * Properties:
 *   - One line per phase. Two lines per request (in + out).
 *   - `request_id` comes from `tracingMiddleware` (must be installed earlier
 *     in the chain). If absent, logs `<missing>` rather than crashing.
 *   - `org_id` / `user_id` come from `authMiddleware` (set after auth runs).
 *     Public/unauthenticated routes (e.g. /health) emit them as null.
 *   - Level is derived from HTTP status:
 *       status >= 500 → 'error' → console.error
 *       status >= 400 → 'warn'  → console.warn
 *       else          → 'info'  → console.log
 *   - Body / headers / PII are NEVER included.
 *   - `safeStringify` survives circular refs and BigInt — logging cannot crash.
 *   - Wraps `next()` in try/finally so the exit log fires even when downstream
 *     middleware/handlers throw (the existing global error handler converts
 *     the throw into a 5xx response, status is read after).
 */

import { createMiddleware } from 'hono/factory'

export const requestLoggerMiddleware = createMiddleware<{
  Variables: {
    requestId?: string
    userId?: string
    orgId?: string
  }
}>(async (c, next) => {
  const t0 = Date.now()
  const requestId = c.get('requestId') ?? '<missing>'
  const method = c.req.method
  const path = c.req.path

  // eslint-disable-next-line no-console
  console.log(
    `[req] ${safeStringify({
      phase: 'in',
      ts: new Date().toISOString(),
      request_id: requestId,
      method,
      path,
    })}`,
  )

  let threwError = false
  try {
    await next()
  } catch (err) {
    threwError = true
    // Re-throw so Hono's onError handler converts it into a structured 5xx.
    // We just need the finally block to log the exit event.
    throw err
  } finally {
    const latency_ms = Date.now() - t0
    // If next() threw and Hono hasn't yet patched the response, c.res.status
    // may still be the default 200. Treat thrown errors as 5xx for the log
    // even if the response status hasn't been mutated yet.
    const rawStatus = c.res?.status ?? 200
    const status = threwError && rawStatus < 500 ? 500 : rawStatus

    const orgId = (c.get('orgId') as string | undefined) ?? null
    const userId = (c.get('userId') as string | undefined) ?? null

    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    const line = `[req] ${safeStringify({
      phase: 'out',
      ts: new Date().toISOString(),
      request_id: requestId,
      method,
      path,
      status,
      latency_ms,
      level,
      org_id: orgId,
      user_id: userId,
    })}`

    // eslint-disable-next-line no-console
    if (level === 'error') console.error(line)
    // eslint-disable-next-line no-console
    else if (level === 'warn') console.warn(line)
    // eslint-disable-next-line no-console
    else console.log(line)
  }
})

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>()
  try {
    return JSON.stringify(value, (_k, v) => {
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
