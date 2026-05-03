"use client";

import { useState } from "react";
import {
  Search, Download, TrendingUp, ChevronDown, ChevronUp,
  AlertTriangle, Bot, Activity, DollarSign, Zap,
} from "lucide-react";

type Status = "success" | "failed" | "running";
type Platform = "All" | "Google" | "Meta" | "TikTok" | "Snapchat";

interface PlatformTag {
  label: string;
  dot: string;
}

interface LogEntry {
  id: string;
  name: string;
  desc: string;
  platforms: PlatformTag[];
  platformFilter: Platform[];
  scope: string;
  impact: string;
  impactClass: string;
  status: Status;
  time: string;
  detail: {
    type: "success" | "error";
    explanation?: string;
    signal?: string;
    expected?: string;
    actual?: string;
    errorTitle?: string;
    retryStatus?: string;
    errorMessage?: string;
    rootCause?: string;
  };
}

const MOCK_LOGS: LogEntry[] = [
  {
    id: "log-001",
    name: "PMax Bid Optimization",
    desc: "Automated ROAS balancing",
    platforms: [{ label: "Google Ads", dot: "#4285F4" }],
    platformFilter: ["Google"],
    scope: "12 Campaigns",
    impact: "+12.4% ROAS",
    impactClass: "text-emerald-600",
    status: "success",
    time: "09:42 AM",
    detail: {
      type: "success",
      explanation:
        "Detected 14% ROAS deviation in PMax campaigns during the morning peak. Intelligence core initiated bid ceiling adjustment across 12 high-intent segments to preserve margin while maintaining velocity.",
      signal: "Inconsistent Conversion Latency",
      expected: "$4.2k Revenue",
      actual: "$4.8k Revenue",
    },
  },
  {
    id: "log-002",
    name: "Lookalike Refresh Cycle",
    desc: "Audience sync process",
    platforms: [{ label: "Meta Ads", dot: "#1877F2" }],
    platformFilter: ["Meta"],
    scope: "4 Audiences",
    impact: "N/A",
    impactClass: "text-muted-foreground",
    status: "failed",
    time: "08:15 AM",
    detail: {
      type: "error",
      errorTitle: "Execution Error: Audience API Timeout",
      retryStatus: "QUEUED (T-15m)",
      errorMessage: "Status Code 503: Service Unavailable at Meta Graph API Endpoint",
      rootCause:
        "Meta Ads API experiencing intermittent downtime for segment-level operations in the North America West region. Execution core paused to prevent corrupting audience hash states.",
    },
  },
  {
    id: "log-003",
    name: "Budget Reallocation Flow",
    desc: "Daily spending balancing",
    platforms: [
      { label: "TikTok Ads", dot: "#ff0050" },
      { label: "Snapchat Ads", dot: "#FFFC00" },
    ],
    platformFilter: ["TikTok", "Snapchat"],
    scope: "32 Groups",
    impact: "Processing…",
    impactClass: "text-foreground",
    status: "running",
    time: "Active Now",
    detail: {
      type: "success",
      explanation:
        "Dynamically reallocating daily budget across 32 ad groups based on real-time efficiency signals. TikTok shows +18% CTR uplift; Snapchat rebalancing in progress.",
      signal: "Budget Efficiency Delta",
      expected: "$8.1k Efficiency",
      actual: "In Progress",
    },
  },
  {
    id: "log-004",
    name: "Creative Rotation Engine",
    desc: "Auto-swap fatigue assets",
    platforms: [{ label: "Meta Ads", dot: "#1877F2" }],
    platformFilter: ["Meta"],
    scope: "6 Ad Sets",
    impact: "+9.1% CTR",
    impactClass: "text-emerald-600",
    status: "success",
    time: "07:30 AM",
    detail: {
      type: "success",
      explanation:
        "Frequency threshold crossed on 6 ad sets. Swapped in 3 reserve video creatives with highest historical CTR. Early signals show +9.1% improvement in click-through rate.",
      signal: "Creative Frequency Fatigue",
      expected: "$3.5k Recovered",
      actual: "$3.9k Recovered",
    },
  },
  {
    id: "log-005",
    name: "Bid Adjustment — Night Mode",
    desc: "Off-peak bid reduction",
    platforms: [{ label: "Google Ads", dot: "#4285F4" }],
    platformFilter: ["Google"],
    scope: "8 Campaigns",
    impact: "-$220 Saved",
    impactClass: "text-blue-600",
    status: "success",
    time: "12:05 AM",
    detail: {
      type: "success",
      explanation:
        "Automatically reduced bids by 35% during the 12 AM–5 AM window on 8 campaigns with historically low conversion rates. Spend efficiency improved without impacting daily delivery targets.",
      signal: "Time-of-Day Conversion Signal",
      expected: "$180 Saved",
      actual: "$220 Saved",
    },
  },
];

