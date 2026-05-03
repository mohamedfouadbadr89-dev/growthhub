"use client";

import { useState } from "react";
import {
  Sparkles, XCircle, Rocket, Paintbrush, Clock, BarChart2,
  Zap, ArrowRight, TrendingUp, PlusCircle, Eye, RefreshCw,
  Moon, TrendingDown, ChevronsUp, PlusSquare, CheckCircle,
} from "lucide-react";

type Category = "All Strategies" | "Budget Control" | "Scaling" | "Creative Optimization" | "Reporting";

interface StrategyRule {
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  text: string;
}

interface Strategy {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  category: Category;
  rules: StrategyRule[];
}

const STRATEGIES: Strategy[] = [
  {
    id: "s-001",
    icon: XCircle,
    iconBg: "bg-surface-container-high",
    iconColor: "text-primary",
    title: "Stop Loss",
    desc: "Automatically pause ad sets when they exceed your target CPA after a specific spend threshold.",
    category: "Budget Control",
    rules: [
      { Icon: Zap,        text: "Spend > $50 & CPA > $12" },
      { Icon: ArrowRight, text: "Pause Ad Set & Notify Team" },
    ],
  },
  {
    id: "s-002",
    icon: Rocket,
    iconBg: "bg-secondary-container",
    iconColor: "text-primary",
    title: "Scaling Rocket",
    desc: "Increase budget by 20% every 48 hours for campaigns that maintain a ROAS above 3.5x.",
    category: "Scaling",
    rules: [
      { Icon: TrendingUp, text: "ROAS > 3.5x for 2 days" },
      { Icon: PlusCircle, text: "Budget +20% (Max $500/day)" },
    ],
  },
  {
    id: "s-003",
    icon: Paintbrush,
    iconBg: "bg-surface-container-high",
    iconColor: "text-muted-foreground",
    title: "Creative Refresher",
    desc: "Detect frequency fatigue and rotate in high-performing reserve assets automatically.",
    category: "Creative Optimization",
    rules: [
      { Icon: Eye,       text: "Frequency > 3.5 (7 Days)" },
      { Icon: RefreshCw, text: "Rotate Creative Assets" },
    ],
  },
  {
    id: "s-004",
    icon: Clock,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Night Watchman",
    desc: "Lower bids during low-converting hours (12 AM – 5 AM) and restore during peak hours.",
    category: "Budget Control",
    rules: [
      { Icon: Moon,         text: "Time is 12:00 AM" },
      { Icon: TrendingDown, text: "Reduce Bids by 35%" },
    ],
  },
  {
    id: "s-005",
    icon: BarChart2,
    iconBg: "bg-surface-container-high",
    iconColor: "text-foreground",
    title: "Trend Rider",
    desc: "Boost spend on assets that show a 50% week-over-week improvement in CTR.",
    category: "Scaling",
    rules: [
      { Icon: BarChart2, text: "CTR Δ > +50% WoW" },
      { Icon: ChevronsUp, text: "Increase Daily Budget $100" },
    ],
  },
];

const CATEGORIES: Category[] = [
  "All Strategies",
  "Budget Control",
  "Scaling",
  "Creative Optimization",
  "Reporting",
];

export default function StrategiesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All Strategies");
  const [activating, setActivating] = useState<Record<string, boolean>>({});
  const [activated, setActivated] = useState<Record<string, boolean>>({});

  function handleUse(id: string) {
    setActivating((s) => ({ ...s, [id]: true }));
    setTimeout(() => {
      setActivating((s) => ({ ...s, [id]: false }));
      setActivated((s) => ({ ...s, [id]: true }));
    }, 1100);
  }

  const filtered = STRATEGIES.filter(
    (s) => activeCategory === "All Strategies" || s.category === activeCategory
  );

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-2">
          Strategies
        </h1>
        <p className="text-muted-foreground text-lg font-body">Deploy proven growth playbooks instantly</p>
      </div>

      {/* AI Recommendation Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#2563eb] text-white shadow-2xl shadow-primary/20 p-8 md:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest mb-5 font-body">
              <Sparkles size={12} />
              Recommended for you
            </div>
            <h2 className="text-3xl font-bold font-sans mb-3">
              Activate "Stop Loss" on TikTok campaigns
            </h2>
            <p className="text-white/70 text-lg leading-relaxed max-w-2xl font-body">
              Based on last week's spend patterns, this strategy can save you roughly{" "}
              <span className="text-white font-bold">$450/day</span> by pausing underperforming creative clusters automatically.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button className="bg-white text-primary px-8 py-3 rounded-xl font-bold hover:bg-surface-container-low transition-all active:scale-95 font-body">
                Activate Now
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold backdrop-blur-md transition-all font-body">
                Review Details
              </button>
            </div>
          </div>

          <div className="hidden lg:flex w-48 h-48 shrink-0 items-center justify-center">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute inset-4 rounded-full bg-white/10 blur-xl" />
              <div className="absolute inset-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={48} className="text-white/60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all font-body ${
              activeCategory === cat
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Strategy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="bg-surface-container-low rounded-2xl p-8 flex flex-col hover:bg-surface-container-high transition-all group border border-transparent hover:border-border"
          >
            <div className={`w-12 h-12 ${s.iconBg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <s.icon size={22} className={s.iconColor} strokeWidth={1.5} />
            </div>

            <h3 className="text-xl font-bold text-foreground font-sans mb-2">{s.title}</h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed font-body">{s.desc}</p>

            <div className="space-y-3 mb-8">
              {s.rules.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl">
                  <r.Icon size={14} className="text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <span className="text-xs font-semibold text-foreground font-body">{r.text}</span>
                </div>
              ))}
            </div>

            {activated[s.id] ? (
              <button
                className="mt-auto w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold font-body"
                disabled
              >
                <CheckCircle size={15} />
                Activated
              </button>
            ) : (
              <button
                onClick={() => handleUse(s.id)}
                disabled={activating[s.id]}
                className="mt-auto w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all font-body"
              >
                {activating[s.id] ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : null}
                {activating[s.id] ? "Activating…" : "Use Strategy"}
              </button>
            )}
          </div>
        ))}

        {/* Custom Strategy */}
        {(activeCategory === "All Strategies" || filtered.length === 0) && (
          <button className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-surface-container-low hover:border-primary/30 transition-all">
            <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              <PlusSquare size={28} className="text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-muted-foreground font-sans mb-2">Custom Strategy</h3>
            <p className="text-muted-foreground text-sm max-w-[200px] font-body">
              Can't find what you need? Build a bespoke growth playbook from scratch.
            </p>
          </button>
        )}

        {/* Empty state for filtered categories with no results */}
        {activeCategory !== "All Strategies" && filtered.length === 0 && (
          <div className="col-span-full bg-surface-container-low rounded-2xl p-12 text-center">
            <p className="text-muted-foreground font-body">No strategies found for this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
