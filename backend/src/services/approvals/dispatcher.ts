/**
 * Approval-queue WRITE chain dispatcher — continuation #50.
 *
 * SOURCE OF TRUTH:
 *   - specs/AI_OPERATING_MODEL.md §4 "Approval-Required Actions"
 *   - specs/AI_OPERATING_MODEL.md §8 "Decision Center Philosophy"
 *       ("Operators MUST be able to: approve / reject / edit /
 *         inspect reasoning / inspect confidence / inspect action previews")
 *   - supabase/migrations/20260512210000_phase0_approval_queue.sql (#43 substrate)
 *
 * SCOPE:
 *   This module owns the state transitions on `approval_queue` rows:
 *
 *     pending → approved → executed   (via approveAndDispatch)
 *     pending → rejected               (via reject)
 *
 *   It does NOT:
 *     - decide WHICH AI decisions get enqueued (no auto-enqueue rule)
 *     - invent approval thresholds, risk classes, or severity scoring
 *     - touch the existing #23 auto-fire chain (evaluateRulesForAIDecision)
 *     - bypass the existing executeAction canonical dispatcher
 *
 *   Per AI_OPERATING_MODEL.md §13 missing-semantics list, the enqueue
 *   policy (which decisions auto-fire vs require approval) remains an
 *   explicit operator decision. This module operates on whatever rows
 *   already exist in approval_queue — populated by:
 *     - operator manual INSERT via ops tooling (#43 substrate-only ship);
 *     - future operator-authorized auto-enqueue rule.
 *
 * EXECUTION SEMANTICS:
 *   - APPROVE flow (approveAndDispatch):
 *       1. Atomic UPDATE pending → approved (race-safe via state filter)
 *       2. Dispatch via canonical executeAction (creates decision_history +
 *          automation_runs audit rows automatically)
 *       3. On dispatch success: UPDATE approved → executed
 *       4. On dispatch failure: row stays at 'approved'; operator inspects
 *          decision_history / automation_runs for the failure record.
 *
 *   - REJECT flow (reject):
 *       1. Atomic UPDATE pending → rejected with optional operator_note
 *       2. No dispatch. Terminal state.
 *
 *   Both operations are state-machine guarded — only `pending` rows can
 *   transition. Re-approving an already-approved row, or rejecting a
 *   rejected row, returns ApprovalNotFoundError. This preserves the
 *   audit trail's one-direction lifecycle.
 *
 * ORG ISOLATION:
 *   Every UPDATE/SELECT scopes on (id, org_id). RLS policy on the table
 *   provides defense-in-depth. No org_id ever flows from request body.
 *
 * IDEMPOTENCY:
 *   The state-filter on UPDATE (`.eq('state', 'pending')`) makes both
 *   operations idempotent: a duplicate POST returns 404 NOT_FOUND
 *   because the row is no longer in `pending` state.
 */

import { supabaseAdmin } from '../../lib/supabase.js'
import { executeAction } from '../execution/action-executor.js'

/**
 * Approval row not found, wrong org, or no longer in `pending` state.
 * Maps to HTTP 404 at the route layer. The state-filter check makes
 * "already approved" / "already rejected" indistinguishable from
 * "doesn't exist" — intentional, since either case is a no-op for the
 * caller's perspective (the requested transition cannot be applied).
 */
export class ApprovalNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const
  constructor(message = 'Approval not found or not in pending state') {
    super(message)
    this.name = 'ApprovalNotFoundError'
  }
}

export interface ApproveAndDispatchInput {
  orgId: string
  approvalId: string
  userId: string
  requestId: string
}

export interface ApproveAndDispatchResult {
  id: string
  /**
   * Final state. `executed` = dispatch succeeded and audit rows are
   * written. `approved` = dispatch failed; row stays approved so
   * operator can inspect decision_history / automation_runs and
   * decide whether to retry manually.
   */
  new_state: 'approved' | 'executed'
  history_id?: string
}

/**
 * Transition pending → approved → executed, dispatching through the
 * canonical executeAction. Returns the final state.
 */
