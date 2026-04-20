"use client";

import { UserPlus, RefreshCcw, Diamond, MoreVertical, Filter, Download, Lightbulb, Megaphone } from "lucide-react";

const SEGMENT_CARDS = [
  {
    Icon: UserPlus,
    badge: "+12%",
    badgeStyle: "bg-green-50 text-green-600",
    title: "New Customers",
    revenue: "$45,200",
    convRate: "3.2%",
    cardStyle: "bg-white border border-border",
    titleStyle: "text-muted-foreground",
    revenueStyle: "text-foreground",
  },
  {
    Icon: RefreshCcw,
    badge: "+8.4%",
    badgeStyle: "bg-green-50 text-green-600",
    title: "Returning Customers",
    revenue: "$122,800",
    convRate: "5.8%",
    cardStyle: "bg-white border border-border",
    titleStyle: "text-muted-foreground",
    revenueStyle: "text-foreground",
  },
  {
    Icon: Diamond,
    badge: "+14.2%",
    badgeStyle: "bg-white/20 text-white",
    title: "High Value Customers",
    revenue: "$284,500",
    convRate: "12.4%",
    cardStyle: "bg-primary shadow-[0_20px_40px_-12px_rgba(0,91,196,0.25)]",
    titleStyle: "text-white/80",
    revenueStyle: "text-white",
    isHighlight: true,
  },
];

const DONUT_SEGMENTS = [
  { label: "HIGH VALUE", pct: "42.5%", dotColor: "bg-primary" },
  { label: "RETURNING",  pct: "28.1%", dotColor: "bg-[#4388fd]" },
  { label: "NEW",        pct: "18.4%", dotColor: "bg-surface-variant" },
  { label: "OTHERS",     pct: "11.0%", dotColor: "bg-surface-dim" },
];

const TABLE_ROWS = [
  { dotColor: "bg-primary",           name: "High Value", customers: "3,124", aov: "$412.50", contrib: "62%", growth: "+14.2%", growthStyle: "text-green-600" },
  { dotColor: "bg-[#4388fd]",         name: "Returning",  customers: "4,821", aov: "$185.00", contrib: "24%", growth: "+8.4%",  growthStyle: "text-green-600" },
  { dotColor: "bg-surface-variant",   name: "New",        customers: "2,145", aov: "$92.20",  contrib: "10%", growth: "+12.0%", growthStyle: "text-green-600" },
  { dotColor: "bg-[#fa746f]",         name: "At Risk",    customers: "1,452", aov: "$145.00", contrib: "3%",  growth: "-4.2%",  growthStyle: "text-error" },
  { dotColor: "bg-[#dbe2f9]",         name: "Dormant",    customers: "940",   aov: "$88.40",  contrib: "1%",  growth: "-11.5%", growthStyle: "text-muted-foreground" },
];

