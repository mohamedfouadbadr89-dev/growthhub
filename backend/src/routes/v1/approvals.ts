/**
 * /api/v1/approvals — approval-queue WRITE chain (continuation #50).
 *
 * SOURCE OF TRUTH:
 *   - specs/AI_OPERATING_MODEL.md §4 + §8
 *   - approval_queue substrate: supabase/migrations/20260512210000_phase0_approval_queue.sql (#43)
 *   - dispatcher service: backend/src/services/approvals/dispatcher.ts (#50)
 *
 * SURFACE:
 *   GET    /api/v1/approvals             — list (filterable by ?state=)
 *   GET    /api/v1/approvals/:id         — detail (with joined ai_decisions + actions_library)
 *   POST   /api/v1/approvals/:id/approve — pending → approved → executed (dispatch)
 *   POST   /api/v1/approvals/:id/reject  — pending → rejected (terminal; optional note)
 *
 *   Body shapes:
 *     POST /approvals/:id/approve  — empty body
 *     POST /approvals/:id/reject   — { note?: string }
 *
 * NOT IN SCOPE:
 *   - Auto-enqueue logic (decision → approval_queue row) — operator
 *     decision per AI_OPERATING_MODEL.md §13 missing-semantics. Rows
 *     enter the queue via operator manual INSERT OR a future operator-
 *     authorized enqueue rule (NOT shipped this turn).
 *   - FE consumer — no Phase 6 shell activation per the operator's
 *     "Implement ONLY the approval-queue WRITE chain" authorization.
 *     A future operator-authorized Decision Center FE will consume
 *     this surface.
 *
 * GOVERNANCE INVARIANTS:
 *   - Single-writer backend: route delegates state transitions to the
 *     dispatcher service which owns ALL approval_queue UPDATE calls.
 *   - org_id flows from c.get('orgId') (Clerk JWT), NEVER from body.
 *   - RLS policy on approval_queue enforces org isolation as defense-
 *     in-depth.
 *   - Canonical Phase 1 envelope via ok()/fail().
 *   - executeAction (canonical dispatcher) remains the sole executor.
 */

import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { ok, fail } from '../../utils/response.js'
import {
  approveAndDispatch,
  reject,
  ApprovalNotFoundError,
} from '../../services/approvals/dispatcher.js'

type Variables = { userId: string; orgId: string; requestId: string }

export const approvalsRouter = new Hono<{ Variables: Variables }>()

// Canonical UUID-shape matcher; same regex as actions.ts / history.ts.
const UUID_LIKE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i
const MAX_LIMIT = 100

// Approval state enum mirrored from the migration's CHECK constraint
// (supabase/migrations/20260512210000_phase0_approval_queue.sql). The
// filter rejects any other value at the request layer (canonical 400
// instead of silent empty result) — same pattern as history.ts:65.
const VALID_STATES = new Set(['pending', 'approved', 'rejected', 'expired', 'executed'])

// ─── GET /api/v1/approvals ─────────────────────────────────────────────
// List approvals for the calling org. Default to state='pending' because
// that's the operator-actionable subset; explicit ?state= override is
// supported for inspection of historical states.
//
// Response shape includes nested ai_decisions (category + confidence_score
// + reasoning_steps) + actions_library (name + platform + action_type)
// so a FE consumer can render reasoning + action preview WITHOUT a
// second roundtrip. Same nested-select pattern as /automation/runs
// post-#37/#38/#39.
approvalsRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  const state = c.req.query('state') ?? 'pending'

  if (!VALID_STATES.has(state)) {
    return fail(c, `Invalid state filter: ${state}. Must be one of: ${Array.from(VALID_STATES).join(', ')}`, 400, {
      code: 'INVALID_FILTER',
      field: 'state',
    })
  }

  const rawLimit = parseInt(c.req.query('limit') ?? '50', 10)
  const rawOffset = parseInt(c.req.query('offset') ?? '0', 10)
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), MAX_LIMIT)
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

  const { data, error, count } = await supabaseAdmin
    .from('approval_queue')
    .select(
      'id, ai_decision_id, action_template_id, action_params, state, operator_note, operator_user_id, created_at, updated_at, ai_decisions(category, confidence_score, reasoning_steps), actions_library(name, platform, action_type)',
      { count: 'exact' },
    )
    .eq('org_id', orgId)
    .eq('state', state)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`approval_queue list failed: ${error.message}`)
  }

  return ok(c, {
    approvals: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
})

