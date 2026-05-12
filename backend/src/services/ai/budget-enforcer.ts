/**
 * AI Budget Enforcer — pre-flight daily cap check.
 *
 * SOURCE OF TRUTH:
 *   - specs/AI_OPERATING_MODEL.md §7 LLM Cost Governance
 *       ("per-org rate limits", "AI usage tracking", "AI budget protection")
 *   - specs/AI_OPERATING_MODEL.md §10 MVP item 4 (AI Budget Tracking)
 *       + item 6 (Observability + Rate Limits)
 *   - specs/AI_OPERATING_MODEL.md §13 line 622–628 (Execution Boundaries:
 *       "Claude MAY safely implement: rate limits, AI usage tracking")
 *   - Continuation #40 substrate: ai_usage_ledger table
 *
 * SCOPE:
 *   Pre-flight daily-count cap enforcement keyed on (org_id, operation_type)
 *   against env-var-driven global defaults. NOT per-plan tiering — per
 *   AI_OPERATING_MODEL.md §13 line 530 ("per-plan AI budgets") that
 *   semantics is operator-decision and "Claude MUST NOT invent these
 *   semantics autonomously" (§13 line 548). Env-var overrides are operator-
 *   AUTHORED, not Claude-invented; conservative defaults ship in code.
 *
 *   Per-org overrides via a future `org_ai_limits` table (§12 explicitly
 *   authorized) are DEFERRED to a follow-up continuation — that table is
 *   a substrate-only concern; this check reads only env + ledger.
 *
 * EXECUTION SEMANTICS:
 *   - LTD bypass: orgs with plan_type='ltd' SKIP the cap. Mirrors the
 *     existing credit-gate skip pattern in routes/v1/ai.ts:171 and
 *     routes/v1/creatives.ts:84 (BYOK orgs run on their own provider key
 *     per AI_OPERATING_MODEL.md §7 line 333; platform-side rate limiting
 *     is not the right gate for cost they pay themselves).
 *
 *   - Day boundary: UTC midnight. Matches ai_usage_ledger.created_at
 *     (TIMESTAMPTZ stored UTC). Per-customer-timezone gating is operator-
 *     decision per §13 missing-semantics (not invented here).
 *
 *   - Fail-open on infrastructure error: if the count query against
 *     ai_usage_ledger fails (DB unreachable / RLS denial / connection
 *     pool exhaustion / 42P01 if migration hasn't been applied yet),
 *     return allowed=true with a loud `[ai-budget]` warn line. Rationale:
 *     a transient DB error in the BUDGET CHECK must not gate legitimate
 *     AI calls — the existing deduct_credits gate (credit balance) plus
 *     the ai_usage_ledger ledger itself (observability) remain in place.
 *     CONSTITUTION §3 "Fail Loudly" satisfied via the warn line; the
 *     user-facing AI path is not poisoned by an observability-layer fault.
 *
 *   - Race window: a fast burst of N concurrent requests within a few ms
 *     may all pass the check before any ledger row from those requests
 *     gets inserted (recordAIUsage is fire-and-forget post-success).
 *     For SMB scale + conservative defaults the race window is acceptable.
 *     Future hardening could use an atomic stored procedure that inserts-
 *     and-counts in one transaction; deferred as a §12 follow-up.
 *
 * ENV VARS (operator-configurable; all integers; missing/invalid → default):
 *   AI_DAILY_LIMIT_AI_DECISION_GENERATE
 *   AI_DAILY_LIMIT_AI_EXECUTE
 *   AI_DAILY_LIMIT_CREATIVE_COPY
 *   AI_DAILY_LIMIT_CREATIVE_IMAGE
 *   AI_DAILY_LIMIT_DAILY_DIGEST
 *   AI_DAILY_LIMIT_CONVERSATIONAL_QUERY
 *   AI_DAILY_LIMIT_STRATEGIC_RECOMMENDATION
 */

import { supabaseAdmin } from '../../lib/supabase.js'
import type { AIUsageOperationType } from './usage-tracker.js'

/**
 * Conservative per-operation-type daily defaults. Operator overrides via
 * env vars (see header). These defaults are intentionally low for an
 * SMB MVP; raise via env for tested scale or per-customer overrides.
 *
 * `daily_digest` defaults to 1 because AI_OPERATING_MODEL.md §3 line 133
 * explicitly mandates "maximum ONE LLM digest per org per day".
 */
