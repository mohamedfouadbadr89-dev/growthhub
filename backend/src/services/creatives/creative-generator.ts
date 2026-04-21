import { supabaseAdmin } from '../../lib/supabase.js'
import { readSecret } from '../../lib/vault.js'
import { getBrandKit } from './brand-kit.js'
import { generateAdCopy } from './copy-generation.js'
import { generateAdImages } from './image-generation.js'
import { uploadImage } from './storage.js'

const CREDIT_COSTS = { copy: 2, image: 10 }

function computePerformanceScore(roas: number): number {
  // ROAS >= 4 → 100, ROAS 0 → 0, linear with cap
  return Math.min(100, Math.max(0, Math.round(roas * 25)))
}

async function resolveApiKey(orgId: string): Promise<string> {
  const { data: org, error } = await supabaseAdmin
    .from('organizations')
    .select('plan_type, vault_byok_openrouter_secret_id, credits_balance')
    .eq('org_id', orgId)
    .single()

  if (error || !org) throw new Error(`Org ${orgId} not found`)

  if (org.plan_type === 'ltd') {
    if (!org.vault_byok_openrouter_secret_id) {
      const err = new Error('LTD users must configure a BYOK OpenRouter key in Settings') as Error & { code: string }
      err.code = 'BYOK_REQUIRED'
      throw err
    }
    return readSecret(org.vault_byok_openrouter_secret_id as string)
  }

  // subscription — check and deduct credits
  const cost = CREDIT_COSTS.copy // will be refined per type in caller
  const { data: result } = await supabaseAdmin.rpc('deduct_credit', { p_org_id: orgId })
  if (result === null || result < 0) {
    const err = new Error('Insufficient credits') as Error & { code: string }
    err.code = 'INSUFFICIENT_CREDITS'
    throw err
  }

  return process.env.OPENROUTER_API_KEY!
}

async function deductCredits(orgId: string, type: 'copy' | 'image'): Promise<void> {
  const cost = CREDIT_COSTS[type]
  // deduct_credit deducts 1 at a time; call it `cost` times
  for (let i = 0; i < cost; i++) {
    const { data } = await supabaseAdmin.rpc('deduct_credit', { p_org_id: orgId })
    if (data === null || data < 0) throw Object.assign(new Error('Insufficient credits'), { code: 'INSUFFICIENT_CREDITS' })
  }
}

async function getSourceRoas(orgId: string, adAccountId: string | null, campaignName: string | null): Promise<number> {
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

  await supabaseAdmin
    .from('creative_generations')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', generationId)
    .eq('org_id', orgId)

  try {
    const [brandKit, sourceRoas, org] = await Promise.all([
      getBrandKit(orgId),
      getSourceRoas(orgId, adAccountId, campaignName),
      supabaseAdmin.from('organizations').select('plan_type, vault_byok_openrouter_secret_id').eq('org_id', orgId).single().then(r => r.data),
    ])

    // Billing gate
    if (org?.plan_type === 'ltd') {
      if (!org.vault_byok_openrouter_secret_id) {
        throw Object.assign(new Error('LTD users must configure a BYOK OpenRouter key in Settings'), { code: 'BYOK_REQUIRED' })
      }
    } else {
      await deductCredits(orgId, generationType)
    }

    const apiKey = org?.plan_type === 'ltd'
      ? await readSecret(org.vault_byok_openrouter_secret_id as string)
      : process.env.OPENROUTER_API_KEY!

    const performanceScore = computePerformanceScore(sourceRoas)
    const platform = 'Meta'  // default; will be looked up from ad_account if available
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

    if (generationType === 'copy') {
      const variations = await generateAdCopy(apiKey, {
        campaignName: campaignName ?? 'Campaign',
        platform,
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
        .update({ model: process.env.OPENROUTER_DEFAULT_MODEL ?? 'google/gemini-2.0-flash-001', source_roas: sourceRoas })
        .eq('id', generationId)

    } else {
      const images = await generateAdImages({
        campaignName: campaignName ?? 'Campaign',
        platform,
        brandColors,
        toneOfVoice,
      })

      for (const img of images) {
        const publicUrl = await uploadImage(orgId, generationId, img.buffer, img.fileName)
        creativesToInsert.push({
          org_id: orgId,
          generation_id: generationId,
          type: 'image',
          content_url: publicUrl,
          performance_score: performanceScore,
        })
      }

      await supabaseAdmin
        .from('creative_generations')
        .update({ model: 'Kwai-Kolors/Kolors', source_roas: sourceRoas })
        .eq('id', generationId)
    }

    if (creativesToInsert.length > 0) {
      await supabaseAdmin.from('creatives').insert(creativesToInsert)
    }

    await supabaseAdmin
      .from('creative_generations')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', generationId)

  } catch (err) {
    const message = (err as Error).message
    await supabaseAdmin
      .from('creative_generations')
      .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
      .eq('id', generationId)
    throw err
  }
}
