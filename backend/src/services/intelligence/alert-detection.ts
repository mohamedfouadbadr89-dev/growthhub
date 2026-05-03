import { supabaseAdmin } from '../../lib/supabase.js'

const DEFAULT_THRESHOLDS: Record<string, number> = {
  ROAS_BELOW_THRESHOLD: 1.5,
  SPEND_EXCEEDED: 10000,
}

export async function detectAlerts(orgId: string, runId: string): Promise<number> {
  // Fetch org-level threshold overrides
  const { data: thresholdRows } = await supabaseAdmin
    .from('alert_thresholds')
    .select('type, threshold_value')
    .eq('org_id', orgId)

  const thresholds: Record<string, number> = { ...DEFAULT_THRESHOLDS }
  for (const row of thresholdRows ?? []) {
    thresholds[row.type as string] = Number(row.threshold_value)
  }

  // Latest day metrics per campaign
  const { data: metrics, error } = await (supabaseAdmin as any).rpc('get_latest_campaign_metrics', {
    p_org_id: orgId,
  })
  if (error) throw new Error(`Alert metric fetch failed: ${error.message}`)

  if (!metrics || metrics.length === 0) return 0

  // Fetch existing active alerts from last 24h to dedup
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: existingAlerts } = await supabaseAdmin
    .from('alerts')
    .select('campaign_id, type')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .gte('created_at', since)

  const existing = new Set(
    (existingAlerts ?? []).map((a: { campaign_id: string; type: string }) => `${a.campaign_id}:${a.type}`)
  )

  const toInsert: Record<string, unknown>[] = []

  for (const m of metrics as Array<{
    campaign_id: string; platform: string; integration_id: string;
    roas: number; spend: number;
  }>) {
    const roas = Number(m.roas)
    const spend = Number(m.spend)

    // ROAS_BELOW_THRESHOLD
    const roasThreshold = thresholds['ROAS_BELOW_THRESHOLD']
    const roasKey = `${m.campaign_id}:ROAS_BELOW_THRESHOLD`
    if (roas < roasThreshold && !existing.has(roasKey)) {
      toInsert.push({
        org_id: orgId,
        integration_id: m.integration_id,
        campaign_id: m.campaign_id,
        platform: m.platform,
        type: 'ROAS_BELOW_THRESHOLD',
        severity: roas < roasThreshold / 2 ? 'critical' : 'warning',
        breached_value: roas,
        threshold_value: roasThreshold,
        decision_run_id: runId,
      })
    }

    // SPEND_EXCEEDED
    const spendThreshold = thresholds['SPEND_EXCEEDED']
    const spendKey = `${m.campaign_id}:SPEND_EXCEEDED`
    if (spend > spendThreshold && !existing.has(spendKey)) {
      toInsert.push({
        org_id: orgId,
        integration_id: m.integration_id,
        campaign_id: m.campaign_id,
        platform: m.platform,
        type: 'SPEND_EXCEEDED',
        severity: spend > spendThreshold * 2 ? 'critical' : 'warning',
        breached_value: spend,
        threshold_value: spendThreshold,
        decision_run_id: runId,
      })
    }
  }

  if (toInsert.length === 0) return 0

  const { error: insertError } = await supabaseAdmin.from('alerts').insert(toInsert)
  if (insertError) throw new Error(`Alert insert failed: ${insertError.message}`)

  return toInsert.length
}
