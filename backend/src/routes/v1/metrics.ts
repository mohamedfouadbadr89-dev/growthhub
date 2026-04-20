import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'

type Variables = { userId: string; orgId: string }
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
    return c.json(
      { error: 'Bad Request', message: 'from and to query parameters are required (YYYY-MM-DD)' },
      400
    )
  }

  const { data, error } = await supabaseAdmin
    .from('campaign_metrics')
    .select('spend, impressions, clicks, conversions, revenue')
    .eq('org_id', orgId)
    .gte('date', from)
    .lte('date', to)

  if (error) return c.json({ error: 'Internal Server Error' }, 500)

  const agg = aggregateRows(data ?? [])
  return c.json({ ...agg, dateRange: { from, to } })
})

// GET /api/v1/metrics/channels
metricsRouter.get('/channels', async (c) => {
  const orgId = c.get('orgId')
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!from || !to || !isValidDate(from) || !isValidDate(to)) {
    return c.json(
      { error: 'Bad Request', message: 'from and to query parameters are required (YYYY-MM-DD)' },
      400
    )
  }

  const { data, error } = await supabaseAdmin
    .from('campaign_metrics')
    .select('platform, spend, impressions, clicks, conversions, revenue')
    .eq('org_id', orgId)
    .gte('date', from)
    .lte('date', to)

  if (error) return c.json({ error: 'Internal Server Error' }, 500)

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

  return c.json(channels)
})
