import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { executeAction } from '../../services/execution/action-executor.js'
import { actionRequiresApproval } from '../../services/execution/automation-engine.js'
import { ok, fail } from '../../utils/response.js'

// requestId is set by tracingMiddleware mounted at app level (index.ts).
// Declaring it here makes c.get('requestId') type-safe so the action
// route can pass it through to executeAction for [exec] log correlation.
type Variables = { userId: string; orgId: string; requestId: string }

// Canonical UUID-shape matcher. Mirrors backend/src/middleware/tracing.ts:30
// (UUID_LIKE) for cross-module consistency. Accepts canonical (8-4-4-4-12)
// and dashless variants — same surface that Postgres's `uuid` type itself
// accepts. Used to gate body fields that flow into `decision_history`'s
// UUID columns (ai_decision_id, trace_id, execution_id) at the request
// layer; without this, non-UUID strings reach the INSERT and trigger
// 22P02 ("invalid input syntax for type uuid"), which propagates as a
// cryptic 500 with no `field` correlator. Validating up-front converts
// that into a canonical 400 + `code: 'INVALID_TYPE'` + `field` extra
// matching the campaigns POST/PATCH pattern established in prior turns.
const UUID_LIKE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

export const actionsRouter = new Hono<{ Variables: Variables }>()

// Closed-enum domain for `?platform` filter on the LIST endpoint, mirrored
// from the actions_library CHECK constraint
// (`platform IN ('meta', 'google', 'shopify', 'slack', 'email')` per
// 20260515120000_phase_omega8_a1_actions_and_slack_platform.sql — Phase
// Ω.8A.1 extended the enum with 'slack' + 'email'). Cross-route consistency
// with `campaigns.ts` `VALID_PLATFORMS` validation. The `action_type` column
// is intentionally open-ended (future templates seeded by migrations may add
// new types; no DB CHECK enum) and is NOT validated here — same governance
// posture.
const VALID_PLATFORMS = new Set(['meta', 'google', 'shopify', 'slack', 'email'])

// GET /actions — list all action templates (system-global)
actionsRouter.get('/', async (c) => {
  const { platform, action_type } = c.req.query()

  // Pre-fix: `?platform=tiktok` would silently run `.eq('platform','tiktok')`
  // → 0 rows returned → frontend renders "no actions for this platform"
  // misleadingly. Validating against the closed enum at the request layer
  // converts the silent empty-result case into a canonical 400 with
  // actionable `INVALID_FILTER` diagnostic. Pattern matches campaigns LIST.
  if (platform && !VALID_PLATFORMS.has(platform)) {
    return fail(c, `Invalid platform filter: ${platform}. Must be one of: meta, google, shopify, slack, email`, 400, {
      code: 'INVALID_FILTER',
      field: 'platform',
    })
  }

  let query = supabaseAdmin
    .from('actions_library')
    .select('id, platform, action_type, name, description, parameter_schema, created_at', { count: 'exact' })
    .order('platform')
    .order('action_type')

  if (platform) query = query.eq('platform', platform)
  if (action_type) query = query.eq('action_type', action_type)

  const { data, error, count } = await query
  // Pre-fix: `if (error) return c.json({ error: error.message }, 500)` —
  // leaked raw Postgrest error strings (table/column names, SQLSTATE codes,
  // RLS policy boundaries, connection topology hints) to any authenticated
  // caller. actions_library is a SYSTEM-GLOBAL catalogue (RLS authenticated-
  // read, no org_id filter), so the disclosure surface is broader than
  // org-isolated tables — every authed user could probe the endpoint to
  // elicit error states.
  //
  // Pattern aligned with history.ts:GET / hardening (prior turn). Throw →
  // caught by app.onError(errorHandler) → sanitized 500 body
  // {error: 'Internal Server Error', request_id} for the client; full
  // error captured in Sentry (with request_id tag) and stdout [err]
  // (with request_id prefix) for the operator. CONSTITUTION §1.1 + §3
  // satisfied (operator-loud, client-sanitized).
  if (error) {
    throw new Error(`actions list lookup failed: ${error.message}`)
  }

  // Continuation #122 (2026-05-14) — Phase Ω stabilization.
  // Server-compute `requires_approval` per template from the centralized
  // policy (`actionRequiresApproval`) so the FE never mirrors the
  // protected-action set. Closes audit MEDIUM finding #2 — eliminates
  // the FE policy-mirror Sets in `app/actions/page.tsx` and
  // `app/actions/[id]/page.tsx`. Single source of truth remains
  // `automation-engine.ts:SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES`.
  const enriched = (data ?? []).map((row) => ({
    ...row,
    requires_approval: actionRequiresApproval(`${row.platform}.${row.action_type}`),
  }))

  return ok(c, { actions: enriched, total: count ?? 0 })
})

