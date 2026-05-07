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

// ─── Schema-drift-tolerant DB error guard ─────────────────────────────
//
// Per CONSTITUTION §3 "Fail Loudly". Several reads in this service
// touch tables in known-deferred or known-malformed states:
//
//   - `campaign_metrics` is Phase 2 (data ingestion), intentionally
//     deferred per SYSTEM_CONTROL.md → expect Postgres 42P01
//     ("relation does not exist") until Phase 2 unlocks.
//
//   - The legacy `decisions` table is deployed (per remote_schema dump
//     20260503170252) but its `org_id` is UUID and its column shape
//     diverges from what this service was originally written against:
//       deployed: id, org_id, type, status, reasoning_steps,
//                 suggested_action_id, metadata, confidence_score,
//                 created_at
//       requested: id, title, confidence_score, status, action_id +
//                  filter on campaign_name
//     → expect 22P02 ("invalid input syntax for type uuid") on org_id
//       AND 42703 ("undefined_column") on title / action_id /
//       campaign_name. Phase 4 minimal migration preamble explicitly
//       tags this table as "deprecated and malformed in the live DB"
//       and SYSTEM_CONTROL.md "CANONICAL AI SYSTEM" classifies it as
//       DEPRECATED. The /decisions route is already gated behind 503;
//       the campaigns overlay is the last remaining caller of the
//       malformed table. Re-aligning the SELECT to the deployed columns
//       would be tantamount to resurrecting the deprecated anomaly
//       engine — explicitly forbidden by governance. Tolerating the
//       column-shape mismatch as documented expected drift preserves
//       the deprecation while keeping campaigns/[id] data hydration
//       intact (overlay degrades to []).
//
// This guard treats ONLY those three specific codes as documented
// silent-degrade conditions (campaigns continue to render with zero
// metrics / no decisions overlay — preserves operational behavior).
// Any OTHER Postgres error (RLS denial, network, connection pool, etc.)
// throws — surfacing real production issues rather than masking them
// as "empty data".
//
// Pre-fix behavior was `const { data } = await ...` which dropped the
// error object entirely; that was a Constitution §3 violation
// regardless of root cause.
const EXPECTED_SCHEMA_DRIFT = new Set([
  '42P01', // relation does not exist  → Phase 2 deferred tables
  '22P02', // invalid input syntax for type → legacy decisions.org_id type drift
  '42703', // undefined_column → legacy decisions.{title, action_id, campaign_name} drift
])

function checkDbReadError(
  err: { code?: string; message?: string } | null,
  table: string,
  ctx: string,
): void {
  if (!err) return
  const code = err.code ?? '?'
  if (EXPECTED_SCHEMA_DRIFT.has(code)) {
    console.warn(
      `[campaigns] ${table} read silently degraded (${code}): ${err.message ?? '<no message>'} — context: ${ctx}`,
    )
    return
  }
  console.error(`[campaigns] ${table} read failed (${code}):`, err)
  throw new Error(`${table} read failed: ${err.message ?? code}`)
}

