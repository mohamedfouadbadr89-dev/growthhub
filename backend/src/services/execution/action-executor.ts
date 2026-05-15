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
import { readSecret } from '../../lib/vault.js'
import { assertCredentialShape } from '../integrations/shape-registry.js'
import { isValidSlackWebhookUrl, postToSlackWebhook } from '../integrations/slack.js'
import { normalizeForEmail } from '../notifications/normalize.js'
import type { EmailDigestInput } from '../notifications/normalize.js'

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

// ─── Phase 4 Part 2 — Google pause_campaign real-execution guards ────
// Default OFF — same flag-gated pattern as Meta handlers. When LIVE,
// per-org Google refresh token is read from Phase 2 Vault storage
// (integrations.vault_refresh_token_secret_id); customer_id is resolved
// from ad_accounts.platform_account_id. Developer token + OAuth client
// credentials come from env (configured during Phase 2 unlock).
const GOOGLE_PAUSE_CAMPAIGN_LIVE =
  process.env.GOOGLE_PAUSE_CAMPAIGN_LIVE === 'true'
// Phase 6 Sub-pass C (continuation #20, 2026-05-09): real-mode CREATE
// handler flags. Meta uses the existing META_TEST_ACCESS_TOKEN single-
// tenant convention (matches realMetaPauseCampaign); per-org Vault
// migration for Meta tokens remains a separate Phase 2 hardening pass.
// Google reuses the Phase 2 Vault refresh-token flow established for
// realGooglePauseCampaign.
const META_CREATE_CAMPAIGN_LIVE =
  process.env.META_CREATE_CAMPAIGN_LIVE === 'true'
const GOOGLE_CREATE_CAMPAIGN_LIVE =
  process.env.GOOGLE_CREATE_CAMPAIGN_LIVE === 'true'
const GOOGLE_LIVE_ORG_ALLOWLIST = (process.env.GOOGLE_LIVE_ORG_ALLOWLIST ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION ?? 'v19'

// ─── Phase Ω.8A.1 — Slack + Email-digest real-execution guards ────────
// Default OFF — same flag-gated pattern as every handler above. Both are
// Tier-1 internal-notify operations (OPERATIONS_TAXONOMY.md §2.4): no spend
// impact, no approval gate.
//
// SLACK_POST_MESSAGE_LIVE: when ON, slack.post_message resolves the org's
//   per-org incoming-webhook URL from Supabase Vault via
//   integrations.provider_secret_id (shape-checked by shape-registry.ts).
//   SLACK_DEFAULT_WEBHOOK_URL is a DEV-ONLY fallback for orgs with no Slack
//   integration row — production orgs MUST connect their own webhook.
// EMAIL_SEND_DIGEST_LIVE: when ON, email.send_digest sends a deterministic
//   text/plain digest (normalizeForEmail) to org admins via Resend — the
//   same system-wide RESEND_API_KEY + admin-recipient model as
//   send_alert_email.
//
// Both reuse META_LIVE_ORG_ALLOWLIST as the generic live-exec allowlist
// (the established send_alert_email convention) — no new allowlist env.
const SLACK_POST_MESSAGE_LIVE = process.env.SLACK_POST_MESSAGE_LIVE === 'true'
const SLACK_DEFAULT_WEBHOOK_URL = process.env.SLACK_DEFAULT_WEBHOOK_URL
const EMAIL_SEND_DIGEST_LIVE = process.env.EMAIL_SEND_DIGEST_LIVE === 'true'

// ─── Phase 4 Part 2 — Per-org execution rate limit ────────────────────
// Caps `decision_history` inserts per org per minute. Idempotent replays
// (matched on `executionId` BEFORE this guard) are NOT counted. Default
// 60/min — operator may lower for tight environments or raise for
// power-user / batch scenarios. Set to 0 to disable.
const ACTION_EXECUTION_MAX_PER_MINUTE = (() => {
  const raw = process.env.ACTION_EXECUTION_MAX_PER_MINUTE
  const n = raw !== undefined ? Number(raw) : NaN
  return Number.isFinite(n) && n >= 0 ? n : 60
})()

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
  /**
   * Optional: outer per-HTTP-request correlator from tracingMiddleware
   * (c.get('requestId')). When supplied, every [exec] log line emitted
   * during this execution carries it, joining the same request_id
   * namespace as [req] envelope and [err] lines. Optional so non-HTTP
   * callers (e.g. future Inngest-dispatched runs) can omit it.
   */
  requestId?: string
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
  /**
   * Phase 4 Part 2 linkage. When this execution is dispatched by the
   * automation engine (services/execution/automation-engine.ts), the
   * caller threads in the rule + run identifiers so decision_history
   * carries the full audit chain:
   *   ai_decisions ← (ai_decision_id) → automation_rules ← (automation_rule_id)
   *                                  → automation_runs   ← (automation_run_id)
   * Both fields are nullable in the schema (Phase 4 Part 2 migration);
   * manual executions leave them undefined and the row stores NULL.
   */
  automationRuleId?: string
  automationRunId?: string
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
  /**
   * Validator-enforced shape: Array<{step: string; insight: string}> with at
   * least one entry. Typed `unknown` here for defensive read — `deriveAIExplanation`
   * narrows safely and falls back to null on any structural surprise.
   */
  reasoning_steps: unknown
}

/**
 * Derive `decision_history.ai_explanation` (TEXT) from a linked
 * `ai_decisions.reasoning_steps` JSONB array.
 *
 * Per CLAUDE.md §9 ("Decision History"), every record carries
 * `ai_explanation` — "why the AI decided this". Phase 3's AI Output
 * Contract stores that "why" structurally as `reasoning_steps:
 * [{step, insight}, ...]` (validated at write time by utils/aiValidator).
 * This helper joins those step/insight pairs into a single readable
 * TEXT line per pair, suitable for the audit field.
 *
 * Safety:
 *   - Validator already rejects malformed reasoning_steps at write time,
 *     so by the time we read it here, it should be array-shaped. We still
 *     defensively narrow on read because (a) ai_decisions could be written
 *     by a future code path that bypasses the validator, and (b) Postgres
 *     JSONB has no in-row schema. On any structural surprise we fall back
 *     to null — `decision_history.ai_explanation` is nullable, so a null
 *     here matches the pre-fix behavior and never breaks the INSERT.
 *   - Pure function. No I/O. No throws.
 */
function deriveAIExplanation(reasoning_steps: unknown): string | null {
  if (!Array.isArray(reasoning_steps) || reasoning_steps.length === 0) {
    return null
  }
  const lines: string[] = []
  for (const entry of reasoning_steps) {
    if (entry && typeof entry === 'object') {
      const step = (entry as { step?: unknown }).step
      const insight = (entry as { insight?: unknown }).insight
      if (typeof step === 'string' && typeof insight === 'string') {
        lines.push(`${step}: ${insight}`)
      }
    }
  }
  return lines.length > 0 ? lines.join('\n') : null
}

