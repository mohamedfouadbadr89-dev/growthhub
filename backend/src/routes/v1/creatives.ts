import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { inngest } from '../../jobs/inngest.js'
import { resolveApiKey, CREDIT_COSTS } from '../../services/creatives/creative-generator.js'
import { getSignedUrls, getSignedUrl } from '../../services/creatives/storage.js'

type Variables = { userId: string; orgId: string }

export const creativesRouter = new Hono<{ Variables: Variables }>()

const MAX_LIMIT = 100

// Attach signed URLs to image creatives
async function withSignedUrls(
  creatives: Array<{ id: string; type: string; content_url: string | null; [key: string]: unknown }>
): Promise<Array<{ id: string; type: string; content_url: string | null; [key: string]: unknown }>> {
  const imagePaths = creatives
    .filter((c) => c.type === 'image' && c.content_url && !c.content_url.startsWith('http'))
    .map((c) => c.content_url as string)

  if (imagePaths.length === 0) return creatives

  const signedMap = await getSignedUrls(imagePaths, 3600).catch(() => ({} as Record<string, string>))

  return creatives.map((c) => {
    if (c.type !== 'image' || !c.content_url || c.content_url.startsWith('http')) return c
    return { ...c, content_url: signedMap[c.content_url] ?? c.content_url }
  })
}

// GET /creatives — list org creatives, sorted by performance_score desc
creativesRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  const rawType = c.req.query('type')
  const rawLimit = parseInt(c.req.query('limit') ?? '50', 10)
  const rawOffset = parseInt(c.req.query('offset') ?? '0', 10)

  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), MAX_LIMIT)
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

  let query = supabaseAdmin
    .from('creatives')
    .select('id, type, content_url, content_text, performance_score, generation_id, created_at, updated_at', { count: 'exact' })
    .eq('org_id', orgId)
    .order('performance_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (rawType === 'copy' || rawType === 'image') query = query.eq('type', rawType)

  const { data, error, count } = await query
  if (error) return c.json({ error: error.message }, 500)

  const withUrls = await withSignedUrls(
    (data ?? []) as Array<{ id: string; type: string; content_url: string | null; [key: string]: unknown }>
  )

  return c.json({ creatives: withUrls, total: count ?? 0 })
})

// POST /creatives/generate — billing gate + queue job
creativesRouter.post('/generate', async (c) => {
  const orgId = c.get('orgId')

  let body: { generation_type: string; ad_account_id?: string; campaign_name?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { generation_type, ad_account_id, campaign_name } = body

  if (generation_type !== 'copy' && generation_type !== 'image') {
    return c.json({ error: 'generation_type must be "copy" or "image"' }, 400)
  }

  // --- Billing gate (synchronous, before Inngest dispatch) ---
  let creditsDeducted = 0
  try {
    const { isLtd } = await resolveApiKey(orgId)

    if (!isLtd) {
      const cost = CREDIT_COSTS[generation_type]
      const { data: newBalance } = await supabaseAdmin.rpc('deduct_credits', {
        p_org_id: orgId,
        p_amount: cost,
      })
      if ((newBalance as number) < 0) {
        return c.json({ error: 'Insufficient credits for this generation' }, 402)
      }
      creditsDeducted = cost
    }
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === 'BYOK_REQUIRED') {
      return c.json({ error: e.message, code: 'BYOK_REQUIRED' }, 402)
    }
    return c.json({ error: e.message ?? 'Billing check failed' }, 500)
  }

  // Create the generation job record (records credits deducted for possible refund)
  const { data: job, error: insertErr } = await supabaseAdmin
    .from('creative_generations')
    .insert({
      org_id: orgId,
      generation_type,
      status: 'pending',
      ad_account_id: ad_account_id ?? null,
      campaign_name: campaign_name ?? null,
      credits_deducted: creditsDeducted,
    })
    .select('id')
    .single()

  if (insertErr || !job) {
    // Refund immediately — job record never created
    if (creditsDeducted > 0) {
      await supabaseAdmin
        .rpc('refund_credits', { p_org_id: orgId, p_amount: creditsDeducted })
        .then(() => null, () => null)
    }
    return c.json({ error: insertErr?.message ?? 'Failed to create generation job' }, 500)
  }

  // Dispatch to Inngest
  try {
    await inngest.send({
      name: 'creatives/generation.requested',
      data: {
        orgId,
        generationId: job.id as string,
        generationType: generation_type,
        adAccountId: ad_account_id ?? null,
        campaignName: campaign_name ?? null,
      },
    })
  } catch (err) {
    // Dispatch failed — mark job failed and refund
    await supabaseAdmin
      .from('creative_generations')
      .update({ status: 'failed', error_message: 'Failed to dispatch job', completed_at: new Date().toISOString() })
      .eq('id', job.id as string)

    if (creditsDeducted > 0) {
      await supabaseAdmin
        .rpc('refund_credits', { p_org_id: orgId, p_amount: creditsDeducted })
        .then(() => null, () => null)
    }
    return c.json({ error: 'Failed to queue generation job' }, 500)
  }

  return c.json({ generation_id: job.id }, 202)
})

