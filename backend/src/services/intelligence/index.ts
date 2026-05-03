import { supabaseAdmin } from '../../lib/supabase.js'
import { generateDecisionsForOrg } from './decision-generator.js'
import { detectAlerts } from './alert-detection.js'
import { dispatchAutomation } from '../execution/automation-engine.js'

export async function dispatchIntelligence(
  orgId: string,
  trigger: 'sync_complete' | 'manual'
): Promise<{ runId: string }> {
  // Insert a decision_run row — unique partial index prevents concurrent runs
  const { data: run, error: runError } = await supabaseAdmin
    .from('decision_runs')
    .insert({ org_id: orgId, trigger, status: 'in_progress' })
    .select('id')
    .single()

  if (runError) {
    // Unique index violation = already in progress
    if (runError.code === '23505') {
      const { data: active } = await supabaseAdmin
        .from('decision_runs')
        .select('id')
        .eq('org_id', orgId)
        .eq('status', 'in_progress')
        .single()
      const conflict = new Error('Decision generation already in progress') as Error & { code: string; runId?: string }
      conflict.code = 'ALREADY_IN_PROGRESS'
      conflict.runId = active?.id
      throw conflict
    }
    throw new Error(`Failed to create decision run: ${runError.message}`)
  }

  const runId = run!.id as string
  let decisionsGenerated = 0
  let alertsGenerated = 0

  try {
    decisionsGenerated = await generateDecisionsForOrg(orgId, runId)
    alertsGenerated = await detectAlerts(orgId, runId)
    const rulesExecuted = await dispatchAutomation(orgId, runId)

    await supabaseAdmin
      .from('decision_runs')
      .update({ status: 'completed', decisions_generated: decisionsGenerated, alerts_generated: alertsGenerated, rules_executed: rulesExecuted, completed_at: new Date().toISOString() })
      .eq('id', runId)
  } catch (err) {
    await supabaseAdmin
      .from('decision_runs')
      .update({ status: 'failed', error_message: (err as Error).message, completed_at: new Date().toISOString() })
      .eq('id', runId)
    throw err
  }

  return { runId }
}
