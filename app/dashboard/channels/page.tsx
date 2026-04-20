"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Globe,
  MousePointerClick,
  Video,
  Filter,
} from "lucide-react";

const CHANNELS = [
  {
    name: "Meta Ads",
    category: "Social",
    categoryColor: "text-blue-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    Icon: Globe,
    trend: "+12%",
    trendUp: true,
    spend: "$14,290",
    revenue: "$42,870",
    roas: "3.0x",
    roasColor: "text-primary",
    roasBarColor: "bg-primary",
    roasBarWidth: "75%",
  },
  {
    name: "Google Ads",
    category: "Search",
    categoryColor: "text-orange-500",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    Icon: MousePointerClick,
    trend: "-3%",
    trendUp: false,
    spend: "$18,440",
    revenue: "$38,120",
    roas: "2.1x",
    roasColor: "text-foreground",
    roasBarColor: "bg-foreground",
    roasBarWidth: "45%",
  },
  {
    name: "TikTok Ads",
    category: "Growth",
    categoryColor: "text-slate-600",
    iconBg: "bg-slate-900",
    iconColor: "text-white",
    Icon: Video,
    trend: "+28%",
    trendUp: true,
    spend: "$9,100",
    revenue: "$31,850",
    roas: "3.5x",
    roasColor: "text-[#317bef]",
    roasBarColor: "bg-[#317bef]",
    roasBarWidth: "85%",
  },
];

const CHART_COLUMNS = [
  { meta: "60%", google: "40%", tiktok: "75%" },
  { meta: "65%", google: "45%", tiktok: "70%" },
  { meta: "80%", google: "35%", tiktok: "65%" },
  { meta: "55%", google: "50%", tiktok: "85%" },
  { meta: "70%", google: "40%", tiktok: "90%" },
];

const TABLE_ROWS = [
  {
    name: "Meta Ads",
    iconBg: "bg-blue-600",
    Icon: Globe,
    spend: "$14,290.00",
    revenue: "$42,870.00",
    roas: "3.00x",
    roasBadge: "bg-green-50 text-green-700",
    barColor: "bg-green-500",
    barWidth: "80%",
    statusDot: "bg-green-500 animate-pulse",
    statusLabel: "Optimal",
  },
  {
    name: "Google Search",
    iconBg: "bg-orange-500",
    Icon: MousePointerClick,
    spend: "$18,440.00",
    revenue: "$38,120.00",
    roas: "2.10x",
    roasBadge: "bg-yellow-50 text-yellow-700",
    barColor: "bg-yellow-500",
    barWidth: "55%",
    statusDot: "bg-yellow-500",
    statusLabel: "Steady",
  },
  {
    name: "TikTok Video",
    iconBg: "bg-slate-900",
    Icon: Video,
    spend: "$9,100.00",
    revenue: "$31,850.00",
    roas: "3.50x",
    roasBadge: "bg-green-50 text-green-700",
    barColor: "bg-green-500",
    barWidth: "92%",
    statusDot: "bg-green-500 animate-pulse",
    statusLabel: "High ROAS",
  },
];

const TIME_FILTERS = ["Last 30 Days", "Quarterly", "Year-to-Date"];

