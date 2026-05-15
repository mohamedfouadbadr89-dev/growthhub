"use client";

// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 4-5.
// Renders a Copilot draft as an editable preview. Step list supports:
//   - Edit (opens an inline edit drawer with label + description + params)
//   - Remove (deletes from local state)
//   - Add (opens a kind picker)
//
// All mutations are LOCAL component state — no API calls. The parent
// page persists changes via lib/copilot-drafts/storage.saveDraft.

import { useState } from "react";
import {
  Plus, Clock, CheckCircle2, X, ArrowRight, ShieldAlert,
} from "lucide-react";
import type { CopilotDraft, CopilotDraftStep } from "@/lib/copilot-drafts";
import { newDraftId } from "@/lib/copilot-drafts";
import { IntegrationBadge } from "@/components/integrations/IntegrationBadge";
import { StepCard } from "./StepCard";

export interface DraftPreviewProps {
  draft: CopilotDraft;
  onChange: (next: CopilotDraft) => void;
}

export function DraftPreview({ draft, onChange }: DraftPreviewProps) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [addingStep, setAddingStep] = useState(false);

  function setSteps(next: CopilotDraftStep[]) {
    onChange({ ...draft, steps: next });
  }

  function removeStep(id: string) {
    setSteps(draft.steps.filter((s) => s.id !== id));
  }

  function updateStep(updated: CopilotDraftStep) {
    setSteps(draft.steps.map((s) => (s.id === updated.id ? updated : s)));
    setEditingStepId(null);
  }

  function addStep(kind: CopilotDraftStep["kind"]) {
    const next: CopilotDraftStep = {
      id: newDraftId(),
      kind,
      label: kind === "action" ? "New action" : kind === "condition" ? "New condition" : kind === "approval" ? "Wait for approval" : kind === "ai_summary" ? "AI summary" : "New step",
      description: "Describe what this step does.",
      integration: null,
    };
    setSteps([...draft.steps, next]);
    setEditingStepId(next.id);
    setAddingStep(false);
  }

  const editing = editingStepId ? draft.steps.find((s) => s.id === editingStepId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Trigger card */}
      <TriggerCard draft={draft} onChange={onChange} />

      {/* Step list */}
      <div className="space-y-2">
        {draft.steps.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground font-body italic">
              No steps yet — add the first action.
            </p>
          </div>
        ) : (
          draft.steps.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              index={i + 1}
              onEdit={() => setEditingStepId(step.id)}
              onRemove={() => removeStep(step.id)}
            />
          ))
        )}
        {!addingStep ? (
          <button
            onClick={() => setAddingStep(true)}
            className="w-full bg-white border-2 border-dashed border-border rounded-xl p-3 text-sm font-bold text-muted-foreground hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2 font-body"
          >
            <Plus size={14} />
            Add step
          </button>
        ) : (
          <AddStepPicker onPick={addStep} onCancel={() => setAddingStep(false)} />
        )}
      </div>

      {/* Outputs */}
      {draft.outputs.length > 0 && (
        <div className="bg-white border border-border/40 rounded-xl p-5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body mb-3">
            You&apos;ll receive
          </h4>
          <ul className="space-y-2">
            {draft.outputs.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm font-body text-foreground">
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>{o.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Integrations */}
      {draft.integrations_required.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body mb-2">
            Integrations
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {draft.integrations_required.map((pid) => (
              <IntegrationBadge key={pid} providerId={pid} variant="compact" />
            ))}
          </div>
        </div>
      )}

      {/* Approval banner */}
      {draft.requires_approval && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm font-body min-w-0">
            <p className="font-bold text-amber-800 mb-0.5">Approval required</p>
            <p className="text-amber-700">
              This workflow includes a spend-increasing or launch action. It will be created
              <span className="font-bold"> disabled</span> — you must approve runs manually
              via the Approvals queue.
            </p>
          </div>
        </div>
      )}

      {/* Edit drawer (inline panel — keeps the surface lean for v1) */}
      {editing && (
        <EditStepDrawer
          step={editing}
          onSave={updateStep}
          onCancel={() => setEditingStepId(null)}
        />
      )}
    </div>
  );
}

function TriggerCard({ draft, onChange }: { draft: CopilotDraft; onChange: (next: CopilotDraft) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-foreground text-white rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        <Clock size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 font-body mb-0.5">
          Trigger
        </p>
        {editing ? (
          <input
            type="text"
            value={draft.trigger.label}
            onChange={(e) =>
              onChange({ ...draft, trigger: { ...draft.trigger, label: e.target.value } })
            }
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditing(false);
            }}
            autoFocus
            className="w-full bg-white/10 border border-white/20 rounded-md px-2 py-1 font-sans font-bold text-sm text-white focus:outline-none focus:border-white/40"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-sans font-bold text-white text-sm hover:underline text-left"
            title="Click to edit"
          >
            {draft.trigger.label}
          </button>
        )}
        <p className="text-[11px] font-body text-slate-300 mt-1">{draft.trigger.description}</p>
      </div>
    </div>
  );
}

function AddStepPicker({
  onPick,
  onCancel,
}: {
  onPick: (kind: CopilotDraftStep["kind"]) => void;
  onCancel: () => void;
}) {
  const kinds: Array<{ kind: CopilotDraftStep["kind"]; label: string; description: string }> = [
    { kind: "action", label: "Action", description: "Run something on a connected integration" },
    { kind: "condition", label: "Condition", description: "Only proceed when a value matches" },
    { kind: "approval", label: "Approval", description: "Pause for your manual approval" },
    { kind: "ai_summary", label: "AI Summary", description: "Have AI summarize or generate text" },
  ];
  return (
    <div className="bg-white border-2 border-primary/20 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-foreground font-body">Pick step kind</p>
        <button
          onClick={onCancel}
          className="p-1 text-muted-foreground hover:text-foreground"
          aria-label="Cancel"
        >
          <X size={12} />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {kinds.map((k) => (
          <button
            key={k.kind}
            onClick={() => onPick(k.kind)}
            className="text-left bg-surface-container-low hover:bg-surface-container rounded-lg p-3 transition-colors flex items-center gap-3"
          >
            <ArrowRight size={14} className="text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold font-body text-foreground">{k.label}</p>
              <p className="text-[10px] font-body text-muted-foreground truncate">{k.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EditStepDrawer({
  step,
  onSave,
  onCancel,
}: {
  step: CopilotDraftStep;
  onSave: (s: CopilotDraftStep) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(step.label);
  const [description, setDescription] = useState(step.description);
  const [paramsSummary, setParamsSummary] = useState(step.params_summary ?? "");

  return (
    <div className="bg-white border border-primary/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-sans font-bold text-foreground text-sm">Edit step</h4>
        <button
          onClick={onCancel}
          className="p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
      <div className="space-y-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Label</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full bg-surface-container-low border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full bg-surface-container-low border border-border/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body resize-none"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Params summary (optional)</span>
          <input
            type="text"
            value={paramsSummary}
            onChange={(e) => setParamsSummary(e.target.value)}
            placeholder="e.g. Channel: #marketing-alerts"
            className="mt-1 w-full bg-surface-container-low border border-border/40 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-bold text-foreground hover:bg-surface-container-low rounded-lg transition-colors font-body"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSave({
              ...step,
              label: label.trim() || step.label,
              description: description.trim() || step.description,
              params_summary: paramsSummary.trim() === "" ? undefined : paramsSummary.trim(),
            })
          }
          className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 transition-all font-body"
        >
          Save step
        </button>
      </div>
    </div>
  );
}
