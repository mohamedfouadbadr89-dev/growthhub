import { Hono } from 'hono'
import {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  pushCampaign,
} from '../../services/campaigns/campaigns.js'
import { generateAiSuggestions } from '../../services/campaigns/ai-suggestions.js'
import { ok, fail } from '../../utils/response.js'

// requestId is set by tracingMiddleware mounted at app level (index.ts).
// Declaring it here makes c.get('requestId') type-safe so the campaigns
// push route can pass it through pushCampaign → executeAction.
type Variables = { userId: string; orgId: string; orgRole?: string; requestId: string }

export const campaignsRouter = new Hono<{ Variables: Variables }>()

const VALID_PLATFORMS = new Set(['meta', 'google'])
const VALID_STATUSES  = new Set(['all', 'draft', 'active', 'paused', 'completed', 'archived'])
const MAX_LIMIT = 100

// Canonical UUID-shape matcher. Mirrors backend/src/middleware/tracing.ts:30
// and backend/src/routes/v1/actions.ts:21 for cross-module consistency.
// Used to gate `:id` path parameters on this router (campaigns.id is UUID
// PRIMARY KEY per 20260503100000_phase3_close_campaigns_schema.sql:28).
// Without this, a non-UUID path segment (e.g. broken bookmark
// `/campaigns/abc-123`) reaches `.eq('id', 'abc-123').single()` →
// 22P02 → uncaught → 500. Validating up-front converts the cryptic 500
// into a canonical 400 + `code: 'INVALID_TYPE'` + `field: 'id'`.
const UUID_LIKE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

// GET /campaigns — list with 30-day aggregated metrics
campaignsRouter.get('/', async (c) => {
  const orgId  = c.get('orgId')
  const status  = c.req.query('status')
  const platform = c.req.query('platform')

  if (status && !VALID_STATUSES.has(status)) {
    return fail(c, `Invalid status filter: ${status}`, 400, { code: 'INVALID_FILTER', field: 'status' })
  }
  if (platform && !VALID_PLATFORMS.has(platform)) {
    return fail(c, `Invalid platform filter: ${platform}`, 400, { code: 'INVALID_FILTER', field: 'platform' })
  }

  const rawLimit  = parseInt(c.req.query('limit')  ?? '50', 10)
  const rawOffset = parseInt(c.req.query('offset') ?? '0', 10)
  const limit  = Math.min(Math.max(1, isNaN(rawLimit)  ? 50 : rawLimit),  MAX_LIMIT)
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

  try {
    const result = await listCampaigns(orgId, { status, platform, limit, offset })
    return ok(c, result)
  } catch (err) {
    // Pre-fix: catch + console.error + return generic 500 — bypassed
    // app.onError(errorHandler), breaking the established correlator chain
    // (no request_id in body, no Sentry event, no stdout [err] line with
    // request_id). Throw → errorHandler sanitizes + correlates per
    // CONSTITUTION §3 "Log errors to Sentry in production".
    throw err
  }
})

