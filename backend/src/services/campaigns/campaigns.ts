import { supabaseAdmin } from '../../lib/supabase.js'
import { executeAction } from '../execution/action-executor.js'

export interface CampaignMetrics {
  spend: number
  revenue: number
  roas: number
  conversions: number
  impressions: number
  trend_14d?: Array<{ date: string; spend: number; roas: number }>
}

export interface Campaign {
  id: string
  org_id: string
  name: string
  platform: string
  status: string
  daily_budget: number | null
  targeting: Record<string, unknown>
  ad_account_id: string | null
  platform_campaign_id: string | null
  ai_suggestions: Record<string, unknown> | null
  metrics: CampaignMetrics
  created_at: string
  updated_at: string
}

export interface CampaignDetail extends Campaign {
  decisions: Array<{
    id: string
    title: string
    confidence_score: number
    status: string
    action_id: string | null
  }>
}

export interface CampaignFilters {
  status?: string
  platform?: string
  limit: number
  offset: number
}

const VALID_STATUSES = new Set(['draft', 'active', 'paused', 'completed', 'archived'])

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft:     ['active', 'archived'],
  active:    ['paused', 'completed', 'archived'],
  paused:    ['active', 'completed', 'archived'],
  completed: ['archived'],
  archived:  [],
}

const META_CREATE_ACTION_ID  = '00000000-0000-0000-0000-000000000009'
const GOOGLE_CREATE_ACTION_ID = '00000000-0000-0000-0000-000000000010'

async function fetchMetricsByOrg(
  orgId: string,
  days: number
): Promise<Map<string, CampaignMetrics>> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const fromDate = since.toISOString().slice(0, 10)

  const { data } = await supabaseAdmin
    .from('campaign_metrics')
    .select('campaign_name, platform, spend, revenue, conversions, impressions')
    .eq('org_id', orgId)
    .gte('date', fromDate)

  const map = new Map<string, CampaignMetrics>()
  for (const row of data ?? []) {
    const key = `${(row.campaign_name as string).toLowerCase()}::${(row.platform as string).toLowerCase()}`
    const existing = map.get(key) ?? { spend: 0, revenue: 0, roas: 0, conversions: 0, impressions: 0 }
    existing.spend       += Number(row.spend ?? 0)
    existing.revenue     += Number(row.revenue ?? 0)
    existing.conversions += Number(row.conversions ?? 0)
    existing.impressions += Number(row.impressions ?? 0)
    map.set(key, existing)
  }

  for (const [key, m] of map.entries()) {
    m.roas = m.spend > 0 ? m.revenue / m.spend : 0
    map.set(key, m)
  }

  return map
}

export async function listCampaigns(
  orgId: string,
  filters: CampaignFilters
): Promise<{ campaigns: Campaign[]; total: number }> {
  let query = supabaseAdmin
    .from('campaigns')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1)

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'default') {
      query = query.neq('status', 'archived')
    } else {
      query = query.eq('status', filters.status)
    }
  } else if (!filters.status) {
    query = query.neq('status', 'archived')
  }

  if (filters.platform) {
    query = query.eq('platform', filters.platform)
  }

  const { data, count, error } = await query
  if (error) throw new Error(`Failed to list campaigns: ${error.message}`)

  const metricsMap = await fetchMetricsByOrg(orgId, 30)

  const campaigns = (data ?? []).map((row) => {
    const key = `${(row.name as string).toLowerCase()}::${(row.platform as string).toLowerCase()}`
    const metrics = metricsMap.get(key) ?? { spend: 0, revenue: 0, roas: 0, conversions: 0, impressions: 0 }
    return { ...row, metrics } as Campaign
  })

  return { campaigns, total: count ?? 0 }
}

