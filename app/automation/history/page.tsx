"use client";

import { useState } from "react";
import {
  TrendingUp, PauseCircle, AlertTriangle, Bell, Database,
  CheckCircle2, SkipForward, XCircle, ChevronUp, ChevronDown,
  Sparkles, Lightbulb, Download, Search,
} from "lucide-react";

type ResultFilter = "All" | "Success" | "Failed" | "Skipped";

interface HistoryEntry {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  decision: string;
  timestamp: string;
  actionTaken: string;
  actionTag?: string;
  result: "Success" | "Failed" | "Skipped";
  trigger: string;
  dataUsed: string;
  resultDetail: string;
  confidence: number;
}

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "h-001",
    icon: TrendingUp,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    decision: "Scale FB Lookalike 1%",
    timestamp: "Oct 24, 2023 · 14:32:05",
    actionTaken: "Budget increased by 20%",
    actionTag: "+$400/day",
    result: "Success",
    trigger: "ROAS > 3.5 over 72h",
    dataUsed: "Calculated ROAS = 3.8",
    resultDetail: "Action Executed",
    confidence: 94,
  },
  {
    id: "h-002",
    icon: PauseCircle,
    iconBg: "bg-surface-container-high",
    iconColor: "text-muted-foreground",
    decision: "Sunset Low-Perf Adset",
    timestamp: "Oct 24, 2023 · 12:15:42",
    actionTaken: "No action taken",
    result: "Skipped",
    trigger: "CPA > $18 for 48h",
    dataUsed: "CPA = $15.20 (below threshold)",
    resultDetail: "Condition not met",
    confidence: 76,
  },
  {
    id: "h-003",
    icon: AlertTriangle,
    iconBg: "bg-red-100",
    iconColor: "text-red-500",
    decision: "Creative Rotation — Fall Pack",
    timestamp: "Oct 24, 2023 · 09:10:00",
    actionTaken: "API Connection Error",
    result: "Failed",
    trigger: "Frequency > 3.5 (7 days)",
    dataUsed: "Frequency = 4.1",
    resultDetail: "Meta API 503 — retry queued",
    confidence: 88,
  },
  {
    id: "h-004",
    icon: Bell,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    decision: "Bid Cap Adjustment",
    timestamp: "Oct 23, 2023 · 23:55:12",
    actionTaken: "Bid lowered to $12.50",
    result: "Success",
    trigger: "CPM > $45 for 24h",
    dataUsed: "CPM = $49.80",
    resultDetail: "Action Executed",
    confidence: 91,
  },
  {
    id: "h-005",
    icon: TrendingUp,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    decision: "Budget Scale — Google Branded",
    timestamp: "Oct 23, 2023 · 18:05:00",
    actionTaken: "Daily budget +15%",
    actionTag: "+$120/day",
    result: "Success",
    trigger: "ROAS > 4.0 for 5 consecutive days",
    dataUsed: "7-day ROAS = 4.6x",
    resultDetail: "Action Executed",
    confidence: 97,
  },
];

