"use client";

import {
  TriangleAlert,
  TrendingUp,
  Zap,
  DollarSign,
  Sparkles,
  AlertCircle,
  Database,
  KeyRound,
  Rocket,
  ShoppingCart,
  Network,
  Brain,
  SlidersHorizontal,
  MoreHorizontal,
  Play,
} from "lucide-react";

const SUMMARY_CARDS = [
  {
    label: "Active Alerts",
    value: "12",
    borderColor: "border-error",
    badge: "Critical",
    badgeColor: "text-error",
    BadgeIcon: TriangleAlert,
  },
  {
    label: "Opportunities",
    value: "08",
    borderColor: "border-[#006329]",
    badge: "High",
    badgeColor: "text-[#006329]",
    BadgeIcon: TrendingUp,
  },
  {
    label: "Recommendations",
    value: "24",
    borderColor: "border-primary",
    badge: "Auto",
    badgeColor: "text-primary",
    BadgeIcon: Zap,
  },
  {
    label: "Estimated Impact",
    value: "+$12.4k",
    valueColor: "text-[#006329]",
    borderColor: "border-foreground",
    badge: "This Month",
    badgeColor: "text-muted-foreground",
    BadgeIcon: DollarSign,
  },
];

const ALERTS = [
  {
    Icon: AlertCircle,
    title: "API Latency Spike: East Coast",
    desc: "Service level degradation detected in Node-42",
    impact: "-$1.2k/hr",
  },
  {
    Icon: Database,
    title: "Storage Capacity Threshold",
    desc: 'Database cluster "Alpha" at 94% capacity',
    impact: "-$0.4k/hr",
  },
  {
    Icon: KeyRound,
    title: "Auth Token Invalidation",
    desc: "Unusually high rate of 401 errors globally",
    impact: "-$2.1k/hr",
  },
];

const OPPORTUNITIES = [
  {
    Icon: Rocket,
    badge: "HIGH PROBABILITY",
    title: "Ad Campaign Optimization",
    desc: "Reallocating budget from LinkedIn to Google Search could yield significant ROI.",
    uplift: "+$3,400",
  },
  {
    Icon: ShoppingCart,
    badge: "ESTIMATED",
    title: "Cart Abandonment Flow",
    desc: "Implementation of multi-stage recovery emails for carts over $200.",
    uplift: "+$1,850",
  },
];

const RECOMMENDATIONS = [
  {
    Icon: Network,
    title: "Consolidate AWS Instances",
    desc: "Your current micro-instance usage in US-West-2 is redundant. Consolidating into 2 larger R5 instances will reduce overhead by 22% while maintaining 99.9% uptime.",
    action: "Apply Fix",
  },
  {
    Icon: Brain,
    title: "Enable Dynamic Caching",
    desc: "Edge computing patterns suggest that 40% of your current database calls can be cached at the CDN level. This will lower your egress costs by $450/month.",
    action: "Deploy Edge",
  },
  {
    Icon: SlidersHorizontal,
    title: "Refactor Query Logic",
    desc: 'The "InventorySearch" query is performing full-table scans. Adding a composite index on [Store_ID, Product_Status] will speed up resolution by 3.4s.',
    action: "Optimize SQL",
  },
];

