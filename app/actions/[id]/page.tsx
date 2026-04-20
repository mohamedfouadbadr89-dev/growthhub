"use client";

import { useState } from "react";
import { Zap, PlusCircle, MousePointerClick, CreditCard, TrendingUp, BarChart2, AlertTriangle, PlayCircle, Clock, RefreshCw, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";

const PLATFORMS = [
  { name: "Meta Ads",    dot: "bg-[#1877F2]", count: 142, active: true },
  { name: "Google Ads",  dot: "bg-[#4285F4]", count: 86,  active: false },
  { name: "TikTok Ads",  dot: "bg-[#FE2C55]", count: 54,  active: false },
  { name: "Snapchat",    dot: "bg-[#FFFC00]", count: 12,  active: false },
];

const CAMPAIGNS = [
  { name: "Summer_Scale_2024",     roas: "8.4x ROAS" },
  { name: "Retargeting_LTV_High",  roas: "6.2x ROAS" },
];

const IMPACT = [
  { label: "Revenue Uplift", value: "+$12.4k", color: "text-emerald-400" },
  { label: "Cost Impact",    value: "+$2.4k",  color: "text-blue-400" },
  { label: "ROI Projection", value: "416%",    color: "text-white" },
  { label: "Confidence",     value: "94%",     color: "text-[#dbe1ff]" },
];

const EXEC_MODES = [
  { label: "Run Now",    Icon: PlayCircle, value: "run" },
  { label: "Schedule",   Icon: Clock,      value: "schedule" },
  { label: "Continuous", Icon: RefreshCw,  value: "continuous" },
];

export default function ActionDetailPage() {
  const [execMode, setExecMode] = useState("run");

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Actions</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground font-sans">
              Scale ROAS Outliers
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wider uppercase font-body">
              Active
            </span>
          </div>
        </div>
        <button className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-primary to-[#2563eb] text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity active:scale-95 font-body">
          Run Now
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Trigger Logic */}
          <section className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2 font-sans">
                <Zap size={20} className="text-primary" /> Trigger Logic
              </h2>
              <button className="text-primary text-sm font-semibold hover:underline flex items-center gap-1 font-body">
                <PlusCircle size={16} /> Add Condition
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between border-l-4 border-primary">
                <code className="text-sm font-mono text-muted-foreground">
                  ROAS &gt; account_avg × dynamic_multiplier
                </code>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black tracking-widest rounded-full font-body">
                  METRIC
                </span>
              </div>
              <div className="flex justify-center">
                <div className="bg-surface-container-high px-3 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground font-body">
                  AND
                </div>
              </div>
              <div className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between border-l-4 border-primary">
                <code className="text-sm font-mono text-muted-foreground">
                  Spend &gt; adaptive_threshold
                </code>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black tracking-widest rounded-full font-body">
                  BUDGET
                </span>
              </div>
            </div>
          </section>

          {/* Platform Targeting + Execution Scope */}
          <div className="grid grid-cols-2 gap-8">
            {/* Platform Targeting */}
            <section className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-lg font-bold tracking-tight text-foreground mb-6 font-sans">
                Platform Targeting
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map((p) => (
                  <div
                    key={p.name}
                    className={`p-4 rounded-2xl flex flex-col gap-3 relative cursor-pointer transition-colors ${
                      p.active
                        ? "bg-white border-2 border-primary/20 hover:bg-slate-50"
                        : "bg-surface-container-low/50 border-2 border-transparent hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                      <span className="text-xs font-bold tracking-tight font-body">{p.name}</span>
                    </div>
                    <div className="text-2xl font-black text-foreground font-sans">
                      {p.count}
                      <span className="text-xs font-medium text-muted-foreground ml-1">entities</span>
                    </div>
                    {p.active && (
                      <CheckCircle2 size={16} className="absolute top-4 right-4 text-primary fill-primary" />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Execution Scope */}
            <section className="bg-white rounded-3xl p-6 shadow-sm flex flex-col">
              <h2 className="text-lg font-bold tracking-tight text-foreground mb-6 font-sans">
                Execution Scope
              </h2>
              <div className="bg-surface-container-low p-1.5 rounded-2xl flex items-center gap-1 mb-6">
                {["Campaigns (4)", "Ad Sets (18)", "Keywords"].map((tab, i) => (
                  <button
                    key={tab}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors font-body ${
                      i === 0 ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-white/50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {CAMPAIGNS.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MousePointerClick size={18} className="text-muted-foreground/40" />
                      <span className="text-sm font-medium font-body">{c.name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 font-body">{c.roas}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Execution Logic */}
          <section className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-6 font-sans">
              Execution Logic
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-6 p-4 rounded-2xl bg-surface-container-low border border-transparent hover:border-primary/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <CreditCard size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-foreground font-body">Meta Scaling Module</h3>
                    <span className="px-2 py-0.5 bg-[#bc4800]/10 text-[#bc4800] text-[10px] font-black rounded-full font-body">
                      AUTO-PILOT
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 font-body">
                    Increment daily budget by 20% every 48 hours until cap is reached.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {["+20% Increment", "48h Window", "Cap: $5,000"].map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-white rounded-full text-[10px] font-bold text-muted-foreground shadow-sm font-body">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-6 p-4 rounded-2xl bg-surface-container-low border border-transparent hover:border-primary/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-foreground font-body">Google Bid Adjustments</h3>
                    <span className="px-2 py-0.5 bg-surface-container-high text-muted-foreground text-[10px] font-black rounded-full font-body">
                      SYSTEM
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 font-body">
                    Modify ROAS targets by +15% to capture higher value auctions.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {["+15% Target Shift", "Auction Depth: High"].map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-white rounded-full text-[10px] font-bold text-muted-foreground shadow-sm font-body">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Impact Simulation */}
          <section className="bg-foreground rounded-3xl p-6 text-white shadow-xl overflow-hidden relative">
            <div className="absolute -right-8 -top-8 w-48 h-48 bg-primary/20 blur-[80px] rounded-full" />
            <div className="relative z-10">
              <h2 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-2 font-sans">
                <BarChart2 size={20} className="text-[#dbe1ff]" /> Impact Simulation
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {IMPACT.map((item) => (
                  <div key={item.label} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1 font-body">
                      {item.label}
                    </p>
                    <div className={`text-xl font-black font-sans ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Risk Analysis */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border-l-4 border-error">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-4 flex items-center gap-2 font-sans">
              <AlertTriangle size={20} className="text-error" /> Risk Analysis
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-body">
              <span className="font-bold text-foreground">Causal Explanation:</span> Learning phase reset risk if
              budget increases too aggressively (&gt;30%). High probability of temporary volatility during
              re-optimization window.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                <div className="bg-error h-full rounded-full" style={{ width: "22%" }} />
              </div>
              <span className="text-[10px] font-bold text-error whitespace-nowrap font-body">22% RISK</span>
            </div>
          </section>

          {/* Execution Mode */}
          <section className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-6 font-sans">
              Execution Mode
            </h2>
            <div className="space-y-3">
              {EXEC_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    execMode === mode.value
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-surface-container-low hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <mode.Icon
                      size={20}
                      className={execMode === mode.value ? "text-primary" : "text-muted-foreground"}
                    />
                    <span className={`text-sm font-bold font-body ${execMode === mode.value ? "text-foreground" : "text-muted-foreground"}`}>
                      {mode.label}
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="exec-mode"
                    value={mode.value}
                    checked={execMode === mode.value}
                    onChange={() => setExecMode(mode.value)}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Algorithmic Safeguards */}
        <div className="col-span-12">
          <section className="bg-white rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-8">
              <ShieldCheck size={22} className="text-[#2563eb]" />
              <h2 className="text-xl font-bold tracking-tight text-foreground font-sans">
                Algorithmic Safeguards
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Stop-loss */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground font-body">Stop-loss Protection</label>
                  <span className="text-xs font-mono font-bold text-primary">-15% ROAS</span>
                </div>
                <p className="text-xs text-muted-foreground font-body">
                  Automatic pause if ROAS drops below historical baseline during scaling.
                </p>
                <input type="range" className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary" />
              </div>

              {/* Auto Rollback */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground font-body">Auto Rollback</label>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full font-body">
                    ENABLED
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-body">
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
                <p className="text-xs text-muted-foreground font-body">
                  Filters out hourly data noise to prevent impulsive budget triggers.
                </p>
                <div className="bg-surface-container-low p-3 rounded-xl flex items-center justify-around">
                  <span className="text-[10px] font-bold text-muted-foreground font-body">Loose</span>
                  <div className="flex gap-1">
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
