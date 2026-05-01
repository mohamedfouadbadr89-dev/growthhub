export type AIResponse = {
  type: 'dashboard' | 'insight' | 'decision'
  result: any
  confidence_score: number
}

export function validateAIResponse(data: any): AIResponse {
  if (!data) throw new Error('AI response is empty')

  if (!['dashboard', 'insight', 'decision'].includes(data.type)) {
    throw new Error('Invalid AI response type')
  }

  if (typeof data.confidence_score !== 'number') {
    throw new Error('Missing confidence_score')
  }

  if (data.confidence_score < 0 || data.confidence_score > 1) {
    throw new Error('Invalid confidence_score range')
  }

  return data as AIResponse
}