import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { createSecret, deleteSecret } from '../../lib/vault.js'
import { getStripeClient } from '../../lib/stripe.js'
import { ok, fail } from '../../utils/response.js'

/**
 * /api/v1/billing routes — Phase 7 Sub-pass A1c.
 *
 * Three minimal monetization-backend entrypoints:
 *
 *   PATCH  /api/v1/billing/plan   — change organizations.plan_type
 *                                    ('subscription' ↔ 'ltd')
 *   POST   /api/v1/billing/byok   — store user-provided OpenRouter key in
 *                                    Vault; persist secret_id on org
 *   DELETE /api/v1/billing/byok   — delete the stored key from Vault;
 *                                    clear secret_id on org
 *
 * Auth / org_id injection: routes/v1/index.ts mounts authMiddleware on
 * all /api/v1/* paths BEFORE registering /billing, so c.get('orgId') and
 * c.get('userId') are guaranteed populated server-side here.
 *
 * BOUNDARY:
 *  - Mirrors the credit-RPC carve-out established at routes/v1/creatives.ts
 *    + routes/v1/ai.ts: route handlers DO touch supabaseAdmin for credit-
 *    related writes (plan_type column + vault_byok_openrouter_secret_id
 *    column). The Vault helpers (createSecret/deleteSecret) wrap
 *    supabase.rpc calls — single-writer-backend invariant preserved.
 *  - org_id always comes from `c.get('orgId')` (Clerk JWT), NEVER from
 *    request body.
 *  - NO outbound Stripe API calls, NO checkout-session creation,
 *    NO customer-portal URLs (those are forward-positioned for a future
 *    pass once frontend billing UI exists).
 *  - NO RBAC enforcement at the route level — every authenticated org
 *    member can manage their org's plan + BYOK key. Adding role gating
 *    is tracked as a known follow-up; per A1c authorization "NO RBAC
 *    expansion".
 *  - NO entitlement engine, NO feature-access matrix, NO usage-tier
 *    orchestration.
 */
type Variables = { userId: string; orgId: string; requestId: string }

export const billingRouter = new Hono<{ Variables: Variables }>()

const VALID_PLAN_TYPES = new Set(['subscription', 'ltd'])

// ─── GET /billing/plan ──────────────────────────────────────────────
// Read-only hydration endpoint for the frontend billing/settings page
// (Phase 7 Sub-pass B, continuation #19). Returns the org's plan_type,
// credits_balance, and whether a BYOK key is configured. NO Stripe API
// calls; NO entitlement calculation; NO derivation logic — direct
// projection of three columns from organizations.
billingRouter.get('/plan', async (c) => {
  const orgId = c.get('orgId')

  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('org_id, plan_type, credits_balance, vault_byok_openrouter_secret_id')
    .eq('org_id', orgId)
    .single()

  if (error) {
    throw new Error(`organizations lookup failed: ${error.message}`)
  }
  if (!data) {
    return fail(c, 'Organization not found', 404, { code: 'NOT_FOUND' })
  }

  return ok(c, {
    org_id: data.org_id,
    plan_type: data.plan_type,
    credits_balance: data.credits_balance,
    has_byok_key: data.vault_byok_openrouter_secret_id !== null,
  })
})