const DAILY_LIMIT_DEFAULTS: Record<AIUsageOperationType, number> = {
  ai_decision_generate:     500,
  ai_execute:               500,
  creative_copy:            100,
  creative_image:           50,
  daily_digest:             1, // §3 line 133 — HARD architectural cap (1/org/day)
  conversational_query:     200,
  strategic_recommendation: 50,
}

/**
 * Resolve the effective daily limit for an operation type.
 * Env var format: AI_DAILY_LIMIT_<UPPER_OPERATION_TYPE>
 * Falls back to DAILY_LIMIT_DEFAULTS on missing / invalid env value.
 */
function getDailyLimit(op: AIUsageOperationType): number {
  const envKey = `AI_DAILY_LIMIT_${op.toUpperCase()}`
  const raw = process.env[envKey]
  if (!raw) return DAILY_LIMIT_DEFAULTS[op]
  const parsed = parseInt(raw, 10)
  if (isNaN(parsed) || parsed < 0) {
    // Invalid env value — log loud and fall back to default. Treating
    // a malformed env as "no limit" would be silent-permissive; treating
    // it as "0 limit" would silently block all AI ops. Default is the
    // safe middle ground; loud warn lets the operator notice & fix.
    console.warn(
      `[ai-budget] env ${envKey} is not a valid non-negative integer (${raw}); ` +
        `falling back to default ${DAILY_LIMIT_DEFAULTS[op]}`,
    )
    return DAILY_LIMIT_DEFAULTS[op]
  }
  return parsed
}

/**
 * Continuation #42 — per-org override lookup.
 *
 * Reads the optional `org_ai_limits` row for (org_id, operation_type)
 * created by migration `20260512200000_phase0_org_ai_limits.sql`. Used
 * by `getEffectiveLimit` as the top-priority limit source — env vars +
 * code defaults are fallbacks.
 *
 * No row → return null. Missing table (42P01 before migration applied)
 * or any other infrastructure error → return null with loud warn. NULL
 * cascades to env/default fallback chain — same fail-OPEN posture as
 * the count query in `checkAIBudget`.
 *
 * Write API for `org_ai_limits` is INTENTIONALLY NOT shipped this
 * turn: per AI_OPERATING_MODEL.md §13 line 530 "per-plan AI budgets"
 * semantics require explicit operator decision. INSERT/UPDATE/DELETE
 * happen via ops tooling or future operator-authored admin surface.
 */
async function getOrgLimitOverride(
  orgId: string,
  op: AIUsageOperationType,
): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from('org_ai_limits')
    .select('daily_limit')
    .eq('org_id', orgId)
    .eq('operation_type', op)
    .maybeSingle()
  if (error) {
    console.warn(
      `[ai-budget] org_ai_limits lookup failed org=${orgId} op=${op} ` +
        `error=${error.message} — falling back to env/default`,
    )
    return null
  }
  if (!data) return null
  return data.daily_limit as number
}

/**
 * Resolve the effective daily limit through the full priority chain:
 *   1. org_ai_limits row for (org_id, operation_type)
 *   2. env var AI_DAILY_LIMIT_<UPPER_OP_TYPE>
 *   3. code constant DAILY_LIMIT_DEFAULTS[op]
 *
 * Used internally by checkAIBudget; exported for use by the
 * `GET /api/v1/billing/usage` endpoint so operators can see the
 * effective limit for each operation type alongside actual usage.
 */
export async function getEffectiveLimit(
  orgId: string,
  op: AIUsageOperationType,
): Promise<number> {
  const override = await getOrgLimitOverride(orgId, op)
  if (override !== null) return override
  return getDailyLimit(op)
}

/**
 * Seconds-until-next-UTC-midnight. Used by route handlers to set the
 * `Retry-After` header on 429 responses. Counts begin again at UTC
 * midnight per the UTC-day-boundary semantics of `checkAIBudget`.
 *
 * Floored to a non-negative integer; the trailing fractional second
 * matters less than emitting a header that conforms to RFC 7231
 * (delta-seconds is integer-typed).
 */
export function secondsUntilUtcMidnight(): number {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(24, 0, 0, 0)
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
}

export interface BudgetCheckResult {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  /** Set when the check was skipped for a structural reason (e.g. LTD plan). */
  bypassed?: 'ltd'
}

