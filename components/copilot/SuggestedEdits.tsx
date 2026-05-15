"use client";

// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 7.
// Client-side heuristic suggestions for improving a draft. NO SECOND
// AI CALL — keeps the surface free + fast. Suggestions derive from:
//   - integrations the operator has connected but the draft doesn't use
//   - common adjacent integrations (e.g. draft uses Slides → suggest Drive archive)
//   - common refinements (e.g. "add Slack notification when ready")
//
// Each suggestion is actionable: clicking adds a real step to the draft.

import { Lightbulb, Plus } from "lucide-react";
import { useIntegrationStatus } from "@/lib/integration-status/context";
import { INTEGRATION_PROVIDERS, type IntegrationProviderId } from "@/lib/workflow-templates";
import { newDraftId } from "@/lib/copilot-drafts";
import type { CopilotDraft, CopilotDraftStep } from "@/lib/copilot-drafts";

interface Suggestion {
  id: string;
  label: string;
  /** Step to insert into the draft when operator clicks "Insert" */
  step: CopilotDraftStep;
}

function buildSuggestions(draft: CopilotDraft, statusMap: Record<string, string>): Suggestion[] {
  const usedIntegrations = new Set(draft.integrations_required);
  const hasSlack = usedIntegrations.has("slack");
  const hasEmail = usedIntegrations.has("email");
  const hasSheets = usedIntegrations.has("sheets");
  const hasSlides = usedIntegrations.has("slides");
  const hasBigQuery = usedIntegrations.has("bigquery");
  const hasReportingOutput = draft.outputs.some((o) =>
    o.kind === "slides_deck" || o.kind === "email" || o.kind === "sheets_row" || o.kind === "slack_message",
  );

  const out: Suggestion[] = [];

  // Suggest Slack notification when no comms output exists yet
  if (!hasSlack && !hasReportingOutput) {
    out.push({
      id: "add-slack",
      label: "Add a Slack notification when this workflow completes",
      step: {
        id: newDraftId(),
        kind: "action",
        label: "Send Slack message",
        description: "Notify your team channel when the workflow finishes.",
        integration: "slack",
        params_summary: "Channel: #marketing-alerts",
      },
    });
  }

  // Suggest BigQuery archive when reporting workflow exists
  if (hasSlides || hasSheets) {
    if (!hasBigQuery) {
      out.push({
        id: "add-bigquery",
        label: "Archive results to BigQuery for long-term storage",
        step: {
          id: newDraftId(),
          kind: "action",
          label: "Export to BigQuery",
          description: "Persist the workflow's results to your data warehouse.",
          integration: "bigquery",
        },
      });
    }
  }

  // Suggest email digest if missing
  if (!hasEmail && hasReportingOutput) {
    out.push({
      id: "add-email",
      label: "Email a copy to yourself for the inbox record",
      step: {
        id: newDraftId(),
        kind: "action",
        label: "Email summary",
        description: "Deliver a copy of the result to your inbox.",
        integration: "email",
      },
    });
  }

  // Suggest connecting an integration that's referenced but not yet wired
  for (const pid of draft.integrations_required) {
    const meta = INTEGRATION_PROVIDERS[pid as IntegrationProviderId];
    if (!meta || !meta.backend_platform_id) continue;
    const status = statusMap[meta.backend_platform_id];
    if (status !== "connected") {
      out.push({
        id: `connect-${pid}`,
        label: `Connect ${meta.label} to enable this workflow`,
        // This is a Connect action rather than a step insert — handled
        // separately as a link suggestion (no actual step added).
        step: {
          id: `__connect__${pid}`,
          kind: "action",
          label: meta.label,
          description: meta.short_description,
          integration: pid as IntegrationProviderId,
        },
      });
    }
  }

  // Continuation #125 (2026-05-15) — Phase Ω.7. Re-prioritize:
  // connect-required suggestions float to the top so operators
  // immediately see what's blocking activation. Add-step suggestions
  // follow. Cap to 3 to keep the panel scannable.
  return out
    .sort((a, b) => {
      const aIsConnect = a.id.startsWith("connect-") ? 0 : 1;
      const bIsConnect = b.id.startsWith("connect-") ? 0 : 1;
      return aIsConnect - bIsConnect;
    })
    .slice(0, 3);
}

export interface SuggestedEditsProps {
  draft: CopilotDraft;
  onInsertStep: (step: CopilotDraftStep) => void;
}

export function SuggestedEdits({ draft, onInsertStep }: SuggestedEditsProps) {
  const { statusMap } = useIntegrationStatus();
  const suggestions = buildSuggestions(draft, statusMap);
  if (suggestions.length === 0) return null;

  return (
    <section className="bg-primary/5 border border-primary/15 rounded-xl p-5">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3 font-body inline-flex items-center gap-1.5">
        <Lightbulb size={11} />
        Suggested edits
      </h3>
      <ul className="space-y-2">
        {suggestions.map((s) => {
          // Connect-suggestions render as routing links, not insertable steps
          if (s.step.id.startsWith("__connect__")) {
            return (
              <li key={s.id} className="flex items-start justify-between gap-3 text-sm font-body">
                <span className="text-foreground">{s.label}</span>
                <a
                  href="/integrations"
                  className="text-[11px] font-bold text-primary hover:underline shrink-0"
                >
                  Connect →
                </a>
              </li>
            );
          }
          return (
            <li key={s.id} className="flex items-start justify-between gap-3 text-sm font-body">
              <span className="text-foreground">{s.label}</span>
              <button
                onClick={() => onInsertStep(s.step)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline shrink-0"
                title="Insert this step into your draft"
              >
                <Plus size={11} />
                Insert
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
