import { Hono } from 'hono'
import * as crypto from 'node:crypto'
import { supabaseAdmin } from '../../lib/supabase.js'

/**
 * Stripe webhook receiver — Phase 7 Sub-pass A1c.
 *
 * SOURCE OF TRUTH:
 *  - CLAUDE.md TECH STACK    — "Payments | Stripe | Billing"
 *  - Phases.md §Phase 7      — monetization backend
 *  - SYSTEM_CONTROL.md       — A1c authorization scope (continuation #18)
 *
 * BOUNDARY:
 *  - Mirrors `backend/src/routes/webhooks/clerk.ts` structure: signature
 *    verification first, event-type dispatch second, server-side DB writes
 *    via supabaseAdmin (single-writer-backend invariant preserved).
 *  - Manual HMAC-SHA256 verification using Node `crypto` — avoids adding
 *    the `stripe` SDK as a new dependency for the verification primitive.
 *  - Org_id is recovered from Stripe-customer metadata (set during
 *    customer creation in a future Sub-pass that wires checkout flows) OR
 *    looked up via `subscriptions.stripe_customer_id` if previously stored.
 *  - Credit grants on payment events: the webhook reads
 *    `invoice.metadata.credits_to_grant` and calls `grant_credits` RPC.
 *    No pricing/rate derivation in code — operator configures
 *    credits-per-product via Stripe Price metadata (canonical Stripe knob).
 *
 * What this handler does NOT do (per A1c authorization):
 *  - NO outbound Stripe API calls (no Stripe SDK; no checkout-session
 *    creation; no customer-portal URLs; no subscription mutations from
 *    the backend toward Stripe). Those are forward-positioned for future
 *    passes when frontend billing UI exists.
 *  - NO retry engine / queue abstraction / event-bus system.
 *  - NO async orchestration layer (handlers are synchronous over HTTP).
 *  - NO subscription state-machine redesign — uses existing
 *    `subscriptions.status` CHECK enum {trialing, active, canceled, past_due}.
 */
export const stripeWebhook = new Hono<{ Variables: { requestId: string } }>()

// ─── Signature verification ──────────────────────────────────────────
//
// Stripe's `Stripe-Signature` header format is:
//   t=<unix_timestamp>,v1=<hex_hmac_sha256>
// Verification is HMAC-SHA256 of `<timestamp>.<raw_body>` using the webhook
// secret, compared with the v1 signature using a timing-safe comparator.
//
// Phase 7 webhook hardening (continuation #22, 2026-05-09): timestamp
// tolerance enforcement matching Stripe SDK's `constructEvent` default
// (300s / 5 min). Replay protection beyond signature validity — a captured
// signed payload becomes invalid 5 minutes after Stripe issued it. The
// signed-payload binding (HMAC of `<t>.<body>`) is preserved verbatim;
// this hardening adds a clock-window gate before HMAC comparison.
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300

function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) return false

  const parts = signatureHeader.split(',').map((p) => p.trim())
  let timestamp = ''
  const v1Signatures: string[] = []
  for (const part of parts) {
    const [k, v] = part.split('=')
    if (k === 't' && v) timestamp = v
    if (k === 'v1' && v) v1Signatures.push(v)
  }
  if (!timestamp || v1Signatures.length === 0) return false

  // Timestamp tolerance enforcement. Reject signatures whose `t` is
  // outside the ±tolerance window from server clock. This blocks:
  //   - Pure replay of an old captured signed payload (after 5 minutes)
  //   - Forward-clock-skew payloads (defensive against clock drift abuse)
  // Stripe always sends UTC unix-seconds; server NODE_ENV uses UTC.
  const ts = parseInt(timestamp, 10)
  if (!Number.isFinite(ts)) return false
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - ts) > STRIPE_SIGNATURE_TOLERANCE_SECONDS) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  // Constant-time comparison across all v1 candidate signatures.
  for (const sig of v1Signatures) {
    if (sig.length !== expected.length) continue
    try {
      if (
        crypto.timingSafeEqual(
          Buffer.from(sig, 'utf8'),
          Buffer.from(expected, 'utf8'),
        )
      ) {
        return true
      }
    } catch {
      // Buffer length mismatch — treat as no-match (covered by length check
      // above, but defensive against any future input shape changes).
    }
  }
  return false
}

