"use client";

import { useState } from "react";
import {
  TrendingUp, PauseCircle, AlertTriangle, Bell,
  CheckCircle2, SkipForward, XCircle, ChevronUp, ChevronDown,
  ListFilter, Database, CheckSquare, Sparkles, Lightbulb,
  Search, HelpCircle, Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "All" | "Success" | "Failed" | "Skipped";

const STATUS_FILTERS: StatusFilter[] = ["All", "Success", "Failed", "Skipped"];

const DECISIONS = [
  {
    id: 1,
    Icon: TrendingUp,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Scale FB Lookalike 1%",
    time: "Oct 24, 2023 • 14:32:05",
    action: "Budget increased by 20%",
    actionTag: "+$400/day",
    status: "Success" as StatusFilter,
    statusClass: "bg-emerald-100 text-emerald-700",
    StatusIcon: CheckCircle2,
    expandedDetails: {
      trigger: "ROAS > 3.5 over 72h",
      data: "Calculated ROAS = 3.8",
      dataHighlight: "3.8",
      result: "Action Executed",
    },
  },
  {
    id: 2,
    Icon: PauseCircle,
    iconBg: "bg-muted-foreground/5",
    iconColor: "text-muted-foreground",
    title: "Sunset Low-Perf Adset",
    time: "Oct 24, 2023 • 12:15:42",
    action: "No action taken",
    actionTag: null,
    status: "Skipped" as StatusFilter,
    statusClass: "bg-surface-container-high text-muted-foreground",
    StatusIcon: SkipForward,
    expandedDetails: null,
  },
  {
    id: 3,
    Icon: AlertTriangle,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    title: "Creative Rotation - Fall Pack",
    time: "Oct 24, 2023 • 09:10:00",
    action: "API Connection Error",
    actionTag: null,
    status: "Failed" as StatusFilter,
    statusClass: "bg-red-100 text-red-700",
    StatusIcon: XCircle,
    expandedDetails: null,
  },
  {
    id: 4,
    Icon: Bell,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Bid Cap Adjustment",
    time: "Oct 23, 2023 • 23:55:12",
    action: "Bid lowered to $12.50",
    actionTag: null,
    status: "Success" as StatusFilter,
    statusClass: "bg-emerald-100 text-emerald-700",
    StatusIcon: CheckCircle2,
    expandedDetails: null,
  },
];

export default function DecisionHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [expandedId, setExpandedId] = useState<number | null>(1);

  const filtered = DECISIONS.filter((d) => statusFilter === "All" || d.status === statusFilter);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">Decisions</p>
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground font-sans leading-none">
            Decision History
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search decisions..."
              className="bg-surface-container-high rounded-full pl-9 pr-4 py-2 text-sm w-56 focus:outline-none focus:ring-2 ring-primary/20 font-body"
            />
          </div>
          <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-muted-foreground">
            <HelpCircle size={18} strokeWidth={1.5} />
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-foreground rounded-full text-sm font-bold hover:bg-surface-container-high/80 transition-colors font-body">
            <Share2 size={14} /> Export Log
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <section className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium font-body">Date Range:</span>
          <button className="bg-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-bold text-sm font-body border border-border">
            Last 7 Days <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium font-body">Workflow:</span>
          <button className="bg-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 font-bold text-sm font-body border border-border">
            All FB Campaigns <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all font-body",
                statusFilter === f
                  ? "bg-primary text-white"
                  : "bg-surface-container-high text-foreground hover:bg-surface-container-high/80"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Automation Feed */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-sans text-lg font-bold text-foreground">Automation Feed</h3>
            <p className="text-xs text-muted-foreground font-body">Showing {filtered.length * 31} decisions from the last week</p>
          </div>

          {filtered.map((row) => {
            const isExpanded = expandedId === row.id;
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-2xl overflow-hidden transition-all",
                  isExpanded
                    ? "border-2 border-primary/10 shadow-lg shadow-primary/5 bg-surface-container-high"
                    : "bg-surface-container-low border border-transparent hover:bg-surface-container hover:border-border"
                )}
              >
                <div className="p-6 flex items-start gap-4">
                  <div className={`w-12 h-12 ${row.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                    <row.Icon size={20} className={row.iconColor} strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest font-body">Decision</p>
                      <h4 className="font-bold text-foreground font-sans">{row.title}</h4>
                      <p className="text-xs text-muted-foreground font-body">{row.time}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest font-body">Action Taken</p>
                      <p className="text-sm font-semibold text-foreground font-body">{row.action}</p>
                      {row.actionTag && (
                        <span className="text-[10px] bg-surface-container-high text-muted-foreground px-2 py-0.5 rounded-full inline-block font-bold font-body">
                          {row.actionTag}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 font-body", row.statusClass)}>
                        <row.StatusIcon size={12} />
                        {row.status}
                      </span>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {isExpanded
                          ? <ChevronUp size={18} className="text-primary" />
                          : <ChevronDown size={18} />
                        }
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && row.expandedDetails && (
                  <div className="bg-surface-container-low p-6 border-t border-primary/5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ListFilter size={16} className="text-primary" />
                          <p className="text-[10px] font-black text-foreground uppercase tracking-widest font-body">Trigger Condition</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl text-sm border-l-4 border-primary font-body">
                          {row.expandedDetails.trigger}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Database size={16} className="text-primary" />
                          <p className="text-[10px] font-black text-foreground uppercase tracking-widest font-body">Data Used</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl text-sm font-body">
                          Calculated ROAS ={" "}
                          <span className="font-bold text-primary">{row.expandedDetails.dataHighlight}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckSquare size={16} className="text-primary" />
                          <p className="text-[10px] font-black text-foreground uppercase tracking-widest font-body">Result</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl text-sm font-body">
                          {row.expandedDetails.result}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Explain Panel */}
        <aside className="xl:col-span-4 flex flex-col gap-6 xl:sticky xl:top-8">
          {/* AI Insights dark card */}
          <div className="bg-foreground text-white rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/30 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 border border-white/10 rounded-full flex items-center justify-center">
                  <Sparkles size={16} className="text-blue-300" />
                </div>
                <h3 className="font-sans font-bold text-lg">AI Decision Insights</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-2 font-body">Detailed Explanation</p>
                  <p className="text-sm text-slate-300 leading-relaxed italic font-body">
                    "This rule didn't run because the{" "}
                    <span className="text-white font-semibold underline decoration-primary decoration-2 underline-offset-4">
                      ROAS threshold
                    </span>{" "}
                    was not met. Your target of 3.5 requires consistent performance across 72h."
                  </p>
                </div>

                <div className="bg-primary/20 p-4 rounded-xl border border-primary/30">
                  <div className="flex items-start gap-3">
                    <Lightbulb size={16} className="text-blue-300 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white uppercase tracking-widest font-body">Growth Suggestion</p>
                      <p className="text-sm text-slate-200 font-body">
                        Lower threshold to{" "}
                        <span className="text-white font-bold">2.5</span>{" "}
                        to capture higher volume during the current seasonal upswing.
                      </p>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-white text-foreground py-2 rounded-xl font-bold text-xs hover:bg-surface-container-low transition-colors font-body">
                    Apply Adjustment
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-400 font-body mb-2">
                  <span>Confidence Score</span>
                  <span className="text-white font-bold">94%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[94%] rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-surface-container-high rounded-2xl p-6 space-y-4">
            <h4 className="font-sans font-bold text-sm text-foreground">Quick Stats</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest font-body mb-1">Efficiency</p>
                <p className="text-xl font-black text-primary font-sans">+12.4%</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest font-body mb-1">Save Time</p>
                <p className="text-xl font-black text-primary font-sans">18h/wk</p>
              </div>
            </div>
            {/* Mini chart placeholder */}
            <div className="h-24 bg-white rounded-xl border border-border overflow-hidden flex items-end px-4 pb-3 gap-2">
              {[40, 55, 45, 70, 60, 80, 75, 90].map((h, i) => (
                <div key={i} className="flex-1 bg-primary/20 rounded-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