const RESULT_BADGES: Record<string, { label: string; class: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  Success: { label: "Success", class: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  Failed:  { label: "Failed",  class: "bg-red-100 text-red-600",         Icon: XCircle      },
  Skipped: { label: "Skipped", class: "bg-surface-container-high text-muted-foreground", Icon: SkipForward },
};

const RESULT_FILTERS: ResultFilter[] = ["All", "Success", "Failed", "Skipped"];

export default function DecisionHistoryPage() {
  const [resultFilter, setResultFilter] = useState<ResultFilter>("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["h-001"]));

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = MOCK_HISTORY.filter((h) => {
    if (resultFilter !== "All" && h.result !== resultFilter) return false;
    if (search && !h.decision.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeEntry = MOCK_HISTORY.find((h) => expanded.has(h.id)) ?? MOCK_HISTORY[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">Automation</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Decision History
          </h1>
          <p className="text-muted-foreground font-body">Full memory — every decision, trigger, data snapshot, and outcome</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-surface-container-high text-foreground px-6 py-2.5 rounded-full font-bold text-sm hover:bg-surface-container-highest transition-all font-body self-start md:self-auto">
          <Download size={15} />
          Export Log
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions…"
            className="bg-white border border-border/40 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body w-52"
          />
        </div>

        <div className="h-5 w-px bg-border" />

        <div className="flex gap-2">
          {RESULT_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setResultFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all font-body ${
                resultFilter === f
                  ? "bg-primary text-white"
                  : "bg-surface-container-high text-foreground hover:bg-surface-container-highest"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* LEFT — Automation Feed */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-foreground font-sans">Automation Feed</h3>
            <p className="text-xs text-muted-foreground font-body">Showing {filtered.length} decisions</p>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-surface-container-low rounded-2xl p-12 text-center">
              <p className="text-muted-foreground font-body">No decisions match the selected filters.</p>
            </div>
          ) : (
            filtered.map((entry) => {
              const isExpanded = expanded.has(entry.id);
              const badge = RESULT_BADGES[entry.result];
              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl overflow-hidden shadow-sm transition-all ${
                    isExpanded
                      ? "border-2 border-primary/10 bg-surface-container-high"
                      : "bg-surface-container-low hover:bg-surface-container border border-transparent"
                  }`}
                >
                  {/* Row */}
                  <div className="p-5 flex items-start gap-4">
                    <div className={`w-12 h-12 ${entry.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                      <entry.icon size={20} className={entry.iconColor} />
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body">Decision</p>
                        <h4 className="font-bold text-foreground font-sans text-sm">{entry.decision}</h4>
                        <p className="text-xs text-muted-foreground font-body">{entry.timestamp}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body">Action Taken</p>
                        <p className="text-sm font-semibold text-foreground font-body">{entry.actionTaken}</p>
                        {entry.actionTag && (
                          <span className="text-[10px] bg-surface-container-high text-foreground px-2 py-0.5 rounded-full inline-block font-body font-bold">
                            {entry.actionTag}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-2">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-body ${badge.class}`}>
                          <badge.Icon size={12} />
                          {badge.label}
                        </span>
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="bg-surface-container-low p-6 border-t border-primary/5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-primary" />
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-widest font-body">Trigger Condition</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl text-sm border-l-4 border-primary font-body text-foreground">
                            {entry.trigger}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Database size={15} className="text-primary" />
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-widest font-body">Data Used</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl text-sm font-body text-foreground">
                            {entry.dataUsed}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-primary" />
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-widest font-body">Result</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl text-sm font-body text-foreground">
                            {entry.resultDetail}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT — AI Insights + Quick Stats */}
        <aside className="xl:col-span-4 flex flex-col gap-6 xl:sticky xl:top-6">

          {/* AI Decision Insights */}
          <div className="bg-foreground text-white rounded-2xl p-7 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 border border-white/10 rounded-full flex items-center justify-center">
                  <Sparkles size={16} className="text-blue-200" />
                </div>
                <h3 className="font-bold text-lg font-sans">AI Decision Insights</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-2 font-body">Detailed Explanation</p>
                  <p className="text-sm text-slate-300 leading-relaxed italic font-body">
                    "This rule triggered because the{" "}
                    <span className="text-white font-semibold underline decoration-primary decoration-2 underline-offset-4">
                      ROAS threshold
                    </span>{" "}
                    was consistently met. Your target of 3.5 was exceeded at 3.8 over the 72h window — a reliable signal."
                  </p>
                </div>

                <div className="bg-primary/20 p-4 rounded-xl border border-primary/30">
                  <div className="flex items-start gap-3">
                    <Lightbulb size={16} className="text-blue-200 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white uppercase font-body">Growth Suggestion</p>
                      <p className="text-sm text-slate-200 font-body">
                        Lower threshold to{" "}
                        <span className="text-white font-bold">2.5</span>{" "}
                        to capture higher volume during the current seasonal upswing.
                      </p>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-white text-foreground py-2 rounded-xl font-bold text-xs hover:bg-blue-50 transition-colors font-body active:scale-95">
                    Apply Adjustment
                  </button>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-body">
                  <span>Confidence Score</span>
                  <span className="text-white font-bold">{activeEntry.confidence}%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${activeEntry.confidence}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-surface-container-high rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-sm text-foreground font-sans">Quick Stats</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body mb-1">Efficiency</p>
                <p className="text-xl font-bold text-primary font-sans">+12.4%</p>
              </div>
              <div className="bg-white p-4 rounded-xl">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body mb-1">Time Saved</p>
                <p className="text-xl font-bold text-primary font-sans">18h/wk</p>
              </div>
            </div>
            <div className="h-24 bg-white rounded-xl flex items-end px-4 pb-3 pt-3 gap-1.5">
              {[40, 55, 35, 70, 60, 85, 75, 90, 65, 80, 95, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/20 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