export default function DecisionsPage() {
  return (
    <div className="space-y-10 pb-20">
      {/* Page Header */}
      <div className="space-y-1">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Decisions</h2>
        <p className="text-muted-foreground text-lg font-body">
          AI-powered insights and actions across your enterprise stack.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {SUMMARY_CARDS.map((c) => (
          <div
            key={c.label}
            className={`bg-white p-6 rounded-xl border-t-4 ${c.borderColor} shadow-sm`}
          >
            <p className="text-[0.7rem] uppercase tracking-widest font-bold text-muted-foreground mb-2 font-body">
              {c.label}
            </p>
            <div className="flex items-end justify-between">
              <span className={`text-3xl font-black font-sans ${c.valueColor ?? "text-foreground"}`}>
                {c.value}
              </span>
              <span className={`font-bold flex items-center gap-1 text-sm font-body ${c.badgeColor}`}>
                <c.BadgeIcon size={14} /> {c.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight Panel */}
      <div className="relative overflow-hidden bg-foreground text-white rounded-2xl p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
        <div className="flex-1 space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-[#b4c5ff] border border-primary/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-body">
            <Sparkles size={12} /> AI Performance Insight
          </div>
          <h3 className="text-2xl font-bold font-sans">Weekly Performance Trends</h3>
          <p className="text-white/70 leading-relaxed text-lg font-body">
            Based on the last 7 days of operational telemetry, your infrastructure is showing a{" "}
            <span className="text-[#62df7d] font-bold">14% efficiency gain</span> compared to the
            previous cycle. Strategic resource reallocation in the European node has mitigated 92% of
            predicted latency spikes.
          </p>
          <div className="flex gap-4 pt-2">
            <button className="text-sm font-bold border-b border-[#b4c5ff] text-[#b4c5ff] hover:text-white transition-colors font-body">
              View detailed audit
            </button>
            <button className="text-sm font-bold border-b border-white/30 text-white/50 hover:text-white transition-colors font-body">
              Dismiss
            </button>
          </div>
        </div>
        <div className="w-full md:w-1/3 h-48 rounded-xl overflow-hidden relative group">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSRF2ghoFxQgwm4lSMnIStgVd_4yj3os3SaZuhQwWb1fhWamRu1-vTYUfFdMRty1Xg3RvkAMUsjAZcTDg1rur1dOHEaLIBQ7iJDeIg5aNwHDW7rAm0ww9xhmYRjE7sbz3l2bGP4YCag3ZvHv3bWvknsLuBkShnyvohehfWixrxP2LCwl3Xur9JcdVE0h26bVAhKZe8qiAsSgbH8o1-67jQQmFWiogFxNE_S-AqUfasDUR_ba6_trwv56tAm2apwZGziMjQizRzdns"
            alt="AI data visualization"
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-full">
              <Play size={28} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts + Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Critical Alerts */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase tracking-[0.2em] font-black text-muted-foreground font-body">
              Critical Alerts
            </h4>
            <span className="text-xs font-bold text-primary cursor-pointer hover:underline font-body">View All</span>
          </div>
          <div className="space-y-4">
            {ALERTS.map((a) => (
              <div
                key={a.title}
                className="bg-surface-container-low hover:bg-surface-container-high transition-all p-5 rounded-xl flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#ffdad6] text-error flex items-center justify-center rounded-xl shrink-0">
                    <a.Icon size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground font-sans">{a.title}</h5>
                    <p className="text-sm text-muted-foreground font-body">{a.desc}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="block font-black text-error font-sans">{a.impact}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter font-body">
                    Impact
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Opportunities */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase tracking-[0.2em] font-black text-muted-foreground font-body">
              Growth Opportunities
            </h4>
            <span className="text-xs font-bold text-primary cursor-pointer hover:underline font-body">Exploration</span>
          </div>
          <div className="space-y-4">
            {OPPORTUNITIES.map((o) => (
              <div
                key={o.title}
                className="bg-[#007f36]/10 p-6 rounded-xl border-l-4 border-[#006329]"
              >
                <div className="flex justify-between items-start mb-4">
                  <o.Icon size={20} className="text-[#006329]" />
                  <span className="bg-[#006329] text-white text-[10px] font-black px-2 py-1 rounded font-body">
                    {o.badge}
                  </span>
                </div>
                <h5 className="font-bold text-foreground mb-1 font-sans">{o.title}</h5>
                <p className="text-sm text-muted-foreground mb-4 font-body">{o.desc}</p>
                <div className="flex items-center justify-between border-t border-[#006329]/10 pt-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase font-body">Uplift</span>
                  <span className="text-lg font-black text-[#006329] font-sans">{o.uplift}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-6">
        <h4 className="text-xs uppercase tracking-[0.2em] font-black text-muted-foreground font-body">
          Recommended Actions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RECOMMENDATIONS.map((r) => (
            <div
              key={r.title}
              className="bg-white border border-border p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow flex flex-col h-full"
            >
              <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg mb-6">
                <r.Icon size={20} />
              </div>
              <h5 className="text-lg font-bold text-foreground mb-3 font-sans">{r.title}</h5>
              <p className="text-sm text-muted-foreground leading-relaxed flex-grow font-body">{r.desc}</p>
              <div className="mt-8 flex gap-3">
                <button className="flex-1 bg-primary text-white text-xs font-bold py-3 rounded-lg hover:opacity-90 transition-opacity font-body">
                  {r.action}
                </button>
                <button className="px-4 py-3 bg-surface-container-low text-muted-foreground rounded-lg hover:bg-surface-container-high transition-colors">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
