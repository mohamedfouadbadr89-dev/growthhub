import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth.js'
import { authRouter } from './auth.js'

type Variables = { userId: string; orgId: string }

const v1 = new Hono<{ Variables: Variables }>()

v1.use('/*', authMiddleware)
v1.route('/auth', authRouter)

export { v1 }
