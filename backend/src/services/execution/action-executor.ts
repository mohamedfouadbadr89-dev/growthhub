import { supabaseAdmin } from '../../lib/supabase.js'

type ActionHandler = (
  params: Record<string, unknown>,
  ctx: { orgId: string; platform: string }
) => Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }>

const ACTION_HANDLERS: Record<string, ActionHandler> = {
  pause_campaign: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'pause_campaign', platform: ctx.platform, ...params },
  }),
  increase_budget: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'increase_budget', platform: ctx.platform, budget_change: '+20%', ...params },
  }),
  decrease_budget: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'decrease_budget', platform: ctx.platform, budget_change: '-20%', ...params },
  }),
  send_alert_email: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'send_alert_email', platform: ctx.platform, ...params },
  }),
  create_campaign: async (params, ctx) => ({
    success: true,
    result_data: { simulated: true, action_type: 'create_campaign', platform: ctx.platform, ...params },
  }),
}

interface ActionTemplate {
  id: string
  platform: string
  action_type: string
  name: string
  parameter_schema: { fields: Array<{ name: string; type: string; required: boolean; label: string }> }
}

interface LinkedDecision {
  trigger_condition: string
  data_snapshot: Record<string, unknown>
  ai_explanation: string | null
  confidence_score: number | null
}

export async function executeAction(
  templateId: string,
  params: Record<string, unknown>,
  orgId: string,
  decisionId?: string
): Promise<{ historyId: string; result: string; resultData: Record<string, unknown> }> {
  // 1. Fetch template
  const { data: template, error: tErr } = await supabaseAdmin
    .from('actions_library')
    .select('id, platform, action_type, name, parameter_schema')
    .eq('id', templateId)
    .single()

  if (tErr || !template) {
    const err = new Error('Action template not found') as Error & { code: string }
    err.code = 'NOT_FOUND'
    throw err
  }

  const t = template as ActionTemplate

  // 2. Validate required params
  const schema = t.parameter_schema?.fields ?? []
  for (const field of schema) {
    if (field.required && (params[field.name] === undefined || params[field.name] === null || params[field.name] === '')) {
      const err = new Error(`Missing required parameter: ${field.name}`) as Error & { code: string; field: string }
      err.code = 'MISSING_PARAMETER'
      err.field = field.name
      throw err
    }
  }

  // 3. Check platform integration exists
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('id')
    .eq('org_id', orgId)
    .eq('platform', t.platform)
    .eq('status', 'connected')
    .single()

  if (!integration) {
    const err = new Error(`Platform ${t.platform} is not connected for this organization`) as Error & { code: string; platform: string }
    err.code = 'INTEGRATION_NOT_CONNECTED'
    err.platform = t.platform
    throw err
  }

  // 4. Fetch linked decision context (if provided)
  let linked: LinkedDecision | null = null
  if (decisionId) {
    const { data: dec } = await supabaseAdmin
      .from('decisions')
      .select('trigger_condition, data_snapshot, ai_explanation, confidence_score')
      .eq('id', decisionId)
      .eq('org_id', orgId)
      .single()
    if (dec) linked = dec as LinkedDecision
  }

  // 5. Execute action handler
  const handler = ACTION_HANDLERS[t.action_type]
  let execResult: { success: boolean; result_data: Record<string, unknown>; error_message?: string }

  try {
    if (!handler) throw new Error(`No handler for action_type: ${t.action_type}`)
    execResult = await handler(params, { orgId, platform: t.platform })
  } catch (err) {
    execResult = {
      success: false,
      result_data: {},
      error_message: (err as Error).message,
    }
  }

  // 6. Build action_taken summary
  const paramSummary = Object.entries(params)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
  const actionTaken = `${t.name}${paramSummary ? ` — ${paramSummary}` : ''}`

  // 7. Insert decision_history (always, even on failure)
  const { data: historyRow, error: hErr } = await supabaseAdmin
    .from('decision_history')
    .insert({
      org_id:            orgId,
      decision:          linked?.trigger_condition ?? actionTaken,
      action_taken:      actionTaken,
      trigger_condition: linked ? `Manual execution — ${linked.trigger_condition}` : 'Manual execution',
      data_used:         linked?.data_snapshot ?? {},
      result:            execResult.success ? 'success' : 'failed',
      ai_explanation:    linked?.ai_explanation ?? null,
      confidence_score:  linked?.confidence_score ?? null,
      decision_id:       decisionId ?? null,
      automation_rule_id: null,
      automation_run_id:  null,
      executed_by:       'manual',
    })
    .select('id')
    .single()

  if (hErr || !historyRow) throw new Error(`Failed to insert decision_history: ${hErr?.message}`)

  return {
    historyId:  historyRow.id as string,
    result:     execResult.success ? 'success' : 'failed',
    resultData: execResult.result_data,
  }
}
