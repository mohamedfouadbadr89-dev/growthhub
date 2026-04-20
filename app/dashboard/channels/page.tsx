"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { TrendingUp, Globe, MousePointerClick, ShoppingBag, Filter, Loader2 } from "lucide-react";

interface ChannelMetrics {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
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
  const [activeFilter, setActiveFilter] = useState("Last 30 Days");

  useEffect(() => {
    const fetchChannels = async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      const { from, to } = defaultDateRange();
      try {
        const data = await apiClient<ChannelMetrics[]>(
          `/api/v1/metrics/channels?from=${from}&to=${to}`,
          token
        );
        if (data.length === 0) setNoData(true);
        setChannels(data);
      } catch {
        setNoData(true);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, [getToken]);

  return (
    <div className="space-y-12">
      {/* Header & Filters */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h3 className="font-sans text-4xl font-extrabold tracking-tight text-foreground mb-2">Portfolio Health</h3>
          <p className="text-muted-foreground font-medium font-body">Real-time performance metrics across all acquisition channels.</p>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-low p-1.5 rounded-2xl">
          {TIME_FILTERS.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors font-body ${activeFilter === f ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* No data state */}
      {!loading && noData && (
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

      {/* Channel Correlation Chart */}
      <section className="bg-surface-container-low rounded-4xl p-10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h4 className="font-sans text-2xl font-extrabold text-foreground mb-1">Channel Correlation</h4>
            <p className="text-muted-foreground text-sm font-medium font-body">Daily performance fluctuations by acquisition source.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-body"><span className="w-3 h-3 rounded-full bg-primary" /> Meta</span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-body"><span className="w-3 h-3 rounded-full bg-foreground" /> Google</span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-body"><span className="w-3 h-3 rounded-full bg-green-500" /> Shopify</span>
          </div>
        </div>
        <div className="h-80 w-full flex items-end gap-3 relative">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
            {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-foreground" />)}
          </div>
          {CHART_COLUMNS.map((col, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-2 cursor-pointer">
              <div className="w-full bg-primary/20 rounded-xl hover:bg-primary transition-all" style={{ height: col.meta }} />
              <div className="w-full bg-foreground/20 rounded-xl hover:bg-foreground transition-all" style={{ height: col.google }} />
              <div className="w-full bg-green-500/20 rounded-xl hover:bg-green-500 transition-all" style={{ height: col.shopify }} />
            </div>
          ))}
        </div>
      </section>

      {/* Data Breakdown Table */}
      {channels.length > 0 && (
        <section className="bg-white shadow-[0_16px_32px_-8px_rgba(5,52,92,0.06)] rounded-4xl overflow-hidden">
          <div className="p-8 border-b border-surface-container-low flex items-center justify-between">
            <h4 className="font-sans text-xl font-extrabold text-foreground">Data Breakdown</h4>
            <button className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest hover:bg-surface-container-low px-4 py-2 rounded-xl transition-colors font-body">
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
