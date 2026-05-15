// Continuation #125 (2026-05-15) — Phase Ω.7. Bidirectional cross-
// reference helpers between the static template manifest and the
// static action-enrichment manifest. PURE FE — no backend joins,
// no new data, no caching needed (manifests are import-time constants).

import { WORKFLOW_TEMPLATES } from "./templates";
import type { WorkflowTemplate } from "./types";
import type { OperationCategoryId } from "@/lib/action-enrichments/types";
import { lookupEnrichment } from "@/lib/action-enrichments/manifest";

/**
 * Return every template that references a given action_type slug
 * in any of its steps. Used by /actions/[id] "Used in templates" panel.
 */
export function getTemplatesUsingActionType(actionTypeSlug: string): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter((t) =>
    t.steps.some((s) => s.action_type === actionTypeSlug),
  );
}

/**
 * Return every distinct action_type slug referenced by a template.
 * Used by /automation/strategies/[slug] "Operations used" panel.
 * Order preserves the step-list order of first appearance.
 */
export function getActionTypesInTemplate(template: WorkflowTemplate): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const step of template.steps) {
    if (step.action_type && !seen.has(step.action_type)) {
      seen.add(step.action_type);
      out.push(step.action_type);
    }
  }
  return out;
}

/**
 * For the marketplace "Browse by operation" pivot: return every
 * template that references any action_type whose enrichment category
 * matches the given id.
 */
export function getTemplatesByOperationCategory(
  categoryId: OperationCategoryId,
): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter((t) =>
    t.steps.some((s) => {
      if (!s.action_type) return false;
      const enrichment = lookupEnrichment(s.action_type);
      return enrichment.category === categoryId;
    }),
  );
}

/**
 * Count templates per operation category for the pivot strip.
 */
export function getOperationCategoryCounts(): Record<OperationCategoryId, number> {
  const counts: Record<string, number> = {};
  for (const t of WORKFLOW_TEMPLATES) {
    const seen = new Set<string>();
    for (const step of t.steps) {
      if (!step.action_type) continue;
      const cat = lookupEnrichment(step.action_type).category;
      if (seen.has(cat)) continue;
      seen.add(cat);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
  }
  return counts as Record<OperationCategoryId, number>;
}
