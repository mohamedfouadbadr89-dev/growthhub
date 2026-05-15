"use client";

// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B. Template detail
// page. Reads the static manifest from `lib/workflow-templates/` and
// renders a production-grade detail view with:
//   - Hero (icon + name + Official + Category)
//   - Workflow preview (step-by-step)
//   - "At a glance" sidebar (setup, outcome, integrations, category)
//   - Primary CTAs: "Use This Template" + "Open in AI Copilot"
//   - Related templates section
//
// "Use This Template" routes based on complexity:
//   - simple     → /actions/automation?prefill=<slug>
//   - multi_step → /automation/copilot?prefill=<slug>
// Both destinations are real, working flows. No "Coming soon".

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Sparkles, Clock, CheckCircle2, AlertCircle,
  Zap, Brain, ShieldAlert, GitBranch, Mail, ShoppingBag, Globe,
  FileBarChart, TrendingUp, Bell, Activity, Pause, AlertTriangle,
  Table2, Package, DollarSign, MessageSquare, Search, Presentation,
  FolderOpen, Database, MousePointerClick, BarChart2, Briefcase,
  type LucideIcon,
} from "lucide-react";
import {
  getTemplateBySlug,
  getRelatedTemplates,
  getActionTypesInTemplate,
  TEMPLATE_CATEGORIES,
  INTEGRATION_PROVIDERS,
  type WorkflowTemplate,
  type TemplateStep,
} from "@/lib/workflow-templates";
import { IntegrationBadge } from "@/components/integrations/IntegrationBadge";
// Continuation #125 (2026-05-15) — Phase Ω.7. "Operations used" sidebar
// section derives action_type slugs from the template's steps and looks
// them up against the enrichment manifest for marketer copy.
import { lookupEnrichment } from "@/lib/action-enrichments";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, FileBarChart, TrendingUp, Bell, Activity, ShoppingBag, Globe,
  Pause, AlertTriangle, AlertCircle, ShieldAlert, Table2, Package, DollarSign,
  MessageSquare, Search, Mail, Presentation, FolderOpen, Database,
  MousePointerClick, BarChart2, Briefcase,
};

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

function stepKindIcon(step: TemplateStep): LucideIcon {
  switch (step.kind) {
    case "trigger":    return Clock;
    case "action":     return Zap;
    case "condition":  return GitBranch;
    case "approval":   return ShieldAlert;
    case "ai_summary": return Brain;
  }
}

function stepKindLabel(step: TemplateStep): string {
  switch (step.kind) {
    case "trigger":    return "Trigger";
    case "action":     return "Action";
    case "condition":  return "Condition";
    case "approval":   return "Approval";
    case "ai_summary": return "AI Summary";
  }
}

function useTemplateHref(t: WorkflowTemplate): string {
  if (t.complexity === "simple") {
    return `/actions/automation?prefill=${encodeURIComponent(t.slug)}`;
  }
  return `/automation/copilot?prefill=${encodeURIComponent(t.slug)}`;
}