/**
 * Typed error so route handlers can distinguish rate-limit denials from
 * other failures and map them to the canonical envelope with code='RATE_LIMITED'
 * and HTTP 429.
 */
export class AIBudgetExceededError extends Error {
  readonly code = 'RATE_LIMITED' as const
  constructor(
    public readonly orgId: string,
    public readonly operationType: AIUsageOperationType,
    public readonly used: number,
    public readonly limit: number,
  ) {
    super(
      `AI daily budget exceeded for operation '${operationType}': ${used}/${limit} requests used today`,
    )
    this.name = 'AIBudgetExceededError'
  }
}

/**
 * Pre-flight budget check.
 *
 * Returns a BudgetCheckResult; caller decides response shape. Does NOT
 * throw on infrastructure failure (fail-open per header rationale). Does
 * NOT throw on over-cap — caller compares `.allowed` and converts to a
 * 429 with AIBudgetExceededError if desired.
 */
export async function checkAIBudget(
  orgId: string,
  operationType: AIUsageOperationType,
): Promise<BudgetCheckResult> {
  // ── LTD bypass ────────────────────────────────────────────────────
  // Mirrors existing credit-gate skip: routes/v1/ai.ts:171,
  // routes/v1/creatives.ts:84. LTD orgs run on their own provider key
  // (BYOK per AI_OPERATING_MODEL.md §7 line 333); platform-side rate
  // limiting is not the right gate for their self-borne cost.
  //
  // Failures of this lookup fail-open (allowed=true) — same rationale
  // as the ledger count query: an observability-layer fault must not
  // gate user-visible AI paths.
  try {
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .select('plan_type')
      .eq('org_id', orgId)
      .single()
    if (orgErr) {
      console.warn(
        `[ai-budget] plan_type lookup failed org=${orgId} error=${orgErr.message} — ` +
          `failing OPEN (allowing the call)`,
      )
      // Continue to limit check rather than returning immediately —
      // the count query may still succeed and provide a real verdict.
    }
    if (org?.plan_type === 'ltd') {
      return {
        allowed:   true,
        used:      0,
        limit:     0,
        remaining: Number.POSITIVE_INFINITY,
        bypassed:  'ltd',
      }
    }
  } catch (err) {
    console.warn(
      `[ai-budget] plan_type lookup threw org=${orgId} ` +
        `error=${(err as Error)?.message ?? 'unknown'} — failing OPEN`,
    )
    // Same as above — proceed to count check.
  }

  // Continuation #42 — effective-limit chain: org override → env → default.
  // Each layer is operator-controlled (operator INSERT/UPDATE for overrides,
  // operator deploy-config for env, operator-authored migration for defaults).
  const limit = await getEffectiveLimit(orgId, operationType)

  // ── Daily count query ────────────────────────────────────────────
  // UTC day boundary. ai_usage_ledger.created_at is TIMESTAMPTZ NOT NULL
  // DEFAULT now() (see 20260512190000_phase0_ai_usage_ledger.sql).
  // head:true + count:'exact' returns the count without fetching rows.
  const startOfDayUTC = new Date()
  startOfDayUTC.setUTCHours(0, 0, 0, 0)

  const { count, error } = await supabaseAdmin
    .from('ai_usage_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('operation_type', operationType)
    .gte('created_at', startOfDayUTC.toISOString())

  if (error) {
    // Fail-open per header rationale. Loud warn for operator triage.
    // PGRST116 ("0 rows") is NOT expected here because count queries
    // do not raise it; any error is a real infrastructure fault.
    console.warn(
      `[ai-budget] count query failed org=${orgId} op=${operationType} ` +
        `error=${error.message} — failing OPEN`,
    )
    return { allowed: true, used: 0, limit, remaining: limit }
  }

  const used = count ?? 0
  return {
    allowed:   used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}

/**
 * Convenience wrapper: runs checkAIBudget and throws AIBudgetExceededError
 * when over-cap. Use in route handlers that prefer try/catch flow.
 *
 * Returns the BudgetCheckResult on success (allowed=true OR bypassed='ltd').
 */
export async function enforceAIBudget(
  orgId: string,
  operationType: AIUsageOperationType,
): Promise<BudgetCheckResult> {
  const result = await checkAIBudget(orgId, operationType)
  if (!result.allowed) {
    throw new AIBudgetExceededError(orgId, operationType, result.used, result.limit)
  }
  return result
}
