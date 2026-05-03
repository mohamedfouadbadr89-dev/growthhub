/**
 * Phase 4 minimal execution layer — single-action executor.
 *
 * SOURCE OF TRUTH:
 *  - CLAUDE.md §9          → "Decision History … Every record contains
 *                            decision, action_taken, trigger_condition,
 *                            data_used, result, ai_explanation, confidence_score."
 *  - CONSTITUTION.md §1    → never bypass auth; never query DB without org_id;
 *                            never write from frontend; never skip RLS.
 *  - CONSTITUTION.md §3    → Fail Loudly. Never delete from decision_history.
 *                            Every job logs its result.
 *  - SYSTEM_CONTROL.md     → Phase 4 minimal slice + this turn's extension
 *                            (single real Meta pause_campaign behind a
 *                            feature flag + org allowlist; no Phase 2
 *                            integrations layer; no automation; no batching).
 *  - Phase 3 AI Output     → linkage via `ai_decisions(id)`; legacy `decisions`
 *                            table is deprecated and not referenced here.
 *
 * Architectural rules enforced HERE:
 *
 *   1. Inputs come ONLY from server-side request context. The caller passes
 *      `orgId` from `c.get('orgId')` (Hono auth context). NEVER from body.
 *
 *   2. Action template MUST exist in actions_library. No template → fail
 *      loud (NOT_FOUND). Cannot be bypassed.
 *
 *   3. Required parameters per `parameter_schema` MUST be present. Missing
 *      param → fail loud (MISSING_PARAMETER). Cannot be bypassed.
 *
 *   4. The action handler decides whether to run a SIMULATED stub or a
 *      REAL external API call. Live execution is gated by:
 *        a) feature flag `META_PAUSE_CAMPAIGN_LIVE=true`,
 *        b) `META_TEST_ACCESS_TOKEN` env present,
 *        c) caller's org_id is in `META_LIVE_ORG_ALLOWLIST` (or allowlist empty
 *           which means open to all in dev — see env.example).
 *      All three guards default to OFF; default behavior remains simulated.
 *
 *   5. EVERY execution attempt — successful, handler-failed, validation
 *      failure pre-execution — produces an audit trail. Pre-validation
 *      failures throw with a typed code (no decision_history row, nothing
 *      to audit). Anything past validation lands in `decision_history`.
 *
 *   6. Live external API call is bracketed by structured `[exec]` log lines:
 *      `exec.api_call` BEFORE the call, `exec.api_response` AFTER. Failure
 *      paths emit `exec.api_response` with `ok=false` and `error.message`.
 *      Logs are emitted regardless of whether the DB insert later succeeds.
 *
 *   7. NO automation. NO batching. NO Phase 2 integrations layer.
 */

import { supabaseAdmin } from '../../lib/supabase.js'

// ─── Real-execution guards (env-driven, default OFF) ──────────────────