export default function TemplateDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const template = getTemplateBySlug(params.slug);
  if (!template) {
    notFound();
  }
  const t: WorkflowTemplate = template;
  const category = TEMPLATE_CATEGORIES.find((c) => c.id === t.category)!;
  const HeroIcon = iconFor(t.icon);
  const related = getRelatedTemplates(t.slug, 3);
  const primaryHref = useTemplateHref(t);
  const copilotHref = `/automation/copilot?prefill=${encodeURIComponent(t.slug)}`;

  return (
    <div className="space-y-8 pb-12">
      <Link
        href="/automation/strategies"
        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline font-body"
      >
        <ArrowLeft size={14} /> Back to Templates
      </Link>

      {/* Hero */}
      <header className="flex flex-col md:flex-row gap-6 items-start">
        <div className={`w-16 h-16 rounded-2xl ${category.accent_bg} flex items-center justify-center shrink-0`}>
          {/* eslint-disable-next-line react-hooks/static-components */}
          <HeroIcon size={28} className={category.accent_text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {t.is_official && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary font-body">
                Official
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${category.accent_bg} ${category.accent_text} font-body`}>
              {category.label}
            </span>
            {t.requires_approval && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 font-body">
                <ShieldAlert size={10} />
                Approval required
              </span>
            )}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-3">
            {t.name}
          </h1>
          <p className="text-lg font-body text-muted-foreground leading-relaxed max-w-2xl">
            {t.description}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow preview */}
          <section className="bg-white rounded-2xl border border-border/40 p-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body inline-flex items-center gap-1.5">
              <GitBranch size={11} /> Workflow preview
            </h2>

            {/* Trigger card */}
            <TriggerCard t={t} />

            {/* Step list */}
            <div className="mt-4 space-y-3">
              {t.steps.map((step, i) => (
                <StepCard key={i} step={step} index={i + 1} />
              ))}
            </div>

            {/* Outputs */}
            <div className="mt-6 pt-6 border-t border-border/30">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body mb-3">
                You&apos;ll receive
              </h3>
              <ul className="space-y-2">
                {t.outputs.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-body text-foreground">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{o.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Use case */}
          <section className="bg-white rounded-2xl border border-border/40 p-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 font-body">
              When to use this
            </h2>
            <p className="text-sm font-body text-foreground leading-relaxed">
              {t.use_case}
            </p>
          </section>

          {/* CTAs */}
          <section className="bg-foreground text-white rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-1 font-body">
                  Ready to activate
                </p>
                <h3 className="text-xl font-sans font-bold leading-tight">
                  {t.complexity === "simple"
                    ? "Set up this workflow in a single step"
                    : "Open this draft and customize for your accounts"}
                </h3>
                <p className="text-sm font-body text-slate-300 mt-1.5">
                  {t.complexity === "simple"
                    ? "Your Create-rule form will open prefilled. Review and activate."
                    : "Open in AI Copilot to review steps, edit, and activate the primary action."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 transition-all px-5 py-2.5 rounded-lg font-bold text-sm font-body"
                >
                  Use This Template
                  <ArrowRight size={14} />
                </Link>
                {t.complexity === "simple" ? null : (
                  <Link
                    href={copilotHref}
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-all px-5 py-2.5 rounded-lg font-bold text-sm font-body"
                  >
                    Open in Copilot
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="bg-white rounded-2xl border border-border/40 p-5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body">
              At a glance
            </h3>
            <dl className="space-y-3 text-sm font-body">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground inline-flex items-center gap-1.5"><Clock size={12} /> Setup time</dt>
                <dd className="font-bold text-foreground">{t.estimated_setup_minutes} min</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground inline-flex items-center gap-1.5"><Sparkles size={12} /> Outcome</dt>
                <dd className="font-bold text-foreground text-right max-w-[60%]">{t.primary_outcome}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground inline-flex items-center gap-1.5"><GitBranch size={12} /> Steps</dt>
                <dd className="font-bold text-foreground">{t.steps.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-bold text-foreground">{category.label}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-2xl border border-border/40 p-5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body">
              Integrations
            </h3>
            <ul className="space-y-3">
              {t.integrations_required.map((pid) => (
                <IntegrationBadge key={pid} providerId={pid} variant="row" />
              ))}
            </ul>
          </section>

          {/* Operations used — Phase Ω.7 cross-ref. Lists every distinct
              action_type slug referenced in the template's steps. Each
              row is clickable when the enrichment manifest has marketer
              copy for it; the link routes to the Operations search.
              Slugs without enrichment render the bare slug honestly. */}
          {(() => {
            const slugs = getActionTypesInTemplate(t);
            if (slugs.length === 0) return null;
            return (
              <section className="bg-white rounded-2xl border border-border/40 p-5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body">
                  Operations used
                </h3>
                <ul className="space-y-2.5">
                  {slugs.map((slug) => {
                    const e = lookupEnrichment(slug);
                    return (
                      <li key={slug}>
                        <Link
                          href={`/actions?search=${encodeURIComponent(slug)}`}
                          className="group flex items-start justify-between gap-2 text-sm font-body hover:bg-surface-container-low rounded-md -mx-2 px-2 py-1.5 transition-colors"
                        >
                          <div className="min-w-0">
                            <code className="text-[10px] text-muted-foreground font-mono block">
                              {slug}
                            </code>
                            <p className="text-[12px] font-body text-foreground group-hover:text-primary line-clamp-2 mt-0.5 transition-colors">
                              {e.outcome}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })()}
        </aside>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body">
            Related templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {related.map((rt) => (
              <RelatedCard key={rt.slug} t={rt} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TriggerCard({ t }: { t: WorkflowTemplate }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-foreground text-white flex items-center justify-center shrink-0 text-[10px] font-bold font-body">
        <Clock size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body mb-0.5">
          Trigger
        </p>
        <h4 className="font-sans font-bold text-foreground text-sm">{t.trigger.label}</h4>
        <p className="text-[11px] font-body text-muted-foreground mt-1">{t.trigger.description}</p>
      </div>
    </div>
  );
}

function StepCard({ step, index }: { step: TemplateStep; index: number }) {
  const Icon = stepKindIcon(step);
  const integration = step.integration ? INTEGRATION_PROVIDERS[step.integration] : null;
  return (
    <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-surface-container-high text-foreground flex items-center justify-center shrink-0 text-xs font-bold font-body">
        {index}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
            {/* eslint-disable-next-line react-hooks/static-components */}
            <Icon size={11} />
            {stepKindLabel(step)}
          </span>
          {integration && (
            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-surface-container-high text-foreground text-[10px] font-bold font-body">
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
    </div>
  );
}

function RelatedCard({ t }: { t: WorkflowTemplate }) {
  const category = TEMPLATE_CATEGORIES.find((c) => c.id === t.category)!;
  const Icon = iconFor(t.icon);
  return (
    <Link
      href={`/automation/strategies/${t.slug}`}
      className="group bg-white rounded-2xl border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all p-4 flex items-start gap-3"
    >
      <div className={`w-10 h-10 rounded-xl ${category.accent_bg} flex items-center justify-center shrink-0`}>
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Icon size={18} className={category.accent_text} />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-sans font-bold text-foreground text-sm group-hover:text-primary transition-colors truncate">
          {t.name}
        </h4>
        <p className="text-[11px] font-body text-muted-foreground line-clamp-2 mt-1">
          {t.description}
        </p>
      </div>
    </Link>
  );
}
