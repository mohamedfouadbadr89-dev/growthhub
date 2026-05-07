/**
 * Phase 4 Part 2 — automation router (canonical envelope).
 *
 * Authority: specs/SYSTEM_CONTROL.md (Phase 4 Part 2 unlock 2026-05-07);
 * specs/004-execution-layer/contracts/automation.md.
 *
 * Endpoints:
 *   GET    /api/v1/automation/rules                  — list org rules
 *   POST   /api/v1/automation/rules                  — create rule
 *   PATCH  /api/v1/automation/rules/:id              — update rule (org-scoped)
 *   DELETE /api/v1/automation/rules/:id              — delete rule (org-scoped)
 *   POST   /api/v1/automation/rules/:id/execute      — manual rule fire
 *   GET    /api/v1/automation/runs                   — list runs (filter, paginate)
 *
 * Conventions enforced (matching the rest of the active hardened surface):
 *   - canonical envelope `ok()` / `fail()` from utils/response.ts
 *   - UUID path/body gate via shared `UUID_LIKE`
 *   - body-shape validation pattern
 *   - LIST validation parity (status/rule_id filters; limit/offset clamps)
 *   - PGRST116 discriminator on `.single()` reads
 *   - org_id from c.get('orgId') exclusively (never from body)
 *   - infra failures throw → errorHandler triple-sink (Sentry + stdout + body)
 *
 * Auto-firing of automation rules on the `ai_decisions` stream remains
 * GOVERNANCE-DEFERRED until Phase 3 anomaly engine is unlocked or the
 * AI Output Contract is extended with a category field. See
 * services/execution/automation-engine.ts header comment for the path.
 */

import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { ok, fail } from '../../utils/response.js'
import { executeRule } from '../../services/execution/automation-engine.js'

type Variables = { userId: string; orgId: string; requestId: string }

export const automationRouter = new Hono<{ Variables: Variables }>()

const UUID_LIKE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

const VALID_TRIGGER_TYPES = new Set([
  'ROAS_DROP',
  'SPEND_SPIKE',
  'CONVERSION_DROP',
  'SCALING_OPPORTUNITY',
])
const VALID_RUN_STATUSES = new Set(['pending', 'success', 'failed', 'skipped'])
const MAX_LIMIT = 100

// ─── GET /rules ───────────────────────────────────────────────────────
automationRouter.get('/rules', async (c) => {
  const orgId = c.get('orgId')

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .select(
      'id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count, last_fired_at, created_at, updated_at, actions_library(platform, name)',
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`automation rules list failed: ${error.message}`)
  }

  return ok(c, { rules: data ?? [], total: (data ?? []).length })
})

// ─── POST /rules ──────────────────────────────────────────────────────
automationRouter.post('/rules', async (c) => {
  const orgId = c.get('orgId')

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  // Required fields.
  const name = body.name
  const trigger_type = body.trigger_type
  const action_template_id = body.action_template_id
  if (typeof name !== 'string' || name.trim() === '') {
    return fail(c, 'name is required', 400, { code: 'MISSING_PARAMETER', field: 'name' })
  }
  if (typeof trigger_type !== 'string' || !VALID_TRIGGER_TYPES.has(trigger_type)) {
    return fail(c, 'trigger_type must be one of: ROAS_DROP, SPEND_SPIKE, CONVERSION_DROP, SCALING_OPPORTUNITY', 400, {
      code: 'INVALID_FILTER',
      field: 'trigger_type',
    })
  }
  if (typeof action_template_id !== 'string' || !UUID_LIKE.test(action_template_id)) {
    return fail(c, 'action_template_id must be a valid UUID', 400, {
      code: 'INVALID_TYPE',
      field: 'action_template_id',
    })
  }

  // Optional fields with strict validation (matches campaigns POST/PATCH coercion hardening).
  let minConfidenceThreshold = 70
  if (body.min_confidence_threshold !== undefined) {
    const v = body.min_confidence_threshold
    if (
      typeof v !== 'number' ||
      !Number.isFinite(v) ||
      !Number.isInteger(v) ||
      v < 0 ||
      v > 100
    ) {
      return fail(c, 'min_confidence_threshold must be an integer between 0 and 100', 400, {
        code: 'INVALID_TYPE',
        field: 'min_confidence_threshold',
      })
    }
    minConfidenceThreshold = v
  }

  let actionParams: Record<string, unknown> = {}
  if (body.action_params !== undefined) {
    if (
      typeof body.action_params !== 'object' ||
      body.action_params === null ||
      Array.isArray(body.action_params)
    ) {
      return fail(c, 'action_params must be a non-null object', 400, {
        code: 'INVALID_TYPE',
        field: 'action_params',
      })
    }
    actionParams = body.action_params as Record<string, unknown>
  }

  let enabled = true
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') {
      return fail(c, 'enabled must be a boolean', 400, {
        code: 'INVALID_TYPE',
        field: 'enabled',
      })
    }
    enabled = body.enabled
  }

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .insert({
      org_id: orgId,
      name: name.trim(),
      trigger_type,
      min_confidence_threshold: minConfidenceThreshold,
      action_template_id,
      action_params: actionParams,
      enabled,
    })
    .select(
      'id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count, last_fired_at, created_at, updated_at',
    )
    .single()

  if (error || !data) {
    throw new Error(`automation rule insert failed: ${error?.message ?? 'no row'}`)
  }

  return ok(c, data, 201)
})