const META_PAUSE_CAMPAIGN_LIVE = process.env.META_PAUSE_CAMPAIGN_LIVE === 'true'
const META_DECREASE_BUDGET_LIVE = process.env.META_DECREASE_BUDGET_LIVE === 'true'
const META_INCREASE_BUDGET_LIVE = process.env.META_INCREASE_BUDGET_LIVE === 'true'
// Hard server-side cap on per-call budget increase (in percent). Rejects any
// `percent > META_INCREASE_BUDGET_MAX_PERCENT` BEFORE contacting Meta. Per
// CONSTITUTION §3 "Fail Loudly": misconfigured large increases are caught
// at the executor boundary, not by Meta. Default 50 — operator may lower
// for tighter control or raise (with caution) for power-user environments.
const META_INCREASE_BUDGET_MAX_PERCENT = (() => {
  const raw = process.env.META_INCREASE_BUDGET_MAX_PERCENT
  const n = raw !== undefined ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 50
})()
const META_TEST_ACCESS_TOKEN = process.env.META_TEST_ACCESS_TOKEN
const META_LIVE_ORG_ALLOWLIST = (process.env.META_LIVE_ORG_ALLOWLIST ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? 'v18.0'

// ─── send_alert_email real-execution guards (Resend) ──────────────────
// Default OFF. Even when ON, recipients are restricted to org admins (looked
// up from users WHERE org_id = ctx.orgId AND role = 'admin') — placeholders
// from JIT auto-provision (`@placeholder.local`, `@clerk.placeholder`) are
// filtered out before any send. Token never logged.
const SEND_ALERT_EMAIL_LIVE = process.env.SEND_ALERT_EMAIL_LIVE === 'true'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const ALERT_EMAIL_FROM =
  process.env.ALERT_EMAIL_FROM ?? 'alerts@growthhub.local'

// ─── Types ────────────────────────────────────────────────────────────

export type ActionResult = 'success' | 'failed' | 'skipped'

export type ExecutedBy = 'manual' | 'automation'

export interface ExecuteActionInput {
  /** actions_library row id */
  templateId: string
  /** caller-supplied parameters validated against parameter_schema */
  params: Record<string, unknown>
  /** Server-side from c.get('orgId'). NEVER from request body. */
  orgId: string
  /** Optional: link to the ai_decisions row that suggested this action. */
  aiDecisionId?: string
  /** Optional: trace id for cross-table audit correlation with ai_logs. */
  traceId?: string
  /** Optional: who executed it. Defaults to 'manual'. */
  executedBy?: ExecutedBy
  /**
   * Optional idempotency key (UUID). When supplied:
   *   - First call: handler runs, decision_history row is inserted with this key.
   *   - Any subsequent call from the SAME org with the SAME key: handler is
   *     NOT re-run. The original `decision_history` row is returned and the
   *     response carries `result_data: { idempotent_replay: true,
   *     original_history_id: <id> }`.
   * Per-org scoped — cross-org replay of a key is impossible (the partial
   * unique index `idx_decision_history_org_execution_id` is keyed on
   * `(org_id, execution_id)`).
   */
  executionId?: string
}

export interface ExecuteActionResult {
  historyId: string
  result: ActionResult
  resultData: Record<string, unknown>
  /** True iff this call was a no-op replay of a prior execution with the same key. */
  idempotentReplay?: boolean
}

interface ActionsLibraryRow {
  id: string
  platform: string
  action_type: string
  name: string
  parameter_schema: { fields?: Array<{ name: string; type: string; required: boolean; label: string }> }
}

interface AiDecisionLink {
  trace_id: string | null
  result: unknown
  confidence_score: number | null
}

interface HandlerCtx {
  orgId: string
  platform: string
  actionType: string
  templateId: string
  traceId: string | null
  aiDecisionId: string | null
}

type ActionHandler = (
  params: Record<string, unknown>,
  ctx: HandlerCtx,
) => Promise<{
  success: boolean
  result_data: Record<string, unknown>
  error_message?: string
}>

// ─── Structured execution logger (lifecycle + API events) ─────────────

interface ExecLogEntry {
  ts: string
  phase:
    | 'exec.start'
    | 'exec.end'
    | 'exec.api_call'
    | 'exec.api_response'
    | 'exec.error'
  org_id: string
  trace_id: string | null
  ai_decision_id: string | null
  template_id: string
  platform: string
  action_type: string
  mode: 'simulated' | 'live'
  campaign_id?: string
  http_status?: number
  ok?: boolean
  latency_ms?: number
  error?: { name?: string; message: string }
}

function logExec(entry: ExecLogEntry): void {
  const line = `[exec] ${safeStringify(entry)}`
  // eslint-disable-next-line no-console
  if (entry.phase === 'exec.error' || entry.ok === false) console.error(line)
  // eslint-disable-next-line no-console
  else console.log(line)
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return '[unserializable]'
  }
}

// ─── Action handlers ──────────────────────────────────────────────────
//
// `pause_campaign` for platform='meta' may run LIVE behind the feature-flag
// guards above. Every other handler stays simulated until its own platform
// is unlocked. Simulated handlers return `{ simulated: true, ... }` so the
// caller can tell at a glance.

