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

  if (error || !user) {
    return c.json({ error: 'Forbidden', message: 'User has no organization assigned' }, 403)
  }

  return c.json({ userId, orgId, email: user.email, role: user.role })
})

export { authRouter }