export async function getCampaignById(orgId: string, id: string): Promise<CampaignDetail | null> {
  const { data: row, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .single()

  if (error || !row) return null

  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  const from30 = since30.toISOString().slice(0, 10)

  const since14 = new Date()
  since14.setDate(since14.getDate() - 14)
  const from14 = since14.toISOString().slice(0, 10)

  // 30-day aggregated metrics
  const { data: metricRows } = await supabaseAdmin
    .from('campaign_metrics')
    .select('spend, revenue, conversions, impressions')
    .eq('org_id', orgId)
    .ilike('campaign_name', row.name as string)
    .gte('date', from30)

  let spend = 0, revenue = 0, conversions = 0, impressions = 0
  for (const m of metricRows ?? []) {
    spend       += Number(m.spend ?? 0)
    revenue     += Number(m.revenue ?? 0)
    conversions += Number(m.conversions ?? 0)
    impressions += Number(m.impressions ?? 0)
  }
  const roas = spend > 0 ? revenue / spend : 0

  // 14-day daily trend
  const { data: trendRows } = await supabaseAdmin
    .from('campaign_metrics')
    .select('date, spend, revenue')
    .eq('org_id', orgId)
    .ilike('campaign_name', row.name as string)
    .gte('date', from14)
    .order('date', { ascending: true })

  const trendMap = new Map<string, { spend: number; revenue: number }>()
  for (const t of trendRows ?? []) {
    const d = t.date as string
    const existing = trendMap.get(d) ?? { spend: 0, revenue: 0 }
    existing.spend   += Number(t.spend ?? 0)
    existing.revenue += Number(t.revenue ?? 0)
    trendMap.set(d, existing)
  }

  const trend_14d = Array.from(trendMap.entries()).map(([date, vals]) => ({
    date,
    spend: vals.spend,
    roas:  vals.spend > 0 ? vals.revenue / vals.spend : 0,
  }))

  // Decisions overlay: active decisions referencing campaign by name
  const { data: decisionRows } = await supabaseAdmin
    .from('decisions')
    .select('id, title, confidence_score, status, action_id')
    .eq('org_id', orgId)
    .ilike('campaign_name', row.name as string)
    .eq('status', 'active')

  const decisions = (decisionRows ?? []).map((d) => ({
    id:               d.id as string,
    title:            d.title as string,
    confidence_score: Number(d.confidence_score ?? 0),
    status:           d.status as string,
    action_id:        d.action_id as string | null,
  }))

  return {
    ...row,
    metrics: { spend, revenue, roas, conversions, impressions, trend_14d },
    decisions,
  } as CampaignDetail
}

export async function createCampaign(
  orgId: string,
  body: {
    name: string
    platform: string
    daily_budget?: number
    ad_account_id?: string
    targeting?: Record<string, unknown>
  }
): Promise<Campaign> {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .insert({
      org_id:       orgId,
      name:         body.name,
      platform:     body.platform,
      daily_budget: body.daily_budget ?? null,
      ad_account_id: body.ad_account_id ?? null,
      targeting:    body.targeting ?? {},
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw Object.assign(
        new Error(`Campaign "${body.name}" on ${body.platform} already exists`),
        { code: 'CONFLICT' }
      )
    }
    throw new Error(`Failed to create campaign: ${error.message}`)
  }

  return { ...data, metrics: { spend: 0, revenue: 0, roas: 0, conversions: 0, impressions: 0 } } as Campaign
}

export async function updateCampaign(
  orgId: string,
  id: string,
  patch: {
    status?: string
    daily_budget?: number
    targeting?: Record<string, unknown>
    name?: string
  },
  role: string
): Promise<Campaign | null> {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .single()

  if (fetchErr || !existing) return null

  if (patch.status) {
    if (!VALID_STATUSES.has(patch.status)) {
      throw Object.assign(new Error(`Invalid status: ${patch.status}`), { code: 'INVALID_STATUS' })
    }
    const allowed = VALID_TRANSITIONS[existing.status as string] ?? []
    if (!allowed.includes(patch.status)) {
      throw Object.assign(
        new Error(`Cannot transition from ${existing.status} to ${patch.status}`),
        { code: 'INVALID_TRANSITION' }
      )
    }
    if (patch.status === 'archived' && role !== 'admin') {
      throw Object.assign(new Error('Only admins can archive campaigns'), { code: 'FORBIDDEN' })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .update({
      ...(patch.status       !== undefined && { status: patch.status }),
      ...(patch.daily_budget !== undefined && { daily_budget: patch.daily_budget }),
      ...(patch.targeting    !== undefined && { targeting: patch.targeting }),
      ...(patch.name         !== undefined && { name: patch.name }),
    })
    .eq('org_id', orgId)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) throw new Error(`Failed to update campaign: ${error?.message}`)

  return { ...data, metrics: { spend: 0, revenue: 0, roas: 0, conversions: 0, impressions: 0 } } as Campaign
}

export async function pushCampaign(
  orgId: string,
  campaignId: string,
  platform: string
): Promise<{ history_id: string; action_id: string; status: string }> {
  const { data: campaign, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', campaignId)
    .single()

  if (error || !campaign) {
    throw Object.assign(new Error('Campaign not found'), { code: 'NOT_FOUND' })
  }

  if (!['draft', 'paused'].includes(campaign.status as string)) {
    throw Object.assign(
      new Error('Campaign must be in draft or paused status to push'),
      { code: 'INVALID_STATUS' }
    )
  }

  const actionTemplateId = platform === 'meta' ? META_CREATE_ACTION_ID : GOOGLE_CREATE_ACTION_ID

  const { historyId } = await executeAction({
    templateId: actionTemplateId,
    params: {
      campaign_name: campaign.name,
      daily_budget:  campaign.daily_budget,
      targeting:     campaign.targeting,
    },
    orgId,
    executedBy: 'manual',
  })

  return { history_id: historyId, action_id: actionTemplateId, status: 'executed' }
}