// ─── GET /api/v1/approvals/:id ─────────────────────────────────────────
// Detail view. Includes the full action_params payload (operator inspects
// before approving) + ai_decisions.reasoning_steps + the actions_library
// parameter_schema (for FE to render a typed preview / edit-before-approve
// in future operator-authorized FE).
approvalsRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid approval id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  const { data, error } = await supabaseAdmin
    .from('approval_queue')
    .select(
      'id, ai_decision_id, action_template_id, action_params, state, operator_note, operator_user_id, created_at, updated_at, ai_decisions(category, confidence_score, reasoning_steps, status), actions_library(name, platform, action_type, parameter_schema)',
    )
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  // PGRST116 = no rows (genuine 404). Anything else is infra failure
  // → throw → errorHandler emits sanitized 500 with request_id.
  if (error && error.code !== 'PGRST116') {
    throw new Error(`approval lookup failed: ${error.message}`)
  }
  if (!data) {
    return fail(c, 'Approval not found', 404, { code: 'NOT_FOUND' })
  }

  return ok(c, data)
})

// ─── POST /api/v1/approvals/:id/approve ───────────────────────────────
// Transition pending → approved → executed (dispatch). Returns the final
// state (`executed` on dispatch success; `approved` if dispatch failed and
// the row stays approved for operator inspection).
//
// 404 if row missing / wrong org / already non-pending (race-safe via
// the dispatcher's state-filter on UPDATE).
approvalsRouter.post('/:id/approve', async (c) => {
  const orgId = c.get('orgId')
  const userId = c.get('userId')
  const requestId = c.get('requestId')
  const id = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid approval id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  try {
    const result = await approveAndDispatch({
      orgId,
      approvalId: id,
      userId,
      requestId,
    })
    return ok(c, result)
  } catch (err) {
    if (err instanceof ApprovalNotFoundError) {
      return fail(c, err.message, 404, { code: 'NOT_FOUND' })
    }
    // Anything else → throw → errorHandler sanitizes
    throw err
  }
})

// ─── POST /api/v1/approvals/:id/reject ────────────────────────────────
// Transition pending → rejected with optional operator_note. Terminal
// state — no dispatch.
//
// Body shape (optional):
//   { note?: string }
//
// 404 if row missing / wrong org / already non-pending.
approvalsRouter.post('/:id/reject', async (c) => {
  const orgId = c.get('orgId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid approval id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  // Body is optional. Tolerant of empty/malformed JSON (treat as no note).
  let note: string | undefined
  try {
    const parsed: unknown = await c.req.json().catch(() => null)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const rawNote = (parsed as { note?: unknown }).note
      if (typeof rawNote === 'string' && rawNote.trim().length > 0) {
        // Cap note length defensively to avoid unbounded TEXT growth.
        // 1000 chars matches the conservative default used elsewhere for
        // operator-supplied free-form fields.
        note = rawNote.slice(0, 1000)
      }
    }
  } catch {
    // ignore — note is optional
  }

  try {
    const result = await reject({
      orgId,
      approvalId: id,
      userId,
      note,
    })
    return ok(c, result)
  } catch (err) {
    if (err instanceof ApprovalNotFoundError) {
      return fail(c, err.message, 404, { code: 'NOT_FOUND' })
    }
    throw err
  }
})
