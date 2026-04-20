"use client";

import {
  Zap, TrendingDown, TrendingUp, CheckCircle2, AlertTriangle,
  Megaphone, Sparkles, Mail, Filter, Download, Plus,
} from "lucide-react";

const KPI_CARDS = [
  { label: "Revenue", value: "$142,400", change: "+12%",  changeStyle: "text-emerald-600" },
  { label: "ROAS",    value: "3.82x",   change: "-0.4",  changeStyle: "text-red-600" },
  { label: "Spend",   value: "$37,200", change: "Steady", changeStyle: "text-muted-foreground" },
  { label: "Profit",  value: "$84,100", change: "+8.4%", changeStyle: "text-emerald-600" },
];

const CHART_DAYS = [
  { day: "MON", revenue: 80, spend: 20 },
  { day: "TUE", revenue: 60, spend: 30 },
  { day: "WED", revenue: 90, spend: 15 },
  { day: "THU", revenue: 75, spend: 25 },
  { day: "FRI", revenue: 85, spend: 10 },
  { day: "SAT", revenue: 40, spend: 50 },
  { day: "SUN", revenue: 55, spend: 45 },
];

const ACTION_LOG = [
  {
    Icon: Megaphone,
    iconBg: "bg-surface-container-high",
    label: "Scale FB Lookalike 1%",
    type: "Automation",
    typeBg: "bg-blue-50 text-blue-700",
    impact: "+$4.2k",
    impactStyle: "text-emerald-600",
    ImpactIcon: Plus,
    status: "Executed",
    statusDot: "bg-emerald-500",
  },
  {
    Icon: Sparkles,
    iconBg: "bg-primary/10",
    label: "TikTok Overspend Cut",
    type: "AI Suggestion",
    typeBg: "bg-primary/10 text-primary",
    impact: "$2.1k",
    impactStyle: "text-muted-foreground",
    ImpactIcon: TrendingDown,
    status: "Pending Review",
    statusDot: "bg-amber-400",
  },
  {
    Icon: Mail,
    iconBg: "bg-surface-container-high",
    label: "Re-engagement Sequence",
    type: "Automation",
    typeBg: "bg-blue-50 text-blue-700",
    impact: "+$12.4k",
    impactStyle: "text-emerald-600",
    ImpactIcon: Plus,
    status: "Executed",
    statusDot: "bg-emerald-500",
  },
];

export default function AutomationPage() {
  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary font-body">
              Automation Active
            </span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground font-sans mb-2">
            Decision Center
          </h1>
          <p className="text-muted-foreground text-lg font-body">AI-powered actions &amp; system intelligence</p>
        </div>
        <button className="flex items-center gap-2 px-8 py-4 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all font-body">
          <Zap size={18} /> Create Automation
        </button>
      </div>

      {/* Priority Intelligence Bento */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main alert card */}
        <div className="lg:col-span-8 bg-surface-container-high rounded-2xl p-10 relative overflow-hidden flex flex-col justify-between group border border-border">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary font-body">
                Priority Intelligence
              </span>
            </div>
            <h2 className="text-3xl font-bold text-foreground font-sans mb-4 max-w-lg">
              TikTok campaigns are overspending with declining ROAS
            </h2>
            <div className="flex items-center gap-3 text-muted-foreground mb-10">
              <Sparkles size={18} className="text-primary shrink-0" />
              <p className="text-lg font-body">
                Suggested action:{" "}
                <span className="font-bold text-foreground">Reduce budget by 18%</span>{" "}
                for non-performing creatives.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <button className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all font-body">
              Apply Fix Now
            </button>
            <button className="bg-white text-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-surface-container-low transition-all font-body border border-border">
              View Details
            </button>
          </div>
          <div className="absolute bottom-4 right-8 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
            <TrendingDown size={96} className="text-foreground" />
          </div>
        </div>

        {/* Side insight cards */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {[
            {
              Icon: CheckCircle2,
              iconColor: "text-emerald-600",
              tag: "Insight",
              title: "What's Working",
              desc: "Google Search retargeting is seeing a 4.2x ROAS spike.",
              barColor: "bg-emerald-500",
              barPct: "85%",
              barBg: "bg-emerald-100",
            },
            {
              Icon: AlertTriangle,
              iconColor: "text-red-600",
              tag: "Risk",
              title: "Issues Detected",
              desc: "Lander checkout latency increased by 2.1s in US East.",
              barColor: "bg-red-500",
              barPct: "60%",
              barBg: "bg-red-100",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="flex-1 bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between border border-transparent hover:border-border transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <card.Icon size={20} className={card.iconColor} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 font-body">
                  {card.tag}
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-lg text-foreground font-sans mb-1">{card.title}</h3>
                <p className="text-sm text-muted-foreground font-body">{card.desc}</p>
              </div>
              <div className={`h-1 w-full ${card.barBg} rounded-full mt-4 overflow-hidden`}>
                <div className={`h-full ${card.barColor} rounded-full`} style={{ width: card.barPct }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* KPI Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {KPI_CARDS.map((k) => (
          <div key={k.label} className="bg-surface-container-low p-6 rounded-2xl border border-border">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 font-body">
              {k.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground font-sans">{k.value}</span>
              <span className={`text-xs font-bold font-body ${k.changeStyle}`}>{k.change}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Chart + Action Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue vs Spend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-border">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-foreground font-sans">Revenue vs Spend</h3>
            <div className="flex gap-4">
              {[
                { color: "bg-primary", label: "Revenue" },
                { color: "bg-primary/20", label: "Spend" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${l.color}`} />
                  <span className="text-xs font-medium text-muted-foreground font-body">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-64 flex items-end justify-between px-2 gap-4">
            {CHART_DAYS.map((d) => (
              <div key={d.day} className="w-full flex flex-col gap-1 items-center">
                <div className="w-full bg-surface-container-high flex flex-col-reverse h-48 rounded-lg overflow-hidden">
                  <div className="bg-primary" style={{ height: `${d.revenue}%` }} />
                  <div className="bg-primary/20" style={{ height: `${d.spend}%` }} />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground/60 mt-1 font-body">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Log — spans full width below on lg */}
        <div className="lg:col-span-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-border">
          <div className="p-8 border-b border-surface-container-low flex justify-between items-center">
            <h3 className="text-xl font-bold text-foreground font-sans">Action Log</h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-surface-container-high rounded-xl text-muted-foreground transition-colors">
                <Filter size={16} />
              </button>
              <button className="p-2 hover:bg-surface-container-high rounded-xl text-muted-foreground transition-colors">
                <Download size={16} />
              </button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-surface-container-low/50">
              <tr>
                {["Decision", "Type", "Impact", "Status"].map((h) => (
                  <th key={h} className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground font-body">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {ACTION_LOG.map((row) => (
                <tr key={row.label} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${row.iconBg} flex items-center justify-center`}>
                        <row.Icon size={16} className="text-primary" />
                      </div>
                      <span className="font-medium text-foreground font-body">{row.label}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-body ${row.typeBg}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`flex items-center gap-1 font-bold font-body ${row.impactStyle}`}>
                      <row.ImpactIcon size={14} />
                      <span>{row.impact}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${row.statusDot}`} />
                      <span className="text-sm font-medium text-foreground font-body">{row.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer rule */}
      <div className="pt-4 opacity-50">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
        <p className="text-center mt-6 text-xs text-muted-foreground/40 font-sans uppercase tracking-widest">
          Powered by Fluid Architecture Core 2.0
        </p>
      </div>
    </div>
  );
}