export default function ChannelsPage() {
  const [activeFilter, setActiveFilter] = useState("Last 30 Days");

  return (
    <div className="space-y-12">
      {/* Header & Filters */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h3 className="font-sans text-4xl font-extrabold tracking-tight text-foreground mb-2">
            Portfolio Health
          </h3>
          <p className="text-muted-foreground font-medium font-body">
            Real-time performance metrics across all acquisition channels.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-low p-1.5 rounded-2xl">
          {TIME_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors font-body ${
                activeFilter === f
                  ? "bg-white shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Channel Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {CHANNELS.map((ch) => (
          <div
            key={ch.name}
            className="bg-white shadow-[0_16px_32px_-8px_rgba(5,52,92,0.06)] p-8 rounded-3xl flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 ${ch.iconBg} rounded-2xl flex items-center justify-center ${ch.iconColor}`}
                >
                  <ch.Icon size={22} />
                </div>
                <div>
                  <p className="font-sans font-bold text-lg text-foreground">
                    {ch.name}
                  </p>
                  <span
                    className={`text-xs font-bold ${ch.categoryColor} uppercase tracking-wider font-body`}
                  >
                    {ch.category}
                  </span>
                </div>
              </div>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                  ch.trendUp
                    ? "text-green-600 bg-green-50"
                    : "text-red-600 bg-red-50"
                }`}
              >
                {ch.trendUp ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                {ch.trend}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">
                  Spend
                </p>
                <p className="text-2xl font-sans font-extrabold text-foreground">
                  {ch.spend}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">
                  Revenue
                </p>
                <p className="text-2xl font-sans font-extrabold text-foreground">
                  {ch.revenue}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">
                  ROAS
                </p>
                <div className="flex items-end gap-2">
                  <p className={`text-4xl font-sans font-black ${ch.roasColor}`}>
                    {ch.roas}
                  </p>
                  <div className="h-1.5 grow bg-surface-container-high rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${ch.roasBarColor} rounded-full`}
                      style={{ width: ch.roasBarWidth }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Channel Correlation Chart */}
      <section className="bg-surface-container-low rounded-4xl p-10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h4 className="font-sans text-2xl font-extrabold text-foreground mb-1">
              Channel Correlation
            </h4>
            <p className="text-muted-foreground text-sm font-medium font-body">
              Daily performance fluctuations by acquisition source.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-body">
              <span className="w-3 h-3 rounded-full bg-primary" /> Meta
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-body">
              <span className="w-3 h-3 rounded-full bg-foreground" /> Google
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-body">
              <span className="w-3 h-3 rounded-full bg-[#317bef]" /> TikTok
            </span>
          </div>
        </div>

        <div className="h-80 w-full flex items-end gap-3 relative">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full h-px bg-foreground" />
            ))}
          </div>
          {CHART_COLUMNS.map((col, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end gap-2 cursor-pointer"
            >
              <div
                className="w-full bg-primary/20 rounded-xl hover:bg-primary transition-all"
                style={{ height: col.meta }}
              />
              <div
                className="w-full bg-foreground/20 rounded-xl hover:bg-foreground transition-all"
                style={{ height: col.google }}
              />
              <div
                className="w-full bg-[#317bef]/20 rounded-xl hover:bg-[#317bef] transition-all"
                style={{ height: col.tiktok }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Data Breakdown Table */}
      <section className="bg-white shadow-[0_16px_32px_-8px_rgba(5,52,92,0.06)] rounded-4xl overflow-hidden">
        <div className="p-8 border-b border-surface-container-low flex items-center justify-between">
          <h4 className="font-sans text-xl font-extrabold text-foreground">
            Data Breakdown
          </h4>
          <button className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest hover:bg-surface-container-low px-4 py-2 rounded-xl transition-colors font-body">
            Filter by Status
            <Filter size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                {["Channel", "Ad Spend", "Gross Revenue", "ROAS", "Efficiency", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] font-body"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {TABLE_ROWS.map((row) => (
                <tr
                  key={row.name}
                  className="hover:bg-surface-container-low/30 transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg ${row.iconBg} flex items-center justify-center text-white`}
                      >
                        <row.Icon size={16} />
                      </div>
                      <span className="font-bold text-foreground font-body">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-medium font-body text-foreground">
                    {row.spend}
                  </td>
                  <td className="px-8 py-6 font-medium font-body text-foreground">
                    {row.revenue}
                  </td>
                  <td className="px-8 py-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold font-body ${row.roasBadge}`}
                    >
                      {row.roas}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="w-32 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.barColor} rounded-full`}
                        style={{ width: row.barWidth }}
                      />
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="flex items-center gap-2 text-xs font-bold text-foreground font-body">
                      <span
                        className={`w-2 h-2 rounded-full ${row.statusDot}`}
                      />
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-surface-container-low/20 flex justify-center">
          <button className="text-sm font-bold text-primary hover:underline underline-offset-4 font-body">
            View All Inventory Data
          </button>
        </div>
      </section>
    </div>
  );
}