// ─── PATCH /rules/:id ─────────────────────────────────────────────────
automationRouter.patch('/rules/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid rule id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await c.req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return fail(c, 'name must be a non-empty string', 400, { code: 'INVALID_TYPE', field: 'name' })
    }
    updates.name = body.name.trim()
  }
  if (body.trigger_type !== undefined) {
    if (typeof body.trigger_type !== 'string' || !VALID_TRIGGER_TYPES.has(body.trigger_type)) {
      return fail(c, 'trigger_type must be one of: ROAS_DROP, SPEND_SPIKE, CONVERSION_DROP, SCALING_OPPORTUNITY', 400, {
        code: 'INVALID_FILTER',
        field: 'trigger_type',
      })
    }
    updates.trigger_type = body.trigger_type
  }
  if (body.min_confidence_threshold !== undefined) {
    const v = body.min_confidence_threshold
    if (
      typeof v !== 'number' ||
      !Number.isFinite(v) ||
      !Number.isInteger(v) ||
      v < 0 ||
      v > 100
    ) {
      return fail(c, 'min_confidence_threshold must be an integer between 0 and 100', 400, {
        code: 'INVALID_TYPE',
        field: 'min_confidence_threshold',
      })
    }
    updates.min_confidence_threshold = v
  }
  if (body.action_template_id !== undefined) {
    if (typeof body.action_template_id !== 'string' || !UUID_LIKE.test(body.action_template_id)) {
      return fail(c, 'action_template_id must be a valid UUID', 400, {
        code: 'INVALID_TYPE',
        field: 'action_template_id',
      })
    }
    updates.action_template_id = body.action_template_id
  }
  if (body.action_params !== undefined) {
    if (
      typeof body.action_params !== 'object' ||
      body.action_params === null ||
      Array.isArray(body.action_params)
    ) {
      return fail(c, 'action_params must be a non-null object', 400, {
        code: 'INVALID_TYPE',
        field: 'action_params',
      })
    }
    updates.action_params = body.action_params
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') {
      return fail(c, 'enabled must be a boolean', 400, { code: 'INVALID_TYPE', field: 'enabled' })
    }
    updates.enabled = body.enabled
  }

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)
    .select(
      'id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count, last_fired_at, created_at, updated_at',
    )
    .maybeSingle()

  if (error) {
    throw new Error(`automation rule update failed: ${error.message}`)
  }
  if (!data) {
    return fail(c, 'Rule not found', 404, { code: 'NOT_FOUND' })
  }
  return ok(c, data)
})

// ─── DELETE /rules/:id ────────────────────────────────────────────────
automationRouter.delete('/rules/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid rule id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  const { error, count } = await supabaseAdmin
    .from('automation_rules')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) {
    throw new Error(`automation rule delete failed: ${error.message}`)
  }
  if ((count ?? 0) === 0) {
    return fail(c, 'Rule not found', 404, { code: 'NOT_FOUND' })
  }
  return ok(c, { deleted: true })
})

