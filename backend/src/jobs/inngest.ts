import { Inngest } from 'inngest'
import { supabaseAdmin } from '../lib/supabase.js'
import { dispatchSync } from '../services/sync/index.js'
import { dispatchIntelligence } from '../services/intelligence/index.js'
import { runGeneration } from '../services/creatives/creative-generator.js'

export const inngest = new Inngest({ id: 'growthhub' })

const dailySyncAll = inngest.createFunction(
  { id: 'daily-sync-all', triggers: [{ cron: '0 2 * * *' }] },
  async ({ step }) => {
    const { data: integrations } = await supabaseAdmin
      .from('integrations')
      .select('id, org_id')
      .eq('status', 'connected')

    const events = (integrations ?? []).map((i) => ({
      name: 'integration/sync.requested' as const,
      data: { integrationId: i.id as string, orgId: i.org_id as string },
    }))

    if (events.length > 0) {
      await step.sendEvent('fan-out-syncs', events)
    }

    return { queued: events.length }
  }
)

const syncIntegration = inngest.createFunction(
  { id: 'sync-integration', triggers: [{ event: 'integration/sync.requested' }] },
  async ({ event, step }) => {
    const { integrationId, orgId } = event.data as { integrationId: string; orgId: string }

    const { data: integration, error: fetchError } = await supabaseAdmin
      .from('integrations')
      .select('id, org_id, platform, vault_refresh_token_secret_id')
      .eq('id', integrationId)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !integration) {
      throw new Error(`Integration ${integrationId} not found`)
    }

    const { data: syncLog } = await supabaseAdmin
      .from('sync_logs')
      .insert({ org_id: orgId, integration_id: integrationId, status: 'in_progress' })
      .select('id')
      .single()

    if (!syncLog) throw new Error('Failed to create sync log')

    let recordsWritten = 0
    try {
      recordsWritten = await dispatchSync({
        id: integration.id as string,
        org_id: integration.org_id as string,
        platform: integration.platform as string,
        vault_refresh_token_secret_id: integration.vault_refresh_token_secret_id as string,
      })

      await supabaseAdmin
        .from('integrations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', integrationId)

      await supabaseAdmin
        .from('sync_logs')
        .update({ status: 'success', records_written: recordsWritten, completed_at: new Date().toISOString() })
        .eq('id', syncLog.id)

      // Trigger intelligence engine after successful sync
      await step.sendEvent('trigger-decisions', {
        name: 'intelligence/decisions.requested' as const,
        data: { orgId },
      })
    } catch (err) {
      const errorMessage = (err as Error).message

      await supabaseAdmin
        .from('integrations')
        .update({ status: 'error' })
        .eq('id', integrationId)

      await supabaseAdmin
        .from('sync_logs')
        .update({ status: 'failed', error_message: errorMessage, completed_at: new Date().toISOString() })
        .eq('id', syncLog.id)

      throw err
    }

    return { recordsWritten }
  }
)

const generateDecisions = inngest.createFunction(
  { id: 'generate-decisions', triggers: [{ event: 'intelligence/decisions.requested' }] },
  async ({ event }) => {
    const { orgId } = event.data as { orgId: string }
    try {
      const { runId } = await dispatchIntelligence(orgId, 'sync_complete')
      return { runId }
    } catch (err) {
      const e = err as Error & { code?: string }
      if (e.code === 'ALREADY_IN_PROGRESS') return { skipped: true }
      throw err
    }
  }
)

const generateCreative = inngest.createFunction(
  { id: 'generate-creative', triggers: [{ event: 'creatives/generation.requested' }], timeouts: { finish: '5m' } },
  async ({ event }) => {
    const { orgId, generationId, generationType, adAccountId, campaignName } = event.data as {
      orgId: string
      generationId: string
      generationType: 'copy' | 'image'
      adAccountId: string | null
      campaignName: string | null
    }

    await runGeneration({ orgId, generationId, generationType, adAccountId, campaignName })
    return { generationId, status: 'completed' }
  }
)

export const functions = [dailySyncAll, syncIntegration, generateDecisions, generateCreative]
