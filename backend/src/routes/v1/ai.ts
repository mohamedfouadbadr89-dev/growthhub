/**
 * /api/v1/ai routes — Phase 3 entry surface.
 *
 * Each route here is a thin HTTP wrapper around the Phase 3 service
 * layer (executeAIDecision). The route does NOT:
 *   - call validateAIResponse / persistAIDecision / logAIInteraction directly
 *   - read org_id from request body
 *
 * Carve-out (Phase 7 Sub-pass A1b, continuation #17): routes here DO touch
 * supabaseAdmin for the credit gate (`deduct_credits` before AI execution
 * and `refund_credits` on failure). This mirrors the canonical pattern
 * established at `routes/v1/creatives.ts:POST /generate` (lines 80-101 +
 * 117-152) — credit RPCs are the only DB write authority granted to AI
 * route handlers. The AI lifecycle (validate/persist/log) remains owned
 * by the service layer.
 *
 * Auth / org_id injection: routes/v1/index.ts mounts authMiddleware on
 * all /api/v1/* paths BEFORE registering /ai, so c.get('orgId') and
 * c.get('userId') are guaranteed populated server-side here.
 *
 * Per CLAUDE.md §3 + CONSTITUTION.md §1.2 / §1.3:
 *   - Backend is single writer; this file does not bypass that.
 *   - Every DB query is org-scoped (executeAIDecision → persistAIDecision
 *     hard-codes the org_id we pass in, never reads it from AI output).
 */

import { Hono } from 'hono'
import { getOpenRouterClient } from '../../services/ai/openrouter.js'
import {
  executeAIDecision,
  AIPipelineError,
} from '../../services/ai/execute-ai-decision.js'
import { ok, fail } from '../../utils/response.js'
import { supabaseAdmin } from '../../lib/supabase.js'

// Phase 7 Sub-pass A1b (continuation #17): fixed per-call AI credit cost.
// Mirrors the `CREDIT_COSTS` pattern in services/creatives/creative-generator.ts
// (`copy: 2, image: 10`) — fixed integer per call, NOT a pricing-derivation
// computation. Token-aware cost derivation is explicitly out of scope per
// operator authorization ("NO pricing logic / NO rate derivation").
const AI_CALL_COST = 1

// requestId is set by tracingMiddleware mounted at app level (index.ts:53);
// guaranteed present before any v1 handler runs. Declaring it here makes
// c.get('requestId') type-safe without having to cast at each call site.
type Variables = { userId: string; orgId: string; requestId: string }

export const aiRouter = new Hono<{ Variables: Variables }>()

