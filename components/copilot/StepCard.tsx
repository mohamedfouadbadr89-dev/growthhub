"use client";

// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 4.
// Single step card used in draft previews. Read-only by default;
// the parent renders edit/remove buttons + an edit drawer.

import {
  Zap, Brain, ShieldAlert, GitBranch, Clock, Pencil, X, type LucideIcon,
} from "lucide-react";
import type { CopilotDraftStep } from "@/lib/copilot-drafts";
import { INTEGRATION_PROVIDERS } from "@/lib/workflow-templates";

const STEP_KIND_ICONS: Record<CopilotDraftStep["kind"], LucideIcon> = {
  trigger: Clock,
  action: Zap,
  condition: GitBranch,
  approval: ShieldAlert,
  ai_summary: Brain,
};

const STEP_KIND_LABELS: Record<CopilotDraftStep["kind"], string> = {
  trigger: "Trigger",
  action: "Action",
  condition: "Condition",
  approval: "Approval",
  ai_summary: "AI Summary",
};

export interface StepCardProps {
  step: CopilotDraftStep;
  index: number;
  onEdit?: () => void;
  onRemove?: () => void;
  /**
   * When true, the card is rendered as a read-only preview (no edit/
   * remove buttons). Used in templates detail page.
   */
  readOnly?: boolean;
}

export function StepCard({ step, index, onEdit, onRemove, readOnly = false }: StepCardProps) {
  const Icon = STEP_KIND_ICONS[step.kind];
  const integration = step.integration ? INTEGRATION_PROVIDERS[step.integration] : null;

  return (
    <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3 group">
      <div className="w-8 h-8 rounded-full bg-surface-container-high text-foreground flex items-center justify-center shrink-0 text-xs font-bold font-body">
        {index}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
            <Icon size={11} />
            {STEP_KIND_LABELS[step.kind]}
          </span>
          {integration && (
            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white border border-border/40 text-foreground text-[10px] font-bold font-body">
              <span className={`w-1.5 h-1.5 rounded-full ${integration.dot_color}`} aria-hidden="true" />
              {integration.label}
            </span>
          )}
        </div>
        <h4 className="font-sans font-bold text-foreground text-sm">{step.label}</h4>
        <p className="text-[11px] font-body text-muted-foreground mt-1 leading-relaxed">
          {step.description}
        </p>
        {step.params_summary && (
          <p className="text-[10px] font-mono text-muted-foreground mt-2 bg-white px-2 py-1 rounded inline-block">
            {step.params_summary}
          </p>
        )}
      </div>
      {!readOnly && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-white rounded-md transition-colors"
              title="Edit step"
            >
              <Pencil size={12} />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-white rounded-md transition-colors"
              title="Remove step"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