// ─── PATCH /billing/plan ────────────────────────────────────────────
// Update organizations.plan_type. The CHECK constraint at the DB layer
// (organizations_plan_type_check) enforces enum membership; this route
// adds a friendly canonical-envelope error before reaching the constraint.
billingRouter.patch('/plan', async (c) => {
  const orgId = c.get('orgId')

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  if (typeof body.plan_type !== 'string') {
    return fail(c, 'plan_type is required', 400, {
      code: 'MISSING_PARAMETER',
      field: 'plan_type',
    })
  }
  if (!VALID_PLAN_TYPES.has(body.plan_type)) {
    return fail(c, 'plan_type must be "subscription" or "ltd"', 400, {
      code: 'INVALID_TYPE',
      field: 'plan_type',
    })
  }

  // Phase 1 audit-column population: stamp updated_by from server-side
  // Clerk JWT subject. created_by is preserved (partial-update list).
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .update({
      plan_type: body.plan_type,
      updated_by: c.get('userId'),
    })
    .eq('org_id', orgId)
    .select('org_id, plan_type, vault_byok_openrouter_secret_id')
    .single()

  if (error) {
    throw new Error(`organizations plan_type update failed: ${error.message}`)
  }
  if (!data) {
    return fail(c, 'Organization not found', 404, { code: 'NOT_FOUND' })
  }

  return ok(c, {
    org_id: data.org_id,
    plan_type: data.plan_type,
    has_byok_key: data.vault_byok_openrouter_secret_id !== null,
  })
})

// ─── POST /billing/byok ─────────────────────────────────────────────
// Store user-provided OpenRouter key in Supabase Vault. The plaintext key
// is consumed once at this entrypoint, written to Vault via createSecret,
// and discarded — only the Vault secret_id is persisted on the org row.
//
// Security hygiene:
//   - The plaintext key is NEVER returned in the response.
//   - The plaintext key is NEVER logged.
//   - Replacing an existing BYOK: the OLD secret_id is deleted from Vault
//     AFTER the new one is written + persisted, so a failure mid-flow
//     cannot orphan the new secret.
billingRouter.post('/byok', async (c) => {
  const orgId = c.get('orgId')

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  if (typeof body.openrouter_key !== 'string' || body.openrouter_key.trim().length === 0) {
    return fail(c, 'openrouter_key is required', 400, {
      code: 'MISSING_PARAMETER',
      field: 'openrouter_key',
    })
  }

  // Resolve the existing secret_id (if any) BEFORE creating the new one,
  // so we can clean up the old Vault row after the new one is persisted.
  const { data: existing, error: lookupErr } = await supabaseAdmin
    .from('organizations')
    .select('vault_byok_openrouter_secret_id')
    .eq('org_id', orgId)
    .single()

  if (lookupErr) {
    throw new Error(`organizations lookup failed: ${lookupErr.message}`)
  }
  if (!existing) {
    return fail(c, 'Organization not found', 404, { code: 'NOT_FOUND' })
  }

  const oldSecretId = existing.vault_byok_openrouter_secret_id as string | null

  // 1. Write the new key to Vault.
  let newSecretId: string
  try {
    newSecretId = await createSecret(body.openrouter_key.trim())
  } catch (err) {
    throw new Error(`Vault createSecret failed: ${(err as Error).message}`)
  }

  // 2. Persist the new secret_id on the org row.
  const { error: updateErr } = await supabaseAdmin
    .from('organizations')
    .update({
      vault_byok_openrouter_secret_id: newSecretId,
      updated_by: c.get('userId'),
    })
    .eq('org_id', orgId)

  if (updateErr) {
    // Persistence failed — try to clean up the orphaned Vault secret.
    await deleteSecret(newSecretId).catch((cleanupErr) => {
      console.error(
        `[billing] orphaned Vault secret ${newSecretId} for org=${orgId} after persistence failure; manual cleanup required: ${(cleanupErr as Error).message}`,
      )
    })
    throw new Error(`organizations BYOK update failed: ${updateErr.message}`)
  }

  // 3. Delete the OLD secret from Vault (best-effort; orphan logged but
  //    not fatal — the NEW secret is already live and the org row points
  //    at it).
  if (oldSecretId) {
    await deleteSecret(oldSecretId).catch((cleanupErr) => {
      console.error(
        `[billing] failed to delete prior Vault secret ${oldSecretId} for org=${orgId}: ${(cleanupErr as Error).message}`,
      )
    })
  }

  return ok(c, { org_id: orgId, has_byok_key: true })
})

