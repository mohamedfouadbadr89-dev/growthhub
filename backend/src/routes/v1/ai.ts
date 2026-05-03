/**
 * /api/v1/ai routes — Phase 3 entry surface.
 *
 * Each route here is a thin HTTP wrapper around the Phase 3 service
 * layer (executeAIDecision). The route does NOT:
 *   - call validateAIResponse / persistAIDecision / logAIInteraction directly
 *   - touch supabaseAdmin
 *   - read org_id from request body
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

type Variables = { userId: string; orgId: string }

export const aiRouter = new Hono<{ Variables: Variables }>()

// ─── Existing mock for backwards compatibility ────────────────────────
aiRouter.post('/decisions/generate', async (c) => {
  return c.json({
    success: true,
    data: {
      type: 'decision',
      result: 'Mock decision output',
      confidence_score: 0.85,
    },
  })
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
    return c.json(
      { success: false, error: { phase: 'request', message: 'invalid JSON body' } },
      400,
    )
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json(
      { success: false, error: { phase: 'request', message: 'body must be a JSON object' } },
      400,
    )
  }

  const { prompt, model, kind } = body as {
    prompt?: unknown
    model?: unknown
    kind?: unknown
  }
  if (prompt === undefined || prompt === null) {
    return c.json(
      { success: false, error: { phase: 'request', message: 'prompt is required' } },
      400,
    )
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
    return c.json(
      {
        success: false,
        error: { phase: 'transport', message: 'OPENROUTER_API_KEY is not configured' },
      },
      500,
    )
  }
  const client = getOpenRouterClient(apiKey)

  // System prompt that demands the AI Output Contract from the model:
  //   { type, result, confidence_score, reasoning_steps }
  // The validator will reject anything else with a structured detail.
  const systemPrompt =
    'You are an AI decision engine for a growth-operations platform. ' +
    'Respond ONLY with a single JSON object that matches this exact contract: ' +
    '{"type":"dashboard"|"insight"|"decision",' +
    '"result": <any JSON value>,' +
    '"confidence_score": <number between 0 and 1 inclusive>,' +
    '"reasoning_steps": [{"step": <non-empty string>, "insight": <non-empty string>}, ...]}. ' +
    '"reasoning_steps" must contain at least one entry. ' +
    'Do not include markdown, code fences, prose, or any keys other than the four above.'

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

  // 4. Run the unified Phase 3 flow.
  try {
    const result = await executeAIDecision({
      org_id,
      user_id,
      model: finalModel,
      kind: finalKind,
      prompt,
      providerCall,
    })
    return c.json(
      {
        success: true,
        data: {
          decision_id: result.decision_id,
          response: result.response,
          trace_id: result.trace_id,
        },
      },
      200,
    )
  } catch (err) {
    if (err instanceof AIPipelineError) {
      // Map pipeline phase to a sensible HTTP status. Body shape is fixed
      // by the spec and identical across statuses.
      const status =
        err.phase === 'transport' ? 502 :
        err.phase === 'validation' ? 422 :
        500
      return c.json(
        {
          success: false,
          error: {
            phase: err.phase,
            message: err.message,
            trace_id: err.trace_id,
          },
        },
        status,
      )
    }

    // Anything not a typed pipeline error is unexpected. Surface it
    // without leaking internals — but never silently swallow.
    const e = err as Error
    return c.json(
      {
        success: false,
        error: {
          phase: 'unknown',
          message: e?.message ?? 'unknown error',
        },
      },
      500,
    )
  }
})
