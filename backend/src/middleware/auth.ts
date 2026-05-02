console.log('🔥🔥🔥 AUTH FILE IS RUNNING 🔥🔥🔥');
import { createMiddleware } from 'hono/factory'
import { verifyToken } from '@clerk/backend'

export const authMiddleware = createMiddleware<{
  Variables: { userId: string; orgId: string }
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      { error: 'Unauthorized', message: 'Missing or invalid authentication token' },
      401
    )
  }

  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    const userId = payload.sub
const orgId =
  (payload as any).org_id ||
  (payload as any).o?.id
    if (!orgId) {
      return c.json(
        { error: 'Forbidden', message: 'User has no organization assigned' },
        403
      )
    }

    c.set('userId', userId)
    c.set('orgId', orgId)
    await next()
  } catch {
    return c.json(
      { error: 'Unauthorized', message: 'Missing or invalid authentication token' },
      401
    )
  }
})
