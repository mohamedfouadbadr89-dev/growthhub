import OpenAI from 'openai'

export interface DecisionContext {
  campaignId: string
  platform: string
  anomalyType: string
  triggerCondition: string
  dataSnapshot: Record<string, unknown>
}

export interface DecisionExplanation {
  explanation: string
  confidence_rationale: string
  recommended_action: string
}

export function getOpenRouterClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://growthhub.app',
      'X-Title': 'GrowthHub',
    },
  })
}

export async function generateDecisionExplanation(
  client: OpenAI,
  context: DecisionContext
): Promise<DecisionExplanation> {
  const model = process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-001'

  const response = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content:
          'You are a performance marketing analyst. Be concise and direct. ' +
          'Respond ONLY with valid JSON containing exactly these keys: ' +
          '"explanation" (string, 2-3 sentences), ' +
          '"confidence_rationale" (string, 1 sentence), ' +
          '"recommended_action" (string, 1 specific action). No markdown, no extra keys.',
      },
      {
        role: 'user',
        content:
          `Campaign "${context.campaignId}" on ${context.platform} shows ${context.anomalyType}.\n` +
          `Trigger: ${context.triggerCondition}\n` +
          `Data: ${JSON.stringify(context.dataSnapshot)}\n` +
          'Generate a brief analyst explanation, confidence rationale, and recommended action.',
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as DecisionExplanation
  return {
    explanation: parsed.explanation ?? '',
    confidence_rationale: parsed.confidence_rationale ?? '',
    recommended_action: parsed.recommended_action ?? '',
  }
}
