"use client";

// Continuation #116 (2026-05-14) — Phase α Layer 4 (Action Catalog FE Wiring)
// per `specs/action-catalog-fe.md`. Replaces the prior 493-line Stitch
// mock-shell (MOCK_ACTIONS + QUICK_ACTIONS + fabricated "1.2M data points"
// recommendation engine) with the canonical `actions_library` catalog
// surfaced via the existing `GET /api/v1/actions` endpoint. The mock's
// "AI recommendation engine" concept belongs to Layer 3 (Recommended
// Automations) in Phase β — explicitly NOT in scope for this turn.
//
// Backend untouched. No new endpoints. No new types beyond local props.
//
// Reuses:
//   - GET /api/v1/actions               (actions_library list, system-global)
//   - GET /api/v1/actions/:id           (detail page consumes this — Layer 4 part 2)
//   - actions_library schema columns    (parameter_schema, action_type, platform, name, description)
//   - actionRequiresApproval policy     (centralized in automation-engine.ts:80-93;
//                                        mirrored here as a display-only constant set —
//                                        single source of truth remains backend)

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  ShieldAlert, Sparkles, Zap, AlertCircle, Filter, Search,
  Pause, DollarSign, Rocket, Bell, FileBarChart, Activity, ShieldCheck,
  LayoutGrid, Layers, type LucideIcon,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";
// Continuation #125 (2026-05-15) — Phase Ω.7 enrichment + cross-refs.
// Adds marketer-facing operation grouping + "Used in N templates" hint
// per action card. Pure FE — no backend or runtime impact.
import {
  OPERATION_CATEGORIES, lookupEnrichment,
  type OperationCategoryId,
} from "@/lib/action-enrichments";
import { getTemplatesUsingActionType } from "@/lib/workflow-templates";

// Category icon registry — avoids importing Lucide components at the
// manifest layer.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Pause, DollarSign, Rocket, Bell, FileBarChart, Activity, ShieldCheck,
};

type ViewMode = "operations" | "platforms";

// Continuation #122 (2026-05-14) — Phase Ω stabilization. The prior
// FE-side `APPROVAL_REQUIRED_TYPES` Set (mirror of the centralized BE
// policy) is removed. `GET /api/v1/actions` now returns a
// server-computed `requires_approval` boolean per row via
// `actionRequiresApproval()` — single source of truth lives in
// `automation-engine.ts:80-93`. FE consumes the flag directly; no
// mirror, no drift.

type PlatformFilter = "all" | "meta" | "google" | "shopify" | "slack" | "email";

interface ApiActionTemplate {
  id: string;
  platform: string;
  action_type: string;
  name: string;
  description: string | null;
  parameter_schema: Record<string, unknown> | null;
  created_at: string;
  // Server-computed via `actionRequiresApproval()` (#122). Absent on
  // legacy clients hitting this page before the BE upgrade — falls back
  // to `false` defensively at the render site.
  requires_approval?: boolean;
}

const PLATFORM_OPTIONS: Array<{ value: PlatformFilter; label: string; color: string }> = [
  { value: "all",     label: "All",     color: "bg-foreground"  },
  { value: "meta",    label: "Meta",    color: "bg-[#0668E1]"   },
  { value: "google",  label: "Google",  color: "bg-[#4285F4]"   },
  { value: "shopify", label: "Shopify", color: "bg-[#5E8E3E]"   },
  { value: "slack",   label: "Slack",   color: "bg-[#4A154B]"   },
  { value: "email",   label: "Email",   color: "bg-[#3d618c]"   },
];

function platformDotColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case "meta":    return "#0668E1";
    case "google":  return "#4285F4";
    case "shopify": return "#5E8E3E";
    case "slack":   return "#4A154B";
    case "email":   return "#3d618c";
    default:        return "#3d618c";
  }
}

// Count the top-level property keys in a JSON Schema-style `parameter_schema`.
// Defensive: tolerates null / non-object / missing `properties`.
function paramCount(schema: Record<string, unknown> | null): number {
  if (!schema || typeof schema !== "object") return 0;
  const props = (schema as { properties?: unknown }).properties;
  if (!props || typeof props !== "object" || Array.isArray(props)) return 0;
  return Object.keys(props).length;
}