// ─── POST /api/v1/ai/decisions/generate ───────────────────────────────
// Real Phase 3 entry — replaces the prior mock that returned a hardcoded
// {success:true,data:{type,result,confidence_score}} regardless of input.
//
// Backward-compatibility note:
//   - URL preserved (no callers broken by routing).
//   - Success-data field names {type, result, confidence_score} preserved
//     at the same depth, so any caller that reads only those three keys
//     continues to work.
//   - Additive fields {reasoning_steps, decision_id, trace_id} are appended
//     for transparency and Phase 3 contract surfacing.
//   - The legacy mock accepted any body (including no body). The real
//     pipeline requires a `prompt`. Callers that send no body now receive
//     a structured 400 ({success:false, error:{phase:'request', message}})
//     instead of a silent fake success — per CONSTITUTION §3 "Fail Loudly".
//
// Identical setup to POST /api/v1/ai/execute below (same OpenRouter client,
// same AI Output Contract system prompt, same providerCall pattern).
// Difference: legacy-shaped success payload + default `kind: 'decision'`.
aiRouter.post('/decisions/generate', async (c) => {
  const org_id = c.get('orgId')
  const user_id = c.get('userId')

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return fail(c, 'invalid JSON body', 400, { phase: 'request' })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail(c, 'body must be a JSON object', 400, { phase: 'request' })
  }

  const { prompt, model, kind } = body as {
    prompt?: unknown
    model?: unknown
    kind?: unknown
  }
  if (prompt === undefined || prompt === null) {
    return fail(c, 'prompt is required', 400, { phase: 'request' })
  }
  // Cost-leak guard: reject empty / whitespace-only string prompts BEFORE
  // any OpenRouter call. Pre-fix, `prompt: ""` / `"   "` / `"\t\n"` would
  // pass the undefined/null gate, reach `client.chat.completions.create`,
  // burn provider credits, and persist a vacuous row to `ai_decisions`.
  // Non-string prompts (objects, arrays, primitives) continue to flow
  // through the existing `JSON.stringify(prompt)` fallback — this guard
  // covers only the most common accidental case (string typed but empty).
  if (typeof prompt === 'string' && prompt.trim() === '') {
    return fail(c, 'prompt must not be empty or whitespace-only', 400, { phase: 'request' })
  }

  const finalModel =
    typeof model === 'string' && model.length > 0
      ? model
      : process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-001'
  const finalKind = typeof kind === 'string' ? kind : 'decision'

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return fail(c, 'OPENROUTER_API_KEY is not configured', 500, { phase: 'transport' })
  }
  const client = getOpenRouterClient(apiKey)

  // Same AI Output Contract system prompt as /execute. The validator
  // (utils/aiValidator) rejects anything that doesn't match exactly.
  // Path F (2026-05-09): optional top-level "category" string added.
  // Maps to automation_rules.trigger_type for the auto-fire hook
  // (services/ai/execute-ai-decision.ts:308). Omit when no categorical
  // label applies — fallback shim still extracts from result.category.
  const systemPrompt =
    'You are an AI decision engine for a growth-operations platform. ' +
    'Respond ONLY with a single JSON object that matches this exact contract: ' +
    '{"type":"dashboard"|"insight"|"decision",' +
    '"result": <any JSON value>,' +
    '"confidence_score": <number between 0 and 1 inclusive>,' +
    '"reasoning_steps": [{"step": <non-empty string>, "insight": <non-empty string>}, ...],' +
    '"category"?: <optional non-empty string label such as ROAS_DROP, SPEND_SPIKE, CONVERSION_DROP, SCALING_OPPORTUNITY>}. ' +
    '"reasoning_steps" must contain at least one entry. ' +
    '"category" is optional; include it when the decision corresponds to a recognizable categorical signal that an automation rule could trigger on; omit it otherwise. ' +
    'Do not include markdown, code fences, prose, or any keys other than the five above.'

  const userContent =
    typeof prompt === 'string' ? prompt : JSON.stringify(prompt)

  const providerCall = async (): Promise<unknown> => {
    const completion = await client.chat.completions.create({
      model: finalModel,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    })
    const content = completion.choices[0]?.message?.content ?? ''
    try {
      return JSON.parse(content)
    } catch {
      return content
    }
  }

  // Phase 7 Sub-pass A1b credit gate. Mirrors creatives.ts:80-101.
  // LTD orgs (plan_type='ltd') skip the gate (BYOK semantics per CLAUDE.md
  // §11). Subscription orgs deduct AI_CALL_COST atomically; insufficient
  // balance → 402 INSUFFICIENT_CREDITS without any provider call. The
  // inline plan_type query intentionally avoids importing creatives'
  // `resolveApiKey` which would also enforce BYOK_REQUIRED for LTD-without-
  // vault — out of scope per "preserve existing AI behavior verbatim
  // except insufficient-credit gating".
  let creditsDeducted = 0
  {
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .select('plan_type')
      .eq('org_id', org_id)
      .single()
    if (orgErr) {
      return fail(c, `Billing check failed: ${orgErr.message}`, 500, { phase: 'unknown' })
    }
    const isLtd = org?.plan_type === 'ltd'
    if (!isLtd) {
      const { data: newBalance, error: deductErr } = await supabaseAdmin.rpc('deduct_credits', {
        p_org_id: org_id,
        p_amount: AI_CALL_COST,
      })
      if (deductErr) {
        return fail(c, `Billing check failed: ${deductErr.message}`, 500, { phase: 'unknown' })
      }
      if ((newBalance as number) < 0) {
        return fail(c, 'Insufficient credits for this AI call', 402, { code: 'INSUFFICIENT_CREDITS', phase: 'request' })
      }
      creditsDeducted = AI_CALL_COST
    }
  }

  try {
    const result = await executeAIDecision({
      org_id,
      user_id,
      // request_id from tracingMiddleware (mounted at app level in index.ts)
      // — stamped on every [AI] log line for outer per-HTTP-request correlation
      // alongside the per-AI-flow trace_id minted inside executeAIDecision.
      request_id: c.get('requestId'),
      model: finalModel,
      kind: finalKind,
      prompt,
      providerCall,
    })
    // Legacy-compatible response: {type, result, confidence_score} are at
    // the original depth. Additive Phase 3 fields appended. Path F (2026-
    // 05-09) — optional `category` surfaced when present so frontend
    // consumers can render the categorical label without re-querying
    // ai_decisions.category.
    return ok(c, {
      type: result.response.type,
      result: result.response.result,
      confidence_score: result.response.confidence_score,
      reasoning_steps: result.response.reasoning_steps,
      ...(result.response.category !== undefined ? { category: result.response.category } : {}),
      decision_id: result.decision_id,
      trace_id: result.trace_id,
    })
  } catch (err) {
    // Refund on AI flow failure. Successful AI calls do NOT refund per
    // operator authorization ("successful AI calls MUST NOT auto-refund").
    if (creditsDeducted > 0) {
      await supabaseAdmin
        .rpc('refund_credits', { p_org_id: org_id, p_amount: creditsDeducted })
        .then(() => null, () => null)
    }
    if (err instanceof AIPipelineError) {
      const status =
        err.phase === 'transport' ? 502 :
        err.phase === 'validation' ? 422 :
        500
      return fail(c, err.message, status, { phase: err.phase, trace_id: err.trace_id })
    }
    const e = err as Error
    return fail(c, e?.message ?? 'unknown error', 500, { phase: 'unknown' })
  }
})

