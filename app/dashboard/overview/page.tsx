"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";

interface MetricsSummary {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  dateRange: { from: string; to: string };
}

interface CampaignMetrics {
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  impressions: number;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  daily_budget: number | null;
  metrics: CampaignMetrics;
  created_at: string;
}

const PLATFORM_COLORS: Record<string, { color: string; letter: string }> = {
  meta:   { color: "#1877F2", letter: "F" },
  google: { color: "#EA4335", letter: "G" },
};

function platformMeta(platform: string) {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? { color: "#6366f1", letter: platform[0]?.toUpperCase() ?? "?" };
}

function formatCurrency(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
function roasType(roas: number): string {
  if (roas >= 3) return "great";
  if (roas >= 1.5) return "neutral";
  return "bad";
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

const STATUS_DOT: Record<string, string> = {
  active:   "bg-emerald-500 animate-pulse",
  paused:   "bg-muted-foreground/30",
  draft:    "bg-muted-foreground/30",
  archived: "bg-muted-foreground/20",
};

export default function DashboardOverview() {
  const { getToken } = useAuth();

  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [insightVisible, setInsightVisible] = useState(true);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const token = await getToken();
      if (!token) { setMetricsError("Your session expired — please sign in again"); setMetricsLoading(false); return; }
      const { from, to } = defaultDateRange();
      const data = await apiClient<MetricsSummary>(
        `/api/v1/metrics/summary?from=${from}&to=${to}`,
        token
      );
      setMetrics(data);
    } catch (e) {
      setMetricsError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setMetricsLoading(false);
    }
  }, [getToken]);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const token = await getToken();
      if (!token) { setCampaignsError("Your session expired — please sign in again"); setCampaignsLoading(false); return; }
      const data = await apiClient<{ campaigns: Campaign[]; total: number }>(
        "/api/v1/campaigns?limit=5&status=active",
        token
      );
      setCampaigns(data.campaigns ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setCampaigns([]);
      } else {
        setCampaignsError(e instanceof Error ? e.message : "Something went wrong");
      }
    } finally {
      setCampaignsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadMetrics();
    loadCampaigns();
  }, [loadMetrics, loadCampaigns]);

  const noMetrics = !metricsLoading && !metricsError && (metrics === null || (metrics.spend === 0 && metrics.revenue === 0));

  const kpis = metrics
    ? [
        { label: "Revenue",     value: formatCurrency(metrics.revenue),     progress: Math.min(100, (metrics.revenue / 200000) * 100), positive: null as null },
        { label: "Spend",       value: formatCurrency(metrics.spend),        progress: Math.min(100, (metrics.spend / 80000) * 100),   positive: null as null },
        { label: "ROAS",        value: metrics.roas.toFixed(2) + "x",       progress: Math.min(100, (metrics.roas / 5) * 100),         positive: metrics.roas >= 3 ? true : metrics.roas >= 1.5 ? null : false },
        { label: "Impressions", value: formatNumber(metrics.impressions),    progress: Math.min(100, (metrics.impressions / 10_000_000) * 100), positive: null as null },
        { label: "Clicks",      value: formatNumber(metrics.clicks),         progress: Math.min(100, (metrics.clicks / 100_000) * 100), positive: null as null },
      ]
    : Array.from({ length: 5 }, (_, i) => ({ label: ["Revenue", "Spend", "ROAS", "Impressions", "Clicks"][i], value: "—", progress: 0, positive: null as null }));

  const chartBars = campaigns.length > 0
    ? campaigns.slice(0, 7).map((c) => ({
        revenue: Math.min(90, Math.max(8, (c.metrics.revenue / Math.max(...campaigns.map((x) => x.metrics.revenue), 1)) * 85)),
        spend:   Math.min(85, Math.max(6, (c.metrics.spend   / Math.max(...campaigns.map((x) => x.metrics.spend),   1)) * 80)),
        label:   c.name.slice(0, 3).toUpperCase(),
      }))
    : [
        { revenue: 40, spend: 32, label: "Mon" },
        { revenue: 55, spend: 47, label: "Tue" },
        { revenue: 45, spend: 34, label: "Wed" },
        { revenue: 70, spend: 63, label: "Thu" },
        { revenue: 60, spend: 49, label: "Fri" },
        { revenue: 85, spend: 81, label: "Sat" },
        { revenue: 75, spend: 66, label: "Sun" },
      ];

  return (
    <div className="space-y-8">
      {/* AI Summary */}
      {insightVisible && (
        <section className="p-6 bg-white rounded-xl border border-border shadow-sm flex gap-6 items-start">
          <div className="w-12 h-12 rounded-xl bg-[#e4ceff] flex items-center justify-center shrink-0">
            <span className="text-[#54436b] text-xl">✦</span>
          </div>
          <div className="flex-1">
            <h3 className="font-sans font-bold text-lg mb-1 text-foreground">Precision Intelligence Summary</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              {metricsLoading
                ? "Loading your performance data…"
                : noMetrics
                ? "No synced data yet. Connect a platform on the Integrations page to start seeing real metrics here."
                : metricsError
                ? metricsError
                : `Your account generated ${formatCurrency(metrics!.revenue)} in revenue at a ${metrics!.roas.toFixed(2)}x ROAS over the last 30 days.`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {noMetrics && (
              <Link href="/integrations">
                <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-opacity">
                  Connect Platform
                </button>
              </Link>
            )}
            <button
              onClick={() => setInsightVisible(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-container transition-colors"
            >
              ✕
            </button>
          </div>
        </section>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white p-6 rounded-xl border border-border shadow-sm">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{kpi.label}</p>
            <div className="flex items-baseline gap-2">
              <h4 className={`text-2xl font-sans font-extrabold tracking-tight text-foreground ${metricsLoading ? "animate-pulse" : ""}`}>
                {metricsLoading ? "…" : kpi.value}
              </h4>
            </div>
            <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${kpi.progress}%` }} />
            </div>
          </div>
        ))}
      </section>

      {/* Chart + Highlights */}
      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-8 bg-white p-8 rounded-xl border border-border shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-sans font-bold text-xl text-foreground">Revenue vs Spend Trend</h3>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary" /><span className="text-muted-foreground">Revenue</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-outline-variant" /><span className="text-muted-foreground">Spend</span></div>
            </div>
          </div>
          <div className="relative h-64 w-full flex items-end gap-2 border-b border-l border-border">
            {chartBars.map((bar, i) => (
              <div key={i} className="flex-1 flex items-end gap-0.5 h-full">
                <div className="flex-1 bg-primary rounded-t-sm hover:opacity-80 transition-opacity" style={{ height: `${bar.revenue}%` }} />
                <div className="flex-1 bg-outline-variant/40 rounded-t-sm" style={{ height: `${bar.spend}%` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-2 text-[10px] font-bold text-muted-foreground uppercase">
            {chartBars.map((b) => <span key={b.label}>{b.label}</span>)}
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-4">
          <div className="flex-1 bg-white p-6 rounded-xl border border-border shadow-sm border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-sans font-bold text-foreground">What&apos;s Working</h4>
              <span className="text-emerald-500 text-lg">↑</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {metricsLoading ? "Loading…" : metrics && metrics.roas >= 3 ? `ROAS at ${metrics.roas.toFixed(2)}x — above target threshold.` : "Connect platforms and run campaigns to see performance signals here."}
            </p>
          </div>
          <div className="flex-1 bg-white p-6 rounded-xl border border-border shadow-sm border-l-4 border-l-red-500">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-sans font-bold text-foreground">Issues Detected</h4>
              <span className="text-red-500 text-lg">!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {metricsLoading ? "Loading…" : metrics && metrics.roas < 1.5 ? `ROAS at ${metrics.roas.toFixed(2)}x — below break-even threshold. Review spend allocation.` : "No critical issues detected in the current period."}
            </p>
          </div>
        </div>
      </section>

      {/* Campaign Table */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-8 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="font-sans font-bold text-xl text-foreground">Campaign Performance Detail</h3>
            <p className="text-sm text-muted-foreground">Live breakdown of active campaigns</p>
          </div>
          <div className="flex gap-2">
            <Link href="/campaigns/create">
              <button className="px-4 py-2 text-xs font-bold rounded-lg bg-on-background text-white hover:opacity-90 transition-opacity">New Campaign</button>
            </Link>
          </div>
        </div>

        {/* Campaigns loading skeleton */}
        {campaignsLoading && (
          <div className="p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-container-low rounded-lg" />
            ))}
          </div>
        )}

        {/* Campaigns error */}
        {!campaignsLoading && campaignsError && (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-red-600 font-body">{campaignsError}</p>
            <button
              onClick={loadCampaigns}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-border hover:bg-surface-container-low transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Campaigns empty state */}
        {!campaignsLoading && !campaignsError && campaigns.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground font-body">No active campaigns yet.</p>
            <Link href="/campaigns/create">
              <button className="mt-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold font-body">
                Create Campaign
              </button>
            </Link>
          </div>
        )}

        {/* Campaigns success */}
        {!campaignsLoading && !campaignsError && campaigns.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="px-8 py-4">Campaign Name</th>
                    <th className="px-4 py-4">Platform</th>
                    <th className="px-4 py-4">Spend</th>
                    <th className="px-4 py-4">Revenue</th>
                    <th className="px-4 py-4">ROAS</th>
                    <th className="px-4 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map((c) => {
                    const { color, letter } = platformMeta(c.platform);
                    const rt = roasType(c.metrics.roas);
                    return (
                      <Link key={c.id} href={`/campaigns/${c.id}`} legacyBehavior>
                        <tr className="hover:bg-surface-container-low transition-colors cursor-pointer">
                          <td className="px-8 py-5 font-semibold text-sm text-foreground">{c.name}</td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: color }}>{letter}</div>
                              <span className="text-foreground capitalize">{c.platform}</span>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-sm text-foreground">{formatCurrency(c.metrics.spend)}</td>
                          <td className="px-4 py-5 text-sm text-foreground">{formatCurrency(c.metrics.revenue)}</td>
                          <td className="px-4 py-5">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${rt === "great" ? "bg-emerald-100 text-emerald-800" : rt === "bad" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                              {c.metrics.roas.toFixed(2)}x
                            </span>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[c.status] ?? "bg-muted-foreground/30"}`} />
                              <span className="text-xs font-medium capitalize text-foreground">{c.status}</span>
                            </div>
                          </td>
                        </tr>
                      </Link>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-surface-container-low/30 flex justify-center">
              <Link href="/campaigns" className="text-xs font-bold text-primary hover:underline">View All Campaigns →</Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
