import OpenAI from 'openai'

export type AiProvider = 'openai' | 'anthropic' | 'openrouter'

const BASE_URLS: Record<AiProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
}

export function createAiClient(provider: AiProvider, apiKey: string): OpenAI {
  const baseURL = BASE_URLS[provider]
  if (!baseURL) throw new Error(`Unknown AI provider: ${provider}`)
  return new OpenAI({ apiKey, baseURL })
}
