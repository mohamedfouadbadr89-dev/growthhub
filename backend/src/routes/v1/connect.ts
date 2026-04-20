import { Hono } from 'hono'
import { generateState, validateState } from '../../lib/oauth-state.js'
import { createSecret } from '../../lib/vault.js'
import { supabaseAdmin } from '../../lib/supabase.js'

type Variables = { userId: string; orgId: string }
export const connectRouter = new Hono<{ Variables: Variables }>()

const redirectBase = () => process.env.OAUTH_REDIRECT_BASE_URL ?? ''

function buildMetaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${redirectBase()}/api/integrations/callback/meta`,
    scope: 'ads_read,ads_management',
    state,
    response_type: 'code',
  })
  return `https://www.facebook.com/dialog/oauth?${params}`
}

function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    redirect_uri: `${redirectBase()}/api/integrations/callback/google`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

function buildShopifyAuthUrl(state: string, shop: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY!,
    scope: 'read_orders',
    redirect_uri: `${redirectBase()}/api/integrations/callback/shopify`,
    state,
  })
  return `https://${shop}/admin/oauth/authorize?${params}`
}

// POST /api/v1/integrations/connect/start
connectRouter.post('/start', async (c) => {
  const orgId = c.get('orgId')
  const body = await c.req.json<{ platform: string; shop?: string }>()
  const { platform, shop } = body

  if (!['meta', 'google', 'shopify'].includes(platform)) {
    return c.json({ error: 'Bad Request', message: 'platform must be meta, google, or shopify' }, 400)
  }
  if (platform === 'shopify' && !shop) {
    return c.json({ error: 'Bad Request', message: 'shop is required for Shopify' }, 400)
  }

  const { data: existing } = await supabaseAdmin
    .from('integrations')
    .select('id')
    .eq('org_id', orgId)
    .eq('platform', platform)
    .eq('status', 'connected')
    .maybeSingle()

  if (existing) {
    return c.json({ error: 'Conflict', message: 'Platform already connected for this organization' }, 400)
  }

  const state = generateState(orgId, platform)
  let authUrl: string
  if (platform === 'meta') authUrl = buildMetaAuthUrl(state)
  else if (platform === 'google') authUrl = buildGoogleAuthUrl(state)
  else authUrl = buildShopifyAuthUrl(state, shop!)

  return c.json({ authUrl, state })
})

// POST /api/v1/integrations/connect/complete
connectRouter.post('/complete', async (c) => {
  const orgId = c.get('orgId')
  const body = await c.req.json<{ platform: string; code: string; state: string; shop?: string }>()
  const { platform, code, state, shop } = body

  if (!platform || !code || !state) {
    return c.json({ error: 'Bad Request', message: 'platform, code, and state are required' }, 400)
  }

  let stateData: { orgId: string; platform: string }
  try {
    stateData = validateState(state)
  } catch {
    return c.json({ error: 'Bad Request', message: 'Invalid or expired OAuth state' }, 400)
  }

  if (stateData.orgId !== orgId || stateData.platform !== platform) {
    return c.json({ error: 'Bad Request', message: 'Invalid or expired OAuth state' }, 400)
  }

  // Exchange authorization code for token
  let token: string
  try {
    const redirectUri = `${redirectBase()}/api/integrations/callback/${platform}`

    if (platform === 'meta') {
      const params = new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: redirectUri,
        code,
      })
      const res = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params}`)
      if (!res.ok) throw new Error('Meta token exchange failed')
      const data = await res.json() as { access_token: string }
      token = data.access_token
    } else if (platform === 'google') {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
          client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })
      if (!res.ok) throw new Error('Google token exchange failed')
      const data = await res.json() as { refresh_token: string }
      token = data.refresh_token
    } else {
      // shopify
      if (!shop) return c.json({ error: 'Bad Request', message: 'shop is required for Shopify' }, 400)
      const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }),
      })
      if (!res.ok) throw new Error('Shopify token exchange failed')
      const data = await res.json() as { access_token: string }
      token = data.access_token
    }
  } catch (err) {
    console.error('OAuth token exchange failed:', err)
    return c.json({ error: 'Internal Server Error', message: 'OAuth token exchange failed' }, 500)
  }

  // Store token in Supabase Vault
  let vaultSecretId: string
  try {
    vaultSecretId = await createSecret(token)
  } catch (err) {
    console.error('Vault secret creation failed:', err)
    return c.json({ error: 'Internal Server Error', message: 'Failed to store credentials' }, 500)
  }

  // Upsert integration record (handles reconnect case)
  const { data: integration, error } = await supabaseAdmin
    .from('integrations')
    .upsert(
      { org_id: orgId, platform, status: 'connected', vault_refresh_token_secret_id: vaultSecretId },
      { onConflict: 'org_id,platform' }
    )
    .select('id, platform, status')
    .single()

  if (error || !integration) {
    console.error('Integration upsert failed:', error)
    return c.json({ error: 'Internal Server Error', message: 'Failed to create integration' }, 500)
  }

  // For Shopify: create the ad_account row using the shop domain
  if (platform === 'shopify' && shop) {
    await supabaseAdmin
      .from('ad_accounts')
      .upsert(
        {
          org_id: orgId,
          integration_id: integration.id,
          platform_account_id: shop,
          name: shop,
          currency: 'USD',
        },
        { onConflict: 'org_id,integration_id,platform_account_id' }
      )
  }

  return c.json({ integrationId: integration.id, platform: integration.platform, status: integration.status })
})
