"use client";

import { useState } from "react";
import {
  Sparkles, ChevronRight, AlertTriangle, TrendingUp, Activity,
  FlaskConical, CheckCircle, ExternalLink,
} from "lucide-react";

interface ActionStep {
  title: string;
  desc: string;
  time: string;
  platform: string;
  automation: string;
}

interface Recommendation {
  id: string;
  badge: string;
  insightId: string;
  title: string;
  impactScore: number;
  confidence: number;
  aiReasoning: string;
  causal: {
    cpaChange: string;
    cpaWidth: string;
    ctrChange: string;
    ctrWidth: string;
    chartBars: { color: string; height: string; dot?: boolean }[];
    correlation: string;
  };
  actionSteps: ActionStep[];
  simulation: {
    revenue: string;
    cost: string;
    roas: string;
    confidenceRange: string;
  };
  risks: {
    label: string;
    severity: string;
    severityClass: string;
    severityBg: string;
    desc: string;
  }[];
  worstCase: { label: string; value: string; desc: string };
  relatedSignals: { label: string; icon: "warning" | "signal" }[];
}

const MOCK_RECS: Recommendation[] = [
  {
    id: "rec-001",
    badge: "NEW",
    insightId: "AD-992-PX",
    title: "ROAS Decline Detected in Prospecting Campaigns",
    impactScore: 92,
    confidence: 92,
    aiReasoning:
      "AI has detected a performance drop due to increased auction pressure on Meta and creative fatigue. The recommended pivot to Cost Cap bidding will protect margins by ensuring spend only occurs when forecasted conversion costs align with your targets.",
    causal: {
      cpaChange: "+14%",
      cpaWidth: "w-[65%]",
      ctrChange: "-5%",
      ctrWidth: "w-[35%]",
      chartBars: [
        { color: "bg-primary/10", height: "h-1/2" },
        { color: "bg-primary/10", height: "h-2/3" },
        { color: "bg-primary/10", height: "h-3/4" },
        { color: "bg-primary/20", height: "h-full", dot: true },
        { color: "bg-red-200", height: "h-[85%]" },
        { color: "bg-red-300", height: "h-[70%]" },
        { color: "bg-red-400", height: "h-[60%]" },
      ],
      correlation: "High (0.88)",
    },
    actionSteps: [
      {
        title: "Update creative assets",
        desc: "Deploy 3 new high-contrast video variants to combat identified audience fatigue.",
        time: "2-4 Hours",
        platform: "Meta (FB/IG)",
        automation: "Compatible",
      },
      {
        title: "Adjust bidding strategy to 'Cost Cap'",
        desc: "Switch from 'Lowest Cost' to 'Cost Cap' set at $24.50 to prevent budget waste.",
        time: "Instant",
        platform: "Meta Ads Manager",
        automation: "Full Support",
      },
    ],
    simulation: {
      revenue: "+$12.4k",
      cost: "-5.2%",
      roas: "+0.8x",
      confidenceRange: "88–94% Range",
    },
    risks: [
      {
        label: "Learning Phase Reset",
        severity: "Medium",
        severityClass: "text-orange-600",
        severityBg: "bg-orange-100",
        desc: "Minor volatility expected for 48 hours post-update.",
      },
    ],
    worstCase: {
      label: "Worst Case Scenario",
      value: "-$1.2k Spend Leak",
      desc: "Creative variants fail to resonate, resulting in a temporary ROAS dip to 2.1x before automated pause triggers.",
    },
    relatedSignals: [
      { label: "Creative Fatigue Alert", icon: "warning" },
      { label: "Audience Saturation Signal", icon: "signal" },
    ],
  },
  {
    id: "rec-002",
    badge: "ACTIVE",
    insightId: "AD-887-BU",
    title: "Budget Reallocation Opportunity in Google Search",
    impactScore: 78,
    confidence: 85,
    aiReasoning:
      "Google Search campaigns are delivering a consistent 4.1x ROAS over the last 14 days while Meta prospecting has stagnated at 1.8x. Reallocating 20% of Meta budget to Google branded keywords will improve blended ROAS by an estimated 0.6x.",
    causal: {
      cpaChange: "+8%",
      cpaWidth: "w-[40%]",
      ctrChange: "+22%",
      ctrWidth: "w-[70%]",
      chartBars: [
        { color: "bg-primary/10", height: "h-1/3" },
        { color: "bg-primary/20", height: "h-1/2" },
        { color: "bg-primary/30", height: "h-2/3" },
        { color: "bg-primary/40", height: "h-full", dot: false },
        { color: "bg-emerald-200", height: "h-[90%]" },
        { color: "bg-emerald-300", height: "h-full" },
        { color: "bg-emerald-400", height: "h-[95%]" },
      ],
      correlation: "High (0.82)",
    },
    actionSteps: [
      {
        title: "Shift budget from Meta prospecting",
        desc: "Reduce Meta daily budget by $200/day and redirect to Google branded campaigns.",
        time: "Instant",
        platform: "Meta + Google",
        automation: "Full Support",
      },
      {
        title: "Expand Google branded keyword list",
        desc: "Add 12 high-intent branded variants currently missing from the active keyword set.",
        time: "1-2 Hours",
        platform: "Google Ads",
        automation: "Compatible",
      },
    ],
    simulation: {
      revenue: "+$8.9k",
      cost: "-3.1%",
      roas: "+0.6x",
      confidenceRange: "80–90% Range",
    },
    risks: [
      {
        label: "Meta Reach Reduction",
        severity: "Low",
        severityClass: "text-blue-600",
        severityBg: "bg-blue-100",
        desc: "Reducing Meta budget may temporarily lower top-of-funnel reach by 15%.",
      },
    ],
    worstCase: {
      label: "Worst Case Scenario",
      value: "-$600 Opportunity Cost",
      desc: "Google search volume for branded terms may be limited, resulting in underspend and unrealized gains.",
    },
    relatedSignals: [
      { label: "Google ROAS Surge Signal", icon: "signal" },
      { label: "Meta Frequency Warning", icon: "warning" },
    ],
  },
];

