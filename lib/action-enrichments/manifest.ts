// Continuation #125 (2026-05-15) — Phase Ω.7 enrichment manifest.
// Static FE catalogue of marketer-facing metadata for each canonical
// action_type slug. Covers all 9 actions currently in the
// `actions_library` table (7 Phase Ω.7 baseline + slack.post_message +
// email.send_digest added in Phase Ω.8A.1); safe defaults engage when a
// slug isn't listed here (e.g. future actions land before this manifest
// is updated).

import type {
  ActionEnrichment,
  OperationCategoryMeta,
  OperationCategoryId,
} from "./types";

export const OPERATION_CATEGORIES: OperationCategoryMeta[] = [
  {
    id: "pause",
    label: "Pause",
    description: "Stop underperforming spend across paid channels.",
    icon: "Pause",
    accent_bg: "bg-amber-100",
    accent_text: "text-amber-700",
    sort_order: 1,
  },
  {
    id: "budget",
    label: "Budget",
    description: "Adjust campaign budgets up or down.",
    icon: "DollarSign",
    accent_bg: "bg-emerald-100",
    accent_text: "text-emerald-700",
    sort_order: 2,
  },
  {
    id: "launch",
    label: "Launch",
    description: "Create new campaigns and assets.",
    icon: "Rocket",
    accent_bg: "bg-primary/10",
    accent_text: "text-primary",
    sort_order: 3,
  },
  {
    id: "notify",
    label: "Notify",
    description: "Send alerts, digests and team messages.",
    icon: "Bell",
    accent_bg: "bg-blue-100",
    accent_text: "text-blue-700",
    sort_order: 4,
  },
  {
    id: "report",
    label: "Report",
    description: "Generate decks, sheets and recurring summaries.",
    icon: "FileBarChart",
    accent_bg: "bg-violet-100",
    accent_text: "text-violet-700",
    sort_order: 5,
  },
  {
    id: "monitor",
    label: "Monitor",
    description: "Continuous health checks and anomaly watches.",
    icon: "Activity",
    accent_bg: "bg-slate-100",
    accent_text: "text-slate-700",
    sort_order: 6,
  },
  {
    id: "approve",
    label: "Approve",
    description: "Human-in-the-loop gates before sensitive actions.",
    icon: "ShieldCheck",
    accent_bg: "bg-amber-100",
    accent_text: "text-amber-700",
    sort_order: 7,
  },
];

/**
 * Per-action enrichment manifest. Keys are the canonical
 * `<platform>.<action_type>` slug used in templates and recommendations.
 */