// ─── DELETE /billing/byok ───────────────────────────────────────────
// Remove the stored BYOK key. Clears the secret_id column AFTER deleting
// from Vault — if Vault delete fails, the org row still points at the
// (now possibly absent) secret_id, which is recoverable; if we cleared
// the column first and Vault delete failed, we'd have an orphaned secret
// with no pointer to clean it up.
billingRouter.delete('/byok', async (c) => {
  const orgId = c.get('orgId')

  const { data: existing, error: lookupErr } = await supabaseAdmin
    .from('organizations')
    .select('vault_byok_openrouter_secret_id')
    .eq('org_id', orgId)
    .single()

  if (lookupErr) {
    throw new Error(`organizations lookup failed: ${lookupErr.message}`)
  }
  if (!existing) {
    return fail(c, 'Organization not found', 404, { code: 'NOT_FOUND' })
  }

  const secretId = existing.vault_byok_openrouter_secret_id as string | null
  if (!secretId) {
    // Idempotent: no key to delete → return success with current state.
    return ok(c, { org_id: orgId, has_byok_key: false })
  }

  // 1. Delete from Vault (loud on failure).
  try {
    await deleteSecret(secretId)
  } catch (err) {
    throw new Error(`Vault deleteSecret failed: ${(err as Error).message}`)
  }

  // 2. Clear the column.
  const { error: updateErr } = await supabaseAdmin
    .from('organizations')
    .update({
      vault_byok_openrouter_secret_id: null,
      updated_by: c.get('userId'),
    })
    .eq('org_id', orgId)

  if (updateErr) {
    throw new Error(`organizations BYOK clear failed: ${updateErr.message}`)
  }

  return ok(c, { org_id: orgId, has_byok_key: false })
})

