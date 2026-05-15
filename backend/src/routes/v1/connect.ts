import { Hono } from 'hono'
import { generateState, validateState } from '../../lib/oauth-state.js'
import { createSecret, deleteSecret } from '../../lib/vault.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { ok, fail } from '../../utils/response.js'
import { isValidSlackWebhookUrl } from '../../services/integrations/slack.js'

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

  // Continuation #105 (2026-05-13) — runtime safety hardening parallel to #104.
  // Pre-fix: `error` was discarded — a DB lookup failure (network/RLS/schema)
  // silently returned `data=null` and the code treated it as "no existing
  // integration" → proceeded with redundant OAuth + credential rotation,
  // bypassing the ALREADY_CONNECTED dedupe gate. Now: capture error + throw
  // → errorHandler emits sanitized 500 with request_id (CONSTITUTION §3
  // "Fail Loudly"). Switched .maybeSingle() → .limit(1) array select for
  // backfill robustness (mirrors #101 / #104 pattern); pre-existing duplicate
  // (org_id, platform, status='connected') rows from a prior bug would crash
  // .maybeSingle() with PGRST116 — array select is safe regardless.
  const { data: existingRows, error: existingErr } = await supabaseAdmin
    .from('integrations')
    .select('id')
    .eq('org_id', orgId)
    .eq('platform', platform)
    .eq('status', 'connected')
    .limit(1)

  if (existingErr) {
    throw new Error(`connect start: existing integration lookup failed: ${existingErr.message}`)
  }
  if (existingRows && existingRows.length > 0) {
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

  // For Shopify: create the ad_account row using the shop domain.
  // Continuation #105 (2026-05-13) — silent-failure hardening. Pre-fix:
  // the upsert's return value was discarded entirely. If the insert failed
  // (RLS, schema, conflict-key mismatch), the integration row was created
  // as 'connected' but the ad_account row was missing — downstream sync
  // and campaign code expects (integration_id, platform_account_id) to
  // exist and silently fails with no audit trail. Now: capture error +
  // throw → errorHandler emits sanitized 500 with request_id; integration
  // row stays as-is (separate transaction) but the operator sees the
  // failure surface instead of a half-completed connect flow.
  if (platform === 'shopify' && shop) {
    const { error: adAcctErr } = await supabaseAdmin
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

    if (adAcctErr) {
      throw new Error(`connect complete: shopify ad_account upsert failed: ${adAcctErr.message}`)
    }
  }

  return ok(c, { integrationId: integration.id, platform: integration.platform, status: integration.status })
})

// POST /api/v1/integrations/connect/slack
//
// Phase Ω.8A.1 — Slack connect path. Slack uses the INCOMING WEBHOOK
// model, NOT OAuth: there is no /start (no auth dance) and no /complete
// (no authorization-code exchange). The operator creates an incoming
// webhook in their own Slack workspace and submits the resulting URL
// here directly. This is a single self-contained connection route.
//
// The webhook URL is a single-value non-OAuth secret: it is stored ONLY
// in Supabase Vault and referenced by `integrations.provider_secret_id`
// (ACTION_RUNTIME_RULES.md §15). It is NEVER written raw to a DB column
// and NEVER logged. The credential-ownership invariant
// (`provider_secret_id` populated, `vault_refresh_token_secret_id` NULL)
// is set explicitly on the upsert and enforced at runtime by
// `shape-registry.ts` `assertCredentialShape()`.
//
// Reconnect (operator pastes a fresh URL) upserts on (org_id, platform)
// and best-effort deletes the superseded Vault secret — no orphans.
connectRouter.post('/slack', async (c) => {
  const orgId = c.get('orgId')

  let body: { webhook_url?: unknown }
  try {
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as { webhook_url?: unknown }
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  // Validate the webhook URL shape BEFORE it touches Vault. Rejecting a
  // non-Slack host here is the connect-time half of the SSRF guard the
  // slack.post_message handler also applies at call time.
  const webhookUrl = body.webhook_url
  if (!isValidSlackWebhookUrl(webhookUrl)) {
    return fail(
      c,
      'webhook_url must be a valid Slack incoming-webhook URL (https://hooks.slack.com/services/...)',
      400,
      { code: 'INVALID_PARAMETER', field: 'webhook_url' },
    )
  }

  // Capture any prior slack credential so the superseded Vault secret can
  // be cleaned up after a successful reconnect.
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('integrations')
    .select('id, provider_secret_id')
    .eq('org_id', orgId)
    .eq('platform', 'slack')
    .maybeSingle()
  if (existingErr) {
    throw new Error(
      `connect slack: existing integration lookup failed: ${existingErr.message}`,
    )
  }
  const oldSecretId =
    existing && typeof existing.provider_secret_id === 'string'
      ? existing.provider_secret_id
      : null

  // Store the webhook URL in Supabase Vault.
  let vaultSecretId: string
  try {
    vaultSecretId = await createSecret(webhookUrl)
  } catch (err) {
    console.error(
      `[connect-slack][req=${c.get('requestId') ?? 'no-request-id'}] ` +
        `Vault secret creation failed (org=${orgId}):`,
      err,
    )
    return fail(c, 'Failed to store credentials', 500, { code: 'VAULT_STORE_FAILED' })
  }

  // Upsert the integration row. `provider_secret_id` carries the credential;
  // `vault_refresh_token_secret_id` is explicitly NULLed to honor the
  // single-credential-column invariant for the slack platform.
  const { data: integration, error } = await supabaseAdmin
    .from('integrations')
    .upsert(
      {
        org_id: orgId,
        platform: 'slack',
        status: 'connected',
        provider_secret_id: vaultSecretId,
        vault_refresh_token_secret_id: null,
      },
      { onConflict: 'org_id,platform' },
    )
    .select('id, platform, status')
    .single()

  if (error || !integration) {
    console.error(
      `[connect-slack][req=${c.get('requestId') ?? 'no-request-id'}] ` +
        `Integration upsert failed (org=${orgId}):`,
      error,
    )
    // Best-effort: drop the secret we just created so it is not orphaned.
    try {
      await deleteSecret(vaultSecretId)
    } catch {
      /* observability-only — the upsert failure is the surfaced error */
    }
    return fail(c, 'Failed to create integration', 500, {
      code: 'INTEGRATION_UPSERT_FAILED',
    })
  }

  // Reconnect cleanup: delete the superseded webhook secret (best-effort).
  if (oldSecretId && oldSecretId !== vaultSecretId) {
    try {
      await deleteSecret(oldSecretId)
    } catch (err) {
      console.error(
        `[connect-slack][req=${c.get('requestId') ?? 'no-request-id'}] ` +
          `Failed to delete superseded Vault secret (org=${orgId}):`,
        err,
      )
    }
  }

  return ok(c, {
    integrationId: integration.id,
    platform: integration.platform,
    status: integration.status,
  })
})
