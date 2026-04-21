import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { inngest } from '../../jobs/inngest.js'

type Variables = { userId: string; orgId: string }

export const creativesRouter = new Hono<{ Variables: Variables }>()

// GET /creatives — list all creatives for org, sorted by performance_score desc
creativesRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  const { type, limit = '50', offset = '0' } = c.req.query()

  let query = supabaseAdmin
    .from('creatives')
    .select(
      'id, type, content_url, content_text, performance_score, generation_id, created_at, updated_at',
      { count: 'exact' }
    )
    .eq('org_id', orgId)
    .order('performance_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (type === 'copy' || type === 'image') query = query.eq('type', type)

  const { data, error, count } = await query
  if (error) return c.json({ error: error.message }, 500)

  return c.json({ creatives: data ?? [], total: count ?? 0 })
})

// POST /creatives/generate — queue a creative generation job
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

  // Create the generation job record
  const { data: job, error: insertErr } = await supabaseAdmin
    .from('creative_generations')
    .insert({
      org_id: orgId,
      generation_type,
      status: 'pending',
      ad_account_id: ad_account_id ?? null,
      campaign_name: campaign_name ?? null,
    })
    .select('id')
    .single()

  if (insertErr || !job) {
    return c.json({ error: insertErr?.message ?? 'Failed to create generation job' }, 500)
  }

  // Dispatch to Inngest
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

  return c.json({ generation_id: job.id }, 202)
})

// GET /creatives/generations/:id — get job status
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

// GET /creatives/:id — single creative
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
  return c.json(data)
})

// PATCH /creatives/:id — edit copy creative text
creativesRouter.patch('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  let body: { content_text?: { headline?: string; body?: string; cta?: string } }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  // Verify it's a copy creative that belongs to this org
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('creatives')
    .select('id, type, org_id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (fetchErr || !existing) return c.json({ error: 'Creative not found' }, 404)
  if (existing.type !== 'copy') return c.json({ error: 'Only copy creatives can be edited' }, 400)

  const { data, error } = await supabaseAdmin
    .from('creatives')
    .update({ content_text: body.content_text, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
    .select('id, type, content_url, content_text, performance_score, generation_id, created_at, updated_at')
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})
