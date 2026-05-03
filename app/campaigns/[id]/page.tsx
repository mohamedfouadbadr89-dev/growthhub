"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Bell, HelpCircle, Sparkles, TrendingUp,
  AlertTriangle, ChevronDown, ChevronRight, Plus, ArrowLeftRight,
  Check,
} from "lucide-react"

type TrendMetric = "spend" | "revenue" | "roas"

const MOCK_CAMPAIGN = {
  name: "Summer Collection 2024",
  status: "Active",
  platform: "Meta",
  updatedAgo: "2 min ago",
  spend: "$18,402",
  spendDelta: "+4.2%",
  revenue: "$84,649",
  revenueDelta: "+12.8%",
  roas: "4.6x",
  roasDelta: "+2.1%",
}

const TREND_BARS: { day: string; spendH: number; revenueH: number; roasH: number }[] = [
  { day: "Mon", spendH: 40, revenueH: 60, roasH: 55 },
  { day: "Tue", spendH: 45, revenueH: 75, roasH: 65 },
  { day: "Wed", spendH: 30, revenueH: 55, roasH: 48 },
  { day: "Thu", spendH: 50, revenueH: 90, roasH: 80 },
  { day: "Fri", spendH: 60, revenueH: 80, roasH: 72 },
  { day: "Sat", spendH: 20, revenueH: 40, roasH: 35 },
  { day: "Sun", spendH: 15, revenueH: 30, roasH: 28 },
]

const CREATIVE_GRADIENTS = [
  { label: "V1_Video", roas: "6.1x", grad: "linear-gradient(135deg,#005bc4,#3b82f6)" },
  { label: "V2_Static", roas: "4.8x", grad: "linear-gradient(135deg,#7c3aed,#a855f7)" },
]

const AD_SETS = [
  {
    id: "as1",
    name: "USA_Broad_SummerVibe",
    created: "Created 12 days ago",
    status: "Active",
    budget: "$500.00/day",
    spend: "$4,102.20",
    roas: "5.2x",
    roasGood: true,
    cpa: "$12.40",
    expandedByDefault: true,
  },
  {
    id: "as2",
    name: "UK_Interests_Fashion_Lover",
    created: "Created 8 days ago",
    status: "Active",
    budget: "$250.00/day",
    spend: "$1,840.10",
    roas: "1.8x",
    roasGood: false,
    cpa: "$24.10",
    expandedByDefault: false,
  },
]

const ACTIONS = [
  {
    id: "act1",
    icon: <Plus className="w-5 h-5" />,
    iconBg: "bg-emerald-50 text-emerald-600",
    tag: "SAFE",
    title: "Increase Budget +20%",
    desc: "Triggered by: 48h ROAS > 4.5x.",
  },
  {
    id: "act2",
    icon: <ArrowLeftRight className="w-5 h-5" />,
    iconBg: "bg-blue-50 text-blue-600",
    tag: "STRATEGIC",
    title: "Shift Budget Across",
    desc: 'Move from "Fashion" to "Broad".',
  },
]

