"use client";

import { useState } from "react";
import { TrendingUp, CheckCircle, RotateCcw, AlertTriangle, Pause, Play, Activity } from "lucide-react";

type AutomationStatus = "running" | "paused";

interface PlatformDot {
  label: string;
  color: string;
}

interface Automation {
  id: string;
  platforms: PlatformDot[];
  title: string;
  desc: string;
  status: AutomationStatus;
  stat1Label: string;
  stat1Value: string;
  stat1Class?: string;
  stat2Label: string;
  stat2Value: string;
  stat2Class?: string;
}

interface LiveEvent {
  id: string;
  dot: string;
  label: string;
  meta: string;
}

const INITIAL_AUTOMATIONS: Automation[] = [
  {
    id: "auto-001",
    platforms: [
      { label: "Meta", color: "#0668E1" },
      { label: "Google", color: "#4285F4" },
    ],
    title: "Global ROAS Balancer",
    desc: "Managing 142 campaign entities",
    status: "running",
    stat1Label: "Impact",
    stat1Value: "$42,900",
    stat2Label: "ROAS",
    stat2Value: "4.2x",
    stat2Class: "text-emerald-600",
  },
  {
    id: "auto-002",
    platforms: [{ label: "TikTok", color: "#FE2C55" }],
    title: "Creative Saturation Monitor",
    desc: "Monitoring 24 ad groups",
    status: "running",
    stat1Label: "Impact",
    stat1Value: "-$12k CPA",
    stat2Label: "Freq",
    stat2Value: "Real-time",
  },
  {
    id: "auto-003",
    platforms: [{ label: "Meta", color: "#0668E1" }],
    title: "Nightly Budget Scaler",
    desc: "Threshold: 2.5x ROAS min",
    status: "paused",
    stat1Label: "Impact",
    stat1Value: "$8,210",
    stat2Label: "Scale",
    stat2Value: "+15%",
  },
  {
    id: "auto-004",
    platforms: [
      { label: "Google", color: "#4285F4" },
      { label: "TikTok", color: "#FE2C55" },
    ],
    title: "Cross-Channel Bidder",
    desc: "Execution frequency: 5m",
    status: "running",
    stat1Label: "Impact",
    stat1Value: "$19.4k",
    stat2Label: "Efficiency",
    stat2Value: "+9%",
    stat2Class: "text-emerald-600",
  },
];

const LIVE_EVENTS: LiveEvent[] = [
  { id: "e1", dot: "bg-blue-500",  label: "Budget adjusted on Meta Ads",         meta: "2m ago · Campaign: Summer_Launch_24" },
  { id: "e2", dot: "bg-pink-500",  label: "Creative rotated on TikTok Ads",      meta: "8m ago · Group: Youth_Demographic_A" },
  { id: "e3", dot: "bg-yellow-400",label: "Bid scaled on Google Ads",            meta: "14m ago · Search: Luxury_Apparel_High_Intent" },
  { id: "e4", dot: "bg-blue-500",  label: "New Automation instance deployed",    meta: "21m ago · Policy: ROAS_Guard_v2" },
];

export default function AutomationPage() {
  const [automations, setAutomations] = useState<Automation[]>(INITIAL_AUTOMATIONS);
  const [sensitivity, setSensitivity] = useState(64);
  const [globalPaused, setGlobalPaused] = useState(false);

  function toggleStatus(id: string) {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "running" ? "paused" : "running" } : a
      )
    );
  }

  function handlePauseAll() {
    setGlobalPaused(true);
    setAutomations((prev) => prev.map((a) => ({ ...a, status: "paused" })));
  }

  function handleResumeAll() {
    setGlobalPaused(false);
    setAutomations((prev) => prev.map((a) => ({ ...a, status: "running" })));
  }

  const activeCount = automations.filter((a) => a.status === "running").length;

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Automation Status
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-body">
              Mode: Autonomous
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest font-body">Active Automations</p>
            <p className="text-3xl font-black text-foreground font-sans leading-none">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Revenue Impact</span>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <p className="text-4xl font-black text-foreground font-sans">$142.8k</p>
          <p className="text-xs text-muted-foreground mt-1 font-body">+12.4% vs last 30d</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">CPA Improvement</span>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <p className="text-4xl font-black text-foreground font-sans">-18.2%</p>
          <p className="text-xs text-muted-foreground mt-1 font-body">System-wide efficiency</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Exec. Frequency</span>
            <Activity size={18} className="text-primary" />
          </div>
          <p className="text-4xl font-black text-foreground font-sans">1.2m</p>
          <p className="text-xs text-muted-foreground mt-1 font-body">Actions per hour</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Automation Cards */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Active Automations</h3>
            <button className="text-sm font-semibold text-primary font-body">View All →</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {automations.map((auto) => {
              const isRunning = auto.status === "running";
              return (
                <div
                  key={auto.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-primary/10 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {auto.platforms.map((p) => (
                        <span
                          key={p.label}
                          className="bg-surface-container-high text-foreground text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-body"
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          {p.label}
                        </span>
                      ))}
                    </div>

                    {/* Toggle button */}
                    <button
                      onClick={() => toggleStatus(auto.id)}
                      className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all font-body ${
                        isRunning
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      }`}
                      title={isRunning ? "Click to pause" : "Click to resume"}
                    >
                      {isRunning ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Running
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Paused
                        </>
                      )}
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-foreground mb-1 font-sans">{auto.title}</h4>
                  <p className="text-sm text-muted-foreground mb-5 font-body">{auto.desc}</p>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-container-low">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">{auto.stat1Label}</p>
                      <p className={`text-base font-bold font-body ${auto.stat1Class ?? "text-foreground"}`}>{auto.stat1Value}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">{auto.stat2Label}</p>
                      <p className={`text-base font-bold font-body ${auto.stat2Class ?? "text-foreground"}`}>{auto.stat2Value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Activity */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[400px]">
            <div className="p-6 pb-3 border-b border-surface-container-low">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-body">Live Activity</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {LIVE_EVENTS.map((ev) => (
                <div key={ev.id} className="flex gap-3">
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ev.dot}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground font-body">{ev.label}</p>
                    <p className="text-[10px] text-muted-foreground font-body mt-0.5">{ev.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk & Safety */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5 font-body">Risk & Safety</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground font-body">Stop-loss Triggers</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 font-body">Secure</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <RotateCcw size={18} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground font-body">System Rollbacks</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground font-body">0 Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-red-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground font-body">Platform Alerts</span>
                </div>
                <span className="text-xs font-bold text-red-500 font-body">2 Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel Footer */}
      <div className="fixed bottom-0 right-0 left-0 md:left-[17rem] bg-white/90 backdrop-blur-md border-t border-border z-40 px-8 py-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-6">
          {/* Pause / Resume */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePauseAll}
              className="flex items-center gap-2 bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all font-body"
            >
              <Pause size={15} />
              Pause All
            </button>
            <button
              onClick={handleResumeAll}
              className="flex items-center gap-2 bg-surface-container-high text-foreground px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-surface-container-highest active:scale-95 transition-all font-body"
            >
              <Play size={15} />
              Resume
            </button>
          </div>

          {/* Sensitivity Slider */}
          <div className="flex-1 max-w-sm">
            <div className="flex justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                System Sensitivity
              </label>
              <span className="text-[10px] font-black text-primary font-body">
                Balanced ({(sensitivity / 100).toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full h-1.5 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Status */}
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
