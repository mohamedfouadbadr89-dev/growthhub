// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 8 helper.
// Activation bridge from a Copilot draft into the existing #111
// Create-Rule flow at /actions/automation. This module does NOT
// execute anything — it constructs a URL with `?prefill=<draft_id>`
// that the existing Create-Rule page consumes to open its modal
// with prefilled fields. Single canonical execution path preserved.

import type { CopilotDraft } from "./types";

/**
 * Construct the activation URL for a draft. The draft's `primary_*`
 * fields populate the Create-Rule modal; the existing modal then
 * POSTs to /api/v1/automation/rules — the canonical write path.
 *
 * For template-sourced drafts the prefill key is the template slug
 * (stable across reloads). For AI-sourced drafts it's the draft id
 * (localStorage-keyed; resolved on the destination page).
 */
export function activationHrefForDraft(draft: CopilotDraft): string {
  const key = draft.source === "template" && draft.template_slug
    ? draft.template_slug
    : draft.id;
  return `/actions/automation?prefill=${encodeURIComponent(key)}`;
}

/**
 * Whether this draft has enough hints to populate the Create-Rule
 * form's required fields (name, trigger_type, action_template_id).
 * Used to decide between primary-CTA enabled vs. an honest "this
 * draft needs a clearer action step" empty-state.
 */
export function draftIsActivatable(draft: CopilotDraft): boolean {
  if (draft.name.trim() === "") return false;
  if (!draft.primary_action_type) return false;
  // primary_trigger_type can be null when the draft is purely
  // schedule-driven; the Create form supports that via the schedule
  // path. For v1 (no schedule infra), require an AI-signal trigger_type
  // so the rule has somewhere to fire from.
  if (!draft.primary_trigger_type) return false;
  return true;
}
