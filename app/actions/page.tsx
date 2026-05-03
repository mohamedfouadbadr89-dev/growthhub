"use client";

import { useState } from "react";
import { Sparkles, CheckCircle, Zap, Activity } from "lucide-react";

type PlatformFilter = "All" | "Meta" | "Google" | "TikTok" | "Snapchat";
type CategoryFilter = "All Categories" | "Budget" | "Creative" | "Bidding" | "Automation";
type RiskFilter = "Risk: Any" | "Low Risk" | "Medium Risk" | "High Risk";

interface ActionCard {
  id: string;
  category: string;
  categoryClass: string;
  platforms: string[];
  platformFilters: PlatformFilter[];
  title: string;
  score: number;
  scoreColor: string;
  scoreOffset: number;
  aiContext: string;
  triggerLogic: string;
  scope: string;
  impact: string;
  executionMode?: string;
  risk?: "Low Risk" | "Medium Risk" | "High Risk";
  riskClass?: string;
}

interface QuickAction {
  id: string;
  title: string;
  impact: string;
  desc: string;
}

const MOCK_ACTIONS: ActionCard[] = [
  {
    id: "act-001",
    category: "Budget",
    categoryClass: "bg-blue-100 text-blue-700",
    platforms: ["Meta", "Google"],
    platformFilters: ["Meta", "Google"],
    title: "Scale ROAS Outliers",
    score: 94,
    scoreColor: "text-blue-500",
    scoreOffset: 8,
    aiContext: "3 ad sets outperforming baseline by +42% in past 72h. High probability of sustained lift if scaled.",
    triggerLogic: "ROAS > account_avg x dynamic_multiplier",
    scope: "4 Campaigns, 12 Ad Sets",
    impact: "+18.4% Revenue",
    executionMode: "Reallocate budget based on marginal contribution",
    risk: "Low Risk",
    riskClass: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "act-002",
    category: "Bidding",
    categoryClass: "bg-purple-100 text-purple-700",
    platforms: ["TikTok", "Snapchat"],
    platformFilters: ["TikTok", "Snapchat"],
    title: "Auto-Optimize Caps",
    score: 78,
    scoreColor: "text-orange-500",
    scoreOffset: 30,
    aiContext: "CPA drift detected on 2 campaigns. Caps are currently 25% too low to capture peak afternoon traffic.",
    triggerLogic: "CPA_limit < hourly_avg_bid + deviation(0.1)",
    scope: "2 Campaigns, 8 Ad Groups",
    impact: "+12.2% Conversion",
    risk: "Medium Risk",
    riskClass: "bg-orange-100 text-orange-700",
  },
  {
    id: "act-003",
    category: "Creative",
    categoryClass: "bg-orange-100 text-orange-700",
    platforms: ["Meta"],
    platformFilters: ["Meta"],
    title: "Prune Fatigue",
    score: 88,
    scoreColor: "text-blue-400",
    scoreOffset: 15,
    aiContext: "Frequency spike of 3.4 in Top-of-Funnel. Creative CTR dropping 15% WoW. Recommend immediate pause.",
    triggerLogic: "Frequency > 3.0 AND CTR_7d < baseline_avg",
    scope: "1 Campaign, 5 Ads",
    impact: "-20% CPM Waste",
    risk: "Low Risk",
    riskClass: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "act-004",
    category: "Automation",
    categoryClass: "bg-emerald-100 text-emerald-700",
    platforms: ["Google"],
    platformFilters: ["Google"],
    title: "Night Mode Bidding",
    score: 82,
    scoreColor: "text-emerald-500",
    scoreOffset: 22,
    aiContext: "Conversion rate drops 40% between 12 AM–5 AM. Reducing bids during this window saves $200+/day.",
    triggerLogic: "hour_of_day BETWEEN 0 AND 5 AND conversion_rate < daily_avg",
    scope: "8 Campaigns",
    impact: "-$200/day Saved",
    risk: "Low Risk",
    riskClass: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "act-005",
    category: "Budget",
    categoryClass: "bg-blue-100 text-blue-700",
    platforms: ["Meta", "TikTok"],
    platformFilters: ["Meta", "TikTok"],
    title: "Cross-Platform Rebalance",
    score: 71,
    scoreColor: "text-blue-400",
    scoreOffset: 37,
    aiContext: "TikTok showing 28% better CPM efficiency this week. Shifting 15% of Meta budget could unlock $4k+ in recovered revenue.",
    triggerLogic: "platform_cpm_ratio > 1.2 AND daily_budget > $500",
    scope: "6 Campaigns",
    impact: "+$4.1k Revenue",
    risk: "Medium Risk",
    riskClass: "bg-orange-100 text-orange-700",
  },
  {
    id: "act-006",
    category: "Bidding",
    categoryClass: "bg-purple-100 text-purple-700",
    platforms: ["Google"],
    platformFilters: ["Google"],
    title: "Smart Bid Floor",
    score: 85,
    scoreColor: "text-purple-500",
    scoreOffset: 19,
    aiContext: "Target ROAS bidding underperforming in 3 search campaigns. Manual CPC floor of $0.80 would capture missed clicks.",
    triggerLogic: "tROAS_performance < target AND impression_share < 0.65",
    scope: "3 Campaigns, 18 Keywords",
    impact: "+9.3% Impressions",
    risk: "Low Risk",
    riskClass: "bg-emerald-100 text-emerald-700",
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "q-001",
    title: "Keyword Harvesting",
    impact: "+4.2% ROAS",
    desc: "Move high-intent search terms from broad to exact match campaigns automatically.",
  },
  {
    id: "q-002",
    title: "Budget Rebalancing",
    impact: "+8.7%",
    desc: "Shift funds from underperforming morning segments to high-conversion evening slots.",
  },
  {
    id: "q-003",
    title: "Bidding Conflict Resolution",
    impact: "+11.4%",
    desc: "Identify and resolve internal auction competition between 12 overlapping ad sets.",
  },
];

