/**
 * Phase 4 Part 2 — Automation Engine
 *
 * Authority chain:
 *   - specs/SYSTEM_CONTROL.md → Phase 4 Part 2 unlock authorized 2026-05-07
 *   - specs/004-execution-layer/spec.md → automation user stories US3+US4
 *   - specs/004-execution-layer/data-model.md → automation_rules / automation_runs
 *   - CANONICAL AI SYSTEM resolution → ai_decisions, NOT legacy decisions
 *
 * What this module does:
 *   1. evaluateRulesForAIDecision(orgId, aiDecisionId) — given a single
 *      ai_decisions row, find enabled automation_rules whose
 *      min_confidence_threshold is met (NUMERIC 0–1 in ai_decisions vs
 *      INTEGER 0–100 in automation_rules) and whose trigger_type
 *      matches the AI decision's `result.category` field. For each
 *      match, dispatch executeAction with the rule's action_params,
 *      then write automation_runs + decision_history rows linked via
 *      automation_rule_id / automation_run_id (Phase 4 Part 2 columns).
 *
 *   2. executeRule(orgId, ruleId, aiDecisionId?) — admin/manual rule
 *      execution endpoint. Fires a single rule directly, with an
 *      optional AI-decision linkage for explanation/confidence carry-over.
 *
 *   3. dispatchAutomation(orgId, runId) — LEGACY shim retained for spec
 *      conformance. The Phase 3 anomaly engine (`decision_runs` cycles)
 *      is DEPRECATED+DEFERRED, so runId-based dispatch has no production
 *      caller today. The function returns 0 immediately and emits an
 *      [automation] dormant log line. Future Phase 3 anomaly unlock can
 *      restore the cycle-driven path; until then evaluateRulesForAIDecision
 *      + executeRule are the canonical entry points.
 *
 * GOVERNANCE-DEFERRED:
 *   - Auto-firing on every ai_decisions INSERT (post-persist hook in
 *     services/ai/execute-ai-decision.ts) requires extending the closed
 *     Phase 3 linear pipeline. That hook is NOT installed by this file
 *     to preserve the closed-slice immutability. When governance
 *     authorizes the hook, a single line addition in execute-ai-decision.ts
 *     calling `evaluateRulesForAIDecision(org_id, decision_id)` after
 *     `persistAIDecision` is the only required change.
 */

import { supabaseAdmin } from '../../lib/supabase.js'
import { executeAction } from './action-executor.js'

// ─── Types ────────────────────────────────────────────────────────────

interface AutomationRuleRow {
  id: string
  org_id: string
  name: string
  trigger_type: string
  min_confidence_threshold: number
  action_template_id: string
  action_params: Record<string, unknown>
  enabled: boolean
  run_count: number
}

interface AIDecisionRow {
  id: string
  org_id: string
  type: string
  result: unknown
  confidence_score: number
  status: string
  reasoning_steps: unknown
  trace_id: string
}

export interface RuleEvaluationResult {
  rulesFired: number
  runIds: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Compare an AI decision's confidence (NUMERIC 0–1) against a rule's
 * threshold (INTEGER 0–100). Returns true if the decision meets the bar.
 */
function meetsConfidenceThreshold(
  aiConfidence: number,
  rulePercent: number,
): boolean {
  return aiConfidence * 100 >= rulePercent
}

/**
 * Extract the categorical label from an ai_decision.result. The AI
 * Output Contract permits `result` to be any JSON value; by convention
 * we look for `result.category` as the string label that maps to
 * automation_rules.trigger_type. If absent, returns null and the
 * decision will not match any categorical trigger.
 */
function extractCategory(result: unknown): string | null {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const cat = (result as { category?: unknown }).category
    if (typeof cat === 'string' && cat.length > 0) return cat
  }
  return null
}

/**
 * Resolve `'auto'` placeholder values in rule.action_params from the
 * AI decision context. Currently supports `campaign_id: 'auto'` →
 * decision.result.campaign_id. Other 'auto' fields pass through
 * untouched (caller must specify them concretely).
 */