// POST /campaigns — create new campaign record
campaignsRouter.post('/', async (c) => {
  const orgId = c.get('orgId')
  let body: Record<string, unknown>
  try {
    // Defense-in-depth body-shape validation. Mirrors the canonical
    // pattern in routes/v1/ai.ts: parse the body, then narrow to a
    // plain object before any property access. Without the shape check,
    // `null` / `[]` / primitive bodies cause downstream `body.name`
    // accesses to throw → uncaught → errorHandler 500. The shape check
    // converts every malformed-body case into a canonical 400 envelope.
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return fail(c, 'name is required', 400, { code: 'MISSING_PARAMETER', field: 'name' })
  }
  if (!body.platform || typeof body.platform !== 'string') {
    return fail(c, 'platform is required', 400, { code: 'MISSING_PARAMETER', field: 'platform' })
  }
  if (!VALID_PLATFORMS.has(body.platform)) {
    return fail(c, 'Invalid platform. Must be one of: meta, google', 400, { code: 'INVALID_FILTER', field: 'platform' })
  }

  // Optional-field strict type validation (cross-route parity with PATCH
  // /:id from the prior turn). Pre-fix the inline ternaries inside
  // createCampaign() were:
  //   - daily_budget: `typeof === 'number'` → accepts NaN/Infinity
  //     (typeof NaN === 'number'); JSON.stringify(NaN) = null → DB
  //     silently stores null on `?daily_budget=NaN`. Negative values
  //     also passed through (no CHECK on column).
  //   - targeting: `typeof === 'object' && !== null` → accepts arrays
  //     (`typeof [] === 'object'`, `[] !== null`). DB then stores the
  //     array as JSONB — shape contract drift.
  // Strict validation here matches the PATCH handler's pattern verbatim
  // (Number.isFinite + non-negative for numerics; object + !==null +
  // !Array.isArray for object types). Frontend already pre-validates
  // these for the wired Save Draft path; this is defense-in-depth for
  // direct API clients (curl/Postman/future UI wiring) and closes the
  // POST↔PATCH symmetry gap on the same resource.
  let validatedDailyBudget: number | undefined
  if (body.daily_budget !== undefined) {
    if (
      typeof body.daily_budget !== 'number' ||
      !Number.isFinite(body.daily_budget) ||
      body.daily_budget < 0
    ) {
      return fail(c, 'daily_budget must be a non-negative finite number', 400, {
        code: 'INVALID_TYPE',
        field: 'daily_budget',
      })
    }
    validatedDailyBudget = body.daily_budget
  }

  let validatedTargeting: Record<string, unknown> | undefined
  if (body.targeting !== undefined) {
    if (
      typeof body.targeting !== 'object' ||
      body.targeting === null ||
      Array.isArray(body.targeting)
    ) {
      return fail(c, 'targeting must be a non-null object', 400, {
        code: 'INVALID_TYPE',
        field: 'targeting',
      })
    }
    validatedTargeting = body.targeting as Record<string, unknown>
  }

  let validatedAdAccountId: string | undefined
  if (body.ad_account_id !== undefined) {
    // `campaigns.ad_account_id` is UUID typed per migration
    // 20260503100000_phase3_close_campaigns_schema.sql:36. Pre-fix this
    // validation only checked `typeof === 'string' && !empty` — a
    // malformed string like "abc-123" would pass, reach `.insert(...)`,
    // and trigger Postgres 22P02 → uncaught → cryptic 500. Adding the
    // UUID_LIKE regex check closes the last remaining body-UUID gap on
    // the active write surface (matching the actions execute body-UUID
    // validation pattern + the 7 path-UUID gates from the prior turn).
    if (
      typeof body.ad_account_id !== 'string' ||
      !UUID_LIKE.test(body.ad_account_id)
    ) {
      return fail(c, 'ad_account_id must be a valid UUID', 400, {
        code: 'INVALID_TYPE',
        field: 'ad_account_id',
      })
    }
    validatedAdAccountId = body.ad_account_id
  }

  try {
    // Phase 1 audit-column population: c.get('userId') is the Clerk JWT
    // subject, set by authMiddleware before this handler runs. Threaded
    // into the service so created_by / updated_by are stamped server-side
    // — never read from the body.
    const campaign = await createCampaign(orgId, {
      name:         body.name.trim(),
      platform:     body.platform,
      daily_budget: validatedDailyBudget,
      ad_account_id: validatedAdAccountId,
      targeting:    validatedTargeting,
    }, c.get('userId'))
    return ok(c, campaign, 201)
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === 'CONFLICT') return fail(c, e.message, 409, { code: 'CONFLICT' })
    // Internal/infrastructure error — let errorHandler sanitize + correlate
    // (Sentry tag, stdout [err] with request_id, sanitized 500 body).
    throw err
  }
})

// GET /campaigns/:id — campaign detail with metrics + decisions overlay
campaignsRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id    = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid campaign id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  try {
    const campaign = await getCampaignById(orgId, id)
    if (!campaign) return fail(c, 'Campaign not found', 404, { code: 'NOT_FOUND' })
    return ok(c, campaign)
  } catch (err) {
    // Internal/infrastructure error — let errorHandler sanitize + correlate.
    throw err
  }
})