// ─── Subscriptions UPSERT helper ─────────────────────────────────────
async function upsertSubscription(
  request_id: string,
  org_id: string,
  stripeSubObj: Record<string, unknown>,
): Promise<void> {
  // Canonical mapping: Stripe subscription object → public.subscriptions row.
  // The `status` CHECK enum is {trialing, active, canceled, past_due}; any
  // other Stripe status (e.g. "incomplete") is normalized to 'past_due' for
  // schema compatibility. Tracked verbatim for audit.
  const rawStatus = stripeSubObj.status as string | undefined
  const status =
    rawStatus === 'trialing' ||
    rawStatus === 'active' ||
    rawStatus === 'canceled' ||
    rawStatus === 'past_due'
      ? rawStatus
      : 'past_due'

  const stripeSubId = stripeSubObj.id as string
  const stripeCustomerId = stripeSubObj.customer as string | undefined
  const periodEndUnix = stripeSubObj.current_period_end as number | undefined
  const currentPeriodEnd =
    typeof periodEndUnix === 'number'
      ? new Date(periodEndUnix * 1000).toISOString()
      : null

  // Upsert by stripe_sub_id. If a row exists, update status + period; else
  // insert a new subscriptions row tied to the org_id.
  const { data: existing, error: lookupErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('stripe_sub_id', stripeSubId)
    .maybeSingle()

  if (lookupErr) {
    console.error(
      `[stripe-webhook] request_id=${request_id} subscriptions lookup failed: ${lookupErr.message}`,
    )
    return
  }

  if (existing) {
    const { error: updateErr } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_sub_id', stripeSubId)
    if (updateErr) {
      console.error(
        `[stripe-webhook] request_id=${request_id} subscriptions update failed: ${updateErr.message}`,
      )
    }
    return
  }

  const { error: insertErr } = await supabaseAdmin.from('subscriptions').insert({
    org_id,
    plan_type: 'subscription',
    status,
    stripe_customer_id: stripeCustomerId ?? null,
    stripe_sub_id: stripeSubId,
    current_period_end: currentPeriodEnd,
  })
  if (insertErr) {
    console.error(
      `[stripe-webhook] request_id=${request_id} subscriptions insert failed: ${insertErr.message}`,
    )
  }
}

// ─── Org_id recovery ─────────────────────────────────────────────────
// Priority: (1) event-object metadata.org_id → (2) lookup via
// subscriptions.stripe_customer_id. Stripe doesn't natively know about our
// org_id; the canonical wiring is to set `metadata.org_id` on the Stripe
// Customer at creation time (forward-positioned for a future checkout-flow
// pass).
async function recoverOrgId(
  request_id: string,
  metadata: Record<string, unknown> | undefined,
  stripeCustomerId: string | undefined,
): Promise<string | null> {
  const fromMetadata =
    metadata && typeof metadata.org_id === 'string' && metadata.org_id.length > 0
      ? (metadata.org_id as string)
      : null
  if (fromMetadata) return fromMetadata

  if (!stripeCustomerId) return null

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('org_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  if (error) {
    console.error(
      `[stripe-webhook] request_id=${request_id} subscriptions org_id recovery failed: ${error.message}`,
    )
    return null
  }
  return data ? (data.org_id as string) : null
}

// ─── POST / ──────────────────────────────────────────────────────────
stripeWebhook.post('/', async (c) => {
  const request_id = c.get('requestId')

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    // Defense-in-depth — startup fail-fast at index.ts requires this env
    // var; the runtime check remains so test imports / module-level reuse
    // still fail loud.
    console.error(
      `[stripe-webhook] request_id=${request_id} STRIPE_WEBHOOK_SECRET not set`,
    )
    return c.json({ error: 'Webhook secret not configured' }, 500)
  }

  const signatureHeader = c.req.header('stripe-signature')
  // c.req.text() consumes the body once. We need raw body for HMAC, then
  // JSON-parse it ourselves (cannot re-read).
  const rawBody = await c.req.text()

  if (!verifyStripeSignature(rawBody, signatureHeader, secret)) {
    console.error(
      `[stripe-webhook] request_id=${request_id} signature verification failed`,
    )
    return c.json({ error: 'Invalid signature' }, 400)
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>
  } catch (err) {
    console.error(
      `[stripe-webhook] request_id=${request_id} JSON parse failed:`,
      (err as Error).message,
    )
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const eventType = event.type as string | undefined
  const eventId = event.id as string | undefined
  const data = event.data as { object?: Record<string, unknown> } | undefined
  const obj = data?.object ?? {}

  console.log(
    `[stripe-webhook] request_id=${request_id} event_id=${eventId} event_type=${eventType}`,
  )

  // Phase 7 webhook hardening (continuation #22): atomic event_id dedup.
  // Stripe retries non-2xx for hours; operators can also re-deliver
  // events from the dashboard. Without dedup, a retry after a previous
  // successful processing would double-grant credits / double-upsert
  // subscriptions. INSERT INTO processed_stripe_events (event_id PK) is
  // the dedup gate: ON CONFLICT (PK) → caller catches 23505 and acks
  // 200 immediately.
  //
  // Failure mode: if the dedup INSERT fails for any reason OTHER than
  // 23505 (e.g. connection pool exhaustion, RLS misconfiguration), we
  // log + continue rather than block the webhook. Stripe-side retry on
  // 500 would re-enter this same path; the next attempt's DB write
  // either succeeds (dedup gate now active) or fails again (operator
  // alerted via [stripe-webhook] error log). Best-effort dedup; never
  // block the webhook on infra failure.
  if (eventId) {
    const { error: dedupErr } = await supabaseAdmin
      .from('processed_stripe_events')
      .insert({ event_id: eventId, event_type: eventType ?? null })

    if (dedupErr) {
      const code = (dedupErr as { code?: string }).code
      if (code === '23505') {
        console.log(
          `[stripe-webhook] request_id=${request_id} event_id=${eventId} already processed (dedup) — acking 200`,
        )
        return c.json({ received: true, deduped: true })
      }
      console.error(
        `[stripe-webhook] request_id=${request_id} event_id=${eventId} dedup INSERT failed: ${dedupErr.message}`,
      )
      // Continue — best-effort dedup; Stripe retry will exercise this
      // path again and the next attempt's INSERT will either succeed
      // (closing the dedup gate) or fail again (operator alerted).
    }
  }

  try {
    if (
      eventType === 'customer.subscription.created' ||
      eventType === 'customer.subscription.updated' ||
      eventType === 'customer.subscription.deleted'
    ) {
      const metadata = obj.metadata as Record<string, unknown> | undefined
      const stripeCustomerId = obj.customer as string | undefined
      const org_id = await recoverOrgId(request_id, metadata, stripeCustomerId)
      if (!org_id) {
        console.error(
          `[stripe-webhook] request_id=${request_id} event_id=${eventId} could not recover org_id — skipping`,
        )
      } else {
        // For the `deleted` event Stripe still emits the subscription object
        // with status='canceled' — upsertSubscription handles this naturally.
        await upsertSubscription(request_id, org_id, obj)
      }
    } else if (eventType === 'invoice.payment_succeeded') {
      // Opportunistic credit grant: read `metadata.credits_to_grant` from the
      // invoice (operator-configured via Stripe Price/Product metadata). If
      // absent, log + skip — no implicit pricing logic in this layer.
      const metadata = obj.metadata as Record<string, unknown> | undefined
      const stripeCustomerId = obj.customer as string | undefined
      const org_id = await recoverOrgId(request_id, metadata, stripeCustomerId)

      const rawCredits = metadata?.credits_to_grant
      const credits =
        typeof rawCredits === 'string'
          ? parseInt(rawCredits, 10)
          : typeof rawCredits === 'number'
            ? rawCredits
            : NaN

      if (!org_id) {
        console.error(
          `[stripe-webhook] request_id=${request_id} event_id=${eventId} payment succeeded but org_id unrecoverable — skipping grant`,
        )
      } else if (!Number.isFinite(credits) || credits <= 0) {
        console.log(
          `[stripe-webhook] request_id=${request_id} event_id=${eventId} payment succeeded for org=${org_id} but no credits_to_grant metadata — skipping grant (operator-configurable)`,
        )
      } else {
        const invoiceId = obj.id as string | undefined
        const { error: grantErr } = await supabaseAdmin.rpc('grant_credits', {
          p_org_id: org_id,
          p_amount: credits,
          p_reason: 'stripe_purchase',
          p_ref_type: 'stripe_invoice',
          // p_ref_id is UUID-typed; Stripe invoice ids are not UUIDs (e.g.
          // "in_1Abc..."), so we pass NULL and store the invoice id in the
          // log line for correlation. A future migration could change ref_id
          // to TEXT or add a separate `ref_external_id` column.
          p_ref_id: null,
        })
        if (grantErr) {
          console.error(
            `[stripe-webhook] request_id=${request_id} event_id=${eventId} grant_credits failed for org=${org_id} invoice=${invoiceId}: ${grantErr.message}`,
          )
        } else {
          console.log(
            `[stripe-webhook] request_id=${request_id} event_id=${eventId} granted ${credits} credits to org=${org_id} invoice=${invoiceId}`,
          )
        }
      }
    } else {
      // Unhandled event types are ack'd with 200 (Stripe expects 2xx within
      // a few seconds or it will retry indefinitely). Logging the type lets
      // operators discover events they may want to wire later.
      console.log(
        `[stripe-webhook] request_id=${request_id} event_id=${eventId} unhandled event_type=${eventType} (ack'd)`,
      )
    }
  } catch (err) {
    // Defense-in-depth — any unhandled handler error returns 500 so Stripe
    // will retry. The error is loud-logged for operator follow-up.
    console.error(
      `[stripe-webhook] request_id=${request_id} event_id=${eventId} handler error: ${(err as Error).message}`,
    )
    return c.json({ error: 'Handler error' }, 500)
  }

  return c.json({ received: true })
})
