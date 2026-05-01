import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve as inngestServe } from 'inngest/hono'
import { health } from './routes/health.js'
import { v1 } from './routes/v1/index.js'
import { aiRouter } from './routes/v1/ai.js' // ✅ ADDED
import { errorHandler } from './middleware/error.js'
import { inngest, functions } from './jobs/inngest.js'
import { clerkWebhook } from './routes/webhooks/clerk.js'

// ─── Process-level error handlers ─────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message)
  console.error(err.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason)
  process.exit(1)
})

// ─── ENV DEBUG ────────────────────────────────────────────────
console.log('🔑 INNGEST_EVENT_KEY:', process.env.INNGEST_EVENT_KEY)

// ─── Env validation ───────────────────────────────────────────
const requiredEnvVars = [
  'CLERK_SECRET_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'INNGEST_EVENT_KEY',
]

const missingVars = requiredEnvVars.filter((key) => !process.env[key])

if (missingVars.length > 0) {
  console.warn(`[STARTUP] ⚠️ Missing env vars: ${missingVars.join(', ')}`)
}

type Variables = { userId: string; orgId: string }

const app = new Hono<{ Variables: Variables }>()

// ─── Middlewares ──────────────────────────────────────────────
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://72.62.131.250:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// ─── Webhooks ─────────────────────────────────────────────────
app.route('/api/webhooks/clerk', clerkWebhook)

// ─── Health ───────────────────────────────────────────────────
app.route('/health', health)
app.get('/api/v1/health', (c) =>
  c.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
)

// ─── TEST ─────────────────────────────────────────────────────
app.get('/test', (c) => {
  return c.json({
    status: 'working',
    message: 'Backend is running 🚀',
  })
})

// ─── AI TEST ──────────────────────────────────────────────────
app.get('/ai', async (c) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: 'Say hello from GrowthHub AI' }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return c.json({ success: false, error: data }, 500)
    }

    return c.json({
      success: true,
      ai: data.choices?.[0]?.message?.content || data,
    })

  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
})

// ─── TRIGGER EVENT ────────────────────────────────────────────
app.get('/trigger-ai', async (c) => {
  try {
    console.log('🔥 Sending event to Inngest...')

    await inngest.send({
      name: 'test/ai',
      data: { message: 'Hello from trigger endpoint 🚀' },
    })

    return c.json({
      success: true,
      message: 'Event sent to Inngest',
    })

  } catch (err) {
    console.error('❌ TRIGGER ERROR:', err)

    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }, 500)
  }
})

// ─── API ──────────────────────────────────────────────────────
app.route('/api/v1', v1)
app.route('/api/v1/ai', aiRouter) // ✅ ADDED (IMPORTANT)

// ─────────────────────────────────────────────────────────────
app.on(['GET', 'POST', 'PUT'], '/api/inngest',
  inngestServe({
    client: inngest,
    functions,
  })
)

// ─── Error Handler ────────────────────────────────────────────
app.onError(errorHandler)

// ─── Server ───────────────────────────────────────────────────
const port = Number(process.env.PORT) || 3001
const hostname = '0.0.0.0'

serve({ fetch: app.fetch, port, hostname }, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 SERVER STARTED — GrowthHub Backend')
  console.log(`   Port:     ${port}`)
  console.log(`   Health:   http://localhost:${port}/api/v1/health`)
  console.log(`   Test:     http://localhost:${port}/test`)
  console.log(`   AI:       http://localhost:${port}/ai`)
  console.log(`   Trigger:  http://localhost:${port}/trigger-ai`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})