interface HandlerCtx {
  orgId: string
  platform: string
  actionType: string
  templateId: string
  traceId: string | null
  aiDecisionId: string | null
  /**
   * Outer per-HTTP-request correlator from tracingMiddleware. Threaded
   * through every logExec emission so `[exec]` lines join the same
   * request_id namespace as `[req]` and `[err]` lines.
   */
  requestId: string | null
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
  /**
   * Outer per-HTTP-request correlator from tracingMiddleware
   * (c.get('requestId')). Distinct from `trace_id` (per-execution): one
   * HTTP request can drive a single executeAction call but the request
   * envelope wraps it. Stamping `request_id` on every [exec] line lets
   * an operator pivot from the [req] envelope to the full execution
   * lifecycle deterministically. Optional for non-HTTP callers (e.g.
   * future Inngest-dispatched runs without a Hono request).
   */
  request_id: string | null
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
    const metaLiveAllowed =
      ctx.platform === 'meta' &&
      META_PAUSE_CAMPAIGN_LIVE &&
      (META_LIVE_ORG_ALLOWLIST.length === 0 ||
        META_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (metaLiveAllowed) {
      return realMetaPauseCampaign(params, ctx)
    }

    // Phase 4 Part 2 — Google pause_campaign real-mode behind its own flag
    // + allowlist + Phase-2-vault per-org credentials. Default OFF; same
    // simulated-fallback contract as the Meta path.
    const googleLiveAllowed =
      ctx.platform === 'google' &&
      GOOGLE_PAUSE_CAMPAIGN_LIVE &&
      (GOOGLE_LIVE_ORG_ALLOWLIST.length === 0 ||
        GOOGLE_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (googleLiveAllowed) {
      return realGooglePauseCampaign(params, ctx)
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

  // Phase 6 Sub-pass C (continuation #20, 2026-05-09): real-mode
  // CREATE handlers behind LIVE flags + per-platform allowlist. Defaults
  // remain simulated when flags are OFF, preserving the Sub-pass A
  // simulated-fallthrough contract. Mirrors the established pause_campaign
  // dispatch shape verbatim — same order (meta first, google second,
  // simulated last).
  create_campaign: async (params, ctx) => {
    const metaLiveAllowed =
      ctx.platform === 'meta' &&
      META_CREATE_CAMPAIGN_LIVE &&
      Boolean(META_TEST_ACCESS_TOKEN) &&
      (META_LIVE_ORG_ALLOWLIST.length === 0 ||
        META_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (metaLiveAllowed) {
      return realMetaCreateCampaign(params, ctx)
    }

    const googleLiveAllowed =
      ctx.platform === 'google' &&
      GOOGLE_CREATE_CAMPAIGN_LIVE &&
      (GOOGLE_LIVE_ORG_ALLOWLIST.length === 0 ||
        GOOGLE_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (googleLiveAllowed) {
      return realGoogleCreateCampaign(params, ctx)
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

  // Phase Ω.8A.1 — Slack post_message (Notify, Tier 1). Real mode behind
  // SLACK_POST_MESSAGE_LIVE + META_LIVE_ORG_ALLOWLIST; default simulated.
  // Simulated mode runs the SAME deterministic text composition the real
  // path sends, so the audit row's result_data.normalized_payload records
  // exactly what would have been posted (Simulation Contract).
  post_message: async (params, ctx) => {
    const liveAllowed =
      ctx.platform === 'slack' &&
      SLACK_POST_MESSAGE_LIVE &&
      (META_LIVE_ORG_ALLOWLIST.length === 0 ||
        META_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (liveAllowed) {
      return realSlackPostMessage(params, ctx)
    }
    return {
      success: true,
      result_data: {
        simulated: true,
        action_type: ctx.actionType,
        platform: ctx.platform,
        normalized_payload: { text: composeSlackText(params) },
      },
    }
  },

  // Phase Ω.8A.1 — Email send_digest (Notify, Tier 1). Real mode behind
  // EMAIL_SEND_DIGEST_LIVE + RESEND_API_KEY + META_LIVE_ORG_ALLOWLIST;
  // default simulated. Simulated mode still runs the deterministic
  // normalizeForEmail() pipeline so the audit row records the exact body
  // that would have been sent.
  send_digest: async (params, ctx) => {
    const liveAllowed =
      ctx.platform === 'email' &&
      EMAIL_SEND_DIGEST_LIVE &&
      Boolean(RESEND_API_KEY) &&
      (META_LIVE_ORG_ALLOWLIST.length === 0 ||
        META_LIVE_ORG_ALLOWLIST.includes(ctx.orgId))

    if (liveAllowed) {
      return realEmailSendDigest(params, ctx)
    }
    const normalized = normalizeForEmail(
      (params.digest ?? {}) as EmailDigestInput,
    )
    return {
      success: true,
      result_data: {
        simulated: true,
        action_type: ctx.actionType,
        platform: ctx.platform,
        subject: typeof params.subject === 'string' ? params.subject : null,
        normalized_payload: {
          text: normalized.text,
          truncated: normalized.truncated,
          total_chars: normalized.total_chars,
          sections_count: normalized.sections_count,
          metrics_count: normalized.metrics_count,
        },
      },
    }
  },
}

// ─── Meta access-token resolver (per-org Vault, sandbox fallback) ──────
//
// Phase 6 Sub-pass D / Part B (continuation #21, 2026-05-09).
//
// Resolves the Meta access token for a given org with the following
// priority:
//   1. Per-org Vault: `integrations.vault_refresh_token_secret_id` for
//      platform='meta' with status='connected' → readSecret() → access token
//   2. Sandbox fallback: `META_TEST_ACCESS_TOKEN` env (preserves existing
//      single-tenant dev/sandbox behavior — operators with no real Meta
//      integrations connected still hit live Meta API via this path)
//   3. None → caller surfaces as misconfig error
//
// Behavior preservation: when an org has NO connected Meta integration
// AND `META_TEST_ACCESS_TOKEN` is set, behavior is bit-identical to the
// pre-Sub-pass-D real Meta handlers. When an org HAS a connected Meta
// integration, the per-org Vault token wins. This is a purely additive
// migration — never strips existing sandbox behavior.
//
// Token NEVER logged. Source label IS logged so operators can confirm
// which credential path executed.
//
// Helper is provider-local (Meta-specific); does NOT extract a shared
// abstraction with Google's per-call OAuth refresh flow (Google needs
// refresh+token-exchange; Meta uses a direct long-lived access token).
async function resolveMetaAccessToken(
  ctx: HandlerCtx,
): Promise<{ token: string | null; source: 'vault' | 'sandbox' | 'none' }> {
  const { data: integration, error: intErr } = await supabaseAdmin
    .from('integrations')
    .select('vault_refresh_token_secret_id, status')
    .eq('org_id', ctx.orgId)
    .eq('platform', 'meta')
    .maybeSingle()

  if (
    !intErr &&
    integration &&
    integration.status === 'connected' &&
    integration.vault_refresh_token_secret_id
  ) {
    try {
      const token = await readSecret(integration.vault_refresh_token_secret_id as string)
      return { token, source: 'vault' }
    } catch {
      // Vault read failed — fall through to sandbox fallback rather than
      // hard-fail, preserving existing single-tenant behavior. The
      // failure is surfaced via the source label in the result_data of
      // the calling handler if the sandbox fallback is also absent.
    }
  }

  if (META_TEST_ACCESS_TOKEN) {
    return { token: META_TEST_ACCESS_TOKEN, source: 'sandbox' }
  }

  return { token: null, source: 'none' }
}

// ─── Real Meta pause_campaign ─────────────────────────────────────────
//
// Calls the Meta Graph API to pause a campaign by id. Per-org access
// token via Vault (Phase 2 OAuth flow stores token at
// `integrations.vault_refresh_token_secret_id`); sandbox fallback to
// `META_TEST_ACCESS_TOKEN` for orgs without connected Meta integration.
// org_id is recorded in audit logs and decision_history regardless, so
// the audit trail is org-isolated.
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
      request_id: ctx.requestId,
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

  // Phase 6 Sub-pass D Part B: per-org Vault token first, sandbox fallback.
  const { token: accessToken, source: tokenSource } = await resolveMetaAccessToken(ctx)
  if (!accessToken) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message:
          'META_PAUSE_CAMPAIGN_LIVE=true but no Meta access token resolved (per-org Vault absent + META_TEST_ACCESS_TOKEN unset)',
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
  // Token is NOT included in any log line; tokenSource label IS for triage.
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
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
        access_token: accessToken,
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
      request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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
      result_data: { mode: 'live', http_status: resp.status, body: bodyObj, token_source: tokenSource },
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
      token_source: tokenSource,
    },
  }
}

// ─── Real google.pause_campaign (Google Ads API; Phase 4 Part 2) ─────
//
// Endpoint: POST https://googleads.googleapis.com/{ver}/customers/{customer_id}/campaigns:mutate
//   Headers:
//     Authorization: Bearer <access_token>      (refreshed per call)
//     developer-token: <GOOGLE_ADS_DEVELOPER_TOKEN>
//     login-customer-id: <GOOGLE_ADS_LOGIN_CUSTOMER_ID> (optional, MCC)
//   Body:
//     { "operations":[{ "update": { "resourceName":"customers/{cid}/campaigns/{campaign_id}",
//                                   "status":"PAUSED" },
//                       "updateMask":"status" }] }
//
// Per-org credentials flow (Phase 2 → Phase 4 Part 2 unlock):
//   integrations.vault_refresh_token_secret_id  → readSecret() → refresh_token
//   refresh_token + GOOGLE_ADS_CLIENT_ID + GOOGLE_ADS_CLIENT_SECRET → access_token (60 min)
//   ad_accounts.platform_account_id (per integration) → customer_id
//
// Idempotency, parameter validation, and audit-row insertion are all
// enforced by `executeAction` upstream — this function only performs
// the live API call and emits structured `[exec]` lifecycle logs (token
// values are NEVER logged).
async function realGooglePauseCampaign(
  params: Record<string, unknown>,
  ctx: HandlerCtx,
): Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }> {
  const campaign_id = params.campaign_id

  if (typeof campaign_id !== 'string' || campaign_id.length === 0) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
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

  // Required env (configured during Phase 2 unlock).
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const oauthClientId = process.env.GOOGLE_ADS_CLIENT_ID
  const oauthClientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  if (!developerToken || !oauthClientId || !oauthClientSecret) {
    const missing = [
      !developerToken && 'GOOGLE_ADS_DEVELOPER_TOKEN',
      !oauthClientId && 'GOOGLE_ADS_CLIENT_ID',
      !oauthClientSecret && 'GOOGLE_ADS_CLIENT_SECRET',
    ].filter(Boolean).join(', ')
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: `GOOGLE_PAUSE_CAMPAIGN_LIVE=true but ${missing} not configured` },
    })
    return {
      success: false,
      result_data: {},
      error_message: `Google Ads credentials not configured (${missing})`,
    }
  }

  // 1. Resolve the org's Google integration + Vault refresh token.
  const { data: integration, error: intErr } = await supabaseAdmin
    .from('integrations')
    .select('id, vault_refresh_token_secret_id, status')
    .eq('org_id', ctx.orgId)
    .eq('platform', 'google')
    .maybeSingle()

  if (intErr) {
    return {
      success: false,
      result_data: { mode: 'live', stage: 'integration_lookup' },
      error_message: `Google integration lookup failed: ${intErr.message}`,
    }
  }
  if (!integration || integration.status !== 'connected' || !integration.vault_refresh_token_secret_id) {
    return {
      success: false,
      result_data: { mode: 'live', stage: 'integration_missing' },
      error_message: 'Google integration not connected for this organization',
    }
  }

  let refreshToken: string
  try {
    refreshToken = await readSecret(integration.vault_refresh_token_secret_id as string)
  } catch (e) {
    const err = e as Error
    return {
      success: false,
      result_data: { mode: 'live', stage: 'vault_read' },
      error_message: `Vault read failed: ${err.message}`,
    }
  }

  // 2. Resolve the Google customer_id from ad_accounts. We use the first
  //    matching account (operators with multiple Google accounts per org
  //    today must select via the rule.action_params.customer_id explicit
  //    override — preserving Phase 2's "first account" convention).
  let customerId: string
  if (typeof params.customer_id === 'string' && params.customer_id.length > 0) {
    customerId = params.customer_id
  } else {
    const { data: account, error: acctErr } = await supabaseAdmin
      .from('ad_accounts')
      .select('platform_account_id')
      .eq('org_id', ctx.orgId)
      .eq('integration_id', integration.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (acctErr) {
      return {
        success: false,
        result_data: { mode: 'live', stage: 'ad_account_lookup' },
        error_message: `Google ad_account lookup failed: ${acctErr.message}`,
      }
    }
    if (!account) {
      return {
        success: false,
        result_data: { mode: 'live', stage: 'ad_account_missing' },
        error_message: 'No Google ad_account discovered for this organization yet — run a Google sync first',
      }
    }
    customerId = String(account.platform_account_id).replace(/-/g, '')
  }

  // 3. Refresh OAuth access token. Token never logged.
  let accessToken: string
  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: oauthClientId,
        client_secret: oauthClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })
    if (!tokenResp.ok) {
      const detail = await tokenResp.text().catch(() => '')
      return {
        success: false,
        result_data: { mode: 'live', stage: 'oauth_refresh', http_status: tokenResp.status },
        error_message: `Google OAuth refresh failed (HTTP ${tokenResp.status}): ${detail.slice(0, 200)}`,
      }
    }
    const tokenJson = (await tokenResp.json()) as { access_token?: string }
    if (!tokenJson.access_token) {
      return {
        success: false,
        result_data: { mode: 'live', stage: 'oauth_refresh' },
        error_message: 'Google OAuth refresh returned no access_token',
      }
    }
    accessToken = tokenJson.access_token
  } catch (e) {
    const err = e as Error
    return {
      success: false,
      result_data: { mode: 'live', stage: 'oauth_refresh_transport' },
      error_message: `Google OAuth transport failed: ${err.message}`,
    }
  }

  // 4. Issue the mutate call.
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${encodeURIComponent(customerId)}/campaigns:mutate`
  const body = {
    operations: [
      {
        update: {
          resourceName: `customers/${customerId}/campaigns/${campaign_id}`,
          status: 'PAUSED',
        },
        updateMask: 'status',
      },
    ],
  }

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
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
  let respBody: unknown
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
    }
    if (loginCustomerId) headers['login-customer-id'] = loginCustomerId
    resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    respBody = await resp.json().catch(() => null)
  } catch (e) {
    const latency_ms = Date.now() - t0
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
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
      error_message: `Google Ads API transport: ${err?.message ?? 'fetch failed'}`,
    }
  }

  const latency_ms = Date.now() - t0
  const ok = resp.ok

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
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
    return {
      success: false,
      result_data: { mode: 'live', http_status: resp.status, body: respBody, customer_id: customerId },
      error_message: typeof respBody === 'object' && respBody !== null
        ? safeStringify(respBody)
        : `HTTP ${resp.status}`,
    }
  }

  return {
    success: true,
    result_data: {
      mode: 'live',
      campaign_id,
      customer_id: customerId,
      http_status: resp.status,
      body: respBody,
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
      request_id: ctx.requestId,
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
      request_id: ctx.requestId,
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

  // Phase 6 Sub-pass D Part B: per-org Vault token first, sandbox fallback.
  const { token: accessToken, source: tokenSource } = await resolveMetaAccessToken(ctx)
  if (!accessToken) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message:
          'META_DECREASE_BUDGET_LIVE=true but no Meta access token resolved (per-org Vault absent + META_TEST_ACCESS_TOKEN unset)',
      },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'META access token not configured',
    }
  }
  // Suppress unused-var: tokenSource will be embedded in result_data below.
  void tokenSource

  const baseUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
    campaign_id,
  )}`

  // ── Step 1: GET current daily_budget ─────────────────────────────────
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
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
      `${baseUrl}?fields=daily_budget&access_token=${encodeURIComponent(accessToken)}`,
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
      request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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
        access_token: accessToken,
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
      request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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
      request_id: ctx.requestId,
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
      request_id: ctx.requestId,
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
      request_id: ctx.requestId,
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

  // Phase 6 Sub-pass D Part B: per-org Vault token first, sandbox fallback.
  const { token: accessToken, source: tokenSource } = await resolveMetaAccessToken(ctx)
  if (!accessToken) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message:
          'META_INCREASE_BUDGET_LIVE=true but no Meta access token resolved (per-org Vault absent + META_TEST_ACCESS_TOKEN unset)',
      },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'META access token not configured',
    }
  }
  // Suppress unused-var: tokenSource is observability-only for this handler.
  void tokenSource

  const baseUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
    campaign_id,
  )}`

  // ── Step 1: GET current daily_budget ─────────────────────────────────
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
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
      `${baseUrl}?fields=daily_budget&access_token=${encodeURIComponent(accessToken)}`,
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
      request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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
        access_token: accessToken,
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
      request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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

// ─── Real meta.create_campaign (Meta Graph API) ──────────────────────
//
// Phase 6 Sub-pass C (continuation #20, 2026-05-09).
//
// Endpoint: POST https://graph.facebook.com/{ver}/act_{ad_account_id}/campaigns
//   Body (form-urlencoded):
//     name=<string>
//     objective=<string>                      (default: OUTCOME_TRAFFIC)
//     status=PAUSED                            (HARD-CODED — created campaigns
//                                              never auto-spend; operator
//                                              activates separately)
//     special_ad_categories=[]                 (compliance default)
//     daily_budget=<integer cents>             (optional; only if provided)
//     access_token=<META_TEST_ACCESS_TOKEN>    (single-tenant sandbox; mirrors
//                                              realMetaPauseCampaign)
//
// `ad_account_id` is resolved server-side from the org's first connected
// Meta `ad_accounts` row (matches the realGooglePauseCampaign customer_id
// resolution convention). The pre-handler cross-account guard at
// services/campaigns/campaigns.ts:pushCampaign already verified that the
// caller's campaign.ad_account_id belongs to their org; this handler does
// the second-stage lookup of `platform_account_id` for the actual API call.
//
// Idempotency, parameter validation (campaign_name required by
// actions_library schema), and audit-row insertion are all enforced by
// `executeAction` upstream — this function only performs the live API
// call and emits structured `[exec]` lifecycle logs (token NEVER logged).
//
// CRITICAL: status='PAUSED' is hard-coded so a misconfigured live flag +
// allowlist cannot accidentally launch real ad spend. Operator activates
// campaigns separately via the existing realMetaPauseCampaign-equivalent
// activate flow (not implemented in this pass per scope).
async function realMetaCreateCampaign(
  params: Record<string, unknown>,
  ctx: HandlerCtx,
): Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }> {
  const campaign_name = params.campaign_name
  if (typeof campaign_name !== 'string' || campaign_name.length === 0) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: 'campaign_name missing or invalid' },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'campaign_name missing or invalid',
    }
  }

  // Phase 6 Sub-pass D Part B: per-org Vault token first, sandbox fallback.
  const { token: accessToken, source: tokenSource } = await resolveMetaAccessToken(ctx)
  if (!accessToken) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message:
          'META_CREATE_CAMPAIGN_LIVE=true but no Meta access token resolved (per-org Vault absent + META_TEST_ACCESS_TOKEN unset)',
      },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'META access token not configured',
    }
  }
  // Suppress unused-var: tokenSource is observability-only for this handler.
  void tokenSource

  // Resolve the Meta ad_account_id from ad_accounts. We use the first
  // connected meta ad_accounts row for the org (same convention as
  // realGooglePauseCampaign customer_id resolution). pushCampaign's
  // cross-account guard already validated the caller-provided
  // campaign.ad_account_id; here we look up the platform-side identifier.
  const { data: integration, error: intErr } = await supabaseAdmin
    .from('integrations')
    .select('id')
    .eq('org_id', ctx.orgId)
    .eq('platform', 'meta')
    .maybeSingle()

  if (intErr) {
    return {
      success: false,
      result_data: { mode: 'live', stage: 'integration_lookup' },
      error_message: `Meta integration lookup failed: ${intErr.message}`,
    }
  }
  if (!integration) {
    return {
      success: false,
      result_data: { mode: 'live', stage: 'integration_missing' },
      error_message: 'Meta integration not connected for this organization',
    }
  }

  const { data: account, error: acctErr } = await supabaseAdmin
    .from('ad_accounts')
    .select('platform_account_id')
    .eq('org_id', ctx.orgId)
    .eq('integration_id', integration.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (acctErr) {
    return {
      success: false,
      result_data: { mode: 'live', stage: 'ad_account_lookup' },
      error_message: `Meta ad_account lookup failed: ${acctErr.message}`,
    }
  }
  if (!account) {
    return {
      success: false,
      result_data: { mode: 'live', stage: 'ad_account_missing' },
      error_message: 'No Meta ad_account discovered for this organization yet — run a Meta sync first',
    }
  }

  // Meta ad_account ids are conventionally formatted "act_<digits>". If the
  // stored platform_account_id already starts with "act_" use it verbatim;
  // otherwise prefix it. Defensive — the canonical Phase 2 sync flow may
  // store either form depending on provider response shape.
  const rawAccountId = String(account.platform_account_id)
  const adAccountId = rawAccountId.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`

  // Build the create body. status='PAUSED' is hard-coded for safety —
  // see header note. daily_budget is optional and converted to cents per
  // Meta's API convention.
  const objective =
    typeof params.objective === 'string' && params.objective.length > 0
      ? params.objective
      : 'OUTCOME_TRAFFIC'

  const formBody: Record<string, string> = {
    name: campaign_name,
    objective,
    status: 'PAUSED',
    special_ad_categories: '[]',
    access_token: accessToken,
  }

  if (
    typeof params.daily_budget === 'number' &&
    Number.isFinite(params.daily_budget) &&
    params.daily_budget > 0
  ) {
    // Meta API expects daily_budget in cents (smallest currency unit).
    formBody.daily_budget = String(Math.round(params.daily_budget * 100))
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(adAccountId)}/campaigns`

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
  })

  const t0 = Date.now()
  let resp: Response
  let body: unknown
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formBody).toString(),
    })
    body = await resp.json().catch(() => null)
  } catch (e) {
    const latency_ms = Date.now() - t0
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
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
      error_message: `Meta API transport: ${err?.message ?? 'fetch failed'}`,
    }
  }

  const latency_ms = Date.now() - t0
  const bodyObj = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const ok = resp.ok && bodyObj !== null && bodyObj.error === undefined

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
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
      result_data: { mode: 'live', http_status: resp.status, body: bodyObj, ad_account_id: adAccountId },
      error_message: errMsg,
    }
  }

  // Meta CREATE response shape: { id: "<numeric_campaign_id>" }
  const newCampaignId = bodyObj && typeof bodyObj.id === 'string' ? bodyObj.id : null

  return {
    success: true,
    result_data: {
      mode: 'live',
      ad_account_id: adAccountId,
      created_campaign_id: newCampaignId,
      campaign_name,
      objective,
      status: 'PAUSED',
      http_status: resp.status,
      body: bodyObj,
    },
  }
}

// ─── Real google.create_campaign (Google Ads API; two-call flow) ─────
//
// Phase 6 Sub-pass C (continuation #20, 2026-05-09).
//
// Google Ads requires a CampaignBudget resource BEFORE a Campaign can
// reference it. We perform two sequential POSTs against the same
// customer + access token:
//
//   1. POST /{ver}/customers/{cid}/campaignBudgets:mutate
//        { operations: [{ create: { name, amount_micros, delivery_method } }] }
//      → returns budget resource_name
//
//   2. POST /{ver}/customers/{cid}/campaigns:mutate
//        { operations: [{ create: { name, advertising_channel_type,
//                                    status, campaign_budget } }] }
//      → returns campaign resource_name
//
// On step-1 failure the function returns immediately (no campaign exists
// to clean up). On step-2 failure the budget orphan is logged but NOT
// auto-deleted — Google Ads budgets without a campaign are inert and the
// operator can prune them via the dashboard. This matches the operational
// pattern Google itself recommends for atomic-rollback-without-temp-id
// flows.
//
// Per-org credentials flow (mirrors realGooglePauseCampaign):
//   integrations.vault_refresh_token_secret_id  → readSecret() → refresh_token
//   refresh_token + GOOGLE_ADS_CLIENT_ID + GOOGLE_ADS_CLIENT_SECRET → access_token
//   ad_accounts.platform_account_id (per integration) → customer_id
//
// Tokens never logged. status='PAUSED' hard-coded for safety.
async function realGoogleCreateCampaign(
  params: Record<string, unknown>,
  ctx: HandlerCtx,
): Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }> {
  const campaign_name = params.campaign_name
  if (typeof campaign_name !== 'string' || campaign_name.length === 0) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: 'campaign_name missing or invalid' },
    })
    return {
      success: false,
      result_data: {},
      error_message: 'campaign_name missing or invalid',
    }
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const oauthClientId = process.env.GOOGLE_ADS_CLIENT_ID
  const oauthClientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  if (!developerToken || !oauthClientId || !oauthClientSecret) {
    const missing = [
      !developerToken && 'GOOGLE_ADS_DEVELOPER_TOKEN',
      !oauthClientId && 'GOOGLE_ADS_CLIENT_ID',
      !oauthClientSecret && 'GOOGLE_ADS_CLIENT_SECRET',
    ].filter(Boolean).join(', ')
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: `GOOGLE_CREATE_CAMPAIGN_LIVE=true but ${missing} not configured` },
    })
    return {
      success: false,
      result_data: {},
      error_message: `Google Ads credentials not configured (${missing})`,
    }
  }

  // 1. Resolve the org's Google integration + Vault refresh token.
  const { data: integration, error: intErr } = await supabaseAdmin
    .from('integrations')
    .select('id, vault_refresh_token_secret_id, status')
    .eq('org_id', ctx.orgId)
    .eq('platform', 'google')
    .maybeSingle()

  if (intErr) {
    return {
      success: false,
      result_data: { mode: 'live', stage: 'integration_lookup' },
      error_message: `Google integration lookup failed: ${intErr.message}`,
    }
  }
  if (!integration || integration.status !== 'connected' || !integration.vault_refresh_token_secret_id) {
    return {
      success: false,
      result_data: { mode: 'live', stage: 'integration_missing' },
      error_message: 'Google integration not connected for this organization',
    }
  }

  let refreshToken: string
  try {
    refreshToken = await readSecret(integration.vault_refresh_token_secret_id as string)
  } catch (e) {
    const err = e as Error
    return {
      success: false,
      result_data: { mode: 'live', stage: 'vault_read' },
      error_message: `Vault read failed: ${err.message}`,
    }
  }

  // 2. Resolve customer_id (mirrors realGooglePauseCampaign).
  let customerId: string
  if (typeof params.customer_id === 'string' && params.customer_id.length > 0) {
    customerId = params.customer_id
  } else {
    const { data: account, error: acctErr } = await supabaseAdmin
      .from('ad_accounts')
      .select('platform_account_id')
      .eq('org_id', ctx.orgId)
      .eq('integration_id', integration.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (acctErr) {
      return {
        success: false,
        result_data: { mode: 'live', stage: 'ad_account_lookup' },
        error_message: `Google ad_account lookup failed: ${acctErr.message}`,
      }
    }
    if (!account) {
      return {
        success: false,
        result_data: { mode: 'live', stage: 'ad_account_missing' },
        error_message: 'No Google ad_account discovered for this organization yet — run a Google sync first',
      }
    }
    customerId = String(account.platform_account_id).replace(/-/g, '')
  }

  // 3. Refresh OAuth access token. Token never logged.
  let accessToken: string
  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: oauthClientId,
        client_secret: oauthClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })
    if (!tokenResp.ok) {
      const detail = await tokenResp.text().catch(() => '')
      return {
        success: false,
        result_data: { mode: 'live', stage: 'oauth_refresh', http_status: tokenResp.status },
        error_message: `Google OAuth refresh failed (HTTP ${tokenResp.status}): ${detail.slice(0, 200)}`,
      }
    }
    const tokenJson = (await tokenResp.json()) as { access_token?: string }
    if (!tokenJson.access_token) {
      return {
        success: false,
        result_data: { mode: 'live', stage: 'oauth_refresh' },
        error_message: 'Google OAuth refresh returned no access_token',
      }
    }
    accessToken = tokenJson.access_token
  } catch (e) {
    const err = e as Error
    return {
      success: false,
      result_data: { mode: 'live', stage: 'oauth_refresh_transport' },
      error_message: `Google OAuth transport failed: ${err.message}`,
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  }
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId

  // 4. Step 1: create the CampaignBudget. Default amount = 1,000,000 micros
  //    ($1.00) when caller does not provide daily_budget. Google Ads
  //    requires a budget for SEARCH/DISPLAY/VIDEO channel types.
  const dailyBudgetDollars =
    typeof params.daily_budget === 'number' &&
    Number.isFinite(params.daily_budget) &&
    params.daily_budget > 0
      ? params.daily_budget
      : 1
  const budgetMicros = Math.round(dailyBudgetDollars * 1_000_000)

  const budgetUrl = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${encodeURIComponent(customerId)}/campaignBudgets:mutate`
  const budgetBody = {
    operations: [
      {
        create: {
          // Budget name must be unique per customer; suffix with timestamp
          // to allow idempotent retry from a different request_id (which
          // would otherwise collide on the campaign_name above).
          name: `${campaign_name} Budget ${new Date().toISOString()}`,
          amount_micros: String(budgetMicros),
          delivery_method: 'STANDARD',
        },
      },
    ],
  }

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
  })

  const t0 = Date.now()
  let budgetResp: Response
  let budgetRespBody: unknown
  try {
    budgetResp = await fetch(budgetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(budgetBody),
    })
    budgetRespBody = await budgetResp.json().catch(() => null)
  } catch (e) {
    const err = e as Error
    return {
      success: false,
      result_data: { mode: 'live', stage: 'budget_transport' },
      error_message: `Google Ads budget transport: ${err?.message ?? 'fetch failed'}`,
    }
  }

  if (!budgetResp.ok) {
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'budget_create',
        http_status: budgetResp.status,
        body: budgetRespBody,
        customer_id: customerId,
      },
      error_message:
        typeof budgetRespBody === 'object' && budgetRespBody !== null
          ? safeStringify(budgetRespBody)
          : `Google Ads budget HTTP ${budgetResp.status}`,
    }
  }

  // Extract the budget resource_name from the response.
  // Shape: { results: [{ resource_name: "customers/{cid}/campaignBudgets/{id}" }] }
  let budgetResourceName: string | null = null
  if (budgetRespBody && typeof budgetRespBody === 'object') {
    const r = (budgetRespBody as Record<string, unknown>).results
    if (Array.isArray(r) && r.length > 0 && typeof r[0] === 'object' && r[0] !== null) {
      const rn = (r[0] as Record<string, unknown>).resource_name
      if (typeof rn === 'string') budgetResourceName = rn
    }
  }
  if (!budgetResourceName) {
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'budget_response_parse',
        http_status: budgetResp.status,
        body: budgetRespBody,
      },
      error_message: 'Google Ads budget create returned no resource_name',
    }
  }

  // 5. Step 2: create the Campaign linked to the new budget. status=PAUSED
  //    hard-coded for safety. advertising_channel_type defaults to SEARCH;
  //    callers can override via params.advertising_channel_type (e.g.
  //    'DISPLAY', 'VIDEO').
  const channelType =
    typeof params.advertising_channel_type === 'string' && params.advertising_channel_type.length > 0
      ? params.advertising_channel_type
      : 'SEARCH'

  const campaignUrl = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${encodeURIComponent(customerId)}/campaigns:mutate`
  const campaignBody = {
    operations: [
      {
        create: {
          name: campaign_name,
          status: 'PAUSED',
          advertising_channel_type: channelType,
          campaign_budget: budgetResourceName,
        },
      },
    ],
  }

  let campaignResp: Response
  let campaignRespBody: unknown
  try {
    campaignResp = await fetch(campaignUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(campaignBody),
    })
    campaignRespBody = await campaignResp.json().catch(() => null)
  } catch (e) {
    const latency_ms = Date.now() - t0
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
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
    // Budget exists but campaign create failed → orphan budget. Log but do
    // not auto-delete — operator prunes via Google Ads dashboard.
    // Continuation #49 — request_id correlation (ctx.requestId already in
    // scope; same pattern as #48 [billing-usage] / [connect-oauth] fixes).
    console.warn(
      `[exec][req=${ctx.requestId ?? 'no-request-id'}] orphaned Google Ads budget ${budgetResourceName} for org=${ctx.orgId} (campaign create transport failed)`,
    )
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'campaign_transport',
        orphaned_budget: budgetResourceName,
      },
      error_message: `Google Ads campaign transport: ${err?.message ?? 'fetch failed'}`,
    }
  }

  const latency_ms = Date.now() - t0
  const ok = campaignResp.ok

  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    latency_ms,
    http_status: campaignResp.status,
    ok,
  })

  if (!ok) {
    // Continuation #49 — request_id correlation (sibling fix to the
    // transport-failure orphan warn above).
    console.warn(
      `[exec][req=${ctx.requestId ?? 'no-request-id'}] orphaned Google Ads budget ${budgetResourceName} for org=${ctx.orgId} (campaign create HTTP ${campaignResp.status})`,
    )
    return {
      success: false,
      result_data: {
        mode: 'live',
        stage: 'campaign_create',
        http_status: campaignResp.status,
        body: campaignRespBody,
        customer_id: customerId,
        orphaned_budget: budgetResourceName,
      },
      error_message:
        typeof campaignRespBody === 'object' && campaignRespBody !== null
          ? safeStringify(campaignRespBody)
          : `HTTP ${campaignResp.status}`,
    }
  }

  // Extract created campaign resource_name.
  let campaignResourceName: string | null = null
  if (campaignRespBody && typeof campaignRespBody === 'object') {
    const r = (campaignRespBody as Record<string, unknown>).results
    if (Array.isArray(r) && r.length > 0 && typeof r[0] === 'object' && r[0] !== null) {
      const rn = (r[0] as Record<string, unknown>).resource_name
      if (typeof rn === 'string') campaignResourceName = rn
    }
  }

  return {
    success: true,
    result_data: {
      mode: 'live',
      customer_id: customerId,
      budget_resource_name: budgetResourceName,
      campaign_resource_name: campaignResourceName,
      campaign_name,
      advertising_channel_type: channelType,
      status: 'PAUSED',
      http_status: campaignResp.status,
      body: campaignRespBody,
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
      request_id: ctx.requestId,
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
      request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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
      request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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

// ─── Slack post_message helpers (Phase Ω.8A.1) ────────────────────────
//
// Deterministic plain-text composition shared by the simulated + real
// dispatch paths so the audit row's `result_data.normalized_payload`
// records exactly what was (or would have been) posted.

function composeSlackText(params: Record<string, unknown>): string {
  const title = typeof params.title === 'string' ? params.title.trim() : ''
  const message = typeof params.message === 'string' ? params.message.trim() : ''
  return [title, message].filter(Boolean).join('\n\n')
}

// ─── Real slack.post_message (incoming webhook) ───────────────────────
//
// Posts a plain-text message to the org's connected Slack incoming webhook.
// The webhook URL is a single-value non-OAuth secret resolved per-request
// from Supabase Vault via `integrations.provider_secret_id` — never stored
// raw in a DB column, never an OAuth token. `assertCredentialShape()`
// enforces the credential-ownership invariant before the secret is read.
//
// SLACK_DEFAULT_WEBHOOK_URL is a dev-only fallback for orgs that have not
// connected a Slack integration row; production orgs MUST connect one.
//
// Idempotency is enforced upstream by `executeAction` via `executionId`,
// so retries never double-post: a replay short-circuits before this
// function is invoked.

async function realSlackPostMessage(
  params: Record<string, unknown>,
  ctx: HandlerCtx,
): Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }> {
  const text = composeSlackText(params)
  if (text.length === 0) {
    return {
      success: false,
      result_data: {},
      error_message: 'message missing or invalid',
    }
  }

  // Resolve the per-org Slack incoming-webhook URL.
  let webhookUrl: string
  let tokenSource: string
  try {
    const { data: integ, error: integErr } = await supabaseAdmin
      .from('integrations')
      .select('platform, vault_refresh_token_secret_id, provider_secret_id')
      .eq('org_id', ctx.orgId)
      .eq('platform', 'slack')
      .maybeSingle()
    if (integErr) {
      throw new Error(`slack integration lookup failed: ${integErr.message}`)
    }
    if (integ) {
      // shape-registry enforces: a slack integrations row carries its
      // credential in provider_secret_id ONLY (never an OAuth column).
      const { secretId } = assertCredentialShape(integ)
      webhookUrl = await readSecret(secretId)
      tokenSource = 'vault:integration:slack'
    } else if (SLACK_DEFAULT_WEBHOOK_URL) {
      webhookUrl = SLACK_DEFAULT_WEBHOOK_URL
      tokenSource = 'env:SLACK_DEFAULT_WEBHOOK_URL'
    } else {
      return {
        success: false,
        result_data: { mode: 'live' },
        error_message:
          'no Slack integration connected for this org and SLACK_DEFAULT_WEBHOOK_URL is unset',
      }
    }
  } catch (e) {
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        name: err?.name,
        message: `Slack credential resolution failed: ${err?.message ?? 'unknown'}`,
      },
    })
    return {
      success: false,
      result_data: { mode: 'live', stage: 'credential' },
      error_message: `Slack credential resolution failed: ${err?.message ?? 'unknown'}`,
    }
  }

  // Defense-in-depth: only ever POST to a real Slack webhook host.
  if (!isValidSlackWebhookUrl(webhookUrl)) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: { message: 'resolved Slack webhook URL is malformed' },
    })
    return {
      success: false,
      result_data: { mode: 'live', stage: 'credential' },
      error_message:
        'resolved Slack webhook URL is malformed (expected https://hooks.slack.com/services/...)',
    }
  }

  // Step: log BEFORE the external call. The webhook URL is NOT logged.
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
  })

  const t0 = Date.now()
  let postResult: { ok: boolean; http_status: number; body: string }
  try {
    postResult = await postToSlackWebhook(webhookUrl, text)
  } catch (e) {
    const latency_ms = Date.now() - t0
    const err = e as Error
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.api_response',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
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
      error_message: `Slack transport: ${err?.message ?? 'fetch failed'}`,
    }
  }

  const latency_ms = Date.now() - t0
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_response',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
    trace_id: ctx.traceId,
    ai_decision_id: ctx.aiDecisionId,
    template_id: ctx.templateId,
    platform: ctx.platform,
    action_type: ctx.actionType,
    mode: 'live',
    latency_ms,
    http_status: postResult.http_status,
    ok: postResult.ok,
  })

  if (!postResult.ok) {
    return {
      success: false,
      result_data: {
        mode: 'live',
        http_status: postResult.http_status,
        slack_response: postResult.body,
        token_source: tokenSource,
      },
      error_message: `Slack webhook rejected the post: ${
        postResult.body || `HTTP ${postResult.http_status}`
      }`,
    }
  }

  return {
    success: true,
    result_data: {
      mode: 'live',
      http_status: postResult.http_status,
      token_source: tokenSource,
      // Exact payload sent — kept verbatim for the audit row.
      normalized_payload: { text },
    },
  }
}

// ─── Real email.send_digest (Resend, text/plain) ──────────────────────
//
// Sends a deterministic plain-text digest to the calling org's admins via
// Resend. The raw structured `digest` param is recorded by `executeAction`
// in `decision_history.data_used.params`; this function records the EXACT
// normalized body it sends in `result_data.normalized_payload`. The two
// never drift because `normalizeForEmail` is deterministic.
//
// text/plain ONLY — no HTML, no markdown. Recipient list is computed
// server-side from `users` (org admins), never from caller params.

async function realEmailSendDigest(
  params: Record<string, unknown>,
  ctx: HandlerCtx,
): Promise<{ success: boolean; result_data: Record<string, unknown>; error_message?: string }> {
  const subject = params.subject
  if (typeof subject !== 'string' || subject.length === 0) {
    return {
      success: false,
      result_data: {},
      error_message: 'subject missing or invalid',
    }
  }

  const rawDigest = params.digest
  if (
    typeof rawDigest !== 'object' ||
    rawDigest === null ||
    Array.isArray(rawDigest)
  ) {
    return {
      success: false,
      result_data: {},
      error_message: 'digest missing or invalid (expected an object)',
    }
  }

  const normalized = normalizeForEmail(rawDigest as EmailDigestInput)
  const normalizedPayload = {
    text: normalized.text,
    truncated: normalized.truncated,
    total_chars: normalized.total_chars,
    sections_count: normalized.sections_count,
    metrics_count: normalized.metrics_count,
  }

  if (normalized.text.length === 0) {
    return {
      success: false,
      result_data: { mode: 'live', normalized_payload: normalizedPayload },
      error_message: 'digest normalized to an empty body; nothing sent',
    }
  }

  if (!RESEND_API_KEY) {
    logExec({
      ts: new Date().toISOString(),
      phase: 'exec.error',
      org_id: ctx.orgId,
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      ai_decision_id: ctx.aiDecisionId,
      template_id: ctx.templateId,
      platform: ctx.platform,
      action_type: ctx.actionType,
      mode: 'live',
      error: {
        message:
          'EMAIL_SEND_DIGEST_LIVE=true but RESEND_API_KEY is not configured',
      },
    })
    return {
      success: false,
      result_data: { mode: 'live', normalized_payload: normalizedPayload },
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
      request_id: ctx.requestId,
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
      result_data: { mode: 'live', normalized_payload: normalizedPayload },
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
        mode: 'live',
        normalized_payload: normalizedPayload,
        recipients_total: allEmails.length,
        recipients_real: 0,
      },
      error_message:
        allEmails.length === 0
          ? 'no admin recipients in this org'
          : 'all admin emails are placeholders; nothing sent',
    }
  }

  // Step: log BEFORE the external call. Recipient addresses are NOT logged.
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.api_call',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
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
        // text/plain ONLY — the deterministic normalized body.
        text: normalized.text,
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
      request_id: ctx.requestId,
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
      result_data: {
        mode: 'live',
        stage: 'transport',
        normalized_payload: normalizedPayload,
      },
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
    request_id: ctx.requestId,
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
        normalized_payload: normalizedPayload,
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
      message_id:
        bodyObj && typeof bodyObj.id === 'string' ? bodyObj.id : null,
      // Exact body sent — paired with the raw digest in data_used.params.
      normalized_payload: normalizedPayload,
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

  // 0b. Phase 4 Part 2 — Per-org execution rate limit (DB-backed).
  //     Counts decision_history rows for the calling org in the last 60s.
  //     Rejects with code='RATE_LIMITED' when the configured cap is reached.
  //     Idempotent replays do not reach this point (early-return above), so
  //     they do not count toward the limit. Set ACTION_EXECUTION_MAX_PER_MINUTE
  //     to 0 in env to disable.
  if (ACTION_EXECUTION_MAX_PER_MINUTE > 0) {
    const sinceIso = new Date(Date.now() - 60_000).toISOString()
    const { count: recentCount, error: rlErr } = await supabaseAdmin
      .from('decision_history')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', input.orgId)
      .gte('created_at', sinceIso)
    if (rlErr) {
      const err = new Error(
        `executeAction: rate-limit lookup failed: ${rlErr.message}`,
      ) as Error & { code: string }
      err.code = 'RATE_LIMIT_LOOKUP_FAILED'
      throw err
    }
    if ((recentCount ?? 0) >= ACTION_EXECUTION_MAX_PER_MINUTE) {
      const err = new Error(
        `executeAction: org ${input.orgId} exceeded ${ACTION_EXECUTION_MAX_PER_MINUTE} executions/minute`,
      ) as Error & { code: string; retryAfterSeconds: number }
      err.code = 'RATE_LIMITED'
      err.retryAfterSeconds = 60
      throw err
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
      .select('trace_id, result, confidence_score, reasoning_steps')
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

  // 5. Decide the high-level mode label for [exec] logs + decision_history.data_used.
  //
  // OBSERVABILITY-ONLY label. NOT consumed by dispatch, idempotency, Vault
  // resolution, or any execution-semantic surface — those run independently
  // below + inside ACTION_HANDLERS / realMeta* / realGoogle* handlers.
  //
  // 2026-05-09 (continuation #26 → #27) — observability parity widening.
  //
  // History:
  //   - Phase 4 minimal close: label authored covering only meta.pause_campaign
  //     (the only live-capable handler at that point).
  //   - Continuations #5 (google.pause_campaign) / #20 (meta.create_campaign +
  //     google.create_campaign) added new live-capable dispatch tuples but
  //     did NOT widen this label, so their live executions persisted
  //     mode='simulated' in decision_history.data_used despite firing real
  //     provider APIs. Truthful runtime mode remained available via the
  //     handlers' own result_data.mode='live', which flows into
  //     impact_snapshot — a SEPARATE field. The pre-dispatch label was
  //     just under-extended.
  //   - Continuation #21 Part B made resolveMetaAccessToken Vault-aware;
  //     pause_campaign dispatch dropped its env-gate at the same time, but
  //     the label was not updated.
  //   - Continuation #26 corrected the meta.pause_campaign label to match
  //     post-#21 dispatch (env-gate removed).
  //   - Continuation #27 (this) widens the label across ALL live-capable
  //     handlers by mirroring each ACTION_HANDLERS dispatch conjunction
  //     verbatim. NO dispatch logic changed; NO handler internals changed;
  //     NO Vault resolution changed; NO env precedence changed. Inline +
  //     explicit per the established Phase 4 minimal architecture style;
  //     no isLive() helper / no factored abstraction (would create a
  //     second source of truth that could drift from dispatch).
  //
  // PARITY: each disjunct below must be a verbatim mirror of the
  // corresponding ACTION_HANDLERS.<action_type> dispatch test. If a
  // dispatch is changed, the matching disjunct here MUST be updated
  // in the same continuation.
  const liveCandidate =
    // mirror ACTION_HANDLERS.pause_campaign metaLiveAllowed (lines 322-327; #3+#4 then #21B)
    (t.platform === 'meta' &&
     t.action_type === 'pause_campaign' &&
     META_PAUSE_CAMPAIGN_LIVE &&
     (META_LIVE_ORG_ALLOWLIST.length === 0 ||
       META_LIVE_ORG_ALLOWLIST.includes(input.orgId))) ||
    // mirror ACTION_HANDLERS.pause_campaign googleLiveAllowed (lines 336-340; Phase 4 P2 #5)
    (t.platform === 'google' &&
     t.action_type === 'pause_campaign' &&
     GOOGLE_PAUSE_CAMPAIGN_LIVE &&
     (GOOGLE_LIVE_ORG_ALLOWLIST.length === 0 ||
       GOOGLE_LIVE_ORG_ALLOWLIST.includes(input.orgId))) ||
    // mirror ACTION_HANDLERS.increase_budget liveAllowed (lines 358-363; Phase 4 minimal)
    // env-gate preserved verbatim — separate semantic-gap follow-up tracked
    // for *_budget Vault adoption; out of scope for this label-only pass.
    (t.platform === 'meta' &&
     t.action_type === 'increase_budget' &&
     META_INCREASE_BUDGET_LIVE &&
     Boolean(META_TEST_ACCESS_TOKEN) &&
     (META_LIVE_ORG_ALLOWLIST.length === 0 ||
       META_LIVE_ORG_ALLOWLIST.includes(input.orgId))) ||
    // mirror ACTION_HANDLERS.decrease_budget liveAllowed (lines 380-385; Phase 4 minimal)
    // env-gate preserved verbatim — same separate follow-up as above.
    (t.platform === 'meta' &&
     t.action_type === 'decrease_budget' &&
     META_DECREASE_BUDGET_LIVE &&
     Boolean(META_TEST_ACCESS_TOKEN) &&
     (META_LIVE_ORG_ALLOWLIST.length === 0 ||
       META_LIVE_ORG_ALLOWLIST.includes(input.orgId))) ||
    // mirror ACTION_HANDLERS.send_alert_email liveAllowed (lines 402-407; Phase 4 minimal)
    // NOTE: send_alert_email dispatch does NOT gate on t.platform — handler
    // accepts any platform context; reuses META_LIVE_ORG_ALLOWLIST as a
    // shared kill-switch. Mirror this verbatim — do NOT add a platform check.
    (t.action_type === 'send_alert_email' &&
     SEND_ALERT_EMAIL_LIVE &&
     Boolean(RESEND_API_KEY) &&
     (META_LIVE_ORG_ALLOWLIST.length === 0 ||
       META_LIVE_ORG_ALLOWLIST.includes(input.orgId))) ||
    // mirror ACTION_HANDLERS.create_campaign metaLiveAllowed (lines 430-435; Phase 6 Sub-C #20)
    // env-gate preserved verbatim — same separate follow-up as *_budget.
    (t.platform === 'meta' &&
     t.action_type === 'create_campaign' &&
     META_CREATE_CAMPAIGN_LIVE &&
     Boolean(META_TEST_ACCESS_TOKEN) &&
     (META_LIVE_ORG_ALLOWLIST.length === 0 ||
       META_LIVE_ORG_ALLOWLIST.includes(input.orgId))) ||
    // mirror ACTION_HANDLERS.create_campaign googleLiveAllowed (lines 441-445; Phase 6 Sub-C #20)
    (t.platform === 'google' &&
     t.action_type === 'create_campaign' &&
     GOOGLE_CREATE_CAMPAIGN_LIVE &&
     (GOOGLE_LIVE_ORG_ALLOWLIST.length === 0 ||
       GOOGLE_LIVE_ORG_ALLOWLIST.includes(input.orgId))) ||
    // mirror ACTION_HANDLERS.post_message liveAllowed (Phase Ω.8A.1) —
    // Slack credential is per-org Vault, resolved inside the handler; not
    // mirrored here (this label gates on flag + allowlist only).
    (t.platform === 'slack' &&
     t.action_type === 'post_message' &&
     SLACK_POST_MESSAGE_LIVE &&
     (META_LIVE_ORG_ALLOWLIST.length === 0 ||
       META_LIVE_ORG_ALLOWLIST.includes(input.orgId))) ||
    // mirror ACTION_HANDLERS.send_digest liveAllowed (Phase Ω.8A.1)
    (t.platform === 'email' &&
     t.action_type === 'send_digest' &&
     EMAIL_SEND_DIGEST_LIVE &&
     Boolean(RESEND_API_KEY) &&
     (META_LIVE_ORG_ALLOWLIST.length === 0 ||
       META_LIVE_ORG_ALLOWLIST.includes(input.orgId)))
  const mode: 'simulated' | 'live' = liveCandidate ? 'live' : 'simulated'

  const ctx: HandlerCtx = {
    orgId: input.orgId,
    platform: t.platform,
    actionType: t.action_type,
    templateId: t.id,
    traceId,
    aiDecisionId,
    // request_id from tracingMiddleware (mounted at app level in index.ts).
    // Threaded through every logExec emission so [exec] lines join the
    // same request_id namespace as [req] envelope and [err] lines.
    requestId: input.requestId ?? null,
  }

  // 6. exec.start lifecycle log (Phase 4 strict requirement: log BEFORE).
  const tStart = Date.now()
  logExec({
    ts: new Date().toISOString(),
    phase: 'exec.start',
    org_id: ctx.orgId,
    request_id: ctx.requestId,
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
    request_id: ctx.requestId,
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
      // CLAUDE.md §9 mandates ai_explanation describes "why the AI decided this".
      // Derived from the linked ai_decisions.reasoning_steps when present;
      // null when execution is purely manual (no AI involvement to explain).
      ai_explanation: aiLink ? deriveAIExplanation(aiLink.reasoning_steps) : null,
      confidence_score: aiLink?.confidence_score ?? null,
      ai_decision_id: input.aiDecisionId ?? null,
      // Phase 4 Part 2 audit linkage. Both columns are NULLABLE per
      // 20260507130000_phase4_part2_automation.sql. Manual executions
      // omit them; automation-engine.ts threads them via fireRule().
      automation_rule_id: input.automationRuleId ?? null,
      automation_run_id:  input.automationRunId  ?? null,
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
