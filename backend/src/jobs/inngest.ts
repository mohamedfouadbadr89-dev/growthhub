import { Inngest } from 'inngest'
import { supabaseAdmin } from '../lib/supabase.js'
import { dispatchSync } from '../services/sync/index.js'
import { dispatchIntelligence } from '../services/intelligence/index.js'
import { runGeneration } from '../services/creatives/creative-generator.js'

// 🔥 Inngest client
export const inngest = new Inngest({
  id: 'growthhub',
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
})

// ⚠️ تحذيرات env
if (!process.env.INNGEST_EVENT_KEY) {
  console.warn('⚠️ INNGEST_EVENT_KEY is missing')
}

if (!process.env.INNGEST_SIGNING_KEY) {
  console.warn('⚠️ INNGEST_SIGNING_KEY is missing')
}

// ─────────────────────────────────────────────────────────────
// 🔁 DAILY SYNC
// ─────────────────────────────────────────────────────────────
const dailySyncAll = inngest.createFunction(
  {
    id: 'daily-sync-all',
    triggers: [{ cron: '0 2 * * *' }],
  },
  async ({ step }) => {
    const { data: integrations } = await supabaseAdmin
      .from('integrations')
      .select('id, org_id')
      .eq('status', 'connected')

    const events = (integrations ?? []).map((i) => ({
      name: 'integration/sync.requested',
      data: {
        integrationId: i.id as string,
        orgId: i.org_id as string,
      },
    }))

    if (events.length > 0) {
      await step.sendEvent('fan-out-syncs', events)
    }

    return { queued: events.length }
  }
)

// ─────────────────────────────────────────────────────────────
// 🔄 SYNC INTEGRATION
// ─────────────────────────────────────────────────────────────
const syncIntegration = inngest.createFunction(
  {
    id: 'sync-integration',
    triggers: [{ event: 'integration/sync.requested' }],
  },
  async ({ event, step }) => {
    const data = event.data as any
    const integrationId = data.integrationId
    const orgId = data.orgId

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
      .insert({
        org_id: orgId,
        integration_id: integrationId,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (!syncLog) throw new Error('Failed to create sync log')

    let recordsWritten = 0

    try {
      recordsWritten = await dispatchSync({
        id: integration.id,
        org_id: integration.org_id,
        platform: integration.platform,
        vault_refresh_token_secret_id: integration.vault_refresh_token_secret_id,
      })

      await supabaseAdmin
        .from('integrations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', integrationId)

      await supabaseAdmin
        .from('sync_logs')
        .update({
          status: 'success',
          records_written: recordsWritten,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      await step.sendEvent('trigger-decisions', {
        name: 'intelligence/decisions.requested',
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
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      throw err
    }

    return { recordsWritten }
  }
)

// ─────────────────────────────────────────────────────────────
// 🧠 DECISIONS ENGINE
// ─────────────────────────────────────────────────────────────
const generateDecisions = inngest.createFunction(
  {
    id: 'generate-decisions',
    triggers: [{ event: 'intelligence/decisions.requested' }],
  },
  async ({ event }) => {
    const { orgId } = event.data as any

    try {
      const { runId } = await dispatchIntelligence(orgId, 'sync_complete')
      return { runId }
    } catch (err: any) {
      if (err.code === 'ALREADY_IN_PROGRESS') return { skipped: true }
      throw err
    }
  }
)

// ─────────────────────────────────────────────────────────────
// 🎨 CREATIVE GENERATION
// ─────────────────────────────────────────────────────────────
const generateCreative = inngest.createFunction(
  {
    id: 'generate-creative',
    triggers: [{ event: 'creatives/generation.requested' }],
  },
  async ({ event }) => {
    const data = event.data as any

    await runGeneration({
      orgId: data.orgId,
      generationId: data.generationId,
      generationType: data.generationType,
      adAccountId: data.adAccountId,
      campaignName: data.campaignName,
    })

    return {
      generationId: data.generationId,
      status: 'completed',
    }
  }
)

// ─────────────────────────────────────────────────────────────
// 🤖 AI FUNCTION (SMART FALLBACK 🔥)
// ─────────────────────────────────────────────────────────────
const aiHello = inngest.createFunction(
  {
    id: 'ai-hello',
    triggers: [{ event: 'test/ai' }],
  },
  async ({ event, step }) => {

    const result = await step.run('ai-call', async () => {
      try {
        console.log('🚀 Trying OpenRouter...')

        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error('No API key')
        }

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: event.data?.message || 'Hello from AI 🚀',
              },
            ],
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.error?.message || 'AI failed')
        }

        return {
          source: 'openrouter',
          content: data.choices?.[0]?.message?.content || 'No response',
        }

      } catch (err) {
        console.warn('⚠️ Falling back to MOCK AI')

        return {
          source: 'mock',
          content: `Mock response: ${event.data?.message || 'Hello 🚀'}`,
        }
      }
    })

    console.log('🤖 AI RESULT:', result)

    return {
      success: true,
      ...result,
    }
  }
)

// ─────────────────────────────────────────────────────────────
export const functions = [
  dailySyncAll,
  syncIntegration,
  generateDecisions,
  generateCreative,
  aiHello,
]