// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 1.
// Prompt-engineering + response-parsing helpers for the Copilot.
//
// AI call routing: the existing canonical endpoint
//   POST /api/v1/ai/decisions/generate
// is reused. The server-side system prompt is fixed (aiValidator
// contract); we embed Copilot-specific instructions inside the
// operator-supplied user prompt so the AI returns a workflow draft
// inside the `result` field.
//
// CRITICAL SAFETY: Copilot generations MUST NEVER auto-trigger rules.
// The instructions below explicitly tell the AI to:
//   1. Use `type='insight'` (not 'decision')
//   2. OMIT the `category` field entirely
// Because the post-persist hook `evaluateRulesForAIDecision()` only
// matches rules when `ai_decisions.category` aligns with an existing
// rule's `trigger_type`, omitting category prevents ANY rule from
// auto-firing on a Copilot draft. This is the only required defense;
// the validator accepts insight + omitted category as a valid shape.

import type { IntegrationProviderId, TemplateOutput } from "@/lib/workflow-templates";
import type { CopilotDraft, CopilotDraftStep } from "./types";
import { newDraftId } from "./storage";

const COPILOT_INSTRUCTIONS = `
You are an AI marketing operations copilot. The operator described a workflow they want to automate. Produce a structured workflow draft.

CRITICAL OUTPUT REQUIREMENTS:
1. Set "type" to "insight" (this is ideation, not a decision that should fire automation).
2. OMIT the "category" field entirely (do not include it in the response).
3. Place your workflow draft inside the "result" field as JSON with this exact shape:

{
  "workflow_draft": {
    "name": "<short marketer-facing workflow name>",
    "description": "<one sentence outcome>",
    "trigger": {
      "label": "<human-readable trigger like 'Every Monday at 9:00 AM'>",
      "description": "<short trigger description>",
      "kind": "schedule" | "metric_threshold" | "manual" | "ai_signal" | "event",
      "cadence": "daily" | "weekly" | "monthly"   // only when kind='schedule'
    },
    "steps": [
      {
        "kind": "action" | "condition" | "approval" | "ai_summary",
        "label": "<short step label>",
        "description": "<one sentence what this step does>",
        "integration": "<provider id from the allowed list>" | null,
        "action_type": "<dotted action_type slug like meta.pause_campaign>" | null,
        "params_summary": "<one-line summary of configured params>" | null
      }
    ],
    "outputs": [
      {
        "kind": "slack_message" | "email" | "slides_deck" | "sheets_row" | "notification" | "mutation",
        "description": "<one-line description of the operator-visible output>"
      }
    ],
    "integrations_required": [
      "<provider id from the allowed list>"
    ],
    "requires_approval": <true if any step is spend-increasing or launches a new campaign; false otherwise>,
    "primary_trigger_type": "ROAS_DROP" | "SPEND_SPIKE" | "CONVERSION_DROP" | "SCALING_OPPORTUNITY" | null,
    "primary_action_type": "<dotted action_type for the first action step>" | null,
    "primary_min_confidence_threshold": <integer 0-100, default 70>
  }
}

Allowed integration provider ids: meta, google_ads, shopify, tiktok, linkedin, ga4, sheets, slides, drive, bigquery, slack, email, search_console, ai.

Allowed action_type slugs (currently supported by the canonical action library):
- meta.pause_campaign
- meta.increase_budget       (spend-increasing — set requires_approval=true)
- meta.decrease_budget
- meta.create_campaign       (launch-capable — set requires_approval=true)
- google.pause_campaign
- google.create_campaign     (launch-capable — set requires_approval=true)
- send_alert_email

For steps that don't yet have a canonical executor (e.g. slack.post_message, sheets.append_row, slides.generate_report, ai.summarize), set action_type to null but describe what would happen.

Also produce reasoning_steps: 2-5 numbered explanations of why this workflow structure makes sense.

Provide a confidence_score between 0 and 1 reflecting how well the draft matches the operator's request.

Operator request:
`;

/**
 * Build the prompt body for /api/v1/ai/decisions/generate. The
 * returned string is the operator-supplied prompt prepended with
 * the Copilot instructions block.
 */
export function buildCopilotPrompt(operatorPrompt: string): string {
  return `${COPILOT_INSTRUCTIONS}\n\n"""${operatorPrompt.trim()}"""\n`;
}

/**
 * Shape returned by the existing AI endpoint when our prompt
 * succeeds. We only declare the fields we read.
 */
interface AIDecisionResponse {
  type?: string;
  result?: unknown;
  confidence_score?: number;
  reasoning_steps?: Array<{ step?: string; insight?: string }>;
  decision_id?: string;
  trace_id?: string;
}

