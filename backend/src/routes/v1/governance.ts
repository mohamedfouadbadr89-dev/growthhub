/**
 * Continuation #121 (2026-05-14) — Phase δ Layer 8 (Governance Dashboard)
 * per `specs/governance-dashboard.md` and `specs/operator-intelligence.md`.
 *
 * READ-ONLY OBSERVABILITY ENDPOINT.
 *
 * Aggregates over EXISTING tables (automation_rules, automation_runs,
 * decision_history, ai_decisions) + EXISTING env-driven LIVE-flag matrix
 * + centralized approval policy. No new tables, no schema changes, no
 * mutations anywhere.
 *
 * Governance invariants preserved:
 *   - Org isolation: every query filters by c.get('orgId'); body
 *     org_id is never read.
 *   - Single-writer: this file performs zero writes.
 *   - Approval policy: surfaces the SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES
 *     set as data (operator-visible policy register); the policy
 *     authority remains `actionRequiresApproval()` in automation-engine.ts.
 *   - LIVE-flag governance: surfaces flag state + allowlist membership
 *     ONLY. NEVER exposes secret values (META_TEST_ACCESS_TOKEN,
 *     OAuth client secrets, OPENROUTER_API_KEY, etc.).
 *   - AI validator contract: read-only access to validated rows.
 *   - Audit trail: zero new audit writes; reads from immutable ledgers.
 *
 * Pattern alignment: mirrors the canonical envelope + error-handler
 * triple-sink + UUID/INVALID_FILTER gating used across routes/v1/*.
 */

import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { ok } from '../../utils/response.js'
import {
  actionRequiresApproval,
  SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES_SNAPSHOT,
} from '../../services/execution/automation-engine.js'

type Variables = { userId: string; orgId: string; requestId: string }

export const governanceRouter = new Hono<{ Variables: Variables }>()

// Snapshot windows. Both serve different operator concerns:
//   - 7d: "what's the trend"
//   - 24h: "what's hot right now"
const WINDOW_7D_MS  = 7  * 24 * 60 * 60 * 1000
const WINDOW_24H_MS = 1  * 24 * 60 * 60 * 1000

// Env-driven flag matrix. Reads only known boolean LIVE flags + allowlist
// PRESENCE; the underlying credentials (META_TEST_ACCESS_TOKEN,
// GOOGLE_ADS_CLIENT_SECRET, RESEND_API_KEY, etc.) are NEVER serialized
// into the response — per CONSTITUTION §1.1 ("Never expose secrets").
//
// `allowlistConfigured` is computed from the allowlist env var presence
// (truthy non-empty string) without echoing the value itself — the value
// is a comma-separated list of org_ids, which is not strictly a secret
// but is operator-config we omit to keep the surface tight.
type ActionLiveFlag = {
  flag_env_var: string
  is_live: boolean
  allowlist_env_var: string | null
  allowlist_configured: boolean
}

function readLiveFlag(envVar: string): boolean {
  return process.env[envVar] === 'true'
}
function readAllowlistConfigured(envVar: string): boolean {
  const v = process.env[envVar]
  return typeof v === 'string' && v.trim().length > 0
}

// Static descriptor of the per-handler LIVE flags we surface. Mirrors the
// LIVE_FLAG_DEPENDENCIES array in backend/src/index.ts:115-132 (which
// performs the boot-time fail-fast). Read-only. Adding a new LIVE flag
// upstream means adding it here too — single-source still in index.ts;
// this is purely a display projection.
const LIVE_FLAG_MATRIX: Array<{
  action_type: string
  flag_env_var: string
  allowlist_env_var: string | null
}> = [
  { action_type: 'meta.pause_campaign',    flag_env_var: 'META_PAUSE_CAMPAIGN_LIVE',    allowlist_env_var: 'META_LIVE_ORG_ALLOWLIST'   },
  { action_type: 'meta.decrease_budget',   flag_env_var: 'META_DECREASE_BUDGET_LIVE',   allowlist_env_var: 'META_LIVE_ORG_ALLOWLIST'   },
  { action_type: 'meta.increase_budget',   flag_env_var: 'META_INCREASE_BUDGET_LIVE',   allowlist_env_var: 'META_LIVE_ORG_ALLOWLIST'   },
  { action_type: 'meta.create_campaign',   flag_env_var: 'META_CREATE_CAMPAIGN_LIVE',   allowlist_env_var: 'META_LIVE_ORG_ALLOWLIST'   },
  { action_type: 'google.pause_campaign',  flag_env_var: 'GOOGLE_PAUSE_CAMPAIGN_LIVE',  allowlist_env_var: 'GOOGLE_LIVE_ORG_ALLOWLIST' },
  { action_type: 'google.create_campaign', flag_env_var: 'GOOGLE_CREATE_CAMPAIGN_LIVE', allowlist_env_var: 'GOOGLE_LIVE_ORG_ALLOWLIST' },
  { action_type: 'send_alert_email',       flag_env_var: 'SEND_ALERT_EMAIL_LIVE',       allowlist_env_var: null                         },
]

