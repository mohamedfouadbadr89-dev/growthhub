// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B. Seeded
// catalog of 14 production-grade marketing workflow templates.
//
// Each template is a curated starter that routes to a real flow:
//   - complexity='simple'     → /actions/automation?prefill=<slug>
//                               → existing #111 Create Rule form prefilled
//   - complexity='multi_step' → /automation/copilot?prefill=<slug>
//                               → Copilot draft preview with prefilled
//                                 structured steps; primary action lands
//                                 via the same #111 Create Rule path
//
// NO RUNTIME ORCHESTRATION. Templates are configuration data — the
// canonical executor `executeAction()` runs every action that ever
// fires from these flows.

import type { WorkflowTemplate } from "./types";

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ─── REPORTING ────────────────────────────────────────────────────────
  {
    slug: "weekly-ppc-performance-report",
    name: "Weekly PPC Performance Report",
    description: "Get a Slides deck of last week's PPC performance delivered to your inbox every Monday morning.",
    use_case:
      "Every Monday at 9 AM, this workflow pulls last week's Google Ads metrics, asks AI to summarize trends, generates a polished Slides deck, and emails you the link. Use this to start your week with a clear picture of where to focus.",
    category: "reporting",
    tags: ["ppc", "google-ads", "weekly", "slides"],
    icon: "FileBarChart",
    complexity: "multi_step",
    estimated_setup_minutes: 5,
    primary_outcome: "Save ~2 hours of manual reporting every week",
    integrations_required: ["google_ads", "ai", "slides", "email"],
    trigger: {
      label: "Every Monday at 9:00 AM",
      description: "Runs on a weekly schedule",
      kind: "schedule",
      cadence: "weekly",
    },
    steps: [
      { kind: "action", label: "Fetch Google Ads metrics", description: "Pull last 7 days of campaign performance.", integration: "google_ads", params_summary: "Last 7 days · All campaigns" },
      { kind: "ai_summary", label: "Summarize weekly trends", description: "AI identifies wins, drops and recommended actions.", integration: "ai" },
      { kind: "action", label: "Build Slides deck", description: "Generate a polished report with charts and headlines.", integration: "slides" },
      { kind: "action", label: "Email deck link", description: "Send the deck link to your team.", integration: "email" },
    ],
    outputs: [
      { kind: "slides_deck", description: "1 Google Slides deck with weekly highlights" },
      { kind: "email", description: "1 email to your inbox with the deck link" },
    ],
    is_official: true,
  },
  {
    slug: "daily-ecommerce-summary",
    name: "Daily Ecommerce Summary",
    description: "Get a morning digest of yesterday's Shopify orders, revenue and top products in Slack.",
    use_case:
      "Each morning at 8 AM, pulls yesterday's order count, revenue, AOV and top 5 SKUs from Shopify and posts a clean digest to your team channel. Perfect for daily stand-ups.",
    category: "ecommerce",
    tags: ["shopify", "daily", "slack", "digest"],
    icon: "ShoppingBag",
    complexity: "multi_step",
    estimated_setup_minutes: 4,
    primary_outcome: "Daily revenue visibility in 30 seconds",
    integrations_required: ["shopify", "ai", "slack"],
    trigger: {
      label: "Every morning at 8:00 AM",
      description: "Runs daily on a schedule",
      kind: "schedule",
      cadence: "daily",
    },
    steps: [
      { kind: "action", label: "Pull Shopify orders", description: "Fetch yesterday's orders and aggregate revenue.", integration: "shopify", params_summary: "Yesterday · All channels" },
      { kind: "ai_summary", label: "Generate digest", description: "AI writes a marketer-friendly summary.", integration: "ai" },
      { kind: "action", label: "Post to Slack", description: "Deliver the digest to your chosen channel.", integration: "slack", action_type: "slack.post_message" },
    ],
    outputs: [
      { kind: "slack_message", description: "1 Slack message in your team channel" },
    ],
    is_official: true,
  },
  {
    slug: "cross-channel-roas-snapshot",
    name: "Cross-Channel ROAS Snapshot",
    description: "Compare ROAS across Meta, Google and TikTok in a single Sheet, refreshed every Friday.",
    use_case:
      "Friday afternoons: pull this week's ROAS by channel, append to your tracking Sheet, and notify you when the gap between channels exceeds a threshold. Great for budget reallocation discussions.",
    category: "reporting",
    tags: ["roas", "cross-channel", "sheets"],
    icon: "Table2",
    complexity: "multi_step",
    estimated_setup_minutes: 6,
    primary_outcome: "Spot underperforming channels before budget reviews",
    integrations_required: ["meta", "google_ads", "sheets"],
    trigger: {
      label: "Every Friday at 4:00 PM",
      description: "Runs weekly before end of week",
      kind: "schedule",
      cadence: "weekly",
    },
    steps: [
      { kind: "action", label: "Fetch Meta ROAS", description: "Pull this week's ROAS from Meta Ads.", integration: "meta" },
      { kind: "action", label: "Fetch Google Ads ROAS", description: "Pull this week's ROAS from Google Ads.", integration: "google_ads" },
      { kind: "action", label: "Append to ROAS Tracker sheet", description: "Add this week's row to your tracking sheet.", integration: "sheets", params_summary: "Sheet: ROAS Tracker · Tab: Weekly" },
    ],
    outputs: [
      { kind: "sheets_row", description: "1 row appended to your ROAS Tracker sheet" },
    ],
    is_official: true,
  },

  // ─── OPTIMIZATION ─────────────────────────────────────────────────────
  {
    slug: "pause-underperforming-meta-campaigns",
    name: "Pause Underperforming Meta Campaigns",
    description: "Automatically pause Meta campaigns whose ROAS has dropped below your threshold for 24+ hours.",
    use_case:
      "When the AI detects sustained ROAS underperformance on a Meta campaign, this workflow pauses it and notifies you. Includes a confidence threshold so only high-certainty drops trigger the action.",
    category: "optimization",
    tags: ["meta", "auto-pause", "performance"],
    icon: "Pause",
    complexity: "simple",
    estimated_setup_minutes: 2,
    primary_outcome: "Stop spend leakage from broken campaigns automatically",
    integrations_required: ["meta", "ai"],
    trigger: {
      label: "On AI ROAS-drop signal",
      description: "Fires when the AI detects a sustained ROAS drop",
      kind: "ai_signal",
    },
    steps: [
      { kind: "action", label: "Pause Meta campaign", description: "Pause the underperforming campaign.", integration: "meta", action_type: "meta.pause_campaign" },
    ],
    outputs: [
      { kind: "mutation", description: "1 Meta campaign paused" },
    ],
    is_official: true,
  },
  {
    slug: "scale-winners-with-approval",
    name: "Scale Winners (with Approval)",
    description: "When a campaign hits target CAC consistently, request approval to scale budget by 25%.",
    use_case:
      "AI detects sustained over-performance and queues a budget increase for your approval. Spend-increasing actions never auto-fire — you stay in control. Approve in one click from the Approvals queue.",
    category: "optimization",
    tags: ["scaling", "approval", "budget"],
    icon: "TrendingUp",
    complexity: "multi_step",
    estimated_setup_minutes: 3,
    primary_outcome: "Capture scaling opportunities without risking auto-spend",
    integrations_required: ["meta", "ai"],
    requires_approval: true,
    trigger: {
      label: "On AI scaling opportunity",
      description: "Fires when sustained over-performance is detected",
      kind: "ai_signal",
    },
    steps: [
      { kind: "approval", label: "Wait for your approval", description: "Spend-increasing action — requires manual approval.", integration: null },
      { kind: "action", label: "Increase Meta budget by 25%", description: "Bump campaign budget within safe limits.", integration: "meta", action_type: "meta.increase_budget", params_summary: "+25% · capped by safety limit" },
    ],
    outputs: [
      { kind: "mutation", description: "1 Meta campaign budget increased (after approval)" },
    ],
    is_official: true,
  },
  {
    slug: "creative-fatigue-refresh",
    name: "Creative Fatigue Refresh",
    description: "Detect ad fatigue (CTR drop > 30%) and notify your creative team to refresh.",
    use_case:
      "When the AI detects ad fatigue on a high-spend ad, this workflow notifies your creative channel with the ad details and suggested next steps. No auto-mutations — humans drive the creative refresh.",
    category: "creative",
    tags: ["fatigue", "creative", "alerts"],
    icon: "Sparkles",
    complexity: "multi_step",
    estimated_setup_minutes: 3,
    primary_outcome: "Spot fatigue before performance crashes",
    integrations_required: ["meta", "ai", "slack"],
    trigger: {
      label: "On AI creative-fatigue signal",
      description: "Fires when CTR drops more than 30% week-over-week",
      kind: "ai_signal",
    },
    steps: [
      { kind: "ai_summary", label: "Summarize fatigue context", description: "AI describes the ad, current metrics and suggested angles.", integration: "ai" },
      { kind: "action", label: "Notify creative channel", description: "Post the alert with ad preview and metrics.", integration: "slack", action_type: "slack.post_message" },
    ],
    outputs: [
      { kind: "slack_message", description: "1 Slack message to your creative channel" },
    ],
    is_official: true,
  },

  // ─── ALERTS ───────────────────────────────────────────────────────────
  {
    slug: "budget-pacing-alert",
    name: "Budget Pacing Alert",
    description: "Get notified when any campaign exceeds 80% of its monthly budget before month-end.",
    use_case:
      "Daily check across all your active campaigns. When pacing exceeds the threshold, you get a Slack alert + email with the campaign details and recommended actions.",
    category: "alerts",
    tags: ["budget", "pacing", "alerts"],
    icon: "Bell",
    complexity: "multi_step",
    estimated_setup_minutes: 4,
    primary_outcome: "Never overspend a monthly budget by accident",
    integrations_required: ["meta", "google_ads", "slack", "email"],
    trigger: {
      label: "Daily at 10:00 AM",
      description: "Runs daily on a schedule",
      kind: "schedule",
      cadence: "daily",
    },
    steps: [
      { kind: "action", label: "Fetch month-to-date spend", description: "Pull MTD spend across Meta + Google campaigns.", integration: "meta" },
      { kind: "condition", label: "If pacing > 80% of budget", description: "Only alert when threshold breached.", integration: null },
      { kind: "action", label: "Send Slack + email alert", description: "Notify the channel and inbox with the specifics.", integration: "slack", action_type: "slack.post_message" },
    ],
    outputs: [
      { kind: "slack_message", description: "1 Slack message if threshold breached" },
      { kind: "email", description: "1 email if threshold breached" },
    ],
    is_official: true,
  },
  {
    slug: "cac-spike-notification",
    name: "CAC Spike Notification",
    description: "Alert when customer acquisition cost spikes >20% above your 7-day average.",
    use_case:
      "Continuously monitors your CAC. When it spikes meaningfully above the 7-day baseline, you get an instant Slack alert with the campaign and channel that's driving the spike.",
    category: "alerts",
    tags: ["cac", "alerts", "spike"],
    icon: "AlertTriangle",
    complexity: "simple",
    estimated_setup_minutes: 2,
    primary_outcome: "Catch CAC regressions within the same day",
    integrations_required: ["ai", "slack"],
    trigger: {
      label: "On AI CAC-spike signal",
      description: "Fires when AI detects a meaningful CAC spike",
      kind: "ai_signal",
    },
    steps: [
      { kind: "action", label: "Send Slack alert", description: "Post the alert with campaign attribution.", integration: "slack", action_type: "slack.post_message" },
    ],
    outputs: [
      { kind: "slack_message", description: "1 Slack message with spike details" },
    ],
    is_official: true,
  },
  {
    slug: "anomaly-digest-daily",
    name: "Daily Anomaly Digest",
    description: "Get a single morning summary of every AI-detected anomaly across all channels overnight.",
    use_case:
      "Each morning at 8 AM, AI summarizes every anomaly detected in the last 24 hours into one digest. No more checking five tabs — get the full picture in one email.",
    category: "alerts",
    tags: ["digest", "anomaly", "daily"],
    icon: "AlertCircle",
    complexity: "multi_step",
    estimated_setup_minutes: 3,
    primary_outcome: "Replace 5 dashboards with one morning digest",
    integrations_required: ["ai", "email"],
    trigger: {
      label: "Every morning at 8:00 AM",
      description: "Runs daily on a schedule",
      kind: "schedule",
      cadence: "daily",
    },
    steps: [
      { kind: "ai_summary", label: "Summarize overnight anomalies", description: "AI writes a digest of every signal from the last 24h.", integration: "ai" },
      { kind: "action", label: "Email digest", description: "Send the summary to your inbox.", integration: "email", action_type: "email.send_digest" },
    ],
    outputs: [
      { kind: "email", description: "1 daily digest email with every detected anomaly" },
    ],
    is_official: true,
  },

  // ─── MONITORING ───────────────────────────────────────────────────────
  {
    slug: "competitor-watch-weekly",
    name: "Competitor Watch (Weekly)",
    description: "Weekly summary of competitor ad activity from your defined competitor list.",
    use_case:
      "Maintain a competitor list and get a weekly summary of their ad activity, creative angles and estimated spend trends. Helps inform your own creative direction.",
    category: "monitoring",
    tags: ["competitor", "weekly", "creative"],
    icon: "Search",
    complexity: "multi_step",
    estimated_setup_minutes: 8,
    primary_outcome: "Stay ahead of competitor strategy shifts",
    integrations_required: ["ai", "email"],
    trigger: {
      label: "Every Tuesday at 9:00 AM",
      description: "Runs weekly on a schedule",
      kind: "schedule",
      cadence: "weekly",
    },
    steps: [
      { kind: "ai_summary", label: "Summarize competitor activity", description: "AI surveys your competitor list and surfaces patterns.", integration: "ai" },
      { kind: "action", label: "Email summary", description: "Send the brief to your inbox.", integration: "email", action_type: "email.send_digest" },
    ],
    outputs: [
      { kind: "email", description: "1 weekly competitor brief" },
    ],
    is_official: true,
  },
  {
    slug: "approval-queue-digest",
    name: "Approval Queue Digest",
    description: "Daily Slack reminder of pending approvals so nothing waits more than 24 hours.",
    use_case:
      "Every morning, check your pending approvals queue and post a Slack reminder with one-click approve links. Keeps spend-increasing decisions from getting stuck.",
    category: "monitoring",
    tags: ["approvals", "digest", "slack"],
    icon: "ShieldAlert",
    complexity: "multi_step",
    estimated_setup_minutes: 2,
    primary_outcome: "Never leave an approval waiting overnight",
    integrations_required: ["slack"],
    trigger: {
      label: "Daily at 9:30 AM",
      description: "Runs daily on a schedule",
      kind: "schedule",
      cadence: "daily",
    },
    steps: [
      { kind: "action", label: "Build approval list", description: "Collect every pending approval from the queue.", integration: null },
      { kind: "condition", label: "If approvals are pending", description: "Skip Slack post if queue is empty.", integration: null },
      { kind: "action", label: "Post digest to Slack", description: "One-click approve links per row.", integration: "slack", action_type: "slack.post_message" },
    ],
    outputs: [
      { kind: "slack_message", description: "1 Slack message when approvals pending" },
    ],
    is_official: true,
  },

  // ─── ECOMMERCE ────────────────────────────────────────────────────────
  {
    slug: "shopify-low-stock-alert",
    name: "Low-Stock Alert",
    description: "Get notified when any best-selling SKU drops below safety stock.",
    use_case:
      "Continuously monitor inventory across your top SKUs. When stock drops below your threshold, get a Slack alert with the SKU, current quantity and 7-day sell-through rate.",
    category: "ecommerce",
    tags: ["shopify", "inventory", "alerts"],
    icon: "Package",
    complexity: "multi_step",
    estimated_setup_minutes: 3,
    primary_outcome: "Avoid stockouts on your top revenue products",
    integrations_required: ["shopify", "slack"],
    trigger: {
      label: "Every 4 hours",
      description: "Runs continuously through the day",
      kind: "schedule",
      cadence: "daily",
    },
    steps: [
      { kind: "action", label: "Check Shopify inventory", description: "Pull current stock across your top SKUs.", integration: "shopify" },
      { kind: "condition", label: "If any SKU below threshold", description: "Only alert when stock is low.", integration: null },
      { kind: "action", label: "Post Slack alert", description: "Notify the channel with SKU details.", integration: "slack", action_type: "slack.post_message" },
    ],
    outputs: [
      { kind: "slack_message", description: "1 Slack alert per low-stock SKU" },
    ],
    is_official: true,
  },

  // ─── SEO ──────────────────────────────────────────────────────────────
  {
    slug: "search-console-weekly-insights",
    name: "Search Console Weekly Insights",
    description: "Weekly summary of top queries, position changes and CTR shifts from Search Console.",
    use_case:
      "Every Monday, pull last week's Search Console data, identify queries with notable position or CTR shifts, and email you a marketer-friendly summary.",
    category: "seo",
    tags: ["seo", "search-console", "weekly"],
    icon: "Globe",
    complexity: "multi_step",
    estimated_setup_minutes: 5,
    primary_outcome: "SEO trend visibility without diving into Search Console",
    integrations_required: ["search_console", "ai", "email"],
    trigger: {
      label: "Every Monday at 10:00 AM",
      description: "Runs weekly on a schedule",
      kind: "schedule",
      cadence: "weekly",
    },
    steps: [
      { kind: "action", label: "Fetch Search Console data", description: "Pull last week's queries, positions and clicks.", integration: "search_console" },
      { kind: "ai_summary", label: "Identify shifts and opportunities", description: "AI surfaces the meaningful moves.", integration: "ai" },
      { kind: "action", label: "Email summary", description: "Deliver the brief to your inbox.", integration: "email", action_type: "email.send_digest" },
    ],
    outputs: [
      { kind: "email", description: "1 weekly SEO insights email" },
    ],
    is_official: true,
  },

  // ─── REPORTING (extra — high-value daily) ─────────────────────────────
  {
    slug: "ad-spend-snapshot-daily",
    name: "Daily Ad Spend Snapshot",
    description: "Morning digest of yesterday's spend across all paid channels with ROAS commentary.",
    use_case:
      "Morning at 8 AM: total ad spend, breakdown by channel, ROAS commentary from AI. Useful for daily revenue review and budget guardrails.",
    category: "reporting",
    tags: ["spend", "daily", "digest"],
    icon: "DollarSign",
    complexity: "multi_step",
    estimated_setup_minutes: 4,
    primary_outcome: "Yesterday's spend picture in 30 seconds",
    integrations_required: ["meta", "google_ads", "ai", "email"],
    trigger: {
      label: "Every morning at 8:00 AM",
      description: "Runs daily on a schedule",
      kind: "schedule",
      cadence: "daily",
    },
    steps: [
      { kind: "action", label: "Fetch yesterday's spend", description: "Pull spend totals from Meta + Google.", integration: "meta" },
      { kind: "ai_summary", label: "Commentary + ROAS", description: "AI writes a brief on what drove the spend.", integration: "ai" },
      { kind: "action", label: "Email snapshot", description: "Deliver the snapshot to your inbox.", integration: "email", action_type: "email.send_digest" },
    ],
    outputs: [
      { kind: "email", description: "1 daily spend snapshot email" },
    ],
    is_official: true,
  },
];

export function getTemplateBySlug(slug: string): WorkflowTemplate | null {
  return WORKFLOW_TEMPLATES.find((t) => t.slug === slug) ?? null;
}

export function getRelatedTemplates(slug: string, limit = 3): WorkflowTemplate[] {
  const source = getTemplateBySlug(slug);
  if (!source) return [];
  // Prefer same category first; fall back to shared integrations.
  const sameCategory = WORKFLOW_TEMPLATES.filter(
    (t) => t.slug !== slug && t.category === source.category,
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
  const remaining = WORKFLOW_TEMPLATES.filter(
    (t) =>
      t.slug !== slug &&
      t.category !== source.category &&
      t.integrations_required.some((i) => source.integrations_required.includes(i)),
  );
  return [...sameCategory, ...remaining].slice(0, limit);
}