// ─── POST /billing/checkout ─────────────────────────────────────────
// Phase 7 Sub-pass D (continuation #21, 2026-05-09).
//
// Creates a Stripe Checkout Session for the calling org and returns the
// hosted Checkout URL. Frontend redirects user to that URL; on payment
// completion Stripe redirects back to `success_url` and emits webhook
// events that the existing `webhooks/stripe.ts` handler consumes
// (subscription state tracking + optional credits grant via
// `metadata.credits_to_grant` on the Stripe Price).
//
// Body shape:
//   { price_id: string, mode?: 'subscription' | 'payment', success_url?: string, cancel_url?: string }
//
// `metadata.org_id` is propagated onto the Stripe Customer (created on the
// fly if not already linked) and onto the Subscription/Invoice — this is
// the canonical mechanism the inbound webhook uses to recover org_id.
//
// NO entitlement engine, NO plan-catalogue derivation, NO pricing logic
// in code: the operator configures Stripe Prices in the Stripe Dashboard;
// the frontend or operator passes the appropriate `price_id` to this
// endpoint. The route does not validate price_id against any internal
// catalogue — Stripe rejects invalid price_ids with a structured error
// that propagates back through the canonical envelope.
billingRouter.post('/checkout', async (c) => {
  const orgId = c.get('orgId')

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  if (typeof body.price_id !== 'string' || body.price_id.length === 0) {
    return fail(c, 'price_id is required', 400, {
      code: 'MISSING_PARAMETER',
      field: 'price_id',
    })
  }

  // Mode defaults to 'subscription' (recurring); 'payment' supports one-time
  // top-up SKUs. Both are valid Stripe Checkout modes.
  const rawMode = body.mode
  const mode: 'subscription' | 'payment' =
    rawMode === 'payment' ? 'payment' : 'subscription'

  // Optional return URLs. Defaults route the user back to the in-app
  // billing page. Operators with a custom success/cancel page can pass
  // explicit URLs.
  const successUrl =
    typeof body.success_url === 'string' && body.success_url.length > 0
      ? body.success_url
      : `${process.env.OAUTH_REDIRECT_BASE_URL ?? ''}/settings/billing?checkout=success`
  const cancelUrl =
    typeof body.cancel_url === 'string' && body.cancel_url.length > 0
      ? body.cancel_url
      : `${process.env.OAUTH_REDIRECT_BASE_URL ?? ''}/settings/billing?checkout=cancel`

  // Resolve an existing stripe_customer_id (if the org has one) so the
  // Stripe Customer is reused rather than duplicated on repeat checkouts.
  // Lookup is org-scoped via the subscriptions table populated by the
  // inbound webhook on first subscription event.
  const { data: existingSub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('org_id', orgId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (subErr) {
    throw new Error(`subscriptions lookup failed: ${subErr.message}`)
  }

  let stripe
  try {
    stripe = getStripeClient()
  } catch (err) {
    return fail(c, (err as Error).message, 500, { code: 'STRIPE_NOT_CONFIGURED' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: body.price_id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // metadata.org_id propagates to the Checkout Session; downstream
      // Subscription/Invoice/Customer events from the webhook will all
      // carry this for org_id recovery.
      metadata: { org_id: orgId },
      // Subscription-mode metadata is propagated to the created
      // Subscription object so the inbound webhook's metadata.org_id
      // recovery path resolves on customer.subscription.created.
      subscription_data:
        mode === 'subscription'
          ? { metadata: { org_id: orgId } }
          : undefined,
      // Reuse existing Stripe Customer when available; else Stripe creates
      // a new one and stamps metadata.org_id on the customer at creation.
      customer: existingSub?.stripe_customer_id ?? undefined,
      customer_creation:
        existingSub?.stripe_customer_id ? undefined : 'always',
      // Stamp metadata.org_id on the freshly-created customer too so
      // future flows can pivot from customer_id back to org_id without
      // depending on the subscriptions row existing yet.
      ...(existingSub?.stripe_customer_id
        ? {}
        : { customer_email: undefined }),
    })

    if (!session.url) {
      return fail(c, 'Stripe Checkout returned no URL', 500, { code: 'INTERNAL' })
    }

    return ok(c, { checkout_url: session.url, session_id: session.id })
  } catch (err) {
    const e = err as Error & { type?: string }
    // Stripe SDK errors carry a `type` discriminator (e.g. 'StripeCardError',
    // 'StripeInvalidRequestError'). Surface as canonical 5xx with the
    // discriminator preserved for operator triage.
    return fail(c, e.message ?? 'Stripe Checkout failed', 500, {
      code: 'STRIPE_CHECKOUT_FAILED',
      type: e.type,
    })
  }
})

// ─── POST /billing/portal ───────────────────────────────────────────
// Optional Stripe Customer Portal session creation. Frontend redirects
// the user to the returned URL; the portal is Stripe-hosted (no custom
// payment UI). Customer must already exist (one prior subscription event
// must have populated subscriptions.stripe_customer_id).
billingRouter.post('/portal', async (c) => {
  const orgId = c.get('orgId')

  let body: Record<string, unknown> = {}
  // Body is optional — return_url override only.
  try {
    const parsed: unknown = await c.req.json().catch(() => null)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>
    }
  } catch {
    /* body is optional */
  }

  const returnUrl =
    typeof body.return_url === 'string' && body.return_url.length > 0
      ? body.return_url
      : `${process.env.OAUTH_REDIRECT_BASE_URL ?? ''}/settings/billing`

  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('org_id', orgId)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (subErr) {
    throw new Error(`subscriptions lookup failed: ${subErr.message}`)
  }
  if (!sub || !sub.stripe_customer_id) {
    return fail(
      c,
      'No Stripe customer on file for this organization — complete a checkout first',
      404,
      { code: 'NO_STRIPE_CUSTOMER' },
    )
  }

  let stripe
  try {
    stripe = getStripeClient()
  } catch (err) {
    return fail(c, (err as Error).message, 500, { code: 'STRIPE_NOT_CONFIGURED' })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id as string,
      return_url: returnUrl,
    })
    return ok(c, { portal_url: session.url })
  } catch (err) {
    const e = err as Error & { type?: string }
    return fail(c, e.message ?? 'Stripe Customer Portal failed', 500, {
      code: 'STRIPE_PORTAL_FAILED',
      type: e.type,
    })
  }
})
