import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { ok, fail } from '../../utils/response.js'

// Continuation #31 (2026-05-12) — PHASE2_ENVELOPE_FOLLOWUP item M resolution.
// Phase 2 routes canonicalized onto the Phase 1 canonical envelope per
// ADJACENT CONTINUATION AUTHORITY ("wiring already-existing contracts" +
// "expanding existing canonical APIs"). FE apiClient detection-unwrap
// (#13) absorbs the change transparently: pre-conversion bodies passed
// through raw; post-conversion bodies auto-unwrap on `success` key. FE
// consumers see identical post-unwrap results. No behavior change.
//
// requestId declared in Variables type so the Phase 1 envelope helpers
// (ok/fail) can read c.get('requestId') for the request_id field —
// matches the established pattern in history.ts / campaigns.ts / etc.
type Variables = { userId: string; orgId: string; requestId: string }
export const metricsRouter = new Hono<{ Variables: Variables }>()

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))
}

function aggregateRows(rows: Array<{ spend: unknown; impressions: unknown; clicks: unknown; conversions: unknown; revenue: unknown }>) {
  const spend = rows.reduce((sum, r) => sum + Number(r.spend), 0)
  const impressions = rows.reduce((sum, r) => sum + Number(r.impressions), 0)
  const clicks = rows.reduce((sum, r) => sum + Number(r.clicks), 0)
  const conversions = rows.reduce((sum, r) => sum + Number(r.conversions), 0)
  const revenue = rows.reduce((sum, r) => sum + Number(r.revenue), 0)
  const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0
  return {
    spend: Math.round(spend * 100) / 100,
    impressions,
    clicks,
    conversions,
    revenue: Math.round(revenue * 100) / 100,
    roas,
  }
}

// GET /api/v1/metrics/summary
metricsRouter.get('/summary', async (c) => {
  const orgId = c.get('orgId')
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!from || !to || !isValidDate(from) || !isValidDate(to)) {
    return fail(c, 'from and to query parameters are required (YYYY-MM-DD)', 400, { code: 'INVALID_QUERY' })
  }

  const { data, error } = await supabaseAdmin
    .from('campaign_metrics')
    .select('spend, impressions, clicks, conversions, revenue')
    .eq('org_id', orgId)
    .gte('date', from)
    .lte('date', to)

  // CONSTITUTION §3 + #4 hardening pattern (matches history.ts/campaigns.ts):
  // throw DB errors → app.onError(errorHandler) emits sanitized canonical
  // 500 body with request_id; full error captured in Sentry + stdout [err].
  if (error) {
    throw new Error(`metrics/summary lookup failed: ${error.message}`)
  }

  const agg = aggregateRows(data ?? [])
  return ok(c, { ...agg, dateRange: { from, to } })
})

// GET /api/v1/metrics/channels
metricsRouter.get('/channels', async (c) => {
  const orgId = c.get('orgId')
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!from || !to || !isValidDate(from) || !isValidDate(to)) {
    return fail(c, 'from and to query parameters are required (YYYY-MM-DD)', 400, { code: 'INVALID_QUERY' })
  }

  const { data, error } = await supabaseAdmin
    .from('campaign_metrics')
    .select('platform, spend, impressions, clicks, conversions, revenue')
    .eq('org_id', orgId)
    .gte('date', from)
    .lte('date', to)

  if (error) {
    throw new Error(`metrics/channels lookup failed: ${error.message}`)
  }

  const byPlatform: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; revenue: number }> = {}

  for (const row of data ?? []) {
    const p = row.platform as string
    if (!byPlatform[p]) byPlatform[p] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
    byPlatform[p].spend += Number(row.spend)
    byPlatform[p].impressions += Number(row.impressions)
    byPlatform[p].clicks += Number(row.clicks)
    byPlatform[p].conversions += Number(row.conversions)
    byPlatform[p].revenue += Number(row.revenue)
  }

  const channels = Object.entries(byPlatform).map(([platform, m]) => ({
    platform,
    spend: Math.round(m.spend * 100) / 100,
    impressions: m.impressions,
    clicks: m.clicks,
    conversions: m.conversions,
    revenue: Math.round(m.revenue * 100) / 100,
    roas: m.spend > 0 ? Math.round((m.revenue / m.spend) * 100) / 100 : 0,
  }))

  return ok(c, channels)
})
