"use client";

// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B (Templates
// Marketplace) per `specs/operator-intelligence.md`. Replaces the
// Phase 6 mock-shell with a real curated marketplace of marketing
// workflow templates. Reads from the static manifest in
// `lib/workflow-templates/` (no backend; no orchestration runtime).
//
// "Use Template" routes to a real flow:
//   - simple complexity     → /actions/automation?prefill=<slug>
//                             (existing #111 Create Rule form prefilled)
//   - multi_step complexity → /automation/copilot?prefill=<slug>
//                             (Copilot draft preview prefilled)
//
// Canonical executor `executeAction()` remains the only runtime.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Filter, FileBarChart, TrendingUp, Bell, Activity, Sparkles,
  ShoppingBag, Globe, ArrowRight, Clock, Pause, AlertTriangle, AlertCircle,
  ShieldAlert, Table2, Package, DollarSign, Rocket, ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  WORKFLOW_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByOperationCategory,
  getOperationCategoryCounts,
  type WorkflowTemplate,
  type TemplateCategoryId,
} from "@/lib/workflow-templates";
import { IntegrationBadge } from "@/components/integrations/IntegrationBadge";
// Continuation #125 (2026-05-15) — Phase Ω.7. Operation pivot strip
// derives counts from the static cross-ref helpers.
import {
  OPERATION_CATEGORIES,
  type OperationCategoryId,
} from "@/lib/action-enrichments";

// Lucide icon registry — keeps the static manifest free of React imports
// while supporting per-template icon selection by name. Add new icons here
// when new templates reference them.
const ICONS: Record<string, LucideIcon> = {
  FileBarChart, TrendingUp, Bell, Activity, Sparkles, ShoppingBag, Globe,
  Pause, AlertTriangle, AlertCircle, ShieldAlert, Table2, Package, DollarSign,
  Rocket, ShieldCheck,
};

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

// Resolve the destination for "Use Template" based on complexity.
// Single source of truth for the Use-Template routing rule.
function useTemplateHref(t: WorkflowTemplate): string {
  if (t.complexity === "simple") {
    return `/actions/automation?prefill=${encodeURIComponent(t.slug)}`;
  }
  return `/automation/copilot?prefill=${encodeURIComponent(t.slug)}`;
}

type FilterCategory = "all" | TemplateCategoryId;
type OperationFilter = "all" | OperationCategoryId;