const STATUS_LABELS: Record<Status, { label: string; class: string }> = {
  success: { label: "Success", class: "bg-emerald-100 text-emerald-700" },
  failed:  { label: "Failed",  class: "bg-red-100 text-red-600" },
  running: { label: "Running", class: "bg-primary/10 text-primary" },
};

const PLATFORM_FILTERS: Platform[] = ["All", "Google", "Meta", "TikTok", "Snapchat"];
const STATUS_FILTERS: Array<"All" | Status> = ["All", "success", "failed", "running"];

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<Platform>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["log-001"]));

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = MOCK_LOGS.filter((log) => {
    if (platformFilter !== "All" && !log.platformFilter.includes(platformFilter)) return false;
    if (statusFilter !== "All" && log.status !== statusFilter) return false;
    if (search && !log.name.toLowerCase().includes(search.toLowerCase()) &&
        !log.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Execution Log
          </h1>
          <p className="text-muted-foreground font-body">Real-time record of every automated action and its outcome</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all font-body text-sm self-start md:self-auto">
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* System Health Strip */}
      <div className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-body">System Health</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-body">API STATUS</span>
              <span className="text-sm font-bold text-primary font-body">99.9% Uptime</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-body">LATENCY</span>
              <span className="text-sm font-bold text-foreground font-body">142ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-body">SUCCESS RATE</span>
              <span className="text-sm font-bold text-foreground font-body">98.4%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-bold uppercase font-body">Real-time Sync</span>
          <Activity size={14} className="text-primary animate-pulse" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search operations…"
            className="bg-white border border-border rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-body w-56"
          />
        </div>

        {/* Platform filter */}
        <div className="flex gap-1.5">
          {PLATFORM_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all font-body ${
                platformFilter === p
                  ? "bg-primary/10 text-primary"
                  : "bg-white border border-border text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all font-body ${
                statusFilter === s
                  ? "bg-primary/10 text-primary"
                  : "bg-white border border-border text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
              }`}
            >
              {s === "All" ? "All Status" : STATUS_LABELS[s as Status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-border/40 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {["Action Name", "Platform", "Scope", "Impact", "Status", "Time", ""].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-body text-sm">
                    No execution logs match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => toggleExpand(log.id)}
                      className={`hover:bg-surface-container-low/50 transition-colors cursor-pointer ${log.status === "failed" ? "bg-red-50/20" : ""}`}
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-foreground font-sans">{log.name}</p>
                        <p className="text-xs text-muted-foreground font-body">{log.desc}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5">
                          {log.platforms.map((p) => (
                            <span key={p.label} className="bg-surface-container-high px-3 py-1 rounded-full text-[10px] font-bold text-foreground flex items-center gap-1.5 uppercase font-body">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.dot }} />
                              {p.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-foreground font-body whitespace-nowrap">{log.scope}</td>
                      <td className="px-6 py-5">
                        <span className={`text-sm font-bold font-body ${log.impactClass}`}>{log.impact}</span>
                      </td>
                      <td className="px-6 py-5">
                        {log.status === "running" ? (
                          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1.5 w-fit font-body">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Running
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-body ${STATUS_LABELS[log.status].class}`}>
                            {STATUS_LABELS[log.status].label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm text-muted-foreground font-body whitespace-nowrap">{log.time}</td>
                      <td className="px-6 py-5 text-right">
                        {expanded.has(log.id)
                          ? <ChevronUp size={16} className="text-muted-foreground inline" />
                          : <ChevronDown size={16} className="text-muted-foreground inline" />
                        }
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {expanded.has(log.id) && (
                      <tr key={`${log.id}-detail`} className={log.status === "failed" ? "bg-red-50/10" : "bg-surface-container-low/20"}>
                        <td colSpan={7} className="px-8 pb-8 pt-0">
                          {log.detail.type === "success" ? (
                            <div className="bg-surface-container-low/40 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                              <div className="md:col-span-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">AI Execution Explanation</p>
                                <p className="text-sm text-foreground leading-relaxed font-body">{log.detail.explanation}</p>
                              </div>
                              <div className="space-y-4">
                                {log.detail.signal && (
                                  <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">Signal Detected</p>
                                    <span className="inline-block bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold font-body">
                                      {log.detail.signal}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-border/20">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground font-bold font-body">EXPECTED</span>
                                    <span className="text-sm font-bold text-foreground font-body">{log.detail.expected}</span>
                                  </div>
                                  <TrendingUp size={16} className="text-muted-foreground" />
                                  <div className="flex flex-col text-right">
                                    <span className="text-[10px] text-muted-foreground font-bold font-body">ACTUAL</span>
                                    <span className="text-sm font-bold text-primary font-body">{log.detail.actual}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-red-50 border-2 border-dashed border-red-200 rounded-xl p-6 mt-2">
                              <div className="flex items-start gap-4">
                                <div className="bg-red-500 text-white p-2 rounded-lg shrink-0">
                                  <AlertTriangle size={18} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-wrap justify-between items-center mb-3 gap-3">
                                    <h4 className="font-bold text-red-600 font-body">{log.detail.errorTitle}</h4>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-red-500 font-bold uppercase font-body">RETRY STATUS:</span>
                                      <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold font-body">
                                        {log.detail.retryStatus}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase font-body mb-1">Error Message</p>
                                      <p className="text-xs font-mono bg-white/60 p-2 rounded-lg border border-red-100">
                                        {log.detail.errorMessage}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase font-body mb-1">Root Cause Analysis</p>
                                      <p className="text-xs text-foreground leading-relaxed font-body">{log.detail.rootCause}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border-l-4 border-primary shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">Total Executions (24h)</span>
              <h3 className="text-3xl font-black text-foreground font-sans mt-1">1,284</h3>
            </div>
            <Zap size={32} className="text-primary/20" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 font-body">
            <TrendingUp size={14} />
            +14.2% from yesterday
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border-l-4 border-emerald-500 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">Revenue Impact</span>
              <h3 className="text-3xl font-black text-emerald-600 font-sans mt-1">+$24,104</h3>
            </div>
            <DollarSign size={32} className="text-emerald-500/20" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 font-body">
            <Activity size={14} />
            AI-attributed value
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border-l-4 border-orange-400 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">Efficiency Gain</span>
              <h3 className="text-3xl font-black text-foreground font-sans mt-1">+18%</h3>
            </div>
            <TrendingUp size={32} className="text-orange-400/20" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground font-body">
            <Activity size={14} />
            -4.2h manual work saved
          </div>
        </div>
      </div>

      {/* AI Insight Card */}
      <div className="bg-white rounded-2xl p-5 border border-border/40 flex items-start gap-4 shadow-sm max-w-md">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bot size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground font-sans">Architect Insights</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter font-body mb-1">Live Analysis</p>
          <p className="text-xs text-muted-foreground leading-relaxed font-body">
            System performance is currently <span className="text-primary font-bold">Optimal</span>. No critical bottlenecks detected in the last 6 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