export default function CampaignDetailPage() {
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("spend")
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["as1"]))
  const [executing, setExecuting] = useState<Set<string>>(new Set())
  const [executed, setExecuted] = useState<Set<string>>(new Set())
  const [auditRunning, setAuditRunning] = useState(false)
  const [auditDone, setAuditDone] = useState(false)
  const [applyingAll, setApplyingAll] = useState(false)
  const [appliedAll, setAppliedAll] = useState(false)

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleExecute = (id: string) => {
    if (executed.has(id)) return
    setExecuting(prev => new Set(prev).add(id))
    setTimeout(() => {
      setExecuting(prev => { const n = new Set(prev); n.delete(id); return n })
      setExecuted(prev => new Set(prev).add(id))
    }, 1200)
  }

  const handleAudit = () => {
    if (auditDone) return
    setAuditRunning(true)
    setTimeout(() => { setAuditRunning(false); setAuditDone(true) }, 1400)
  }

  const handleApplyAll = () => {
    if (appliedAll) return
    setApplyingAll(true)
    setTimeout(() => { setApplyingAll(false); setAppliedAll(true) }, 1200)
  }

  const barKey = (b: typeof TREND_BARS[0]) =>
    trendMetric === "spend" ? b.spendH : trendMetric === "revenue" ? b.revenueH : b.roasH

  return (
    <div className="space-y-8">
      {/* Topbar */}
      <div className="flex items-center justify-between -mx-6 -mt-6 px-6 h-14 border-b border-border bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="p-1.5 rounded-lg hover:bg-surface-container-low text-muted-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-3">
            <h1 className="font-sans font-bold text-foreground text-sm">{MOCK_CAMPAIGN.name}</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wider uppercase">
              {MOCK_CAMPAIGN.status}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low text-muted-foreground text-[10px] font-semibold">
              {MOCK_CAMPAIGN.platform}
            </span>
            <span className="text-[10px] text-muted-foreground font-body hidden sm:block">
              Last updated {MOCK_CAMPAIGN.updatedAgo}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-surface-container-low rounded-lg transition-colors">Export</button>
          <button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-surface-container-low rounded-lg transition-colors">Duplicate</button>
          <button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-surface-container-low rounded-lg transition-colors">Pause</button>
          <button
            onClick={handleAudit}
            disabled={auditRunning}
            className="px-4 py-1.5 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all disabled:opacity-70"
            style={{ background: auditDone ? "#059669" : "linear-gradient(135deg,#005bc4,#3b82f6)" }}
          >
            {auditRunning ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Running…</span></>
            ) : auditDone ? (
              <><Check className="w-3.5 h-3.5" /><span>Audit Done</span></>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /><span>Launch AI Audit</span></>
            )}
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground"><Bell className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground"><HelpCircle className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-8 space-y-8">

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Spend", value: MOCK_CAMPAIGN.spend, delta: MOCK_CAMPAIGN.spendDelta, color: "text-foreground" },
              { label: "Revenue", value: MOCK_CAMPAIGN.revenue, delta: MOCK_CAMPAIGN.revenueDelta, color: "text-foreground" },
              { label: "ROAS", value: MOCK_CAMPAIGN.roas, delta: MOCK_CAMPAIGN.roasDelta, color: "text-primary" },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-border p-6 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{k.label}</p>
                <div className="flex items-baseline gap-2">
                  <h2 className={`text-3xl font-extrabold tracking-tight font-sans ${k.color}`}>{k.value}</h2>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{k.delta}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Direct Execution Layer */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <h3 className="font-sans font-extrabold text-foreground text-lg whitespace-nowrap">Direct Execution Layer</h3>
              <div className="h-px flex-1 bg-surface-container-high" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ACTIONS.map(act => (
                <div key={act.id} className="group bg-white p-5 rounded-xl border border-border shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg ${act.iconBg} transition-colors`}>{act.icon}</div>
                    <span className="text-[9px] font-bold text-muted-foreground bg-surface-container-low px-2 py-0.5 rounded">{act.tag}</span>
                  </div>
                  <h4 className="font-sans font-bold text-foreground text-sm mb-1">{act.title}</h4>
                  <p className="font-body text-[10px] text-muted-foreground leading-relaxed mb-4">{act.desc}</p>
                  <button
                    onClick={() => handleExecute(act.id)}
                    disabled={executing.has(act.id)}
                    className="w-full py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                    style={{ background: executed.has(act.id) ? "#059669" : "#05345c" }}
                  >
                    {executing.has(act.id) ? (
                      <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Executing…</span></>
                    ) : executed.has(act.id) ? (
                      <><Check className="w-3 h-3" /><span>Executed!</span></>
                    ) : "Execute Action"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Trend Analysis */}
          <div className="bg-white rounded-xl border border-border p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-sans font-bold text-foreground text-lg">Trend Analysis</h3>
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
                {(["spend", "revenue", "roas"] as TrendMetric[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setTrendMetric(m)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all capitalize ${trendMetric === m ? "bg-white text-primary shadow-sm border border-border" : "text-muted-foreground hover:bg-white/50"}`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {TREND_BARS.map(b => (
                <div key={b.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full rounded-t transition-all duration-500"
                    style={{ height: `${barKey(b)}%`, background: "linear-gradient(to top,#005bc4,#3b82f6)" }}
                  />
                  <span className="text-[10px] text-muted-foreground font-body mt-2">{b.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Ad Sets Table */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-sans font-bold text-foreground text-lg">Active Ad Sets</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border">
                  <th className="px-6 py-4">Ad Set Name</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Budget</th>
                  <th className="px-4 py-4">Spend</th>
                  <th className="px-4 py-4">ROAS</th>
                  <th className="px-4 py-4">CPA</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {AD_SETS.map(as => (
                  <>
                    <tr
                      key={as.id}
                      onClick={() => toggleExpand(as.id)}
                      className="group hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <div className="font-sans font-bold text-foreground text-sm">{as.name}</div>
                        <div className="text-[11px] text-muted-foreground font-body">{as.created}</div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-foreground">{as.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm font-medium text-foreground">{as.budget}</td>
                      <td className="px-4 py-5 text-sm font-medium text-foreground">{as.spend}</td>
                      <td className={`px-4 py-5 text-sm font-bold ${as.roasGood ? "text-primary" : "text-red-500"}`}>{as.roas}</td>
                      <td className="px-4 py-5 text-sm font-medium text-foreground">{as.cpa}</td>
                      <td className="px-4 py-5 text-right text-muted-foreground">
                        {expanded.has(as.id) ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
                      </td>
                    </tr>
                    {expanded.has(as.id) && (
                      <tr key={`${as.id}-exp`} className="bg-surface-container-low/40">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="flex gap-4 overflow-x-auto">
                            {CREATIVE_GRADIENTS.map(c => (
                              <div key={c.label} className="shrink-0 w-32 space-y-2">
                                <div
                                  className="h-40 rounded-lg"
                                  style={{ background: c.grad }}
                                />
                                <div className="flex justify-between px-1">
                                  <span className="text-[10px] font-bold text-foreground">{c.label}</span>
                                  <span className="text-[10px] font-bold text-primary">{c.roas}</span>
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

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-4 sticky top-20 space-y-6 h-fit">

          {/* AI Strategic Insight */}
          <section className="bg-primary/5 p-6 rounded-xl border border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-16 h-16 text-primary" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">AI Strategic Insight</span>
            </div>
            <h4 className="font-sans font-bold text-foreground text-base mb-2">Performance alert detected</h4>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Global campaign performance dropped 12% in the last 48 hours due to a significant{" "}
              <span className="font-bold text-foreground">CPA increase (+24%)</span> in 2 specific ad sets.
            </p>
          </section>

          {/* Recommendations */}
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Recommendations</h3>
              <button
                onClick={handleApplyAll}
                disabled={applyingAll}
                className="text-[10px] font-bold text-primary hover:underline disabled:opacity-60"
              >
                {applyingAll ? "Applying…" : appliedAll ? "✓ APPLIED" : "APPLY ALL"}
              </button>
            </div>
            <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
              <div className="flex gap-4 p-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer">
                <div className="bg-white p-2 h-fit rounded shadow-sm">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h5 className="font-sans font-bold text-foreground text-sm">Reallocate budget</h5>
                  <p className="font-body text-xs text-muted-foreground mt-1 leading-snug">Move $150/day from UK to USA_Broad.</p>
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">Impact High</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 self-center" />
              </div>
            </div>
          </section>

          {/* Risk Analysis */}
          <section
            className="p-6 rounded-xl relative overflow-hidden shadow-xl"
            style={{ background: "linear-gradient(135deg,#05345c,#0f172a)" }}
          >
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-3xl" style={{ background: "#005bc433" }} />
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Execution Risk</span>
            </div>
            <div className="space-y-4">
              <div>
                <h5 className="font-sans font-bold text-white text-sm mb-1">Learning Phase Reset</h5>
                <p className="font-body text-xs text-slate-400 leading-relaxed">
                  Current AI model suggests a{" "}
                  <span className="text-white font-bold">84% risk</span> of re-entering learning phase.
                </p>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: "84%" }} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
