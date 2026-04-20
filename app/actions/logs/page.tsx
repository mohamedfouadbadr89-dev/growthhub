"use client";

import { Search, RefreshCw, CalendarDays, Download, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Activity, CreditCard, Zap, Clock, Bot } from "lucide-react";

const PLATFORM_DOT: Record<string, string> = {
  "Google Ads":   "bg-[#4285F4]",
  "Meta Ads":     "bg-[#1877F2]",
  "TikTok Ads":   "bg-[#ff0050]",
  "Snapchat Ads": "bg-[#FFFC00]",
};

export default function LogsPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* System Health Strip */}
      <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between gap-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-body">
              System Health
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-6">
            {[
              { label: "API STATUS",    value: "99.9% Uptime", color: "text-primary" },
              { label: "LATENCY",       value: "142ms",        color: "text-foreground" },
              { label: "SUCCESS RATE",  value: "98.4%",        color: "text-foreground" },
            ].map((m) => (
              <div key={m.label} className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-medium font-body">{m.label}</span>
                <span className={`text-sm font-bold font-body ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-bold uppercase font-body">Real-time Sync</span>
          <RefreshCw size={14} className="text-primary animate-spin" style={{ animationDuration: "3s" }} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {[{ label: "Platform" }, { label: "Status: All" }].map((f) => (
            <button
              key={f.label}
              className="bg-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-high transition-all shadow-sm font-body"
            >
              {f.label} <ChevronDown size={14} />
            </button>
          ))}
          <button className="bg-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-high transition-all shadow-sm font-body">
            <CalendarDays size={14} /> Last 24 Hours <ChevronDown size={14} />
          </button>
        </div>
        <button className="bg-gradient-to-br from-primary to-[#2563eb] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg font-body">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Execution Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {["Action Name", "Platform", "Scope", "Impact", "Status", "Time", ""].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {/* Success Row */}
              <tr className="hover:bg-surface-container-low/50 transition-colors cursor-pointer">
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground font-body">PMax Bid Optimization</span>
                    <span className="text-xs text-muted-foreground font-body">Automated ROAS balancing</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="bg-primary/10 px-3 py-1 rounded-full text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase w-fit font-body">
                    <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT["Google Ads"]}`} /> Google Ads
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-foreground font-body">12 Campaigns</td>
                <td className="px-6 py-5">
                  <span className="text-emerald-600 font-bold text-sm font-body">+12.4% ROAS</span>
                </td>
                <td className="px-6 py-5">
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-body">
                    Success
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-muted-foreground font-body">09:42 AM</td>
                <td className="px-6 py-5 text-right">
                  <ChevronDown size={18} className="text-muted-foreground" />
                </td>
              </tr>

              {/* Expanded Detail */}
              <tr className="bg-white">
                <td className="px-8 pb-8 pt-0" colSpan={7}>
                  <div className="bg-surface-container-low/30 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-2">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2 font-body">AI Execution Explanation</h4>
                      <p className="text-sm text-foreground leading-relaxed font-body">
                        Detected 14% ROAS deviation in PMax campaigns during the morning peak. Intelligence core
                        initiated bid ceiling adjustment across 12 high-intent segments to preserve margin while
                        maintaining velocity.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1 font-body">Signal Detected</h4>
                        <div className="bg-[#bc4800]/10 px-3 py-2 rounded-lg inline-block">
                          <span className="text-xs text-[#bc4800] font-bold font-body">Inconsistent Conversion Latency</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-border">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-bold font-body">EXPECTED</span>
                          <span className="text-sm font-bold font-body">$4.2k Revenue</span>
                        </div>
                        <TrendingUp size={16} className="text-muted-foreground" />
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-muted-foreground font-bold font-body">ACTUAL</span>
                          <span className="text-sm font-bold text-primary font-body">$4.8k Revenue</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Failure Row */}
              <tr className="hover:bg-surface-container-low/50 transition-colors cursor-pointer bg-red-50/20">
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground font-body">Lookalike Refresh Cycle</span>
                    <span className="text-xs text-muted-foreground font-body">Audience sync process</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="bg-primary/10 px-3 py-1 rounded-full text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase w-fit font-body">
                    <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT["Meta Ads"]}`} /> Meta Ads
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-foreground font-body">4 Audiences</td>
                <td className="px-6 py-5">
                  <span className="text-muted-foreground font-bold text-sm font-body">N/A</span>
                </td>
                <td className="px-6 py-5">
                  <span className="bg-[#ffdad6] text-error px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-body">
                    Failed
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-muted-foreground font-body">08:15 AM</td>
                <td className="px-6 py-5 text-right">
                  <ChevronUp size={18} className="text-muted-foreground" />
                </td>
              </tr>

              {/* Failure Detail */}
              <tr className="bg-red-50/10">
                <td className="px-8 pb-8 pt-0" colSpan={7}>
                  <div className="bg-[#ffdad6]/20 border-2 border-dashed border-error/20 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-error text-white p-2 rounded-lg shrink-0">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                          <h4 className="font-bold text-error font-body">Execution Error: Audience API Timeout</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-error font-bold uppercase font-body">RETRY STATUS:</span>
                            <span className="bg-error text-white px-2 py-0.5 rounded text-[10px] font-bold font-body">
                              QUEUED (T-15m)
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase font-body">Error Message</span>
                            <p className="text-xs font-mono bg-white/50 p-2 rounded border border-error/10 mt-1">
                              Status Code 503: Service Unavailable at Meta Graph API Endpoint
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase font-body">Root Cause Analysis</span>
                            <p className="text-xs text-foreground mt-1 leading-relaxed font-body">
                              Meta Ads API experiencing intermittent downtime for segment-level operations in the North
                              America West region. Execution core paused to prevent corrupting audience hash states.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Running Row */}
              <tr className="hover:bg-surface-container-low/50 transition-colors cursor-pointer">
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground font-body">Budget Reallocation Flow</span>
                    <span className="text-xs text-muted-foreground font-body">Daily spending balancing</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex gap-2 flex-wrap">
                    {["TikTok Ads", "Snapchat Ads"].map((p) => (
                      <div key={p} className="bg-primary/10 px-3 py-1 rounded-full text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase font-body">
                        <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[p]}`} /> {p}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-foreground font-body">32 Groups</td>
                <td className="px-6 py-5">
                  <span className="text-foreground font-bold text-sm font-body">Processing...</span>
                </td>
                <td className="px-6 py-5">
                  <span className="bg-[#2563eb] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-2 w-fit font-body">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Running
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-muted-foreground font-body">Active Now</td>
                <td className="px-6 py-5 text-right">
                  <ChevronDown size={18} className="text-muted-foreground" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-primary">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">
                Total Executions (24h)
              </span>
              <h3 className="text-3xl font-black text-foreground mt-1 font-sans">1,284</h3>
            </div>
            <Activity size={36} className="text-primary/20" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 font-body">
            <TrendingUp size={14} /> +14.2% from yesterday
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">
                Revenue Impact
              </span>
              <h3 className="text-3xl font-black text-emerald-600 mt-1 font-sans">+$24,104</h3>
            </div>
            <CreditCard size={36} className="text-emerald-500/20" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 font-body">
            <TrendingUp size={14} /> AI-attributed value
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-[#bc4800]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">
                Efficiency Gain
              </span>
              <h3 className="text-3xl font-black text-foreground mt-1 font-sans">+18%</h3>
            </div>
            <Zap size={36} className="text-[#bc4800]/20" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground font-body">
            <Clock size={14} /> -4.2h manual work saved
          </div>
        </div>
      </div>

      {/* AI Insight FAB */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="bg-white/85 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/40 max-w-xs hover:scale-105 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#2563eb] flex items-center justify-center text-white">
              <Bot size={20} />
            </div>
            <div>
              <h5 className="text-sm font-bold text-foreground font-body">Architect Insights</h5>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter font-body">
                Live Analysis
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed font-body">
            System performance is currently{" "}
            <span className="text-primary font-bold">Optimal</span>. No critical bottlenecks detected in the last 6 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
