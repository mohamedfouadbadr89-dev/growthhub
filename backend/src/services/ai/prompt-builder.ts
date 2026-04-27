const SYSTEM_RULES = [
  'You MUST NOT autonomously execute any actions.',
  'You MUST NOT fabricate data. Only reference data returned by tools.',
].join('\n')

interface PromptInput {
  userPrompt: string
  orgId: string
  context?: Record<string, unknown>
}

interface PromptPackage {
  system: string
  userMessage: string
}

export function buildPrompt({ userPrompt, orgId, context }: PromptInput): PromptPackage {
  const contextLines: string[] = [`Organization ID: ${orgId}`]
  if (context && Object.keys(context).length > 0) {
    contextLines.push(`Context: ${JSON.stringify(context)}`)
  }

  const system = [SYSTEM_RULES, '', contextLines.join('\n')].join('\n')

  return { system, userMessage: userPrompt }
}
