"use client";

// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Steps 2-3, 8.
// AI Marketing Copilot — generates structured workflow drafts from
// natural-language prompts. Reuses canonical AI infrastructure:
//   POST /api/v1/ai/decisions/generate (existing)
//   GET  /api/v1/integrations           (existing — via Step 5 context)
//
// CRITICAL SAFETY: Copilot generations omit `category` so the existing
// post-persist hook never auto-fires an operator's rules from a draft.
// See lib/copilot-drafts/prompt.ts for the safety contract.
//
// Drafts persist to localStorage only — see lib/copilot-drafts/storage.ts.
// Activation routes through existing #111 Create-Rule flow via
// /actions/automation?prefill=<draft_id>.

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Sparkles, ArrowRight, AlertCircle, RefreshCw, Save, CheckCircle2,
  ShieldCheck as ShieldAlertCopilot,
  Brain, BookOpen, Wand2,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";
import {
  buildCopilotPrompt, parseAIResponseToDraft, EXAMPLE_PROMPTS,
  saveDraft, getDraft, newDraftId,
  activationHrefForDraft, draftIsActivatable,
  type CopilotDraft, type CopilotDraftStep,
} from "@/lib/copilot-drafts";
import {
  WORKFLOW_TEMPLATES, getTemplateBySlug,
  type WorkflowTemplate,
} from "@/lib/workflow-templates";
import { DraftPreview } from "@/components/copilot/DraftPreview";
import { SuggestedTemplates } from "@/components/copilot/SuggestedTemplates";
import { SuggestedEdits } from "@/components/copilot/SuggestedEdits";
import { DraftsList } from "@/components/copilot/DraftsList";

// Convert a WorkflowTemplate (manifest) into a CopilotDraft (editor state).
// Used when operator arrives via /automation/copilot?prefill=<template_slug>.
function templateToDraft(t: WorkflowTemplate): CopilotDraft {
  const now = new Date().toISOString();
  const steps: CopilotDraftStep[] = t.steps.map((s) => ({
    id: newDraftId(),
    kind: s.kind === "trigger" ? "action" : s.kind, // triggers belong on the trigger card, not as a step
    label: s.label,
    description: s.description,
    integration: s.integration,
    action_type: s.action_type,
    params_summary: s.params_summary,
  }));
  // Derive the primary action_type for the activation bridge: first
  // step with kind='action' and an action_type slug.
  const primaryAction = t.steps.find((s) => s.kind === "action" && s.action_type);
  return {
    id: newDraftId(),
    name: t.name,
    description: t.description,
    prompt: "",
    trigger: t.trigger,
    steps,
    outputs: t.outputs,
    integrations_required: t.integrations_required,
    requires_approval: !!t.requires_approval,
    primary_trigger_type: deriveTriggerType(t),
    primary_action_type: primaryAction?.action_type,
    primary_min_confidence_threshold: 70,
    created_at: now,
    updated_at: now,
    source: "template",
    template_slug: t.slug,
  };
}

// Best-effort mapping from template trigger to the backend
// VALID_TRIGGER_TYPES enum (ROAS_DROP / SPEND_SPIKE / CONVERSION_DROP /
// SCALING_OPPORTUNITY). Schedule + manual triggers don't currently
// have a backend trigger_type; they return null and the activation
// bridge surfaces an honest "schedule triggers arrive in the next
// builder pass" hint rather than a fake activation.
function deriveTriggerType(t: WorkflowTemplate): string | undefined {
  if (t.trigger.kind === "ai_signal") {
    // Templates use template tags to disambiguate which AI signal
    const tagSet = new Set(t.tags ?? []);
    if (tagSet.has("creative") || tagSet.has("fatigue")) return "CONVERSION_DROP";
    if (tagSet.has("scaling")) return "SCALING_OPPORTUNITY";
    if (tagSet.has("spike")) return "SPEND_SPIKE";
    return "ROAS_DROP";
  }
  return undefined;
}