const ACTION_HANDLERS: Record<string, ActionHandler> = {
  pause_campaign: async (params, ctx) => {
    const liveAllowed =
      ctx.platform === 'meta' &&
      META_PAUSE_CAMPAIGN_LIVE &&
      (META_LIVE_ORG_ALLOWLIST.length === 0 ||
        META_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (liveAllowed) {
      return realMetaPauseCampaign(params, ctx)
    }

    return {
      success: true,
      result_data: {
        simulated: true,
        action_type: ctx.actionType,
        platform: ctx.platform,
        ...params,
      },
    }
  },

  increase_budget: async (params, ctx) => {
    const liveAllowed =
      ctx.platform === 'meta' &&
      META_INCREASE_BUDGET_LIVE &&
      Boolean(META_TEST_ACCESS_TOKEN) &&
      (META_LIVE_ORG_ALLOWLIST.length === 0 ||
        META_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (liveAllowed) {
      return realMetaIncreaseBudget(params, ctx)
    }
    return {
      success: true,
      result_data: {
        simulated: true,
        action_type: ctx.actionType,
        platform: ctx.platform,
        ...params,
      },
    }
  },

  decrease_budget: async (params, ctx) => {
    const liveAllowed =
      ctx.platform === 'meta' &&
      META_DECREASE_BUDGET_LIVE &&
      Boolean(META_TEST_ACCESS_TOKEN) &&
      (META_LIVE_ORG_ALLOWLIST.length === 0 ||
        META_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (liveAllowed) {
      return realMetaDecreaseBudget(params, ctx)
    }
    return {
      success: true,
      result_data: {
        simulated: true,
        action_type: ctx.actionType,
        platform: ctx.platform,
        ...params,
      },
    }
  },

  send_alert_email: async (params, ctx) => {
    const liveAllowed =
      SEND_ALERT_EMAIL_LIVE &&
      Boolean(RESEND_API_KEY) &&
      // Reuse the org allowlist mechanism if set; empty list = open in dev.
      (META_LIVE_ORG_ALLOWLIST.length === 0 ||
        META_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (liveAllowed) {
      return realSendAlertEmail(params, ctx)
    }
    return {
      success: true,
      result_data: {
        simulated: true,
        action_type: ctx.actionType,
        platform: ctx.platform,
        ...params,
      },
    }
  },
}

// ─── Real Meta pause_campaign ─────────────────────────────────────────
//
// Calls the Meta Graph API to pause a campaign by id. Single-tenant in
// the dev/sandbox phase: the access token comes from `META_TEST_ACCESS_TOKEN`
// (NOT a per-org token — Phase 2 will add per-org token storage). The
// org_id is recorded in audit logs and decision_history regardless, so
// the audit trail is org-isolated even when the underlying token isn't.
//
// Endpoint: POST https://graph.facebook.com/{version}/{campaign_id}
// Body:     status=PAUSED&access_token=<token>
// Success response: { "success": true }
// Error response:   { "error": { "message": "...", "code": ..., ... } }

async function realMetaPauseCampaign(
  params: Record<string, unknown>,
  ctx: HandlerCtx,
): Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }> {
  const campaign_id = params.campaign_id

  if (typeof campaign_id !== 'string' || campaign_id.length === 0) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: 'campaign_id missing or invalid' },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'campaign_id missing or invalid',
    }
  }

  if (!META_TEST_ACCESS_TOKEN) {
    // Misconfig: flag on, allowlist matched, but no token. Fail loudly.
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message:
          'META_PAUSE_CAMPAIGN_LIVE=true but META_TEST_ACCESS_TOKEN is not configured',
      },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'META access token not configured',
    }
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(campaign_id)}`

  // Step: log BEFORE the external call (Phase 4 mandate).
  // Token is NOT included in any log line.
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
  })

  const t0 = Date.now()
  let resp: Response
  let body: unknown
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        status: 'PAUSED',
        access_token: META_TEST_ACCESS_TOKEN,
      }).toString(),
    })
    body = await resp.json().catch(() => null)
  } catch (e) {
    const latency_ms = Date.now() - t0
    const err = e as Error
    // Step: log AFTER the call attempt (transport failure path).
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      campaign_id,
      latency_ms,
      ok: false,
      error: { name: err?.name, message: err?.message ?? 'fetch failed' },
    })
    return {
      success: false,
      result_data: { mode: 'live', stage: 'transport' },
      error_message: `Meta API transport: ${err?.message ?? 'fetch failed'}`,
    }
  }

  const latency_ms = Date.now() - t0
  const bodyObj = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const ok = resp.ok && bodyObj !== null && bodyObj.error === undefined

  // Step: log AFTER the call (HTTP-response path).
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
    latency_ms,
    http_status: resp.status,
    ok,
  })

  if (!ok) {
    const errObj = bodyObj?.error
    const errMsg =
      errObj && typeof errObj === 'object'
        ? safeStringify(errObj)
        : `HTTP ${resp.status}`
    return {
      success: false,
      result_data: { mode: 'live', http_status: resp.status, body: bodyObj },
      error_message: errMsg,
    }
  }

  return {
    success: true,
    result_data: {
      mode: 'live',
      campaign_id,
      http_status: resp.status,
      body: bodyObj,
    },
  }
}

// ─── Real meta.decrease_budget (Meta Graph API, two calls) ────────────
//
// Decreases a campaign's daily_budget by `params.percent`. Two calls because
// the seed parameter_schema specifies a relative percent (not an absolute
// new value): we GET the current daily_budget, compute the new one, then
// POST the new value. Both calls are bracketed by `[exec]` log lines.
//
//   GET  https://graph.facebook.com/{ver}/{campaign_id}?fields=daily_budget&access_token=…
//   POST https://graph.facebook.com/{ver}/{campaign_id}
//        body: daily_budget=<new>&access_token=…
//
// `daily_budget` is in the lowest currency unit (Meta convention: cents for
// USD-denominated accounts). Computed new = round(current * (1 - percent/100)).
// Refuses to set a non-positive budget. Refuses if percent is out of (0, 100).
//
// Idempotency is enforced upstream by `executeAction` via the optional
// `executionId` key, so retries do NOT trigger a second GET+POST pair: a
// replay short-circuits at the executor's pre-check before this function
// is even invoked.

async function realMetaDecreaseBudget(
  params: Record<string, unknown>,
  ctx: HandlerCtx,
): Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }> {
  const campaign_id = params.campaign_id
  const percent = params.percent

  if (typeof campaign_id !== 'string' || campaign_id.length === 0) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: 'campaign_id missing or invalid' },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'campaign_id missing or invalid',
    }
  }
  if (
    typeof percent !== 'number' ||
    !Number.isFinite(percent) ||
    percent <= 0 ||
    percent >= 100
  ) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: 'percent must be a finite number in (0, 100)' },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'percent must be a finite number in (0, 100)',
    }
  }

  if (!META_TEST_ACCESS_TOKEN) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message:
          'META_DECREASE_BUDGET_LIVE=true but META_TEST_ACCESS_TOKEN is not configured',
      },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'META access token not configured',
    }
  }

  const baseUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
    campaign_id,
  )}`

  // ── Step 1: GET current daily_budget ─────────────────────────────────
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
  })

  const tGet0 = Date.now()
  let getResp: Response
  let getBody: unknown
  try {
    getResp = await fetch(
      `${baseUrl}?fields=daily_budget&access_token=${encodeURIComponent(
        META_TEST_ACCESS_TOKEN,
      )}`,
      { method: 'GET' },
    )
    getBody = await getResp.json().catch(() => null)
  } catch (e) {
    const latency_ms = Date.now() - tGet0
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      campaign_id,
      latency_ms,
      ok: false,
      error: { name: err?.name, message: err?.message ?? 'fetch failed' },
    })
    return {
      success: false,
      result_data: { mode: 'live', stage: 'transport_get' },
      error_message: `Meta GET transport: ${err?.message ?? 'fetch failed'}`,
    }
  }
  const getLatency = Date.now() - tGet0
  const getBodyObj =
    getBody && typeof getBody === 'object'
      ? (getBody as Record<string, unknown>)
      : null
  const getOk = getResp.ok && getBodyObj !== null && getBodyObj.error === undefined

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
    latency_ms: getLatency,
    http_status: getResp.status,
    ok: getOk,
  })

  if (!getOk) {
    const errObj = getBodyObj?.error
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'get',
        http_status: getResp.status,
        body: getBodyObj,
      },
      error_message:
        errObj && typeof errObj === 'object'
          ? safeStringify(errObj)
          : `Meta GET HTTP ${getResp.status}`,
    }
  }

  // Parse current daily_budget. Meta returns it as a string in cents.
  const currentRaw = getBodyObj?.daily_budget
  const currentNum =
    typeof currentRaw === 'string'
      ? Number(currentRaw)
      : typeof currentRaw === 'number'
        ? currentRaw
        : NaN
  if (!Number.isFinite(currentNum) || currentNum <= 0) {
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'compute',
        current_daily_budget: currentRaw,
      },
      error_message:
        'Cannot decrease: current daily_budget missing, zero, or non-numeric',
    }
  }

  // Compute new budget. Meta uses integers (cents); round and floor at 1.
  const newBudget = Math.round(currentNum * (1 - percent / 100))
  if (newBudget <= 0) {
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'compute',
        current_daily_budget: currentNum,
        computed_new: newBudget,
      },
      error_message: 'Computed new daily_budget would be non-positive; refused',
    }
  }

  // ── Step 2: POST new daily_budget ────────────────────────────────────
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
  })

  const tPost0 = Date.now()
  let postResp: Response
  let postBody: unknown
  try {
    postResp = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        daily_budget: String(newBudget),
        access_token: META_TEST_ACCESS_TOKEN,
      }).toString(),
    })
    postBody = await postResp.json().catch(() => null)
  } catch (e) {
    const latency_ms = Date.now() - tPost0
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      campaign_id,
      latency_ms,
      ok: false,
      error: { name: err?.name, message: err?.message ?? 'fetch failed' },
    })
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'transport_post',
        previous_daily_budget: currentNum,
        attempted_new_daily_budget: newBudget,
      },
      error_message: `Meta POST transport: ${err?.message ?? 'fetch failed'}`,
    }
  }
  const postLatency = Date.now() - tPost0
  const postBodyObj =
    postBody && typeof postBody === 'object'
      ? (postBody as Record<string, unknown>)
      : null
  const postOk =
    postResp.ok && postBodyObj !== null && postBodyObj.error === undefined

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
    latency_ms: postLatency,
    http_status: postResp.status,
    ok: postOk,
  })

  if (!postOk) {
    const errObj = postBodyObj?.error
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'post',
        http_status: postResp.status,
        previous_daily_budget: currentNum,
        attempted_new_daily_budget: newBudget,
        body: postBodyObj,
      },
      error_message:
        errObj && typeof errObj === 'object'
          ? safeStringify(errObj)
          : `Meta POST HTTP ${postResp.status}`,
    }
  }

  return {
    success: true,
    result_data: {
      mode: 'live',
      campaign_id,
      previous_daily_budget: currentNum,
      new_daily_budget: newBudget,
      percent_applied: percent,
      get_http_status: getResp.status,
      post_http_status: postResp.status,
    },
  }
}

