import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth.js'
import { authRouter } from './auth.js'
import { connectRouter } from './connect.js'
import { integrationsRouter } from './integrations.js'
import { metricsRouter } from './metrics.js'
import { decisionsRouter } from './decisions.js'
import { alertsRouter } from './alerts.js'
import { actionsRouter } from './actions.js'
import { historyRouter } from './history.js'
import { automationRouter } from './automation.js'
import { brandKitRouter } from './brand-kit.js'
import { creativesRouter } from './creatives.js'

type Variables = { userId: string; orgId: string }

const v1 = new Hono<{ Variables: Variables }>()

v1.use('/*', authMiddleware)
v1.route('/auth', authRouter)
v1.route('/integrations/connect', connectRouter)
v1.route('/integrations', integrationsRouter)
v1.route('/metrics', metricsRouter)
v1.route('/decisions', decisionsRouter)
v1.route('/alerts', alertsRouter)
v1.route('/actions', actionsRouter)
v1.route('/history', historyRouter)
v1.route('/automation', automationRouter)
v1.route('/brand-kit', brandKitRouter)
v1.route('/creatives', creativesRouter)

export { v1 }
