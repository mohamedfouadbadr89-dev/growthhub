"use client";

import { useState } from "react";

const kpis = [
  { label: "Revenue", value: "$142,580", change: "+8.2%", positive: true, progress: 75 },
  { label: "Profit", value: "$54,200", change: "+12.1%", positive: true, progress: 50 },
  { label: "ROAS", value: "3.8x", change: "-0.4%", positive: false, progress: 38 },
  { label: "Spend", value: "$37,521", change: "Stable", positive: null, progress: 65 },
  { label: "MER", value: "18.4%", change: "+2.1%", positive: true, progress: 80 },
];

const chartBars = [
  { revenue: 40, spend: 32 },
  { revenue: 55, spend: 47 },
  { revenue: 45, spend: 34 },
  { revenue: 70, spend: 63 },
  { revenue: 60, spend: 49 },
  { revenue: 85, spend: 81 },
  { revenue: 75, spend: 66 },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const campaigns = [
  {
    name: "Spring Collection 2024",
    platform: "Meta Ads",
    platformColor: "#1877F2",
    platformLetter: "F",
    spend: "$12,450",
    revenue: "$52,290",
    roas: "4.2x",
    roasType: "great",
    status: "Active",
    statusType: "active",
  },
  {
    name: "Brand Search - EMEA",
    platform: "Google Ads",
    platformColor: "#EA4335",
    platformLetter: "G",
    spend: "$4,200",
    revenue: "$18,480",
    roas: "4.4x",
    roasType: "great",
    status: "Active",
    statusType: "active",
  },
  {
    name: "UGC Influencer Push",
    platform: "YouTube",
    platformColor: "#FF0000",
    platformLetter: "Y",
    spend: "$8,900",
    revenue: "$22,250",
    roas: "2.5x",
    roasType: "neutral",
    status: "Paused",
    statusType: "paused",
  },
  {
    name: "Retargeting Phase 2",
    platform: "LinkedIn",
    platformColor: "#0077B5",
    platformLetter: "L",
    spend: "$1,200",
    revenue: "$1,440",
    roas: "1.2x",
    roasType: "bad",
    status: "Warning",
    statusType: "warning",
  },
];

export default function DashboardOverview() {
  const [insightVisible, setInsightVisible] = useState(true);

  return (
    <div className="space-y-8">
      {/* AI Summary */}
      {insightVisible && (
        <section className="p-6 bg-white rounded-xl border border-border shadow-sm flex gap-6 items-start">
          <div className="w-12 h-12 rounded-xl bg-[#e4ceff] flex items-center justify-center shrink-0">
            <span className="text-[#54436b] text-xl">✦</span>
          </div>
          <div className="flex-1">
            <h3 className="font-sans font-bold text-lg mb-1 text-foreground">
              Precision Intelligence Summary
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Your account is performing{" "}
              <span className="text-primary font-semibold">12.4% above benchmark</span> this month.
              Primary growth is driven by the 'Spring Collection' campaign on Instagram, which
              maintains a 4.2x ROAS. We recommend reallocating $2,500 from underperforming Search
              ads to expand this audience before Friday.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-opacity">
              View Insight
            </button>
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
          <div
            key={kpi.label}
            className="bg-white p-6 rounded-xl border border-border shadow-sm"
          >
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              {kpi.label}
            </p>
            <div className="flex items-baseline gap-2">
              <h4 className="text-2xl font-sans font-extrabold tracking-tight text-foreground">
                {kpi.value}
              </h4>
              <span
                className={`text-xs font-bold ${kpi.positive === true
                    ? "text-emerald-600"
                    : kpi.positive === false
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
              >
                {kpi.change}
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${kpi.progress}%` }}
              />
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
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-outline-variant" />
                <span className="text-muted-foreground">Spend</span>
              </div>
            </div>
          </div>
          <div className="relative h-64 w-full flex items-end gap-2 border-b border-l border-border">
            {chartBars.map((bar, i) => (
              <div key={i} className="flex-1 flex items-end gap-0.5 h-full">
                <div
                  className="flex-1 bg-primary rounded-t-sm hover:opacity-80 transition-opacity"
                  style={{ height: `${bar.revenue}%` }}
                />
                <div
                  className="flex-1 bg-outline-variant/40 rounded-t-sm"
                  style={{ height: `${bar.spend}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-2 text-[10px] font-bold text-muted-foreground uppercase">
            {days.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-4">
          <div className="flex-1 bg-white p-6 rounded-xl border border-border shadow-sm border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-sans font-bold text-foreground">What's Working</h4>
              <span className="text-emerald-500 text-lg">↑</span>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Video Retargeting CTR increased by 24% following Creative Update A.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Organic referral traffic from TechCrunch feature scaling well.
                </p>
              </li>
            </ul>
          </div>
          <div className="flex-1 bg-white p-6 rounded-xl border border-border shadow-sm border-l-4 border-l-red-500">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-sans font-bold text-foreground">Issues Detected</h4>
              <span className="text-red-500 text-lg">!</span>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Landing Page B conversion dropped below 1.5% - Check mobile assets.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Facebook API connection intermittently timing out in EMEA region.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Campaign Table */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-8 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="font-sans font-bold text-xl text-foreground">Campaign Performance Detail</h3>
            <p className="text-sm text-muted-foreground">
              Live breakdown of active ad sets across platforms
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-xs font-bold rounded-lg border border-border hover:bg-surface-container transition-colors">
              Export CSV
            </button>
            <button className="px-4 py-2 text-xs font-bold rounded-lg bg-on-background text-white hover:opacity-90 transition-opacity">
              New Campaign
            </button>
          </div>
        </div>
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
                <th className="px-8 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => (
                <tr key={c.name} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-8 py-5 font-semibold text-sm text-foreground">{c.name}</td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2 text-sm">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                        style={{ backgroundColor: c.platformColor }}
                      >
                        {c.platformLetter}
                      </div>
                      <span className="text-foreground">{c.platform}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-sm text-foreground">{c.spend}</td>
                  <td className="px-4 py-5 text-sm text-foreground">{c.revenue}</td>
                  <td className="px-4 py-5">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${c.roasType === "great"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.roasType === "bad"
                            ? "bg-red-100 text-red-800"
                            : "bg-secondary-container text-on-secondary-container"
                        }`}
                    >
                      {c.roas}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${c.statusType === "active"
                            ? "bg-emerald-500 animate-pulse"
                            : c.statusType === "warning"
                              ? "bg-red-500"
                              : "bg-muted-foreground/30"
                          }`}
                      />
                      <span className="text-xs font-medium text-foreground">{c.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="text-muted-foreground group-hover:text-primary transition-colors text-lg">
                      ⋮
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-surface-container-low/30 flex justify-center">
          <button className="text-xs font-bold text-primary hover:underline transition-all">
            Load More Records
          </button>
        </div>
      </section>
    </div>
  );
}