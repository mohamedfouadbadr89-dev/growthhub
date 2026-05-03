import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'

type Variables = { userId: string; orgId: string }

export const automationRouter = new Hono<{ Variables: Variables }>()

// GET /automation/rules
automationRouter.get('/rules', async (c) => {
  const orgId = c.get('orgId')

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .select('id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count, last_fired_at, created_at, updated_at, actions_library(platform, name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ rules: data ?? [] })
})

// POST /automation/rules
automationRouter.post('/rules', async (c) => {
  const orgId = c.get('orgId')

  let body: {
    name: string
    trigger_type: string
    min_confidence_threshold?: number
    action_template_id: string
    action_params?: Record<string, unknown>
    enabled?: boolean
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { name, trigger_type, action_template_id, min_confidence_threshold = 70, action_params = {}, enabled = true } = body

  if (!name || !trigger_type || !action_template_id) {
    return c.json({ error: 'Missing required fields: name, trigger_type, action_template_id' }, 400)
  }

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .insert({ org_id: orgId, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled })
    .select('id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count, last_fired_at, created_at, updated_at')
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

// GET /automation/runs
automationRouter.get('/runs', async (c) => {
  const orgId = c.get('orgId')
  const { limit = '50', offset = '0', rule_id } = c.req.query()

  let query = supabaseAdmin
    .from('automation_runs')
    .select('id, org_id, automation_rule_id, decision_id, action_template_id, status, result_data, error_message, executed_at, automation_rules(name)', { count: 'exact' })
    .eq('org_id', orgId)
    .order('executed_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (rule_id) query = query.eq('automation_rule_id', rule_id)

  const { data, error, count } = await query
  if (error) return c.json({ error: error.message }, 500)

  return c.json({ runs: data ?? [], total: count ?? 0 })
})

// PATCH /automation/rules/:id
automationRouter.patch('/rules/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const allowed = ['name', 'trigger_type', 'min_confidence_threshold', 'action_template_id', 'action_params', 'enabled']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)
    .select('id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count, last_fired_at, created_at, updated_at')
    .single()

  if (error || !data) return c.json({ error: 'Rule not found' }, 404)
  return c.json(data)
})

// DELETE /automation/rules/:id
automationRouter.delete('/rules/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { error } = await supabaseAdmin
    .from('automation_rules')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})
