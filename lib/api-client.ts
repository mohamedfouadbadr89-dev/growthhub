export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
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

// Phase 6 Sub-pass B (continuation #13, 2026-05-08): detection-based unwrap
// for the canonical Phase 1 envelope (`backend/src/utils/response.ts`):
//   { success: true,  data: <T>,                    request_id }
//   { success: false, error: { message, code? },    request_id }
// Active hardened-surface routers (auth/ai/actions/history/campaigns/
// automation/creatives/brand-kit) all emit this shape. Phase 2 legacy
// shapes (`integrations.ts`, `connect.ts`, `metrics.ts` — bare arrays /
// `{error:'...'}` / `{error,message}`) lack the `success` key, so the
// detection skips them and they pass through unchanged (preserves
// PHASE2_ENVELOPE_FOLLOWUP deferral state).
function isCanonicalEnvelope(
  body: unknown,
): body is { success: boolean; data?: unknown; error?: { message?: string } } {
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
    // `body.message` (Phase 2 `{error,message}`) is the fallback. Final
    // fallback is HTTP statusText.
    const canonicalMsg = isCanonicalEnvelope(body)
      ? body.error?.message
      : undefined
    const legacyMsg = (body as { message?: string }).message
    const raw = canonicalMsg ?? legacyMsg ?? res.statusText
    throw new ApiError(res.status, friendlyMessage(res.status, raw))
  }

  const body = await res.json()
  // Auto-unwrap canonical-envelope success bodies. Phase 2 legacy shapes
  // (no `success` key) pass through raw — preserves backwards-compat with
  // the wired Phase 2 callers (integrations/page.tsx + dashboard
  // overview/channels) until PHASE2_ENVELOPE_FOLLOWUP lands.
  if (isCanonicalEnvelope(body) && body.success === true && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}