export async function approveAndDispatch(
  input: ApproveAndDispatchInput,
): Promise<ApproveAndDispatchResult> {
  // 1. Atomic pending → approved transition (org-scoped, race-safe)
  const { data, error } = await supabaseAdmin
    .from('approval_queue')
    .update({
      state: 'approved',
      operator_user_id: input.userId,
    })
    .eq('id', input.approvalId)
    .eq('org_id', input.orgId)
    .eq('state', 'pending')
    .select('id, ai_decision_id, action_template_id, action_params')
    .single()

  if (error) {
    // PGRST116 = "no rows" — row missing, wrong org, or not pending.
    // Race-safe: a duplicate POST loses to the first; second sees
    // state != pending and returns 404.
    if (error.code === 'PGRST116') {
      throw new ApprovalNotFoundError()
    }
    throw new Error(`approval_queue approve update failed: ${error.message}`)
  }
  if (!data) {
    throw new ApprovalNotFoundError()
  }

  // 2. If no action_template_id, this is a notification-only approval
  //    (Tier 3 conversational outputs that don't map to a discrete
  //    action template). Approve marks executed immediately; nothing
  //    to dispatch.
  if (!data.action_template_id) {
    await supabaseAdmin
      .from('approval_queue')
      .update({ state: 'executed' })
      .eq('id', input.approvalId)
      .eq('org_id', input.orgId)
    return { id: input.approvalId, new_state: 'executed' }
  }

  // 3. Dispatch via canonical executeAction. Audit rows
  //    (decision_history + automation_runs) are created inside
  //    executeAction; idempotency is keyed on executionId which we
  //    DO NOT supply here — operator-triggered approvals are one-shot
  //    per row (the approval row's UUID acts as the natural dedup key
  //    via the pending-state filter on step 1).
  let historyId: string | undefined
  try {
    const exec = await executeAction({
      orgId: input.orgId,
      templateId: data.action_template_id as string,
      params: (data.action_params as Record<string, unknown>) ?? {},
      // `manual` per AI_OPERATING_MODEL.md §4 — operator approval is
      // the human-in-the-loop trigger, not an autonomous rule fire.
      executedBy: 'manual',
      requestId: input.requestId,
      aiDecisionId: (data.ai_decision_id as string) ?? undefined,
      // No automationRuleId / automationRunId — this is approval-flow
      // dispatch, distinct from the #23/#24 auto-fire chain. Both
      // chains create decision_history rows but only the auto-fire
      // chain links automation_rules/runs.
    })
    historyId = exec.historyId

    // 4. Success path: transition approved → executed
    await supabaseAdmin
      .from('approval_queue')
      .update({ state: 'executed' })
      .eq('id', input.approvalId)
      .eq('org_id', input.orgId)

    return { id: input.approvalId, new_state: 'executed', history_id: historyId }
  } catch (dispatchErr) {
    // Dispatch failed; row stays at 'approved'. Operator can inspect
    // decision_history / automation_runs for the failure record and
    // manually retry by inserting a fresh approval_queue row or by
    // direct ops action. Loud warn with request_id correlation per
    // the #48/#49 observability pattern.
    console.error(
      `[approvals][req=${input.requestId}] dispatch failed for ` +
        `approval=${input.approvalId} org=${input.orgId} ` +
        `template=${data.action_template_id}: ` +
        `${(dispatchErr as Error)?.message ?? 'unknown'}`,
    )
    return { id: input.approvalId, new_state: 'approved' }
  }
}

export interface RejectInput {
  orgId: string
  approvalId: string
  userId: string
  note?: string
}

export interface RejectResult {
  id: string
  new_state: 'rejected'
}

/**
 * Transition pending → rejected with optional operator note. No
 * dispatch. Terminal state. Idempotent via the pending-state filter.
 */
export async function reject(input: RejectInput): Promise<RejectResult> {
  const { data, error } = await supabaseAdmin
    .from('approval_queue')
    .update({
      state: 'rejected',
      operator_user_id: input.userId,
      operator_note: input.note ?? null,
    })
    .eq('id', input.approvalId)
    .eq('org_id', input.orgId)
    .eq('state', 'pending')
    .select('id')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ApprovalNotFoundError()
    }
    throw new Error(`approval_queue reject update failed: ${error.message}`)
  }
  if (!data) {
    throw new ApprovalNotFoundError()
  }

  return { id: input.approvalId, new_state: 'rejected' }
}
