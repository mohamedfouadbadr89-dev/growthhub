import { supabaseAdmin } from '../../lib/supabase.js'

interface ActiveDecision {
  id: string
  type: string
  campaign_id: string
  confidence_score: number
  data_snapshot: Record<string, unknown>
  ai_explanation: string | null
  trigger_condition: string
}

interface ActionLib {
  platform: string
  name: string
}

interface AutomationRule {
  id: string
  name: string
  trigger_type: string
  min_confidence_threshold: number
  action_template_id: string
  action_params: Record<string, unknown>
  run_count: number
  actions_library: ActionLib
}

export async function dispatchAutomation(orgId: string, runId: string): Promise<number> {
  // 1. Fetch run start time
  const { data: run } = await supabaseAdmin
    .from('decision_runs')
    .select('created_at')
    .eq('id', runId)
    .single()

  const runStartedAt = run?.created_at as string | undefined

  // 2. Fetch enabled rules for org
  const { data: rules } = await supabaseAdmin
    .from('automation_rules')
    .select('id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, run_count, actions_library(platform, name)')
    .eq('org_id', orgId)
    .eq('enabled', true)

  if (!rules || rules.length === 0) return 0

  // 3. Fetch active decisions created in this run
  let decisionsQuery = supabaseAdmin
    .from('decisions')
    .select('id, type, campaign_id, confidence_score, data_snapshot, ai_explanation, trigger_condition')
    .eq('org_id', orgId)
    .eq('status', 'active')

  if (runStartedAt) {
    decisionsQuery = decisionsQuery.gte('created_at', runStartedAt)
  }

  const { data: decisions } = await decisionsQuery

  if (!decisions || decisions.length === 0) return 0

  let rulesExecuted = 0

  // 4. Match and execute each (decision, rule) pair
  for (const rule of rules as AutomationRule[]) {
    const actionLib = Array.isArray(rule.actions_library)
      ? (rule.actions_library[0] as ActionLib)
      : (rule.actions_library as ActionLib)

    for (const decision of decisions as ActiveDecision[]) {
      if (rule.trigger_type !== decision.type) continue
      if ((decision.confidence_score ?? 0) < rule.min_confidence_threshold) continue

      // Resolve 'auto' campaign_id from decision context
      const resolvedParams: Record<string, unknown> = { ...rule.action_params }
      if (resolvedParams.campaign_id === 'auto') {
        resolvedParams.campaign_id =
          (decision.data_snapshot?.campaign_id as string | undefined) ?? decision.campaign_id
      }

      const paramSummary = Object.entries(resolvedParams)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      const actionTaken = `${actionLib.name}${paramSummary ? ` — ${paramSummary}` : ''}`

      let execStatus: 'success' | 'failed' = 'success'
      let resultData: Record<string, unknown> = {}
      let errorMessage: string | undefined

      // Check integration
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('id')
        .eq('org_id', orgId)
        .eq('platform', actionLib.platform)
        .eq('status', 'connected')
        .single()

      if (!integration) {
        execStatus = 'failed'
        errorMessage = `Platform ${actionLib.platform} not connected`
      } else {
        resultData = { simulated: true, action_template_id: rule.action_template_id, ...resolvedParams }
      }

      // Insert automation_run
      const { data: runRow } = await supabaseAdmin
        .from('automation_runs')
        .insert({
          org_id:             orgId,
          automation_rule_id: rule.id,
          decision_id:        decision.id,
          action_template_id: rule.action_template_id,
          status:             execStatus,
          result_data:        resultData,
          error_message:      errorMessage ?? null,
        })
        .select('id')
        .single()

      // Insert decision_history (constitution-mandated)
      await supabaseAdmin
        .from('decision_history')
        .insert({
          org_id:             orgId,
          decision:           decision.trigger_condition,
          action_taken:       actionTaken,
          trigger_condition:  `Rule: ${rule.name} — ${decision.trigger_condition}`,
          data_used:          decision.data_snapshot ?? {},
          result:             execStatus,
          ai_explanation:     decision.ai_explanation ?? null,
          confidence_score:   decision.confidence_score,
          decision_id:        decision.id,
          automation_rule_id: rule.id,
          automation_run_id:  runRow?.id ?? null,
          executed_by:        'automation',
        })

      // Update rule run_count and last_fired_at
      await supabaseAdmin
        .from('automation_rules')
        .update({
          run_count:    rule.run_count + 1,
          last_fired_at: new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        })
        .eq('id', rule.id)

      rulesExecuted++
    }
  }

  return rulesExecuted
}
