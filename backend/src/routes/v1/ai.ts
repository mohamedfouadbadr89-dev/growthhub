import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { createSecret, readSecret, deleteSecret } from '../../lib/vault.js'
import { check as rateCheck, retryAfterMs } from '../../lib/rate-limiter.js'
import { has as cacheHas, get as cacheGet, set as cacheSet, cacheKey } from '../../lib/ai-cache.js'
import { createAiClient, type AiProvider } from '../../services/ai/ai-client.js'
import { buildPrompt } from '../../services/ai/prompt-builder.js'
import { MCP_TOOLS, callTool } from '../../services/ai/mcp-tools.js'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

type Variables = { userId: string; orgId: string; orgRole?: string }

export const aiRouter = new Hono<{ Variables: Variables }>()

const VALID_PROVIDERS = new Set<AiProvider>(['openai', 'anthropic', 'openrouter'])

// ─── GET /connect ── status check ────────────────────────────────────────────
aiRouter.get('/connect', async (c) => {
  const orgId = c.get('orgId')
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('vault_byok_mcp_provider, vault_byok_mcp_secret_id')
    .eq('id', orgId)
    .single()

  if (error) return c.json({ error: 'INTERNAL_ERROR' }, 500)

  const connected = data?.vault_byok_mcp_secret_id != null
  return c.json({ connected, provider: connected ? data.vault_byok_mcp_provider : null })
})

// ─── POST /connect ── store provider key ─────────────────────────────────────
aiRouter.post('/connect', async (c) => {
  const orgId = c.get('orgId')

  let body: { provider?: string; api_key?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'MISSING_FIELDS' }, 400)
  }

  const { provider, api_key } = body

  if (!provider || !api_key) return c.json({ error: 'MISSING_FIELDS' }, 400)
  if (!VALID_PROVIDERS.has(provider as AiProvider)) return c.json({ error: 'INVALID_PROVIDER' }, 400)
  if (!api_key.trim()) return c.json({ error: 'EMPTY_KEY' }, 400)

  // Delete existing vault secret if one is already stored
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('vault_byok_mcp_secret_id')
    .eq('id', orgId)
    .single()

  if (org?.vault_byok_mcp_secret_id) {
    try { await deleteSecret(org.vault_byok_mcp_secret_id) } catch { /* ignore if already gone */ }
  }

  let secretId: string
  try {
    secretId = await createSecret(api_key)
  } catch {
    return c.json({ error: 'VAULT_ERROR' }, 500)
  }

  const { error: updateError } = await supabaseAdmin
    .from('organizations')
    .update({ vault_byok_mcp_provider: provider, vault_byok_mcp_secret_id: secretId })
    .eq('id', orgId)

  if (updateError) return c.json({ error: 'VAULT_ERROR' }, 500)

  return c.json({ connected: true, provider })
})

// ─── DELETE /connect ── remove provider key ───────────────────────────────────
aiRouter.delete('/connect', async (c) => {
  const orgId = c.get('orgId')

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('vault_byok_mcp_secret_id')
    .eq('id', orgId)
    .single()

  if (!org?.vault_byok_mcp_secret_id) return c.json({ disconnected: true })

  try { await deleteSecret(org.vault_byok_mcp_secret_id) } catch { /* ignore if already gone */ }

  await supabaseAdmin
    .from('organizations')
    .update({ vault_byok_mcp_provider: null, vault_byok_mcp_secret_id: null })
    .eq('id', orgId)

  return c.json({ disconnected: true })
})

// ─── POST /execute ── run AI prompt ──────────────────────────────────────────
aiRouter.post('/execute', async (c) => {
  const orgId = c.get('orgId')

  let body: { provider?: string; model?: string; prompt?: string; context?: Record<string, unknown> }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'MISSING_FIELDS' }, 400)
  }

  const { provider, model, prompt, context } = body

  if (!provider || !model || !prompt) return c.json({ error: 'MISSING_FIELDS' }, 400)
  if (!VALID_PROVIDERS.has(provider as AiProvider)) return c.json({ error: 'INVALID_PROVIDER' }, 400)

  // Rate limit
  if (!rateCheck(orgId)) {
    return c.json({ error: 'RATE_LIMITED', retryAfterMs: retryAfterMs(orgId) }, 429)
  }

  // Cache check
  const key = cacheKey(provider, model, prompt, orgId)
  if (cacheHas(key)) {
    const cached = cacheGet<{ response: string; tool_calls: unknown[] }>(key)!
    return c.json({ ...cached, cached: true, provider, model })
  }

  // Load org key
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('vault_byok_mcp_secret_id, vault_byok_mcp_provider')
    .eq('id', orgId)
    .single()

  if (!org?.vault_byok_mcp_secret_id) return c.json({ error: 'NO_AI_KEY' }, 402)

  let apiKey: string
  try {
    apiKey = await readSecret(org.vault_byok_mcp_secret_id)
  } catch {
    return c.json({ error: 'VAULT_ERROR' }, 500)
  }

  const { system, userMessage } = buildPrompt({ userPrompt: prompt, orgId, context })
  const client = createAiClient(provider as AiProvider, apiKey)

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ]

  const toolCallLog: { tool: string; result: unknown }[] = []

  try {
    // Initial call with MCP tool schema
    let response = await client.chat.completions.create({
      model,
      messages,
      tools: MCP_TOOLS,
      tool_choice: 'auto',
    })

    // Tool call resolution loop
    while (response.choices[0]?.finish_reason === 'tool_calls') {
      const assistantMsg = response.choices[0].message
      messages.push(assistantMsg)

      const toolResults: ChatCompletionMessageParam[] = []
      for (const tc of assistantMsg.tool_calls ?? []) {
        const params = JSON.parse(tc.function.arguments || '{}')
        const result = await callTool(tc.function.name, params, orgId)
        toolCallLog.push({ tool: tc.function.name, result })
        toolResults.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      }
      messages.push(...toolResults)

      response = await client.chat.completions.create({
        model,
        messages,
        tools: MCP_TOOLS,
        tool_choice: 'auto',
      })
    }

    const finalText = response.choices[0]?.message?.content ?? ''
    const result = { response: finalText, tool_calls: toolCallLog }
    cacheSet(key, result)

    // Log execution event (no prompt content, no key)
    console.log('[ai:execute]', JSON.stringify({
      orgId, provider, model,
      cached: false,
      toolCount: toolCallLog.length,
      success: true,
      ts: new Date().toISOString(),
    }))

    return c.json({ ...result, cached: false, provider, model })
  } catch (err) {
    console.error('[ai:execute] provider error', err)
    return c.json({ error: 'PROVIDER_ERROR' }, 500)
  }
})
