import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve as inngestServe } from 'inngest/hono'
import { health } from './routes/health.js'
import { v1 } from './routes/v1/index.js'
import { errorHandler } from './middleware/error.js'
import { inngest, functions } from './jobs/inngest.js'
import { clerkWebhook } from './routes/webhooks/clerk.js'

// ─── Process-level error handlers (must be first) ────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message)
  console.error(err.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason)
  process.exit(1)
})

// ─── Required env validation ──────────────────────────────────────────────────
const requiredEnvVars = ['CLERK_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const missingVars = requiredEnvVars.filter((key) => !process.env[key])
if (missingVars.length > 0) {
  console.warn(`[STARTUP] ⚠️  Missing env vars: ${missingVars.join(', ')} — auth/DB routes will fail until configured`)
}

type Variables = { userId: string; orgId: string }

const app = new Hono<{ Variables: Variables }>()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://72.62.131.250:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Webhook — no auth, must be before auth middleware
app.route('/api/webhooks/clerk', clerkWebhook)

// Health check — mounted at both /health and /api/v1/health (no auth required)
app.route('/health', health)
app.get('/api/v1/health', (c) =>
  c.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
)

app.route('/api/v1', v1)
app.on(['GET', 'PUT', 'POST'], '/api/inngest', inngestServe({ client: inngest, functions }))
app.onError(errorHandler)

const port = Number(process.env.PORT) || 3001
const hostname = '0.0.0.0'

serve({ fetch: app.fetch, port, hostname }, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 SERVER STARTED — GrowthHub Backend')
  console.log(`   Port:     ${port}`)
  console.log(`   Hostname: ${hostname}`)
  console.log(`   Health:   http://${hostname}:${port}/api/v1/health`)
  console.log(`   Env:      ${process.env.NODE_ENV ?? 'development'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})