export default function TemplatesMarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FilterCategory>("all");
  // Continuation #125 (2026-05-15) — Phase Ω.7 operation pivot.
  // Filters templates that reference any action_type matching the
  // selected operation category. Independent from the use-case
  // category filter above (operators can combine: e.g. "reporting
  // templates that use a Notify operation").
  const [operationFilter, setOperationFilter] = useState<OperationFilter>("all");

  // Operation pivot — slug-set of templates matching the chosen op category
  const operationMatchSet = useMemo(() => {
    if (operationFilter === "all") return null;
    return new Set(getTemplatesByOperationCategory(operationFilter).map((t) => t.slug));
  }, [operationFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return WORKFLOW_TEMPLATES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (operationMatchSet && !operationMatchSet.has(t.slug)) return false;
      if (q.length > 0) {
        const hay = `${t.name} ${t.description} ${t.tags?.join(" ") ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, category, operationMatchSet]);

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: WORKFLOW_TEMPLATES.length };
    for (const c of TEMPLATE_CATEGORIES) {
      counts[c.id] = WORKFLOW_TEMPLATES.filter((t) => t.category === c.id).length;
    }
    return counts;
  }, []);

  // Operation pivot counts — used in the "Browse by operation" strip.
  const operationCounts = useMemo(() => getOperationCategoryCounts(), []);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Templates
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Workflow Marketplace
          </h1>
          <p className="text-muted-foreground font-body mt-2 max-w-2xl">
            Pre-built workflows ready to run. Browse by category, customize for your accounts,
            and activate in minutes — no setup time, no fragile scripts.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
            Available
          </p>
          <p className="text-3xl font-black text-foreground font-sans">{WORKFLOW_TEMPLATES.length}</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by name, outcome, or integration…"
            className="w-full bg-white border border-border/40 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
          />
        </div>
        <div className="flex items-center gap-2 text-[11px] font-body text-muted-foreground">
          <Filter size={12} />
          <span><span className="font-bold text-foreground">{filtered.length}</span> match</span>
        </div>
      </div>

      {/* Browse by operation — Phase Ω.7 pivot. Surfaces templates by
          the operation category their action_types belong to. Hidden when
          no templates match any operation category (defensive). */}
      {(() => {
        const visibleOps = OPERATION_CATEGORIES.filter(
          (op) => (operationCounts[op.id] ?? 0) > 0,
        );
        if (visibleOps.length === 0) return null;
        return (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 font-body inline-flex items-center gap-1.5">
              <Sparkles size={11} className="text-primary" />
              Browse by operation
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOperationFilter("all")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold font-body transition-all border ${
                  operationFilter === "all"
                    ? "bg-white border-primary/30 text-primary shadow-sm"
                    : "bg-surface-container-low border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-container-high"
                }`}
              >
                Any operation
              </button>
              {visibleOps.map((op) => {
                const Icon = iconFor(op.icon);
                const isActive = operationFilter === op.id;
                const count = operationCounts[op.id] ?? 0;
                return (
                  <button
                    key={op.id}
                    onClick={() => setOperationFilter(op.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold font-body transition-all border ${
                      isActive
                        ? `${op.accent_bg} ${op.accent_text} border-transparent shadow-sm`
                        : "bg-surface-container-low border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-container-high"
                    }`}
                    title={op.description}
                  >
                    <Icon size={11} />
                    {op.label}
                    <span className="text-[10px] opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("all")}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold font-body transition-all ${
            category === "all"
              ? "bg-foreground text-white shadow-sm"
              : "bg-surface-container-low text-muted-foreground hover:text-foreground hover:bg-surface-container-high"
          }`}
        >
          All
          <span className="text-[10px] opacity-70">{countByCategory.all}</span>
        </button>
        {TEMPLATE_CATEGORIES.map((c) => {
          const Icon = iconFor(c.icon);
          const isActive = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold font-body transition-all ${
                isActive
                  ? "bg-foreground text-white shadow-sm"
                  : "bg-surface-container-low text-muted-foreground hover:text-foreground hover:bg-surface-container-high"
              }`}
            >
              <Icon size={12} />
              {c.label}
              <span className="text-[10px] opacity-70">{countByCategory[c.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-16 text-center">
          <Search size={28} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-body font-bold mb-1">No templates match your search.</p>
          <p className="text-[11px] text-muted-foreground font-body opacity-70">
            Try a different keyword or clear the category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => (
            <TemplateCard key={t.slug} template={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template: t }: { template: WorkflowTemplate }) {
  // `iconFor` returns a reference to a statically-imported Lucide
  // component from the ICONS registry — no component class is created
  // at render time. The react-hooks/static-components rule fires on the
  // JSX usage because the variable name starts with a capital; disable
  // for the JSX site below.
  const Icon = iconFor(t.icon);
  const category = TEMPLATE_CATEGORIES.find((c) => c.id === t.category)!;
  const visibleIntegrations = t.integrations_required.slice(0, 4);
  const extraIntegrations = t.integrations_required.length - visibleIntegrations.length;

  return (
    <Link
      href={`/automation/strategies/${t.slug}`}
      className="group bg-white rounded-2xl border border-border/40 hover:border-primary/20 hover:shadow-md transition-all p-6 flex flex-col"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${category.accent_bg} flex items-center justify-center shrink-0`}>
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon size={22} className={category.accent_text} />
        </div>
        {t.is_official && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary font-body">
            Official
          </span>
        )}
      </div>

      <h3 className="font-sans font-bold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
        {t.name}
      </h3>
      <p className="text-sm font-body text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">
        {t.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {visibleIntegrations.map((pid) => (
          <IntegrationBadge key={pid} providerId={pid} variant="compact" />
        ))}
        {extraIntegrations > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container-low text-muted-foreground text-[10px] font-bold font-body uppercase tracking-wider">
            +{extraIntegrations}
          </span>
        )}
      </div>

      <div className="border-t border-border/30 pt-3 flex items-center justify-between text-[11px] font-body text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={11} />
          {t.estimated_setup_minutes} min setup
        </span>
        <span className="inline-flex items-center gap-1 text-primary font-bold group-hover:gap-2 transition-all">
          View
          <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  );
}

// Re-export the Use-Template href resolver for cross-page reuse
// (template detail page + Copilot suggestions both consume this).
export { useTemplateHref };
