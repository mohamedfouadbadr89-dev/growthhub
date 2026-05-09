import { supabaseAdmin } from '../../lib/supabase.js'
import { readSecret } from '../../lib/vault.js'
import { getBrandKit } from './brand-kit.js'
import { generateAdCopy } from './copy-generation.js'
import { generateAdImages } from './image-generation.js'
import { uploadImage } from './storage.js'

export const CREDIT_COSTS: Record<'copy' | 'image', number> = { copy: 2, image: 10 }

export function computePerformanceScore(roas: number): number {
  // ROAS 0 → 0, ROAS 4 → 100; meets SC-005 (ROAS ≥ 3× scores ≥75 vs ROAS <1× scores <25)
  return Math.min(100, Math.max(0, Math.round(roas * 25)))
}

// Resolve the OpenRouter API key for the org.
// Throws BYOK_REQUIRED if LTD user has no key configured.
export async function resolveApiKey(orgId: string): Promise<{ apiKey: string; isLtd: boolean }> {
  const { data: org, error } = await supabaseAdmin
    .from('organizations')
    .select('plan_type, vault_byok_openrouter_secret_id')
    .eq('org_id', orgId)
    .single()

  // Discriminate "org genuinely absent" from "DB layer failed".
  //
  // Pre-fix this branch was `if (error || !org) throw 'Org X not found'`.
  // Pattern-identical to the auth.ts/verify, actions.ts/:id, history.ts/:id
  // anti-patterns closed in prior route-level hardening turns. This
  // instance survived because it lives in a SERVICE file rather than a
  // route file. Every non-PGRST116 PostgrestError (network failure, RLS
  // denial, schema drift like the currently-active 42703 on
  // `vault_byok_openrouter_secret_id`, connection pool exhaustion, etc.)
  // was rebranded as "Org X not found" — pointing operators chasing
  // production failures at the wrong root cause (organization absence
  // vs schema drift / infrastructure / RLS).
  //
  // CONSTITUTION §3 "Fail Loudly" mandates accurate operator-facing
  // signals; throwing through errorHandler with the real cause string
  // satisfies it. The genuine no-rows case (PGRST116) preserves the
  // original message verbatim. Both paths still flow through Hono's
  // app.onError(errorHandler) → sanitized 500 + request_id correlator
  // chain (Sentry tag, stdout [err] line, body request_id) — only the
  // log/Sentry message content changes from misleading to accurate.
  if (error && error.code !== 'PGRST116') {
    throw new Error(`organizations lookup failed: ${error.message}`)
  }
  if (!org) throw new Error(`Org ${orgId} not found`)

  if (org.plan_type === 'ltd') {
    if (!org.vault_byok_openrouter_secret_id) {
      throw Object.assign(
        new Error('LTD users must configure a BYOK OpenRouter key in Settings'),
        { code: 'BYOK_REQUIRED' }
      )
    }
    const apiKey = await readSecret(org.vault_byok_openrouter_secret_id as string)
    return { apiKey, isLtd: true }
  }

  return { apiKey: process.env.OPENROUTER_API_KEY!, isLtd: false }
}

async function getSourceRoas(
  orgId: string,
  adAccountId: string | null,
  campaignName: string | null
): Promise<number> {
  if (!adAccountId && !campaignName) return 0

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const from = sevenDaysAgo.toISOString().slice(0, 10)

  let query = supabaseAdmin
    .from('campaign_metrics')
    .select('spend, revenue')
    .eq('org_id', orgId)
    .gte('date', from)

  if (adAccountId) query = query.eq('ad_account_id', adAccountId)
  if (campaignName) query = query.eq('campaign_name', campaignName)

  const { data } = await query
  if (!data || data.length === 0) return 0

  const totalSpend = data.reduce((s, r) => s + Number(r.spend), 0)
  const totalRevenue = data.reduce((s, r) => s + Number(r.revenue), 0)
  return totalSpend > 0 ? totalRevenue / totalSpend : 0
}

export interface GenerationRequest {
  orgId: string
  generationId: string
  generationType: 'copy' | 'image'
  adAccountId: string | null
  campaignName: string | null
}

