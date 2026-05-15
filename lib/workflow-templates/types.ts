// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B (Templates
// Marketplace). Type definitions for the static workflow-template
// manifest. NO ORCHESTRATION RUNTIME — these types describe a
// catalog of curated starter workflows that route to the existing
// #111 Create Rule flow (single-step templates) or to the AI Copilot
// (multi-step drafts). The runtime executor remains `executeAction()`.
//
// Templates are intentionally a static FE manifest in this phase, not
// a backend table. If/when curation grows past ~30 entries OR per-org
// template overrides become needed, this can be migrated to a system-
// global `workflow_templates` table — the type shape here is designed
// to round-trip into such a table without redesign.

/**
 * The integrations this template touches. Each entry maps to a
 * canonical platform id used in the `integrations` table + the
 * connect router. `id` here matches the value used in `/api/v1/
 * integrations[].platform`.
 */
export type IntegrationProviderId =
  | 'meta'
  | 'google_ads'
  | 'shopify'
  | 'tiktok'
  | 'linkedin'
  | 'ga4'
  | 'sheets'
  | 'slides'
  | 'drive'
  | 'bigquery'
  | 'slack'
  | 'email'
  | 'search_console'
  | 'ai'

/**
 * Step kinds allowed in a template preview. NOT a runtime contract —
 * this is purely for display in template detail + Copilot draft.
 *
 *   trigger      — first step; describes what starts the workflow
 *   action       — operation against an integration (uses executeAction
 *                  in v1 only via the existing #111 rule path)
 *   condition    — single boolean gate; rendered as an "If X then Y" card
 *   approval     — human-in-the-loop pause via existing approval_queue
 *   ai_summary   — call to existing /ai/decisions/generate
 */
export type TemplateStepKind =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'approval'
  | 'ai_summary'

/**
 * Trigger-frequency descriptor for the "At a glance" sidebar +
 * Copilot draft preview. Display-only; the actual schedule wiring
 * lives in the existing automation_rules.trigger_type + (future)
 * schedule substrate.
 */
export interface TemplateTrigger {
  /** Display label, e.g. "Every Monday at 9:00 AM" or "On ROAS drop" */
  label: string
  /** Operator-friendly description */
  description: string
  /** Trigger kind for icon selection */
  kind: 'schedule' | 'metric_threshold' | 'manual' | 'ai_signal' | 'event'
  /** Schedule cadence (only when kind === 'schedule') */
  cadence?: 'daily' | 'weekly' | 'monthly'
}

/**
 * A single step in a template preview. Operators see this in:
 *   - Template detail page (workflow preview)
 *   - Copilot draft preview (when "Use Template" prefills the copilot)
 */
export interface TemplateStep {
  kind: TemplateStepKind
  /** Short display label, e.g. "Send Slack message" */
  label: string
  /** Operator-friendly description */
  description: string
  /** Integration provider this step touches; null for condition/trigger */
  integration: IntegrationProviderId | null
  /**
   * Optional action_type slug (e.g. "meta.pause_campaign") that maps
   * to a row in actions_library. When present + the template is
   * "simple" complexity, the Use-Template flow can prefill the #111
   * Create form with this action_template_id resolved by lookup.
   */
  action_type?: string
  /** Optional configured params summary (display only) */
  params_summary?: string
}

/**
 * What the operator will receive after the workflow runs.
 * Display-only; helps operators understand the value upfront.
 */
export interface TemplateOutput {
  kind: 'slack_message' | 'email' | 'slides_deck' | 'sheets_row' | 'notification' | 'mutation'
  description: string
}

export type TemplateCategoryId =
  | 'reporting'
  | 'optimization'
  | 'alerts'
  | 'monitoring'
  | 'creative'
  | 'ecommerce'
  | 'seo'

export type TemplateComplexity = 'simple' | 'multi_step'

export interface WorkflowTemplate {
  /** Stable id (kebab-case) used as URL slug + localStorage key */
  slug: string
  /** Display name, marketer-facing */
  name: string
  /** One-line description for cards + detail hero */
  description: string
  /** Full use-case explanation for the detail page */
  use_case: string
  /** Single category for grid filtering */
  category: TemplateCategoryId
  /** Optional secondary tags for search */
  tags?: string[]
  /** Lucide icon name used by the card + detail hero */
  icon: string
  /**
   * Complexity drives the Use-Template routing:
   *   - 'simple'     → prefilled #111 Create Rule form
   *   - 'multi_step' → AI Copilot with prefilled draft
   */
  complexity: TemplateComplexity
  /** Estimated minutes to set up */
  estimated_setup_minutes: number
  /** Operator-facing outcome statement, e.g. "Save ~2 hours per week" */
  primary_outcome: string
  /** Integration providers this template requires */
  integrations_required: IntegrationProviderId[]
  /** Trigger description for the preview */
  trigger: TemplateTrigger
  /** Ordered step list for the preview */
  steps: TemplateStep[]
  /** What the operator receives at the end */
  outputs: TemplateOutput[]
  /**
   * Whether this template's primary action requires the centralized
   * approval policy gate. Used to set Create-form `enabled` default
   * to false when prefilling. Mirrors backend `actionRequiresApproval`.
   */
  requires_approval?: boolean
  /** Always true in v1 (curated official catalog only) */
  is_official: boolean
}

export interface TemplateCategoryMeta {
  id: TemplateCategoryId
  label: string
  description: string
  /** Lucide icon name */
  icon: string
  /**
   * Tailwind color tokens (existing palette only — no new colors).
   * Used for the category accent on cards.
   */
  accent_bg: string
  accent_text: string
}
