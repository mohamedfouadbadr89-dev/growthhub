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

// ─── Continuation #99 (2026-05-12) — APPROVAL-PATH ENFORCEMENT ──────────
//
// Centralized execution-policy enforcement per the PRIORITY SAFETY
// ENFORCEMENT OVERRIDE: "Spend-increasing or launch-capable actions MUST
// NOT auto-fire without approval-path enforcement." Manual fire via
// `executeRule` (POST /automation/rules/:id/execute) is the implicit
// approval path — an operator must explicitly trigger the rule.
//
// This constant centralizes the policy in ONE place (vs distributed
// conditional logic per the override). The set lists action_types
// classified as spend-increasing (Meta increase_budget) or launch-capable
// (campaign CREATE on either platform). Pause / decrease_budget /
// send_alert_email are SAFE (spend-reducing or informational); they
// remain free to auto-fire.
//
// Set contents derived from actions_library template seeds:
//   - meta.pause_campaign       SAFE  (reducing-spend)
//   - meta.decrease_budget      SAFE  (reducing-spend)
//   - meta.increase_budget      RESTRICTED (spend-increasing)
//   - send_alert_email          SAFE  (informational)
//   - google.pause_campaign     SAFE  (reducing-spend)
//   - meta.create_campaign      RESTRICTED (launch-capable)
//   - google.create_campaign    RESTRICTED (launch-capable)
//
// When an auto-fire path encounters a rule pointing at a RESTRICTED
// template, the rule is SKIPPED at the evaluator (no automation_runs
// row inserted, no executeAction call). The operator can still trigger
// the same rule manually via POST /automation/rules/:id/execute —
// which goes through `executeRule` (NOT through this gate). Manual
// invocation is the approval-path enforcement.
//
// Future expansion: when an approvals schema lands (approvals table /
// requires_approval column on actions_library), this constant migrates
// to a runtime DB query against actions_library.requires_approval. The
// gate position stays identical — only the source of truth changes.
const SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES = new Set<string>([
  'meta.increase_budget',
  'meta.create_campaign',
  'google.create_campaign',
])

// Continuation #102 (2026-05-12) — exported policy check for cross-module
// reuse. The auto-fire gate (#99) consumes this internally; route handlers
// import it to compute a `requires_approval` flag for operator-facing
// list responses (avoids drift between BE policy + FE display). Single
// source of truth for the approval classification.
export function actionRequiresApproval(actionType: string | null | undefined): boolean {
  return typeof actionType === 'string' && SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES.has(actionType)
}

// Continuation #121 (2026-05-14) — Phase δ governance dashboard.
// Read-only snapshot of the protected action-type set, exported as a
// sorted string[] for operator-facing surfaces. The Set above remains
// the SOLE policy authority; this is a defensive view (caller cannot
// mutate the Set through this snapshot). The governance summary endpoint
// surfaces this list as `approval_policy.protected_action_types` so
// operators can audit policy state without grepping source.
export const SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES_SNAPSHOT: readonly string[] =
  Object.freeze(Array.from(SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES).sort())

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
  /**
   * Path F (2026-05-09) — top-level category column added in
   * 20260509130000_phase3_ai_decisions_category.sql. NULL for any row
   * persisted before Path F or by an AI response that omitted category;
   * the extractCategory fallback shim handles those cases.
   */
  category: string | null
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
 * Path F (2026-05-09) — Hybrid category resolver.
 *
 * Reads the categorical label that maps to `automation_rules.trigger_type`
 * with two-stage fallback:
 *
 *   1. Top-level `ai_decisions.category` column (added by
 *      20260509130000_phase3_ai_decisions_category.sql; populated by
 *      persistence.ts when validator accepts the optional top-level field).
 *      This is the preferred surface — column-level, indexable, no JSONB
 *      traversal, validator-trimmed.
 *
 *   2. Legacy `result.category` JSONB path. Preserved verbatim from the
 *      pre-Path-F shape so any AI response that emits category INSIDE
 *      result (rather than at the top level) still triggers rules. Also
 *      covers historical ai_decisions rows where the column is NULL but
 *      the producer happened to embed a category in result.
 *
 * Returns null when neither surface yields a non-empty string. The
 * automation-engine treats null as "no categorical trigger" — no rule
 * auto-fires for that decision (intentional safety property; preserves
 * dormant-by-default behavior pre-prompt-tuning rollout).
 */
