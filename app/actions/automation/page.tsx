"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, CheckCircle, RotateCcw, AlertTriangle, Pause, Play, Activity, Zap, History, RefreshCw, Plus, X,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";
// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 8.
// Activation bridge: reads ?prefill=<template_slug>|<draft_id> on
// mount and pre-populates the existing #111 Create-Rule form. NO new
// execution path; the canonical POST /api/v1/automation/rules write
// remains the only way rules land.
import { getDraft as getCopilotDraft } from "@/lib/copilot-drafts";
import { getTemplateBySlug } from "@/lib/workflow-templates";

// Best-effort mapping from a template's tags + trigger.kind to the
// backend automation_rules.trigger_type CHECK enum. Used by the
// prefill bridge so operators land on a valid form selection.
function derivePrefilledTriggerType(
  tags: readonly string[],
  triggerKind: "schedule" | "metric_threshold" | "manual" | "ai_signal" | "event",
): string {
  if (triggerKind === "ai_signal") {
    const tagSet = new Set(tags);
    if (tagSet.has("creative") || tagSet.has("fatigue")) return "CONVERSION_DROP";
    if (tagSet.has("scaling")) return "SCALING_OPPORTUNITY";
    if (tagSet.has("spike") || tagSet.has("budget")) return "SPEND_SPIKE";
  }
  return "ROAS_DROP";
}

// Continuation #41 (2026-05-12) — wired Automation Status page to canonical
// Phase 4 Part 2 automation endpoints under ADJACENT CONTINUATION AUTHORITY.
// Backend contracts pre-existed (`GET /api/v1/automation/rules`,
// `GET /api/v1/automation/runs`, `PATCH /api/v1/automation/rules/:id`); FE
// swap from mock arrays to real data with zero schema / backend / migration
// change. Same pattern as #13/#22/#33/#36/#40.
//
// Rule → Card mapping:
//   - id, name → card title
//   - trigger_type → desc ("Triggered on ROAS_DROP", etc.)
//   - actions_library.platform → platform tag(s)
//   - enabled → running/paused status (toggle via PATCH {enabled: !current})
//   - min_confidence_threshold → "Min Conf" stat
//   - run_count → "Runs" stat
//   - last_fired_at → relative time
//
// Run → Live Activity mapping:
//   - executed_at + status + automation_rules.name → activity feed item
//
// Bottom KPI cards derived from loaded data:
//   - Total Rules / Enabled Rules / Success Rate (across runs)
//
// Removed surfaces (no backend mapping, would require speculative scope):
//   - Sensitivity slider (UI placeholder only; not persisted server-side)
//   - Pause All / Resume All (bulk-mutation; safer to require explicit per-
//     rule toggles to avoid accidentally disabling the entire auto-fire
//     stream — preserves the dormant-by-default safety property)
//   - Fabricated "$142.8k Revenue Impact" / "-18.2% CPA" KPIs (no schema
//     source — replaced with derived rule/run stats)
//   - "Risk & Safety" card kept as informational shell (stop-loss /
//     rollback subsystems are not part of Phase 4 Part 2 contract)

type RuleEnabled = boolean;

interface ApiRule {
  id: string;
  name: string;
  trigger_type: string;
  min_confidence_threshold: number;
  action_template_id: string;
  action_params: Record<string, unknown>;
  enabled: RuleEnabled;
  run_count: number;
  last_fired_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined: { platform, name, action_type } via PostgREST nested-select on
  // actions_library. The optional action_type field was added in #102 so
  // the server can compute `requires_approval` from the central policy
  // (automation-engine.ts:actionRequiresApproval). FE consumes the
  // computed flag directly — no FE mirror of the action-type set is
  // needed (single source of truth).
  actions_library?: {
    platform: string;
    name: string;
    action_type?: string;
  } | null;
  // Continuation #102 (2026-05-12) — server-computed approval-required
  // flag. When true, the auto-fire gate (#99 in automation-engine.ts)
  // will SKIP this rule on the AI-decision stream; operator must
  // manually trigger via POST /automation/rules/:id/execute.
  requires_approval?: boolean;
}

// Continuation #111 (2026-05-14) — action template type for the new Create
// Rule form. Backend `GET /api/v1/actions` (actions.ts:36) returns the
// system-global actions_library catalog; this is the canonical source
// `POST /automation/rules` validates `action_template_id` against (FK to
// actions_library.id). Form-select choices are derived from this list so
// operators can never pick an invalid template ID. `action_type` carried
// through purely so the form can hint when the chosen template requires
// approval (matches the #99/#102 centralized policy without mirroring the
// set client-side — display-only).
interface ApiAction {
  id: string;
  platform: string;
  action_type: string;
  name: string;
  description: string | null;
  parameter_schema: Record<string, unknown> | null;
  created_at: string;
}

// Continuation #119 (2026-05-14) — Phase β Layer 3 recommendation payload
// returned by GET /api/v1/automation/recommendations. Mirrors the BE shape
// exactly; FE never derives recommendations itself.
interface ApiRecommendation {
  category: string;
  decision_count_30d: number;
  avg_confidence: number;
  suggested_action_template_id: string;
  suggested_action_name: string;
  suggested_action_type: string;
  suggested_platform: string;
  requires_approval: boolean;
  suggested_min_confidence_threshold: number;
  suggested_rule_name: string;
  rationale: string;
}

