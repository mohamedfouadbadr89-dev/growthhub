// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B. Provider
// registry for the integration-badge system. Each entry maps a
// provider id to display metadata + a connection-status mapping
// to the existing `/api/v1/integrations` list (which uses the
// `platform` field).
//
// IMPORTANT: this is display-only metadata. The canonical list
// of supported integrations remains backend-side in connect.ts:55
// (currently meta/google/shopify); marketplace templates referencing
// other providers display a graceful "Not connected — Connect →"
// state that routes to /integrations for operator-initiated setup.

import type { IntegrationProviderId } from "./types";

export interface IntegrationProviderMeta {
  id: IntegrationProviderId;
  label: string;
  /**
   * Lucide icon name used for the badge. Brand-color icons are NOT
   * introduced — we use the existing token palette so the surface
   * stays native to the dashboard.
   */
  icon: string;
  /**
   * Tailwind brand color tokens (already in palette). Applied as the
   * small status dot accent only; the badge body uses existing
   * surface-container-low.
   */
  dot_color: string;
  /**
   * The `platform` value in /api/v1/integrations rows that signals
   * this provider is connected for the current org. `null` for
   * integrations that don't yet have a canonical backend (e.g.
   * Slack, Sheets, BigQuery — those will land in later phases).
   * When null, the badge always renders "Not connected" until a
   * future backend addition.
   */
  backend_platform_id: string | null;
  /**
   * Short marketer-facing description for sidebar / hover tooltips.
   */
  short_description: string;
}

export const INTEGRATION_PROVIDERS: Record<IntegrationProviderId, IntegrationProviderMeta> = {
  meta: {
    id: "meta",
    label: "Meta Ads",
    icon: "Globe",
    dot_color: "bg-blue-500",
    backend_platform_id: "meta",
    short_description: "Pause campaigns, adjust budgets, launch ads on Facebook and Instagram.",
  },
  google_ads: {
    id: "google_ads",
    label: "Google Ads",
    icon: "MousePointerClick",
    dot_color: "bg-amber-500",
    backend_platform_id: "google",
    short_description: "Pull metrics, pause campaigns, manage budgets on Search and Display.",
  },
  shopify: {
    id: "shopify",
    label: "Shopify",
    icon: "ShoppingBag",
    dot_color: "bg-emerald-500",
    backend_platform_id: "shopify",
    short_description: "Sync orders, products and revenue from your store.",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok Ads",
    icon: "Sparkles",
    dot_color: "bg-slate-900",
    backend_platform_id: null,
    short_description: "Pull metrics and manage TikTok ad campaigns.",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn Ads",
    icon: "Briefcase",
    dot_color: "bg-blue-700",
    backend_platform_id: null,
    short_description: "Manage LinkedIn campaign budgets and audience targeting.",
  },
  ga4: {
    id: "ga4",
    label: "Google Analytics",
    icon: "BarChart2",
    dot_color: "bg-orange-500",
    backend_platform_id: null,
    short_description: "Read events, audiences and conversion data from GA4.",
  },
  sheets: {
    id: "sheets",
    label: "Google Sheets",
    icon: "Table2",
    dot_color: "bg-emerald-600",
    backend_platform_id: null,
    short_description: "Append rows, read sources, schedule exports to Sheets.",
  },
  slides: {
    id: "slides",
    label: "Google Slides",
    icon: "Presentation",
    dot_color: "bg-amber-600",
    backend_platform_id: null,
    short_description: "Generate marketing reports as Slides decks.",
  },
  drive: {
    id: "drive",
    label: "Google Drive",
    icon: "FolderOpen",
    dot_color: "bg-blue-600",
    backend_platform_id: null,
    short_description: "Upload creatives, export reports, archive assets.",
  },
  bigquery: {
    id: "bigquery",
    label: "BigQuery",
    icon: "Database",
    dot_color: "bg-blue-500",
    backend_platform_id: null,
    short_description: "Export data warehouse queries for long-term storage.",
  },
  slack: {
    id: "slack",
    label: "Slack",
    icon: "MessageSquare",
    dot_color: "bg-violet-600",
    backend_platform_id: null,
    short_description: "Send messages, alerts and digests to your team channels.",
  },
  email: {
    id: "email",
    label: "Email",
    icon: "Mail",
    dot_color: "bg-primary",
    backend_platform_id: null,
    short_description: "Deliver formatted digests and alerts to your inbox.",
  },
  search_console: {
    id: "search_console",
    label: "Search Console",
    icon: "Search",
    dot_color: "bg-slate-600",
    backend_platform_id: null,
    short_description: "Track organic rankings, queries and click-through.",
  },
  ai: {
    id: "ai",
    label: "AI",
    icon: "Brain",
    dot_color: "bg-primary",
    backend_platform_id: null,
    short_description: "Summarize, generate insights, draft copy.",
  },
};

export function getProviderMeta(id: IntegrationProviderId): IntegrationProviderMeta {
  return INTEGRATION_PROVIDERS[id];
}