// ─── POST /rules/:id/execute  (manual rule fire) ──────────────────────
//
// Phase 4 Part 2 manual-execution path. Auto-firing on the AI decision
// stream is governance-deferred (see services/execution/automation-engine.ts
// header). This endpoint lets admins/operators fire a rule on demand,
// optionally linked to a specific ai_decisions row for confidence and
// explanation carry-over.
//
// Body:
//   { ai_decision_id?: <UUID> }   // optional; carries explanation/confidence
//
// Idempotency, parameter validation, integration check, rate limiting
// (per-org, per-minute), and audit-row insertion are all enforced
// downstream by executeAction inside automation-engine.fireRule.
automationRouter.post('/rules/:id/execute', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')
  if (!UUID_LIKE.test(id)) {
    return fail(c, 'Invalid rule id format', 400, { code: 'INVALID_TYPE', field: 'id' })
  }

  let body: { ai_decision_id?: string } = {}
  // Body is OPTIONAL for this endpoint — empty body is a valid manual fire.
  try {
    const text = await c.req.text()
    if (text.trim().length > 0) {
      const parsed: unknown = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return fail(c, 'body must be a JSON object', 400, { code: 'INVALID_JSON' })
      }
      body = parsed as { ai_decision_id?: string }
    }
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  const aiDecisionId =
    typeof body.ai_decision_id === 'string' && body.ai_decision_id.length > 0
      ? body.ai_decision_id
      : undefined
  if (aiDecisionId !== undefined && !UUID_LIKE.test(aiDecisionId)) {
    return fail(c, 'ai_decision_id must be a valid UUID', 400, {
      code: 'INVALID_TYPE',
      field: 'ai_decision_id',
    })
  }

  try {
    const result = await executeRule(orgId, id, aiDecisionId)
    if (result.ruleNotFound) {
      return fail(c, 'Rule not found', 404, { code: 'NOT_FOUND' })
    }
    if (result.ruleDisabled) {
      return fail(c, 'Rule is disabled', 422, { code: 'RULE_DISABLED' })
    }
    return ok(c, {
      rules_fired: result.rulesFired,
      run_ids: result.runIds,
    }, 202)
  } catch (err) {
    const e = err as Error & { code?: string; field?: string; retryAfterSeconds?: number }
    if (e.code === 'NOT_FOUND') return fail(c, 'Action template not found', 404, { code: 'NOT_FOUND' })
    if (e.code === 'MISSING_PARAMETER') {
      return fail(c, e.message, 400, { code: 'MISSING_PARAMETER', field: e.field })
    }
    if (e.code === 'RATE_LIMITED') {
      return fail(c, e.message, 429, {
        code: 'RATE_LIMITED',
        retry_after_seconds: e.retryAfterSeconds ?? 60,
      })
    }
    // Internal/infrastructure error — let errorHandler sanitize + correlate.
    throw err
  }
})

// ─── GET /runs ────────────────────────────────────────────────────────
automationRouter.get('/runs', async (c) => {
  const orgId = c.get('orgId')
  const { status, rule_id } = c.req.query()

  if (status !== undefined && !VALID_RUN_STATUSES.has(status)) {
    return fail(
      c,
      `Invalid status filter: ${status}. Must be one of: pending, success, failed, skipped`,
      400,
      { code: 'INVALID_FILTER', field: 'status' },
    )
  }
  if (rule_id !== undefined && !UUID_LIKE.test(rule_id)) {
    return fail(c, 'Invalid rule_id filter', 400, {
      code: 'INVALID_TYPE',
      field: 'rule_id',
    })
  }

  const rawLimit = parseInt(c.req.query('limit') ?? '50', 10)
  const rawOffset = parseInt(c.req.query('offset') ?? '0', 10)
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), MAX_LIMIT)
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

  let query = supabaseAdmin
    .from('automation_runs')
    .select(
      'id, org_id, automation_rule_id, ai_decision_id, action_template_id, status, result_data, error_message, executed_at, automation_rules(name)',
      { count: 'exact' },
    )
    .eq('org_id', orgId)
    .order('executed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (rule_id) query = query.eq('automation_rule_id', rule_id)

  const { data, error, count } = await query
  if (error) {
    throw new Error(`automation runs list failed: ${error.message}`)
  }

  return ok(c, {
    runs: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
})
