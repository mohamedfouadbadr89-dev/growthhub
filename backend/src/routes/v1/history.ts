import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { ok, fail } from '../../utils/response.js'

// requestId is set by tracingMiddleware (mounted at app level in index.ts).
// Declaring it here makes the Phase 1 envelope helpers (ok/fail) type-safe
// when they call c.get('requestId') to populate the request_id field.
type Variables = { userId: string; orgId: string; requestId: string }

export const historyRouter = new Hono<{ Variables: Variables }>()

// CONSTITUTION §3 line 60: "Paginate all list endpoints — never return
// unlimited rows." `decision_history` is append-only (Phase 4 minimal
// migration; CLAUDE.md §9 identifies it as "the most critical table in
// the system") and grows unboundedly per execution. Without a server-side
// upper bound, any in-org authenticated client could send `?limit=999999`
// and force a fetch of every audit row — memory / bandwidth amplification
// vector. Pattern matched verbatim from campaigns.ts:21 (MAX_LIMIT = 100)
// for cross-route consistency.
const MAX_LIMIT = 100

// Closed-enum domain for `?executed_by` filter, mirrored from the
// decision_history CHECK constraint
// (`executed_by IN ('manual', 'automation')` per
// 20260503130000_phase4_minimal_execution_layer.sql:93). Cross-route
// consistency with campaigns LIST `VALID_PLATFORMS` / `VALID_STATUSES`
// pattern: invalid filter values rejected at the request layer with
// canonical 400 + INVALID_FILTER instead of silently returning 0 rows.
const VALID_EXECUTED_BY = new Set(['manual', 'automation'])

// Canonical UUID-shape matcher. Mirrors backend/src/middleware/tracing.ts:30
// and backend/src/routes/v1/actions.ts:21 for cross-module consistency.
// Used to gate the `:id` path parameter on the detail handler
// (decision_history.id is UUID PRIMARY KEY per
// 20260503130000_phase4_minimal_execution_layer.sql). Without this, a
// non-UUID path segment reaches `.eq('id', x).single()` → 22P02 →
// uncaught → 500. Validating up-front converts the cryptic 500 into a
// canonical 400 + `code: 'INVALID_TYPE'` + `field: 'id'`.
const UUID_LIKE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

// GET /history — list (no data_used for performance).
//
// Column list aligned with the deployed decision_history schema as defined
// by:
//   - 20260503130000_phase4_minimal_execution_layer.sql (canonical columns)
//   - 20260503140000_phase4_decision_history_idempotency.sql (execution_id)
//   - 20260503150000_phase4_decision_history_impact_snapshot.sql (impact_snapshot)
//
// The Phase 4 minimal migration deliberately renamed `decision_id` →
// `ai_decision_id` (linking to the canonical Phase 3 ai_decisions table,
// not the legacy/malformed `decisions` table) and excluded
// `automation_rule_id` / `automation_run_id` (Phase 4 automation engine
// deferred). Pre-fix this SELECT requested all three deprecated columns
// and Postgres rejected with 42703, returning 500 on every list call.
historyRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  const { executed_by } = c.req.query()

  // Pre-fix: `?executed_by=banana` would silently run
  // `.eq('executed_by','banana')` → 0 rows returned → frontend renders
  // "no decisions match the selected filters" misleadingly. Validating
  // against the DB CHECK enum at the request layer converts the silent
  // empty-result case into a canonical 400 with actionable diagnostic.
  // Cross-route consistency with campaigns LIST + actions LIST patterns.
  if (executed_by !== undefined && !VALID_EXECUTED_BY.has(executed_by)) {
    return fail(c, `Invalid executed_by filter: ${executed_by}. Must be one of: manual, automation`, 400, {
      code: 'INVALID_FILTER',
      field: 'executed_by',
    })
  }

  // NaN-safe coercion + MAX_LIMIT clamp. Pre-fix did `Number(limit)` which
  // would propagate NaN to .range(0, NaN) on `?limit=foo` (undefined-
  // behavior in supabase-js: silent-drop / unbounded query / driver-error
  // depending on path). parseInt + isNaN guard + Math.min/Math.max clamp
  // matches campaigns.ts:35-38 verbatim — single canonical pattern across
  // active list routes.
  const rawLimit  = parseInt(c.req.query('limit')  ?? '50', 10)
  const rawOffset = parseInt(c.req.query('offset') ?? '0',  10)
  const limit  = Math.min(Math.max(1, isNaN(rawLimit)  ? 50 : rawLimit), MAX_LIMIT)
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

  let query = supabaseAdmin
    .from('decision_history')
    .select('id, org_id, decision, action_taken, trigger_condition, result, ai_explanation, confidence_score, ai_decision_id, executed_by, created_at', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (executed_by) query = query.eq('executed_by', executed_by)

  const { data, error, count } = await query
  // Pre-fix: `if (error) return c.json({ error: error.message }, 500)` —
  // leaked raw Postgrest error strings (table/column names, SQLSTATE
  // codes, RLS policy boundaries, connection topology hints) directly to
  // any authenticated caller. CONSTITUTION §1.1 ("Never expose secrets")
  // generalized to error-message hygiene + CLAUDE.md §9 (decision_history
  // is the most critical table) make this a real information-disclosure
  // surface. CONSTITUTION §3 "Fail Loudly" demands operator-side loudness,
  // not client-side leakage — those are different concerns.
  //
  // Throw → caught by app.onError(errorHandler) → sanitized 500 body
  // {error: 'Internal Server Error', request_id} for the client; full
  // error captured in Sentry (with request_id tag) and stdout [err]
  // (with request_id prefix) for the operator. Single grep on request_id
  // pivots between any sink.
  if (error) {
    throw new Error(`history list lookup failed: ${error.message}`)
  }

  return ok(c, { history: data ?? [], total: count ?? 0 })
})

// GET /history/:id — full record with data_used
historyRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid history record id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  const { data, error } = await supabaseAdmin
    .from('decision_history')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  // Discriminate "audit record genuinely absent" from "DB layer failed".
  //
  // Pre-fix this branch was `if (error || !data) → 404 'History record not
  // found'`. Pattern-identical to the auth.ts/verify and actions.ts/:id
  // anti-patterns closed in prior hardening turns: every non-PGRST116
  // PostgrestError (network failure, RLS denial, schema drift, connection
  // pool exhaustion, 42P01, etc.) was rebranded as resource absence,
  // bypassing errorHandler and Sentry.
  //
  // CLAUDE.md §9 elevates the urgency here: decision_history is "the
  // system memory and explainability layer ... the most critical table
  // in the system." A misclassified 404 on infrastructure failure leads
  // operators to conclude an audit record was never created when in fact
  // the DB read failed transiently — and may cause action re-execution
  // under false-absence assumption.
  //
  // PGRST116 ("result has 0 rows") is the canonical no-rows code from
  // .single(); it is the ONLY error code that legitimately means
  // "record not present". Everything else throws → caught by Hono's
  // onError → errorHandler emits 500 with request_id in body, Sentry tag,
  // and stdout [err] line (per the prior errorHandler hardening).
  if (error && error.code !== 'PGRST116') {
    throw new Error(`history/:id lookup failed: ${error.message}`)
  }
  if (!data) return fail(c, 'History record not found', 404, { code: 'NOT_FOUND' })
  return ok(c, data)
})
