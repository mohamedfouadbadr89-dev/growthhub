// Continuation #125 (2026-05-15) — Phase Ω.7 (Product Polish +
// Operations Visibility). Static FE enrichment layer for actions.
//
// The canonical `actions_library` table holds the executable substrate
// (id, platform, action_type, name, description, parameter_schema). It
// is owned by the backend; this enrichment layer adds marketer-facing
// metadata used purely for UX presentation:
//   - which operation category the action belongs to
//   - one-line marketer outcome
//   - 2-4 "when to use this" scenarios
//   - what the operator receives after running it
//   - related action slugs for discovery
//
// NO RUNTIME IMPACT. The backend never reads this manifest. Operators
// can run every action in the catalog whether or not it has an
// enrichment entry — missing entries fall back to defensive defaults.

import type { LucideIcon } from "lucide-react";

/**
 * Operation category used to group actions on the Operations surface.
 * Marketers see these labels in the category strip + "Browse by operation"
 * pivot. Slug-style ids so they round-trip into URLs cleanly.
 */
export type OperationCategoryId =
  | "pause"
  | "budget"
  | "launch"
  | "notify"
  | "report"
  | "monitor"
  | "approve";

export interface OperationCategoryMeta {
  id: OperationCategoryId;
  label: string;
  /** One-line description for the strip + tooltip */
  description: string;
  /** Lucide icon name (resolved at consumer site to avoid runtime import) */
  icon: string;
  /** Existing palette only — no new colors */
  accent_bg: string;
  accent_text: string;
  /** Render order on the marketplace pivot strip */
  sort_order: number;
}

/**
 * Per-action enrichment record. Keyed by the canonical action slug
 * `<platform>.<action_type>` (e.g. "meta.pause_campaign"). For
 * cross-platform actions whose slug has no platform prefix (e.g.
 * "send_alert_email"), the key is just the action_type.
 */
export interface ActionEnrichment {
  /** Canonical slug — matches `<platform>.<action_type>` or bare `action_type` */
  slug: string;
  /** Operation category for grouping */
  category: OperationCategoryId;
  /** Marketer-facing headline outcome (not the technical description) */
  outcome: string;
  /**
   * Short list of marketer-facing "when to use this" scenarios.
   * Each scenario is one sentence — concrete situations operators
   * recognize from their day-to-day work.
   */
  use_cases: string[];
  /** What the operator receives after running this action */
  outputs: string[];
  /**
   * Related action slugs — surfaced as a 3-card row on the action
   * detail page. Curated by hand; reading these from category sibling
   * lists as a fallback is handled at the consumer site.
   */
  related_slugs: string[];
  /**
   * Optional safety note — surfaced as an amber callout on the detail
   * page when the action is spend-increasing or launch-capable. The
   * canonical `actionRequiresApproval` server-side policy decides the
   * runtime gate; this string just explains the policy to operators.
   */
  safety_note?: string;
}

export interface OperationCategoryWithIcon extends OperationCategoryMeta {
  IconComponent: LucideIcon;
}