function resolveAutoParams(
  ruleParams: Record<string, unknown>,
  aiDecision: AIDecisionRow | null,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = { ...ruleParams }
  if (resolved.campaign_id === 'auto' && aiDecision) {
    const r = aiDecision.result
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      const cid = (r as { campaign_id?: unknown }).campaign_id
      if (typeof cid === 'string' || typeof cid === 'number') {
        resolved.campaign_id = String(cid)
      }
    }
  }
  return resolved
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Evaluate all enabled automation rules for `orgId` against a single
 * AI decision and execute every match. Caller must pass a real
 * ai_decisions.id; cross-org IDs are filtered by RLS + the explicit
 * org_id check below.
 *
 * Returns the count of rules fired and the list of automation_runs.id
 * values written.
 *
 * Errors from individual handler dispatch are caught per-rule: the rule
 * still records an `automation_runs` entry with `status='failed'` and
 * `error_message`, and the loop continues to the next rule.
 */
export async function evaluateRulesForAIDecision(
  orgId: string,
  aiDecisionId: string,
): Promise<RuleEvaluationResult> {
  // 1. Fetch the AI decision (org-scoped lookup).
  const { data: aiDecision, error: aiErr } = await supabaseAdmin
    .from('ai_decisions')
    .select('id, org_id, type, result, confidence_score, status, reasoning_steps, trace_id')
    .eq('id', aiDecisionId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (aiErr) {
    throw new Error(`automation: ai_decisions lookup failed: ${aiErr.message}`)
  }
  if (!aiDecision) {
    return { rulesFired: 0, runIds: [] }
  }
  const decision = aiDecision as AIDecisionRow

  const category = extractCategory(decision.result)

  // 2. Fetch enabled rules for org.
  const { data: rules, error: rulesErr } = await supabaseAdmin
    .from('automation_rules')
    .select('id, org_id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count')
    .eq('org_id', orgId)
    .eq('enabled', true)

  if (rulesErr) {
    throw new Error(`automation: rules lookup failed: ${rulesErr.message}`)
  }
  if (!rules || rules.length === 0) {
    return { rulesFired: 0, runIds: [] }
  }

  let rulesFired = 0
  const runIds: string[] = []

  for (const rawRule of rules as AutomationRuleRow[]) {
    // Trigger-type match: rule.trigger_type vs decision result.category.
    // If decision has no category (governance-deferred AI Output Contract
    // extension), no rule auto-fires categorically.
    if (category === null || rawRule.trigger_type !== category) continue

    // Confidence gate.
    if (!meetsConfidenceThreshold(decision.confidence_score, rawRule.min_confidence_threshold)) continue

    const result = await fireRule(orgId, rawRule, decision)
    if (result.runId) runIds.push(result.runId)
    if (result.fired) rulesFired += 1
  }

  return { rulesFired, runIds }
}

/**
 * Manual rule execution. Used by `POST /automation/rules/:id/execute`
 * (admin endpoint). Fires a single rule on demand, optionally linked
 * to a specific ai_decision for explanation/confidence carry-over.
 */
export async function executeRule(
  orgId: string,
  ruleId: string,
  aiDecisionId?: string,
): Promise<RuleEvaluationResult & { ruleNotFound?: true; ruleDisabled?: true }> {
  const { data: rule, error: ruleErr } = await supabaseAdmin
    .from('automation_rules')
    .select('id, org_id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count')
    .eq('id', ruleId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (ruleErr) {
    throw new Error(`automation: rule lookup failed: ${ruleErr.message}`)
  }
  if (!rule) {
    return { rulesFired: 0, runIds: [], ruleNotFound: true }
  }
  if (!(rule as AutomationRuleRow).enabled) {
    return { rulesFired: 0, runIds: [], ruleDisabled: true }
  }

  let aiDecision: AIDecisionRow | null = null
  if (aiDecisionId) {
    const { data: dec, error: decErr } = await supabaseAdmin
      .from('ai_decisions')
      .select('id, org_id, type, result, confidence_score, status, reasoning_steps, trace_id')
      .eq('id', aiDecisionId)
      .eq('org_id', orgId)
      .maybeSingle()
    if (decErr) {
      throw new Error(`automation: ai_decisions lookup failed: ${decErr.message}`)
    }
    if (dec) aiDecision = dec as AIDecisionRow
    // If the caller passed an aiDecisionId that doesn't belong to this org
    // we silently treat the manual execution as decision-less — same RLS
    // enforcement pattern as executeAction's optional aiDecisionId lookup.
  }

  const result = await fireRule(orgId, rule as AutomationRuleRow, aiDecision)
  return {
    rulesFired: result.fired ? 1 : 0,
    runIds: result.runId ? [result.runId] : [],
  }
}

/**
 * Legacy spec-conformance shim. Phase 3 anomaly engine (`decision_runs`
 * cycle-driven dispatch) is DEPRECATED+DEFERRED — there is no production
 * caller of this signature today. Returns 0 immediately and logs once
 * for operator visibility. Kept exported so any prior caller that imports
 * this name does not break.
 */
export async function dispatchAutomation(
  orgId: string,
  runId: string,
): Promise<number> {
  // eslint-disable-next-line no-console
  console.log(
    `[automation] dispatchAutomation(orgId=${orgId}, runId=${runId}) is dormant — Phase 3 anomaly engine deferred; use evaluateRulesForAIDecision or executeRule instead`,
  )
  return 0
}

// ─── Internal: per-rule dispatch + audit writes ───────────────────────

interface FireResult {
  fired: boolean
  runId: string | null
}

async function fireRule(
  orgId: string,
  rule: AutomationRuleRow,
  aiDecision: AIDecisionRow | null,
): Promise<FireResult> {
  const resolvedParams = resolveAutoParams(rule.action_params, aiDecision)

  // Insert pending automation_runs row up front so we have a runId to
  // thread into the decision_history insert below.
  const { data: pendingRun, error: insertErr } = await supabaseAdmin
    .from('automation_runs')
    .insert({
      org_id:             orgId,
      automation_rule_id: rule.id,
      ai_decision_id:     aiDecision?.id ?? null,
      action_template_id: rule.action_template_id,
      status:             'pending',
      result_data:        null,
      error_message:      null,
    })
    .select('id')
    .single()

  if (insertErr || !pendingRun) {
    // Could not even record the run — fail fast and let the caller surface.
    throw new Error(`automation: automation_runs insert failed: ${insertErr?.message ?? 'no row'}`)
  }
  const runId = pendingRun.id as string

  // Dispatch to executeAction. Idempotency, parameter validation,
  // template lookup, integration check, and decision_history insert
  // (with our automation_rule_id + automation_run_id linkage threaded
  // through `automationContext`) all happen inside executeAction.
  let status: 'success' | 'failed' = 'success'
  let resultData: Record<string, unknown> = {}
  let errorMessage: string | null = null

  try {
    const exec = await executeAction({
      templateId:        rule.action_template_id,
      params:            resolvedParams,
      orgId,
      executedBy:        'automation',
      aiDecisionId:      aiDecision?.id,
      automationRuleId:  rule.id,
      automationRunId:   runId,
    })
    resultData = exec.resultData
  } catch (err) {
    status = 'failed'
    const e = err as Error & { code?: string; field?: string }
    errorMessage = e.code
      ? `${e.code}${e.field ? `:${e.field}` : ''} — ${e.message}`
      : (e.message ?? 'unknown error')
  }

  // Update the run row with terminal status + result_data.
  const { error: updateErr } = await supabaseAdmin
    .from('automation_runs')
    .update({
      status,
      result_data:   resultData,
      error_message: errorMessage,
      executed_at:   new Date().toISOString(),
    })
    .eq('id', runId)
  if (updateErr) {
    // Log + continue; the run row exists with terminal state pending.
    // eslint-disable-next-line no-console
    console.error(`[automation] automation_runs update failed run_id=${runId}: ${updateErr.message}`)
  }

  // Bump rule counters.
  const { error: bumpErr } = await supabaseAdmin
    .from('automation_rules')
    .update({
      run_count:     rule.run_count + 1,
      last_fired_at: new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    })
    .eq('id', rule.id)
    .eq('org_id', orgId)
  if (bumpErr) {
    // eslint-disable-next-line no-console
    console.error(`[automation] automation_rules counter bump failed rule_id=${rule.id}: ${bumpErr.message}`)
  }

  return { fired: true, runId }
}
