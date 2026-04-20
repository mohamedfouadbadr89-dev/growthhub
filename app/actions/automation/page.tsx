"use client";

import { TrendingUp, BadgeCheck, Zap, ArrowRight, CheckCircle2, History, AlertTriangle, PauseCircle, Play } from "lucide-react";

const METRICS = [
  { label: "Revenue Impact",   value: "$142.8k", sub: "+12.4% vs last 30d", Icon: TrendingUp,  iconColor: "text-emerald-500" },
  { label: "CPA Improvement",  value: "-18.2%",  sub: "System-wide efficiency", Icon: BadgeCheck, iconColor: "text-emerald-500" },
  { label: "Exec. Frequency",  value: "1.2m",    sub: "Actions per hour",    Icon: Zap,         iconColor: "text-primary" },
];

const PLATFORM_DOT: Record<string, string> = {
  "Meta":   "bg-[#0668E1]",
  "Google": "bg-[#4285F4]",
  "TikTok": "bg-[#FE2C55]",
  "Snap":   "bg-[#FFFC00]",
};

const AUTOMATIONS = [
  {
    platforms: ["Meta", "Google"],
    status: "Running", statusStyle: "bg-emerald-100 text-emerald-700",
    title: "Global ROAS Balancer",
    desc: "Managing 142 campaign entities",
    stat1Label: "Impact", stat1Value: "$42,900", stat1Color: "text-foreground",
    stat2Label: "ROAS",   stat2Value: "4.2x",    stat2Color: "text-emerald-600",
  },
  {
    platforms: ["TikTok"],
    status: "Running", statusStyle: "bg-emerald-100 text-emerald-700",
    title: "Creative Saturation Monitor",
    desc: "Monitoring 24 ad groups",
    stat1Label: "Impact", stat1Value: "-$12k CPA", stat1Color: "text-foreground",
    stat2Label: "Freq",   stat2Value: "Real-time",  stat2Color: "text-foreground",
  },
  {
    platforms: ["Meta"],
    status: "Paused", statusStyle: "bg-amber-100 text-amber-700",
    title: "Nightly Budget Scaler",
    desc: "Threshold: 2.5x ROAS min",
    stat1Label: "Impact", stat1Value: "$8,210", stat1Color: "text-foreground",
    stat2Label: "Scale",  stat2Value: "+15%",   stat2Color: "text-foreground",
  },
  {
    platforms: ["Google", "TikTok"],
    status: "Running", statusStyle: "bg-emerald-100 text-emerald-700",
    title: "Cross-Channel Bidder",
    desc: "Execution frequency: 5m",
    stat1Label: "Impact",     stat1Value: "$19.4k", stat1Color: "text-foreground",
    stat2Label: "Efficiency", stat2Value: "+9%",    stat2Color: "text-emerald-600",
  },
];

const LIVE_ACTIVITY = [
  { dot: "bg-blue-500",   title: "Budget adjusted on Meta Ads",          sub: "2m ago • Campaign: Summer_Launch_24" },
  { dot: "bg-pink-500",   title: "Creative rotated on TikTok Ads",        sub: "8m ago • Group: Youth_Demographic_A" },
  { dot: "bg-yellow-400", title: "Bid scaled on Google Ads",              sub: "14m ago • Search: Luxury_Apparel_High_Intent" },
  { dot: "bg-blue-500",   title: "New Automation instance deployed",      sub: "21m ago • Policy: ROAS_Guard_v2" },
];

export default function AutomationPage() {
  return (
    <div className="space-y-8 pb-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-white p-6 rounded-3xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                {m.label}
              </span>
              <m.Icon size={20} className={m.iconColor} />
            </div>
            <div className="text-4xl font-black text-foreground font-sans">{m.value}</div>
            <p className="text-xs text-muted-foreground mt-1 font-body">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Active Automations */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Active Automations</h3>
            <button className="text-sm font-semibold text-primary flex items-center gap-1 font-body">
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {AUTOMATIONS.map((a) => (
              <div
                key={a.title}
                className="bg-white p-6 rounded-3xl shadow-sm border border-transparent hover:border-primary/10 transition-all"
              >
                <div className="flex justify-between mb-4">
                  <div className="flex gap-2">
                    {a.platforms.map((p) => (
                      <div key={p} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-body">
                        <div className={`w-1 h-1 rounded-full ${PLATFORM_DOT[p]}`} /> {p}
                      </div>
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider font-body ${a.statusStyle}`}>
                    {a.status}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-foreground mb-1 font-sans">{a.title}</h4>
                <p className="text-sm text-muted-foreground mb-6 font-body">{a.desc}</p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-container-low">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                      {a.stat1Label}
                    </div>
                    <div className={`text-base font-bold font-body ${a.stat1Color}`}>{a.stat1Value}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                      {a.stat2Label}
                    </div>
                    <div className={`text-base font-bold font-body ${a.stat2Color}`}>{a.stat2Value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          {/* Live Activity */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-6 pb-2 border-b border-surface-container-low">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground font-body">
                Live Activity
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {LIVE_ACTIVITY.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.dot}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground font-body">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground font-body">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk & Safety */}
          <div className="bg-white p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 font-body">
              Risk &amp; Safety
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <span className="text-sm font-medium font-body">Stop-loss Triggers</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 font-body">Secure</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl">
                <div className="flex items-center gap-3">
                  <History size={20} className="text-emerald-500" />
                  <span className="text-sm font-medium font-body">System Rollbacks</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground font-body">0 Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#ffdad6]/20 rounded-2xl border border-error/10">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-error fill-error" />
                  <span className="text-sm font-medium font-body">Platform Alerts</span>
                </div>
                <span className="text-xs font-bold text-error font-body">2 Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white/85 backdrop-blur-md border border-border rounded-2xl px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button className="bg-error text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-colors font-body">
              <PauseCircle size={16} /> Pause all
            </button>
            <button className="bg-surface-container-high text-foreground px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-container-highest transition-colors font-body">
              <Play size={16} /> Resume
            </button>
          </div>

          <div className="flex-1 max-w-md w-full flex items-center gap-6">
            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                  System Sensitivity
                </label>
                <span className="text-[10px] font-black text-primary font-body">Balanced (0.64)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="64"
                className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground font-body">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Systems Operational</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <span>Last Sync: 12s ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
