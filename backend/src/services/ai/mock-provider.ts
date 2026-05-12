/**
 * Mock AI provider — continuation #53.
 *
 * Development-only deterministic mock for the OpenRouter `providerCall`
 * thunk in routes/v1/ai.ts. Lets operators verify the full AI pipeline
 * (validate → persist → log_ai_usage → recordAIUsage → auto-fire →
 * approval enqueue → /api/v1/approvals WRITE chain) end-to-end WITHOUT
 * burning real OpenAI / OpenRouter credits.
 *
 * GOVERNANCE INVARIANTS (operator constraints at #53 authorization):
 *
 *   1. development-only
 *   2. must be disabled in production
 *      → Double-gated: requires BOTH `MOCK_AI=true` AND
 *        `NODE_ENV !== 'production'`. Even if MOCK_AI=true leaks into
 *        production env, the NODE_ENV check stops it. Defense in depth.
 *
 *   3. no new infrastructure
 *      → No tables, no migrations, no orchestration layer. One service
 *        file with three small functions.
 *
 *   4. no contract changes
 *      → The mock thunk returns an object that passes
 *        utils/aiValidator.ts validateAIResponse unchanged. The thunk
 *        signature `() => Promise<unknown>` matches what the route
 *        handlers already construct for the real OpenRouter call.
 *
 *   5. preserve existing AI execution flow
 *      → executeAIDecision orchestration is UNTOUCHED. The mock
 *        intervenes at the providerCall layer only (the route handler
 *        passes a different thunk; everything downstream — validator,
 *        persistence, logging, auto-fire, approval enqueue — runs
 *        verbatim against the mock output).
 *
 *   6. inject deterministic mock AIResponse objects
 *      → Output is identical across calls for the same configured
 *        category. No randomness. No clock dependence. Testability +
 *        replayability for ops scripts.
 *
 *   7. allow approval-flow end-to-end verification without external OpenAI
 *      → Mock output carries a category by default
 *        (env-overridable; see MOCK_AI_CATEGORY) so operators can set
 *        APPROVAL_REQUIRED_CATEGORIES to include it and observe the
 *        full enqueue → /approvals → approve/reject path.
 *
 *   8. minimal-diff
 *      → ~130 LOC across this file + ~25 LOC modifications across
 *        ai.ts + index.ts.
 *
 * PRODUCTION SAFETY:
 *   `isMockAIEnabled()` returns false in production unconditionally.
 *   Any provider-call code path that checks this gate will fall through
 *   to the real OpenRouter call in production, even if `MOCK_AI=true`
 *   was accidentally set in deploy config. The `warnIfMockAIEnabled()`
 *   startup hook makes the active state loudly visible in dev logs so
 *   operators NEVER ship a build with the mock active.
 *
 * ENV VARS:
 *   MOCK_AI=true                    Enable mock (dev only)
 *   NODE_ENV                        Must NOT be 'production' for mock to activate
 *   MOCK_AI_CATEGORY=<label>        Optional override for the mock category
 *                                    (default: 'TEST_CATEGORY')
 *   MOCK_AI_CONFIDENCE=<0..1>       Optional override for the mock confidence_score
 *                                    (default: 0.85; must be in [0, 1])
 */

const DEFAULT_MOCK_CATEGORY = 'TEST_CATEGORY'
const DEFAULT_MOCK_CONFIDENCE = 0.85

/**
 * Double-gated mock activation check.
 * Both MOCK_AI=true AND NODE_ENV != production must hold.
 */
export function isMockAIEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.MOCK_AI === 'true'
}

function getMockCategory(): string {
  const raw = process.env.MOCK_AI_CATEGORY
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim()
  }
  return DEFAULT_MOCK_CATEGORY
}

function getMockConfidence(): number {
  const raw = process.env.MOCK_AI_CONFIDENCE
  if (!raw) return DEFAULT_MOCK_CONFIDENCE
  const n = parseFloat(raw)
  if (isNaN(n) || n < 0 || n > 1) {
    // Invalid env: fall back to default. Loud warn only at startup
    // (see warnIfMockAIEnabled below) to avoid log spam per call.
    return DEFAULT_MOCK_CONFIDENCE
  }
  return n
}

export interface MockProviderCallInput {
  /** Original prompt — recorded in the mock response.result for echo verification. */
  prompt: unknown
  /** Optional caller-supplied label — passed through into result.kind for testability. */
  kind?: string
}

/**
 * Build a thunk that returns a deterministic AIResponse-shaped object.
 * The output passes utils/aiValidator.ts validateAIResponse without
 * modification, so the entire downstream pipeline runs verbatim.
 *
 * Output shape:
 *   {
 *     type: 'decision',
 *     result: {
 *       message: 'Mock AI execution — deterministic stub response',
 *       prompt_echo: <input.prompt>,
 *       kind: <input.kind ?? null>,
 *     },
 *     confidence_score: <MOCK_AI_CONFIDENCE or 0.85>,
 *     reasoning_steps: [
 *       { step: 'mock', insight: 'Deterministic mock AI response (MOCK_AI=true)' }
 *     ],
 *     category: <MOCK_AI_CATEGORY or 'TEST_CATEGORY'>,
 *   }
 *
 * NOTE: this thunk is invoked ONCE per AI request (mirroring the real
 * providerCall semantics). No retries, no caching, no async fakery —
 * just an immediate resolution.
 */
export function buildMockProviderCall(input: MockProviderCallInput): () => Promise<unknown> {
  return async () => {
    return {
      type: 'decision',
      result: {
        message: 'Mock AI execution — deterministic stub response',
        prompt_echo: input.prompt,
        kind: input.kind ?? null,
      },
      confidence_score: getMockConfidence(),
      reasoning_steps: [
        {
          step: 'mock',
          insight: 'Deterministic mock AI response (MOCK_AI=true)',
        },
      ],
      category: getMockCategory(),
    }
  }
}

/**
 * Startup-time loud warn when the mock is active. Called from
 * backend/src/index.ts alongside #52's validateApprovalEnqueueConfig.
 * Operators must NEVER see this line in production logs.
 *
 * Silent when MOCK_AI is unset or NODE_ENV=production (the gate
 * already excludes those cases).
 */
export function warnIfMockAIEnabled(): void {
  if (!isMockAIEnabled()) return

  // Strongly worded warn — operators should never miss this if it
  // accidentally appears in a non-dev log stream.
  // eslint-disable-next-line no-console
  console.warn(
    `[STARTUP][ai-mock] ⚠️  MOCK AI MODE ACTIVE — every /api/v1/ai/* ` +
      `request will return a deterministic stub response WITHOUT calling ` +
      `OpenRouter. NEVER deploy with MOCK_AI=true to production. ` +
      `Mock category=${getMockCategory()} confidence_score=${getMockConfidence()}. ` +
      `Combine with APPROVAL_REQUIRED_CATEGORIES=${getMockCategory()} to ` +
      `verify approval enqueue flow end-to-end.`,
  )
}
