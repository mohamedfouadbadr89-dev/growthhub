import { Hono } from 'hono'
import type { Context } from 'hono'
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
import { campaignsRouter } from './campaigns.js'
import { aiRouter } from './ai.js'

type Variables = { userId: string; orgId: string }

const v1 = new Hono<{ Variables: Variables }>()

// 🔒 Auth middleware MUST run before every route — Clerk token + org_id are mandatory
v1.use('/*', authMiddleware)

// ─── Deferred-phase 503 gates ────────────────────────────────────────────
//
// Per SYSTEM_CONTROL.md, several phases are deferred and their backing
// tables are NOT in supabase/migrations/. The corresponding routers below
// are kept mounted (so the URL surface stays self-documenting and trivially
// re-enabled) but every request is short-circuited at the prefix level
// with a structured 503 envelope BEFORE any handler runs.
//
// This replaces the previous failure mode (Postgres "relation does not
// exist" → cryptic 500) with a clear, fail-loud "phase deferred" response.
// Re-enabling a phase later is a one-line edit: delete the corresponding
// `v1.use('/x/*', deferredPhase(...))` line.
//
// Auth still runs first (above), so unauthenticated callers continue to
// receive 401, not 503 — no information leak.
const deferredPhase = (routerPath: string, phaseLabel: string) =>
  async (c: Context): Promise<Response> => {
    let request_id: string | null = null
    try {
      // requestId set by tracingMiddleware at the app level (index.ts).
      // Defensive read in case this router is ever mounted without tracing.
      request_id = (c.get('requestId' as never) as string) ?? null
    } catch {
      /* tracing not in chain — leave null */
    }
    // Phase 1 canonical envelope (backend/src/utils/response.ts). The
    // additive `phase: 'deferred'` and `router` fields are preserved
    // inside `error` so any operator scraping for deferred-phase 503s
    // keeps their existing matcher.
    //
    // `code: 'DEFERRED'` is the canonical envelope discriminator. The
    // frontend api-client uses the presence of `error.code` to decide
    // whether the server's message is intentionally caller-facing
    // (explicit fail() / deferredPhase) and should bypass the generic
    // friendlyMessage mask. Without this code, the deferred-phase 503
    // body collapses to "Server error — try again in a few moments" at
    // the UI, hiding the actionable "Phase X disabled" copy.
    return c.json(
      {
        success: false,
        error: {
          message: `${routerPath} is intentionally disabled (${phaseLabel} per SYSTEM_CONTROL.md). Backing infrastructure is not deployed.`,
          code: 'DEFERRED',
          phase: 'deferred',
          router: routerPath,
        },
        request_id,
      },
      503,
    )
  }

// Phase 2 (data ingestion) — UNLOCKED 2026-05-07. Migration
// 20260507120000_phase2_data_ingestion.sql is deployed; 4 canonical
// tables (integrations, ad_accounts, campaign_metrics, sync_logs) live.
// /integrations/* and /metrics/* gates lifted; routes serve real data.
//
// Envelope note: integrations.ts / connect.ts / metrics.ts pre-date the
// canonical fail()/ok() envelope hardening and emit legacy shapes
// (bare arrays, `{ error: '...' }`). The wired frontend (api-client +
// integrations/dashboard pages) consumes the legacy shape directly.
// Migrating these routes onto the canonical envelope is a future
// Phase-1-cross-cutting patch that requires coordinated frontend
// changes; deferred so Phase 2 ships without breaking the frontend.
v1.use('/decisions/*',    deferredPhase('/api/v1/decisions',    'Phase 3 anomaly engine (legacy decisions table malformed; decision_runs not deployed)'))
v1.use('/alerts/*',       deferredPhase('/api/v1/alerts',       'Phase 3 anomaly engine'))
// Phase 4 Part 2 (automation engine) — UNLOCKED 2026-05-07. Migration
// `20260507130000_phase4_part2_automation.sql` deployed; 2 canonical
// tables (automation_rules, automation_runs) + 2 nullable decision_history
// columns (automation_rule_id, automation_run_id) live in production.
// `/automation/*` gate lifted; routes serve real CRUD + manual rule
// execution. Auto-firing on AI decision stream remains GOVERNANCE-BLOCKED
// (Phase 3 anomaly DEPRECATED; manual-fire path operational via
// POST /api/v1/automation/rules/:id/execute).
// Phase 5 (AI creatives) — UNLOCKED 2026-05-07. Migration
// `20260507140000_phase5_creatives.sql` deployed; 3 canonical tables
// (brand_kits, creative_generations, creatives) + 2 organizations
// columns (plan_type, vault_byok_openrouter_secret_id — Phase 7 BYOK
// substrate required by Phase 5 FR-011) + 1 private storage bucket
// (`creatives`) live in production. `/creatives/*` and `/brand-kit/*`
// gates lifted. Routes (`creatives.ts`, `brand-kit.ts`) currently use
// legacy envelope shapes; canonicalization tracked as
// PHASE5_ENVELOPE_FOLLOWUP (frontend pages are mocked-shells with no
// apiClient coupling, so future canonicalization can land safely).

// ─── Route mounts (handler files unchanged; the gates above short-circuit
// deferred-phase requests before any handler is invoked) ─────────────────
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
v1.route('/campaigns', campaignsRouter)
v1.route('/ai', aiRouter)

export { v1 }
