import { Hono } from 'hono'

type Variables = { userId: string; orgId: string }

export const aiRouter = new Hono<{ Variables: Variables }>()

aiRouter.post('/decisions/generate', async (c) => {
  return c.json({
    success: true,
    data: {
      type: 'decision',
      result: 'Mock decision output',
      confidence_score: 0.85,
    },
  })
})