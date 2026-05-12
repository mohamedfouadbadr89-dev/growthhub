export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    // Continuation #34 (2026-05-12) — request_id surfacing. Captured from
    // the canonical envelope's request_id field (Phase 1 envelope shape:
    // {success, data, error, request_id}). Allows operators / support to
    // quote the request_id when reporting an error, enabling backend log
    // pivot via [req]/[err]/[exec]/[AI] correlator chain (Phase 0 close).
    // Null for: pre-canonical legacy responses (defense-in-depth fallback);
    // connection-failure path (no response received).
    public readonly requestId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function friendlyMessage(status: number, fallback: string): string {
  if (status === 401) return 'Your session expired — please sign in again'
  if (status === 403) return 'Access Denied — contact your administrator'
  if (status === 404) return 'Resource not found'
  if (status >= 500) return 'Server error — try again in a few moments'
  return fallback
}

/**
 * formatErrorMessage — continuation #35 (2026-05-12).
 *
 * Opt-in helper for consumer catch blocks that want to surface the
 * backend request_id alongside the error message — enables operators
 * to quote the request_id when reporting errors to support, which
 * pivots into the backend [req]/[err]/[exec]/[AI] correlator chain
 * (Phase 0 close).
 *
 * Companion to ApiError.requestId (added #34). Consumers continue to
 * use plain `err.message` if they don't want request_id in user-facing
 * display; consumers that DO want it can call `formatErrorMessage(err)`
 * for the enriched form.
 *
 * Returns:
 *   - ApiError with requestId   → "<message> (request <id-prefix>…)"
 *   - ApiError without requestId → "<message>"
 *   - generic Error              → "<message>"
 *   - unknown                    → "Something went wrong"
 *
 * Note: requestId is truncated to 8 chars + ellipsis for readability;
 * the FULL request_id remains accessible via `(err as ApiError).requestId`
 * for support / log-pivot use cases.
 */
export function formatErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError) {
    const base = err.message || fallback
    if (err.requestId) {
      const shortId = err.requestId.slice(0, 8)
      return `${base} (request ${shortId}…)`
    }
    return base
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
}

// Phase 6 Sub-pass B (continuation #13, 2026-05-08): detection-based unwrap
// for the canonical Phase 1 envelope (`backend/src/utils/response.ts`):
//   { success: true,  data: <T>,                    request_id }
//   { success: false, error: { message, code? },    request_id }
// Active hardened-surface routers (12 routers post-continuation #31,
// 2026-05-12): auth / ai / actions / history / campaigns / automation /
// creatives / brand-kit / billing / integrations / connect / metrics —
// ALL emit this canonical shape. PHASE2_ENVELOPE_FOLLOWUP (item M)
// RESOLVED at #31: the Phase 2 routes (integrations / connect / metrics)
// that previously emitted legacy bare-array / `{error:'...'}` shapes
// were canonicalized onto Phase 1 ok()/fail(). Detection logic below
// still handles legacy shapes for defense-in-depth (zero-cost fallback;
// preserves backwards-compat with any future not-yet-canonical surface).
function isCanonicalEnvelope(
  body: unknown,
): body is { success: boolean; data?: unknown; error?: { message?: string }; request_id?: string | null } {
  return (
    !!body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'success' in (body as Record<string, unknown>)
  )
}

export async function apiClient<T = unknown>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!baseUrl) throw new Error('NEXT_PUBLIC_BACKEND_URL is not set')

  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string>),
      },
    })
  } catch {
    throw new ApiError(0, 'Connection failed — check your internet connection')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Canonical envelope error path (`error.message`) takes priority; legacy
    // `body.message` retained as defense-in-depth fallback for any future
    // not-yet-canonical surface (PHASE2_ENVELOPE_FOLLOWUP item M was the
    // last known legacy surface; resolved at #31). Final fallback HTTP statusText.
    const canonicalMsg = isCanonicalEnvelope(body)
      ? body.error?.message
      : undefined
    const legacyMsg = (body as { message?: string }).message
    const raw = canonicalMsg ?? legacyMsg ?? res.statusText
    // Continuation #34 — capture request_id from canonical envelope so
    // operators / support can quote it when reporting errors. Null for
    // legacy / non-canonical responses (defense-in-depth fallback).
    const requestId = isCanonicalEnvelope(body) ? body.request_id ?? null : null
    throw new ApiError(res.status, friendlyMessage(res.status, raw), requestId)
  }

  const body = await res.json()
  // Auto-unwrap canonical-envelope success bodies. Legacy-shape fallback
  // (no `success` key → pass-through raw) retained as defense-in-depth
  // for any future not-yet-canonical surface. PHASE2_ENVELOPE_FOLLOWUP
  // RESOLVED at #31 (2026-05-12); Phase 2 callers (integrations/page.tsx +
  // dashboard overview/channels) now consume canonical envelope through
  // the auto-unwrap path identically to all other wired Phase 4+ pages.
  if (isCanonicalEnvelope(body) && body.success === true && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}