// ─── GET /api/v1/governance/summary ───────────────────────────────────
// Aggregate read-only snapshot for the operator governance dashboard.
governanceRouter.get('/summary', async (c) => {
  const orgId = c.get('orgId')

  const sevenDaysAgo = new Date(Date.now() - WINDOW_7D_MS).toISOString()
  const oneDayAgo    = new Date(Date.now() - WINDOW_24H_MS).toISOString()

  // Parallelize the bounded fetch set. Each query is org-scoped and
  // returns only the columns we need (no SELECT *). Bounded LIMITs on
  // recent-rows queries keep payload small.
  const [
    rulesRes,
    runsRecentRes,
    historyRecentRes,
    aiDecisionsRecentRes,
    runsLast24hRes,
    historyLast24hRes,
  ] = await Promise.all([
    // 1. Rules: need full list (small N) to derive enabled/disabled +
    //    requires_approval breakdown (latter via centralized policy +
    //    actions_library JOIN).
    supabaseAdmin
      .from('automation_rules')
      .select('id, enabled, trigger_type, actions_library(action_type)')
      .eq('org_id', orgId)
      .limit(500),

    // 2. Runs last 7d — status + trigger_source + skip_reason aggregates.
    //    Plus action_template_id for top-action distribution.
    supabaseAdmin
      .from('automation_runs')
      .select('id, status, result_data, executed_at, actions_library(action_type)')
      .eq('org_id', orgId)
      .gte('executed_at', sevenDaysAgo)
      .limit(1000),

    // 3. Decision history last 7d — executed_by + idempotency replay flag.
    supabaseAdmin
      .from('decision_history')
      .select('id, executed_by, result, created_at')
      .eq('org_id', orgId)
      .gte('created_at', sevenDaysAgo)
      .limit(1000),

    // 4. AI decisions last 7d — category + confidence + status.
    supabaseAdmin
      .from('ai_decisions')
      .select('id, category, confidence_score, status, created_at')
      .eq('org_id', orgId)
      .gte('created_at', sevenDaysAgo)
      .limit(1000),

    // 5. Runs last 24h — for the rate-limit peak observation.
    supabaseAdmin
      .from('automation_runs')
      .select('id, executed_at')
      .eq('org_id', orgId)
      .gte('executed_at', oneDayAgo)
      .limit(2000),

    // 6. Decision history last 24h — also feeds rate-limit observation
    //    (manual /actions/:id/execute calls register here too).
    supabaseAdmin
      .from('decision_history')
      .select('id, created_at')
      .eq('org_id', orgId)
      .gte('created_at', oneDayAgo)
      .limit(2000),
  ])

  // Surface any DB error via the canonical errorHandler triple-sink.
  if (rulesRes.error)            throw new Error(`governance: rules lookup failed: ${rulesRes.error.message}`)
  if (runsRecentRes.error)       throw new Error(`governance: runs lookup failed: ${runsRecentRes.error.message}`)
  if (historyRecentRes.error)    throw new Error(`governance: history lookup failed: ${historyRecentRes.error.message}`)
  if (aiDecisionsRecentRes.error) throw new Error(`governance: ai_decisions lookup failed: ${aiDecisionsRecentRes.error.message}`)
  if (runsLast24hRes.error)      throw new Error(`governance: runs 24h lookup failed: ${runsLast24hRes.error.message}`)
  if (historyLast24hRes.error)   throw new Error(`governance: history 24h lookup failed: ${historyLast24hRes.error.message}`)

  type RuleRow = {
    enabled: boolean
    trigger_type: string
    actions_library?: { action_type?: string } | null
  }
  type RunRow = {
    status: string
    result_data: Record<string, unknown> | null
    executed_at: string | null
    actions_library?: { action_type?: string } | null
  }
  type HistoryRow = { executed_by: string; result: string; created_at: string }
  type AiDecisionRow = { category: string | null; confidence_score: number; status: string; created_at: string }

  const rules         = (rulesRes.data as unknown as RuleRow[]) ?? []
  const runsRecent    = (runsRecentRes.data as unknown as RunRow[]) ?? []
  const historyRecent = (historyRecentRes.data as unknown as HistoryRow[]) ?? []
  const aiRecent      = (aiDecisionsRecentRes.data as unknown as AiDecisionRow[]) ?? []
  const runsLast24h   = (runsLast24hRes.data as Array<{ executed_at: string | null }>) ?? []
  const historyLast24h = (historyLast24hRes.data as Array<{ created_at: string }>) ?? []

  // ─── Rules aggregates ────────────────────────────────────────────
  let rulesEnabled  = 0
  let rulesRequiresApproval = 0
  const triggerTypeCounts: Record<string, number> = {}
  for (const r of rules) {
    if (r.enabled) rulesEnabled += 1
    if (actionRequiresApproval(r.actions_library?.action_type)) rulesRequiresApproval += 1
    triggerTypeCounts[r.trigger_type] = (triggerTypeCounts[r.trigger_type] ?? 0) + 1
  }
  const rulesDisabled = rules.length - rulesEnabled

  // ─── Runs aggregates ─────────────────────────────────────────────
  const runsByStatus = { success: 0, failed: 0, skipped: 0, pending: 0 } as Record<string, number>
  let skippedApprovalRequired = 0
  let triggerAuto = 0
  let triggerManualRule = 0
  let idempotentReplays = 0
  const actionTypeCounts: Record<string, number> = {}
  for (const r of runsRecent) {
    runsByStatus[r.status] = (runsByStatus[r.status] ?? 0) + 1
    const meta = r.result_data ?? {}
    const skipReason = (meta as { skip_reason?: string }).skip_reason
    if (r.status === 'skipped' && skipReason === 'approval_required') {
      skippedApprovalRequired += 1
    }
    const triggerSource = (meta as { trigger_source?: string }).trigger_source
    if (triggerSource === 'auto_fire')        triggerAuto += 1
    if (triggerSource === 'manual_rule_fire') triggerManualRule += 1
    if ((meta as { idempotent_replay?: boolean }).idempotent_replay === true) idempotentReplays += 1
    const at = r.actions_library?.action_type
    if (at) actionTypeCounts[at] = (actionTypeCounts[at] ?? 0) + 1
  }
  const topActionTypes = Object.entries(actionTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([action_type, count]) => ({ action_type, count }))
  const topTriggerTypes = Object.entries(triggerTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([trigger_type, count]) => ({ trigger_type, count }))

  // ─── Audit aggregates ────────────────────────────────────────────
  let executedByManual = 0
  let executedByAutomation = 0
  for (const h of historyRecent) {
    if (h.executed_by === 'manual')     executedByManual += 1
    if (h.executed_by === 'automation') executedByAutomation += 1
  }

  // ─── AI aggregates ───────────────────────────────────────────────
  let aiNeedsReview = 0
  let aiActive = 0
  let confSum = 0
  let confCount = 0
  const aiCategoryCounts: Record<string, number> = {}
  for (const d of aiRecent) {
    if (d.status === 'active')       aiActive += 1
    if (d.status === 'needs_review') aiNeedsReview += 1
    if (typeof d.confidence_score === 'number' && Number.isFinite(d.confidence_score)) {
      confSum += d.confidence_score
      confCount += 1
    }
    const cat = d.category
    if (cat) aiCategoryCounts[cat] = (aiCategoryCounts[cat] ?? 0) + 1
  }
  const aiAvgConfidence = confCount > 0
    ? Math.round((confSum / confCount) * 100) / 100
    : null
  const aiCategoriesDist = Object.entries(aiCategoryCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([category, count]) => ({ category, count }))

  // ─── Rate-limit peak observation ─────────────────────────────────
  // Bucket the union of (runs + history) timestamps into per-minute
  // buckets over the last 24h. Peak count answers "what was our highest
  // sustained per-minute load relative to the cap?". The cap itself is
  // env-driven (ACTION_EXECUTION_MAX_PER_MINUTE; default 60 per
  // action-executor.ts:115-119).
  const PER_MIN = 60_000
  const bucketed = new Map<number, number>()
  for (const r of runsLast24h) {
    if (!r.executed_at) continue
    const t = new Date(r.executed_at).getTime()
    if (!Number.isFinite(t)) continue
    const bucket = Math.floor(t / PER_MIN)
    bucketed.set(bucket, (bucketed.get(bucket) ?? 0) + 1)
  }
  for (const h of historyLast24h) {
    const t = new Date(h.created_at).getTime()
    if (!Number.isFinite(t)) continue
    const bucket = Math.floor(t / PER_MIN)
    bucketed.set(bucket, (bucketed.get(bucket) ?? 0) + 1)
  }
  let rateLimitPeakPerMinute = 0
  for (const count of bucketed.values()) {
    if (count > rateLimitPeakPerMinute) rateLimitPeakPerMinute = count
  }
  const rateLimitMaxPerMinute = (() => {
    const raw = process.env.ACTION_EXECUTION_MAX_PER_MINUTE
    if (!raw) return 60
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : 60
  })()

  // ─── LIVE flag matrix ────────────────────────────────────────────
  // Per-handler boolean + allowlist-configured-flag. SECRETS NEVER
  // SERIALIZED. The matrix gives operators at-a-glance visibility into
  // which actions can fire real vs simulated.
  const liveFlags: ActionLiveFlag[] = LIVE_FLAG_MATRIX.map((row) => ({
    flag_env_var: row.flag_env_var,
    is_live: readLiveFlag(row.flag_env_var),
    allowlist_env_var: row.allowlist_env_var,
    allowlist_configured: row.allowlist_env_var ? readAllowlistConfigured(row.allowlist_env_var) : false,
  })) as ActionLiveFlag[]
  const liveFlagsByActionType = LIVE_FLAG_MATRIX.map((row, i) => ({
    action_type: row.action_type,
    ...liveFlags[i],
  }))
  const anyLiveEnabled = liveFlags.some((f) => f.is_live)

  // ─── Approval policy register ────────────────────────────────────
  // Surface the centralized set as data so operators can audit the
  // policy without grepping the source. The set is exported as a
  // snapshot from automation-engine.ts (additive export for THIS phase).
  const approvalPolicy = {
    protected_action_types: SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES_SNAPSHOT,
  }

  return ok(c, {
    generated_at: new Date().toISOString(),
    window: {
      runs_history_ai_window_days: 7,
      rate_limit_window_hours: 24,
    },
    rules: {
      total: rules.length,
      enabled: rulesEnabled,
      disabled: rulesDisabled,
      requires_approval: rulesRequiresApproval,
    },
    runs_last_7d: {
      total: runsRecent.length,
      by_status: {
        success: runsByStatus.success ?? 0,
        failed:  runsByStatus.failed  ?? 0,
        skipped: runsByStatus.skipped ?? 0,
        pending: runsByStatus.pending ?? 0,
      },
      skipped_approval_required: skippedApprovalRequired,
      trigger_auto_fire: triggerAuto,
      trigger_manual_rule_fire: triggerManualRule,
      idempotent_replays: idempotentReplays,
    },
    audit_last_7d: {
      decision_history_rows: historyRecent.length,
      executed_by_manual: executedByManual,
      executed_by_automation: executedByAutomation,
    },
    ai_last_7d: {
      decisions: aiRecent.length,
      active: aiActive,
      needs_review: aiNeedsReview,
      avg_confidence: aiAvgConfidence,
      by_category: aiCategoriesDist,
    },
    rate_limit: {
      max_per_minute: rateLimitMaxPerMinute,
      peak_observed_last_24h: rateLimitPeakPerMinute,
    },
    live_flags: {
      any_live_enabled: anyLiveEnabled,
      matrix: liveFlagsByActionType,
    },
    approval_policy: approvalPolicy,
    top_action_types: topActionTypes,
    top_trigger_types: topTriggerTypes,
  })
})