// ─── POST /api/v1/ai/execute ──────────────────────────────────────────
// Single Phase-3 entry point. Runs:
//   AI call → log request → log raw → validate → log validated → persist
// All lifecycle work is delegated to executeAIDecision; this handler
// only translates HTTP <-> service-layer types.
//
// Request body:
//   { prompt: <any JSON>, model?: string, kind?: string }
//
// Success response:
//   { success: true, data: { decision_id, response, trace_id } }
//
// Failure response:
//   { success: false, error: { phase, message, trace_id? } }
aiRouter.post('/execute', async (c) => {
  // 1. Server-side identity. authMiddleware has already validated these.
  const org_id = c.get('orgId')
  const user_id = c.get('userId')

  // 2. Parse + minimally validate the request body. We do NOT trust
  //    the client for org_id / user_id — those keys, even if present,
  //    are ignored. This is enforced structurally below: we only
  //    forward `prompt`, `model`, `kind` from the body.
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return fail(c, 'invalid JSON body', 400, { phase: 'request' })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail(c, 'body must be a JSON object', 400, { phase: 'request' })
  }

  const { prompt, model, kind } = body as {
    prompt?: unknown
    model?: unknown
    kind?: unknown
  }
  if (prompt === undefined || prompt === null) {
    return fail(c, 'prompt is required', 400, { phase: 'request' })
  }
  // Cost-leak guard: reject empty / whitespace-only string prompts BEFORE
  // any OpenRouter call. Pre-fix, `prompt: ""` / `"   "` / `"\t\n"` would
  // pass the undefined/null gate, reach `client.chat.completions.create`,
  // burn provider credits, and persist a vacuous row to `ai_decisions`.
  // Non-string prompts (objects, arrays, primitives) continue to flow
  // through the existing `JSON.stringify(prompt)` fallback — this guard
  // covers only the most common accidental case (string typed but empty).
  if (typeof prompt === 'string' && prompt.trim() === '') {
    return fail(c, 'prompt must not be empty or whitespace-only', 400, { phase: 'request' })
  }

  const finalModel =
    typeof model === 'string' && model.length > 0
      ? model
      : process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.0-flash-001'
  const finalKind = typeof kind === 'string' ? kind : undefined

  // 3. Provider-call thunk. Built once per request, called once by
  //    executeAIDecision. The handler itself does not log or measure;
  //    that is the orchestration function's job.
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return fail(c, 'OPENROUTER_API_KEY is not configured', 500, { phase: 'transport' })
  }
  const client = getOpenRouterClient(apiKey)

  // System prompt that demands the AI Output Contract from the model:
  //   { type, result, confidence_score, reasoning_steps, category? }
  // The validator will reject anything else with a structured detail.
  // Path F (2026-05-09): optional top-level "category" string added.
  // Maps to automation_rules.trigger_type for the auto-fire hook
  // (services/ai/execute-ai-decision.ts:308). Omit when no categorical
  // label applies — fallback shim still extracts from result.category.
  const systemPrompt =
    'You are an AI decision engine for a growth-operations platform. ' +
    'Respond ONLY with a single JSON object that matches this exact contract: ' +
    '{"type":"dashboard"|"insight"|"decision",' +
    '"result": <any JSON value>,' +
    '"confidence_score": <number between 0 and 1 inclusive>,' +
    '"reasoning_steps": [{"step": <non-empty string>, "insight": <non-empty string>}, ...],' +
    '"category"?: <optional non-empty string label such as ROAS_DROP, SPEND_SPIKE, CONVERSION_DROP, SCALING_OPPORTUNITY>}. ' +
    '"reasoning_steps" must contain at least one entry. ' +
    '"category" is optional; include it when the decision corresponds to a recognizable categorical signal that an automation rule could trigger on; omit it otherwise. ' +
    'Do not include markdown, code fences, prose, or any keys other than the five above.'

  const userContent =
    typeof prompt === 'string' ? prompt : JSON.stringify(prompt)

  const providerCall = async (): Promise<unknown> => {
    const completion = await client.chat.completions.create({
      model: finalModel,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    })
    const content = completion.choices[0]?.message?.content ?? ''
    // If the model produced parseable JSON, hand the parsed object to the
    // validator. If not, hand the raw string through — the validator will
    // reject it with a structured detail (and the "raw" log entry inside
    // executeAIDecision will preserve whatever the model actually said).
    try {
      return JSON.parse(content)
    } catch {
      return content
    }
  }

  // 4. Phase 7 Sub-pass A1b credit gate (mirrors /decisions/generate above).
  //    LTD orgs skip the gate; subscription orgs deduct AI_CALL_COST and
  //    receive 402 INSUFFICIENT_CREDITS on insufficient balance — no
  //    provider call is made when the gate fails.
  let creditsDeducted = 0
  {
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .select('plan_type')
      .eq('org_id', org_id)
      .single()
    if (orgErr) {
      return fail(c, `Billing check failed: ${orgErr.message}`, 500, { phase: 'unknown' })
    }
    const isLtd = org?.plan_type === 'ltd'
    if (!isLtd) {
      const { data: newBalance, error: deductErr } = await supabaseAdmin.rpc('deduct_credits', {
        p_org_id: org_id,
        p_amount: AI_CALL_COST,
      })
      if (deductErr) {
        return fail(c, `Billing check failed: ${deductErr.message}`, 500, { phase: 'unknown' })
      }
      if ((newBalance as number) < 0) {
        return fail(c, 'Insufficient credits for this AI call', 402, { code: 'INSUFFICIENT_CREDITS', phase: 'request' })
      }
      creditsDeducted = AI_CALL_COST
    }
  }

  // 5. Run the unified Phase 3 flow.
  try {
    const result = await executeAIDecision({
      org_id,
      user_id,
      // request_id from tracingMiddleware (mounted at app level in index.ts)
      // — stamped on every [AI] log line for outer per-HTTP-request correlation
      // alongside the per-AI-flow trace_id minted inside executeAIDecision.
      request_id: c.get('requestId'),
      model: finalModel,
      kind: finalKind,
      prompt,
      providerCall,
    })
    return ok(c, {
      decision_id: result.decision_id,
      response: result.response,
      trace_id: result.trace_id,
    })
  } catch (err) {
    // Refund on AI flow failure. Successful AI calls do NOT refund.
    if (creditsDeducted > 0) {
      await supabaseAdmin
        .rpc('refund_credits', { p_org_id: org_id, p_amount: creditsDeducted })
        .then(() => null, () => null)
    }
    if (err instanceof AIPipelineError) {
      // Map pipeline phase to a sensible HTTP status. Body shape is fixed
      // by the Phase 1 envelope and identical across statuses.
      const status =
        err.phase === 'transport' ? 502 :
        err.phase === 'validation' ? 422 :
        500
      return fail(c, err.message, status, { phase: err.phase, trace_id: err.trace_id })
    }

    // Anything not a typed pipeline error is unexpected. Surface it
    // without leaking internals — but never silently swallow.
    const e = err as Error
    return fail(c, e?.message ?? 'unknown error', 500, { phase: 'unknown' })
  }
})
