"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Search, Plus, Calendar, MoreHorizontal, ChevronDown, ChevronRight,
  Pause, Play, Copy, TrendingUp, X, CheckCircle2, AlertCircle, Sparkles, RefreshCw,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

// Phase 6 Sub-pass B (continuation #13, 2026-05-08): wired to canonical
// `GET /api/v1/campaigns` (backend/src/routes/v1/campaigns.ts). Backend
// emits canonical envelope; api-client unwraps to the Campaign payload.
//
// Sections that remain MOCKED-DEFERRED per holistic governance recommendation:
//   - AD_SETS panel             → adsets table (Phase 6 deferred extras)
//   - CREATIVE_GRADIENTS preview → cross-Phase-5 surface
//   - AI Insight red card        → Phase 3 anomaly engine DEPRECATED
//   - Quick Actions buttons       → recommendations layer deferred
//   - Bulk Actions bar           → bulk endpoint deferred
//   - Account Snapshot widget    → no aggregate-KPI endpoint
//   - AI Strategy panel          → no recommendations endpoint
//   - Platform Allocation widget → no allocation endpoint

// Continuation #70 — type narrowed to backend-supported platforms (no TikTok).
type PlatformFilter = "All" | "Meta" | "Google";
type StatusFilter   = "All" | "Active" | "Learning" | "Paused";

interface ApiCampaignMetrics {
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  impressions: number;
}

interface ApiCampaign {
  id: string;
  name: string;
  platform: string;       // 'meta' | 'google' (backend enum)
  status: string;          // 'draft'|'active'|'paused'|'completed'|'archived'
  daily_budget: number | null;
  metrics: ApiCampaignMetrics;
}

const PLATFORM_DOT: Record<string, string> = {
  meta:   "#1877F2",
  google: "#4285F4",
};