interface ParsedWorkflowDraft {
  name: string;
  description: string;
  trigger: {
    label: string;
    description: string;
    kind: "schedule" | "metric_threshold" | "manual" | "ai_signal" | "event";
    cadence?: "daily" | "weekly" | "monthly";
  };
  steps: Array<{
    kind: "action" | "condition" | "approval" | "ai_summary";
    label: string;
    description: string;
    integration: IntegrationProviderId | null;
    action_type?: string | null;
    params_summary?: string | null;
  }>;
  outputs: TemplateOutput[];
  integrations_required: IntegrationProviderId[];
  requires_approval?: boolean;
  primary_trigger_type?: string | null;
  primary_action_type?: string | null;
  primary_min_confidence_threshold?: number;
}

/** Defensive type-narrower for the AI response shape */
function readWorkflowDraft(raw: unknown): ParsedWorkflowDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  // Two acceptable shapes:
  //   result.workflow_draft (preferred, explicit)
  //   result itself when shape matches (defensive fallback)
  const candidate = (obj.workflow_draft as Record<string, unknown> | undefined) ?? obj;
  if (!candidate || typeof candidate !== "object") return null;
  const draft = candidate as Record<string, unknown>;
  if (typeof draft.name !== "string" || typeof draft.description !== "string") return null;
  if (!draft.trigger || typeof draft.trigger !== "object") return null;
  if (!Array.isArray(draft.steps)) return null;
  // outputs and integrations_required default to empty arrays
  const outputs = Array.isArray(draft.outputs) ? draft.outputs : [];
  const integrations = Array.isArray(draft.integrations_required) ? draft.integrations_required : [];
  return {
    name: draft.name,
    description: draft.description,
    trigger: draft.trigger as ParsedWorkflowDraft["trigger"],
    steps: draft.steps as ParsedWorkflowDraft["steps"],
    outputs: outputs as TemplateOutput[],
    integrations_required: integrations as IntegrationProviderId[],
    requires_approval: typeof draft.requires_approval === "boolean" ? draft.requires_approval : false,
    primary_trigger_type: typeof draft.primary_trigger_type === "string" ? draft.primary_trigger_type : null,
    primary_action_type: typeof draft.primary_action_type === "string" ? draft.primary_action_type : null,
    primary_min_confidence_threshold:
      typeof draft.primary_min_confidence_threshold === "number"
        ? Math.max(0, Math.min(100, Math.round(draft.primary_min_confidence_threshold)))
        : 70,
  };
}

/**
 * Convert a parsed workflow draft into a localStorage-ready CopilotDraft.
 * Mints a fresh client-side id and timestamps.
 */
export function parseAIResponseToDraft(
  response: AIDecisionResponse,
  operatorPrompt: string,
): CopilotDraft | null {
  const wd = readWorkflowDraft(response.result);
  if (!wd) return null;
  const now = new Date().toISOString();
  const steps: CopilotDraftStep[] = wd.steps.map((s) => ({
    id: newDraftId(),
    kind: s.kind,
    label: s.label,
    description: s.description,
    integration: s.integration ?? null,
    action_type: s.action_type ?? undefined,
    params_summary: s.params_summary ?? undefined,
  }));
  return {
    id: newDraftId(),
    name: wd.name,
    description: wd.description,
    prompt: operatorPrompt,
    trigger: wd.trigger,
    steps,
    outputs: wd.outputs,
    integrations_required: wd.integrations_required,
    requires_approval: wd.requires_approval ?? false,
    primary_trigger_type: wd.primary_trigger_type ?? undefined,
    primary_action_type: wd.primary_action_type ?? undefined,
    primary_min_confidence_threshold: wd.primary_min_confidence_threshold,
    created_at: now,
    updated_at: now,
    source: "ai",
  };
}

/**
 * Example prompts shown as quick-start chips on the Copilot empty state.
 * Each is a real, parseable operator request — clicking populates the
 * textarea.
 */
export const EXAMPLE_PROMPTS: Array<{ label: string; prompt: string }> = [
  {
    label: "Weekly PPC report → Slides + Email",
    prompt:
      "Every Monday at 9 AM, pull last week's Google Ads metrics, generate a Slides deck with the highlights, and email it to me.",
  },
  {
    label: "Pause underperforming Meta campaigns daily",
    prompt:
      "Each day, when the AI detects a Meta campaign whose ROAS has dropped below my threshold for 24+ hours, pause it and notify me on Slack.",
  },
  {
    label: "Daily Shopify order digest to email",
    prompt:
      "Every morning at 8 AM, summarize yesterday's Shopify orders, revenue and top SKUs, and email the digest to me.",
  },
  {
    label: "Alert when CAC spikes >20%",
    prompt:
      "When customer acquisition cost spikes more than 20% above the 7-day average, send a Slack alert with the campaign that's driving the spike.",
  },
];