// PATCH /campaigns/:id — update status / budget / targeting / name
campaignsRouter.patch('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id    = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid campaign id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }
  // Role comes from auth middleware if populated; default to 'member' for safety
  const role  = (c.get('orgRole') as string | undefined) ?? 'member'

  let body: Record<string, unknown>
  try {
    // Defense-in-depth body-shape validation; mirrors POST handler above
    // and routes/v1/ai.ts canonical pattern.
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  const patch: {
    status?: string
    daily_budget?: number
    targeting?: Record<string, unknown>
    name?: string
  } = {}

  // Per-field strict type validation. Pre-fix the coercion was loose
  // (`Number(...)`, `String(...).trim()`, raw `as` casts) which silently
  // corrupted DB state on malformed inputs:
  //   - `daily_budget: "foo"` → Number("foo") = NaN → JSON.stringify(NaN)
  //     = null → DB `daily_budget=null` (silent data loss)
  //   - `name: null` → String(null) = "null" → DB stores literal "null"
  //   - `name: {}`   → String({})   = "[object Object]" → DB stores literal
  //   - `targeting: null` → 23502 NOT NULL violation → cryptic 500
  //   - `status: 42` → downstream `VALID_STATUSES.has(42)` rejects with
  //     misleading "Invalid status: 42" error
  // Strict typeof checks reject malformed inputs at the request layer with
  // canonical 400 + `code: 'INVALID_TYPE'` + `field` extra. Cross-route
  // consistency: matches POST handler's typeof === 'string' pattern for
  // name/platform/status, extended to cover daily_budget (number+finite+
  // non-negative) and targeting (object + non-null + non-array).

  if (body.status !== undefined) {
    if (typeof body.status !== 'string') {
      return fail(c, 'status must be a string', 400, { code: 'INVALID_TYPE', field: 'status' })
    }
    patch.status = body.status
  }
  if (body.daily_budget !== undefined) {
    if (
      typeof body.daily_budget !== 'number' ||
      !Number.isFinite(body.daily_budget) ||
      body.daily_budget < 0
    ) {
      return fail(c, 'daily_budget must be a non-negative finite number', 400, {
        code: 'INVALID_TYPE',
        field: 'daily_budget',
      })
    }
    patch.daily_budget = body.daily_budget
  }
  if (body.targeting !== undefined) {
    if (
      typeof body.targeting !== 'object' ||
      body.targeting === null ||
      Array.isArray(body.targeting)
    ) {
      return fail(c, 'targeting must be a non-null object', 400, {
        code: 'INVALID_TYPE',
        field: 'targeting',
      })
    }
    patch.targeting = body.targeting as Record<string, unknown>
  }
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return fail(c, 'name must be a non-empty string', 400, {
        code: 'INVALID_TYPE',
        field: 'name',
      })
    }
    patch.name = body.name.trim()
  }

  try {
    // Phase 1 audit-column population — see createCampaign call site above
    // for rationale. `updated_by` re-stamped on every PATCH; `created_by`
    // is preserved (the service's partial column list never overwrites it).
    const updated = await updateCampaign(orgId, id, patch, role, c.get('userId'))
    if (!updated) return fail(c, 'Campaign not found', 404, { code: 'NOT_FOUND' })
    return ok(c, updated)
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === 'INVALID_STATUS' || e.code === 'INVALID_TRANSITION') {
      return fail(c, e.message, 400, { code: e.code })
    }
    if (e.code === 'FORBIDDEN') return fail(c, e.message, 403, { code: 'FORBIDDEN' })
    // Internal/infrastructure error — let errorHandler sanitize + correlate.
    throw err
  }
})

// POST /campaigns/:id/ai-suggestions — generate and persist AI targeting suggestions
campaignsRouter.post('/:id/ai-suggestions', async (c) => {
  const orgId = c.get('orgId')
  const id    = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid campaign id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  try {
    const suggestions = await generateAiSuggestions(orgId, id)
    return ok(c, { suggestions })
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === 'BYOK_REQUIRED') {
      return fail(c, e.message, 402, { code: 'BYOK_REQUIRED' })
    }
    if (e.code === 'INSUFFICIENT_CREDITS') {
      return fail(c, e.message, 402, { code: 'INSUFFICIENT_CREDITS' })
    }
    if (e.code === 'NOT_FOUND') {
      return fail(c, 'Campaign not found', 404, { code: 'NOT_FOUND' })
    }
    // Internal/infrastructure error — let errorHandler sanitize + correlate.
    throw err
  }
})

// POST /campaigns/:id/push — push campaign to ad platform via actions library
campaignsRouter.post('/:id/push', async (c) => {
  const orgId = c.get('orgId')
  const id    = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid campaign id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  let body: Record<string, unknown>
  try {
    // Defense-in-depth body-shape validation; mirrors POST/PATCH handlers
    // above and routes/v1/ai.ts canonical pattern.
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  const platform = body.platform as string | undefined
  if (!platform || !VALID_PLATFORMS.has(platform)) {
    return fail(c, 'platform must be one of: meta, google', 400, { code: 'INVALID_FILTER', field: 'platform' })
  }

  try {
    const result = await pushCampaign(orgId, id, platform, c.get('requestId'))
    return ok(c, result, 202)
  } catch (err) {
    const e = err as Error & { code?: string; platform?: string }
    if (e.code === 'NOT_FOUND') return fail(c, 'Campaign not found', 404, { code: 'NOT_FOUND' })
    if (e.code === 'INVALID_STATUS') return fail(c, e.message, 400, { code: 'INVALID_STATUS' })
    if (e.code === 'INTEGRATION_NOT_CONNECTED') {
      return fail(
        c,
        `${platform.charAt(0).toUpperCase() + platform.slice(1)} integration not connected`,
        422,
        { code: 'INTEGRATION_NOT_CONNECTED' },
      )
    }
    // Internal/infrastructure error — let errorHandler sanitize + correlate.
    throw err
  }
})
