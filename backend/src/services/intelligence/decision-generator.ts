import { supabaseAdmin } from '../../lib/supabase.js'
import { readSecret } from '../../lib/vault.js'
import { getOpenRouterClient, generateDecisionExplanation } from '../ai/openrouter.js'
import { detectAnomalies, type AnomalyType } from './anomaly-detection.js'

const SEVERITY_WEIGHTS: Record<AnomalyType, number> = {
  ROAS_DROP: 90,
  CONVERSION_DROP: 85,
  SPEND_SPIKE: 70,
  SCALING_OPPORTUNITY: 40,
}

function computeConfidence(deltaPct: number, dataPoints: number, consecutiveDays: number): number {
  let score = Math.max(0, 100 - deltaPct * 0.5)
  if (dataPoints >= 7) score += 10
  if (consecutiveDays >= 2) score += 5
  return Math.min(100, Math.round(score))
}

async function resolveAIClient(
  orgId: string
): Promise<{ client: ReturnType<typeof getOpenRouterClient> | null; isLtd: boolean; hasNoByok: boolean }> {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('plan_type, vault_byok_openrouter_secret_id')
    .eq('org_id', orgId)
    .single()

  if (!org) throw new Error(`Org ${orgId} not found`)

  if (org.plan_type === 'ltd') {
    if (!org.vault_byok_openrouter_secret_id) {
      return { client: null, isLtd: true, hasNoByok: true }
    }
    const key = await readSecret(org.vault_byok_openrouter_secret_id as string)
    return { client: getOpenRouterClient(key), isLtd: true, hasNoByok: false }
  }

  // subscription — platform key, credit check happens per decision
  return { client: getOpenRouterClient(process.env.OPENROUTER_API_KEY!), isLtd: false, hasNoByok: false }
}

export async function generateDecisionsForOrg(orgId: string, runId: string): Promise<number> {
  const anomalies = await detectAnomalies(orgId)
  if (anomalies.length === 0) return 0

  const { client, isLtd, hasNoByok } = await resolveAIClient(orgId)
  const org = isLtd
    ? { plan_type: 'ltd' }
    : (await supabaseAdmin.from('organizations').select('plan_type').eq('org_id', orgId).single()).data

  let written = 0

  for (const anomaly of anomalies) {
    // Compute confidence & priority
    const snapshot = anomaly.dataSnapshot as Record<string, number>
    const currentVal = snapshot.roas ?? snapshot.spend ?? snapshot.conversions ?? 0
    const avgVal = snapshot.roas_avg_7d ?? snapshot.spend_avg_7d ?? snapshot.conv_avg_7d ?? 1
    const deltaPct = avgVal > 0 ? Math.abs((currentVal - avgVal) / avgVal) * 100 : 0
    const confidenceScore = computeConfidence(deltaPct, anomaly.dataPoints, anomaly.consecutiveDays)
    const priorityScore = parseFloat(
      (SEVERITY_WEIGHTS[anomaly.type] * (confidenceScore / 100)).toFixed(2)
    )

    // Mark existing active decisions for same campaign+type as stale
    await supabaseAdmin
      .from('decisions')
      .update({ status: 'stale' })
      .eq('org_id', orgId)
      .eq('campaign_id', anomaly.campaignId)
      .eq('type', anomaly.type)
      .eq('status', 'active')

    let aiExplanation: string | null = null
    let confidenceRationale: string | null = null
    let recommendedAction = `Review campaign ${anomaly.campaignId} — ${anomaly.type.toLowerCase().replace('_', ' ')} detected`
    let aiStatus: 'completed' | 'credits_exhausted' | 'ai_unavailable' | 'pending' = 'pending'

    if (hasNoByok) {
      aiStatus = 'ai_unavailable'
      recommendedAction = `Add an AI key in Settings to get recommendations for this ${anomaly.type}`
    } else if (client) {
      // subscription: try to deduct a credit first
      if (!isLtd) {
        const { data: newBalance } = await supabaseAdmin.rpc('deduct_credit', { p_org_id: orgId })
        if (newBalance === null) {
          aiStatus = 'credits_exhausted'
          recommendedAction = `Add credits to see AI recommendations for this ${anomaly.type}`
        }
      }

      if (aiStatus === 'pending') {
        try {
          const result = await generateDecisionExplanation(client, {
            campaignId: anomaly.campaignId,
            platform: anomaly.platform,
            anomalyType: anomaly.type,
            triggerCondition: anomaly.triggerCondition,
            dataSnapshot: anomaly.dataSnapshot,
          })
          aiExplanation = result.explanation
          confidenceRationale = result.confidence_rationale
          recommendedAction = result.recommended_action
          aiStatus = 'completed'
        } catch {
          aiStatus = 'ai_unavailable'
        }
      }
    }

    const { error } = await supabaseAdmin.from('decisions').insert({
      org_id: orgId,
      integration_id: anomaly.integrationId,
      ad_account_id: anomaly.adAccountId,
      campaign_id: anomaly.campaignId,
      platform: anomaly.platform,
      type: anomaly.type,
      status: 'active',
      trigger_condition: anomaly.triggerCondition,
      data_snapshot: anomaly.dataSnapshot,
      ai_explanation: aiExplanation,
      ai_status: aiStatus,
      confidence_score: confidenceScore,
      confidence_rationale: confidenceRationale,
      recommended_action: recommendedAction,
      priority_score: priorityScore,
      decision_run_id: runId,
    })

    if (!error) written++
  }

  return written
}
