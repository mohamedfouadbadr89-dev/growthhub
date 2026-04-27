import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import { supabaseAdmin } from '../../lib/supabase.js'

export const MCP_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_campaigns',
      description: "Fetch the org's active campaigns with their current performance metrics (ROAS, spend, revenue, status).",
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'paused', 'learning', 'all'],
            description: "Filter by campaign status. Default: 'all'.",
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Maximum number of campaigns to return. Default: 10.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_creatives',
      description: "Fetch the org's generated creatives including their performance scores and status.",
      parameters: {
        type: 'object',
        properties: {
          campaign_id: {
            type: 'string',
            description: 'Filter creatives by campaign ID. Optional.',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Maximum number of creatives to return. Default: 10.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_actions',
      description: 'Fetch available executable actions from the actions library, optionally filtered by platform or action type.',
      parameters: {
        type: 'object',
        properties: {
          platform: {
            type: 'string',
            enum: ['meta', 'google', 'tiktok', 'all'],
            description: "Filter by ad platform. Default: 'all'.",
          },
          action_type: {
            type: 'string',
            description: "Filter by action type (e.g., 'pause_campaign', 'increase_budget'). Optional.",
          },
        },
        required: [],
      },
    },
  },
]

// ─── Tool Handlers ────────────────────────────────────────────────────────────

const TIMEOUT_MS = 5000

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Tool handler timed out')), TIMEOUT_MS)
  })
  try {
    const result = await Promise.race([promise, timeout])
    clearTimeout(timer!)
    return result
  } catch (err) {
    clearTimeout(timer!)
    throw err
  }
}

async function handleGetCampaigns(
  params: Record<string, unknown>,
  orgId: string
): Promise<unknown> {
  const status = typeof params.status === 'string' ? params.status : 'all'
  const limit = typeof params.limit === 'number' ? Math.min(params.limit, 50) : 10

  let query = supabaseAdmin
    .from('campaigns')
    .select('id, name, status, platform, budget, spend, roas')
    .eq('org_id', orgId)
    .limit(limit)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw new Error(`get_campaigns failed: ${error.message}`)
  return data ?? []
}

async function handleGetCreatives(
  params: Record<string, unknown>,
  orgId: string
): Promise<unknown> {
  const limit = typeof params.limit === 'number' ? Math.min(params.limit, 50) : 10

  let query = supabaseAdmin
    .from('creatives')
    .select('id, headline, body, cta, score, status, campaign_id')
    .eq('org_id', orgId)
    .limit(limit)

  if (typeof params.campaign_id === 'string' && params.campaign_id) {
    query = query.eq('campaign_id', params.campaign_id)
  }

  const { data, error } = await query
  if (error) throw new Error(`get_creatives failed: ${error.message}`)
  return data ?? []
}

async function handleGetActions(
  params: Record<string, unknown>,
  orgId: string
): Promise<unknown> {
  const platform = typeof params.platform === 'string' ? params.platform : 'all'

  let query = supabaseAdmin
    .from('actions_library')
    .select('id, name, platform, action_type, description')
    .eq('org_id', orgId)

  if (platform !== 'all') {
    query = query.eq('platform', platform)
  }
  if (typeof params.action_type === 'string' && params.action_type) {
    query = query.eq('action_type', params.action_type)
  }

  const { data, error } = await query
  if (error) throw new Error(`get_actions failed: ${error.message}`)
  return data ?? []
}

// ─── Dispatcher ────────────────────────────────────────────────────────────────

export async function callTool(
  name: string,
  params: Record<string, unknown>,
  orgId: string
): Promise<unknown> {
  switch (name) {
    case 'get_campaigns':
      return withTimeout(handleGetCampaigns(params, orgId))
    case 'get_creatives':
      return withTimeout(handleGetCreatives(params, orgId))
    case 'get_actions':
      return withTimeout(handleGetActions(params, orgId))
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
