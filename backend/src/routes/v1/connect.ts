import { Hono } from 'hono'
import { generateState, validateState } from '../../lib/oauth-state.js'
import { createSecret } from '../../lib/vault.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { ok, fail } from '../../utils/response.js'

// Continuation #31 (2026-05-12) — PHASE2_ENVELOPE_FOLLOWUP item M resolution.
// Canonicalized onto Phase 1 envelope per ADJACENT CONTINUATION AUTHORITY.
// FE apiClient detection-unwrap (#13) absorbs the change transparently.
type Variables = { userId: string; orgId: string; requestId: string }
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
    return fail(c, 'platform must be meta, google, or shopify', 400, { code: 'INVALID_PLATFORM', field: 'platform' })
  }
  if (platform === 'shopify' && !shop) {
    return fail(c, 'shop is required for Shopify', 400, { code: 'MISSING_PARAMETER', field: 'shop' })
  }

  const { data: existing } = await supabaseAdmin
    .from('integrations')
    .select('id')
    .eq('org_id', orgId)
    .eq('platform', platform)
    .eq('status', 'connected')
    .maybeSingle()

  if (existing) {
    return fail(c, 'Platform already connected for this organization', 409, { code: 'ALREADY_CONNECTED' })
  }

  const state = generateState(orgId, platform)
  let authUrl: string
  if (platform === 'meta') authUrl = buildMetaAuthUrl(state)
  else if (platform === 'google') authUrl = buildGoogleAuthUrl(state)
  else authUrl = buildShopifyAuthUrl(state, shop!)

  return ok(c, { authUrl, state })
})

// POST /api/v1/integrations/connect/complete
connectRouter.post('/complete', async (c) => {
  const orgId = c.get('orgId')
  const body = await c.req.json<{ platform: string; code: string; state: string; shop?: string }>()
  const { platform, code, state, shop } = body

  if (!platform || !code || !state) {
    return fail(c, 'platform, code, and state are required', 400, { code: 'MISSING_PARAMETER' })
  }

  let stateData: { orgId: string; platform: string }
  try {
    stateData = validateState(state)
  } catch {
    return fail(c, 'Invalid or expired OAuth state', 400, { code: 'INVALID_OAUTH_STATE' })
  }

  if (stateData.orgId !== orgId || stateData.platform !== platform) {
    return fail(c, 'Invalid or expired OAuth state', 400, { code: 'INVALID_OAUTH_STATE' })
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
      if (!shop) return fail(c, 'shop is required for Shopify', 400, { code: 'MISSING_PARAMETER', field: 'shop' })
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
    // Continuation #48 — request_id correlation. Tag with platform so
    // operators can pivot from [req] back to the failing platform branch
    // without needing to inspect the request body. Grep parity with
    // [req]/[err]/[exec]/[AI] chain.
    console.error(
      `[connect-oauth][req=${c.get('requestId') ?? 'no-request-id'}] ` +
        `OAuth token exchange failed (platform=${platform}, org=${orgId}):`,
      err,
    )
    return fail(c, 'OAuth token exchange failed', 502, { code: 'OAUTH_EXCHANGE_FAILED' })
  }

  // Store token in Supabase Vault
  let vaultSecretId: string
  try {
    vaultSecretId = await createSecret(token)
  } catch (err) {
    // Continuation #48 — request_id correlation (see above).
    console.error(
      `[connect-oauth][req=${c.get('requestId') ?? 'no-request-id'}] ` +
        `Vault secret creation failed (platform=${platform}, org=${orgId}):`,
      err,
    )
    return fail(c, 'Failed to store credentials', 500, { code: 'VAULT_STORE_FAILED' })
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
    // Continuation #48 — request_id correlation (see above).
    console.error(
      `[connect-oauth][req=${c.get('requestId') ?? 'no-request-id'}] ` +
        `Integration upsert failed (platform=${platform}, org=${orgId}):`,
      error,
    )
    return fail(c, 'Failed to create integration', 500, { code: 'INTEGRATION_UPSERT_FAILED' })
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

  return ok(c, { integrationId: integration.id, platform: integration.platform, status: integration.status })
})
