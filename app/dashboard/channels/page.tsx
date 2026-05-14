"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { apiClient, formatErrorMessage } from "@/lib/api-client";
import { TrendingUp, Globe, MousePointerClick, ShoppingBag, Filter, Loader2, RefreshCw } from "lucide-react";

interface ChannelMetrics {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
}

// Continuation #46 (2026-05-12) — time-filter ranges now actually adjust
// the backend query. Pre-fix: `activeFilter` only changed styling and the
// API call hard-coded a 30-day window — operator clicks "Quarterly" or
// "Year-to-Date" but data didn't change. Now: each filter maps to a
// concrete (from,to) ISO date pair passed to `/metrics/channels?from=&to=`.
function dateRangeFor(filter: string): { from: string; to: string } {
  const toIso = (d: Date) => d.toISOString().split("T")[0];
  const today = new Date();
  if (filter === "Quarterly") {
    return { from: toIso(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)), to: toIso(today) };
  }
  if (filter === "Year-to-Date") {
    const jan1 = new Date(today.getFullYear(), 0, 1);
    return { from: toIso(jan1), to: toIso(today) };
  }
  // Default "Last 30 Days"
  return { from: toIso(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), to: toIso(today) };
}
function formatCurrency(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PLATFORM_DISPLAY = {
  meta:    { label: "Meta Ads",    iconBg: "bg-blue-600",    Icon: Globe,             roasBadge: "bg-green-50 text-green-700",   barColor: "bg-green-500",  statusDot: "bg-green-500 animate-pulse", statusLabel: "Optimal" },
  google:  { label: "Google Ads",  iconBg: "bg-orange-500",  Icon: MousePointerClick, roasBadge: "bg-yellow-50 text-yellow-700", barColor: "bg-yellow-500", statusDot: "bg-yellow-500",              statusLabel: "Steady" },
  shopify: { label: "Shopify",     iconBg: "bg-green-600",   Icon: ShoppingBag,       roasBadge: "bg-blue-50 text-blue-700",     barColor: "bg-blue-500",   statusDot: "bg-blue-500 animate-pulse",  statusLabel: "Active" },
} as const;

const TIME_FILTERS = ["Last 30 Days", "Quarterly", "Year-to-Date"];
const CHART_COLUMNS = [{ meta: "60%", google: "40%", shopify: "75%" }, { meta: "65%", google: "45%", shopify: "70%" }, { meta: "80%", google: "35%", shopify: "65%" }, { meta: "55%", google: "50%", shopify: "85%" }, { meta: "70%", google: "40%", shopify: "90%" }];

export default function ChannelsPage() {
  const { getToken } = useAuth();
  const [channels, setChannels] = useState<ChannelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  // Continuation #62 (2026-05-12) — separate loadError state. Pre-fix the
  // catch collapsed every error case (auth / network / 503 / etc.) onto
  // setNoData(true), so operators saw "No channel data available — connect
  // a platform" CTA even when the issue was unrelated (e.g. session
  // expired, infrastructure failure). With #59 the canonical envelope's
  // actionable message is available; surface it instead.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("Last 30 Days");
  // Continuation #66 (2026-05-12) — refresh-on-demand state. Tracks
  // explicit refresh button activity separately from the initial-load
  // `loading` flag so the button shows its own spinner without flipping
  // the page back to the loading skeleton.
  const [refreshing, setRefreshing] = useState(false);

  // Continuation #96 (2026-05-12) — data-freshness indicator extended to
  // dashboard channels (seventh volatility-sensitive cockpit surface
  // after #90/#91/#92/#93/#94/#95). Channel metrics aggregate over
  // campaign_metrics rows which are inserted/updated by Inngest sync
  // jobs; freshness signal helps operators judge whether the displayed
  // ROAS/spend/revenue reflects recent ingestion.
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

  async function refreshChannels() {
    setRefreshing(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const { from, to } = dateRangeFor(activeFilter);
      const data = await apiClient<ChannelMetrics[]>(
        `/api/v1/metrics/channels?from=${from}&to=${to}`,
        token
      );
      setNoData(data.length === 0);
      setChannels(data);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setLoadError(formatErrorMessage(err, "Failed to load channel metrics"));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const fetchChannels = async () => {
      setLoading(true);
      setNoData(false);
      setLoadError(null);
      const token = await getToken();
      if (!token) { if (!cancelled) setLoading(false); return; }
      const { from, to } = dateRangeFor(activeFilter);
      try {
        const data = await apiClient<ChannelMetrics[]>(
          `/api/v1/metrics/channels?from=${from}&to=${to}`,
          token
        );
        if (cancelled) return;
        if (data.length === 0) setNoData(true);
        setChannels(data);
        setLastUpdatedAt(Date.now());
      } catch (err) {
        // Continuation #62 — surface actionable canonical message via #59
        // code-honor; previously the catch collapsed all errors onto the
        // "No data" empty-state CTA, hiding real issues.
        if (!cancelled) setLoadError(formatErrorMessage(err, "Failed to load channel metrics"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchChannels();
    return () => { cancelled = true; };
  }, [getToken, activeFilter]);

  return (
    <div className="space-y-12">
      {/* Header & Filters */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h3 className="font-sans text-4xl font-extrabold tracking-tight text-foreground mb-2">Portfolio Health</h3>
          <p className="text-muted-foreground font-medium font-body">Real-time performance metrics across all acquisition channels.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-surface-container-low p-1.5 rounded-2xl">
            {TIME_FILTERS.map((f) => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors font-body ${activeFilter === f ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
          {/* Continuation #66 — Refresh button matches the cockpit pattern
              (#47/#48/#65). Doesn't toggle the loading skeleton — operators
              see the prior data while refresh is in flight. #96 added
              freshness indicator. */}
          {lastUpdatedAt !== null && (
            <span className="text-[11px] text-muted-foreground font-body">
              Updated <span className="font-bold text-foreground">{relUpdated()}</span>
            </span>
          )}
          <button
            onClick={() => void refreshChannels()}
            disabled={refreshing || loading}
            title="Refresh — re-poll channel metrics"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-surface-container-low text-foreground hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      {/* Continuation #62 — load-error state distinct from empty-data state.
          Surfaces canonical envelope message via #59 code-honor. */}
      {!loading && loadError && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
          <p className="text-red-700 font-body text-sm">{loadError}</p>
        </div>
      )}

      {/* No data state — only shown when load succeeded but data is empty */}
      {!loading && !loadError && noData && (
        <div className="bg-white rounded-3xl p-12 text-center border border-border">
          <p className="text-muted-foreground font-body mb-4">No channel data available yet.</p>
          <Link href="/integrations" className="inline-block px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold font-body hover:opacity-90 transition-all">
            Connect a Platform
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-muted-foreground py-12">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-body text-sm">Loading channel metrics…</span>
        </div>
      )}

      {/* Channel Cards */}
      {!loading && channels.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {channels.map((ch) => {
            const display = PLATFORM_DISPLAY[ch.platform as keyof typeof PLATFORM_DISPLAY];
            if (!display) return null;
            return (
              <div key={ch.platform} className="bg-white shadow-[0_16px_32px_-8px_rgba(5,52,92,0.06)] p-8 rounded-3xl flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${display.iconBg} rounded-2xl flex items-center justify-center text-white`}>
                      <display.Icon size={22} />
                    </div>
                    <div>
                      <p className="font-sans font-bold text-lg text-foreground">{display.label}</p>
                      <span className="text-xs font-bold text-primary uppercase tracking-wider font-body">
                        {ch.roas >= 3 ? "High ROAS" : ch.roas >= 1.5 ? "Steady" : "Needs Attention"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-green-600 bg-green-50">
                    <TrendingUp size={14} />
                    {ch.roas.toFixed(2)}x
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-6">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">Spend</p>
                    <p className="text-2xl font-sans font-extrabold text-foreground">{formatCurrency(ch.spend)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">Revenue</p>
                    <p className="text-2xl font-sans font-extrabold text-foreground">{formatCurrency(ch.revenue)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">ROAS</p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-sans font-black text-primary">{ch.roas.toFixed(2)}x</p>
                      <div className="h-1.5 grow bg-surface-container-high rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${display.barColor} rounded-full`} style={{ width: `${Math.min(100, (ch.roas / 5) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Channel Correlation Chart — placeholder visualization. Backend
          /metrics/channels returns aggregate snapshot per platform (current
          window), not daily time-series. Continuation #76 (2026-05-12) —
          surfaces an honest "Sample" badge instead of presenting the
          hardcoded CHART_COLUMNS as real correlated time-series. Real
          time-series would require a /metrics/channels/timeseries endpoint
          that isn't in any current phase. The per-channel cards above
          already show real current-window ROAS comparisons. */}
      <section className="bg-surface-container-low rounded-4xl p-10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-sans text-2xl font-extrabold text-foreground">Channel Correlation</h4>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium font-body">
              Daily time-series view pending — see real current-window ROAS comparisons in the channel cards above.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-body"><span className="w-3 h-3 rounded-full bg-primary" /> Meta</span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-body"><span className="w-3 h-3 rounded-full bg-foreground" /> Google</span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-body"><span className="w-3 h-3 rounded-full bg-green-500" /> Shopify</span>
          </div>
        </div>
        <div className="h-80 w-full flex items-end gap-3 relative opacity-50" aria-hidden>
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
            {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-foreground" />)}
          </div>
          {CHART_COLUMNS.map((col, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-2">
              <div className="w-full bg-primary/20 rounded-xl" style={{ height: col.meta }} />
              <div className="w-full bg-foreground/20 rounded-xl" style={{ height: col.google }} />
              <div className="w-full bg-green-500/20 rounded-xl" style={{ height: col.shopify }} />
            </div>
          ))}
        </div>
      </section>

      {/* Data Breakdown Table */}
      {channels.length > 0 && (
        <section className="bg-white shadow-[0_16px_32px_-8px_rgba(5,52,92,0.06)] rounded-4xl overflow-hidden">
          <div className="p-8 border-b border-surface-container-low flex items-center justify-between">
            <h4 className="font-sans text-xl font-extrabold text-foreground">Data Breakdown</h4>
            {/* Continuation #88 (2026-05-12) — "Filter by Status" button
                had no onClick; status filtering by channel isn't a
                supported backend operation (status is derived from
                connection state per-platform, not per-row filterable).
                Disabled with explanatory tooltip per the cockpit-wide
                honesty pattern. */}
            <button
              disabled
              title="Per-channel status filter pending"
              className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 py-2 rounded-xl font-body opacity-50 cursor-not-allowed"
            >
              Filter by Status <Filter size={16} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50">
                  {["Channel", "Ad Spend", "Gross Revenue", "ROAS", "Efficiency", "Status"].map((h) => (
                    <th key={h} className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] font-body">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {channels.map((ch) => {
                  const display = PLATFORM_DISPLAY[ch.platform as keyof typeof PLATFORM_DISPLAY];
                  if (!display) return null;
                  return (
                    <tr key={ch.platform} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${display.iconBg} flex items-center justify-center text-white`}>
                            <display.Icon size={16} />
                          </div>
                          <span className="font-bold text-foreground font-body">{display.label}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-medium font-body text-foreground">{formatCurrency(ch.spend)}</td>
                      <td className="px-8 py-6 font-medium font-body text-foreground">{formatCurrency(ch.revenue)}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold font-body ${display.roasBadge}`}>{ch.roas.toFixed(2)}x</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="w-32 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div className={`h-full ${display.barColor} rounded-full`} style={{ width: `${Math.min(100, (ch.roas / 5) * 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="flex items-center gap-2 text-xs font-bold text-foreground font-body">
                          <span className={`w-2 h-2 rounded-full ${display.statusDot}`} />
                          {display.statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
