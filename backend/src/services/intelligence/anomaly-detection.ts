import { supabaseAdmin } from '../../lib/supabase.js'

export type AnomalyType = 'ROAS_DROP' | 'SPEND_SPIKE' | 'CONVERSION_DROP' | 'SCALING_OPPORTUNITY'

export interface AnomalyCandidate {
  campaignId: string
  platform: string
  integrationId: string
  adAccountId: string | null
  type: AnomalyType
  triggerCondition: string
  dataSnapshot: Record<string, unknown>
  dataPoints: number
  consecutiveDays: number
}

interface MetricRow {
  campaign_id: string
  platform: string
  integration_id: string
  ad_account_id: string | null
  date: string
  roas: number
  spend: number
  conversions: number
  roas_avg_7d: number
  spend_avg_7d: number
  conv_avg_7d: number
  data_points: number
}

export async function detectAnomalies(orgId: string): Promise<AnomalyCandidate[]> {
  const { data, error } = await (supabaseAdmin as any).rpc('detect_anomaly_candidates', {
    p_org_id: orgId,
  })

  if (error) throw new Error(`Anomaly detection query failed: ${error.message}`)

  const rows = (data ?? []) as MetricRow[]
  const candidates: AnomalyCandidate[] = []

  for (const row of rows) {
    if (row.data_points < 3) continue

    const roasAvg = Number(row.roas_avg_7d)
    const spendAvg = Number(row.spend_avg_7d)
    const convAvg = Number(row.conv_avg_7d)
    const roas = Number(row.roas)
    const spend = Number(row.spend)
    const convs = Number(row.conversions)

    // ROAS_DROP: latest day's ROAS is >30% below 7-day avg
    if (roasAvg > 0 && roas < roasAvg * 0.70) {
      candidates.push({
        campaignId: row.campaign_id,
        platform: row.platform,
        integrationId: row.integration_id,
        adAccountId: row.ad_account_id,
        type: 'ROAS_DROP',
        triggerCondition: `ROAS dropped from ${roasAvg.toFixed(2)}x to ${roas.toFixed(2)}x (${Math.round((1 - roas / roasAvg) * 100)}% below 7-day average)`,
        dataSnapshot: { roas, roas_avg_7d: roasAvg, spend, date: row.date },
        dataPoints: row.data_points,
        consecutiveDays: 1,
      })
    }
    // SPEND_SPIKE: latest day's spend is >3x the 7-day avg
    else if (spendAvg > 0 && spend > spendAvg * 3.0) {
      candidates.push({
        campaignId: row.campaign_id,
        platform: row.platform,
        integrationId: row.integration_id,
        adAccountId: row.ad_account_id,
        type: 'SPEND_SPIKE',
        triggerCondition: `Daily spend of $${spend.toFixed(2)} is ${(spend / spendAvg).toFixed(1)}x above the 7-day average of $${spendAvg.toFixed(2)}`,
        dataSnapshot: { spend, spend_avg_7d: spendAvg, roas, date: row.date },
        dataPoints: row.data_points,
        consecutiveDays: 1,
      })
    }
    // CONVERSION_DROP: daily conversions >40% below 7-day avg
    else if (convAvg > 0 && convs < convAvg * 0.60) {
      candidates.push({
        campaignId: row.campaign_id,
        platform: row.platform,
        integrationId: row.integration_id,
        adAccountId: row.ad_account_id,
        type: 'CONVERSION_DROP',
        triggerCondition: `Conversions dropped from ${convAvg.toFixed(0)} to ${convs} per day (${Math.round((1 - convs / convAvg) * 100)}% below 7-day average)`,
        dataSnapshot: { conversions: convs, conv_avg_7d: convAvg, roas, spend, date: row.date },
        dataPoints: row.data_points,
        consecutiveDays: 1,
      })
    }
    // SCALING_OPPORTUNITY: ROAS >3.5x (streak check done separately via data_points context)
    else if (roas > 3.5 && row.data_points >= 5) {
      candidates.push({
        campaignId: row.campaign_id,
        platform: row.platform,
        integrationId: row.integration_id,
        adAccountId: row.ad_account_id,
        type: 'SCALING_OPPORTUNITY',
        triggerCondition: `Campaign maintaining ${roas.toFixed(2)}x ROAS — above 3.5x scaling threshold with ${row.data_points} days of data`,
        dataSnapshot: { roas, roas_avg_7d: roasAvg, spend, data_points: row.data_points, date: row.date },
        dataPoints: row.data_points,
        consecutiveDays: row.data_points,
      })
    }
  }

  return candidates
}
