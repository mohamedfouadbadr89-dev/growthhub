import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'

type Variables = { userId: string; orgId: string }

export const historyRouter = new Hono<{ Variables: Variables }>()

// GET /history — list (no data_used for performance)
historyRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  const { limit = '50', offset = '0', executed_by } = c.req.query()

  let query = supabaseAdmin
    .from('decision_history')
    .select('id, org_id, decision, action_taken, trigger_condition, result, ai_explanation, confidence_score, decision_id, automation_rule_id, automation_run_id, executed_by, created_at', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (executed_by) query = query.eq('executed_by', executed_by)

  const { data, error, count } = await query
  if (error) return c.json({ error: error.message }, 500)

  return c.json({ history: data ?? [], total: count ?? 0 })
})

// GET /history/:id — full record with data_used
historyRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { data, error } = await supabaseAdmin
    .from('decision_history')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return c.json({ error: 'History record not found' }, 404)
  return c.json(data)
})