export default function SegmentPage() {
  return (
    <div className="space-y-10">
      {/* Segment Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SEGMENT_CARDS.map((c) => (
          <div
            key={c.title}
            className={`${c.cardStyle} p-8 rounded-xl shadow-[0_12px_24px_-10px_rgba(5,52,92,0.05)] group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
          >
            {c.isHighlight && (
              <div className="absolute -right-10 -bottom-10 opacity-10 scale-150 rotate-12 text-[160px] leading-none select-none text-white">
                ★
              </div>
            )}
            <div className={`relative z-10`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 ${c.isHighlight ? "bg-white/20" : "bg-surface-container-low"} rounded-xl flex items-center justify-center ${c.isHighlight ? "text-white" : "text-primary"}`}>
                  <c.Icon size={22} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 ${c.badgeStyle} rounded-full tracking-wider font-body`}>
                  {c.badge}
                </span>
              </div>
              <h3 className={`${c.titleStyle} font-medium text-sm mb-1 font-body`}>{c.title}</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`text-2xl font-extrabold ${c.revenueStyle} font-sans`}>{c.revenue}</span>
                <span className={`text-xs ${c.isHighlight ? "text-white/60" : "text-muted-foreground"} font-body`}>Revenue</span>
              </div>
              <div className={`pt-4 border-t ${c.isHighlight ? "border-white/10" : "border-border"} flex justify-between items-center`}>
                <span className={`text-xs ${c.isHighlight ? "text-white/80" : "text-muted-foreground"} font-body`}>Conversion Rate</span>
                <span className={`text-sm font-bold ${c.revenueStyle} font-sans`}>{c.convRate}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Bento: Donut + Table */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Donut Chart */}
        <div className="xl:col-span-5 bg-white rounded-xl shadow-[0_16px_32px_-12px_rgba(5,52,92,0.06)] p-8 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-bold font-sans text-foreground">Customer Segment Distribution</h2>
              <p className="text-xs text-muted-foreground font-body">Total base composition for Q3</p>
            </div>
            <button className="text-primary hover:bg-surface-container-low p-2 rounded-lg transition-all">
              <MoreVertical size={18} />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="relative w-56 h-56 rounded-full flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="112" cy="112" fill="transparent" r="90" stroke="#eff4ff" strokeWidth="24" />
                <circle cx="112" cy="112" fill="transparent" r="90" stroke="#005bc4" strokeDasharray="565" strokeDashoffset="140" strokeLinecap="round" strokeWidth="24" />
                <circle cx="112" cy="112" fill="transparent" r="90" stroke="#4388fd" strokeDasharray="565" strokeDashoffset="400" strokeLinecap="round" strokeWidth="24" />
                <circle cx="112" cy="112" fill="transparent" r="90" stroke="#d2e4ff" strokeDasharray="565" strokeDashoffset="500" strokeLinecap="round" strokeWidth="24" />
              </svg>
              <div className="absolute text-center">
                <p className="text-3xl font-black font-sans text-foreground">12,482</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body">Total Users</p>
              </div>
            </div>

            <div className="mt-12 w-full grid grid-cols-2 gap-y-4 gap-x-8">
              {DONUT_SEGMENTS.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground font-bold font-body">{s.label}</p>
                    <p className="text-sm font-bold text-foreground font-sans">{s.pct}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Segment Table */}
        <div className="xl:col-span-7 bg-white rounded-xl shadow-[0_16px_32px_-12px_rgba(5,52,92,0.06)] overflow-hidden">
          <div className="p-8 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-bold font-sans text-foreground">Segment Analytics</h2>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-surface-container-low transition-all rounded-lg font-body">
                <Filter size={14} /> Filter
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-container-low transition-all rounded-lg font-body">
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  {["Segment Name", "Customers", "Avg Order (AOV)", "Contribution", "Growth %"].map((h, i) => (
                    <th
                      key={h}
                      className={`py-4 text-[10px] font-black text-muted-foreground uppercase tracking-wider font-body ${i === 0 ? "px-8" : "px-6 text-right"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TABLE_ROWS.map((row) => (
                  <tr key={row.name} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${row.dotColor}`} />
                        <span className="text-sm font-bold text-foreground font-body">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-foreground text-right font-body">{row.customers}</td>
                    <td className="px-6 py-5 text-sm font-medium text-foreground text-right font-body">{row.aov}</td>
                    <td className="px-6 py-5 text-sm font-medium text-foreground text-right font-body">{row.contrib}</td>
                    <td className="px-8 py-5 text-right">
                      <span className={`text-xs font-bold font-body ${row.growthStyle}`}>{row.growth}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-surface-container-low/30 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-body">Showing 5 of 12 segments</p>
              <div className="flex gap-2">
                <button disabled className="px-3 py-1 bg-white border border-border rounded-md text-xs font-bold disabled:opacity-30 font-body">
                  Previous
                </button>
                <button className="px-3 py-1 bg-white border border-border rounded-md text-xs font-bold hover:bg-surface-container-low transition-all font-body">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Insights Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* AI Insight */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-xl border border-white/40 shadow-sm">
          <h3 className="text-lg font-bold font-sans mb-4 flex items-center gap-2 text-foreground">
            <Lightbulb size={20} className="text-primary fill-primary" />
            AI Segmentation Insight
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed font-body">
            Customers in the <span className="font-bold text-primary">"High Value"</span> segment who haven't made a purchase in 30 days are{" "}
            <span className="font-bold text-error">85% more likely</span> to churn compared to the general population. Recommended action: Trigger "VIP Re-engagement" sequence.
          </p>
          <button className="mt-6 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:shadow-lg transition-all font-body">
            Launch Sequence
          </button>
        </div>

        {/* Top Campaign */}
        <div className="bg-surface-container p-8 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider font-body">
              Top Performing Campaign
            </h3>
            <Megaphone size={18} className="text-muted-foreground" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-xl font-extrabold text-foreground font-sans">Summer Upsell V2</p>
              <p className="text-xs text-muted-foreground font-body">Sent to 12.4k segments</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-primary font-sans">24.2%</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase font-body">Open Rate</p>
            </div>
          </div>
          <div className="mt-6 w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full w-3/4" />
          </div>
        </div>
      </section>
    </div>
  );
}
