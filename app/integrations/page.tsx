"use client";

import {
  Globe,
  MousePointerClick,
  Zap,
  Wind,
  ShoppingBag,
  BarChart3,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Search,
} from "lucide-react";

const INTEGRATIONS = [
  {
    iconBg: "bg-blue-50",
    Icon: Globe,
    iconColor: "text-blue-600",
    name: "Meta Ads",
    desc: "Automate ad spend optimizations and creative rotations across FB and Instagram.",
    connected: true,
    tags: ["Campaigns", "Creatives"],
  },
  {
    iconBg: "bg-amber-50",
    Icon: MousePointerClick,
    iconColor: "text-amber-600",
    name: "Google Ads",
    desc: "Execution for Search, Display, and Video campaigns based on real-time ROI.",
    connected: true,
    tags: ["Campaigns", "Keywords"],
  },
  {
    iconBg: "bg-slate-900",
    Icon: Zap,
    iconColor: "text-white",
    name: "TikTok Ads",
    desc: "Leverage high-velocity creative testing and automated bid management.",
    connected: false,
    tags: ["Creatives", "Events"],
  },
  {
    iconBg: "bg-yellow-400",
    Icon: Wind,
    iconColor: "text-black",
    name: "Snapchat Ads",
    desc: "Reach younger demographics with automated Snap-native creative execution.",
    connected: false,
    tags: ["Campaigns"],
  },
  {
    iconBg: "bg-green-50",
    Icon: ShoppingBag,
    iconColor: "text-green-600",
    name: "Shopify",
    desc: "Pull first-party order data to fuel precision AI optimization algorithms.",
    connected: true,
    tags: ["Orders", "Customers"],
  },
  {
    iconBg: "bg-orange-50",
    Icon: BarChart3,
    iconColor: "text-orange-600",
    name: "Google Analytics 4",
    desc: "Track events and user behavior to inform cross-channel execution decisions.",
    connected: true,
    tags: ["Events", "Audiences"],
  },
];

const API_STATUS = [
  { name: "Meta Graph",  status: "99.9%",   statusColor: "text-emerald-600", Icon: CheckCircle2, iconColor: "text-blue-600" },
  { name: "Google Ads",  status: "Delayed",  statusColor: "text-amber-600",  Icon: RefreshCw,    iconColor: "text-amber-500" },
  { name: "TikTok API",  status: "Offline",  statusColor: "text-muted-foreground", Icon: CloudOff, iconColor: "text-muted-foreground", dim: true },
];

const CATEGORY_TABS = ["All", "Ads Platforms", "Analytics", "Data", "CRM"];

export default function IntegrationsPage() {
  return (
    <div className="flex gap-8 pb-12">
      {/* Main Content */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Header */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Data Ecosystem
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Integrations</h2>
          <p className="text-muted-foreground mt-2 font-body">Connect and manage your AI data ecosystem.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex bg-surface-container-high p-1 rounded-xl">
            {CATEGORY_TABS.map((tab, i) => (
              <button
                key={tab}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors font-body ${
                  i === 0
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 font-body">Status:</span>
            <button className="px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5 rounded-full transition-colors border border-primary/20 font-body">
              Connected
            </button>
            <button className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-surface-container-high rounded-full transition-colors font-body">
              Not Connected
            </button>
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INTEGRATIONS.map((item) => (
            <div
              key={item.name}
              className="bg-white p-6 rounded-2xl transition-all hover:shadow-xl border border-transparent hover:border-primary/5 group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                  <item.Icon size={24} className={item.iconColor} />
                </div>
                {item.connected ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest font-body">
                    Connected
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-surface-container-high text-muted-foreground text-[10px] font-black uppercase tracking-widest font-body">
                    Not Connected
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-foreground font-sans">{item.name}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed font-body">{item.desc}</p>

              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground font-body">
                    {item.connected ? "Synced Entities" : "Available Entities"}
                  </span>
                  <div className={`flex gap-1.5 ${!item.connected ? "opacity-50" : ""}`}>
                    {item.tags.map((tag) => (
                      <span key={tag} className="bg-surface-container-high px-2 py-0.5 rounded text-muted-foreground font-body text-[11px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                {item.connected ? (
                  <div className="flex gap-3">
                    <button className="flex-1 py-2 rounded-xl bg-surface-container-high text-foreground text-sm font-bold hover:bg-surface-container-high/80 transition-colors font-body">
                      Manage
                    </button>
                    <button className="px-3 py-2 rounded-xl text-red-600 text-sm font-medium hover:bg-red-50 transition-colors font-body">
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all font-body">
                    Connect {item.name.split(" ")[0]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <footer className="pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center uppercase tracking-[0.2em] font-bold font-body">
            All integrations power the execution system in real-time
          </p>
        </footer>
      </div>

      {/* Right Panel: Data Pipeline Health */}
      <aside className="w-80 shrink-0">
        <div className="sticky top-24 space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground font-body">
            Data Pipeline Health
          </h4>

          {/* Sync Status */}
          <div className="bg-white p-5 rounded-2xl border border-primary/10 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-foreground font-body">Overall Sync Status</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-body">Sync State</p>
                <p className="text-lg font-black text-emerald-600 font-sans">Healthy</p>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium font-body">Last sync: 2m ago</p>
            </div>
          </div>

          {/* Live API Monitor */}
          <div>
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 font-body">
              Live API Monitor
            </h5>
            <div className="space-y-3">
              {API_STATUS.map((api) => (
                <div
                  key={api.name}
                  className={`flex items-center justify-between p-3 bg-surface-container-high rounded-xl ${api.dim ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <api.Icon size={16} className={api.iconColor} />
                    <span className="text-xs font-bold text-foreground font-body">{api.name}</span>
                  </div>
                  <span className={`text-[10px] font-black font-body ${api.statusColor}`}>{api.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action */}
          <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
            <p className="text-xs font-medium text-foreground leading-relaxed font-body">
              System is currently processing{" "}
              <span className="font-black">1.2GB</span> of execution data per hour.
            </p>
            <button className="mt-4 w-full py-2 bg-white text-primary text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:shadow-md transition-shadow font-body">
              View Logs
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
