import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'

type Variables = { userId: string; orgId: string }

const authRouter = new Hono<{ Variables: Variables }>()

authRouter.post('/verify', async (c) => {
  const userId = c.get('userId')
  const orgId = c.get('orgId')

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('email, role')
    .eq('clerk_id', userId)
    .single()

  // Discriminate "user genuinely not provisioned" from "DB layer failed".
  //
  // Pre-fix this branch was `if (error || !user)` → both cases collapsed
  // into 403 'Forbidden — User has no organization assigned'. That falsely
  // re-branded every non-PGRST116 PostgrestError (network failure, RLS
  // denial, schema drift, connection pool exhaustion, 42P01, etc.) as an
  // authorization-policy decision, bypassing errorHandler and Sentry.
  // CONSTITUTION §3 "Fail Loudly" — DB failures must surface as 5xx.
  //
  // PGRST116 ("result has 0 rows") is the canonical no-rows code from
  // .single(); it is the ONLY error code that legitimately means
  // "user not provisioned". Everything else throws → caught by Hono's
  // onError → errorHandler emits 500 with request_id in body, Sentry tag,
  // and stdout [err] line (per the prior errorHandler hardening).
  if (error && error.code !== 'PGRST116') {
    throw new Error(`auth verify: users lookup failed: ${error.message}`)
  }
  if (!user) {
    return c.json({ error: 'Forbidden', message: 'User has no organization assigned' }, 403)
  }

  return c.json({ userId, orgId, email: user.email, role: user.role })
})

export { authRouter }
