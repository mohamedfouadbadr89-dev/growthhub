import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { executeAction } from '../../services/execution/action-executor.js'

type Variables = { userId: string; orgId: string }

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
  if (error) return c.json({ error: error.message }, 500)

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

  if (error || !data) return c.json({ error: 'Action not found' }, 404)
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
    if (e.code === 'NOT_FOUND') {
      return c.json({ error: 'Action not found' }, 404)
    }
    if (e.code === 'MISSING_PARAMETER') {
      return c.json(
        { error: e.message, code: 'MISSING_PARAMETER', field: e.field },
        400,
      )
    }
    if (e.code === 'INVALID_ORG_ID') {
      return c.json({ error: 'Internal', message: e.message }, 500)
    }
    if (
      e.code === 'TEMPLATE_LOOKUP_FAILED' ||
      e.code === 'AI_DECISION_LOOKUP_FAILED' ||
      e.code === 'HISTORY_INSERT_FAILED' ||
      e.code === 'IDEMPOTENCY_LOOKUP_FAILED'
    ) {
      return c.json({ error: 'Internal', message: e.message }, 500)
    }
    return c.json({ error: e.message ?? 'Execution failed' }, 500)
  }
})
