// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 (AI Copilot).
// Type definitions for in-flight + persisted Copilot drafts. Drafts
// are INERT — they do not execute. They round-trip through localStorage
// and into the existing #111 Create-Rule flow via `?prefill=<draft_id>`.
//
// Shape intentionally aligns with `WorkflowTemplate.steps` so a draft
// can be hydrated from a template manifest entry without translation.
//
// NO RUNTIME PERSISTENCE. NO BACKEND TABLES. NO ORCHESTRATION.
// executeAction() remains the sole canonical runtime; drafts are
// configuration ideation only.

import type {
  TemplateStepKind,
  TemplateTrigger,
  TemplateOutput,
  IntegrationProviderId,
} from "@/lib/workflow-templates";

/**
 * Individual step inside a Copilot draft. Display-only fields plus
 * (when applicable) the action_template lookup hints used by the
 * Activate-primary-action bridge into the existing #111 Create form.
 */
export interface CopilotDraftStep {
  /** Client-side stable id (uuid v4) so React keys + edit drawer pinning works */
  id: string;
  kind: TemplateStepKind;
  label: string;
  description: string;
  integration: IntegrationProviderId | null;
  /**
   * Action-template slug ("meta.pause_campaign" etc.) — used to look up
   * the live UUID in actions_library when the operator activates the
   * primary action through the existing #111 Create-Rule flow. Optional
   * because not every step kind is an action (triggers, conditions,
   * approvals and AI-summary steps may have no action_type).
   */
  action_type?: string;
  /** One-line summary of configured params for the card body */
  params_summary?: string;
}

/**
 * Full Copilot draft. Persists to localStorage under
 * `growthhub.copilot.drafts.v1`. Activation does NOT persist server-side
 * — see lib/copilot-drafts/activation.ts (Step 8) for the bridge into
 * the canonical #111 Create-Rule flow.
 */
export interface CopilotDraft {
  /** Client-side uuid v4 */
  id: string;
  /** Operator-editable name (defaults to the AI-generated name) */
  name: string;
  /** Short description shown in lists */
  description: string;
  /** Original operator prompt that generated the draft */
  prompt: string;
  /** Trigger description (display only) */
  trigger: TemplateTrigger;
  /** Ordered list of steps */
  steps: CopilotDraftStep[];
  /** What the operator will receive (display only) */
  outputs: TemplateOutput[];
  /** Integrations this draft touches */
  integrations_required: IntegrationProviderId[];
  /**
   * Hints for the Activate-primary-action bridge. The first `action`
   * step provides these fields; if absent, the bridge falls back to
   * opening the Create form with name + trigger_type only.
   */
  primary_trigger_type?: string;
  primary_action_type?: string;
  primary_min_confidence_threshold?: number;
  /** When true, the bridge sets `enabled=false` on the prefilled form */
  requires_approval?: boolean;
  /** ISO timestamp */
  created_at: string;
  /** ISO timestamp; bumped on every save */
  updated_at: string;
  /**
   * Provenance:
   *   - 'ai'       — generated from a prompt via the AI Copilot
   *   - 'template' — cloned from a marketplace template manifest entry
   */
  source: "ai" | "template";
  /** When source='template', the originating template slug */
  template_slug?: string;
}

/**
 * Lightweight summary for the "My drafts" list — avoids loading every
 * step for the list view.
 */
export interface CopilotDraftSummary {
  id: string;
  name: string;
  description: string;
  step_count: number;
  source: "ai" | "template";
  template_slug?: string;
  updated_at: string;
}
