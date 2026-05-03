"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp, EyeOff, Sparkles, AlertCircle,
  Zap, BarChart2, ChevronUp, ChevronDown,
  Clock, ArrowRight,
} from "lucide-react";

type Severity = "critical" | "warning" | "info";
type AlertStatus = "active" | "resolved";

interface MockAlert {
  id: string;
  title: string;
  severity: Severity;
  status: AlertStatus;
  entity: string;
  platform: string;
  timeAgo: string;
  rootCause: string;
  remediation: string;
  linkedDecision: number | null;
  Icon: React.ElementType;
}

const MOCK_ALERTS: MockAlert[] = [
  {
    id: "a-001",
    title: "CPA Spike",
    severity: "critical",
    status: "active",
    entity: "US_Retargeting_Pixel_V4",
    platform: "Meta Ads",
    timeAgo: "2m ago",
    rootCause: "Sudden drop in conversion signal (42% variance). Pixel event 'Purchase' reporting high latency from US-East-1 nodes.",
    remediation: "Verify Pixel integration via CAPI. Re-route server-side events to secondary gateway.",
    linkedDecision: 992,
    Icon: TrendingUp,
  },
  {
    id: "a-002",
    title: "Reach Decay",
    severity: "warning",
    status: "active",
    entity: "EMEA_Awareness_C03",
    platform: "Google Display",
    timeAgo: "14m ago",
    rootCause: "Low engagement on video assets in EMEA region causing audience fatigue.",
    remediation: "Rotate creative assets with localized content tailored to EMEA demographics.",
    linkedDecision: 845,
    Icon: EyeOff,
  },
  {
    id: "a-003",
    title: "Creative Refresh Optimization",
    severity: "info",
    status: "active",
    entity: "Spring_Launch_Assets",
    platform: "TikTok Business",
    timeAgo: "42m ago",
    rootCause: "Ad fatigue detected in primary audience segment. Frequency exceeds recommended threshold.",
    remediation: "Deploy fresh static assets to A/B test groups and monitor CTR impact.",
    linkedDecision: 712,
    Icon: Sparkles,
  },
  {
    id: "a-004",
    title: "API Auth Failure",
    severity: "critical",
    status: "resolved",
    entity: "Meta_Ads_Connect_01",
    platform: "Meta",
    timeAgo: "1h ago",
    rootCause: "Authentication token expired for Meta Ads API connection.",
    remediation: "Refresh OAuth token in Integration Settings to restore data flow.",
    linkedDecision: null,
    Icon: AlertCircle,
  },
];

const SEVERITY_CONFIG: Record<Severity, {
  border: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  label: string;
}> = {
  critical: {
    border: "border-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    badgeBg: "bg-red-600",
    label: "Critical",
  },
  warning: {
    border: "border-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
    badgeBg: "bg-amber-600",
    label: "Warning",
  },
  info: {
    border: "border-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    badgeBg: "bg-primary",
    label: "Info",
  },
};

