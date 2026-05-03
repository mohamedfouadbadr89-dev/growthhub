import { Hono } from 'hono'
import {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  pushCampaign,
} from '../../services/campaigns/campaigns.js'
import { generateAiSuggestions } from '../../services/campaigns/ai-suggestions.js'

type Variables = { userId: string; orgId: string; orgRole?: string }

export const campaignsRouter = new Hono<{ Variables: Variables }>()

const VALID_PLATFORMS = new Set(['meta', 'google'])
const VALID_STATUSES  = new Set(['all', 'draft', 'active', 'paused', 'completed', 'archived'])
const MAX_LIMIT = 100

// GET /campaigns — list with 30-day aggregated metrics
campaignsRouter.get('/', async (c) => {
  const orgId  = c.get('orgId')
  const status  = c.req.query('status')
  const platform = c.req.query('platform')

  if (status && !VALID_STATUSES.has(status)) {
    return c.json({ error: `Invalid status filter: ${status}` }, 400)
  }
  if (platform && !VALID_PLATFORMS.has(platform)) {
    return c.json({ error: `Invalid platform filter: ${platform}` }, 400)
  }

  const rawLimit  = parseInt(c.req.query('limit')  ?? '50', 10)
  const rawOffset = parseInt(c.req.query('offset') ?? '0', 10)
  const limit  = Math.min(Math.max(1, isNaN(rawLimit)  ? 50 : rawLimit),  MAX_LIMIT)
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

  try {
    const result = await listCampaigns(orgId, { status, platform, limit, offset })
    return c.json(result)
  } catch (err) {
    console.error('[campaigns] list error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /campaigns — create new campaign record
campaignsRouter.post('/', async (c) => {
  const orgId = c.get('orgId')
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return c.json({ error: 'name is required' }, 400)
  }
  if (!body.platform || typeof body.platform !== 'string') {
    return c.json({ error: 'platform is required' }, 400)
  }
  if (!VALID_PLATFORMS.has(body.platform)) {
    return c.json({ error: `Invalid platform. Must be one of: meta, google` }, 400)
  }

  try {
    const campaign = await createCampaign(orgId, {
      name:         body.name.trim(),
      platform:     body.platform,
      daily_budget: typeof body.daily_budget === 'number' ? body.daily_budget : undefined,
      ad_account_id: typeof body.ad_account_id === 'string' ? body.ad_account_id : undefined,
      targeting:    typeof body.targeting === 'object' && body.targeting !== null
                    ? body.targeting as Record<string, unknown>
                    : undefined,
    })
    return c.json(campaign, 201)
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === 'CONFLICT') return c.json({ error: e.message }, 409)
    console.error('[campaigns] create error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /campaigns/:id — campaign detail with metrics + decisions overlay
campaignsRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id    = c.req.param('id')

  try {
    const campaign = await getCampaignById(orgId, id)
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404)
    return c.json(campaign)
  } catch (err) {
    console.error('[campaigns] detail error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PATCH /campaigns/:id — update status / budget / targeting / name
campaignsRouter.patch('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id    = c.req.param('id')
  // Role comes from auth middleware if populated; default to 'member' for safety
  const role  = (c.get('orgRole') as string | undefined) ?? 'member'

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const patch: {
    status?: string
    daily_budget?: number
    targeting?: Record<string, unknown>
    name?: string
  } = {}

  if (body.status      !== undefined) patch.status       = body.status as string
  if (body.daily_budget !== undefined) patch.daily_budget = Number(body.daily_budget)
  if (body.targeting   !== undefined) patch.targeting    = body.targeting as Record<string, unknown>
  if (body.name        !== undefined) patch.name         = String(body.name).trim()

  try {
    const updated = await updateCampaign(orgId, id, patch, role)
    if (!updated) return c.json({ error: 'Campaign not found' }, 404)
    return c.json(updated)
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === 'INVALID_STATUS' || e.code === 'INVALID_TRANSITION') {
      return c.json({ error: e.message }, 400)
    }
    if (e.code === 'FORBIDDEN') return c.json({ error: e.message }, 403)
    console.error('[campaigns] patch error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /campaigns/:id/ai-suggestions — generate and persist AI targeting suggestions
campaignsRouter.post('/:id/ai-suggestions', async (c) => {
  const orgId = c.get('orgId')
  const id    = c.req.param('id')

  try {
    const suggestions = await generateAiSuggestions(orgId, id)
    return c.json({ suggestions })
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === 'BYOK_REQUIRED') {
      return c.json({ error: e.message, code: 'BYOK_REQUIRED' }, 402)
    }
    if (e.code === 'INSUFFICIENT_CREDITS') {
      return c.json({ error: e.message, code: 'INSUFFICIENT_CREDITS' }, 402)
    }
    if (e.code === 'NOT_FOUND') {
      return c.json({ error: 'Campaign not found' }, 404)
    }
    console.error('[campaigns] ai-suggestions error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /campaigns/:id/push — push campaign to ad platform via actions library
campaignsRouter.post('/:id/push', async (c) => {
  const orgId = c.get('orgId')
  const id    = c.req.param('id')

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const platform = body.platform as string | undefined
  if (!platform || !VALID_PLATFORMS.has(platform)) {
    return c.json({ error: 'platform must be one of: meta, google' }, 400)
  }

  try {
    const result = await pushCampaign(orgId, id, platform)
    return c.json(result, 202)
  } catch (err) {
    const e = err as Error & { code?: string; platform?: string }
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Campaign not found' }, 404)
    if (e.code === 'INVALID_STATUS') return c.json({ error: e.message }, 400)
    if (e.code === 'INTEGRATION_NOT_CONNECTED') {
      return c.json(
        { error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} integration not connected`, code: 'INTEGRATION_NOT_CONNECTED' },
        422
      )
    }
    console.error('[campaigns] push error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})
