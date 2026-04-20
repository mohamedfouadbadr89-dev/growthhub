import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Server-side only: SUPABASE_SERVICE_ROLE_KEY is never exposed to the browser
// (no NEXT_PUBLIC_ prefix). This route runs on the server (Hostinger VPS) and
// mirrors the backend's role as the sole writer to Supabase for provisioning.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type UserCreatedData = {
  id: string
  first_name: string | null
  last_name: string | null
  email_addresses: { email_address: string; id: string }[]
  primary_email_address_id: string | null
}

async function handleUserCreated(data: UserCreatedData): Promise<void> {
  const userId = data.id
  const primaryEmail =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id)
      ?.email_address ?? data.email_addresses[0]?.email_address ?? ''
  const orgName = data.first_name
    ? `${data.first_name}'s Workspace`
    : `${primaryEmail.split('@')[0]}'s Workspace`

  const clerk = await clerkClient()

  // Step 1: Create Clerk Organization
  const org = await clerk.organizations.createOrganization({ name: orgName })
  const orgId = org.id

  try {
    // Step 2: Add user as org admin
    await clerk.organizationMemberships.createOrganizationMembership({
      organizationId: orgId,
      userId,
      role: 'org:admin',
    })

    // Step 3: Insert tenant records into Supabase
    const { error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ org_id: orgId, name: orgName, plan_type: 'subscription' })
    if (orgError) throw new Error(`organizations insert failed: ${orgError.message}`)

    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({ org_id: orgId, clerk_id: userId, email: primaryEmail, role: 'admin' })
    if (userError) throw new Error(`users insert failed: ${userError.message}`)

    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({ org_id: orgId, plan_type: 'subscription', status: 'trialing' })
    if (subError) throw new Error(`subscriptions insert failed: ${subError.message}`)

    // Step 4: Audit log (immutable — insert-only)
    await supabaseAdmin.from('audit_logs').insert([
      {
        org_id: orgId,
        actor_id: userId,
        action: 'user.created',
        resource: 'users',
        resource_id: userId,
      },
      {
        org_id: orgId,
        actor_id: userId,
        action: 'org.created',
        resource: 'organizations',
        resource_id: orgId,
      },
    ])
  } catch (err) {
    // Atomic rollback: prevent partial tenant state (orphaned Clerk org with no DB record)
    await clerk.organizations.deleteOrganization(orgId).catch((rollbackErr) => {
      console.error('Rollback failed — orphaned Clerk org:', orgId, rollbackErr)
    })
    throw err
  }
}

export async function POST(req: Request): Promise<Response> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  const headerList = await headers()
  const svixId = headerList.get('svix-id')
  const svixTimestamp = headerList.get('svix-timestamp')
  const svixSignature = headerList.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(webhookSecret)

  let event: { type: string; data: unknown }
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'user.created') {
      await handleUserCreated(event.data as UserCreatedData)
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
