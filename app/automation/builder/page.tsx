"use client";

import { useState } from "react";
import {
  Sparkles, Play, Save, Zap, ChevronDown, Send,
  CheckCircle, Terminal, RefreshCw, TrendingDown, HelpCircle,
} from "lucide-react";

type ExecMode = "pan" | "add" | "search";

const SUGGESTIONS = [
  "Pause low ROAS campaigns",
  "Scale winning ads",
  "Alert Slack if CPM > $50",
];

const TIMEFRAME_OPTIONS = ["Last 24 Hours", "Last 72 Hours", "Last 7 Days", "Yesterday"];

const LOGIC_LINES = [
  { indent: false, keyword: "IF",   part: "[Revenue]",                   partClass: "bg-white text-foreground" },
  { indent: true,  keyword: "Is Less Than", part: "1000",                partClass: "bg-white text-foreground" },
  { indent: false, keyword: "AND",  part: "[Spend]",                     partClass: "bg-white text-foreground" },
  { indent: true,  keyword: "Is Greater Than", part: "500",              partClass: "bg-white text-foreground" },
  { indent: false, keyword: "THEN", part: "Notify Channel #alerts",      partClass: "bg-primary text-white font-bold" },
];

export default function BuilderPage() {
  const [workflowName, setWorkflowName] = useState("New Growth Loop");
  const [activeTool, setActiveTool] = useState<ExecMode>("pan");
  const [threshold, setThreshold] = useState("2.5");
  const [timeframe, setTimeframe] = useState("Last 72 Hours");
  const [prompt, setPrompt] = useState("");
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleActivate() {
    setActivating(true);
    setTimeout(() => {
      setActivating(false);
      setActivated(true);
    }, 1400);
  }

  function handleSaveDraft() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 900);
  }

  const TOOLS: { key: ExecMode; icon: string }[] = [
    { key: "pan",    icon: "✥" },
    { key: "add",    icon: "+" },
    { key: "search", icon: "⌕" },
  ];

  return (
    <div className="space-y-0 -mx-6 -mt-6 flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Builder Topbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md border-b border-border/40 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-body">⬡</span>
            <input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-base font-bold text-foreground bg-transparent border-none outline-none focus:ring-0 font-sans w-48"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-primary font-semibold hover:bg-primary/5 rounded-xl transition-all text-sm font-body">
            <Play size={14} />
            Test
          </button>
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-muted-foreground font-semibold rounded-xl hover:bg-surface-container-high transition-all text-sm font-body"
          >
            <Save size={14} />
            {saved ? "Saved!" : saving ? "Saving…" : "Save Draft"}
          </button>
          {activated ? (
            <button className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl text-sm font-body" disabled>
              <CheckCircle size={14} />
              Active
            </button>
          ) : (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm font-body"
            >
              {activating && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {activating ? "Activating…" : "Activate"}
            </button>
          )}
        </div>
      </div>

      {/* Main: Canvas + Config Panel */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="absolute top-5 left-5 z-10 flex gap-2">
            <div className="flex p-1 bg-white shadow-xl shadow-primary/5 rounded-2xl border border-border/30">
              {TOOLS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTool(t.key)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                    activeTool === t.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-surface-container-low"
                  }`}
                >
                  {t.icon}
                </button>
              ))}
            </div>
            <div className="px-4 h-10 bg-white shadow-xl shadow-primary/5 rounded-2xl border border-border/30 flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Zoom</span>
              <span className="text-sm font-semibold text-foreground font-body">100%</span>
            </div>
          </div>

          {/* Dot-grid canvas */}
          <div
            className="flex-1 relative overflow-auto"
            style={{
              backgroundImage: "radial-gradient(#dce9ff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              backgroundColor: "#f8faff",
            }}
          >
            {/* Flow Nodes */}
            <div className="flex flex-col items-center pt-20 pb-8 gap-0 min-h-full">
              {/* Trigger Node */}
              <div className="relative z-20">
                <div className="w-72 bg-white p-5 rounded-2xl shadow-lg border-2 border-primary ring-4 ring-primary/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter font-body">
                      Trigger
                    </span>
                    <Zap size={16} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-1 text-foreground font-sans leading-tight">New Conversion Event</h3>
                  <p className="text-sm text-muted-foreground font-body">Fires when a Purchase or Sign-up occurs in Pixel ID: 2981-A</p>
                </div>
                {/* Connector */}
                <div className="flex justify-center">
                  <div
                    className="w-0.5 h-12 mt-0"
                    style={{
                      background: "repeating-linear-gradient(to bottom, #005bc4, #005bc4 4px, transparent 4px, transparent 8px)",
                    }}
                  />
                </div>
              </div>

              {/* Condition Node */}
              <div className="relative z-20">
                <div className="w-64 bg-surface-container-high p-6 rounded-[2rem] shadow-md border-2 border-transparent hover:scale-105 transition-transform">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                      <HelpCircle size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-primary font-sans">If ROAS &lt; 2.5</h3>
                      <p className="text-xs text-muted-foreground font-body mt-1">Calculated over last 72 hours</p>
                    </div>
                  </div>
                </div>
                {/* Connector */}
                <div className="flex justify-center">
                  <div
                    className="w-0.5 h-12"
                    style={{
                      background: "repeating-linear-gradient(to bottom, #005bc4, #005bc4 4px, transparent 4px, transparent 8px)",
                    }}
                  />
                </div>
              </div>

              {/* Action Node */}
              <div className="relative z-20">
                <div className="w-72 bg-surface-container-low p-5 rounded-2xl shadow-lg border-2 border-muted-foreground/20 hover:border-primary/40 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-surface-container-high text-muted-foreground text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter font-body">
                      Action
                    </span>
                    <TrendingDown size={16} className="text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-lg mb-1 text-foreground font-sans leading-tight">Scale Down Budget by 15%</h3>
                  <p className="text-sm text-muted-foreground font-body">Update campaign daily limit on Meta Ads Manager</p>
                </div>
              </div>

              {/* Add node button */}
              <div className="flex justify-center mt-8">
                <button className="w-10 h-10 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center text-primary hover:bg-primary/5 transition-all text-xl font-light">
                  +
                </button>
              </div>
            </div>
          </div>

          {/* AI Builder Drawer */}
          <div className="bg-white border-t border-border/40 px-6 py-4 shadow-2xl shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 relative">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="What do you want to automate?"
                    className="w-full bg-surface-container-low border-none rounded-xl py-3.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-body text-sm"
                  />
                  <Sparkles size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                </div>
                <button className="bg-primary text-white p-3.5 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
                  <Send size={16} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body mr-1">Suggestions:</span>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="bg-surface-container-high text-foreground px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-surface-container-highest transition-all font-body"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Config Panel */}
        <aside className="w-72 bg-surface-container-low border-l border-border/30 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 border-b border-border/30">
            <h2 className="font-bold text-foreground font-sans mb-1">Node Configuration</h2>
            <p className="text-xs text-muted-foreground font-body">Modify logic and parameters for the selected node.</p>
          </div>

          <div className="flex-1 p-5 flex flex-col gap-6">
            {/* Rule Definition */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Rule Definition</label>

              <div>
                <p className="text-[10px] text-primary font-bold mb-1 font-body">THRESHOLD</p>
                <div className="relative">
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full bg-white border border-border/40 rounded-xl p-3 font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body text-sm"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground font-body">ROAS</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-primary font-bold mb-1 font-body">TIMEFRAME</p>
                <div className="relative">
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full bg-white border border-border/40 rounded-xl p-3 font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none font-body text-sm pr-8 cursor-pointer"
                  >
                    {TIMEFRAME_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Logic Preview */}
            <div className="bg-white rounded-xl border border-border/30 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Terminal size={13} className="text-primary" />
                <span className="text-xs font-bold uppercase tracking-tighter text-foreground font-body">Logic Preview</span>
              </div>
              <div className="space-y-2 font-mono text-[11px] leading-relaxed">
                {LOGIC_LINES.map((line, i) => (
                  <div key={i} className={`flex items-center gap-2 ${line.indent ? "pl-4" : ""}`}>
                    <span className={`font-bold ${line.keyword === "IF" || line.keyword === "AND" || line.keyword === "THEN" ? "text-primary" : "text-muted-foreground"}`}>
                      {line.keyword}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] shadow-sm ${line.partClass}`}>
                      {line.part}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Update Logic Button */}
            <button className="w-full flex items-center justify-center gap-2 p-4 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-colors font-body text-sm">
              <RefreshCw size={15} />
              Update Logic
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