// GET /actions/:id — single action template
actionsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid action template id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  const { data, error } = await supabaseAdmin
    .from('actions_library')
    .select('id, platform, action_type, name, description, parameter_schema, created_at')
    .eq('id', id)
    .single()

  // Discriminate "template genuinely not in catalogue" from "DB layer failed".
  //
  // Pre-fix this branch was `if (error || !data) → 404`. Pattern-identical
  // to the auth.ts/verify anti-pattern closed in the prior hardening turn:
  // every non-PGRST116 PostgrestError (network failure, RLS denial, schema
  // drift, connection pool exhaustion, 42P01, etc.) was rebranded as
  // "Action not found", bypassing errorHandler and Sentry. CONSTITUTION §3
  // "Fail Loudly" — DB failures must surface as 5xx, not 4xx.
  //
  // PGRST116 ("result has 0 rows") is the canonical no-rows code from
  // .single(); it is the ONLY error code that legitimately means
  // "template not in catalogue". Everything else throws → caught by Hono's
  // onError → errorHandler emits 500 with request_id in body, Sentry tag,
  // and stdout [err] line (per the prior errorHandler hardening).
  if (error && error.code !== 'PGRST116') {
    throw new Error(`actions/:id lookup failed: ${error.message}`)
  }
  if (!data) return fail(c, 'Action not found', 404, { code: 'NOT_FOUND' })
  // Continuation #122 — same `requires_approval` enrichment as the LIST
  // response. Single source of truth = automation-engine.ts policy.
  return ok(c, {
    ...data,
    requires_approval: actionRequiresApproval(`${data.platform}.${data.action_type}`),
  })
})

// POST /actions/:id/execute — manually execute an action
//
// Body: {
//   params:          <Record<string, unknown>>  required, validated against template schema
//   ai_decision_id?: <UUID>                     optional link to the ai_decisions row that
//                                               suggested this action; org-scoped lookup
//   trace_id?:       <UUID>                     optional trace correlator; falls back to the
//                                               linked ai_decisions.trace_id when absent
//   execution_id?:   <UUID>                     optional idempotency key. Replays of the same
//                                               key (same org) return the original audit row
//                                               with `result_data: { idempotent_replay: true,
//                                               original_history_id }`. Per-org scoped.
// }
//
// org_id is taken from server-side request context (c.get('orgId'));
// it is NEVER read from the body even if the client sends one.
actionsRouter.post('/:id/execute', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid action template id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  let body: {
    params?: Record<string, unknown>
    ai_decision_id?: string
    trace_id?: string
    execution_id?: string
  }
  try {
    // Defense-in-depth body-shape validation; mirrors campaigns POST/PATCH
    // handlers and routes/v1/ai.ts canonical pattern. Without the shape
    // check, `null` / array / primitive bodies cause downstream
    // `body.params` access to throw → uncaught → errorHandler 500.
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as typeof body
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  const params = body.params ?? {}
  // UUID format gating for the three body fields that flow into
  // decision_history's UUID columns. Each `length > 0` check below
  // (preserved from pre-fix) only proves "non-empty string"; without the
  // UUID_LIKE assertion, a string like "hello" would reach executeAction →
  // INSERT → 22P02 → uncaught → 500 with no field correlator.
  const aiDecisionId =
    typeof body.ai_decision_id === 'string' && body.ai_decision_id.length > 0
      ? body.ai_decision_id
      : undefined
  if (aiDecisionId !== undefined && !UUID_LIKE.test(aiDecisionId)) {
    return fail(c, 'ai_decision_id must be a valid UUID', 400, {
      code: 'INVALID_TYPE',
      field: 'ai_decision_id',
    })
  }

  const traceId =
    typeof body.trace_id === 'string' && body.trace_id.length > 0
      ? body.trace_id
      : undefined
  if (traceId !== undefined && !UUID_LIKE.test(traceId)) {
    return fail(c, 'trace_id must be a valid UUID', 400, {
      code: 'INVALID_TYPE',
      field: 'trace_id',
    })
  }

  const executionId =
    typeof body.execution_id === 'string' && body.execution_id.length > 0
      ? body.execution_id
      : undefined
  if (executionId !== undefined && !UUID_LIKE.test(executionId)) {
    return fail(c, 'execution_id must be a valid UUID', 400, {
      code: 'INVALID_TYPE',
      field: 'execution_id',
    })
  }

  try {
    const result = await executeAction({
      templateId: id,
      params,
      orgId,
      // request_id from tracingMiddleware — stamped on every [exec] line
      // so the execution lifecycle joins the [req] envelope's namespace.
      requestId: c.get('requestId'),
      aiDecisionId,
      traceId,
      executionId,
      executedBy: 'manual',
    })
    return ok(c, {
      history_id: result.historyId,
      result: result.result,
      result_data: result.resultData,
      idempotent_replay: result.idempotentReplay === true ? true : undefined,
    })
  } catch (err) {
    const e = err as Error & { code?: string; field?: string }

    // 4xx typed errors — caller-facing messages, intentionally surfaced.
    if (e.code === 'NOT_FOUND') {
      return fail(c, 'Action not found', 404, { code: 'NOT_FOUND' })
    }
    if (e.code === 'MISSING_PARAMETER') {
      return fail(c, e.message, 400, { code: 'MISSING_PARAMETER', field: e.field })
    }

    // Every other error is internal/infrastructure-class. Pre-fix, three
    // distinct paths (INVALID_ORG_ID, *_LOOKUP_FAILED / *_INSERT_FAILED,
    // and the catch-all) returned `e.message` to the client — leaking the
    // executor's wrapped Postgres error.message strings (relation/column
    // names, RLS denial detail, SQLSTATE codes, connection topology hints).
    // CONSTITUTION §1.1 generalized to error-message hygiene + §3 "Fail
    // Loudly" mandate operator-side loudness, NOT client-side disclosure.
    //
    // Throw → caught by app.onError(errorHandler) → sanitized 500 body
    // {error: 'Internal Server Error', request_id} for the client; full
    // error captured in Sentry (with request_id tag) and stdout [err]
    // (with request_id prefix) for the operator. Pattern-aligned with
    // history.ts/actions.ts LIST hardening (prior turns).
    throw err
  }
})