// Trigger-type enum mirrors the backend VALID_TRIGGER_TYPES set
// (automation.ts:30). Single source of truth lives in the backend; this is
// purely a display list for the form select — the canonical 400 error path
// catches mismatches if the lists drift.
const TRIGGER_TYPE_OPTIONS = [
  "ROAS_DROP",
  "SPEND_SPIKE",
  "CONVERSION_DROP",
  "SCALING_OPPORTUNITY",
] as const;

interface ApiRun {
  id: string;
  org_id: string;
  automation_rule_id: string | null;
  ai_decision_id: string | null;
  action_template_id: string | null;
  status: "pending" | "success" | "failed" | "skipped";
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  executed_at: string | null;
  automation_rules?: { name: string } | null;
  ai_decisions?: {
    category: string | null;
    confidence_score: number | null;
    reasoning_steps: Array<{ step: string; insight: string }> | null;
  } | null;
  actions_library?: {
    name: string;
    platform: string;
    action_type: string;
  } | null;
}

// Continuation #122 (2026-05-14) — Phase Ω cleanup. Dropped orphan
// `tiktok` / `snapchat` keys; backend `VALID_PLATFORMS` in actions.ts:33
// only accepts meta/google/shopify.
const PLATFORM_DOT: Record<string, string> = {
  meta: "#0668E1",
  google: "#4285F4",
  shopify: "#5E8E3E",
};

function platformColor(platform: string | null | undefined): string {
  if (!platform) return "#3d618c";
  return PLATFORM_DOT[platform.toLowerCase()] ?? "#3d618c";
}

// Continuation #117 (2026-05-14) — Phase α Layer 1 (Automation Explainability)
// per `specs/automation-explainability.md`. Bucket the loaded runs by day for
// a given rule, last 7 days. Returns 7 numbers: index 0 = 6 days ago,
// index 6 = today. Defensive on bad timestamps — silently skips.
function bucketRunsByDay(runsForRule: ApiRun[], days: number = 7): number[] {
  const buckets = new Array(days).fill(0);
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  for (const r of runsForRule) {
    if (!r.executed_at) continue;
    const t = new Date(r.executed_at).getTime();
    if (Number.isNaN(t)) continue;
    const daysAgo = Math.floor((now - t) / DAY);
    if (daysAgo < 0 || daysAgo >= days) continue;
    buckets[days - 1 - daysAgo] += 1;
  }
  return buckets;
}

function relTime(iso: string | null): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "Just now";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const STATUS_DOT: Record<ApiRun["status"], string> = {
  pending: "bg-amber-400",
  success: "bg-emerald-500",
  failed:  "bg-red-500",
  skipped: "bg-muted-foreground",
};