function platformLabel(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function statusStyleKey(s: string): StatusFilter {
  // Map backend status → existing STATUS_STYLES keys (preserves visual contract)
  if (s === "active") return "Active";
  if (s === "paused" || s === "completed" || s === "archived") return "Paused";
  if (s === "draft") return "Learning";
  return "All";
}

const AD_SETS = [
  { name: "Broad Targeting - US",  spend: "$5,201", roas: "5.2x" },
  { name: "Lookalike 1% Buyers",   spend: "$8,420", roas: "4.1x" },
];

const CREATIVE_GRADIENTS = [
  "linear-gradient(135deg, #005bc4 0%, #3d618c 100%)",
  "linear-gradient(135deg, #05345c 0%, #1a5276 100%)",
];

const CREATIVE_CTR = ["3.2% CTR", "2.8% CTR"];

// Continuation #85 (2026-05-12) — STATUS_STYLES aligned with the
// cockpit-wide status color scheme established at #69 (campaigns/[id]
// badge) and #84 (dashboard/overview STATUS_DOT):
//   active   → emerald
//   paused   → amber
//   draft    → primary  ("Learning" is this page's filter label for draft)
// Pre-fix the green/yellow/muted palette diverged from the detail page
// (which used emerald/amber/primary). Cross-page visual consistency
// matters because operators switching between list ↔ detail expect
// the same campaign to render with the same visual signal.
const STATUS_STYLES: Record<StatusFilter, { badge: string; dot: string }> = {
  All:      { badge: "",                                              dot: ""                              },
  Active:   { badge: "bg-emerald-100 text-emerald-700",               dot: "bg-emerald-500 animate-pulse"  },
  Learning: { badge: "bg-primary/10 text-primary",                    dot: "bg-primary"                    },
  Paused:   { badge: "bg-amber-100 text-amber-700",                   dot: "bg-amber-500"                  },
};

const ALLOCATION = [
  { label: "Meta Ads",      pct: 62, barClass: "bg-blue-600" },
  { label: "Google Search", pct: 28, barClass: "bg-blue-400" },
  { label: "TikTok",        pct: 10, barClass: "bg-pink-500" },
];

const fmtCurrency = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtRoas = (n: number) => `${n.toFixed(1)}x`;

export default function CampaignsPage() {
  const { getToken } = useAuth();

  const [campaigns,      setCampaigns]      = useState<ApiCampaign[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  // Continuation #74 (2026-05-12) — backend `total` count from PostgREST
  // count: 'exact'. Pre-fix the campaigns list showed only the loaded page
  // (default limit=50 per campaigns.ts:55) with no indication of additional
  // campaigns beyond the page. Surfaces the true count when distinct.
  const [totalBackend,   setTotalBackend]   = useState<number>(0);

  const [search,         setSearch]         = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("All");
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("All");
  const [expandedId,     setExpandedId]     = useState<string | null>(null);
  const [selected,       setSelected]       = useState<Set<string>>(new Set());
  // applying/applied state removed at #55 — the fake "Apply Optimization"
  // setTimeout flow was replaced with a disabled placeholder. No active
  // consumer of these flags remained.
  // quickActions state removed at #56 — the per-row Quick Actions (+Budget /
  // Pause / Duplicate) had no backend handler; only a setTimeout
  // simulator. Replaced with disabled-placeholder buttons matching the
  // cockpit-wide honesty pattern.

  // Continuation #65 (2026-05-12) — extracted fetch into reusable callback
  // so the new header Refresh button can re-poll without re-triggering
  // useEffect dep churn. useEffect retains cancellation guard for unmount
  // races and filter-change driven refetch.
  const [refreshing, setRefreshing] = useState(false);

  // Continuation #95 (2026-05-12) — data-freshness indicator extended to
  // campaigns list (sixth volatility-sensitive cockpit surface after
  // #90/#91/#92/#93/#94). Campaign state changes via push ops, status
  // transitions, and AI-driven updates; freshness signal helps operators
  // judge whether the list reflects recent activity.
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
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
  async function fetchCampaigns(opts: { showSpinner?: boolean } = {}) {
    if (opts.showSpinner) setRefreshing(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");

      const params = new URLSearchParams();
      if (platformFilter === "Meta") params.set("platform", "meta");
      if (platformFilter === "Google") params.set("platform", "google");
      if (statusFilter === "Active") params.set("status", "active");
      if (statusFilter === "Paused") params.set("status", "paused");
      if (statusFilter === "Learning") params.set("status", "draft");

      const qs = params.toString();
      const data = await apiClient<{ campaigns: ApiCampaign[]; total: number }>(
        `/api/v1/campaigns${qs ? `?${qs}` : ""}`,
        token,
      );
      setCampaigns(data.campaigns);
      setTotalBackend(data.total);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load campaigns"));
    } finally {
      if (opts.showSpinner) setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new ApiError(401, "Sign in required");

        const params = new URLSearchParams();
        if (platformFilter === "Meta") params.set("platform", "meta");
        if (platformFilter === "Google") params.set("platform", "google");
        if (statusFilter === "Active") params.set("status", "active");
        if (statusFilter === "Paused") params.set("status", "paused");
        // "Learning" maps to backend 'draft'; "All" sends no filter.
        if (statusFilter === "Learning") params.set("status", "draft");

        const qs = params.toString();
        const data = await apiClient<{ campaigns: ApiCampaign[]; total: number }>(
          `/api/v1/campaigns${qs ? `?${qs}` : ""}`,
          token,
        );
        if (!cancelled) {
          setCampaigns(data.campaigns);
          setTotalBackend(data.total);
          setLastUpdatedAt(Date.now());
        }
      } catch (err) {
        if (!cancelled) {
          // Continuation #36: formatErrorMessage surfaces ApiError.requestId.
          setError(formatErrorMessage(err, "Failed to load campaigns"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [getToken, platformFilter, statusFilter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // handleApply removed at #55 — fake setTimeout simulator deleted with
  // the disabled-placeholder UI swap.

  // handleQuickAction removed at #56 — fake setTimeout simulator deleted
  // with the disabled-placeholder UI swap.

  // Client-side search; platform/status are server-filtered above.
  const filtered = campaigns.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
          Campaigns
        </h1>
        <p className="text-muted-foreground font-body">Manage, monitor, and control all campaigns across platforms</p>
      </div>

      {/* Filter / Control Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-border/20 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns…"
            className="w-full bg-surface-container-low border-none rounded-lg py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-body"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Continuation #70 (2026-05-12) — Platform options aligned with
              backend `VALID_PLATFORMS = new Set(['meta', 'google'])` per
              campaigns.ts:26. Pre-fix TikTok was in the dropdown but the
              FE if-chain (line 124-128 of useEffect) had no TikTok branch
              and the backend rejects 'tiktok' as INVALID_FILTER; selecting
              TikTok silently fell through to no filter, showing ALL
              campaigns as if "TikTok only" had been chosen. Matches the
              create page comment ("TikTok / Snapchat support is coming
              soon"). */}
          {([
            { value: platformFilter, onChange: (v: string) => setPlatformFilter(v as PlatformFilter), options: ["All", "Meta", "Google"], prefix: "Platform:" },
            { value: statusFilter,   onChange: (v: string) => setStatusFilter(v as StatusFilter),     options: ["All", "Active", "Learning", "Paused"], prefix: "Status:" },
          ]).map((sel, i) => (
            <select
              key={i}
              value={sel.value}
              onChange={(e) => sel.onChange(e.target.value)}
              className="bg-surface-container-low border-none rounded-lg text-xs font-semibold py-2 px-3 focus:ring-0 cursor-pointer font-body text-foreground"
            >
              {sel.options.map((o) => (
                <option key={o} value={o}>{i === 0 ? `Platform: ${o}` : `Status: ${o}`}</option>
              ))}
            </select>
          ))}
          {/* Continuation #65 — dead Objective select disabled (no
              campaigns.objective column on backend per create-page header
              comment). Same for "Last 7d" button (no date-range filter on
              GET /campaigns). Matches the cockpit-wide honesty pattern. */}
          <select
            disabled
            title="Objective filter pending — campaigns table doesn't carry an objective column yet"
            className="bg-surface-container-low border-none rounded-lg text-xs font-semibold py-2 px-3 font-body text-muted-foreground opacity-50 cursor-not-allowed"
          >
            <option>Objective</option>
          </select>
          <button
            disabled
            title="Date-range filter pending"
            className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground font-body opacity-50 cursor-not-allowed"
          >
            <Calendar size={13} />
            Last 7d
          </button>
        </div>

        {/* Continuation #65 — refresh button mirrors the cockpit pattern
            from #47/#48 (automation history / execution log / automation
            status). #95 added freshness indicator beside it. */}
        <div className="flex items-center gap-3">
          {lastUpdatedAt !== null && (
            <span className="text-[11px] text-muted-foreground font-body">
              Updated <span className="font-bold text-foreground">{relUpdated()}</span>
            </span>
          )}
          <button
            onClick={() => void fetchCampaigns({ showSpinner: true })}
            disabled={refreshing || loading}
            title="Refresh — re-poll campaigns list"
            className="inline-flex items-center gap-2 bg-surface-container-low px-3 py-2.5 rounded-lg text-xs font-semibold text-foreground hover:bg-surface-container-high transition-colors font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <Link
          href="/campaigns/create"
          className="flex items-center gap-2 bg-gradient-to-br from-primary to-[#2563eb] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform font-body"
        >
          <Plus size={16} />
          Create Campaign
        </Link>
      </div>

      {/* Continuation #74 — backend `total` count indicator. Shows when the
          loaded page (default limit=50) is a subset of the org's actual
          campaign count, so operators aren't misled into thinking the
          visible list is the complete view. Search filter operates
          client-side on the loaded set; this indicator reflects backend
          totals after platform/status server-side filters apply. */}
      {!loading && !error && campaigns.length > 0 && totalBackend > campaigns.length && (
        <div className="text-xs text-muted-foreground font-body px-1">
          Showing <span className="font-bold text-foreground">{campaigns.length}</span> of <span className="font-bold text-foreground">{totalBackend}</span> campaigns. Refine filters above to narrow the list.
        </div>
      )}

      {/* Bulk Actions Bar — MOCKED-DEFERRED (no bulk endpoint) */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg">
              <CheckCircle2 size={14} />
              <span className="text-xs font-bold font-body">{selected.size} Selected</span>
            </div>
            <div className="h-4 w-px bg-blue-200" />
            <p className="text-[11px] font-medium text-blue-800 uppercase tracking-wider font-body">Bulk Actions</p>
          </div>
          {/* Continuation #56 — Bulk Actions Bar buttons had no onClick
              handlers (no bulk-update endpoint exists; documented as
              MOCKED-DEFERRED at line 242). Replaced with disabled-placeholder
              treatment matching #55 (Apply Optimization) + #50/#51 (Topbar)
              + #48/#47 (Export Log/CSV). The X clear-selection button
              keeps its real handler — that's a pure client-side state op. */}
          <div className="flex items-center gap-2">
            {[
              { Icon: Pause,     label: "Pause"           },
              { Icon: Play,      label: "Activate"        },
              { Icon: Copy,      label: "Duplicate"       },
              { Icon: TrendingUp,label: "Increase Budget" },
            ].map(({ Icon, label }) => (
              <button
                key={label}
                disabled
                title="Bulk action pipeline pending"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold font-body bg-surface-container-high text-muted-foreground opacity-50 cursor-not-allowed shadow-sm"
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
            <button
              onClick={() => setSelected(new Set())}
              title="Clear selection"
              className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex gap-8 items-start">

        {/* Table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-border/20 overflow-hidden">
            {loading && (
              <div className="p-8 text-center text-sm text-muted-foreground font-body">Loading campaigns…</div>
            )}
            {!loading && error && (
              <div className="p-8 text-center text-sm text-red-600 font-body">{error}</div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground font-body">
                No campaigns yet. <Link href="/campaigns/create" className="text-primary font-semibold">Create your first campaign</Link>
              </div>
            )}
            {!loading && !error && filtered.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded border-border text-primary focus:ring-primary/20"
                    />
                  </th>
                  {["Campaign Name", "Platform", "Status", "Budget", "Spend", "Revenue", "ROAS", "Actions"].map((h) => (
                    <th key={h} className="p-4 text-[11px] uppercase tracking-wider font-bold text-muted-foreground font-body whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((c) => {
                  const isExpanded = expandedId === c.id;
                  const isSelected = selected.has(c.id);
                  const styleKey = statusStyleKey(c.status);
                  const st = STATUS_STYLES[styleKey];
                  // qa (quickActions[c.id]) removed at #56 — only the
                  // disabled Quick Actions row consumed it.
                  const roasHighlight = c.metrics.roas > 3;

                  return (
                    <>
                      <tr
                        key={c.id}
                        className={`group transition-colors ${isExpanded ? "bg-blue-50/30" : "hover:bg-surface-container-low/50"}`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded border-border text-primary focus:ring-primary/20"
                          />
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => toggleExpand(c.id)}
                            className="flex items-center gap-2 text-left"
                          >
                            {isExpanded
                              ? <ChevronDown size={14} className="text-primary shrink-0" />
                              : <ChevronRight size={14} className="text-border shrink-0" />
                            }
                            <Link
                              href={`/campaigns/${c.id}`}
                              className="font-bold text-foreground font-body text-sm hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {c.name}
                            </Link>
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-full w-fit">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PLATFORM_DOT[c.platform] ?? "#3d618c" }} />
                            <span className="text-xs font-bold text-foreground font-body">{platformLabel(c.platform)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight font-body w-fit ${st.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                            {styleKey === "All" ? c.status : styleKey}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-semibold text-foreground font-body whitespace-nowrap">
                          {c.daily_budget !== null ? fmtCurrency(c.daily_budget) : "—"}
                        </td>
                        <td className="p-4 text-sm font-medium text-muted-foreground font-body whitespace-nowrap">{fmtCurrency(c.metrics.spend)}</td>
                        <td className="p-4 text-sm font-bold text-foreground font-body whitespace-nowrap">{fmtCurrency(c.metrics.revenue)}</td>
                        <td className="p-4">
                          <div className={`px-2 py-1 text-[11px] font-bold rounded-md w-fit font-body ${roasHighlight ? "bg-primary text-white" : "bg-surface-container-high text-foreground"}`}>
                            {fmtRoas(c.metrics.roas)}
                          </div>
                        </td>
                        <td className="p-4">
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${c.id}-detail`} className="bg-blue-50/20">
                          <td colSpan={9} className="p-0">
                            {/* Continuation #80 (2026-05-12) — expanded-row
                                sub-blocks are entirely MOCKED-DEFERRED
                                (adsets table not deployed; creatives
                                cross-Phase-5 join not built; anomaly engine
                                Phase-3 deferred; recommendations layer not
                                in any phase). Added a top-strip "Sample
                                content" banner explicitly so operators
                                expanding a row see the illustrative nature
                                of all three sub-cards at a glance.
                                Individual sub-blocks get opacity-60 to
                                visually de-emphasize. */}
                            <div className="px-12 py-3 border-t border-blue-100/50 bg-amber-50/40 flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
                              <span className="text-[11px] text-muted-foreground font-body">
                                Expanded-row content is illustrative — ad sets table, creatives cross-join, and AI insight pending future phases.
                              </span>
                            </div>
                            <div className="px-12 py-6 grid grid-cols-12 gap-8 opacity-60">
                              {/* Top Ad Sets — MOCKED-DEFERRED (adsets table) */}
                              <div className="col-span-4 space-y-4">
                                <h4 className="text-[11px] uppercase font-bold text-muted-foreground font-body">Top Ad Sets</h4>
                                <div className="space-y-2">
                                  {AD_SETS.map((as) => (
                                    <div key={as.name} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                                      <div>
                                        <p className="text-xs font-bold text-foreground font-body">{as.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-body">{as.spend} Spend</p>
                                      </div>
                                      <span className="text-xs font-black text-green-600 font-body">{as.roas}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Top Creatives — MOCKED-DEFERRED (cross-Phase-5 join) */}
                              <div className="col-span-4 space-y-4">
                                <h4 className="text-[11px] uppercase font-bold text-muted-foreground font-body">Top Creatives</h4>
                                <div className="flex gap-3">
                                  {CREATIVE_GRADIENTS.map((gradient, i) => (
                                    <div key={i} className="relative w-20 h-28 rounded-lg overflow-hidden shrink-0">
                                      <div className="absolute inset-0" style={{ background: gradient }} />
                                      <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1.5 text-center">
                                        <p className="text-[10px] font-bold text-white font-body">{CREATIVE_CTR[i]}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* AI Insight + Quick Actions — MOCKED-DEFERRED (anomaly DEPRECATED + recommendations layer) */}
                              <div className="col-span-4 space-y-4">
                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3">
                                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[11px] font-black text-red-900 uppercase font-body">AI Insight</p>
                                    <p className="text-xs text-red-700 mt-1 leading-relaxed font-body">
                                      ROAS decreased by 12% in last 24h due to rising CPA in Broad Targeting.
                                    </p>
                                  </div>
                                </div>
                                {/* Continuation #56 — Quick Actions buttons
                                    had no backend handler; only a setTimeout
                                    that briefly toggled the button to "Done!".
                                    Replaced with disabled-placeholders.
                                    The entire expanded-row Quick Actions block
                                    is on the MOCKED-DEFERRED list (line 423 —
                                    "anomaly DEPRECATED + recommendations layer"). */}
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { label: "+10% Budget" },
                                    { label: "+20% Budget" },
                                    { label: "Pause"       },
                                    { label: "Duplicate"   },
                                  ].map(({ label }) => (
                                    <button
                                      key={label}
                                      disabled
                                      title="Recommendations action pipeline pending"
                                      className="px-3 py-2 rounded-lg text-xs font-bold font-body bg-surface-container-high text-muted-foreground opacity-50 cursor-not-allowed"
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Right Sidebar — MOCKED-DEFERRED (no aggregate-KPI / recommendations
            / allocation endpoints). Continuation #80 (2026-05-12) — wrapper
            marked Sample at opacity-70; Account Snapshot KPIs use hardcoded
            fabricated numbers ("$74,209.50" / "$284,192.10" / "3.83x +4.2%")
            unrelated to any real org data, and Recommendation + Allocation
            cards similarly hardcoded. Operators viewing the page see these
            cards as real account totals; honesty marker prevents misread. */}
        <div className="w-72 shrink-0 sticky top-6 space-y-6 opacity-70">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
            <span className="text-[10px] text-muted-foreground font-body">Aggregate KPIs + recommendations pending</span>
          </div>

          {/* Account Snapshot */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/20">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 font-body">
              Account Snapshot
            </h3>
            <div className="space-y-4">
              {[
                { label: "Total Spend",   value: "$74,209.50",   highlight: false },
                { label: "Total Revenue", value: "$284,192.10",  highlight: false },
                { label: "Avg. ROAS",     value: "3.83x",        highlight: true  },
              ].map((kpi) => (
                <div key={kpi.label}>
                  <p className="text-xs text-muted-foreground font-body">{kpi.label}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-black tracking-tight font-sans ${kpi.highlight ? "text-primary" : "text-foreground"}`}>
                      {kpi.value}
                    </p>
                    {kpi.highlight && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md font-body">
                        +4.2%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Strategy */}
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <h3 className="text-sm font-black text-foreground uppercase font-body">AI Strategy</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-xl border border-primary/10 shadow-sm">
                <p className="text-xs font-bold text-foreground font-body">Efficiency Alert</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed font-body">
                  Budget inefficiency detected in 3 active campaigns. Learning phase prolonged.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-primary/10 shadow-sm">
                <p className="text-xs font-bold text-foreground font-body">Recommendation</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed font-body">
                  Shift{" "}
                  <span className="font-bold text-primary">$2,400</span>{" "}
                  budget from{" "}
                  <span className="italic text-muted-foreground line-through">Spring Clearance</span>{" "}
                  to{" "}
                  <span className="font-bold text-foreground">Summer Collection</span>.
                </p>
                {/* Continuation #55 (2026-05-12) — honesty pass on the
                    fake "Apply Optimization" button. The prior implementation
                    used setTimeout to simulate a successful apply with no
                    backend call (the entire Recommendation card is on the
                    MOCKED-DEFERRED list at line 470 — no bulk-budget-shift
                    endpoint exists). Surfacing a fake "Applied!" success state
                    misleads operators. Replaced with disabled-placeholder
                    matching #47/#48/#50/#51 across the cockpit; orphaned
                    applying/applied state + handleApply also removed. */}
                <button
                  disabled
                  title="Bulk budget-shift pipeline pending"
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 bg-surface-container-high text-muted-foreground text-[10px] font-black uppercase tracking-widest rounded-lg font-body opacity-50 cursor-not-allowed"
                >
                  Apply Optimization
                </button>
              </div>
            </div>
          </div>

          {/* Platform Allocation */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/20">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 font-body">
              Allocation
            </h3>
            <div className="space-y-3">
              {ALLOCATION.map((a) => (
                <div key={a.label}>
                  <div className="flex justify-between text-[11px] font-bold mb-1 text-foreground font-body">
                    <span>{a.label}</span>
                    <span>{a.pct}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div className={`${a.barClass} h-full rounded-full`} style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
