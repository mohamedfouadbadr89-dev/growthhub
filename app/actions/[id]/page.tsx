"use client";

import { useState } from "react";
import { ArrowLeft, Zap, PlusCircle, DollarSign, TrendingUp, Play, Calendar, RefreshCw, ShieldCheck, CheckCircle } from "lucide-react";
import Link from "next/link";

type ExecMode = "run_now" | "schedule" | "continuous";
type ScopeTab = "campaigns" | "adsets" | "keywords";

interface Condition {
  code: string;
  tag: string;
  tagClass: string;
}

interface PlatformTarget {
  label: string;
  dot: string;
  entities: number;
  selected: boolean;
}

interface ExecStep {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  badge: string;
  badgeClass: string;
  desc: string;
  pills: string[];
}

interface ScopeItem {
  name: string;
  roas: string;
}

const MOCK_ACTION = {
  title: "Scale ROAS Outliers",
  status: "Active",
  conditions: [
    { code: "ROAS > account_avg × dynamic_multiplier", tag: "METRIC", tagClass: "bg-blue-100 text-blue-700" },
    { code: "Spend > adaptive_threshold",              tag: "BUDGET", tagClass: "bg-blue-100 text-blue-700" },
  ] as Condition[],
  platforms: [
    { label: "Meta Ads",    dot: "#1877F2", entities: 142, selected: true  },
    { label: "Google Ads",  dot: "#4285F4", entities: 86,  selected: false },
    { label: "TikTok Ads",  dot: "#FE2C55", entities: 54,  selected: false },
    { label: "Snapchat",    dot: "#FFFC00", entities: 12,  selected: false },
  ] as PlatformTarget[],
  scopeItems: {
    campaigns: [
      { name: "Summer_Scale_2024",   roas: "8.4x ROAS" },
      { name: "Retargeting_LTV_High",roas: "6.2x ROAS" },
      { name: "Lookalike_1pct_US",   roas: "5.7x ROAS" },
      { name: "PMax_Brand_Core",     roas: "4.9x ROAS" },
    ] as ScopeItem[],
    adsets: [
      { name: "US_High_Intent_18-34",  roas: "9.1x ROAS" },
      { name: "UK_Retargeting_30d",    roas: "7.4x ROAS" },
      { name: "AU_Lookalike_2pct",     roas: "6.8x ROAS" },
    ] as ScopeItem[],
    keywords: [
      { name: "buy running shoes online", roas: "11.2x ROAS" },
      { name: "best athletic gear",       roas: "8.6x ROAS" },
    ] as ScopeItem[],
  },
  simulation: {
    revenueUplift: "+$12.4k",
    costImpact:    "+$2.4k",
    roi:           "416%",
    confidence:    "94%",
  },
  riskLevel: 22,
  riskDesc: "Learning phase reset risk if budget increases too aggressively (>30%). High probability of temporary volatility during re-optimization window.",
  execSteps: [
    {
      icon: <DollarSign size={20} className="text-blue-600" />,
      iconBg: "bg-blue-100",
      title: "Meta Scaling Module",
      badge: "AUTO-PILOT",
      badgeClass: "bg-orange-100 text-orange-700",
      desc: "Increment daily budget by 20% every 48 hours until cap is reached.",
      pills: ["+20% Increment", "48h Window", "Cap: $5,000"],
    },
    {
      icon: <TrendingUp size={20} className="text-emerald-600" />,
      iconBg: "bg-emerald-100",
      title: "Google Bid Adjustments",
      badge: "SYSTEM",
      badgeClass: "bg-surface-container-high text-muted-foreground",
      desc: "Modify ROAS targets by +15% to capture higher value auctions.",
      pills: ["+15% Target Shift", "Auction Depth: High"],
    },
  ] as ExecStep[],
};

