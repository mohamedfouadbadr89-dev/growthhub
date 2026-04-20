import { Hono } from 'hono'
import { Webhook } from 'svix'
import { supabaseAdmin } from '../../lib/supabase.js'

export const clerkWebhook = new Hono()

clerkWebhook.post('/', async (c) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET not set')
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
    console.error('[clerk-webhook] Signature verification failed:', err)
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
        console.error('[clerk-webhook] Failed to upsert organization:', error.message)
        return c.json({ error: 'DB error' }, 500)
      }
      console.log(`[clerk-webhook] Organization created: ${orgId}`)
    }

    if (eventType === 'organizationMembership.created') {
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
        console.error('[clerk-webhook] Failed to upsert user:', error.message)
        return c.json({ error: 'DB error' }, 500)
      }
      console.log(`[clerk-webhook] User membership created: ${clerkId} → org ${orgId}`)
    }
  } catch (err) {
    console.error('[clerk-webhook] Handler error:', err)
    return c.json({ error: 'Internal error' }, 500)
  }

  return c.json({ received: true })
})