export async function runGeneration(req: GenerationRequest): Promise<void> {
  const { orgId, generationId, generationType, adAccountId, campaignName } = req

  // Mark as processing — if this fails, the job stays 'pending' and Inngest will not retry
  const { error: startErr } = await supabaseAdmin
    .from('creative_generations')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', generationId)
    .eq('org_id', orgId)

  if (startErr) {
    console.error('[creative-generator] Failed to mark processing:', startErr.message)
    // Proceed anyway — the generation should still run
  }

  let creditsDeducted = 0

  try {
    const [brandKit, sourceRoas, { apiKey }] = await Promise.all([
      getBrandKit(orgId),
      getSourceRoas(orgId, adAccountId, campaignName),
      resolveApiKey(orgId),
    ])

    const performanceScore = computePerformanceScore(sourceRoas)
    const toneOfVoice = brandKit?.tone_of_voice ?? ''
    const brandColors = (brandKit?.colors as string[]) ?? []

    const creativesToInsert: Array<{
      org_id: string
      generation_id: string
      type: string
      content_url?: string
      content_text?: object
      performance_score: number
    }> = []

    // ── usage observability model resolution (Phase 7 Sub-pass A1a,
    //    continuation #16) — captured up-front so the log_ai_usage call at
    //    the end of each branch can stamp the correct model identifier.
    //    NOT a behavior change: same effective model strings as the prior
    //    inline UPDATE values; just hoisted into local vars.
    const copyModel  = process.env.OPENROUTER_DEFAULT_MODEL ?? 'google/gemini-2.0-flash-001'
    const imageModel = 'Kwai-Kolors/Kolors'

    if (generationType === 'copy') {
      const variations = await generateAdCopy(apiKey, {
        campaignName: campaignName ?? 'Campaign',
        platform: 'Meta',
        roas: sourceRoas,
        toneOfVoice,
        brandColors,
      })

      for (const v of variations) {
        creativesToInsert.push({
          org_id: orgId,
          generation_id: generationId,
          type: 'copy',
          content_text: v,
          performance_score: performanceScore,
        })
      }

      await supabaseAdmin
        .from('creative_generations')
        .update({
          model: copyModel,
          source_roas: sourceRoas,
        })
        .eq('id', generationId)

      // Fire-and-forget log_ai_usage row. Observability ONLY — p_cost_credits=0.
      // Inngest job context: no HTTP request_id / trace_id / user_id; no
      // ai_decisions row (creative generation writes to creative_generations,
      // not ai_decisions). Token counts not surfaced from generateAdCopy.
      void supabaseAdmin
        .rpc('log_ai_usage', {
          p_org_id: orgId,
          p_user_id: null,
          p_model: copyModel,
          p_tokens_in: 0,
          p_tokens_out: 0,
          p_cost_credits: 0,
          p_request_id: null,
          p_trace_id: null,
          p_ai_decision_id: null,
        })
        .then(
          () => null,
          () => null,
        )

    } else {
      const images = await generateAdImages({
        campaignName: campaignName ?? 'Campaign',
        platform: 'Meta',
        brandColors,
        toneOfVoice,
      })

      for (const img of images) {
        // uploadImage now returns a storage PATH, not a URL
        const storagePath = await uploadImage(orgId, generationId, img.buffer, img.fileName)
        creativesToInsert.push({
          org_id: orgId,
          generation_id: generationId,
          type: 'image',
          content_url: storagePath,   // path stored; signed URL generated on read
          performance_score: performanceScore,
        })
      }

      await supabaseAdmin
        .from('creative_generations')
        .update({ model: imageModel, source_roas: sourceRoas })
        .eq('id', generationId)

      // Fire-and-forget log_ai_usage row. Same observability-only contract
      // as the copy branch above. Image-generation provider (SiliconFlow/
      // Kolors) tokens not extracted; usage data accrues in ai_usage_logs
      // for future cost-derivation in Sub-pass A1b.
      void supabaseAdmin
        .rpc('log_ai_usage', {
          p_org_id: orgId,
          p_user_id: null,
          p_model: imageModel,
          p_tokens_in: 0,
          p_tokens_out: 0,
          p_cost_credits: 0,
          p_request_id: null,
          p_trace_id: null,
          p_ai_decision_id: null,
        })
        .then(
          () => null,
          () => null,
        )
    }

    if (creativesToInsert.length === 0) {
      throw new Error('AI returned no usable creatives')
    }

    const { error: insertErr } = await supabaseAdmin.from('creatives').insert(creativesToInsert)
    if (insertErr) throw new Error(`Failed to save creatives: ${insertErr.message}`)

    await supabaseAdmin
      .from('creative_generations')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', generationId)

  } catch (err) {
    const message = (err as Error).message
    console.error(`[creative-generator] Generation ${generationId} failed:`, message)

    // Refund credits if any were deducted and the job failed
    if (creditsDeducted > 0) {
      try {
        await supabaseAdmin.rpc('refund_credits', { p_org_id: orgId, p_amount: creditsDeducted })
      } catch (refundErr) {
        console.error('[creative-generator] Credit refund failed:', (refundErr as Error).message)
      }
    }

    try {
      await supabaseAdmin
        .from('creative_generations')
        .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
        .eq('id', generationId)
    } catch (statusErr) {
      console.error('[creative-generator] Failed to update status to failed:', (statusErr as Error).message)
    }

    throw err
  }
}