export default function RecommendationsPage() {
  const [activeId, setActiveId] = useState<string>(MOCK_RECS[0].id);
  const [simulating, setSimulating] = useState(false);
  const [simulated, setSimulated] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<Record<string, boolean>>({});

  const rec = MOCK_RECS.find((r) => r.id === activeId)!;

  function handleSimulate() {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      setSimulated((s) => ({ ...s, [activeId]: true }));
    }, 1400);
  }

  function handleApply() {
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      setApplied((s) => ({ ...s, [activeId]: true }));
    }, 1200);
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            AI Recommendations
          </h1>
          <p className="text-muted-foreground font-body">AI-generated strategic recommendations based on live performance signals</p>
        </div>
        <div className="flex gap-3 self-start md:self-auto">
          {simulated[activeId] ? (
            <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded-xl font-body" disabled>
              <CheckCircle size={15} />
              Simulated
            </button>
          ) : (
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary border border-primary rounded-xl hover:bg-primary/5 transition-all font-body"
            >
              {simulating ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <FlaskConical size={15} />
              )}
              {simulating ? "Simulating…" : "Simulate"}
            </button>
          )}
          {applied[activeId] ? (
            <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl font-body" disabled>
              <CheckCircle size={15} />
              Applied
            </button>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all font-body"
            >
              {applying && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {applying ? "Applying…" : "Apply Decision"}
            </button>
          )}
        </div>
      </div>

      {/* Rec Selector Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {MOCK_RECS.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveId(r.id)}
            className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all font-body text-left ${
              activeId === r.id
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-surface-container-low text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
            }`}
          >
            <span className={`text-[10px] font-black uppercase tracking-widest mr-2 ${activeId === r.id ? "text-white/70" : "text-primary"}`}>
              {r.badge}
            </span>
            {r.insightId}
          </button>
        ))}
      </div>

      {/* Recommendation Detail */}
      <div>
        {/* Title Row */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black tracking-widest font-body">
                {rec.badge}
              </span>
              <span className="text-sm text-muted-foreground font-body">Insight ID: {rec.insightId}</span>
            </div>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight leading-tight font-sans">{rec.title}</h2>
          </div>
          <div className="flex gap-8 shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">Impact Score</p>
              <p className="text-4xl font-black text-primary font-sans">{rec.impactScore}</p>
            </div>
            <div className="text-right border-l border-border pl-8">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">Confidence</p>
              <p className="text-4xl font-black text-foreground font-sans">{rec.confidence}%</p>
            </div>
          </div>
        </div>

        {/* Main Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <div className="lg:col-span-7 space-y-6">
            {/* AI Reasoning */}
            <section className="bg-surface-container-low rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles size={18} className="text-primary" />
                <h3 className="text-base font-bold text-foreground font-sans">AI Reasoning</h3>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed font-body">{rec.aiReasoning}</p>
            </section>

            {/* Causal Analysis */}
            <section className="bg-surface-container-low rounded-2xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-foreground font-sans">Causal Analysis</h3>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body opacity-60">Past 72 Hours</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-border/30">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-sm font-semibold text-muted-foreground font-body">CPA Increase</p>
                    <span className="text-red-500 font-black font-body">{rec.causal.cpaChange}</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full bg-red-400 ${rec.causal.cpaWidth}`} />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border/30">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-sm font-semibold text-muted-foreground font-body">CTR Decay</p>
                    <span className="text-primary font-black font-body">{rec.causal.ctrChange}</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full bg-primary/40 ${rec.causal.ctrWidth}`} />
                  </div>
                </div>
              </div>
              {/* Bar Chart */}
              <div className="h-48 w-full bg-white rounded-xl flex items-end px-6 pb-6 pt-4 gap-3">
                {rec.causal.chartBars.map((b, i) => (
                  <div key={i} className={`flex-1 ${b.color} ${b.height} rounded-t-lg relative`}>
                    {b.dot && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-center text-muted-foreground font-body">
                Correlation strength: {rec.causal.correlation}
              </p>
            </section>

            {/* Recommended Action Plan */}
            <section className="bg-surface-container-low rounded-2xl p-8">
              <h3 className="text-base font-bold text-foreground mb-6 font-sans">Recommended Action Plan</h3>
              <div className="space-y-4">
                {rec.actionSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-5 rounded-xl border border-border/30 hover:bg-white transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 font-sans">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground font-sans">{step.title}</p>
                      <p className="text-sm text-muted-foreground mb-4 font-body">{step.desc}</p>
                      <div className="flex flex-wrap gap-6 pt-4 border-t border-border/30">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground opacity-60 font-body">Est. Time</span>
                          <span className="text-xs font-semibold text-foreground font-body">{step.time}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground opacity-60 font-body">Platforms</span>
                          <span className="text-xs font-semibold text-foreground font-body">{step.platform}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground opacity-60 font-body">Automation</span>
                          <span className="text-xs font-semibold text-primary font-body">{step.automation}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-border group-hover:text-primary transition-colors self-center shrink-0" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right */}
          <div className="lg:col-span-5 space-y-6">
            {/* Impact Simulation */}
            <section className="bg-primary text-white p-8 rounded-2xl shadow-xl shadow-primary/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-base font-bold font-sans">Impact Simulation</h3>
                <Activity size={20} className="opacity-60" />
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium opacity-80 font-body">Projected Revenue</span>
                  <span className="text-xl font-black font-sans">{rec.simulation.revenue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium opacity-80 font-body">Cost Impact</span>
                  <span className="text-xl font-black text-blue-200 font-sans">{rec.simulation.cost}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium opacity-80 font-body">ROAS Shift</span>
                  <span className="text-xl font-black font-sans">{rec.simulation.roas}</span>
                </div>
              </div>
              <div className="mt-10 pt-6 border-t border-white/10">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3 font-body">
                  <span>Confidence Interval</span>
                  <span>{rec.simulation.confidenceRange}</span>
                </div>
                <div className="h-1.5 w-full bg-white/20 rounded-full flex items-center">
                  <div className="h-2 w-1/3 bg-white rounded-full mx-auto shadow-sm" />
                </div>
              </div>
            </section>

            {/* Risk Analysis */}
            <section className="bg-surface-container-low rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-foreground font-sans">Risk Analysis</h3>
                <AlertTriangle size={16} className="text-muted-foreground opacity-40" />
              </div>
              <div className="space-y-4">
                {rec.risks.map((risk, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                        <span className="text-sm font-semibold text-foreground font-body">{risk.label}</span>
                      </div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter font-body ${risk.severityClass} ${risk.severityBg}`}>
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed font-body">{risk.desc}</p>
                  </div>
                ))}

                <div className="p-4 rounded-xl bg-white">
                  <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-3">
                    <span className="text-sm font-bold text-foreground font-body">{rec.worstCase.label}</span>
                    <span className="text-xs font-black text-red-500 font-body">{rec.worstCase.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 font-body">{rec.worstCase.desc}</p>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body">Expected Volatility</p>
                    <div className="flex items-end gap-1 h-8">
                      <div className="flex-1 bg-primary/20 h-2 rounded-t-sm" />
                      <div className="flex-1 bg-primary/40 h-4 rounded-t-sm" />
                      <div className="flex-1 bg-primary/60 h-8 rounded-t-sm" />
                      <div className="flex-1 bg-primary/30 h-3 rounded-t-sm" />
                      <div className="flex-1 bg-primary/10 h-1 rounded-t-sm" />
                    </div>
                    <div className="flex justify-between text-[10px] font-medium text-muted-foreground font-body">
                      <span>Current</span>
                      <span>Post-Apply</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Related Signals */}
            <section className="p-6 rounded-2xl border border-border/30 bg-surface-container-low">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 font-body">Related Signals</p>
              <div className="space-y-2">
                {rec.relatedSignals.map((sig, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-all text-left"
                  >
                    {sig.icon === "warning" ? (
                      <AlertTriangle size={16} className="text-orange-500 shrink-0" />
                    ) : (
                      <TrendingUp size={16} className="text-primary shrink-0" />
                    )}
                    <span className="text-sm font-bold text-foreground font-body">{sig.label}</span>
                    <ExternalLink size={12} className="ml-auto text-muted-foreground opacity-40 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
