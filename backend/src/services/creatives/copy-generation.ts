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

function validateVariation(v: unknown, index: number): CopyVariation {
  if (!v || typeof v !== 'object') {
    throw new Error(`Variation ${index} is not an object`)
  }
  const obj = v as Record<string, unknown>

  const headline = typeof obj.headline === 'string' ? obj.headline.trim() : ''
  const body = typeof obj.body === 'string' ? obj.body.trim() : ''
  const cta = typeof obj.cta === 'string' ? obj.cta.trim() : ''

  if (!headline) throw new Error(`Variation ${index} has empty headline`)
  if (!body) throw new Error(`Variation ${index} has empty body`)
  if (!cta) throw new Error(`Variation ${index} has empty cta`)

  return {
    headline: headline.slice(0, 100),
    body: body.slice(0, 300),
    cta: cta.slice(0, 50),
  }
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
    'Respond ONLY with valid JSON array:\n' +
    '[{"headline":"...","body":"...","cta":"..."},{"headline":"...","body":"...","cta":"..."},{"headline":"...","body":"...","cta":"..."}]'

  let lastError: Error | null = null

  // Retry once on transient AI failures
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.7,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content:
              'You are a world-class performance marketing copywriter. ' +
              'Respond ONLY with a valid JSON array — no markdown, no preamble, no trailing text.',
          },
          { role: 'user', content: prompt },
        ],
      })

      const raw = response.choices[0]?.message?.content ?? ''
      if (!raw.trim()) throw new Error('AI returned empty content')

      // Strip markdown code fences if the model wraps output
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

      let parsed: unknown[]
      try {
        parsed = JSON.parse(cleaned) as unknown[]
      } catch {
        console.error(`[copy-generation] Invalid JSON on attempt ${attempt}:`, cleaned.slice(0, 300))
        throw new Error(`AI returned invalid JSON: ${cleaned.slice(0, 100)}`)
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI returned empty variations array')
      }

      const validated = parsed.slice(0, 3).map((v, i) => validateVariation(v, i + 1))

      if (validated.length < 1) {
        throw new Error('No valid copy variations after validation')
      }

      return validated

    } catch (err) {
      lastError = err as Error
      if (attempt < 2) {
        console.warn(`[copy-generation] Attempt ${attempt} failed, retrying:`, lastError.message)
      }
    }
  }

  console.error('[copy-generation] All attempts failed:', lastError?.message)
  throw lastError ?? new Error('Copy generation failed')
}
