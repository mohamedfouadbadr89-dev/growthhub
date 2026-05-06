import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { executeAction } from '../../services/execution/action-executor.js'

// requestId is set by tracingMiddleware mounted at app level (index.ts).
// Declaring it here makes c.get('requestId') type-safe so the action
// route can pass it through to executeAction for [exec] log correlation.
type Variables = { userId: string; orgId: string; requestId: string }

export const actionsRouter = new Hono<{ Variables: Variables }>()

// GET /actions — list all action templates (system-global)
actionsRouter.get('/', async (c) => {
  const { platform, action_type } = c.req.query()

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

  return c.json({ actions: data ?? [], total: count ?? 0 })
})

// GET /actions/:id — single action template
actionsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

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
  if (!data) return c.json({ error: 'Action not found' }, 404)
  return c.json(data)
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

  let body: {
    params?: Record<string, unknown>
    ai_decision_id?: string
    trace_id?: string
    execution_id?: string
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const params = body.params ?? {}
  const aiDecisionId =
    typeof body.ai_decision_id === 'string' && body.ai_decision_id.length > 0
      ? body.ai_decision_id
      : undefined
  const traceId =
    typeof body.trace_id === 'string' && body.trace_id.length > 0
      ? body.trace_id
      : undefined
  const executionId =
    typeof body.execution_id === 'string' && body.execution_id.length > 0
      ? body.execution_id
      : undefined

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
    return c.json({
      history_id: result.historyId,
      result: result.result,
      result_data: result.resultData,
      idempotent_replay: result.idempotentReplay === true ? true : undefined,
    })
  } catch (err) {
    const e = err as Error & { code?: string; field?: string }

    // 4xx typed errors — caller-facing messages, intentionally surfaced.
    if (e.code === 'NOT_FOUND') {
      return c.json({ error: 'Action not found' }, 404)
    }
    if (e.code === 'MISSING_PARAMETER') {
      return c.json(
        { error: e.message, code: 'MISSING_PARAMETER', field: e.field },
        400,
      )
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