const FREQUENCY_BARS = [
  { day: "Mon", h: "50%" },
  { day: "Tue", h: "67%" },
  { day: "Wed", h: "100%" },
  { day: "Thu", h: "75%" },
  { day: "Fri", h: "50%" },
  { day: "Sat", h: "33%" },
  { day: "Sun", h: "25%" },
];

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "a-001": true });
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function ignoreAlert(id: string) {
    setIgnored((prev) => new Set([...prev, id]));
  }

  const filteredAlerts = MOCK_ALERTS.filter((a) => {
    if (ignored.has(a.id)) return false;
    const sevMatch = severityFilter === "All" || a.severity === severityFilter.toLowerCase();
    const platMatch = platformFilter === "All" || a.platform.toLowerCase().includes(platformFilter.toLowerCase());
    return sevMatch && platMatch;
  });

  const activeAlerts = MOCK_ALERTS.filter((a) => a.status === "active");
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = activeAlerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            System Monitoring
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">
            Signals &amp; Operational Alerts
          </h2>
          <p className="text-muted-foreground text-sm font-medium mt-1 font-body">
            Monitoring 2.4k active ad entities across 3 networks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white border border-border text-xs font-semibold rounded-xl shadow-sm py-2 pl-3 pr-8 text-muted-foreground cursor-pointer focus:ring-2 focus:ring-primary/20 font-body"
          >
            <option value="All">Severity: All</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
            <option value="Info">Info</option>
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-white border border-border text-xs font-semibold rounded-xl shadow-sm py-2 pl-3 pr-8 text-muted-foreground cursor-pointer focus:ring-2 focus:ring-primary/20 font-body"
          >
            <option value="All">Platform: All</option>
            <option value="Meta">Meta</option>
            <option value="Google">Google</option>
            <option value="TikTok">TikTok</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: "Total Active", value: String(activeAlerts.length).padStart(2, "0"), color: "text-foreground" },
          { label: "Critical",     value: String(criticalCount).padStart(2, "0"),        color: "text-red-600"    },
          { label: "Warnings",     value: String(warningCount).padStart(2, "0"),         color: "text-amber-600"  },
        ].map((s) => (
          <div key={s.label} className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-4 font-body">
              {s.label}
            </p>
            <span className={`text-3xl font-extrabold font-sans ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Alert Cards */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-border">
              <AlertCircle size={40} className="text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-bold text-foreground font-sans text-lg mb-1">No alerts match this filter</p>
              <p className="text-muted-foreground font-body text-sm">
                Try changing the severity or platform filter.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity];
              const isExpanded = expanded[alert.id] ?? false;
              const isResolved = alert.status === "resolved";

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden border-l-4 transition-all ${
                    isResolved ? "border-slate-300 opacity-70" : cfg.border
                  }`}
                >
                  {/* Card header row */}
                  <div className="p-5 flex items-start gap-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isResolved ? "bg-slate-100" : cfg.iconBg
                    }`}>
                      <alert.Icon size={22} className={isResolved ? "text-slate-400" : cfg.iconColor} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-3">
                        <h3 className="font-bold text-lg text-foreground tracking-tight font-sans">
                          {alert.title}
                        </h3>
                        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white font-body ${
                          isResolved ? "bg-slate-400" : cfg.badgeBg
                        }`}>
                          {isResolved ? "Resolved" : cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium font-body flex-wrap">
                        <span>{alert.entity}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {alert.timeAgo}
                        </span>
                        <span className={`font-bold ${isResolved ? "text-muted-foreground" : "text-primary"}`}>
                          {alert.platform}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(alert.id)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {/* Expandable detail */}
                  {isExpanded && !isResolved && (
                    <div className="px-5 pb-6 pt-2 bg-surface-container-low/30 border-t border-surface-container-low">
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 font-body">
                            Root Cause Analysis
                          </h4>
                          <p className="text-sm text-foreground leading-relaxed font-body">{alert.rootCause}</p>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 font-body">
                            Suggested Remediation
                          </h4>
                          <p className="text-sm text-foreground leading-relaxed font-body">{alert.remediation}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-container-low">
                        <div className="flex gap-3">
                          <button className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2 font-body">
                            <Zap size={14} /> Execute Suggestion
                          </button>
                          <button
                            onClick={() => ignoreAlert(alert.id)}
                            className="bg-transparent text-muted-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-surface-container-high transition-colors font-body"
                          >
                            Ignore
                          </button>
                        </div>
                        {alert.linkedDecision && (
                          <Link
                            href={`/decisions/${alert.linkedDecision}`}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline font-body"
                          >
                            <BarChart2 size={14} />
                            View Linked Decision #{alert.linkedDecision}
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* System Stability */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
            <h4 className="text-sm font-bold text-foreground tracking-tight mb-4 font-sans">System Stability</h4>
            <div className="flex items-center justify-between">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="8"
                    className="text-surface-container-high" />
                  <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="8"
                    strokeDasharray="251" strokeDashoffset="45" className="text-primary" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black text-foreground font-sans">82</span>
                </div>
              </div>
              <div className="flex-1 ml-6">
                <p className="text-sm font-bold text-emerald-600 mb-1">+4.2%</p>
                <p className="text-xs text-muted-foreground font-medium leading-tight font-body">
                  Current index is optimal. 2 signals under review.
                </p>
              </div>
            </div>
          </div>

          {/* Alert Frequency */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-foreground tracking-tight font-sans">Alert Frequency</h4>
              <span className="text-[10px] font-bold text-amber-700">+12% LW</span>
            </div>
            <div className="flex items-end gap-2 h-24 mb-4 px-2">
              {FREQUENCY_BARS.map((bar, i) => (
                <div
                  key={bar.day}
                  className={`flex-1 rounded-t-sm ${i === 2 ? "bg-primary" : "bg-surface-container-high"}`}
                  style={{ height: bar.h }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-body">
              {FREQUENCY_BARS.map((b) => <span key={b.day}>{b.day}</span>)}
            </div>
          </div>

          {/* Health Scan */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-border">
            <div className="p-4 border-b border-surface-container-low">
              <h4 className="text-sm font-bold text-foreground tracking-tight font-sans">Latest Health Scan</h4>
            </div>
            <table className="w-full text-left">
              <tbody className="text-xs divide-y divide-surface-container-low">
                <tr className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground font-body">Pixel Pulse</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold font-body">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Active
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground font-body">API Latency</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">42ms</td>
                </tr>
                <tr className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground font-body">Auth Token</td>
                  <td className="px-4 py-3 text-right font-bold text-primary font-body">Valid</td>
                </tr>
              </tbody>
            </table>
            <div className="p-4 bg-surface-container-low/50">
              <button className="w-full py-2 text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1.5 font-body">
                Run Full Diagnostic <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-2xl font-extrabold mb-4 text-foreground font-sans">Threshold Configuration</h3>
            <p className="text-foreground/70 leading-relaxed mb-6 max-w-lg font-body">
              Default thresholds: ROAS below <span className="font-bold text-foreground">1.5×</span> and daily spend
              above <span className="font-bold text-foreground">$10,000</span>. Custom threshold management is coming
              in a future release.
            </p>
          </div>
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute top-4 right-8">
            <Zap size={64} className="text-primary/10" />
          </div>
        </div>

        <div className="bg-foreground p-8 rounded-3xl text-white flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="text-emerald-400 mb-4">
              <Zap size={28} />
            </div>
            <h4 className="text-xl font-bold mb-2 font-sans">Decision Engine</h4>
            <p className="text-sm text-white/60 font-body">
              Alerts are generated automatically after each sync and on-demand refresh.
            </p>
          </div>
          <Link
            href="/decisions"
            className="mt-8 text-sm font-extrabold tracking-widest uppercase flex items-center gap-2 hover:gap-4 transition-all text-white font-body"
          >
            View Decisions <ArrowRight size={14} />
          </Link>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  );
}
