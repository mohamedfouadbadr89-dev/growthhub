import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve as inngestServe } from 'inngest/hono'
import { health } from './routes/health.js'
import { v1 } from './routes/v1/index.js'
import { aiRouter } from './routes/v1/ai.js' // ✅ ADDED
import { errorHandler } from './middleware/error.js'
import { tracingMiddleware } from './middleware/tracing.js'
import { requestLoggerMiddleware } from './middleware/request-logger.js'
import { authMiddleware } from './middleware/auth.js'
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

// ─── Env validation ───────────────────────────────────────────
// Per CONSTITUTION §1.1 ("Never expose secrets"), startup MUST NOT log
// secret values. Presence is signaled here loudly via the missingVars
// check below (fail-fast with [STARTUP][FATAL] when any required var is
// unset). A prior debug line that printed the literal INNGEST_EVENT_KEY
// to stdout was removed because backend stdout forwards to log
// aggregators (PM2, journald, Sentry breadcrumbs) where it leaked.
const requiredEnvVars = [
  'CLERK_SECRET_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'INNGEST_EVENT_KEY',
  // INNGEST_SIGNING_KEY is the HMAC secret Inngest uses to verify the
  // signatures on inbound function-invocation requests at /api/inngest.
  // Without it, the public /api/inngest endpoint accepts unverified
  // requests — a CONSTITUTION §1.3 violation generalized to webhooks.
  // Promoting from soft warn (jobs/inngest.ts:19-21) to startup-fatal.
  'INNGEST_SIGNING_KEY',
  // CLERK_WEBHOOK_SECRET is the Svix HMAC secret used to verify inbound
  // Clerk webhook deliveries (organization.created, organizationMembership.created)
  // at /api/webhooks/clerk. Without it, every webhook returns 500 →
  // Clerk's retry policy fires for hours → eventually marks the endpoint
  // failed → org/user rows never get provisioned → silent gap in
  // organizations/users tables that surfaces only when end-users complain.
  // Same fail-fast pattern as INNGEST_SIGNING_KEY above; webhooks/clerk.ts
  // keeps its runtime check as defense-in-depth.
  'CLERK_WEBHOOK_SECRET',
]

const missingVars = requiredEnvVars.filter((key) => !process.env[key])

if (missingVars.length > 0) {
  // CONSTITUTION §3 "Fail Loudly". Refuse to boot with missing required env.
  // Note: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing will already have
  // thrown at the lib/supabase.ts module-load above; this block catches the
  // remaining required vars (CLERK_SECRET_KEY, OPENROUTER_API_KEY,
  // INNGEST_EVENT_KEY) before any route is mounted.
  console.error(
    `[STARTUP][FATAL] Missing required env var(s): ${missingVars.join(', ')}`,
  )
  console.error(
    `Set them in backend/.env (see backend/.env.example) or your deploy environment.`,
  )
  process.exit(1)
}

type Variables = { userId: string; orgId: string; requestId: string }

const app = new Hono<{ Variables: Variables }>()

// ─── Middlewares ──────────────────────────────────────────────
// Phase 0 lock: tracing first (mints request_id), then structured request
// logger (uses request_id + org_id/user_id once authMiddleware runs).
// Replaces hono/logger() — same wire position, structured JSON output.
app.use('*', tracingMiddleware)
app.use('*', requestLoggerMiddleware)
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
// Smoke-test endpoint — calls OpenRouter using the backend's API key.
// authMiddleware required per CONSTITUTION §1.3 ("Never bypass auth")
// to prevent anonymous callers from spending the backend's OpenRouter
// credits and to guarantee every call carries a verified org_id/user_id.
app.get('/ai', authMiddleware, async (c) => {
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
// Smoke-test endpoint — dispatches an Inngest event on the backend's
// billing account. authMiddleware required per CONSTITUTION §1.3 to
// prevent anonymous callers from spamming the Inngest event budget.
app.get('/trigger-ai', authMiddleware, async (c) => {
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