function AutomationPageInner() {
  const { getToken } = useAuth();

  const [rules,     setRules]     = useState<ApiRule[]>([]);
  const [runs,      setRuns]      = useState<ApiRun[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  // Continuation #43 — manual rule fire state. Mirrors the toggle pattern;
  // separate keys so a rule can be toggling and firing at different times
  // without UI state collision.
  const [firingId, setFiringId] = useState<string | null>(null);
  const [fireMessage, setFireMessage] = useState<
    | { kind: "success"; text: string }
    | { kind: "error";   text: string }
    | null
  >(null);

  // Continuation #47 — refresh-on-demand. Same pattern as the symmetric
  // refresh added to /automation/history at #47 — separates the initial-
  // load useEffect from the explicit refresh callback so the header button
  // can re-poll rules + runs without churning effect deps. Used after
  // manual fire (#43) auto-refresh and from the new header button.
  const [refreshing, setRefreshing] = useState(false);

  // Continuation #111 (2026-05-14) — Create Rule form state. Closes audit
  // item #2 (missing CRUD verb on the canonical POST /automation/rules
  // endpoint). The inline-expanded form pattern is preferred over a modal
  // to avoid modal-infrastructure scope creep + match the in-page reveal
  // language used elsewhere in the cockpit. `actions` is loaded from
  // GET /api/v1/actions (system-global actions_library catalog) on mount.
  const [actions, setActions] = useState<ApiAction[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    trigger_type: "ROAS_DROP" as (typeof TRIGGER_TYPE_OPTIONS)[number],
    action_template_id: "",
    min_confidence_threshold: 70,
    enabled: true,
  });

  // Continuation #119 (2026-05-14) — Phase β Layer 3 (Recommended
  // Automations) per `specs/recommended-automations.md`. Reads the
  // additive `GET /api/v1/automation/recommendations` endpoint and
  // renders a card above the rules grid when uncovered categories
  // exist (decision_count_30d >= 3). One-click pre-fills the existing
  // #111 Create form — NO autonomous rule creation; operator must
  // submit. Approval-required categories default to enabled=false.
  const [recommendations, setRecommendations] = useState<ApiRecommendation[]>([]);
  const [dismissedRecKeys, setDismissedRecKeys] = useState<Set<string>>(new Set());

  // Continuation #92 (2026-05-12) — data-freshness indicator extended to
  // the automation status page (third volatility-sensitive cockpit
  // surface after #90 dashboard/overview + #91 automation/history). Auto-
  // fires can happen on the AI decision stream between explicit operator
  // refreshes; the "Updated X ago" signal lets operators judge whether
  // rule state is current.
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  function relUpdated(): string {
    if (lastUpdatedAt === null) return "—";
    const ms = nowTick - lastUpdatedAt;
    if (ms < 60_000) return "just now";
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  async function refreshAll() {
    setRefreshing(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const [rulesData, runsData, actionsData, recsData] = await Promise.all([
        apiClient<{ rules: ApiRule[]; total: number }>("/api/v1/automation/rules", token),
        apiClient<{ runs: ApiRun[]; total: number }>("/api/v1/automation/runs?limit=100", token),
        apiClient<{ actions: ApiAction[]; total: number }>("/api/v1/actions", token),
        apiClient<{ recommendations: ApiRecommendation[]; total: number }>(
          "/api/v1/automation/recommendations",
          token,
        ),
      ]);
      setRules(rulesData.rules);
      setRuns(runsData.runs);
      setActions(actionsData.actions);
      setRecommendations(recsData.recommendations);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setLoadError(formatErrorMessage(err, "Failed to refresh automation status"));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const token = await getToken();
        if (!token) throw new ApiError(401, "Sign in required");
        const [rulesData, runsData, actionsData, recsData] = await Promise.all([
          apiClient<{ rules: ApiRule[]; total: number }>(
            "/api/v1/automation/rules",
            token,
          ),
          apiClient<{ runs: ApiRun[]; total: number }>(
            "/api/v1/automation/runs?limit=100",
            token,
          ),
          apiClient<{ actions: ApiAction[]; total: number }>(
            "/api/v1/actions",
            token,
          ),
          apiClient<{ recommendations: ApiRecommendation[]; total: number }>(
            "/api/v1/automation/recommendations",
            token,
          ),
        ]);
        if (!cancelled) {
          setRules(rulesData.rules);
          setRuns(runsData.runs);
          setActions(actionsData.actions);
          setRecommendations(recsData.recommendations);
          setLastUpdatedAt(Date.now());
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(formatErrorMessage(err, "Failed to load automation status"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  // Continuation #43 — manual rule fire via canonical `POST /api/v1/automation/
  // rules/:id/execute`. Body is OPTIONAL per automation.ts:309 (empty body =
  // valid manual fire, no ai_decision_id linkage). Goes through canonical
  // executeAction pipeline → idempotency, parameter validation, rate limit
  // (60/min/org), audit-row insertion in decision_history + automation_runs.
  // Real-mode handlers gated by LIVE flags + org allowlist (default OFF →
  // simulated mode). After success, refresh runs feed so the new audit row
  // appears in Live Activity.
  async function fireRule(rule: ApiRule) {
    if (!rule.enabled) {
      setFireMessage({ kind: "error", text: "Rule is disabled — enable it first" });
      return;
    }
    setFiringId(rule.id);
    setFireMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const result = await apiClient<{ rules_fired: number; run_ids: string[] }>(
        `/api/v1/automation/rules/${rule.id}/execute`,
        token,
        { method: "POST", body: "{}" },
      );
      setFireMessage({
        kind: "success",
        text: `Fired "${rule.name}" — ${result.rules_fired} run${result.rules_fired === 1 ? "" : "s"} created`,
      });
      // Refresh runs feed so the new audit row appears in Live Activity.
      try {
        const runsData = await apiClient<{ runs: ApiRun[]; total: number }>(
          "/api/v1/automation/runs?limit=100",
          token,
        );
        setRuns(runsData.runs);
        // Bump run_count + last_fired_at on the rule card optimistically.
        setRules((prev) => prev.map((r) => r.id === rule.id
          ? { ...r, run_count: r.run_count + result.rules_fired, last_fired_at: new Date().toISOString() }
          : r));
      } catch {
        // Refresh is best-effort; failure here doesn't change the fire result.
      }
    } catch (err) {
      setFireMessage({ kind: "error", text: formatErrorMessage(err, "Failed to fire rule") });
    } finally {
      setFiringId(null);
    }
  }

  // Continuation #111 (2026-05-14) — create-rule submit. POST to canonical
  // /api/v1/automation/rules with the validated form fields. Backend
  // (automation.ts:88-200) re-validates every field (name non-empty,
  // trigger_type in enum, action_template_id UUID + FK present, threshold
  // 0-100 integer, enabled boolean) and emits canonical
  // {success:false,error:{code,field}} on rejection. We surface
  // error.field positioning by mapping the code → user-readable message.
  // On success the new rule is prepended to the rules list optimistically
  // and form state reset; `requires_approval` is computed server-side
  // (#102) and arrives on the response row.
  // Continuation #119 (2026-05-14) — Phase β Layer 3 prefill handler.
  // Pre-populates the existing #111 Create form from a recommendation
  // and opens it for review. NO autonomous submission — operator must
  // explicitly click "Create Workflow" in the form. Approval-required
  // recommendations default to enabled=false so the rule lands dormant.
  function applyRecommendation(rec: ApiRecommendation) {
    setCreateError(null);
    // Force trigger_type to a canonical enum value the form select knows
    // about. If category isn't in TRIGGER_TYPE_OPTIONS, fall back to the
    // current value (defensive; server will reject if invalid).
    const validTrigger = (TRIGGER_TYPE_OPTIONS as readonly string[]).includes(rec.category)
      ? (rec.category as (typeof TRIGGER_TYPE_OPTIONS)[number])
      : createForm.trigger_type;
    setCreateForm({
      name: rec.suggested_rule_name,
      trigger_type: validTrigger,
      action_template_id: rec.suggested_action_template_id,
      min_confidence_threshold: rec.suggested_min_confidence_threshold,
      enabled: !rec.requires_approval,
    });
    setShowCreateForm(true);
    // Scroll to the form so operators see it.
    setTimeout(() => {
      document.querySelector("form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  function dismissRecommendation(rec: ApiRecommendation) {
    setDismissedRecKeys((prev) => {
      const next = new Set(prev);
      next.add(`${rec.category}:${rec.suggested_action_template_id}`);
      return next;
    });
  }

  // Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 8.
  // Activation bridge: when the page is reached via `?prefill=<key>`,
  // resolve the key against (1) the static template manifest and
  // (2) localStorage Copilot drafts; if either resolves, pre-populate
  // the existing #111 Create-Rule form. Resolved action_type slugs are
  // looked up against the in-memory `actions` catalog (loaded earlier)
  // so we can pass the canonical UUID to action_template_id. URL is
  // cleaned via router.replace so refreshes don't re-prefill.
  //
  // No new execution path. The canonical POST /automation/rules write
  // still happens only when the operator clicks "Create Workflow" inside
  // the form. Approval-required drafts default to enabled=false.
  const searchParams = useSearchParams();
  const router = useRouter();
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (!prefill) return;
    // Don't try to resolve action_template_id until actions catalog loaded
    if (actions.length === 0) return;

    type Prefill = {
      name: string;
      trigger_type: string;
      action_type_slug: string | undefined;
      min_confidence_threshold: number;
      requires_approval: boolean;
    };
    let resolved: Prefill | null = null;

    // 1. Template slug match
    const template = getTemplateBySlug(prefill);
    if (template) {
      const primaryStep = template.steps.find((s) => s.kind === "action" && s.action_type);
      resolved = {
        name: template.name,
        trigger_type: derivePrefilledTriggerType(template.tags ?? [], template.trigger.kind),
        action_type_slug: primaryStep?.action_type,
        min_confidence_threshold: 70,
        requires_approval: !!template.requires_approval,
      };
    } else {
      // 2. Copilot draft id match
      const draft = getCopilotDraft(prefill);
      if (draft) {
        resolved = {
          name: draft.name,
          trigger_type: draft.primary_trigger_type ?? "ROAS_DROP",
          action_type_slug: draft.primary_action_type,
          min_confidence_threshold: draft.primary_min_confidence_threshold ?? 70,
          requires_approval: !!draft.requires_approval,
        };
      }
    }

    if (!resolved) {
      // Unknown prefill — clean URL silently
      router.replace("/actions/automation");
      return;
    }

    // Resolve the action_type slug (e.g. "meta.pause_campaign") to the
    // actions_library UUID by matching against the in-memory catalog.
    // If the slug doesn't match any catalog row (handler not yet
    // landed), the prefill drops action_template_id — operator sees
    // an open form ready for selection, no fake submission.
    let actionTemplateId = "";
    if (resolved.action_type_slug) {
      const match = actions.find(
        (a) => `${a.platform}.${a.action_type}` === resolved!.action_type_slug,
      );
      if (match) actionTemplateId = match.id;
    }

    const validTrigger = (TRIGGER_TYPE_OPTIONS as readonly string[]).includes(resolved.trigger_type)
      ? (resolved.trigger_type as (typeof TRIGGER_TYPE_OPTIONS)[number])
      : "ROAS_DROP";

    setCreateForm({
      name: resolved.name,
      trigger_type: validTrigger,
      action_template_id: actionTemplateId,
      min_confidence_threshold: resolved.min_confidence_threshold,
      enabled: !resolved.requires_approval,
    });
    setShowCreateForm(true);
    setCreateError(null);
    // Scroll to the form so operators see it
    setTimeout(() => {
      document.querySelector("form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    router.replace("/actions/automation");
  }, [searchParams, router, actions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      if (createForm.name.trim() === "") {
        throw new ApiError(400, "Rule name is required");
      }
      if (createForm.action_template_id === "") {
        throw new ApiError(400, "Select an action template");
      }
      const newRule = await apiClient<ApiRule>(
        "/api/v1/automation/rules",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name: createForm.name.trim(),
            trigger_type: createForm.trigger_type,
            action_template_id: createForm.action_template_id,
            min_confidence_threshold: createForm.min_confidence_threshold,
            enabled: createForm.enabled,
          }),
        },
      );
      // Backend returns the rule row WITHOUT the actions_library JOIN
      // (POST select narrowed to base columns at automation.ts:179-181).
      // Hydrate the joined fields from our local actions catalog so the
      // new card renders the platform dot + action name + approval badge
      // identically to refetched cards — avoids a forced re-fetch round
      // trip and keeps the optimistic insert visually consistent.
      const chosen = actions.find((a) => a.id === createForm.action_template_id);
      const enriched: ApiRule = chosen
        ? {
            ...newRule,
            actions_library: {
              platform: chosen.platform,
              name: chosen.name,
              action_type: chosen.action_type,
            },
            // requires_approval will land in subsequent refresh; for the
            // optimistic insert, leave it absent → no badge shown until
            // the next refreshAll confirms the backend's policy verdict.
          }
        : newRule;
      setRules((prev) => [enriched, ...prev]);
      setShowCreateForm(false);
      setCreateForm({
        name: "",
        trigger_type: "ROAS_DROP",
        action_template_id: "",
        min_confidence_threshold: 70,
        enabled: true,
      });
      setFireMessage({
        kind: "success",
        text: `Rule "${newRule.name}" created`,
      });
    } catch (err) {
      setCreateError(formatErrorMessage(err, "Failed to create rule"));
    } finally {
      setCreating(false);
    }
  }

  // Optimistic toggle with rollback on PATCH failure. Preserves the
  // dormant-by-default safety property: if backend rejects, UI snaps back.
  async function toggleRule(rule: ApiRule) {
    setToggleError(null);
    const next = !rule.enabled;
    setTogglingId(rule.id);
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: next } : r));
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const updated = await apiClient<ApiRule>(
        `/api/v1/automation/rules/${rule.id}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: next }),
        },
      );
      setRules((prev) => prev.map((r) => r.id === rule.id
        ? { ...r, ...updated, actions_library: r.actions_library }
        : r));
    } catch (err) {
      // Rollback optimistic state.
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: rule.enabled } : r));
      setToggleError(formatErrorMessage(err, "Failed to update rule"));
    } finally {
      setTogglingId(null);
    }
  }

  const activeCount = rules.filter((r) => r.enabled).length;
  const totalRules = rules.length;
  const recentSuccessCount = runs.filter((r) => r.status === "success").length;
  const successRatePct = runs.length === 0
    ? 0
    : Math.round((recentSuccessCount / runs.length) * 100);
  const lastFiredAt = rules
    .map((r) => r.last_fired_at)
    .filter((x): x is string => x !== null)
    .sort()
    .reverse()[0] ?? null;

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Automation Status
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-body">
              {activeCount > 0 ? "Active — auto-fire on AI decision stream" : "Dormant — no enabled rules"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {lastUpdatedAt !== null && (
            <span className="text-[11px] text-muted-foreground font-body">
              Updated <span className="font-bold text-foreground">{relUpdated()}</span>
            </span>
          )}
          <button
            onClick={() => void refreshAll()}
            disabled={refreshing || loading}
            title="Refresh — re-poll rules and runs"
            className="inline-flex items-center gap-2 bg-surface-container-high text-foreground px-4 py-2 rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {/* Continuation #111 — Create Rule trigger. Inline-reveals the
              form below; preferred over modal to avoid modal infrastructure
              and match in-page reveal language used elsewhere. */}
          <button
            onClick={() => {
              setCreateError(null);
              setShowCreateForm((v) => !v);
            }}
            disabled={loading || actions.length === 0}
            title={actions.length === 0 ? "Action library not loaded" : "Create new automation rule"}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-primary/90 transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showCreateForm ? <X size={12} /> : <Plus size={12} />}
            {showCreateForm ? "Cancel" : "Create Workflow"}
          </button>
          <div className="text-right">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest font-body">Enabled Workflows</p>
            <p className="text-3xl font-black text-foreground font-sans leading-none">{activeCount}<span className="text-muted-foreground text-xl">/{totalRules}</span></p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body">
          {loadError}
        </div>
      )}
      {toggleError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body">
          {toggleError}
        </div>
      )}
      {fireMessage && (
        <div
          className={`border rounded-xl px-4 py-3 text-sm font-body ${
            fireMessage.kind === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {fireMessage.text}
        </div>
      )}

      {/* Continuation #111 — inline Create Rule form. Renders only when
          opened via the header button. Field validation mirrors the backend
          (automation.ts:103-166); on submit we POST and surface canonical
          errors via createError. After success, the new rule is prepended
          to the rules grid and the form collapses. */}
      {showCreateForm && (
        <form
          onSubmit={createRule}
          className="bg-white border border-primary/20 rounded-2xl p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-bold text-foreground text-lg">Create Workflow</h3>
            <span className="text-[10px] text-muted-foreground font-body uppercase tracking-widest font-bold">
              Canonical automation rule
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                Rule Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Pause underperforming Meta campaigns"
                className="w-full px-3 py-2 bg-surface-container-low border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                Trigger Type <span className="text-red-500">*</span>
              </label>
              <select
                value={createForm.trigger_type}
                onChange={(e) => setCreateForm((f) => ({
                  ...f,
                  trigger_type: e.target.value as (typeof TRIGGER_TYPE_OPTIONS)[number],
                }))}
                className="w-full px-3 py-2 bg-surface-container-low border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
              >
                {TRIGGER_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                Action Template <span className="text-red-500">*</span>
              </label>
              <select
                value={createForm.action_template_id}
                onChange={(e) => setCreateForm((f) => ({ ...f, action_template_id: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container-low border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
                required
              >
                <option value="">Select an action…</option>
                {actions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.platform} · {a.name} ({a.action_type})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground font-body">
                Source: actions_library (system-global catalog from <code className="text-foreground">GET /api/v1/actions</code>)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                Min Confidence ({createForm.min_confidence_threshold}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={createForm.min_confidence_threshold}
                onChange={(e) => setCreateForm((f) => ({
                  ...f,
                  min_confidence_threshold: parseInt(e.target.value, 10),
                }))}
                className="w-full accent-primary"
              />
              <p className="text-[10px] text-muted-foreground font-body">
                Rule only fires when AI decision confidence ≥ this threshold
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                Initial State
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.enabled}
                  onChange={(e) => setCreateForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-foreground font-body">
                  Enable immediately (auto-fire on AI decision stream)
                </span>
              </label>
              <p className="text-[10px] text-muted-foreground font-body">
                Disabled workflows require manual fire from the card menu
              </p>
            </div>
          </div>

          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-body">
              {createError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setCreateError(null);
              }}
              disabled={creating}
              className="px-4 py-2 rounded-lg text-foreground text-xs font-bold hover:bg-surface-container-low transition-colors font-body disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || createForm.name.trim() === "" || createForm.action_template_id === ""}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-primary/90 transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={12} />
              {creating ? "Creating…" : "Create Workflow"}
            </button>
          </div>
        </form>
      )}

      {/* Metrics Row — derived from rules + runs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Total Workflows</span>
            <TrendingUp size={18} className="text-primary" />
          </div>
          <p className="text-4xl font-black text-foreground font-sans">{totalRules}</p>
          <p className="text-xs text-muted-foreground mt-1 font-body">{activeCount} enabled / {totalRules - activeCount} dormant</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Recent Success Rate</span>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <p className="text-4xl font-black text-foreground font-sans">{runs.length === 0 ? "—" : `${successRatePct}%`}</p>
          <p className="text-xs text-muted-foreground mt-1 font-body">Across last {runs.length} run{runs.length === 1 ? "" : "s"}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Last Fire</span>
            <Activity size={18} className="text-primary" />
          </div>
          <p className="text-4xl font-black text-foreground font-sans">{relTime(lastFiredAt)}</p>
          <p className="text-xs text-muted-foreground mt-1 font-body">Across all rules</p>
        </div>
        {/* Continuation #120 (2026-05-14) — Phase γ Layer 7 KPI card.
            Derived from the already-fetched `runs` state: counts rows with
            status='skipped' AND result_data.skip_reason='approval_required'
            (the audit-visible block events written by automation-engine.ts
            per #120 backend extension). NO additional fetch — same data
            already powers Live Activity and the per-rule sparklines. */}
        {(() => {
          const pendingApprovals = runs.filter((r) => {
            if (r.status !== "skipped") return false;
            const reason = (r.result_data as { skip_reason?: string } | null)?.skip_reason;
            return reason === "approval_required";
          }).length;
          return (
            <Link
              href="/automation/approvals"
              className={`block bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border ${
                pendingApprovals > 0 ? "border-amber-300 ring-2 ring-amber-100" : "border-transparent"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Pending Approvals</span>
                <AlertTriangle size={18} className={pendingApprovals > 0 ? "text-amber-600" : "text-muted-foreground"} />
              </div>
              <p className={`text-4xl font-black font-sans ${pendingApprovals > 0 ? "text-amber-600" : "text-foreground"}`}>
                {pendingApprovals}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-body">
                {pendingApprovals === 0
                  ? "No blocked auto-fires"
                  : pendingApprovals === 1
                    ? "1 blocked auto-fire awaiting review →"
                    : `${pendingApprovals} blocked auto-fires awaiting review →`}
              </p>
            </Link>
          );
        })()}
      </div>

      {/* Continuation #119 — Phase β Layer 3 RecommendationsCard.
          Renders only when uncovered AI-category patterns exist.
          One-click prefill of the existing #111 Create form; operator
          must submit. NO autonomous writes. */}
      {(() => {
        const visibleRecs = recommendations.filter(
          (r) => !dismissedRecKeys.has(`${r.category}:${r.suggested_action_template_id}`),
        );
        if (visibleRecs.length === 0) return null;
        return (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary font-body">
                  Recommended automations
                </p>
                <h3 className="text-xl font-bold text-foreground font-sans mt-1">
                  AI detected {visibleRecs.length} uncovered {visibleRecs.length === 1 ? "pattern" : "patterns"}
                </h3>
                <p className="text-xs text-muted-foreground font-body mt-1">
                  Derived from <code className="text-foreground">ai_decisions.category</code> over the last 30 days.
                  Suggestions only — your approval creates the rule.
                </p>
              </div>
              <Link
                href="/operator/ai"
                className="text-[11px] font-bold text-primary hover:underline font-body"
              >
                View AI decisions →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleRecs.map((rec) => (
                <div
                  key={`${rec.category}:${rec.suggested_action_template_id}`}
                  className="bg-white rounded-xl p-4 border border-border/40"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary font-body">
                      {rec.category}
                    </span>
                    {rec.requires_approval && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 font-body"
                        title="Auto-fire blocked by centralized policy — rule will be created disabled"
                      >
                        <AlertTriangle size={10} />
                        Approval required
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold font-sans text-foreground mb-1">
                    {rec.suggested_rule_name}
                  </h4>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">
                    {rec.rationale} · avg confidence {Math.round(rec.avg_confidence * 100)}%
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground mt-2">
                    Suggested action: <code className="text-foreground">{rec.suggested_action_type}</code>
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => applyRecommendation(rec)}
                      className="inline-flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-all font-body"
                    >
                      <Plus size={11} />
                      Use this
                    </button>
                    <button
                      onClick={() => dismissRecommendation(rec)}
                      className="text-[11px] font-bold text-muted-foreground hover:text-foreground font-body"
                      title="Hide this recommendation for the rest of the session"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Automation Cards */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Automation Rules</h3>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-muted-foreground font-body text-sm">
              Loading rules…
            </div>
          ) : rules.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-muted-foreground font-body text-sm">
              No automation rules defined for this organization yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rules.map((rule) => {
                const isRunning = rule.enabled;
                const isToggling = togglingId === rule.id;
                const platform = rule.actions_library?.platform ?? null;
                return (
                  <div
                    key={rule.id}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-primary/10 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {platform && (
                          <span className="bg-surface-container-high text-foreground text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-body uppercase">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: platformColor(platform) }} />
                            {platform}
                          </span>
                        )}
                        <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-body font-bold uppercase">
                          {rule.trigger_type}
                        </span>
                        {/* Continuation #102 (2026-05-12) — approval-required
                            badge. Server-computed from the centralized
                            policy (automation-engine.ts:actionRequiresApproval).
                            When true, the auto-fire gate skips this rule on
                            the AI-decision stream — operator must manually
                            trigger via the Run Now button below. Visible
                            signal so operators know which rules require
                            their intervention rather than auto-firing. */}
                        {rule.requires_approval && (
                          <span
                            className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-body font-bold uppercase flex items-center gap-1"
                            title="Spend-increasing or launch-capable — auto-fire is blocked; operator must trigger manually via Run Now"
                          >
                            <AlertTriangle size={10} />
                            Approval required
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleRule(rule)}
                        disabled={isToggling}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed ${
                          isRunning
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                        title={isRunning ? "Click to disable rule" : "Click to enable rule"}
                      >
                        {isRunning ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {isToggling ? "Updating…" : "Enabled"}
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {isToggling ? "Updating…" : "Disabled"}
                          </>
                        )}
                      </button>
                    </div>

                    <h4 className="text-base font-bold text-foreground mb-1 font-sans">{rule.name}</h4>
                    <p className="text-sm text-muted-foreground mb-5 font-body">
                      {rule.actions_library?.name ? `Action: ${rule.actions_library.name}` : "Action template unresolved"}
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-container-low">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Min Confidence</p>
                        <p className="text-base font-bold font-body text-foreground">{rule.min_confidence_threshold}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Runs</p>
                        <p className="text-base font-bold font-body text-foreground">
                          {rule.run_count}
                          {rule.last_fired_at && (
                            <span className="block text-[10px] font-normal text-muted-foreground">{relTime(rule.last_fired_at)}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Continuation #117 — per-rule 7-day sparkline (Layer 1).
                        Buckets the page's already-fetched `runs` state by day
                        for THIS rule_id. No additional HTTP request — the
                        sparkline is FREE relative to the existing data flow
                        (runs fetch was bumped to limit=100 to support both
                        Live Activity and this sparkline from one call).
                        Empty rules (no runs in the window) render flat bars
                        to keep card heights aligned. */}
                    {(() => {
                      const ruleRuns = runs.filter((r) => r.automation_rule_id === rule.id);
                      const buckets = bucketRunsByDay(ruleRuns, 7);
                      const peak = Math.max(1, ...buckets);
                      const totalInWindow = buckets.reduce((a, b) => a + b, 0);
                      return (
                        <div className="mt-4 pt-3 border-t border-surface-container-low">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                              Last 7 days
                            </p>
                            <p className="text-[10px] font-body text-muted-foreground">
                              {totalInWindow === 0
                                ? "no fires"
                                : `${totalInWindow} fire${totalInWindow === 1 ? "" : "s"}`}
                            </p>
                          </div>
                          <div
                            className="flex items-end gap-1 h-8"
                            title={`Per-day fire count, oldest → newest. Peak: ${peak} run${peak === 1 ? "" : "s"} on the busiest day.`}
                          >
                            {buckets.map((count, i) => {
                              const pct = totalInWindow === 0 ? 8 : Math.max(8, Math.round((count / peak) * 100));
                              const isToday = i === 6;
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-sm transition-all ${
                                    count === 0
                                      ? "bg-surface-container-high"
                                      : isToday
                                        ? "bg-primary"
                                        : "bg-primary/60"
                                  }`}
                                  style={{ height: `${pct}%` }}
                                  aria-label={`${count} fire${count === 1 ? "" : "s"}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Continuation #43 — manual fire button. Disabled rules
                        hide the button (422 would reject anyway); only the
                        rule's own firingId disables the button to avoid
                        cross-rule UI blocking.
                        Continuation #45 — "View runs" link beside fire button
                        deep-links into rule-filtered automation history view
                        (server-side ?rule_id= filter). Connects the two
                        operator cockpit surfaces. */}
                    <div className="mt-4 pt-4 border-t border-surface-container-low flex items-center justify-end gap-2">
                      <Link
                        href={`/automation/history?rule_id=${rule.id}`}
                        title="View this rule's run history"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all font-body bg-surface-container-low text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
                      >
                        <History size={12} />
                        View Runs
                      </Link>
                      <button
                        onClick={() => fireRule(rule)}
                        disabled={!rule.enabled || firingId === rule.id}
                        title={rule.enabled ? "Manual fire — runs rule once via canonical executeAction pipeline" : "Enable rule to allow manual fire"}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all font-body bg-primary/10 text-primary hover:bg-primary/20 disabled:bg-surface-container-high disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        <Zap size={12} />
                        {firingId === rule.id ? "Firing…" : "Run Now"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Activity — recent runs */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[400px]">
            <div className="p-6 pb-3 border-b border-surface-container-low">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-body">Live Activity</p>
              <p className="text-[10px] text-muted-foreground font-body mt-1">Most recent automation runs</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {loading ? (
                <p className="text-sm text-muted-foreground font-body">Loading…</p>
              ) : runs.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">No runs recorded yet.</p>
              ) : (
                // Continuation #117 — bumped fetch from limit=10 to limit=100
                // (see useEffect above) so the new per-rule sparkline (Layer 1)
                // has enough data to bucket. Live Activity now slices to the
                // most recent 10 to preserve the existing "recent" UX.
                runs.slice(0, 10).map((run) => {
                  // Continuation #48 — clickable Live Activity entries.
                  // Drill into /automation/history filtered by the run's
                  // automation_rule_id (#45 server-side filter). Manual runs
                  // without rule_id link to unfiltered history. Cockpit
                  // navigation coherence (priority #8).
                  const inner = (
                    <div className="flex gap-3 -mx-2 px-2 py-1 rounded-lg hover:bg-surface-container-low transition-colors">
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[run.status]}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground font-body truncate">
                          {run.actions_library?.name ?? "Action"}
                          <span className="text-muted-foreground"> · {run.status}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground font-body mt-0.5 truncate">
                          {relTime(run.executed_at)}
                          {run.automation_rules?.name ? ` · ${run.automation_rules.name}` : ""}
                          {run.ai_decisions?.category ? ` · ${run.ai_decisions.category}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                  const href = run.automation_rule_id
                    ? `/automation/history?rule_id=${run.automation_rule_id}`
                    : `/automation/history`;
                  return (
                    <Link key={run.id} href={href} className="block">
                      {inner}
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Risk & Safety — informational shell (stop-loss/rollback are not
              part of Phase 4 Part 2 contract; preserved as visual placeholder) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5 font-body">Safety</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground font-body">Per-rule Confidence Gate</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 font-body">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <RotateCcw size={18} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground font-body">Idempotent Execution</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground font-body">Guaranteed</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground font-body">Per-org Rate Limit</span>
                </div>
                <span className="text-xs font-bold text-primary font-body">60/min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer — informational only (bulk Pause All / Resume All removed
          per safety property: explicit per-rule toggles avoid accidentally
          disabling the entire auto-fire stream) */}
      <div className="fixed bottom-0 right-0 left-0 md:left-[17rem] bg-white/90 backdrop-blur-md border-t border-border z-40 px-8 py-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <button
              disabled
              title="Bulk operations are intentionally disabled — use per-rule toggle above"
              className="flex items-center gap-2 bg-surface-container-high text-muted-foreground px-6 py-2.5 rounded-xl font-bold text-sm font-body cursor-not-allowed opacity-50"
            >
              <Pause size={15} />
              Pause All
            </button>
            <button
              disabled
              title="Bulk operations are intentionally disabled — use per-rule toggle above"
              className="flex items-center gap-2 bg-surface-container-high text-muted-foreground px-6 py-2.5 rounded-xl font-bold text-sm font-body cursor-not-allowed opacity-50"
            >
              <Play size={15} />
              Resume All
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground font-body">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              <span>{activeCount} active rule{activeCount === 1 ? "" : "s"}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <span>Auto-fire stream: {activeCount > 0 ? "armed" : "dormant"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 8.
// Suspense boundary required because the page now uses useSearchParams
// (Next.js requires it inside a Suspense subtree). The inner component
// preserves all existing #111 Create-Rule, toggle, fire and dedupe
// behaviour verbatim — Suspense is a structural wrapper only.
export default function AutomationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AutomationPageInner />
    </Suspense>
  );
}