async function fetchMetricsByOrg(
  orgId: string,
  days: number
): Promise<Map<string, CampaignMetrics>> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const fromDate = since.toISOString().slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from('campaign_metrics')
    .select('campaign_name, platform, spend, revenue, conversions, impressions')
    .eq('org_id', orgId)
    .gte('date', fromDate)
  checkDbReadError(error, 'campaign_metrics', 'fetchMetricsByOrg')

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

  // Discriminate "campaign genuinely absent" from "DB layer failed".
  //
  // Pre-fix this branch was `if (error || !row) return null` → route then
  // mapped null to 404 'Campaign not found'. Pattern-identical to the
  // anti-patterns closed in auth.ts/verify, actions.ts/:id, history.ts/:id,
  // and creative-generator.ts:resolveApiKey in prior turns. Every
  // non-PGRST116 PostgrestError (network failure, RLS denial, schema drift,
  // connection pool exhaustion) was silently rebranded as "Campaign not
  // found" — pointing operators chasing production failures at the wrong
  // root cause (resource absence vs infrastructure / RLS / schema).
  //
  // PGRST116 → null preserves the route's 404 mapping for the genuine
  // not-found case. Every other error throws → caught by route catch
  // (post turn -1 hardening) → propagates to errorHandler → sanitized
  // 500 with request_id correlator chain.
  if (error && error.code !== 'PGRST116') {
    throw new Error(`campaigns lookup failed: ${error.message}`)
  }
  if (!row) return null

  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  const from30 = since30.toISOString().slice(0, 10)

  const since14 = new Date()
  since14.setDate(since14.getDate() - 14)
  const from14 = since14.toISOString().slice(0, 10)

  // 30-day aggregated metrics
  const { data: metricRows, error: metricErr } = await supabaseAdmin
    .from('campaign_metrics')
    .select('spend, revenue, conversions, impressions')
    .eq('org_id', orgId)
    .ilike('campaign_name', row.name as string)
    .gte('date', from30)
  checkDbReadError(metricErr, 'campaign_metrics', 'getCampaignById:30day_metrics')

  let spend = 0, revenue = 0, conversions = 0, impressions = 0
  for (const m of metricRows ?? []) {
    spend       += Number(m.spend ?? 0)
    revenue     += Number(m.revenue ?? 0)
    conversions += Number(m.conversions ?? 0)
    impressions += Number(m.impressions ?? 0)
  }
  const roas = spend > 0 ? revenue / spend : 0

  // 14-day daily trend
  const { data: trendRows, error: trendErr } = await supabaseAdmin
    .from('campaign_metrics')
    .select('date, spend, revenue')
    .eq('org_id', orgId)
    .ilike('campaign_name', row.name as string)
    .gte('date', from14)
    .order('date', { ascending: true })
  checkDbReadError(trendErr, 'campaign_metrics', 'getCampaignById:14day_trend')

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

  // Decisions overlay: active decisions referencing campaign by name.
  // Reads the legacy `decisions` table (deployed but malformed: org_id is
  // UUID, not TEXT) — checkDbReadError tolerates the expected 22P02
  // type-cast error and degrades to empty overlay; any other error throws.
  const { data: decisionRows, error: decisionErr } = await supabaseAdmin
    .from('decisions')
    .select('id, title, confidence_score, status, action_id')
    .eq('org_id', orgId)
    .ilike('campaign_name', row.name as string)
    .eq('status', 'active')
  checkDbReadError(decisionErr, 'decisions', 'getCampaignById:overlay')

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
  },
  // Phase 1 audit-column population (created_by / updated_by populated
  // verbatim from the authenticated Clerk userId on every campaign create).
  // Optional for backward-compat with any caller that doesn't have an HTTP
  // context — in which case the columns remain NULL on the row, matching
  // pre-Phase-1 rows. Server-side only: the userId is read from the route
  // handler's `c.get('userId')` (Clerk JWT subject), never from the body.
  userId?: string,
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
      ...(userId ? { created_by: userId, updated_by: userId } : {}),
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
  role: string,
  // Phase 1 audit-column population. Mirrors createCampaign's userId
  // semantics: server-side only, Clerk JWT subject from c.get('userId'),
  // never trusted from the body. When supplied, every UPDATE re-stamps
  // updated_by; created_by is preserved by the partial column list below.
  userId?: string,
): Promise<Campaign | null> {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .single()

  // Discriminate "campaign genuinely absent" from "DB layer failed".
  // Pattern-identical to getCampaignById's discriminator above (and to
  // the prior turns' route-level hardenings). PGRST116 → null preserves
  // the route's 404 mapping for genuine not-found. Other Postgrest codes
  // throw → route catch → errorHandler → sanitized 500 + correlator.
  if (fetchErr && fetchErr.code !== 'PGRST116') {
    throw new Error(`campaigns lookup failed: ${fetchErr.message}`)
  }
  if (!existing) return null

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
      ...(userId             !== undefined && { updated_by: userId }),
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
  platform: string,
  // Optional outer per-HTTP-request correlator from tracingMiddleware.
  // When supplied, threaded into executeAction so the resulting [exec]
  // log lines carry the same request_id as the [req] envelope. Optional
  // for backward compat with callers that don't have HTTP context.
  requestId?: string,
): Promise<{ history_id: string; action_id: string; status: string }> {
  const { data: campaign, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', campaignId)
    .single()

  // Discriminate "campaign genuinely absent" from "DB layer failed".
  //
  // Pre-fix this branch was `if (error || !campaign)` → 404 'Campaign not
  // found'. Pattern-identical to the anti-patterns closed in
  // getCampaignById (line 219) and updateCampaign (line 374) above —
  // every non-PGRST116 PostgrestError (network failure, RLS denial,
  // schema drift, connection pool exhaustion) was silently rebranded as
  // resource absence and surfaced as 404. CONSTITUTION §3 "Fail Loudly"
  // — DB infrastructure failures must surface as 5xx with full
  // request_id/Sentry correlator, not 4xx that misleads operators.
  //
  // Push is a write-path mutation (queues a real platform create), so
  // a misclassified 404 is doubly misleading: callers may retry against
  // a different :id ("maybe wrong campaign?") when the real cause is
  // transient infra. PGRST116 → 404 preserves the genuine not-found
  // mapping; everything else throws → route catch → errorHandler →
  // sanitized 500 + request_id correlator chain.
  if (error && error.code !== 'PGRST116') {
    throw new Error(`campaigns lookup failed: ${error.message}`)
  }
  if (!campaign) {
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
    requestId,
    executedBy: 'manual',
  })

  return { history_id: historyId, action_id: actionTemplateId, status: 'executed' }
}