export default function ActionsLibraryPage() {
  const { getToken } = useAuth();

  const [actions, setActions] = useState<ApiActionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [search, setSearch] = useState("");
  const [approvalOnly, setApprovalOnly] = useState(false);
  // Continuation #125 (2026-05-15) — view mode toggle. "Operations"
  // (default) groups cards by operation category from the enrichment
  // manifest; "Platforms" preserves the legacy flat-grid behavior.
  const [viewMode, setViewMode] = useState<ViewMode>("operations");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const token = await getToken();
        if (!token) throw new ApiError(401, "Sign in required");
        const data = await apiClient<{ actions: ApiActionTemplate[]; total: number }>(
          "/api/v1/actions",
          token,
        );
        if (!cancelled) setActions(data.actions);
      } catch (err) {
        if (!cancelled) {
          setLoadError(formatErrorMessage(err, "Failed to load action catalog"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  const filtered = actions.filter((a) => {
    if (platformFilter !== "all" && a.platform.toLowerCase() !== platformFilter) return false;
    if (approvalOnly && !a.requires_approval === true) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${a.name} ${a.action_type} ${a.description ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totalCount = actions.length;
  const requireApprovalCount = actions.filter((a) => a.requires_approval === true).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Actions
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Action Library
          </h1>
          <p className="text-muted-foreground font-body mt-2">
            Canonical execution templates available to automation rules and manual triggers.
            Every operation your team can run, from pausing a campaign to triggering an alert.
          </p>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Templates</p>
            <p className="text-3xl font-black text-foreground font-sans leading-none">{totalCount}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 font-body">Approval required</p>
            <p className="text-3xl font-black text-amber-600 font-sans leading-none">{requireApprovalCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or action_type…"
            className="bg-white border border-border/40 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body w-64"
          />
        </div>

        <div className="h-5 w-px bg-border" />

        <div className="flex bg-surface-container-high p-1 rounded-xl gap-0.5">
          {PLATFORM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPlatformFilter(opt.value)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all font-body ${
                platformFilter === opt.value
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground font-body">
          <input
            type="checkbox"
            checked={approvalOnly}
            onChange={(e) => setApprovalOnly(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <ShieldAlert size={12} className="text-amber-600" />
          Approval-required only
        </label>

        <div className="ml-auto flex items-center gap-3 text-[11px] font-body text-muted-foreground">
          <div className="flex bg-surface-container-high p-1 rounded-xl gap-0.5">
            <button
              onClick={() => setViewMode("operations")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-all font-body ${
                viewMode === "operations"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Group by operation category"
            >
              <Layers size={11} />
              Operations
            </button>
            <button
              onClick={() => setViewMode("platforms")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-all font-body ${
                viewMode === "platforms"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Flat grid by platform"
            >
              <LayoutGrid size={11} />
              Platforms
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={12} />
            <span><span className="font-bold text-foreground">{filtered.length}</span> of {totalCount}</span>
          </div>
        </div>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body flex items-center gap-2">
          <AlertCircle size={16} />
          {loadError}
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-container-low rounded-2xl p-6 h-56 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-12 text-center">
          <Sparkles size={28} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-body mb-1">
            {actions.length === 0
              ? "Your action catalog is empty."
              : "No actions match the selected filters."}
          </p>
          {actions.length === 0 && (
            <p className="text-[11px] text-muted-foreground font-body opacity-70">
              Contact your administrator to set up the available actions for your team.
            </p>
          )}
        </div>
      ) : viewMode === "operations" ? (
        <OperationsView actions={filtered} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((a) => (
            <ActionCard key={a.id} action={a} />
          ))}
        </div>
      )}
    </div>
  );
}

// Continuation #125 (2026-05-15) — Phase Ω.7 OperationsView.
// Groups the filtered actions by enrichment category. Categories
// with no matching actions are hidden so the surface never shows
// empty sections.
function OperationsView({ actions }: { actions: ApiActionTemplate[] }) {
  const grouped = useMemo(() => {
    const map = new Map<OperationCategoryId, ApiActionTemplate[]>();
    for (const a of actions) {
      const slug = `${a.platform}.${a.action_type}`;
      const category = lookupEnrichment(slug).category;
      const arr = map.get(category) ?? [];
      arr.push(a);
      map.set(category, arr);
    }
    return OPERATION_CATEGORIES
      .filter((c) => (map.get(c.id)?.length ?? 0) > 0)
      .map((c) => ({ category: c, actions: map.get(c.id)! }));
  }, [actions]);

  if (grouped.length === 0) return null;

  return (
    <div className="space-y-10">
      {grouped.map(({ category, actions: rows }) => {
        const Icon = CATEGORY_ICONS[category.icon] ?? Sparkles;
        return (
          <section key={category.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${category.accent_bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={category.accent_text} />
              </div>
              <div>
                <h2 className="font-sans font-bold text-foreground text-base leading-tight">
                  {category.label}
                </h2>
                <p className="text-[11px] font-body text-muted-foreground">
                  {category.description}
                </p>
              </div>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                {rows.length} action{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rows.map((a) => (
                <ActionCard key={a.id} action={a} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ActionCard({ action: a }: { action: ApiActionTemplate }) {
  const requiresApproval = a.requires_approval === true;
  const dotColor = platformDotColor(a.platform);
  const paramN = paramCount(a.parameter_schema);
  const slug = `${a.platform}.${a.action_type}`;
  const enrichment = lookupEnrichment(slug);
  const templatesUsing = getTemplatesUsingActionType(slug).length;
  // Marketer outcome from enrichment; fall back to the technical description.
  const outcome = enrichment.outcome || a.description || "";

  return (
    <Link
      href={`/actions/${a.id}`}
      className="group block bg-white border border-border/40 rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: dotColor }}
            aria-label={`Platform ${a.platform}`}
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-body">
            {a.platform}
          </span>
        </div>
        {requiresApproval && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 font-body"
            title="This action requires operator approval — auto-fire is blocked by the centralized policy"
          >
            <ShieldAlert size={10} />
            Approval required
          </span>
        )}
      </div>

      <h3 className="font-sans font-bold text-foreground text-lg leading-snug mb-1">
        {a.name}
      </h3>
      <code className="text-[10px] text-muted-foreground font-mono break-all">
        {a.action_type}
      </code>

      {outcome && (
        <p className="font-body text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">
          {outcome}
        </p>
      )}

      <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-[11px] font-body text-muted-foreground">
          <span>
            {paramN === 0
              ? "No parameters"
              : paramN === 1
                ? "1 parameter"
                : `${paramN} parameters`}
          </span>
          {templatesUsing > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1">
                <Sparkles size={10} className="text-primary" />
                Used in {templatesUsing} template{templatesUsing === 1 ? "" : "s"}
              </span>
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary font-body group-hover:translate-x-0.5 transition-transform">
          <Zap size={11} />
          Configure →
        </span>
      </div>
    </Link>
  );
}
