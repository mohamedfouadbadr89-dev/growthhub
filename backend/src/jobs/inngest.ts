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

    // Continuation #29 (2026-05-12) — ORPHAN/ZOMBIE ISOLATION.
    //
    // GOVERNANCE STATE: The downstream `dispatchIntelligence` chain
    // (services/intelligence/index.ts → decision-generator.ts →
    // INSERT INTO `decisions` legacy table) belongs to the Phase 3
    // anomaly engine which is DEPRECATED+DEFERRED per CANONICAL AI
    // SYSTEM resolution in SYSTEM_CONTROL.md. The legacy `decisions`
    // table is malformed in live DB and explicitly NOT to be
    // reactivated. The `decision_runs` table referenced by
    // `services/intelligence/index.ts:13` is NOT in canonical
    // migrations (per Phase 4 Part 2 spec-vs-runtime adaptation log).
    //
    // RUNTIME EVIDENCE BEFORE THIS GUARD:
    //   - syncIntegration emits 'intelligence/decisions.requested'
    //     after every successful Phase 2 sync (jobs/inngest.ts:114)
    //   - This function then called dispatchIntelligence which would
    //     INSERT INTO decision_runs → 42P01 (relation does not exist)
    //     on EVERY production sync, producing silent Inngest job
    //     failures + operator dashboard noise
    //   - No data corruption (INSERT failed before any downstream
    //     write); execution determinism violated by latent failure
    //
    // GUARD BEHAVIOR:
    //   - Early-return with structured `[inngest]` log line so
    //     operators see the deferral explicitly rather than 42P01
    //     stack traces
    //   - Preserves dispatchIntelligence import + structure of
    //     services/intelligence/* for future Phase 3 anomaly engine
    //     revival (if ever authorized; would require deploy of
    //     decision_runs canonical migration first)
    //   - Preserves spec conformance — the Inngest function still
    //     exists at its declared trigger event; the receiver just
    //     no-ops until Phase 3 anomaly engine is unlocked
    //
    // RE-ENABLEMENT PROCEDURE (when Phase 3 anomaly engine is
    // explicitly authorized):
    //   1. Deploy canonical migration creating `decision_runs` table
    //   2. Deploy canonical migration rebuilding `decisions` table
    //   3. Update CANONICAL AI SYSTEM resolution in SYSTEM_CONTROL.md
    //   4. Remove this guard
    //
    // eslint-disable-next-line no-console
    console.log(
      `[inngest] generate-decisions early-return: Phase 3 anomaly engine DEPRECATED+DEFERRED per CANONICAL AI SYSTEM resolution; dispatchIntelligence chain disabled. orgId=${orgId} event_id=${(event as any).id ?? 'unknown'}`,
    )
    return { skipped: true, reason: 'phase3_anomaly_deprecated' }

    // Original implementation preserved below for spec conformance +
    // future revival. UNREACHABLE per guard above.
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
// Registered Inngest functions.
//
// Phase-classification updated 2026-05-12 (continuation #30) to reflect
// current SYSTEM_CONTROL.md state. Functions remain UNREGISTERED below
// pending operator decision on Inngest-driven execution paths; the
// underlying phases themselves have advanced past their original deferral.
//
//   dailySyncAll       → reads `integrations` (Phase 2 CLOSED 2026-05-07,
//                        continuation #3; Inngest registration remains
//                        intentionally paused — registering would re-fire
//                        the historical retry storm pattern; operator
//                        decision required before re-enable)
//                        FIRES NIGHTLY at 02:00 UTC when registered.
//   syncIntegration    → reads/writes `integrations`, `sync_logs`
//                        (Phase 2 CLOSED; Inngest registration paused
//                        pending operator decision on sync trigger path)
//   generateDecisions  → calls dispatchIntelligence → `decision_runs`
//                        (Phase 3 anomaly engine DEPRECATED+DEFERRED per
//                        CANONICAL AI SYSTEM resolution; legacy `decisions`
//                        table not to be reactivated; #29 added defense-in-
//                        depth early-return guard above for the receiver
//                        body if registration is ever restored)
//   generateCreative   → calls runGeneration → `creative_generations`
//                        (Phase 5 CLOSED 2026-05-07, continuation #7;
//                        Inngest registration paused pending operator
//                        decision on Inngest-driven creative generation
//                        path; `POST /api/v1/creatives/generate` already
//                        provides the synchronous request path)
//
// Their definitions are KEPT above as documentation/code so re-enabling
// is a one-line edit (just append the symbol to this array). Until then,
// they are NOT registered with Inngest, never receive events, and never
// fire — meaning Inngest events emitted by Phase 2 sync routes, Phase 5
// creative routes, etc. land with no receiver. Operators using those
// routes should rely on the synchronous request paths until the Inngest
// receivers are re-registered.
//
// `aiHello` (event 'test/ai') has no DB dependency and is kept for the
// `/trigger-ai` smoke-test endpoint (flag-gated by ENABLE_SMOKE_ENDPOINTS).
export const functions = [
  // dailySyncAll,       // unregistered — Phase 2 UNLOCKED (#3); auto-sync registration pending operator decision (SYSTEM_CONTROL.md #30 — Inngest signing-key verification required). Synchronous path /api/v1/integrations/:id/sync operational in the meantime.
  // syncIntegration,    // unregistered — same gate as dailySyncAll (Phase 2 unlocked; auto-sync activation pending operator decision).
  // generateDecisions,  // unregistered — Phase 3 anomaly engine DEFERRED per CANONICAL AI SYSTEM resolution (legacy `decisions` table DEPRECATED; canonical flow via /api/v1/ai/decisions/generate + auto-fire chain).
  // generateCreative,   // unregistered — Phase 5 UNLOCKED (#3); Inngest registration paused pending operator decision on Inngest-driven creative generation path (sync path /api/v1/creatives/generate operational).
  aiHello,
]