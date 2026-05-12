import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'

/**
 * Alerts router — HARDENED BUT UNUSED per implementation classification model.
 *
 * GOVERNANCE STATE (documented via SYSTEM_CONTROL.md continuation #32, 2026-05-12):
 *   - This router is MOUNTED at `/api/v1/alerts/*` (routes/v1/index.ts:118)
 *     but a deferredPhase 503 gate at routes/v1/index.ts:91 intercepts
 *     EVERY request to `/alerts/*` BEFORE this handler runs.
 *   - Reason: this router queries the `alerts` table which belongs to the
 *     Phase 3 anomaly engine — DEPRECATED+DEFERRED per CANONICAL AI SYSTEM
 *     resolution. The `alerts` table is not in canonical migrations; the
 *     Phase 3 anomaly engine is not to be reactivated without explicit
 *     re-architecture authorization.
 *
 * WHY THE LEGACY ENVELOPE IS PRESERVED HERE:
 *   - Code below uses legacy `c.json({error:'...'})` shapes instead of
 *     canonical `ok()` / `fail()` from `utils/response.ts`.
 *   - The 503 gate ensures no client ever sees these responses.
 *   - Canonicalizing the envelope here would touch unreachable code AND
 *     create confusion about whether the router is active.
 *   - Per PHASE EXECUTION RULE + IMPLEMENTATION CLASSIFICATION MODEL:
 *     HARDENED BUT UNUSED surfaces are preserved verbatim until their
 *     owning phase is unlocked OR they are formally retired.
 *
 * IF Phase 3 anomaly engine is EVER unlocked:
 *   1. Deploy canonical migration creating `alerts` table
 *   2. Lift the 503 gate at routes/v1/index.ts:91
 *   3. Canonicalize this router onto ok()/fail() per Phase 1 envelope
 *   4. Update CANONICAL AI SYSTEM resolution in SYSTEM_CONTROL.md
 *
 * DO NOT canonicalize envelope here without unlocking the phase first.
 */
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
