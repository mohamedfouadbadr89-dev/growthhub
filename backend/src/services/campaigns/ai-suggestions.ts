import { supabaseAdmin } from '../../lib/supabase.js'
import { resolveApiKey } from '../creatives/creative-generator.js'

export interface AiSuggestions {
  interests: string[]
  age_min: number
  age_max: number
  gender: string
  daily_budget_recommendation: number
  rationale: string
  generated_at: string
}

function validateSuggestions(raw: unknown): AiSuggestions {
  if (!raw || typeof raw !== 'object') throw new Error('AI response is not an object')
  const s = raw as Record<string, unknown>

  if (!Array.isArray(s.interests) || s.interests.length === 0) {
    throw new Error('AI response missing interests array')
  }
  if (typeof s.age_min !== 'number' || typeof s.age_max !== 'number') {
    throw new Error('AI response missing age_min or age_max')
  }
  if (typeof s.gender !== 'string') throw new Error('AI response missing gender')
  if (typeof s.daily_budget_recommendation !== 'number') {
    throw new Error('AI response missing daily_budget_recommendation')
  }

  return {
    interests:                   s.interests.map(String),
    age_min:                     Math.round(s.age_min as number),
    age_max:                     Math.round(s.age_max as number),
    gender:                      s.gender as string,
    daily_budget_recommendation: s.daily_budget_recommendation as number,
    rationale:                   typeof s.rationale === 'string' ? s.rationale : '',
    generated_at:                new Date().toISOString(),
  }
}

export async function generateAiSuggestions(
  orgId: string,
  campaignId: string
): Promise<AiSuggestions> {
  const { apiKey } = await resolveApiKey(orgId)

  const { data: campaign, error: campErr } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, platform, daily_budget')
    .eq('org_id', orgId)
    .eq('id', campaignId)
    .single()

  if (campErr || !campaign) {
    throw Object.assign(new Error('Campaign not found'), { code: 'NOT_FOUND' })
  }

  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  const from30 = since30.toISOString().slice(0, 10)

  const { data: topMetrics } = await supabaseAdmin
    .from('campaign_metrics')
    .select('campaign_name, spend, revenue')
    .eq('org_id', orgId)
    .gte('date', from30)

  const aggregated = new Map<string, { spend: number; revenue: number }>()
  for (const row of topMetrics ?? []) {
    const name = row.campaign_name as string
    const existing = aggregated.get(name) ?? { spend: 0, revenue: 0 }
    existing.spend   += Number(row.spend ?? 0)
    existing.revenue += Number(row.revenue ?? 0)
    aggregated.set(name, existing)
  }

  const topCampaigns = Array.from(aggregated.entries())
    .map(([name, m]) => ({ name, roas: m.spend > 0 ? m.revenue / m.spend : 0 }))
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 3)

  const topCampaignsText =
    topCampaigns.length > 0
      ? topCampaigns.map((c) => `- ${c.name}: ROAS ${c.roas.toFixed(2)}×`).join('\n')
      : 'No historical campaign data available yet.'

  const avgRoas =
    topCampaigns.length > 0
      ? topCampaigns.reduce((sum, c) => sum + c.roas, 0) / topCampaigns.length
      : 0

  const prompt = `You are a digital advertising expert. Generate targeting suggestions for a new ad campaign.

Campaign Details:
- Name: ${campaign.name}
- Platform: ${(campaign.platform as string).toUpperCase()}
- Daily Budget: $${campaign.daily_budget ?? 'not set'}

Organization's Top Performing Campaigns (last 30 days):
${topCampaignsText}

Average ROAS: ${avgRoas > 0 ? `${avgRoas.toFixed(2)}×` : 'No data yet'}

Return ONLY a JSON object (no markdown, no code fences) with this exact structure:
{
  "interests": ["interest1", "interest2", "interest3", "interest4"],
  "age_min": 25,
  "age_max": 44,
  "gender": "all",
  "daily_budget_recommendation": 500,
  "rationale": "Brief explanation of why these suggestions fit the campaign goals"
}`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://growthhub.app',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 512,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${body}`)
  }

  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = json.choices?.[0]?.message?.content ?? ''

  let parsed: unknown
  try {
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Failed to parse AI suggestions JSON: ${content.slice(0, 200)}`)
  }

  const suggestions = validateSuggestions(parsed)

  await supabaseAdmin
    .from('campaigns')
    .update({ ai_suggestions: suggestions })
    .eq('org_id', orgId)
    .eq('id', campaignId)

  return suggestions
}