// GET /creatives/generations/:id — job status (org-scoped)
creativesRouter.get('/generations/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { data, error } = await supabaseAdmin
    .from('creative_generations')
    .select('id, generation_type, status, campaign_name, source_roas, error_message, started_at, completed_at, created_at')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return c.json({ error: 'Generation not found' }, 404)
  return c.json(data)
})

// GET /creatives/:id/download-url — short-lived signed URL for downloads (image only)
creativesRouter.get('/:id/download-url', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { data, error } = await supabaseAdmin
    .from('creatives')
    .select('type, content_url')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return c.json({ error: 'Creative not found' }, 404)
  if (data.type !== 'image') return c.json({ error: 'Only image creatives have download URLs' }, 400)
  if (!data.content_url) return c.json({ error: 'No image file associated with this creative' }, 404)

  const path = data.content_url as string
  // Use a full URL directly if it's already one (legacy records)
  if (path.startsWith('http')) return c.json({ url: path, expires_in: 0 })

  try {
    const url = await getSignedUrl(path, 60)  // 60 seconds for download
    return c.json({ url, expires_in: 60 })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// GET /creatives/:id — single creative with signed URL
creativesRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { data, error } = await supabaseAdmin
    .from('creatives')
    .select('id, type, content_url, content_text, performance_score, generation_id, created_at, updated_at')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return c.json({ error: 'Creative not found' }, 404)

  // Attach signed URL for image creatives
  if (data.type === 'image' && data.content_url && !String(data.content_url).startsWith('http')) {
    const signedUrl = await getSignedUrl(data.content_url as string, 3600).catch(() => data.content_url)
    return c.json({ ...data, content_url: signedUrl })
  }

  return c.json(data)
})

// PATCH /creatives/:id — edit copy creative text (copy type only)
creativesRouter.patch('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  let body: { content_text?: { headline?: string; body?: string; cta?: string } }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.content_text || typeof body.content_text !== 'object') {
    return c.json({ error: 'content_text is required' }, 400)
  }

  // Verify ownership and type in a single query
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('creatives')
    .select('id, type')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (fetchErr || !existing) return c.json({ error: 'Creative not found' }, 404)
  if (existing.type !== 'copy') return c.json({ error: 'Only copy creatives can be edited' }, 400)

  // Sanitize — only accept the three expected fields
  const sanitized = {
    headline: String(body.content_text.headline ?? '').slice(0, 100),
    body: String(body.content_text.body ?? '').slice(0, 300),
    cta: String(body.content_text.cta ?? '').slice(0, 50),
  }

  const { data, error } = await supabaseAdmin
    .from('creatives')
    .update({ content_text: sanitized, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
    .select('id, type, content_url, content_text, performance_score, generation_id, created_at, updated_at')
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})
