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
import { executeRule, actionRequiresApproval } from '../../services/execution/automation-engine.js'

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

  // Continuation #102 (2026-05-12) — extended SELECT to include
  // `actions_library.action_type` so the server can compute the
  // `requires_approval` flag from the SAME centralized policy
  // (automation-engine.ts:actionRequiresApproval). Operator-facing
  // visibility for the #99 auto-fire gate: rule cards on
  // /actions/automation can render an "Approval required — manual fire
  // only" badge when this flag is true. Single source of truth — no FE
  // mirror of the action-type set is needed.
  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .select(
      'id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count, last_fired_at, created_at, updated_at, actions_library(platform, name, action_type)',
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`automation rules list failed: ${error.message}`)
  }

  // Compute `requires_approval` per-row from the central policy. Cast via
  // unknown because supabase-js types many-to-one nested-selects as arrays.
  type RuleRow = {
    actions_library?: { action_type?: string } | null
    [k: string]: unknown
  }
  const enriched = ((data ?? []) as unknown as RuleRow[]).map((r) => ({
    ...r,
    requires_approval: actionRequiresApproval(r.actions_library?.action_type),
  }))

  return ok(c, { rules: enriched, total: enriched.length })
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
  const { status, rule_id, ai_decision_id } = c.req.query()

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
  // Continuation #122 (2026-05-14) — Phase Ω stabilization.
  // Optional `?ai_decision_id=` filter mirrors the existing `?rule_id=`
  // pattern. Closes audit MEDIUM finding #4 — the AI Decision deep view
  // (`app/operator/ai/[decision_id]/page.tsx`) previously fetched 100
  // runs and filtered client-side, missing downstream effects on orgs
  // with >100 runs in window. With this filter, the page can request
  // only the runs that consumed a specific decision. UUID-gated.
  if (ai_decision_id !== undefined && !UUID_LIKE.test(ai_decision_id)) {
    return fail(c, 'Invalid ai_decision_id filter', 400, {
      code: 'INVALID_TYPE',
      field: 'ai_decision_id',
    })
  }

  const rawLimit = parseInt(c.req.query('limit') ?? '50', 10)
  const rawOffset = parseInt(c.req.query('offset') ?? '0', 10)
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), MAX_LIMIT)
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

  // Path F operator-visibility bridge (continuation #24, 2026-05-09):
  // PostgREST nested-select on the existing FK automation_runs.ai_decision_id
  // → ai_decisions(id) joins the categorical label that triggered each
  // auto-fired run. Service-role; org_id explicit-filter is the primary gate
  // (RLS defense-in-depth). Read-only column on a NULLABLE FK; runs that
  // were fired manually (no ai_decision_id) or against pre-Path-F decisions
  // (NULL category) yield ai_decisions=null / category=null respectively —
  // both render as "no category" in any consumer. No schema/index changes.
  //
  // Continuation #34 (2026-05-12) — confidence_score field added to the
  // same ai_decisions JOIN to close the confidence-display gap that was
  // explicitly tagged at #22 ("Confidence Score per entry would require
  // ai_decisions JOIN — separate hardening pass"). The JOIN was already
  // in place since #24; adding confidence_score is a single-token
  // extension. FE history page (#33 → #34) now displays both fields.
  //
  // Continuation #37 (2026-05-12) — reasoning_steps JSONB array added to
  // the same JOIN to close the Detailed Explanation panel gap explicitly
  // tagged at #22 ("Detailed Explanation mock — no per-run AI explanation
  // endpoint"). That deferral premise was already resolved by #24/#34:
  // the JOIN exists; the AI Output Contract guarantees reasoning_steps
  // on every persisted ai_decisions row (validated in aiValidator.ts).
  // Single-token extension; payload size is bounded by the validator
  // (Array<{step, insight}>). Manual-fired runs (ai_decision_id NULL)
  // and pre-contract decisions yield null → FE falls back to mock.
  //
  // Continuation #38 (2026-05-12) — actions_library(name, platform,
  // action_type) added as a sibling nested-select on the existing
  // automation_runs.action_template_id FK (NOT NULL per Phase 4 Part 2
  // migration — every run links to a concrete action template). Closes
  // the action-name visibility gap in the history feed: prior to #38,
  // the page showed only the rule name (which describes the trigger
  // logic) but never surfaced WHICH action template was actually
  // dispatched. Same single-token nested-select pattern as #24/#34/#37;
  // no schema change, no migration, no index change.
  let query = supabaseAdmin
    .from('automation_runs')
    .select(
      'id, org_id, automation_rule_id, ai_decision_id, action_template_id, status, result_data, error_message, executed_at, automation_rules(name), ai_decisions(category, confidence_score, reasoning_steps), actions_library(name, platform, action_type)',
      { count: 'exact' },
    )
    .eq('org_id', orgId)
    .order('executed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (rule_id) query = query.eq('automation_rule_id', rule_id)
  if (ai_decision_id) query = query.eq('ai_decision_id', ai_decision_id)

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

// ─── Continuation #119 (2026-05-14) — Phase β Layer 3 ─────────────────
// GET /api/v1/automation/recommendations
// per `specs/recommended-automations.md`.
//
// Additive read-only aggregate. Surfaces gaps: AI emits decisions in a
// category but the org has NO enabled rule whose trigger_type matches.
// Each recommendation carries a suggested action_template (from a static
// category→action map) plus the centralized requires_approval flag for
// display. Suggestion-only — no autonomous rule creation. Operators
// click-through to the existing Create Rule form (#111) with pre-fill.
//
// NO autonomous writes. NO orchestration changes. NO new tables.
// Org-scoped via `c.get('orgId')`. Categories below 3 decisions in the
// 30-day window are filtered out (noise floor).
//
// Category → action map is the SINGLE source of truth for "what action
// should fire on this category" at the recommendation layer. Approval
// determination delegates to the centralized policy
// (actionRequiresApproval), so the FE never mirrors the protected-action
// set.

const RECOMMENDATION_WINDOW_DAYS = 30
const RECOMMENDATION_MIN_COUNT = 3
const RECOMMENDATION_DEFAULT_THRESHOLD = 70

// Static map from AI category → suggested platform + action_type. Stays
// inside the backend so frontend can't drift. New categories surface here
// only when an actions_library template exists; the FK lookup below
// verifies the template is actually present in the org's catalog.
const CATEGORY_ACTION_SUGGESTIONS: Record<string, { platform: string; action_type: string; rule_name: string }> = {
  ROAS_DROP:           { platform: 'meta',   action_type: 'pause_campaign',   rule_name: 'Auto-pause on ROAS drop' },
  CONVERSION_DROP:     { platform: 'meta',   action_type: 'pause_campaign',   rule_name: 'Auto-pause on conversion drop' },
  SPEND_SPIKE:         { platform: 'meta',   action_type: 'decrease_budget',  rule_name: 'Auto-decrease budget on spend spike' },
  SCALING_OPPORTUNITY: { platform: 'meta',   action_type: 'increase_budget',  rule_name: 'Scale-up on opportunity (approval required)' },
}

automationRouter.get('/recommendations', async (c) => {
  const orgId = c.get('orgId')

  const cutoff = new Date(Date.now() - RECOMMENDATION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // 1. Pull recent AI decisions for the org — only the fields we need.
  //    category is the Path F nullable column; rows without it are
  //    ignored (cannot recommend without a categorical signal).
  const { data: decisions, error: decisionsErr } = await supabaseAdmin
    .from('ai_decisions')
    .select('category, confidence_score')
    .eq('org_id', orgId)
    .not('category', 'is', null)
    .gte('created_at', cutoff)
    .limit(1000)

  if (decisionsErr) {
    throw new Error(`recommendations: ai_decisions aggregate failed: ${decisionsErr.message}`)
  }

  // 2. Pull enabled rules' trigger_types — we recommend only for
  //    categories with NO enabled rule already.
  const { data: rules, error: rulesErr } = await supabaseAdmin
    .from('automation_rules')
    .select('trigger_type')
    .eq('org_id', orgId)
    .eq('enabled', true)

  if (rulesErr) {
    throw new Error(`recommendations: rules aggregate failed: ${rulesErr.message}`)
  }

  const coveredCategories = new Set<string>((rules ?? []).map((r) => r.trigger_type as string))

  // 3. Bucket decisions by category and compute counts + avg confidence.
  type Agg = { count: number; confSum: number }
  const byCategory = new Map<string, Agg>()
  for (const d of decisions ?? []) {
    const cat = d.category as string | null
    if (!cat) continue
    const conf = typeof d.confidence_score === 'number' ? d.confidence_score : Number(d.confidence_score)
    const existing = byCategory.get(cat) ?? { count: 0, confSum: 0 }
    existing.count += 1
    if (Number.isFinite(conf)) existing.confSum += conf
    byCategory.set(cat, existing)
  }

  // 4. Build candidate recommendations. For each uncovered category
  //    with count >= floor, look up the suggested action_template row
  //    from actions_library so the FE can pre-fill the Create form.
  const recommendations: Array<{
    category: string
    decision_count_30d: number
    avg_confidence: number
    suggested_action_template_id: string
    suggested_action_name: string
    suggested_action_type: string
    suggested_platform: string
    requires_approval: boolean
    suggested_min_confidence_threshold: number
    suggested_rule_name: string
    rationale: string
  }> = []

  for (const [category, agg] of byCategory.entries()) {
    if (coveredCategories.has(category)) continue
    if (agg.count < RECOMMENDATION_MIN_COUNT) continue
    const suggestion = CATEGORY_ACTION_SUGGESTIONS[category]
    if (!suggestion) continue // category outside our suggestion map — skip

    // Look up the template id (system-global; no org_id filter).
    const { data: template, error: templateErr } = await supabaseAdmin
      .from('actions_library')
      .select('id, name, platform, action_type')
      .eq('platform', suggestion.platform)
      .eq('action_type', suggestion.action_type)
      .maybeSingle()

    if (templateErr) {
      throw new Error(`recommendations: actions_library lookup failed: ${templateErr.message}`)
    }
    if (!template) {
      // Template not seeded — skip silently. Operator can still create
      // the rule manually via the Create form once the template is added.
      continue
    }

    const fullActionType = `${template.platform}.${template.action_type}`
    const avgConfidence = agg.count > 0 ? Math.round((agg.confSum / agg.count) * 100) / 100 : 0

    recommendations.push({
      category,
      decision_count_30d: agg.count,
      avg_confidence: avgConfidence,
      suggested_action_template_id: template.id as string,
      suggested_action_name: template.name as string,
      suggested_action_type: fullActionType,
      suggested_platform: template.platform as string,
      requires_approval: actionRequiresApproval(fullActionType),
      suggested_min_confidence_threshold: RECOMMENDATION_DEFAULT_THRESHOLD,
      suggested_rule_name: suggestion.rule_name,
      rationale: `${agg.count} ${category} decision${agg.count === 1 ? '' : 's'} in ${RECOMMENDATION_WINDOW_DAYS}d with no matching rule`,
    })
  }

  // Sort by count DESC so highest-signal recommendations are first.
  recommendations.sort((a, b) => b.decision_count_30d - a.decision_count_30d)

  return ok(c, {
    recommendations,
    total: recommendations.length,
    window_days: RECOMMENDATION_WINDOW_DAYS,
    min_count: RECOMMENDATION_MIN_COUNT,
  })
})