const PLATFORMS: PlatformFilter[] = ["All", "Meta", "Google", "TikTok", "Snapchat"];
const CATEGORIES: CategoryFilter[] = ["All Categories", "Budget", "Creative", "Bidding", "Automation"];
const RISKS: RiskFilter[] = ["Risk: Any", "Low Risk", "Medium Risk", "High Risk"];

export default function ActionsPage() {
  const [platform, setPlatform] = useState<PlatformFilter>("All");
  const [category, setCategory] = useState<CategoryFilter>("All Categories");
  const [risk, setRisk] = useState<RiskFilter>("Risk: Any");
  const [deploying, setDeploying] = useState<Record<string, boolean>>({});
  const [deployed, setDeployed] = useState<Record<string, boolean>>({});
  const [quickDeploying, setQuickDeploying] = useState<Record<string, boolean>>({});
  const [quickDeployed, setQuickDeployed] = useState<Record<string, boolean>>({});

  function handleDeploy(id: string) {
    setDeploying((s) => ({ ...s, [id]: true }));
    setTimeout(() => {
      setDeploying((s) => ({ ...s, [id]: false }));
      setDeployed((s) => ({ ...s, [id]: true }));
    }, 1200);
  }

  function handleQuickDeploy(id: string) {
    setQuickDeploying((s) => ({ ...s, [id]: true }));
    setTimeout(() => {
      setQuickDeploying((s) => ({ ...s, [id]: false }));
      setQuickDeployed((s) => ({ ...s, [id]: true }));
    }, 1200);
  }

  const filtered = MOCK_ACTIONS.filter((a) => {
    if (platform !== "All" && !a.platformFilters.includes(platform)) return false;
    if (category !== "All Categories" && a.category !== category) return false;
    if (risk !== "Risk: Any" && a.risk !== risk) return false;
    return true;
  });

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
          Actions Library
        </h1>
        <p className="text-muted-foreground font-body">Real-time AI opportunity engine across all ad platforms</p>
      </div>

      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-primary p-8 md:p-10 text-white shadow-xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-blue-400 to-transparent" />
          <div className="grid grid-cols-6 grid-rows-3 gap-2 p-8 h-full">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="bg-white/30 rounded-lg" style={{ opacity: Math.random() * 0.6 + 0.1 }} />
            ))}
          </div>
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider border border-white/20 mb-4 font-body">
            System Intelligence
          </span>
          <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight font-sans">
            AI Recommendation Engine
          </h2>
          <p className="text-blue-50 text-base md:text-lg font-medium mb-8 font-body">
            The engine has processed 1.2M data points in the last 60 minutes.{" "}
            <span className="font-bold underline decoration-blue-300">42 high-impact actions</span>{" "}
            have been identified for your active accounts.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-white text-primary px-8 py-3 rounded-xl font-extrabold text-sm hover:bg-blue-50 transition-colors shadow-lg active:scale-95 font-body">
              Review All Recommendations
            </button>
            <button className="text-white border border-white/30 px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors font-body">
              View Efficiency Map
            </button>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-border/40 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Platform pill group */}
          <div className="flex bg-surface-container-high p-1 rounded-xl gap-0.5">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all font-body ${
                  platform === p
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border" />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryFilter)}
            className="bg-surface-container-low border border-border rounded-xl text-xs font-bold text-foreground py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body cursor-pointer"
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value as RiskFilter)}
            className="bg-surface-container-low border border-border rounded-xl text-xs font-bold text-foreground py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body cursor-pointer"
          >
            {RISKS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground font-body">Sort by:</span>
          <button className="flex items-center gap-2 bg-surface-container-low border border-border px-4 py-2 rounded-xl text-xs font-bold text-foreground font-body">
            Opportunity Score
          </button>
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-3 bg-surface-container-low rounded-2xl p-12 text-center">
            <p className="text-muted-foreground font-body">No actions match the selected filters.</p>
          </div>
        ) : (
          filtered.map((action) => {
            const circumference = 2 * Math.PI * 20;
            return (
              <div
                key={action.id}
                className="bg-white rounded-2xl border border-border/40 shadow-sm hover:shadow-xl hover:shadow-surface-container-high/50 transition-all group flex flex-col"
              >
                <div className="p-6 flex-1">
                  {/* Title row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter font-body ${action.categoryClass}`}>
                          {action.category}
                        </span>
                        {action.platforms.map((p) => (
                          <span key={p} className="bg-surface-container-high text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter font-body">
                            {p}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-xl font-extrabold text-foreground group-hover:text-primary transition-colors font-sans">
                        {action.title}
                      </h3>
                    </div>
                    {/* Score donut */}
                    <div className="flex flex-col items-end shrink-0">
                      <div className="w-12 h-12 relative">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                          <circle
                            cx="24" cy="24" r="20" fill="none"
                            stroke="currentColor" strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={action.scoreOffset}
                            className={action.scoreColor}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-foreground">
                          {action.score}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground mt-1 uppercase font-body">Opportunity</span>
                    </div>
                  </div>

                  {/* AI Context */}
                  <div className="bg-surface-container-low rounded-xl p-4 mb-5 border border-border/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={13} className="text-primary" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body">AI Context</p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed italic font-body">"{action.aiContext}"</p>
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 font-body">
                        Trigger Logic
                      </label>
                      <code className="text-xs bg-surface-container-high text-foreground px-3 py-1.5 rounded-lg block truncate font-mono">
                        {action.triggerLogic}
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 font-body">Scope</label>
                        <p className="text-sm font-bold text-foreground font-body">{action.scope}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1 font-body">Est. Impact</label>
                        <p className="text-sm font-bold text-emerald-600 font-body">{action.impact}</p>
                      </div>
                    </div>
                    {action.risk && (
                      <div className="flex items-center gap-2 text-[10px] font-bold font-body flex-wrap">
                        {action.executionMode && (
                          <span className="text-muted-foreground">{action.executionMode}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-lg font-body ${action.riskClass}`}>
                          {action.risk}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                  {deployed[action.id] ? (
                    <button className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-3 rounded-xl text-xs font-bold font-body" disabled>
                      <CheckCircle size={14} />
                      Deployed
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeploy(action.id)}
                      disabled={deploying[action.id]}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 font-body"
                    >
                      {deploying[action.id] ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : null}
                      {deploying[action.id] ? "Deploying…" : "Deploy Now"}
                    </button>
                  )}
                  <button className="px-4 py-3 bg-surface-container-low text-foreground rounded-xl text-xs font-bold hover:bg-surface-container-high transition-colors font-body">
                    Inspect Logic
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2 font-sans">
          <Zap size={18} className="text-primary" />
          Quick Optimization Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {QUICK_ACTIONS.map((q) => (
            <div
              key={q.id}
              className="bg-white p-5 rounded-2xl border border-border/40 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-sm text-foreground font-sans">{q.title}</h4>
                  <span className="text-emerald-600 text-[10px] font-black font-body">{q.impact}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 font-body">{q.desc}</p>
              </div>
              {quickDeployed[q.id] ? (
                <button className="mt-4 w-full py-2 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-xl font-body" disabled>
                  <CheckCircle size={12} />
                  Done
                </button>
              ) : (
                <button
                  onClick={() => handleQuickDeploy(q.id)}
                  disabled={quickDeploying[q.id]}
                  className="mt-4 w-full py-2 bg-surface-container-low text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-colors font-body flex items-center justify-center gap-2"
                >
                  {quickDeploying[q.id] ? (
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  {quickDeploying[q.id] ? "Running…" : "Quick Execute"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Strip */}
      <footer className="border-t border-border pt-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-medium font-body mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          System scans performance continuously and generates actions in real-time
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {[
            { label: "Active Nodes", value: "12", valueClass: "text-foreground" },
            { label: "Last Scan", value: "14 seconds ago", valueClass: "text-foreground" },
            { label: "Engine Status", value: "Nominal", valueClass: "text-emerald-600" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body">{stat.label}</span>
              <span className={`text-xs font-bold font-body ${stat.valueClass}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
