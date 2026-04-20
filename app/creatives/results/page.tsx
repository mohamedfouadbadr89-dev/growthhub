"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Sparkles, TrendingUp, Eye, MousePointerClick,
  Download, Pencil, Filter, ArrowUpDown, CheckCircle2,
} from "lucide-react";

const RESULTS = [
  {
    label: "V1 — Summer Glow",
    gradient: "from-blue-500 to-indigo-600",
    score: 9.2, ctr: "3.8%", roas: "5.4x", impressions: "142k",
    badge: "Top Pick", badgeStyle: "bg-primary text-white",
    status: "winner",
  },
  {
    label: "V2 — Bold Contrast",
    gradient: "from-emerald-500 to-teal-600",
    score: 8.7, ctr: "3.2%", roas: "4.9x", impressions: "98k",
    badge: "High CTR", badgeStyle: "bg-emerald-100 text-emerald-700",
    status: "strong",
  },
  {
    label: "V3 — Minimal Clean",
    gradient: "from-slate-600 to-slate-800",
    score: 8.1, ctr: "2.9%", roas: "4.1x", impressions: "87k",
    badge: null, badgeStyle: "",
    status: "good",
  },
  {
    label: "V4 — Warm Tones",
    gradient: "from-orange-400 to-rose-500",
    score: 7.9, ctr: "2.6%", roas: "3.8x", impressions: "74k",
    badge: null, badgeStyle: "",
    status: "good",
  },
  {
    label: "V5 — Dark Luxury",
    gradient: "from-violet-600 to-purple-900",
    score: 7.4, ctr: "2.1%", roas: "3.2x", impressions: "61k",
    badge: null, badgeStyle: "",
    status: "test",
  },
  {
    label: "V6 — Pastel Spring",
    gradient: "from-pink-300 to-fuchsia-400",
    score: 6.8, ctr: "1.8%", roas: "2.7x", impressions: "43k",
    badge: null, badgeStyle: "",
    status: "test",
  },
];

const SORT_OPTIONS = ["AI Score", "CTR", "ROAS", "Impressions"];

export default function CreativeResultsPage() {
  const [sort, setSort] = useState("AI Score");
  const [selected, setSelected] = useState<number[]>([0]);

  const toggleSelect = (i: number) =>
    setSelected((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/creatives">
            <button className="p-2 rounded-xl hover:bg-surface-container-low text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary font-body">Results</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">Creative Results</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selected.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-xl">
              <CheckCircle2 size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary font-body">{selected.length} selected</span>
            </div>
          )}
          <button className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-high text-foreground rounded-xl text-sm font-semibold hover:bg-surface-container-high/80 transition-colors font-body">
            <Download size={15} /> Export All
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-colors font-body">
            <Sparkles size={15} /> Deploy Winners
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { Icon: Sparkles,         label: "Avg AI Score",   value: "8.0",  sub: "Across 6 variants" },
          { Icon: MousePointerClick, label: "Best CTR",       value: "3.8%", sub: "V1 — Summer Glow" },
          { Icon: TrendingUp,        label: "Best ROAS",      value: "5.4x", sub: "V1 — Summer Glow" },
          { Icon: Eye,               label: "Total Reach",    value: "505k", sub: "Combined impressions" },
        ].map((s) => (
          <div key={s.label} className="bg-white p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <s.Icon size={14} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">{s.label}</span>
            </div>
            <p className="text-2xl font-extrabold text-foreground font-sans">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-body">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Sort + Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-surface-container-high p-1 rounded-xl">
          <span className="px-3 text-xs font-bold text-muted-foreground font-body flex items-center gap-1.5">
            <ArrowUpDown size={12} /> Sort:
          </span>
          {SORT_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors font-body ${
                sort === s ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors font-body">
          <Filter size={14} /> Filter
        </button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {RESULTS.map((r, i) => (
          <div
            key={r.label}
            className={`group bg-white rounded-2xl overflow-hidden border-2 transition-all shadow-sm cursor-pointer ${
              selected.includes(i) ? "border-primary shadow-primary/10" : "border-border hover:border-primary/30 hover:shadow-lg"
            }`}
            onClick={() => toggleSelect(i)}
          >
            {/* Creative preview */}
            <div className={`relative aspect-[9/16] bg-gradient-to-br ${r.gradient}`}>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-white text-center">
                <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm" />
                <div className="w-3/4 h-2.5 bg-white/40 rounded-full" />
                <div className="w-1/2 h-2 bg-white/30 rounded-full" />
                <div className="mt-2 w-2/3 h-7 bg-white/20 rounded-lg" />
              </div>
              {r.badge && (
                <span className={`absolute top-3 left-3 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${r.badgeStyle} font-body`}>
                  {r.badge}
                </span>
              )}
              {selected.includes(i) && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              )}
              {/* Hover actions */}
              <div className="absolute bottom-0 inset-x-0 p-3 opacity-0 group-hover:opacity-100 transition-all">
                <div className="flex gap-2">
                  <Link href="/creatives/editor" className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <button className="w-full py-2 bg-white/90 backdrop-blur text-foreground text-xs font-bold rounded-xl hover:bg-white transition-colors font-body flex items-center justify-center gap-1">
                      <Pencil size={11} /> Edit
                    </button>
                  </Link>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-white/90 backdrop-blur rounded-xl text-foreground hover:text-primary transition-colors"
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground font-body truncate">{r.label}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Sparkles size={10} className="text-primary" />
                  <span className="text-xs font-black text-primary font-body">{r.score}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "CTR",    value: r.ctr },
                  { label: "ROAS",   value: r.roas },
                  { label: "Reach",  value: r.impressions },
                ].map((m) => (
                  <div key={m.label} className="bg-surface-container-low rounded-lg p-2 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase font-body">{m.label}</p>
                    <p className="text-xs font-black text-foreground font-sans">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
