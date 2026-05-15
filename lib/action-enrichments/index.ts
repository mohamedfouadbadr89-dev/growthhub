// Continuation #125 (2026-05-15) — Phase Ω.7 enrichment barrel.

export type {
  ActionEnrichment,
  OperationCategoryId,
  OperationCategoryMeta,
  OperationCategoryWithIcon,
} from "./types";

export {
  ACTION_ENRICHMENTS,
  OPERATION_CATEGORIES,
  DEFAULT_ENRICHMENT,
  lookupEnrichment,
  lookupCategory,
} from "./manifest";

import { ACTION_ENRICHMENTS, lookupEnrichment } from "./manifest";
import type { ActionEnrichment, OperationCategoryId } from "./types";

/**
 * Group all enrichments by operation category. Used by the
 * Operations surface "Browse by operation" pivot.
 */
export function getEnrichmentsByCategory(): Map<OperationCategoryId, ActionEnrichment[]> {
  const m = new Map<OperationCategoryId, ActionEnrichment[]>();
  for (const e of Object.values(ACTION_ENRICHMENTS)) {
    const arr = m.get(e.category) ?? [];
    arr.push(e);
    m.set(e.category, arr);
  }
  return m;
}

/** Resolve related slugs into full enrichment records (filtering unknowns). */
export function resolveRelatedEnrichments(
  slug: string,
  limit = 3,
): ActionEnrichment[] {
  const e = lookupEnrichment(slug);
  const resolved: ActionEnrichment[] = [];
  for (const rel of e.related_slugs) {
    const r = ACTION_ENRICHMENTS[rel];
    if (r) resolved.push(r);
    if (resolved.length >= limit) break;
  }
  // Fallback: fill with same-category siblings if curated list is short.
  if (resolved.length < limit) {
    for (const other of Object.values(ACTION_ENRICHMENTS)) {
      if (other.slug === slug) continue;
      if (resolved.some((x) => x.slug === other.slug)) continue;
      if (other.category === e.category) {
        resolved.push(other);
        if (resolved.length >= limit) break;
      }
    }
  }
  return resolved;
}
