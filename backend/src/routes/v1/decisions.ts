import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { dispatchIntelligence } from '../../services/intelligence/index.js'

/**
 * Decisions router — HARDENED BUT UNUSED per implementation classification model.
 *
 * GOVERNANCE STATE (documented via SYSTEM_CONTROL.md continuation #32, 2026-05-12):
 *   - This router is MOUNTED at `/api/v1/decisions/*` (routes/v1/index.ts:117)
 *     but a deferredPhase 503 gate at routes/v1/index.ts:90 intercepts EVERY
 *     request to `/decisions/*` BEFORE this handler runs.
 *   - Reason: this router queries the legacy `decisions` table + the
 *     `decision_runs` table — BOTH belong to the Phase 3 anomaly engine
 *     which is DEPRECATED+DEFERRED per CANONICAL AI SYSTEM resolution.
 *     The canonical AI surface is `ai_decisions` (separate table, Phase 3
 *     LINEAR closed); the legacy `decisions` table is malformed in live
 *     DB and explicitly NOT to be reactivated.
 *   - `dispatchIntelligence` (line 51 manual trigger path + Inngest path)
 *     is additionally guarded by the early-return at jobs/inngest.ts
 *     `generateDecisions` (continuation #29 defense-in-depth).
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
 *   1. Deploy canonical migrations creating `decisions` (rebuilt) +
 *      `decision_runs` tables
 *   2. Lift the 503 gate at routes/v1/index.ts:90
 *   3. Remove the #29 defense-in-depth guard at jobs/inngest.ts
 *      (generateDecisions function early-return)
 *   4. Re-register `generateDecisions` (and `dailySyncAll` /
 *      `syncIntegration` if appropriate) in the `functions = [...]`
 *      array at jobs/inngest.ts:323
 *   5. Canonicalize this router onto ok()/fail() per Phase 1 envelope
 *   6. Update CANONICAL AI SYSTEM resolution in SYSTEM_CONTROL.md
 *
 * DO NOT canonicalize envelope here without unlocking the phase first.
 */
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