// ─── Real meta.increase_budget (Meta Graph API, two calls + max guard) ───
//
// Increases a campaign's daily_budget by `params.percent`. Money-UP direction,
// so the executor enforces a SERVER-SIDE hard cap via
// `META_INCREASE_BUDGET_MAX_PERCENT` (default 50). Any `percent` above the cap
// is REFUSED before Meta is contacted — the failure is a `decision_history`
// row with `result='failed'` and a structured `[exec] phase=exec.error` log.
// Idempotency is enforced upstream by `executeAction.executionId`.
//
//   GET  https://graph.facebook.com/{ver}/{campaign_id}?fields=daily_budget&access_token=…
//   POST https://graph.facebook.com/{ver}/{campaign_id}
//        body: daily_budget=<new>&access_token=…
//
// Symmetric to `realMetaDecreaseBudget` with the sign flipped:
//   newBudget = round(currentNum * (1 + percent / 100))
// Plus an extra defense: refuses if computed new is not strictly greater than
// current (covers floating-point rounding edge cases at very small percents).

async function realMetaIncreaseBudget(
  params: Record<string, unknown>,
  ctx: HandlerCtx,
): Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }> {
  const campaign_id = params.campaign_id
  const percent = params.percent

  if (typeof campaign_id !== 'string' || campaign_id.length === 0) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: 'campaign_id missing or invalid' },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'campaign_id missing or invalid',
    }
  }
  if (
    typeof percent !== 'number' ||
    !Number.isFinite(percent) ||
    percent <= 0
  ) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: 'percent must be a positive finite number' },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'percent must be a positive finite number',
    }
  }
  // Hard server-side cap — the safety guard for money-UP direction.
  if (percent > META_INCREASE_BUDGET_MAX_PERCENT) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message: `percent ${percent} exceeds META_INCREASE_BUDGET_MAX_PERCENT=${META_INCREASE_BUDGET_MAX_PERCENT}; refused`,
      },
    })
    return {
      success: false,
      result_data: {
        requested_percent: percent,
        max_allowed_percent: META_INCREASE_BUDGET_MAX_PERCENT,
      },
      error_message: `percent ${percent} exceeds server-side cap (${META_INCREASE_BUDGET_MAX_PERCENT}); refused`,
    }
  }

  if (!META_TEST_ACCESS_TOKEN) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message:
          'META_INCREASE_BUDGET_LIVE=true but META_TEST_ACCESS_TOKEN is not configured',
      },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'META access token not configured',
    }
  }

  const baseUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
    campaign_id,
  )}`

  // ── Step 1: GET current daily_budget ─────────────────────────────────
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
  })

  const tGet0 = Date.now()
  let getResp: Response
  let getBody: unknown
  try {
    getResp = await fetch(
      `${baseUrl}?fields=daily_budget&access_token=${encodeURIComponent(
        META_TEST_ACCESS_TOKEN,
      )}`,
      { method: 'GET' },
    )
    getBody = await getResp.json().catch(() => null)
  } catch (e) {
    const latency_ms = Date.now() - tGet0
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      campaign_id,
      latency_ms,
      ok: false,
      error: { name: err?.name, message: err?.message ?? 'fetch failed' },
    })
    return {
      success: false,
      result_data: { mode: 'live', stage: 'transport_get' },
      error_message: `Meta GET transport: ${err?.message ?? 'fetch failed'}`,
    }
  }
  const getLatency = Date.now() - tGet0
  const getBodyObj =
    getBody && typeof getBody === 'object'
      ? (getBody as Record<string, unknown>)
      : null
  const getOk = getResp.ok && getBodyObj !== null && getBodyObj.error === undefined

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
    latency_ms: getLatency,
    http_status: getResp.status,
    ok: getOk,
  })

  if (!getOk) {
    const errObj = getBodyObj?.error
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'get',
        http_status: getResp.status,
        body: getBodyObj,
      },
      error_message:
        errObj && typeof errObj === 'object'
          ? safeStringify(errObj)
          : `Meta GET HTTP ${getResp.status}`,
    }
  }

  const currentRaw = getBodyObj?.daily_budget
  const currentNum =
    typeof currentRaw === 'string'
      ? Number(currentRaw)
      : typeof currentRaw === 'number'
        ? currentRaw
        : NaN
  if (!Number.isFinite(currentNum) || currentNum <= 0) {
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'compute',
        current_daily_budget: currentRaw,
      },
      error_message:
        'Cannot increase: current daily_budget missing, zero, or non-numeric',
    }
  }

  const newBudget = Math.round(currentNum * (1 + percent / 100))
  // Defense in depth: at very small percents on small budgets, rounding may
  // produce a value not strictly greater than current. Reject — there is
  // nothing to do AND the row would be misleading if marked success.
  if (newBudget <= currentNum) {
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'compute',
        current_daily_budget: currentNum,
        computed_new: newBudget,
      },
      error_message:
        'Computed new daily_budget would not be strictly greater than current; refused',
    }
  }

  // ── Step 2: POST new daily_budget ────────────────────────────────────
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
  })

  const tPost0 = Date.now()
  let postResp: Response
  let postBody: unknown
  try {
    postResp = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        daily_budget: String(newBudget),
        access_token: META_TEST_ACCESS_TOKEN,
      }).toString(),
    })
    postBody = await postResp.json().catch(() => null)
  } catch (e) {
    const latency_ms = Date.now() - tPost0
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      campaign_id,
      latency_ms,
      ok: false,
      error: { name: err?.name, message: err?.message ?? 'fetch failed' },
    })
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'transport_post',
        previous_daily_budget: currentNum,
        attempted_new_daily_budget: newBudget,
      },
      error_message: `Meta POST transport: ${err?.message ?? 'fetch failed'}`,
    }
  }
  const postLatency = Date.now() - tPost0
  const postBodyObj =
    postBody && typeof postBody === 'object'
      ? (postBody as Record<string, unknown>)
      : null
  const postOk =
    postResp.ok && postBodyObj !== null && postBodyObj.error === undefined

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    campaign_id,
    latency_ms: postLatency,
    http_status: postResp.status,
    ok: postOk,
  })

  if (!postOk) {
    const errObj = postBodyObj?.error
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'post',
        http_status: postResp.status,
        previous_daily_budget: currentNum,
        attempted_new_daily_budget: newBudget,
        body: postBodyObj,
      },
      error_message:
        errObj && typeof errObj === 'object'
          ? safeStringify(errObj)
          : `Meta POST HTTP ${postResp.status}`,
    }
  }

  return {
    success: true,
    result_data: {
      mode: 'live',
      campaign_id,
      previous_daily_budget: currentNum,
      new_daily_budget: newBudget,
      percent_applied: percent,
      max_percent_cap: META_INCREASE_BUDGET_MAX_PERCENT,
      get_http_status: getResp.status,
      post_http_status: postResp.status,
    },
  }
}

// ─── Real send_alert_email (Resend) ───────────────────────────────────
//
// Sends the alert email to admins of the calling org via Resend. Recipient
// list is computed server-side from `users` (org-scoped) — never from
// caller params. Idempotency is enforced upstream by `executeAction` via
// the optional `executionId` key, so retries do NOT produce duplicate
// emails: a replay short-circuits at the executor's pre-check before this
// function is even invoked.
//
// Endpoint: POST https://api.resend.com/emails
// Auth:     Authorization: Bearer ${RESEND_API_KEY}
// Body:     { from, to: [admin_emails], subject, text }
//
// Edge cases handled in-line:
//   - missing/empty subject or body          → 'failed' + structured error log
//   - RESEND_API_KEY missing (misconfig)     → 'failed' + exec.error log
//   - admin lookup fails                     → 'failed' + exec.error log
//   - zero admins in org                     → 'failed' + structured error
//   - all admin emails are JIT placeholders  → 'failed' (don't email fakes)
//   - Resend HTTP error / Resend transport   → 'failed' + exec.api_response

async function realSendAlertEmail(
  params: Record<string, unknown>,
  ctx: HandlerCtx,
): Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }> {
  const subject = params.subject
  const bodyText = params.body

  if (typeof subject !== 'string' || subject.length === 0) {
    return {
      success: false,
      result_data: {},
      error_message: 'subject missing or invalid',
    }
  }
  if (typeof bodyText !== 'string' || bodyText.length === 0) {
    return {
      success: false,
      result_data: {},
      error_message: 'body missing or invalid',
    }
  }

  if (!RESEND_API_KEY) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message:
          'SEND_ALERT_EMAIL_LIVE=true but RESEND_API_KEY is not configured',
      },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'Resend API key not configured',
    }
  }

  // Look up admin recipients for THIS org. service_role bypasses RLS by
  // design (CLAUDE.md §3); the .eq('org_id', …) filter still enforces
  // org-isolation explicitly at the application layer.
  const { data: admins, error: adminErr } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('org_id', ctx.orgId)
    .eq('role', 'admin')

  if (adminErr) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: `admin lookup failed: ${adminErr.message}` },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'admin lookup failed',
    }
  }

  const allEmails = (admins ?? [])
    .map((r) => r.email as string | null)
    .filter((e): e is string => typeof e === 'string' && e.length > 0)

  // Filter out JIT placeholders so we never email fake addresses.
  const realEmails = allEmails.filter(
    (e) =>
      !e.endsWith('@placeholder.local') && !e.endsWith('@clerk.placeholder'),
  )

  if (realEmails.length === 0) {
    return {
      success: false,
      result_data: {
        recipients_total: allEmails.length,
        recipients_real: 0,
      },
      error_message:
        allEmails.length === 0
          ? 'no admin recipients in this org'
          : 'all admin emails are placeholders; nothing sent',
    }
  }

  // Step: log BEFORE the external call. Recipient list size logged; addresses
  // themselves are NOT included to keep PII out of structured logs.
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
  })

  const t0 = Date.now()
  let resp: Response
  let respBody: unknown
  try {
    resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: ALERT_EMAIL_FROM,
        to: realEmails,
        subject,
        text: bodyText,
      }),
    })
    respBody = await resp.json().catch(() => null)
  } catch (e) {
    const latency_ms = Date.now() - t0
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      latency_ms,
      ok: false,
      error: { name: err?.name, message: err?.message ?? 'fetch failed' },
    })
    return {
      success: false,
      result_data: { mode: 'live', stage: 'transport' },
      error_message: `Resend transport: ${err?.message ?? 'fetch failed'}`,
    }
  }

  const latency_ms = Date.now() - t0
  const bodyObj =
    respBody && typeof respBody === 'object'
      ? (respBody as Record<string, unknown>)
      : null
  const ok = resp.ok && bodyObj !== null && bodyObj.error === undefined

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    latency_ms,
    http_status: resp.status,
    ok,
  })

  if (!ok) {
    const errObj = bodyObj?.error
    const errMsg =
      errObj && typeof errObj === 'object'
        ? safeStringify(errObj)
        : `HTTP ${resp.status}`
    return {
      success: false,
      result_data: {
        mode: 'live',
        http_status: resp.status,
        recipients_count: realEmails.length,
        body: bodyObj,
      },
      error_message: errMsg,
    }
  }

  return {
    success: true,
    result_data: {
      mode: 'live',
      recipients_count: realEmails.length,
      http_status: resp.status,
      // Resend returns { id: '<message_id>' } on success — keep that
      // for downstream lookup but do NOT include the recipient list.
      message_id:
        bodyObj && typeof bodyObj.id === 'string' ? bodyObj.id : null,
    },
  }
}

// ─── Public entry point ──────────────────────────────────────────────

/**
 * Execute a single action template. Same contract as before:
 *
 *   - Returns `{ historyId, result, resultData }` on every reachable path
 *     where a `decision_history` row was inserted (success OR handler-failed).
 *   - Throws (with `code` set) for pre-execution validation failures.
 *   - Throws on infrastructure failures.
 *
 * NEVER swallows errors. NEVER bypasses validation. NEVER skips logging.
 */
export async function executeAction(input: ExecuteActionInput): Promise<ExecuteActionResult> {
  if (!input.orgId || typeof input.orgId !== 'string') {
    const err = new Error(
      'executeAction: orgId is required (server-side, not from body)',
    ) as Error & { code: string }
    err.code = 'INVALID_ORG_ID'
    throw err
  }

  // 0. Idempotency pre-check.
  //    If the caller supplied an executionId, look for an existing
  //    decision_history row with the same (org_id, execution_id). If found,
  //    short-circuit: do NOT re-run the handler, do NOT insert a second row.
  //    Lookup is org-scoped (cross-org replay is impossible by index design).
  if (input.executionId) {
    const { data: existing, error: idemErr } = await supabaseAdmin
      .from('decision_history')
      .select('id, result')
      .eq('org_id', input.orgId)
      .eq('execution_id', input.executionId)
      .maybeSingle()
    if (idemErr) {
      const err = new Error(
        `executeAction: idempotency lookup failed: ${idemErr.message}`,
      ) as Error & { code: string }
      err.code = 'IDEMPOTENCY_LOOKUP_FAILED'
      throw err
    }
    if (existing) {
      return {
        historyId: existing.id as string,
        result: existing.result as ActionResult,
        resultData: {
          idempotent_replay: true,
          original_history_id: existing.id as string,
        },
        idempotentReplay: true,
      }
    }
  }

  // 1. Fetch action template (system-global, no org_id filter on actions_library)
  const { data: template, error: tErr } = await supabaseAdmin
    .from('actions_library')
    .select('id, platform, action_type, name, parameter_schema')
    .eq('id', input.templateId)
    .maybeSingle()

  if (tErr) {
    const err = new Error(
      `executeAction: template lookup failed: ${tErr.message}`,
    ) as Error & { code: string }
    err.code = 'TEMPLATE_LOOKUP_FAILED'
    throw err
  }
  if (!template) {
    const err = new Error('Action template not found') as Error & { code: string }
    err.code = 'NOT_FOUND'
    throw err
  }
  const t = template as ActionsLibraryRow

  // 2. Validate required parameters
  const fields = t.parameter_schema?.fields ?? []
  for (const f of fields) {
    const v = input.params[f.name]
    if (f.required && (v === undefined || v === null || v === '')) {
      const err = new Error(`Missing required parameter: ${f.name}`) as Error & {
        code: string
        field: string
      }
      err.code = 'MISSING_PARAMETER'
      err.field = f.name
      throw err
    }
  }

  // 3. Optional AI-decision linkage. Org-scoped lookup; never reads across orgs.
  let aiLink: AiDecisionLink | null = null
  if (input.aiDecisionId) {
    const { data: dec, error: dErr } = await supabaseAdmin
      .from('ai_decisions')
      .select('trace_id, result, confidence_score')
      .eq('id', input.aiDecisionId)
      .eq('org_id', input.orgId)
      .maybeSingle()
    if (dErr) {
      const err = new Error(
        `executeAction: ai_decisions lookup failed: ${dErr.message}`,
      ) as Error & { code: string }
      err.code = 'AI_DECISION_LOOKUP_FAILED'
      throw err
    }
    if (dec) aiLink = dec as AiDecisionLink
  }

  // 4. Resolve trace_id (caller-supplied wins over linked-decision's value).
  const traceId = input.traceId ?? aiLink?.trace_id ?? null
  const aiDecisionId = input.aiDecisionId ?? null

  // 5. Decide which handler will run and the high-level mode for logs.
  const liveCandidate =
    t.platform === 'meta' &&
    t.action_type === 'pause_campaign' &&
    META_PAUSE_CAMPAIGN_LIVE &&
    Boolean(META_TEST_ACCESS_TOKEN) &&
    (META_LIVE_ORG_ALLOWLIST.length === 0 ||
      META_LIVE_ORG_ALLOWLIST.includes(input.orgId))
  const mode: 'simulated' | 'live' = liveCandidate ? 'live' : 'simulated'

  const ctx: HandlerCtx = {
    orgId: input.orgId,
    platform: t.platform,
    actionType: t.action_type,
    templateId: t.id,
    traceId,
    aiDecisionId,
  }

  // 6. exec.start lifecycle log (Phase 4 strict requirement: log BEFORE).
  const tStart = Date.now()
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.start',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode,
  })

  // 7. Run handler. Failures here are LOGGED to decision_history (result='failed')
  //    rather than thrown — every attempt past validation must be auditable.
  const handler = ACTION_HANDLERS[t.action_type]
  let exec: { success: boolean; result_data: Record<string, unknown>; error_message?: string }
  if (!handler) {
    exec = {
      success: false,
      result_data: {},
      error_message: `No handler registered for action_type: ${t.action_type}`,
    }
  } else {
    try {
      exec = await handler(input.params, ctx)
    } catch (err) {
      const e = err as Error
      exec = {
        success: false,
        result_data: {},
        error_message: e?.message ?? 'handler threw',
      }
    }
  }

  // 8. exec.end lifecycle log (log AFTER).
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.end',
    org_id: ctx.orgId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode,
    latency_ms: Date.now() - tStart,
    ok: exec.success,
    error: exec.success
      ? undefined
      : { message: exec.error_message ?? 'handler-failed' },
  })

  // 9. Compose action_taken summary
  const paramSummary = Object.entries(input.params)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ')
  const actionTaken = paramSummary ? `${t.name} — ${paramSummary}` : t.name

  // 10. INSERT decision_history (always, for both success and failed-handler).
  //     org_id comes from server-side input, never from body or AI output.
  const result: ActionResult = exec.success ? 'success' : 'failed'

  const dataUsed = aiLink
    ? { mode, ai_decision_result: aiLink.result, params: input.params }
    : { mode, params: input.params }

  const triggerCondition = aiLink
    ? `Triggered by ai_decisions ${input.aiDecisionId}`
    : 'Manual execution'

  // impact_snapshot: after-state of the executed action, derived verbatim
  // from the handler's result_data. For real-mode budget actions this carries
  // {previous_daily_budget, new_daily_budget, percent_applied, ...}; for
  // pause/email it carries handler-specific output (http_status, body,
  // recipients_count, message_id, ...); for simulated handlers it carries
  // {simulated: true, ...}; on handler failure it carries partial state
  // (stage, attempted_new_daily_budget, ...) for forensic reconciliation.
  // Phases.md Phase 4 mandates "Add: impact_snapshot (before/after)"; the
  // before-state is in data_used.params, the after-state is here.
  const impactSnapshot = exec.error_message
    ? { ...exec.result_data, error_message: exec.error_message }
    : exec.result_data
  const impactSnapshotForDb =
    impactSnapshot && Object.keys(impactSnapshot).length > 0
      ? impactSnapshot
      : null

  const { data: historyRow, error: hErr } = await supabaseAdmin
    .from('decision_history')
    .insert({
      org_id: input.orgId,
      decision: t.name,
      action_taken: actionTaken,
      trigger_condition: triggerCondition,
      data_used: dataUsed,
      result,
      ai_explanation: null,
      confidence_score: aiLink?.confidence_score ?? null,
      ai_decision_id: input.aiDecisionId ?? null,
      trace_id: traceId,
      execution_id: input.executionId ?? null,
      impact_snapshot: impactSnapshotForDb,
      executed_by: input.executedBy ?? 'manual',
    })
    .select('id')
    .single()

  if (hErr || !historyRow) {
    // Race-safety: a concurrent first call with the same (org_id, execution_id)
    // may have lost the SELECT-then-INSERT race. Postgres returns 23505 from
    // the partial unique index. In that case, fall back to the SELECT path
    // and return the now-existing row — handler may have run twice in
    // memory, but the audit table records exactly ONE row per key, and
    // both callers receive a consistent reply.
    const code = (hErr as { code?: string } | null)?.code
    if (code === '23505' && input.executionId) {
      const { data: existing, error: refetchErr } = await supabaseAdmin
        .from('decision_history')
        .select('id, result')
        .eq('org_id', input.orgId)
        .eq('execution_id', input.executionId)
        .maybeSingle()
      if (!refetchErr && existing) {
        return {
          historyId: existing.id as string,
          result: existing.result as ActionResult,
          resultData: {
            idempotent_replay: true,
            original_history_id: existing.id as string,
          },
          idempotentReplay: true,
        }
      }
    }
    const err = new Error(
      `executeAction: decision_history insert failed: ${hErr?.message ?? 'no row'}`,
    ) as Error & { code: string }
    err.code = 'HISTORY_INSERT_FAILED'
    throw err
  }

  return {
    historyId: historyRow.id as string,
    result,
    resultData: exec.error_message
      ? { ...exec.result_data, error_message: exec.error_message }
      : exec.result_data,
  }
}