export default function ActionDetailPage() {
  const [execMode, setExecMode] = useState<ExecMode>("run_now");
  const [scopeTab, setScopeTab] = useState<ScopeTab>("campaigns");
  const [platforms, setPlatforms] = useState<PlatformTarget[]>(MOCK_ACTION.platforms);
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [stopLoss, setStopLoss] = useState(15);

  function togglePlatform(idx: number) {
    setPlatforms((prev) => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  }

  function handleRun() {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setRan(true);
    }, 1400);
  }

  const SCOPE_TABS: { key: ScopeTab; label: string; count: number }[] = [
    { key: "campaigns", label: "Campaigns", count: MOCK_ACTION.scopeItems.campaigns.length },
    { key: "adsets",    label: "Ad Sets",   count: MOCK_ACTION.scopeItems.adsets.length },
    { key: "keywords",  label: "Keywords",  count: MOCK_ACTION.scopeItems.keywords.length },
  ];

  const currentScope = MOCK_ACTION.scopeItems[scopeTab];

  const EXEC_MODES: { key: ExecMode; icon: React.ReactNode; label: string }[] = [
    { key: "run_now",    icon: <Play size={16} className="text-primary" />,              label: "Run Now"     },
    { key: "schedule",   icon: <Calendar size={16} className="text-muted-foreground" />, label: "Schedule"    },
    { key: "continuous", icon: <RefreshCw size={16} className="text-muted-foreground" />,label: "Continuous"  },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Back + Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/actions" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm">
            <ArrowLeft size={16} />
            Back to Actions
          </Link>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground font-sans">{MOCK_ACTION.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wider uppercase font-body">
              {MOCK_ACTION.status}
            </span>
          </div>
        </div>
        {ran ? (
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm font-body" disabled>
            <CheckCircle size={15} />
            Executed
          </button>
        ) : (
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all font-body"
          >
            {running ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {running ? "Running…" : "Run Now"}
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col */}
        <div className="lg:col-span-8 space-y-8">
          {/* Trigger Logic */}
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2 font-sans">
                <Zap size={16} className="text-primary" />
                Trigger Logic
              </h2>
              <button className="text-primary text-sm font-semibold flex items-center gap-1 font-body hover:underline">
                <PlusCircle size={14} />
                Add Condition
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {MOCK_ACTION.conditions.map((cond, i) => (
                <>
                  <div key={cond.code} className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between border-l-4 border-primary">
                    <code className="text-sm font-mono text-muted-foreground">{cond.code}</code>
                    <span className={`px-3 py-1 text-[10px] font-black tracking-widest rounded-full font-body ${cond.tagClass}`}>
                      {cond.tag}
                    </span>
                  </div>
                  {i < MOCK_ACTION.conditions.length - 1 && (
                    <div className="flex justify-center">
                      <span className="bg-surface-container-high px-3 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground font-body">
                        AND
                      </span>
                    </div>
                  )}
                </>
              ))}
            </div>
          </section>

          {/* Platform + Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Targeting */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-foreground mb-5 font-sans">Platform Targeting</h2>
              <div className="grid grid-cols-2 gap-3">
                {platforms.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => togglePlatform(i)}
                    className={`relative p-4 rounded-xl flex flex-col gap-2 text-left transition-all border-2 ${
                      p.selected
                        ? "border-primary/30 bg-primary/5"
                        : "border-transparent bg-surface-container-low hover:bg-surface-container-high"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.dot }} />
                      <span className="text-xs font-bold text-foreground font-body">{p.label}</span>
                    </div>
                    <div className="text-2xl font-black text-foreground font-sans">
                      {p.entities}
                      <span className="text-xs font-medium text-muted-foreground ml-1">entities</span>
                    </div>
                    {p.selected && (
                      <CheckCircle size={14} className="absolute top-3 right-3 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Execution Scope */}
            <section className="bg-white rounded-2xl p-6 shadow-sm flex flex-col">
              <h2 className="text-base font-bold text-foreground mb-5 font-sans">Execution Scope</h2>
              <div className="bg-surface-container-low p-1 rounded-xl flex gap-1 mb-5">
                {SCOPE_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setScopeTab(t.key)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all font-body ${
                      scopeTab === t.key
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label} ({t.count})
                  </button>
                ))}
              </div>
              <div className="space-y-2 flex-1">
                {currentScope.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground font-body truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 font-body shrink-0 ml-2">{item.roas}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Execution Logic */}
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-5 font-sans">Execution Logic</h2>
            <div className="space-y-4">
              {MOCK_ACTION.execSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-5 p-4 rounded-xl bg-surface-container-low hover:border-primary/10 border border-transparent transition-colors">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${step.iconBg}`}>
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <h3 className="text-sm font-bold text-foreground font-sans">{step.title}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-full whitespace-nowrap font-body ${step.badgeClass}`}>
                        {step.badge}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 font-body">{step.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {step.pills.map((pill) => (
                        <span key={pill} className="px-3 py-1 bg-white rounded-full text-[10px] font-bold text-muted-foreground shadow-sm font-body">
                          {pill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Col */}
        <div className="lg:col-span-4 space-y-6">
          {/* Impact Simulation */}
          <section className="bg-foreground rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-base font-bold mb-5 flex items-center gap-2 font-sans">
                <TrendingUp size={16} className="text-blue-300" />
                Impact Simulation
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Revenue Uplift", value: MOCK_ACTION.simulation.revenueUplift, valueClass: "text-emerald-400" },
                  { label: "Cost Impact",    value: MOCK_ACTION.simulation.costImpact,    valueClass: "text-blue-300"   },
                  { label: "ROI Projection", value: MOCK_ACTION.simulation.roi,           valueClass: "text-white"      },
                  { label: "Confidence",     value: MOCK_ACTION.simulation.confidence,    valueClass: "text-blue-200"   },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1 font-body">{stat.label}</p>
                    <p className={`text-xl font-black font-sans ${stat.valueClass}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Risk Analysis */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-red-400">
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2 font-sans">
              <ShieldCheck size={16} className="text-red-500" />
              Risk Analysis
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-body">
              <span className="font-bold text-foreground">Causal Explanation:</span>{" "}
              {MOCK_ACTION.riskDesc}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full" style={{ width: `${MOCK_ACTION.riskLevel}%` }} />
              </div>
              <span className="text-[10px] font-bold text-red-500 whitespace-nowrap font-body">{MOCK_ACTION.riskLevel}% RISK</span>
            </div>
          </section>

          {/* Execution Mode */}
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-5 font-sans">Execution Mode</h2>
            <div className="space-y-2">
              {EXEC_MODES.map((mode) => (
                <label
                  key={mode.key}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    execMode === mode.key
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-surface-container-low hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {mode.icon}
                    <span className={`text-sm font-bold font-body ${execMode === mode.key ? "text-foreground" : "text-muted-foreground"}`}>
                      {mode.label}
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="exec-mode"
                    checked={execMode === mode.key}
                    onChange={() => setExecMode(mode.key)}
                    className="text-primary h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Full-width Safeguards */}
        <div className="lg:col-span-12">
          <section className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-8 flex items-center gap-2 font-sans">
              <ShieldCheck size={20} className="text-primary" />
              Algorithmic Safeguards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Stop-loss */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground font-body">Stop-loss Protection</label>
                  <span className="text-xs font-mono font-bold text-primary">-{stopLoss}% ROAS</span>
                </div>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">
                  Automatic pause if ROAS drops below historical baseline during scaling.
                </p>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="w-full h-1.5 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Auto Rollback */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground font-body">Auto Rollback</label>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full font-body">ENABLED</span>
                </div>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">
                  Reverts to previous stable budget if KPIs don't normalize within 72h.
                </p>
                <button className="py-2 bg-white border border-border rounded-xl text-xs font-bold shadow-sm hover:bg-surface-container-low transition-colors font-body">
                  Configure Sensitivity
                </button>
              </div>

              {/* Volatility Control */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground font-body">Volatility Control</label>
                  <span className="text-xs font-mono font-bold text-primary">STRICT</span>
                </div>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">
                  Filters out hourly data noise to prevent impulsive budget triggers.
                </p>
                <div className="bg-surface-container-low p-3 rounded-xl flex items-center justify-around">
                  <span className="text-[10px] font-bold text-muted-foreground font-body">Loose</span>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-surface-container-high" />
                    <div className="w-3 h-3 rounded-full bg-surface-container-high" />
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                  <span className="text-[10px] font-bold text-foreground font-body">Aggressive</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
