"use client";

// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 6.
// Suggests 2-3 marketplace templates based on operator's prompt
// (keyword match against template name/description/tags). When the
// operator hasn't typed a prompt yet, shows a curated "starting
// points" set so the empty state still feels real and clickable.

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "@/lib/workflow-templates";

export interface SuggestedTemplatesProps {
  /** Operator's current prompt — drives keyword scoring */
  prompt: string;
  /** How many to surface */
  limit?: number;
}

const STARTERS_BY_DEFAULT = [
  "weekly-ppc-performance-report",
  "pause-underperforming-meta-campaigns",
  "daily-ecommerce-summary",
  "budget-pacing-alert",
];

function scoreTemplate(t: WorkflowTemplate, terms: string[]): number {
  const hay = `${t.name} ${t.description} ${t.use_case} ${(t.tags ?? []).join(" ")}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (term.length < 3) continue;
    if (hay.includes(term)) score += 2;
    // partial match boost
    if (t.name.toLowerCase().includes(term)) score += 3;
  }
  return score;
}

function recommendTemplates(prompt: string, limit: number): WorkflowTemplate[] {
  const trimmed = prompt.trim().toLowerCase();
  if (trimmed.length === 0) {
    return STARTERS_BY_DEFAULT.map((slug) => WORKFLOW_TEMPLATES.find((t) => t.slug === slug)!)
      .filter(Boolean)
      .slice(0, limit);
  }
  const terms = trimmed.split(/\s+/).filter((t) => t.length > 2);
  const scored = WORKFLOW_TEMPLATES.map((t) => ({ t, score: scoreTemplate(t, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length >= limit) return scored.slice(0, limit).map((x) => x.t);
  // Fill remainder with starters so the surface is never empty
  const filler = STARTERS_BY_DEFAULT
    .map((slug) => WORKFLOW_TEMPLATES.find((t) => t.slug === slug)!)
    .filter((t) => t && !scored.some((s) => s.t.slug === t.slug));
  return [...scored.map((x) => x.t), ...filler].slice(0, limit);
}

export function SuggestedTemplates({ prompt, limit = 3 }: SuggestedTemplatesProps) {
  const recommended = recommendTemplates(prompt, limit);
  if (recommended.length === 0) return null;
  const heading = prompt.trim().length > 0 ? "Closest templates" : "Popular starting points";

  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 font-body inline-flex items-center gap-1.5">
        <Sparkles size={11} className="text-primary" />
        {heading}
      </h3>
      <div className="space-y-2">
        {recommended.map((t) => (
          <Link
            key={t.slug}
            href={`/automation/strategies/${t.slug}`}
            className="group block bg-white border border-border/40 rounded-xl p-3.5 hover:border-primary/20 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-sans font-bold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                  {t.name}
                </h4>
                <p className="text-[11px] font-body text-muted-foreground line-clamp-1 mt-0.5">
                  {t.description}
                </p>
              </div>
              <ArrowRight size={14} className="text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