export const ACTION_ENRICHMENTS: Record<string, ActionEnrichment> = {
  "meta.pause_campaign": {
    slug: "meta.pause_campaign",
    category: "pause",
    outcome: "Stop spend on a Meta campaign in seconds.",
    use_cases: [
      "ROAS has dropped below threshold and you want to halt spend immediately.",
      "A creative test cycle ended and the losing variant needs to come down.",
      "Daily budget overshot and you need a rapid spend brake.",
    ],
    outputs: [
      "Meta campaign status flipped to PAUSED.",
      "Audit row written to Decision History with the operator + reason.",
    ],
    related_slugs: ["meta.decrease_budget", "google.pause_campaign", "meta.send_alert_email"],
  },

  "meta.decrease_budget": {
    slug: "meta.decrease_budget",
    category: "budget",
    outcome: "Pull back budget on a Meta campaign without pausing it.",
    use_cases: [
      "Pacing too hot — reduce daily spend by a percentage instead of stopping the campaign.",
      "Soft cooling-off after a CAC spike, keeping the campaign live for learning.",
      "Reallocating budget between accounts during the month.",
    ],
    outputs: [
      "Meta campaign daily budget updated to the new amount.",
      "Audit row written to Decision History with before/after values.",
    ],
    related_slugs: ["meta.increase_budget", "meta.pause_campaign", "google.pause_campaign"],
  },

  "meta.increase_budget": {
    slug: "meta.increase_budget",
    category: "budget",
    outcome: "Scale up a winning Meta campaign within safe bounds.",
    use_cases: [
      "A campaign is consistently hitting target CAC and you want to scale up.",
      "A scaling opportunity from AI Insights needs an operator-approved budget increase.",
      "Daily pacing is under target and there's runway to spend more.",
    ],
    outputs: [
      "Meta campaign daily budget raised by the configured percent.",
      "Audit row written to Decision History with before/after values.",
    ],
    related_slugs: ["meta.decrease_budget", "meta.create_campaign", "meta.pause_campaign"],
    safety_note:
      "This is a spend-increasing operation. The centralized approval policy blocks auto-fire; you approve each run manually from the Approvals queue.",
  },

  "meta.create_campaign": {
    slug: "meta.create_campaign",
    category: "launch",
    outcome: "Launch a new Meta campaign in PAUSED status, ready for review.",
    use_cases: [
      "Spinning up a new test concept from a creative brief.",
      "Cloning a winning campaign structure across audiences.",
      "Bootstrapping a regional or seasonal push from a template.",
    ],
    outputs: [
      "New Meta campaign created with status=PAUSED — never auto-activates.",
      "Audit row written to Decision History with campaign id + configuration.",
    ],
    related_slugs: ["meta.pause_campaign", "google.create_campaign", "meta.increase_budget"],
    safety_note:
      "Launches are gated by the approval policy. New campaigns always land paused — you flip them active manually after review.",
  },

  "google.pause_campaign": {
    slug: "google.pause_campaign",
    category: "pause",
    outcome: "Stop spend on a Google Ads campaign in seconds.",
    use_cases: [
      "Search campaign quality score dropped and you want to pause until creative is refreshed.",
      "Daily budget pacing alert — halt spend on the offending campaign.",
      "Seasonal switch-off after a promotion window closes.",
    ],
    outputs: [
      "Google Ads campaign status flipped to PAUSED.",
      "Audit row written to Decision History with the operator + reason.",
    ],
    related_slugs: ["meta.pause_campaign", "google.create_campaign", "meta.send_alert_email"],
  },

  "google.create_campaign": {
    slug: "google.create_campaign",
    category: "launch",
    outcome: "Launch a Google Ads campaign in PAUSED status, ready for review.",
    use_cases: [
      "Building a new Search test in a category you haven't tried before.",
      "Cloning a winning Display campaign across new audiences.",
      "Bootstrapping a Performance Max baseline from a template.",
    ],
    outputs: [
      "Google Ads campaign + linked budget created, status=PAUSED.",
      "Audit row written to Decision History with campaign id + configuration.",
    ],
    related_slugs: ["google.pause_campaign", "meta.create_campaign", "meta.increase_budget"],
    safety_note:
      "Launches are gated by the approval policy. New campaigns always land paused — you flip them active manually after review.",
  },

  "meta.send_alert_email": {
    slug: "meta.send_alert_email",
    category: "notify",
    outcome: "Deliver an email alert to org admins.",
    use_cases: [
      "A campaign breached a budget pacing threshold and the team should know.",
      "Daily anomaly digest summarizing the previous 24h.",
      "Confirmation email after a manual approval was fired.",
    ],
    outputs: [
      "Formatted email delivered to every org admin recipient.",
      "Audit row written to Decision History recording the send.",
    ],
    related_slugs: ["meta.pause_campaign", "google.pause_campaign", "meta.decrease_budget"],
  },

  "slack.post_message": {
    slug: "slack.post_message",
    category: "notify",
    outcome: "Post an update to your team's connected Slack channel.",
    use_cases: [
      "A campaign breached a threshold and the team should see it in Slack right away.",
      "Routing a daily summary into the channel where your marketers already work.",
      "Announcing that an automation just paused or scaled a campaign.",
    ],
    outputs: [
      "Message delivered to the org's connected Slack incoming webhook.",
      "Audit row written to Decision History recording the post.",
    ],
    related_slugs: ["meta.send_alert_email", "email.send_digest", "meta.pause_campaign"],
  },

  "email.send_digest": {
    slug: "email.send_digest",
    category: "notify",
    outcome: "Send a formatted plain-text digest email to your org admins.",
    use_cases: [
      "A scheduled weekly performance recap for the leadership inbox.",
      "A daily anomaly digest summarizing what changed across channels.",
      "A structured rollup of several metrics in one readable email.",
    ],
    outputs: [
      "Plain-text digest delivered to every org admin recipient.",
      "Audit row written to Decision History with the normalized digest body.",
    ],
    related_slugs: ["meta.send_alert_email", "slack.post_message", "meta.pause_campaign"],
  },
};

/**
 * Default enrichment for actions that don't yet have a curated entry.
 * Keeps the surface non-empty + honest without inventing fake content.
 */
export const DEFAULT_ENRICHMENT: Omit<ActionEnrichment, "slug"> = {
  category: "monitor",
  outcome: "Run this action against the connected integration.",
  use_cases: [
    "Configure the parameters and execute manually for ad-hoc operations.",
    "Reference from a custom workflow once the canonical handler ships.",
  ],
  outputs: ["Audit row written to Decision History with the result."],
  related_slugs: [],
};

/** Lookup helper — falls back to DEFAULT_ENRICHMENT with the given slug. */
export function lookupEnrichment(slug: string): ActionEnrichment {
  const found = ACTION_ENRICHMENTS[slug];
  if (found) return found;
  return { slug, ...DEFAULT_ENRICHMENT };
}

/** Category lookup helper */
export function lookupCategory(id: OperationCategoryId): OperationCategoryMeta {
  return OPERATION_CATEGORIES.find((c) => c.id === id) ?? OPERATION_CATEGORIES[5];
}
