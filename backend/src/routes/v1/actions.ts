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
actionsRouter.post('/:id/execute', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  let body: { params?: Record<string, unknown>; decision_id?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const params = body.params ?? {}
  const decisionId = body.decision_id

  try {
    const result = await executeAction(id, params, orgId, decisionId)
    return c.json({ history_id: result.historyId, result: result.result, result_data: result.resultData })
  } catch (err) {
    const e = err as Error & { code?: string; field?: string; platform?: string }
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Action not found' }, 404)
    if (e.code === 'MISSING_PARAMETER') return c.json({ error: e.message, code: 'MISSING_PARAMETER', field: e.field }, 400)
    if (e.code === 'INTEGRATION_NOT_CONNECTED') return c.json({ error: e.message, code: 'INTEGRATION_NOT_CONNECTED', platform: e.platform }, 422)
    return c.json({ error: e.message ?? 'Execution failed' }, 500)
  }
})
