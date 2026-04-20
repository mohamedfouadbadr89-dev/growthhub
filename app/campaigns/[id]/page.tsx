"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  PlusCircle,
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  LineChart,
  ChevronDown,
  ChevronRight,
  Globe,
} from "lucide-react";

const KPI_CARDS = [
  { label: "Total Spend",  value: "$18,402", change: "+4.2%",  valueClass: "text-foreground" },
  { label: "Revenue",      value: "$84,649", change: "+12.8%", valueClass: "text-foreground" },
  { label: "ROAS",         value: "4.6x",    change: "+2.1%",  valueClass: "text-primary" },
];

const EXEC_ACTIONS = [
  {
    Icon: PlusCircle,
    iconBg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    badge: "SAFE",
    title: "Increase Budget +20%",
    desc: "Triggered by: 48h ROAS > 4.5x.",
  },
  {
    Icon: ArrowLeftRight,
    iconBg: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    badge: "STRATEGIC",
    title: "Shift Budget Across",
    desc: 'Move from "Fashion" to "Broad".',
  },
];

const CHART_BARS = [
  { day: "Mon", spend: 40, revenue: 60 },
  { day: "Tue", spend: 45, revenue: 75 },
  { day: "Wed", spend: 30, revenue: 55 },
  { day: "Thu", spend: 50, revenue: 90 },
  { day: "Fri", spend: 60, revenue: 80 },
  { day: "Sat", spend: 20, revenue: 40 },
  { day: "Sun", spend: 15, revenue: 30 },
];

