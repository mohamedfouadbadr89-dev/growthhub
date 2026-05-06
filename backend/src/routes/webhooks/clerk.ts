import { Hono } from 'hono'
import { Webhook } from 'svix'
import { supabaseAdmin } from '../../lib/supabase.js'

/**
 * Clerk webhook receiver.
 *
 * SOURCE OF TRUTH:
 *  - CLAUDE.md §3 — backend is single writer for org/user provisioning.
 *  - CONSTITUTION.md §3 "Fail Loudly" — every failure must produce a
 *    correlator the operator can pivot to / from across log sinks.
 *  - Phase 0 lock — `tracingMiddleware` mints a per-HTTP-request
 *    `request_id` UUID and stores it in `c.get('requestId')`. The
 *    middleware is mounted on `*` at app level (index.ts:53), so
 *    request_id is in scope here as well.
 *
 * `Variables: { requestId: string }` makes the read type-safe; the
 * middleware always runs before this handler, so the field is
 * guaranteed populated.
 */
export const clerkWebhook = new Hono<{ Variables: { requestId: string } }>()

clerkWebhook.post('/', async (c) => {
  // Capture request_id once for the entire handler lifecycle. Threading
  // it through every stdout emission below brings the [clerk-webhook]
  // surface in line with the [req] / [err] / [AI] / [exec] envelopes
  // (all hardened in prior turns) — single grep on a request_id pivots
  // across every log line a webhook delivery produced.
  const request_id = c.get('requestId')

  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    // Defense-in-depth — startup fail-fast at index.ts already enforces
    // CLERK_WEBHOOK_SECRET as a required env var, but the runtime check
    // remains so test imports / module-level reuse still fail loud.
    console.error(`[clerk-webhook] request_id=${request_id} CLERK_WEBHOOK_SECRET not set`)
    return c.json({ error: 'Webhook secret not configured' }, 500)
  }

  const svixId = c.req.header('svix-id')
  const svixTimestamp = c.req.header('svix-timestamp')
  const svixSignature = c.req.header('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: 'Missing Svix headers' }, 400)
  }

  const body = await c.req.text()

  let payload: Record<string, unknown>
  try {
    const wh = new Webhook(secret)
    payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as Record<string, unknown>
  } catch (err) {
    console.error(`[clerk-webhook] request_id=${request_id} svix_id=${svixId} Signature verification failed:`, err)
    return c.json({ error: 'Invalid signature' }, 400)
  }

  const eventType = payload.type as string
  const data = payload.data as Record<string, unknown>

  try {
    if (eventType === 'organization.created') {
      const orgId = data.id as string
      const name = data.name as string
      const createdAt = new Date(data.created_at as number).toISOString()

      const { error } = await supabaseAdmin
        .from('organizations')
        .upsert(
          { org_id: orgId, name, created_at: createdAt },
          { onConflict: 'org_id' }
        )

      if (error) {
        console.error(`[clerk-webhook] request_id=${request_id} svix_id=${svixId} Failed to upsert organization:`, error.message)
        return c.json({ error: 'DB error' }, 500)
      }
      console.log(`[clerk-webhook] request_id=${request_id} svix_id=${svixId} Organization created: ${orgId}`)
    } else if (eventType === 'organizationMembership.created') {
      const publicUserData = data.public_user_data as Record<string, unknown>
      const orgData = data.organization as Record<string, unknown>

      const clerkId = publicUserData.user_id as string
      const orgId = orgData.id as string
      const email = (publicUserData.identifier as string | null) ?? ''
      // Clerk roles are prefixed: "org:admin" → "admin", "org:member" → "member"
      const rawRole = (data.role as string | null) ?? 'org:member'
      const role = rawRole.replace(/^org:/, '') === 'admin' ? 'admin' : 'member'
      const createdAt = new Date(data.created_at as number).toISOString()

      const { error } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            clerk_id: clerkId,
            org_id: orgId,
            email,
            role,
            created_at: createdAt,
          },
          { onConflict: 'clerk_id' }
        )

      if (error) {
        console.error(`[clerk-webhook] request_id=${request_id} svix_id=${svixId} Failed to upsert user:`, error.message)
        return c.json({ error: 'DB error' }, 500)
      }
      console.log(`[clerk-webhook] request_id=${request_id} svix_id=${svixId} User membership created: ${clerkId} → org ${orgId}`)
    } else {
      // Unhandled event type — Clerk delivers many event types we don't
      // consume (e.g. user.created, session.removed, organization.updated).
      // Pre-fix this branch was silent — Clerk treated the 200-ack as
      // "delivered, don't retry" and we had ZERO audit trail of what was
      // sent. Logging at INFO surfaces compatibility drift without
      // changing the response contract.
      console.log(`[clerk-webhook] request_id=${request_id} svix_id=${svixId} unhandled event type: ${eventType} (200-acked, not processed)`)
    }
  } catch (err) {
    console.error(`[clerk-webhook] request_id=${request_id} svix_id=${svixId} Handler error:`, err)
    return c.json({ error: 'Internal error' }, 500)
  }

  return c.json({ received: true })
})