function extractCategory(
  decision: Pick<AIDecisionRow, 'category' | 'result'>,
): string | null {
  // Stage 1: top-level column.
  if (typeof decision.category === 'string' && decision.category.length > 0) {
    return decision.category
  }
  // Stage 2: legacy result.category JSONB path (fallback shim).
  const result = decision.result
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
    .select('id, org_id, type, result, confidence_score, status, reasoning_steps, trace_id, category')
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

  const category = extractCategory(decision)

  // 2. Fetch enabled rules for org. Continuation #99: extended SELECT
  // with `actions_library(action_type)` nested-select so the auto-fire
  // gate below can read the action_type classification without an
  // extra round-trip. Same PostgREST nested-select pattern as #38
  // (automation_runs ↔ actions_library) — non-null FK guarantees the
  // join row is always present for legitimate rules.
  const { data: rules, error: rulesErr } = await supabaseAdmin
    .from('automation_rules')
    .select('id, org_id, name, trigger_type, min_confidence_threshold, action_template_id, action_params, enabled, run_count, actions_library(action_type)')
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

  // supabase-js types infer the nested-select as `{action_type:any}[]` even
  // for many-to-one FKs (PostgREST actually returns a single object). Cast
  // via `unknown` to assert the runtime shape.
  for (const rawRule of rules as unknown as Array<AutomationRuleRow & { actions_library?: { action_type: string } | null }>) {
    // Trigger-type match: rule.trigger_type vs decision result.category.
    // If decision has no category (governance-deferred AI Output Contract
    // extension), no rule auto-fires categorically.
    if (category === null || rawRule.trigger_type !== category) continue

    // Confidence gate.
    if (!meetsConfidenceThreshold(decision.confidence_score, rawRule.min_confidence_threshold)) continue

    // Continuation #99 — APPROVAL-PATH ENFORCEMENT GATE.
    // Spend-increasing (meta.increase_budget) and launch-capable
    // (meta.create_campaign / google.create_campaign) actions MUST NOT
    // auto-fire on the AI-decision stream. The operator must trigger
    // these manually via POST /automation/rules/:id/execute, which is
    // the implicit approval path. Skip the rule here — do NOT insert an
    // automation_runs row, do NOT call executeAction. Log the skip so
    // operators can grep for [automation] auto_fire_blocked and find
    // exactly which rules would have fired but were gated.
    const actionType = rawRule.actions_library?.action_type
    if (actionRequiresApproval(actionType)) {
      // eslint-disable-next-line no-console
      console.info(
        `[automation] auto_fire_blocked org_id=${orgId} rule_id=${rawRule.id} action_type=${actionType} ` +
        `ai_decision_id=${decision.id} reason=approval_required ` +
        `(spend-increasing or launch-capable; operator must trigger via POST /automation/rules/:id/execute)`,
      )

      // Continuation #120 (2026-05-14) — Phase γ Layer 7 (Approval
      // Intelligence) per `specs/approval-intelligence.md`. Persist the
      // skip as an audit-visible automation_runs row so operators have a
      // queue to review. Approval policy code path UNCHANGED — this is
      // an ADDITIVE write beside the existing console log + continue.
      //
      // Safety invariants preserved:
      //   - `automation_runs.status='skipped'` is ALREADY in the CHECK
      //     enum (migration 20260507130000:92) — NO schema change.
      //   - `decision_history` is NOT written here — executor remains
      //     single-writer. (SKIP path doesn't execute, doesn't audit.)
      //   - `result_data` is freely-shaped JSONB; adds structured
      //     `skip_reason`, `action_type`, `skipped_at` metadata.
      //   - Dedupe: this branch runs BEFORE the main dedupe block at
      //     line 298+, so we add an inline dedupe check here (same
      //     query shape) to prevent duplicate skip rows on Inngest
      //     retries. Best-effort — if the dedupe query OR the insert
      //     fails, we log + continue (the SKIP behavior is preserved;
      //     only the audit-visibility row is lost, console line stays).
      //   - No real provider call is made (executor never invoked).
      //   - actionRequiresApproval() remains the SOLE policy authority.
      try {
        const { data: existingSkipRows, error: existingErr } = await supabaseAdmin
          .from('automation_runs')
          .select('id')
          .eq('org_id', orgId)
          .eq('automation_rule_id', rawRule.id)
          .eq('ai_decision_id', decision.id)
          .limit(1)

        if (existingErr) {
          console.error(
            `[automation] skip_dedupe_lookup_failed org_id=${orgId} rule_id=${rawRule.id}: ${existingErr.message}`,
          )
        } else if (!existingSkipRows || existingSkipRows.length === 0) {
          const { error: skipInsertErr } = await supabaseAdmin
            .from('automation_runs')
            .insert({
              org_id: orgId,
              automation_rule_id: rawRule.id,
              ai_decision_id: decision.id,
              action_template_id: rawRule.action_template_id,
              status: 'skipped',
              result_data: {
                trigger_source: 'auto_fire',
                skip_reason: 'approval_required',
                action_type: actionType,
                skipped_at: new Date().toISOString(),
              },
              executed_at: new Date().toISOString(),
            })
          if (skipInsertErr) {
            console.error(
              `[automation] skip_persist_failed org_id=${orgId} rule_id=${rawRule.id}: ${skipInsertErr.message}`,
            )
          }
        }
      } catch (persistErr) {
        // Defensive — never let an audit-trail persistence error abort
        // the rule evaluation loop. Console line above is the fallback
        // record (operator-greppable via PM2/journald).
        console.error(`[automation] skip_persist_exception:`, persistErr)
      }

      continue
    }

    // Continuation #100 (2026-05-12) — AUTO-FIRE DISPATCH DEDUPE GATE.
    // Per PRIORITY SAFETY ENFORCEMENT OVERRIDE item #4 ("approval dispatch
    // idempotency/dedupe"). Pre-fix: if `evaluateRulesForAIDecision` is
    // called twice for the same `aiDecisionId` (Inngest retry of the
    // post-persist hook, concurrent webhook delivery, manual re-trigger
    // for testing), each call would INSERT a fresh `automation_runs` row
    // and dispatch a fresh `executeAction` call — duplicating the side
    // effect on the underlying ad platform.
    //
    // The existing `decision_history (org_id, execution_id)` partial
    // unique index protects against decision_history duplicates IF the
    // caller supplies an idempotency key, but the auto-fire path doesn't
    // synthesize one — so each retry creates a new decision_history row
    // too. The Phase 4 idempotency invariant (no double-write to
    // `decision_history`) holds only because each automation_runs.id
    // becomes a fresh execution_id; that doesn't prevent the duplicate
    // side effect itself.
    //
    // Application-level dedupe at the gate position: BEFORE inserting
    // automation_runs, check if a row already exists for
    // `(automation_rule_id, ai_decision_id)`. If yes, skip — that AI
    // decision already triggered this rule once. Log the skip.
    //
    // Why no schema-level unique constraint: ai_decision_id is NULLABLE
    // on automation_runs (manual fires via executeRule pass aiDecisionId
    // optionally), and PostgreSQL unique constraints treat NULLs as
    // distinct — so a multi-column unique on (automation_rule_id,
    // ai_decision_id) would not enforce uniqueness when ai_decision_id
    // is NULL. A schema-level partial unique index could work, but
    // schema changes are out of scope for this minimal-diff
    // continuation. Application-level check is sufficient for the
    // current single-writer architecture (this is the only writer to
    // automation_runs).
    //
    // Manual fire path via `executeRule` is INTENTIONALLY unaffected —
    // operator-triggered re-execution is the implicit re-approval.
    {
      // Continuation #101 (2026-05-12) — use `.limit(1)` array select
      // instead of `.maybeSingle()` for backfill robustness. Pre-#100
      // duplicates may exist in the DB (from runs prior to the dedupe
      // gate landing); .maybeSingle() throws PGRST116 on 2+ rows, which
      // would convert the dedupe check itself into a 500 — defeating
      // its purpose. The array-length check still answers the correct
      // question ("has this rule+decision pair already fired?") even
      // when pre-existing duplicates are present, and returns the most
      // recent existing run for the audit log.
      const { data: existingRuns, error: existingErr } = await supabaseAdmin
        .from('automation_runs')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('automation_rule_id', rawRule.id)
        .eq('ai_decision_id', decision.id)
        .order('executed_at', { ascending: false, nullsFirst: false })
        .limit(1)

      if (existingErr) {
        // Throw → caller's errorHandler emits sanitized 500 + request_id
        // (per CONSTITUTION §3 "Fail Loudly").
        throw new Error(`automation: auto-fire dedupe lookup failed: ${existingErr.message}`)
      }

      if (existingRuns && existingRuns.length > 0) {
        const existingRun = existingRuns[0]
        // eslint-disable-next-line no-console
        console.info(
          `[automation] auto_fire_dedupe_skip org_id=${orgId} rule_id=${rawRule.id} ` +
          `ai_decision_id=${decision.id} existing_run_id=${existingRun.id} existing_status=${existingRun.status} ` +
          `reason=already_fired (same rule+decision pair already triggered; preventing duplicate side effect)`,
        )
        continue
      }
    }

    // Continuation #103 — explicit 'auto_fire' trigger source for audit.
    const result = await fireRule(orgId, rawRule, decision, 'auto_fire')
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
      .select('id, org_id, type, result, confidence_score, status, reasoning_steps, trace_id, category')
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

  // Continuation #103 — explicit 'manual_rule_fire' trigger source for
  // audit. This is the operator-approved fire path (POST /rules/:id/
  // execute), exempt from #99 auto-fire approval gate but recorded
  // distinctly in result_data so reviewers can see which restricted-
  // action fires were operator-triggered vs which auto-fired.
  const result = await fireRule(orgId, rule as AutomationRuleRow, aiDecision, 'manual_rule_fire')
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

// Continuation #103 (2026-05-12) — `triggerSource` discriminator for
// audit-trail clarity. The Phase 4 decision_history.executed_by CHECK
// constraint is `('manual', 'automation')` only, so both auto-fires
// (from evaluateRulesForAIDecision via post-persist hook) and operator-
// triggered manual rule fires (from executeRule via POST /rules/:id/
// execute) record as `executed_by='automation'` — the manual operator
// invocation is invisible at the audit row level. Threading
// triggerSource into result_data (JSONB, no schema change) restores
// the distinction without altering the CHECK constraint. Operators
// can grep result_data->trigger_source on automation_runs / decision_
// history to separate operator-approved restricted-action fires from
// auto-fires of safe actions. Crucial when reviewing the audit trail
// for accountability of approval-required actions (#102).
type AutomationTriggerSource = 'auto_fire' | 'manual_rule_fire'

async function fireRule(
  orgId: string,
  rule: AutomationRuleRow,
  aiDecision: AIDecisionRow | null,
  triggerSource: AutomationTriggerSource = 'auto_fire',
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
    // Continuation #103 — merge triggerSource into result_data for audit.
    // Preserves all keys executeAction wrote (mode/stage/http_status/etc.)
    // and adds trigger_source for distinction between auto-fires of safe
    // actions and operator-triggered manual fires (including of approval-
    // required actions per #99/#102).
    resultData = { ...exec.resultData, trigger_source: triggerSource }
  } catch (err) {
    status = 'failed'
    const e = err as Error & { code?: string; field?: string }
    errorMessage = e.code
      ? `${e.code}${e.field ? `:${e.field}` : ''} — ${e.message}`
      : (e.message ?? 'unknown error')
    // Continuation #103 — preserve trigger_source even on failure so the
    // audit row still tells operators whether the failed fire was an
    // auto-fire attempt or an operator manual invocation.
    resultData = { ...resultData, trigger_source: triggerSource }
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
