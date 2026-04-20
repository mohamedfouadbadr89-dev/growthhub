"use client";

import Link from "next/link";
import { ScrollText, Cpu, Plus, Zap, TrendingUp, RefreshCw, ShieldCheck, ArrowRight } from "lucide-react";

const ACTION_CARDS = [
  {
    Icon: Zap,
    iconBg: "bg-primary/10", iconColor: "text-primary",
    title: "Scale ROAS Outliers",
    desc: "Increment daily budget by 20% every 48h for high-ROAS campaigns until cap is reached.",
    status: "Active", statusStyle: "bg-emerald-100 text-emerald-700",
    impact: "+$12.4k", impactLabel: "Revenue Uplift",
    href: "/actions/1",
  },
  {
    Icon: TrendingUp,
    iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
    title: "Google Bid Optimizer",
    desc: "Adjust ROAS targets by +15% to capture higher value auctions across Search campaigns.",
    status: "Active", statusStyle: "bg-emerald-100 text-emerald-700",
    impact: "+9%", impactLabel: "Efficiency Gain",
    href: "/actions/2",
  },
  {
    Icon: RefreshCw,
    iconBg: "bg-amber-100", iconColor: "text-amber-600",
    title: "Lookalike Audience Refresh",
    desc: "Sync 1% lookalike audiences from high-LTV seed lists every 7 days.",
    status: "Paused", statusStyle: "bg-amber-100 text-amber-700",
    impact: "2.4M", impactLabel: "Est. Reach",
    href: "/actions/3",
  },
  {
    Icon: ShieldCheck,
    iconBg: "bg-surface-container-high", iconColor: "text-muted-foreground",
    title: "Stop-Loss Guard",
    desc: "Automatically pause any campaign where ROAS drops below 2.0x for 3+ consecutive hours.",
    status: "Monitoring", statusStyle: "bg-surface-container-high text-muted-foreground",
    impact: "22%", impactLabel: "Risk Threshold",
    href: "/actions/4",
  },
];

const QUICK_LINKS = [
  { Icon: ScrollText, label: "Execution Logs", href: "/actions/logs",       desc: "View all recent executions" },
  { Icon: Cpu,        label: "Automation",     href: "/actions/automation", desc: "Manage running automations" },
];

export default function ActionsLibraryPage() {
  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Execution Engine
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Actions Library</h2>
          <p className="text-muted-foreground mt-2 font-body">
            Configure, run, and monitor all automated actions across your platforms.
          </p>
        </div>
        <Link href="/actions/1">
          <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-[#2563eb] text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity font-body">
            <Plus size={16} /> New Action
          </button>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUICK_LINKS.map((q) => (
          <Link key={q.label} href={q.href}>
            <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4 hover:border-primary/20 hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                <q.Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground font-body">{q.label}</p>
                <p className="text-xs text-muted-foreground font-body">{q.desc}</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Actions Grid */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 font-body">
          Configured Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ACTION_CARDS.map((a) => (
            <Link key={a.title} href={a.href}>
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group cursor-pointer flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.iconBg}`}>
                    <a.Icon size={22} className={a.iconColor} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest font-body ${a.statusStyle}`}>
                    {a.status}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2 font-sans group-hover:text-primary transition-colors">
                  {a.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-body flex-1">{a.desc}</p>
                <div className="pt-4 border-t border-surface-container-low flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter font-body">
                      {a.impactLabel}
                    </p>
                    <p className="text-lg font-black text-foreground font-sans">{a.impact}</p>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
