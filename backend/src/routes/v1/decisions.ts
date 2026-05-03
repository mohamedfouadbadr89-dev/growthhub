import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { dispatchIntelligence } from '../../services/intelligence/index.js'

type Variables = { userId: string; orgId: string }

export const decisionsRouter = new Hono<{ Variables: Variables }>()

// GET /decisions/run-status — MUST be before /:id to avoid param capture
decisionsRouter.get('/run-status', async (c) => {
  const orgId = c.get('orgId')

  const { data } = await supabaseAdmin
    .from('decision_runs')
    .select('id, status, trigger, decisions_generated, alerts_generated, started_at, completed_at')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  return c.json(data ?? { run_id: null })
})

// GET /decisions — list active decisions
decisionsRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  const { type, platform, status = 'active', limit = '20', offset = '0' } = c.req.query()

  let query = supabaseAdmin
    .from('decisions')
    .select('id, type, status, platform, campaign_id, trigger_condition, confidence_score, recommended_action, priority_score, ai_status, created_at', { count: 'exact' })
    .eq('org_id', orgId)
    .eq('status', status)
    .order('priority_score', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (type) query = query.eq('type', type)
  if (platform) query = query.eq('platform', platform)

  const { data, error, count } = await query
  if (error) return c.json({ error: error.message }, 500)

  return c.json({ decisions: data ?? [], total: count ?? 0, limit: Number(limit), offset: Number(offset) })
})

// POST /decisions/refresh — trigger manual decision generation
decisionsRouter.post('/refresh', async (c) => {
  const orgId = c.get('orgId')

  try {
    const { runId } = await dispatchIntelligence(orgId, 'manual')
    return c.json({ run_id: runId, status: 'in_progress', message: 'Decision generation started' }, 202)
  } catch (err) {
    const e = err as Error & { code?: string; runId?: string }
    if (e.code === 'ALREADY_IN_PROGRESS') {
      return c.json({ error: 'Decision generation already in progress', run_id: e.runId }, 409)
    }
    return c.json({ error: e.message }, 500)
  }
})

// GET /decisions/:id — full detail
decisionsRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { data, error } = await supabaseAdmin
    .from('decisions')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return c.json({ error: 'Decision not found' }, 404)
  return c.json(data)
})
