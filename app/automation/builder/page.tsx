"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Play, Save, Zap, GitBranch, ChevronDown,
  History, MoreHorizontal, Plus, Send, Sparkles,
  TrendingDown, Bell, Filter, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FLOW_NODES = [
  {
    type: "trigger",
    label: "Trigger",
    title: "New Conversion Event",
    sub: "When a conversion is recorded",
    borderColor: "border-primary",
    bgColor: "bg-primary/5",
    iconBg: "bg-primary",
    Icon: Zap,
    iconColor: "text-white",
    badge: "Trigger",
    badgeBg: "bg-primary/10 text-primary",
  },
  {
    type: "condition",
    label: "Condition",
    title: "If ROAS < 2.5",
    sub: "Over 7-day rolling window",
    borderColor: "border-amber-400",
    bgColor: "bg-amber-50",
    iconBg: "bg-amber-400",
    Icon: Filter,
    iconColor: "text-white",
    badge: "Condition",
    badgeBg: "bg-amber-100 text-amber-700",
  },
  {
    type: "action",
    label: "Action",
    title: "Scale Down Budget by 15%",
    sub: "Apply to all active ad sets",
    borderColor: "border-emerald-500",
    bgColor: "bg-emerald-50",
    iconBg: "bg-emerald-500",
    Icon: TrendingDown,
    iconColor: "text-white",
    badge: "Action",
    badgeBg: "bg-emerald-100 text-emerald-700",
  },
];

const SUGGESTIONS = [
  "Pause low ROAS campaigns",
  "Scale winning ads",
  "Alert Slack if CPM > $50",
];

export default function AutomationBuilderPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedNode, setSelectedNode] = useState<number>(1);
  const [threshold, setThreshold] = useState("2.5");
  const [timeframe, setTimeframe] = useState("7-day rolling");

  return (
    <div className="-m-8 lg:-m-12 min-h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Top bar */}
      <div className="h-14 bg-white border-b border-border flex items-center px-4 gap-4 shrink-0 z-20">
        <Link href="/automation" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm font-bold font-body">Back</span>
        </Link>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <GitBranch size={12} className="text-white" />
          </div>
          <span className="text-sm font-bold text-foreground font-sans">New Growth Loop</span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="p-2 hover:bg-surface-container-high rounded-lg text-muted-foreground transition-colors">
            <History size={16} />
          </button>
          <button className="p-2 hover:bg-surface-container-high rounded-lg text-muted-foreground transition-colors">
            <MoreHorizontal size={16} />
          </button>
          <div className="w-px h-5 bg-border" />
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-foreground rounded-xl text-sm font-bold hover:bg-surface-container-high/80 transition-colors font-body">
            <Play size={14} /> Test
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-foreground rounded-xl text-sm font-bold hover:bg-surface-container-high/80 transition-colors font-body">
            <Save size={14} /> Save Draft
          </button>
          <button className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 font-body">
            <Zap size={14} /> Activate
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-[#f8f9ff]" style={{
          backgroundImage: "radial-gradient(circle, #91b4e430 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}>
          {/* Centered flow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-0">
              {FLOW_NODES.map((node, i) => (
                <div key={node.type} className="flex flex-col items-center">
                  {/* Connector line above (except first) */}
                  {i > 0 && (
                    <div className="flex flex-col items-center">
                      <div className="w-px h-8 border-l-2 border-dashed border-primary/30" />
                      <div className="w-5 h-5 rounded-full bg-white border-2 border-primary/30 flex items-center justify-center mb-0">
                        <Plus size={10} className="text-primary/40" />
                      </div>
                      <div className="w-px h-4 border-l-2 border-dashed border-primary/30" />
                    </div>
                  )}

                  {/* Node card */}
                  <button
                    onClick={() => setSelectedNode(i)}
                    className={cn(
                      "w-72 rounded-2xl border-2 p-5 text-left shadow-sm transition-all",
                      node.bgColor,
                      selectedNode === i ? node.borderColor + " shadow-lg" : "border-transparent hover:" + node.borderColor
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl ${node.iconBg} flex items-center justify-center shrink-0`}>
                        <node.Icon size={16} className={node.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full font-body ${node.badgeBg}`}>
                            {node.badge}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground font-sans">{node.title}</p>
                        <p className="text-xs text-muted-foreground font-body mt-0.5">{node.sub}</p>
                      </div>
                    </div>
                  </button>
                </div>
              ))}

              {/* Add node button */}
              <div className="flex flex-col items-center">
                <div className="w-px h-6 border-l-2 border-dashed border-primary/30" />
                <button className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-primary/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all group">
                  <Plus size={16} className="text-primary/40 group-hover:text-primary" />
                </button>
              </div>
            </div>
          </div>

          {/* AI Builder drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-border p-4 z-10">
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary font-body">AI Builder</span>
              </div>
              <div className="flex gap-3">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='Describe your automation... e.g. "Pause ads if ROAS drops below 2"'
                  className="flex-1 bg-surface-container-low rounded-xl px-4 py-3 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 ring-primary/20"
                />
                <button className="px-4 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20 font-body flex items-center gap-2">
                  <Send size={14} /> Build
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="px-3 py-1.5 bg-primary/5 text-primary text-xs font-semibold rounded-full hover:bg-primary/10 transition-colors font-body"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right config panel */}
        <div className="w-80 bg-white border-l border-border flex flex-col overflow-y-auto shrink-0">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-extrabold text-foreground font-sans">Node Configuration</h3>
            <p className="text-xs text-muted-foreground font-body mt-1">
              {FLOW_NODES[selectedNode]?.title}
            </p>
          </div>

          <div className="p-5 space-y-6 flex-1">
            {/* Rule Definition */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-body">Rule Definition</h4>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground font-body">ROAS Threshold</label>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground font-body">Below</span>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    step="0.1"
                    className="w-20 bg-surface-container-low rounded-lg px-3 py-2 text-sm font-bold text-foreground font-mono focus:outline-none focus:ring-2 ring-primary/20 text-center"
                  />
                  <span className="text-xs text-muted-foreground font-body">× ROAS</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground font-body">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-2 ring-primary/20"
                >
                  {["3-day rolling", "7-day rolling", "14-day rolling", "30-day rolling"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logic Preview */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-body">Logic Preview</h4>
              <div className="bg-foreground rounded-xl p-4 space-y-1 font-mono text-xs">
                <p className="text-emerald-400">IF</p>
                <p className="text-white pl-3">conversion_event <span className="text-primary/70">triggered</span></p>
                <p className="text-emerald-400 mt-1">AND</p>
                <p className="text-white pl-3">roas_7d <span className="text-amber-400">&lt;</span> <span className="text-amber-300">{threshold}</span></p>
                <p className="text-emerald-400 mt-1">THEN</p>
                <p className="text-white pl-3">budget <span className="text-primary">*= 0.85</span></p>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-border">
            <button className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20 font-body flex items-center justify-center gap-2">
              <ArrowRight size={14} /> Update Logic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