function CopilotPageInner() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CopilotDraft | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [draftsReloadKey, setDraftsReloadKey] = useState(0);

  // Read ?prefill=<template_slug> | <draft_id> on mount; hydrate
  // the editor from the matching source; clean URL. Hydration via
  // setState in this effect is intentional (client-only resolution
  // of URL query → localStorage / static manifest).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (!prefill) return;
    // 1. Try template slug
    const template = getTemplateBySlug(prefill);
    if (template) {
      setDraft(templateToDraft(template));
      router.replace("/automation/copilot");
      return;
    }
    // 2. Try saved draft id (localStorage read — requires client effect)
    const saved = getDraft(prefill);
    if (saved) {
      setDraft(saved);
      router.replace("/automation/copilot");
      return;
    }
    // Invalid prefill — clean URL, render empty state (no toast — keeps
    // the experience quiet rather than alarming)
    router.replace("/automation/copilot");
  }, [searchParams, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-clear "Saved" badge after 2s
  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => setSaveStatus("idle"), 2000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const handleGenerate = useCallback(async () => {
    if (prompt.trim().length === 0) return;
    setGenerating(true);
    setGenerationError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const body = JSON.stringify({
        prompt: buildCopilotPrompt(prompt),
        kind: "insight",
      });
      const response = await apiClient<Record<string, unknown>>(
        "/api/v1/ai/decisions/generate",
        token,
        { method: "POST", body },
      );
      const newDraft = parseAIResponseToDraft(response, prompt);
      if (!newDraft) {
        setGenerationError(
          "I couldn't structure that as a workflow — try being more specific about the trigger and the outputs you want.",
        );
      } else {
        setDraft(newDraft);
      }
    } catch (err) {
      setGenerationError(formatErrorMessage(err, "Could not generate workflow"));
    } finally {
      setGenerating(false);
    }
  }, [prompt, getToken]);

  const handleSave = useCallback(() => {
    if (!draft) return;
    saveDraft(draft);
    setSaveStatus("saved");
    setDraftsReloadKey((k) => k + 1);
  }, [draft]);

  const handleInsertStep = useCallback((step: CopilotDraftStep) => {
    if (!draft) return;
    setDraft({ ...draft, steps: [...draft.steps, step] });
  }, [draft]);

  const handleLoadDraft = useCallback((loaded: CopilotDraft) => {
    setDraft(loaded);
    setPrompt(loaded.prompt);
    setGenerationError(null);
  }, []);

  const handleRegenerate = useCallback(() => {
    void handleGenerate();
  }, [handleGenerate]);

  const handleNewDraft = useCallback(() => {
    setDraft(null);
    setPrompt("");
    setGenerationError(null);
  }, []);

  const canActivate = useMemo(() => (draft ? draftIsActivatable(draft) : false), [draft]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body inline-flex items-center gap-1.5">
            <Sparkles size={11} />
            AI Copilot
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Compose with AI
          </h1>
          <p className="text-muted-foreground font-body mt-2 max-w-2xl">
            Describe what you want to automate. The copilot drafts a workflow you can
            review, edit, and activate — using your connected integrations.
          </p>
        </div>
        {draft && (
          <button
            onClick={handleNewDraft}
            className="self-start md:self-auto inline-flex items-center gap-2 bg-surface-container-high text-foreground px-4 py-2 rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-all font-body"
          >
            Start new
          </button>
        )}
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — prompt + drafts */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-border/40 p-6">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-body inline-flex items-center gap-1.5">
                <Wand2 size={11} className="text-primary" />
                Describe your workflow
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. Send me a weekly PPC report every Monday morning"
                className="mt-3 w-full bg-surface-container-low border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void handleGenerate();
                  }
                }}
              />
            </label>

            {/* Example chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => setPrompt(ex.prompt)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-surface-container-low text-foreground hover:bg-surface-container-high transition-colors font-body"
                >
                  {ex.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[10px] font-body text-muted-foreground">
                Each generation uses <span className="font-bold text-foreground">1 AI credit</span>.
                <span className="ml-1 inline-flex items-center gap-1">
                  Drafts never auto-trigger your rules.
                </span>
              </p>
              <button
                onClick={() => void handleGenerate()}
                disabled={generating || prompt.trim().length === 0}
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-body"
              >
                {generating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Designing…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate workflow
                  </>
                )}
              </button>
            </div>

            {generationError && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-body flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {generationError}
              </div>
            )}
          </section>

          {/* Suggested templates */}
          <SuggestedTemplates prompt={prompt} limit={3} />

          {/* My drafts */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 font-body inline-flex items-center gap-1.5">
              <BookOpen size={11} />
              My drafts
            </h3>
            <DraftsList onLoad={handleLoadDraft} reloadKey={draftsReloadKey} />
          </section>
        </div>

        {/* Right — draft preview */}
        <div className="space-y-6">
          {draft ? (
            <>
              <section className="bg-white rounded-2xl border border-border/40 p-6">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="flex-1 text-xl font-extrabold font-sans text-foreground bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md px-1 -mx-1"
                  />
                  {saveStatus === "saved" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 font-body">
                      <CheckCircle2 size={11} />
                      Saved
                    </span>
                  )}
                </div>
                <p className="text-sm font-body text-muted-foreground mb-5">
                  {draft.description}
                </p>

                <DraftPreview draft={draft} onChange={setDraft} />
              </section>

              {/* Suggested edits */}
              <SuggestedEdits draft={draft} onInsertStep={handleInsertStep} />

              {/* Activation footer */}
              <section className="bg-foreground text-white rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-1 font-body">
                      Activate primary action
                    </p>
                    <h3 className="text-lg font-sans font-bold leading-tight">
                      {canActivate
                        ? "Open the Create-Rule form prefilled"
                        : "Save your draft to continue"}
                    </h3>
                    <p className="text-sm font-body text-slate-300 mt-1.5">
                      {canActivate
                        ? "Your draft's primary action lands as one canonical automation rule. Additional steps stay saved for the next builder pass."
                        : "This draft needs a clearer primary action step (with an action_type). Save the draft and continue editing — the activation bridge requires it."}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-all px-4 py-2.5 rounded-lg font-bold text-sm font-body"
                    >
                      <Save size={14} />
                      Save draft
                    </button>
                    <button
                      onClick={() => {
                        // Persist before navigating so /actions/automation
                        // can resolve the draft by id from localStorage.
                        if (draft) {
                          saveDraft(draft);
                          setDraftsReloadKey((k) => k + 1);
                        }
                        if (canActivate && draft) {
                          router.push(activationHrefForDraft(draft));
                        }
                      }}
                      disabled={!canActivate || !draft}
                      className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 transition-all px-5 py-2.5 rounded-lg font-bold text-sm font-body disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Activate primary action
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </section>

              {/* Regenerate */}
              {draft.source === "ai" && draft.prompt && (
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors font-body py-2"
                >
                  <RefreshCw size={11} className={generating ? "animate-spin" : ""} />
                  Regenerate from same prompt
                </button>
              )}

              {/* Trust signals — Phase Ω.7 polish. Accurate against the
                  canonical runtime: spend-increasing actions are gated by
                  actionRequiresApproval; every execution writes a row to
                  decision_history via executeAction; integrations come
                  from the operator's existing connections. */}
              <TrustSignals draft={draft} />
            </>
          ) : (
            <DraftEmptyState
              templateCount={WORKFLOW_TEMPLATES.length}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DraftEmptyState({ templateCount }: { templateCount: number }) {
  // Continuation #125 (2026-05-15) — Phase Ω.7 onboarding polish.
  // Three-step "How it works" mini-illustration replaces the prior
  // single-line CTA; each step uses existing tokens + existing icons.
  return (
    <div className="bg-white rounded-2xl border border-border/40 p-8 md:p-10">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Brain size={26} className="text-primary" />
        </div>
        <h3 className="font-sans font-bold text-foreground text-lg mb-2">
          Describe your workflow to begin
        </h3>
        <p className="text-sm font-body text-muted-foreground max-w-md mx-auto">
          The copilot drafts marketing workflows from natural-language prompts. You stay in
          control — review every step before anything runs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <HowItWorksStep
          step={1}
          icon={<Wand2 size={16} />}
          title="Describe"
          description="Tell the copilot what you want to automate in plain words."
        />
        <HowItWorksStep
          step={2}
          icon={<Brain size={16} />}
          title="Review"
          description="See every step, output and integration before anything runs."
        />
        <HowItWorksStep
          step={3}
          icon={<CheckCircle2 size={16} />}
          title="Activate"
          description="Open the prefilled Create-Rule form and ship it as a real workflow."
        />
      </div>

      <div className="border-t border-border/30 pt-5 text-center text-xs font-body text-muted-foreground">
        Don&apos;t see what you need? Browse{" "}
        <Link href="/automation/strategies" className="text-primary font-bold hover:underline">
          {templateCount} ready-made templates
        </Link>
      </div>
    </div>
  );
}

function HowItWorksStep({
  step, icon, title, description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface-container-low rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-foreground text-white text-[11px] font-bold font-body flex items-center justify-center shrink-0">
          {step}
        </span>
        <span className="inline-flex items-center gap-1.5 text-foreground font-sans font-bold text-sm">
          {icon}
          {title}
        </span>
      </div>
      <p className="text-[12px] font-body text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// Continuation #125 (2026-05-15) — Phase Ω.7. Trust signals footer
// rendered below every loaded draft. Wording is factual against the
// canonical runtime: every claim maps to a real governance invariant
// in automation-engine.ts, action-executor.ts, or executeAction.
function TrustSignals({ draft }: { draft: CopilotDraft }) {
  const signals: Array<{ label: string; description: string }> = [];

  signals.push({
    label: "Audit every run",
    description: "Each execution writes an immutable row to Decision History — operators, results and timing all traceable.",
  });

  if (draft.requires_approval) {
    signals.push({
      label: "Spend never auto-fires",
      description: "Budget increases and new campaigns wait in the Approvals queue until you approve them manually.",
    });
  } else {
    signals.push({
      label: "Reversible by default",
      description: "This workflow's primary action is non-spend-increasing — operators can pause or undo at any time.",
    });
  }

  if (draft.integrations_required.length > 0) {
    signals.push({
      label: "Uses your existing connections",
      description: "All integrations come from your /integrations page — the copilot never invents new connections.",
    });
  }

  return (
    <section className="bg-surface-container-low rounded-xl p-4">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-body mb-3 inline-flex items-center gap-1.5">
        <ShieldAlertCopilot size={11} className="text-emerald-600" />
        How this stays safe
      </h4>
      <ul className="space-y-2.5">
        {signals.map((s) => (
          <li key={s.label} className="flex items-start gap-2 text-[12px] font-body">
            <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-foreground font-bold">{s.label}</p>
              <p className="text-muted-foreground">{s.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={<div className="h-screen" />}>
      <CopilotPageInner />
    </Suspense>
  );
}
