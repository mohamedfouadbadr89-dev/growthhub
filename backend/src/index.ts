import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bodyLimit } from 'hono/body-limit'
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
import { fail } from './utils/response.js'

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

// ─── Conditional env validation: LIVE flags ↔ provider credentials ──────
//
// Each Phase 4 real-execution flag implies a hard requirement on a
// downstream credential. Today the dependency is enforced per-request
// inside services/execution/action-executor.ts (see lines 403, 605, 973,
// 1291) — every misconfigured invocation produces a `failed`
// decision_history row with the message
//   '<FLAG>=true but <DEP> is not configured'.
//
// That late binding means a misconfigured deployment passes /health,
// boots cleanly, accepts traffic, and only surfaces the misconfiguration
// when an end-user happens to trigger an execute call — by which point
// (a) the user sees a 5xx, (b) an audit row records `result=failed`, and
// (c) the operator must reconstruct the failure from logs.
//
// Promoting the same invariant to a startup-fatal check matches the
// existing pattern for unconditional vars above (CLERK_WEBHOOK_SECRET,
// INNGEST_SIGNING_KEY): if the boot-time configuration is internally
// inconsistent, refuse to boot. Operators on a misconfigured deploy see
// the failure immediately in PM2 / journald / k8s restart logs (the
// process exits with status 1 before listening), not after the first
// production user trips it.
//
// Backward compat: deployments where every LIVE flag is unset / 'false'
// (default) are unaffected. Deployments where every LIVE flag is 'true'
// AND every dep is set are unaffected. ONLY internally-inconsistent
// deployments fail-fast. The per-request runtime check in
// action-executor.ts is intentionally retained as defense-in-depth.
const LIVE_FLAG_DEPENDENCIES: Array<{ flag: string; deps: readonly string[] }> = [
  { flag: 'META_PAUSE_CAMPAIGN_LIVE',   deps: ['META_TEST_ACCESS_TOKEN'] },
  { flag: 'META_DECREASE_BUDGET_LIVE',  deps: ['META_TEST_ACCESS_TOKEN'] },
  { flag: 'META_INCREASE_BUDGET_LIVE',  deps: ['META_TEST_ACCESS_TOKEN'] },
  { flag: 'SEND_ALERT_EMAIL_LIVE',      deps: ['RESEND_API_KEY'] },
  // Phase 4 Part 2: Google pause_campaign requires Phase 2 OAuth credentials
  // (developer token + OAuth client) at startup. Per-org refresh tokens are
  // resolved per-request via Supabase Vault (integrations.vault_refresh_token_secret_id);
  // those are NOT in this static check by design.
  { flag: 'GOOGLE_PAUSE_CAMPAIGN_LIVE', deps: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET'] },
]

const liveMisconfig: string[] = []
for (const { flag, deps } of LIVE_FLAG_DEPENDENCIES) {
  if (process.env[flag] === 'true') {
    for (const dep of deps) {
      if (!process.env[dep]) {
        liveMisconfig.push(`${flag}=true but ${dep} is not set`)
      }
    }
  }
}

if (liveMisconfig.length > 0) {
  console.error(`[STARTUP][FATAL] LIVE-flag misconfiguration:`)
  for (const msg of liveMisconfig) {
    console.error(`  - ${msg}`)
  }
  console.error(
    `Either populate the dependency in backend/.env (see backend/.env.example) or set the LIVE flag to 'false'.`,
  )
  process.exit(1)
}

type Variables = { userId: string; orgId: string; requestId: string }

// ─── Smoke-endpoint flag ──────────────────────────────────────
//
// Default OFF (cost-protection). The /test, /ai, /trigger-ai operator
// diagnostic endpoints below are auth-protected but always-on, and two of
// them spend real provider budget on every authenticated call:
//   - GET /ai         → outbound POST to OpenRouter (consumes platform
//                       credits per call)
//   - GET /trigger-ai → outbound inngest.send() (consumes Inngest event
//                       budget per call)
//
// They have no frontend caller (verified empty grep against app/, lib/,
// public/, middleware.ts) and are not in any Phase deliverable. CONSTITUTION
// §3 mandates "Rate limit every public API endpoint" — these have zero
// rate limit today and unbounded per-call cost.
//
// Pattern matches the established Phase 4 real-execution flag-gate
// (META_*_LIVE=false default; see services/execution/action-executor.ts +
// backend/.env.example "Phase 4 real-execution guards" block).
//
// Operators set ENABLE_SMOKE_ENDPOINTS=true in .env.local for dev workflow;
// production / PM2 environments simply omit the var → endpoints behave as
// 404 → cost vector closed. The /health and /api/v1/health probes remain
// unconditionally registered (load balancers / k8s liveness need them).
const SMOKE_ENDPOINTS_ENABLED = process.env.ENABLE_SMOKE_ENDPOINTS === 'true'

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

// ─── Smoke / debug endpoints (flag-gated; see SMOKE_ENDPOINTS_ENABLED above)
//
// Registration is conditional. When the env var is unset / not 'true' the
// three handlers below never bind to their paths → unmatched requests
// reach Hono's default 404 → no provider budget is spent on /ai or
// /trigger-ai. authMiddleware still wraps the cost-bearing two when they
// ARE registered (defense-in-depth — anonymous callers cannot trigger
// outbound spend even in dev).
if (SMOKE_ENDPOINTS_ENABLED) {
  // ─── /test — no resource cost; pure liveness probe for ad-hoc curl
  app.get('/test', (c) => {
    return c.json({
      status: 'working',
      message: 'Backend is running 🚀',
    })
  })

  // ─── /ai — calls OpenRouter using the backend's API key. authMiddleware
  // required per CONSTITUTION §1.3 ("Never bypass auth") to prevent
  // anonymous callers from spending the backend's OpenRouter credits and
  // to guarantee every call carries a verified org_id/user_id.
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

  // ─── /trigger-ai — dispatches an Inngest event on the backend's billing
  // account. authMiddleware required per CONSTITUTION §1.3 to prevent
  // anonymous callers from spamming the Inngest event budget.
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
}

// ─── /api/v1 body-size cap (defense-in-depth) ─────────────────
//
// CONSTITUTION §3 line 44: "Rate limit every public API endpoint." A
// per-call body-size cap is the most direct form of rate limiting and the
// only request-validation guard between an authenticated caller and Hono's
// `c.req.json()` buffer. Pre-fix, every active POST/PATCH route across the
// canonical /api/v1 surface (campaigns ×3, ai ×2, actions ×1) buffered
// arbitrary-size payloads into memory with no upper bound — a memory-DoS
// vector for any in-org authenticated bad actor.
//
// Cap: 1 MB. Runtime evidence (every legitimate observed body across the
// active write surface ≪ 100 KB; AI prompts the largest realistic class)
// makes this ≥10× headroom for the largest plausible legitimate caller
// while bounding the worst-case memory footprint.
//
// Scope: /api/v1/* ONLY. Explicitly NOT applied to:
//   - /health, /api/v1/health   → load-balancer / k8s probes (no body)
//   - /api/inngest               → Inngest function-invocation payloads
//                                  may legitimately exceed 1 MB; covered
//                                  by INNGEST_SIGNING_KEY HMAC verify
//   - /api/webhooks/clerk        → Svix-signed; size profile differs
//   - /test, /ai, /trigger-ai    → smoke-only, flag-gated default-off
//
// Mount position: BEFORE the v1 router (which itself mounts authMiddleware).
// This means anonymous traffic with oversized bodies is rejected without
// using auth resources — same short-circuit pattern as `deferredPhase`.
//
// 413 response shape: canonical envelope via `fail()` helper. The new
// `code: 'PAYLOAD_TOO_LARGE'` is consumed verbatim by the frontend
// api-client's coded-error passthrough (prior turn), so the user sees the
// actionable message instead of the generic 5xx fallback.
const BODY_LIMIT_BYTES = 1024 * 1024 // 1 MB
app.use(
  '/api/v1/*',
  bodyLimit({
    maxSize: BODY_LIMIT_BYTES,
    onError: (c) =>
      fail(c, 'Payload too large', 413, {
        code: 'PAYLOAD_TOO_LARGE',
        max_bytes: BODY_LIMIT_BYTES,
      }),
  }),
)

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
  // Loud announcement of smoke-endpoint state (CONSTITUTION §3 "Fail
  // Loudly"). Operators see immediately whether the cost-bearing
  // diagnostics are reachable; misconfigured production deployments
  // can't accidentally leave the gate open without it appearing in
  // PM2 / journald boot logs.
  if (SMOKE_ENDPOINTS_ENABLED) {
    console.log(`   Smoke:    ENABLED (set ENABLE_SMOKE_ENDPOINTS=false to disable)`)
    console.log(`   Test:     http://localhost:${port}/test`)
    console.log(`   AI:       http://localhost:${port}/ai`)
    console.log(`   Trigger:  http://localhost:${port}/trigger-ai`)
  } else {
    console.log(`   Smoke:    disabled (set ENABLE_SMOKE_ENDPOINTS=true in .env.local for /test, /ai, /trigger-ai)`)
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})