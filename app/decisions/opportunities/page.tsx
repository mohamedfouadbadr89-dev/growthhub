"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp, PauseCircle, Share2, BarChart2, Wallet,
  BadgeCheck, Sparkles, CheckCircle2, Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuickWin {
  id: string;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  uplift: string;
  confidence: string;
  title: string;
  desc: string;
}

interface Experiment {
  id: string;
  tag: string;
  roi: string;
  title: string;
  desc: string;
  effort: string;
  confidence: string;
  executeLabel: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const QUICK_WINS: QuickWin[] = [
  {
    id: "qw-001",
    Icon: TrendingUp,
    iconBg: "bg-primary/5",
    iconColor: "text-primary",
    uplift: "+18% Uplift",
    confidence: "92% Confidence",
    title: "Scale High-Performing Ad Sets",
    desc: "Three ad sets in your 'Prospecting' campaign are hitting CPA targets consistently. AI suggests a 20% budget increase.",
  },
  {
    id: "qw-002",
    Icon: PauseCircle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
    uplift: "+12% ROAS",
    confidence: "88% Confidence",
    title: "Pause Underperforming Creatives",
    desc: "Five creatives have significantly higher CPMs than account average with zero conversions in 48h.",
  },
];

const REASONING_ITEMS = [
  {
    Icon: Share2,
    title: "Audience Saturation",
    desc: "Frequency has increased by 1.4x over the last 7 days.",
  },
  {
    Icon: BarChart2,
    title: "Predictive Match",
    desc: "Lookalike seed signal strength is 9.4/10 based on LTV.",
  },
  {
    Icon: Wallet,
    title: "Efficiency Score",
    desc: "Projected CPA: $24.50 (current account CPA: $26.10)",
  },
];

const EXPERIMENTS: Experiment[] = [
  {
    id: "exp-001",
    tag: "NEW CHANNEL",
    roi: "+34% ROI Potential",
    title: "TikTok Catalog Ads",
    desc: "Leverage TikTok's new dynamic product ads for your Shopify collection.",
    effort: "Medium",
    confidence: "64%",
    executeLabel: "Execute Setup",
  },
  {
    id: "exp-002",
    tag: "RETENTION",
    roi: "+15% Revenue",
    title: "Post-Purchase Upsell",
    desc: "Automate retargeting for customers who purchased within 24h with a cross-sell offer.",
    effort: "Low",
    confidence: "81%",
    executeLabel: "Execute Logic",
  },
  {
    id: "exp-003",
    tag: "OPTIMIZATION",
    roi: "+21% Scale",
    title: "Bid Caps Experiment",
    desc: "Testing cost controls on your scaling campaign to protect margin during peak hours.",
    effort: "High",
    confidence: "77%",
    executeLabel: "Execute Experiment",
  },
];

const PLATFORM_MIX = [
  { label: "Meta Ads",   pct: 45, bar: "bg-blue-600"  },
  { label: "Google Ads", pct: 30, bar: "bg-primary"   },
  { label: "TikTok Ads", pct: 25, bar: "bg-slate-800" },
];

// ── Shared Execute Button ─────────────────────────────────────────────────────

function ExecBtn({
  id, label, executing, executed, onExecute,
  style = "pill-primary",
}: {
  id: string;
  label: string;
  executing: Record<string, boolean>;
  executed: Record<string, boolean>;
  onExecute: (id: string) => void;
  style?: "pill-primary" | "pill-white" | "full-primary";
}) {
  const isExec = executing[id];
  const isDone = executed[id];

  const base =
    style === "full-primary"
      ? "w-full py-2 text-sm font-bold rounded-full"
      : "px-6 py-3 font-bold rounded-full text-sm";

  if (isDone) {
    return (
      <button disabled className={`${base} bg-emerald-500 text-white flex items-center justify-center gap-2 opacity-80 cursor-default font-body`}>
        <CheckCircle2 size={14} /> Applied
      </button>
    );
  }

  const colors =
    style === "pill-white"
      ? "bg-white text-primary shadow-xl hover:scale-105 active:scale-95"
      : "bg-primary text-white hover:opacity-90 active:scale-95";

  return (
    <button
      onClick={() => onExecute(id)}
      disabled={isExec}
      className={`${base} ${colors} flex items-center justify-center gap-2 transition-all disabled:opacity-60 font-body`}
    >
      {isExec ? <><Loader2 size={14} className="animate-spin" /> Executing…</> : label}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const [executing, setExecuting] = useState<Record<string, boolean>>({});
  const [executed,  setExecuted]  = useState<Record<string, boolean>>({});

  function handleExecute(id: string) {
    setExecuting((s) => ({ ...s, [id]: true }));
    setTimeout(() => {
      setExecuting((s) => ({ ...s, [id]: false }));
      setExecuted((s)  => ({ ...s, [id]: true  }));
    }, 1200);
  }

  return (
    <div className="flex gap-8 pb-12">

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-12">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
              AI Intelligence
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">
              Growth Opportunities
            </h2>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full border border-border">
            <span className="text-sm font-medium text-muted-foreground font-body">
              Filters: Impact, Effort, Platform
            </span>
          </div>
        </div>

        {/* ── Quick Wins ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2 font-sans">
              <span className="w-2 h-6 bg-primary rounded-full" />
              Quick Wins
            </h3>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full font-body">
              Low Effort
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {QUICK_WINS.map((win) => (
              <div
                key={win.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow group flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`${win.iconBg} p-3 rounded-xl group-hover:bg-primary transition-colors`}>
                    <win.Icon size={22} className={`${win.iconColor} group-hover:text-white transition-colors`} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-primary font-bold text-lg font-sans">{win.uplift}</span>
                    <span className="text-xs text-muted-foreground font-medium font-body">{win.confidence}</span>
                  </div>
                </div>
                <h4 className="text-base font-bold text-foreground mb-2 font-sans">{win.title}</h4>
                <p className="text-sm text-muted-foreground mb-6 line-clamp-2 font-body flex-1">{win.desc}</p>
                <div className="flex items-center justify-between mt-auto">
                  <Link href="/decisions" className="text-primary text-sm font-bold hover:underline font-body">
                    View Details
                  </Link>
                  <ExecBtn id={win.id} label="Execute" executing={executing} executed={executed} onExecute={handleExecute} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── High Impact Plays ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2 font-sans">
              <span className="w-2 h-6 bg-amber-600 rounded-full" />
              High Impact Plays
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Featured bento card */}
            <div className="col-span-3 lg:col-span-2 relative overflow-hidden bg-primary rounded-xl p-8 text-white shadow-lg group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform pointer-events-none" />
              <div className="relative z-10 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-body">
                    Recommended Strategy
                  </span>
                  <BadgeCheck size={16} className="opacity-80" />
                </div>
                <h4 className="text-3xl font-extrabold mb-4 leading-tight font-sans">
                  Expand Lookalike Audiences to 3–5% Tier
                </h4>
                <p className="text-white/80 mb-8 max-w-md font-body">
                  Our predictive model shows your current 1% LAL is reaching saturation. Expanding to the 3–5% tier is projected to drive substantial scale without compromising quality.
                </p>
                <div className="flex items-center gap-10">
                  <div>
                    <span className="block text-4xl font-black font-sans">+24.5%</span>
                    <span className="text-xs font-medium uppercase opacity-60 font-body">Projected Growth</span>
                  </div>
                  <div className="h-12 w-px bg-white/20" />
                  <div>
                    <span className="block text-4xl font-black font-sans">96%</span>
                    <span className="text-xs font-medium uppercase opacity-60 font-body">Confidence Score</span>
                  </div>
                </div>
                <div className="mt-10 flex gap-4 flex-wrap">
                  <ExecBtn
                    id="high-001"
                    label="Execute Campaign"
                    executing={executing}
                    executed={executed}
                    onExecute={handleExecute}
                    style="pill-white"
                  />
                  <button className="bg-white/10 backdrop-blur-md text-white px-8 py-3 rounded-full font-bold hover:bg-white/20 transition-colors font-body">
                    Technical Analysis
                  </button>
                </div>
              </div>
            </div>

            {/* Reasoning engine */}
            <div className="col-span-3 lg:col-span-1 bg-surface-container-low rounded-xl p-6 flex flex-col border border-border">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-4 font-body">
                Reasoning Engine
              </span>
              <div className="space-y-4">
                {REASONING_ITEMS.map((item) => (
                  <div key={item.title} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm">
                    <item.Icon size={20} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground font-sans">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground font-body mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Experimental Ideas ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2 font-sans">
              <span className="w-2 h-6 bg-muted-foreground/40 rounded-full" />
              Experimental Ideas
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXPERIMENTS.map((exp) => (
              <div
                key={exp.id}
                className="bg-white p-6 rounded-xl border border-border hover:border-primary/40 transition-colors shadow-sm flex flex-col"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold px-2 py-1 bg-surface-container-low rounded text-muted-foreground font-body">
                    {exp.tag}
                  </span>
                  <span className="text-xs font-bold text-primary font-body">{exp.roi}</span>
                </div>
                <h4 className="font-bold mb-2 text-foreground font-sans">{exp.title}</h4>
                <p className="text-sm text-muted-foreground mb-4 flex-1 font-body">{exp.desc}</p>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs bg-surface-container-low text-muted-foreground px-2 py-1 rounded font-body">
                    Effort: {exp.effort}
                  </span>
                  <span className="text-xs bg-surface-container-low text-muted-foreground px-2 py-1 rounded font-body">
                    Confidence: {exp.confidence}
                  </span>
                </div>
                <ExecBtn
                  id={exp.id}
                  label={exp.executeLabel}
                  executing={executing}
                  executed={executed}
                  onExecute={handleExecute}
                  style="full-primary"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Right Side Panel ──────────────────────────────────────────────── */}
      <aside className="w-80 shrink-0 space-y-8 sticky top-24 self-start">

        {/* Strategic Mapping */}
        <div>
          <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4 font-body">
            Strategic Mapping
          </h5>
          <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
            <p className="text-[11px] font-bold text-foreground mb-3 font-sans">Effort vs. Impact Matrix</p>
            <div className="relative w-full aspect-square border-l-2 border-b-2 border-slate-300">
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 text-[8px] font-bold uppercase tracking-tighter opacity-40 p-2">
                <div className="flex items-start justify-start font-body">Big Bets</div>
                <div className="flex items-start justify-end text-right font-body">Quick Wins</div>
                <div className="flex items-end justify-start font-body">Thankless</div>
                <div className="flex items-end justify-end text-right font-body">Fillers</div>
              </div>
              <div className="absolute -left-5 top-1/2 -rotate-90 text-[8px] font-bold uppercase tracking-widest text-slate-400 font-body">Impact</div>
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-widest text-slate-400 font-body">Effort</div>
              <div className="absolute w-2 h-2 bg-primary rounded-full top-[20%] right-[15%] shadow-lg ring-2 ring-white" />
              <div className="absolute w-2 h-2 bg-primary rounded-full top-[30%] right-[25%] shadow-lg ring-2 ring-white" />
              <div className="absolute w-2.5 h-2.5 bg-amber-600 rounded-full top-[15%] left-[20%] shadow-lg ring-2 ring-white" />
              <div className="absolute w-1.5 h-1.5 bg-slate-400 rounded-full bottom-[20%] right-[30%] ring-2 ring-white" />
              <div className="absolute w-1.5 h-1.5 bg-slate-400 rounded-full bottom-[15%] left-[40%] ring-2 ring-white" />
            </div>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div>
          <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4 font-body">
            Portfolio Summary
          </h5>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-border">
            <p className="text-[10px] text-muted-foreground mb-1 font-medium font-body">Total Upside Potential</p>
            <h3 className="text-3xl font-black text-primary tracking-tighter font-sans">$42,850.00</h3>
            <p className="text-[10px] font-bold text-amber-700 mt-2 flex items-center gap-1 font-body">
              <TrendingUp size={12} /> Monthly Est. Revenue
            </p>
          </div>
        </div>

        {/* Opportunity Coverage donut */}
        <div>
          <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4 font-body">
            Opportunity Coverage
          </h5>
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8"
                  className="text-surface-container-high" />
                <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8"
                  strokeDasharray="364.4" strokeDashoffset="102" className="text-primary" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-foreground font-sans">72%</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold font-body">Optimised</span>
              </div>
            </div>
            <p className="text-[11px] text-center text-muted-foreground mt-4 leading-relaxed font-body">
              You have 12 pending actions across 4 platforms that could increase efficiency by 18%.
            </p>
          </div>
        </div>

        {/* Platform Mix */}
        <div>
          <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4 font-body">
            Platform Mix
          </h5>
          <div className="space-y-4">
            {PLATFORM_MIX.map((p) => (
              <div key={p.label} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold font-body">
                  <span className="text-foreground">{p.label}</span>
                  <span className="text-foreground">{p.pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className={`h-full ${p.bar} rounded-full`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Tip */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/60">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-amber-700" />
            <span className="text-[10px] font-bold text-amber-700 uppercase font-body">AI Tip</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-normal font-body">
            Weekend conversion rates are 14% higher. Consider front-loading budgets on Fridays.
          </p>
        </div>

      </aside>
    </div>
  );
}
