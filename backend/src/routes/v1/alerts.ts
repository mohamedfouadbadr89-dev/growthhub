import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'

type Variables = { userId: string; orgId: string }

export const alertsRouter = new Hono<{ Variables: Variables }>()

// GET /alerts — list alerts
alertsRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  const { status = 'active', type, platform, limit = '50', offset = '0' } = c.req.query()

  let query = supabaseAdmin
    .from('alerts')
    .select('id, type, severity, platform, campaign_id, breached_value, threshold_value, status, resolved_at, created_at', { count: 'exact' })
    .eq('org_id', orgId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (type) query = query.eq('type', type)
  if (platform) query = query.eq('platform', platform)

  const { data, error, count } = await query
  if (error) return c.json({ error: error.message }, 500)

  return c.json({ alerts: data ?? [], total: count ?? 0, limit: Number(limit), offset: Number(offset) })
})

// PATCH /alerts/:id/dismiss — resolve an active alert
alertsRouter.patch('/:id/dismiss', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { data: existing } = await supabaseAdmin
    .from('alerts')
    .select('id, status')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!existing) return c.json({ error: 'Alert not found' }, 404)
  if (existing.status === 'resolved') return c.json({ error: 'Alert already resolved' }, 409)

  const { data, error } = await supabaseAdmin
    .from('alerts')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
    .select('id, status, resolved_at')
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})
