// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B. Category
// metadata for the Templates Marketplace. Display-only; uses existing
// Tailwind tokens (no new colors introduced).

import type { TemplateCategoryMeta, TemplateCategoryId } from "./types";

export const TEMPLATE_CATEGORIES: TemplateCategoryMeta[] = [
  {
    id: "reporting",
    label: "Reporting",
    description: "Scheduled summaries and recurring marketing reports.",
    icon: "FileBarChart",
    accent_bg: "bg-primary/10",
    accent_text: "text-primary",
  },
  {
    id: "optimization",
    label: "Optimization",
    description: "Auto-optimize campaigns based on performance signals.",
    icon: "TrendingUp",
    accent_bg: "bg-emerald-100",
    accent_text: "text-emerald-700",
  },
  {
    id: "alerts",
    label: "Alerts",
    description: "Real-time notifications when something needs your attention.",
    icon: "Bell",
    accent_bg: "bg-amber-100",
    accent_text: "text-amber-700",
  },
  {
    id: "monitoring",
    label: "Monitoring",
    description: "Continuous health checks for your marketing programs.",
    icon: "Activity",
    accent_bg: "bg-blue-100",
    accent_text: "text-blue-700",
  },
  {
    id: "creative",
    label: "Creative",
    description: "Creative performance signals and refresh suggestions.",
    icon: "Sparkles",
    accent_bg: "bg-violet-100",
    accent_text: "text-violet-700",
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    description: "Shopify-powered order, inventory and revenue automations.",
    icon: "ShoppingBag",
    accent_bg: "bg-emerald-100",
    accent_text: "text-emerald-700",
  },
  {
    id: "seo",
    label: "SEO",
    description: "Search Console and organic-channel workflows.",
    icon: "Globe",
    accent_bg: "bg-slate-100",
    accent_text: "text-slate-700",
  },
];

export function getCategoryMeta(id: TemplateCategoryId): TemplateCategoryMeta {
  const found = TEMPLATE_CATEGORIES.find((c) => c.id === id);
  // Fallback to "reporting" if (somehow) an unknown id arrives — defensive
  // against future-template author typos. Single source of truth = this file.
  return found ?? TEMPLATE_CATEGORIES[0];
}
