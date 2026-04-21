import { getOpenRouterClient } from '../ai/openrouter.js'

export interface CopyVariation {
  headline: string
  body: string
  cta: string
}

export interface CopyGenerationContext {
  campaignName: string
  platform: string
  roas: number
  toneOfVoice: string
  brandColors: string[]
}

export async function generateAdCopy(
  apiKey: string,
  ctx: CopyGenerationContext
): Promise<CopyVariation[]> {
  const client = getOpenRouterClient(apiKey)
  const model = process.env.OPENROUTER_DEFAULT_MODEL ?? 'google/gemini-2.0-flash-001'

  const toneDesc = ctx.toneOfVoice || 'professional and engaging'
  const performanceCtx =
    ctx.roas >= 3
      ? `high-performing (ROAS ${ctx.roas.toFixed(1)}×)`
      : ctx.roas >= 1
        ? `moderate-performing (ROAS ${ctx.roas.toFixed(1)}×)`
        : `under-performing (ROAS ${ctx.roas.toFixed(1)}×)`

  const prompt =
    `Campaign: "${ctx.campaignName}" on ${ctx.platform} — ${performanceCtx}.\n` +
    `Brand tone: ${toneDesc}.\n\n` +
    'Generate exactly 3 ad copy variations. Each must have a headline (under 10 words), ' +
    'body text (under 50 words), and a CTA phrase (3-5 words).\n\n' +
    'Respond ONLY with valid JSON array: ' +
    '[{"headline":"...","body":"...","cta":"..."},{"headline":"...","body":"...","cta":"..."},{"headline":"...","body":"...","cta":"..."}]'

  const response = await client.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 600,
    messages: [
      {
        role: 'system',
        content:
          'You are a world-class performance marketing copywriter. ' +
          'Respond ONLY with valid JSON — no markdown, no preamble.',
      },
      { role: 'user', content: prompt },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '[]'

  let parsed: CopyVariation[]
  try {
    // Strip markdown code fences if model wraps output
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    parsed = JSON.parse(cleaned) as CopyVariation[]
  } catch {
    throw new Error(`Copy generation returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Copy generation returned empty array')
  }

  return parsed.slice(0, 3).map((v) => ({
    headline: String(v.headline ?? '').slice(0, 100),
    body: String(v.body ?? '').slice(0, 300),
    cta: String(v.cta ?? '').slice(0, 50),
  }))
}