const AD_SETS = [
  {
    name: "USA_Broad_SummerVibe",
    created: "Created 12 days ago",
    status: "Active",
    budget: "$500.00/day",
    spend: "$4,102.20",
    roas: "5.2x",
    roasClass: "text-primary",
    cpa: "$12.40",
    expanded: true,
    creatives: [
      { label: "V1_Video",  roas: "6.1x", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCtGI1eesBflmUk5Ph64ES61X8HTgg8CFgAXFjZf4X0NCHjye7mNbKhD-jbLp1JyKyTQlNQFhIjVJqeEs-g-okdU5DXULYahRukdVnPMsG-zMCc-xXMlPE2xsJa6kYech6CD7hT4u3RTH6JrziBYyaxvgn6FEP2x2eQMwl44bwSuaJHDfS-gtWNOEx5TBzigh7iM-aPJdZtTNO6g1opHC1P4ZWaDTJA4_RYYusHNuIwxokIRQxutEvfFzwGrIHf0BwFDh02fdPUnAs" },
      { label: "V2_Static", roas: "4.8x", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCnk6dhobm69cmB-U3YAo1QDekNMy_JS71LP6sICcSY9XPxNlC9UVUPXkOfKwqZGgYoniGVww-KyF2aeoFRz5Htq5MjvSK8qKdNZJZaSf_Sypq5hUjAaQQD0Cx-Zcp6DBIbfIdORu1JSLpr9aXizX36nmBmtphYrVVKN76RsGirk5wPeAK7mn10PKr1ujp0gQ5BZIMNqG4QzkZVsZqutjQHUydwUuu0BblwqDa37jq1ZWeiJYIOBm5V0FCfZqsMu3sNDkyuVAvMy1g" },
    ],
  },
  {
    name: "UK_Interests_Fashion_Lover",
    created: "Created 8 days ago",
    status: "Active",
    budget: "$250.00/day",
    spend: "$1,840.10",
    roas: "1.8x",
    roasClass: "text-red-600",
    cpa: "$24.10",
    expanded: false,
    creatives: [],
  },
];

export default function CampaignDetailPage() {
  const [chartTab, setChartTab] = useState<"Spend" | "Revenue" | "ROAS">("Spend");

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <button className="p-2 rounded-xl hover:bg-surface-container-low text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-foreground font-sans">Summer Collection 2024</h1>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wider uppercase">
            ACTIVE
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-low text-muted-foreground text-[10px] font-semibold">
            <Globe size={12} />
            Meta
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Last updated 2 min ago</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button className="px-4 py-2 text-muted-foreground hover:bg-surface-container-low rounded-lg transition-colors font-semibold text-sm font-body">
            Export
          </button>
          <button className="px-4 py-2 text-muted-foreground hover:bg-surface-container-low rounded-lg transition-colors font-semibold text-sm font-body">
            Duplicate
          </button>
          <button className="px-4 py-2 text-muted-foreground hover:bg-surface-container-low rounded-lg transition-colors font-semibold text-sm font-body">
            Pause
          </button>
          <button className="bg-primary text-white px-5 py-2 rounded-lg font-bold shadow-md hover:opacity-90 transition-all text-sm font-body">
            Launch AI Audit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            {KPI_CARDS.map((k) => (
              <div key={k.label} className="bg-white p-6 rounded-2xl shadow-sm border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-body">
                  {k.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className={`text-3xl font-extrabold tracking-tight font-sans ${k.valueClass}`}>
                    {k.value}
                  </h2>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-body">
                    {k.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Direct Execution Layer */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-extrabold text-foreground font-sans">Direct Execution Layer</h3>
              <div className="h-px flex-1 bg-surface-container-high" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXEC_ACTIONS.map((a) => (
                <div
                  key={a.title}
                  className="group bg-white p-5 rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg transition-colors ${a.iconBg}`}>
                      <a.Icon size={20} />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground bg-surface-container-low px-2 py-0.5 rounded font-body">
                      {a.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1 font-sans">{a.title}</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mb-4 font-body">{a.desc}</p>
                  <button className="w-full py-2 bg-foreground text-white text-xs font-bold rounded-lg hover:bg-primary transition-colors font-body">
                    Execute Action
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Trend Analysis */}
          <div className="bg-white rounded-2xl p-8 border border-border shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold text-foreground font-sans">Trend Analysis</h3>
              <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-lg">
                {(["Spend", "Revenue", "ROAS"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setChartTab(tab)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors font-body ${
                      chartTab === tab
                        ? "bg-white text-primary shadow-sm border border-border"
                        : "text-muted-foreground hover:bg-white/50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {CHART_BARS.map((b) => (
                <div key={b.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full bg-primary/10 rounded-t" style={{ height: `${b.spend}%` }} />
                  <div className="w-full bg-primary/30 rounded-t" style={{ height: `${b.revenue}%` }} />
                  <span className="text-[10px] text-muted-foreground mt-2 font-medium font-body">{b.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Ad Sets Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-surface-container-low">
              <h3 className="text-lg font-bold text-foreground font-sans">Active Ad Sets</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border">
                  <th className="px-6 py-4 font-body">Ad Set Name</th>
                  <th className="px-4 py-4 font-body">Status</th>
                  <th className="px-4 py-4 font-body">Budget</th>
                  <th className="px-4 py-4 font-body">Spend</th>
                  <th className="px-4 py-4 font-body">ROAS</th>
                  <th className="px-4 py-4 font-body">CPA</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {AD_SETS.map((row) => (
                  <>
                    <tr key={row.name} className="group hover:bg-surface-container-low transition-colors cursor-pointer">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground font-sans">{row.name}</span>
                          <span className="text-[11px] text-muted-foreground font-body">{row.created}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                        <span className="text-xs font-semibold text-foreground font-body">{row.status}</span>
                      </td>
                      <td className="px-4 py-5">
                        <span className="text-sm font-medium text-foreground font-body">{row.budget}</span>
                      </td>
                      <td className="px-4 py-5 text-sm font-medium text-foreground font-body">{row.spend}</td>
                      <td className={`px-4 py-5 text-sm font-bold font-body ${row.roasClass}`}>{row.roas}</td>
                      <td className="px-4 py-5 text-sm font-medium text-foreground font-body">{row.cpa}</td>
                      <td className="px-4 py-5 text-right text-muted-foreground group-hover:text-primary transition-colors">
                        {row.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                    </tr>
                    {row.expanded && row.creatives.length > 0 && (
                      <tr key={`${row.name}-expanded`} className="bg-surface-container-low/30">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="flex gap-4 overflow-x-auto">
                            {row.creatives.map((c) => (
                              <div key={c.label} className="flex-shrink-0 w-32 space-y-2">
                                <div className="h-40 rounded-lg overflow-hidden bg-surface-container-high">
                                  <img src={c.img} alt={c.label} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex justify-between px-1">
                                  <span className="text-[10px] font-bold text-foreground font-body">{c.label}</span>
                                  <span className="text-[10px] font-bold text-primary font-body">{c.roas}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-12 lg:col-span-4 sticky top-24 space-y-6 h-fit">
          {/* AI Strategic Insight */}
          <section className="bg-primary/5 p-6 rounded-2xl border border-primary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <Sparkles size={64} />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <LineChart size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest font-body">AI Strategic Insight</span>
            </div>
            <h4 className="text-lg font-bold text-foreground mb-2 font-sans">Performance alert detected</h4>
            <p className="text-sm text-muted-foreground leading-relaxed font-body">
              Global campaign performance dropped 12% in the last 48 hours due to a significant{" "}
              <span className="font-bold text-foreground">CPA increase (+24%)</span> in 2 specific ad sets.
            </p>
          </section>

          {/* Recommendations */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-body">Recommendations</h3>
              <button className="text-[10px] font-bold text-primary hover:underline font-body">APPLY ALL</button>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-border space-y-4">
              <div className="flex gap-4 p-3 bg-surface-container-low rounded-xl group hover:bg-surface-container-high transition-colors cursor-pointer">
                <div className="bg-white p-2 h-fit rounded-lg shadow-sm">
                  <TrendingUp size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-bold text-foreground font-sans">Reallocate budget</h5>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug font-body">
                    Move $150/day from UK to USA_Broad.
                  </p>
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase font-body">
                      Impact High
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors self-center" />
              </div>
            </div>
          </section>

          {/* Risk Analysis */}
          <section className="bg-foreground text-white p-6 rounded-2xl relative overflow-hidden shadow-xl">
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/20 blur-3xl" />
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest font-body">Execution Risk</span>
            </div>
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-bold text-white mb-1 font-sans">Learning Phase Reset</h5>
                <p className="text-xs text-slate-400 font-body">
                  Current AI model suggests a{" "}
                  <span className="text-white font-bold">84% risk</span> of re-entering learning phase.
                </p>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full w-[84%]" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
