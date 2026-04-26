"use client";

import { useState } from "react";
import {
  Filter, ArrowLeftRight, ChevronDown, TrendingUp, Zap,
  ArrowRight, Check, MoreVertical, Sparkles, Download,
} from "lucide-react";

type Platform = "All Platforms" | "Meta" | "Google" | "TikTok";
type Format = "Format" | "Video" | "Image" | "UGC";

interface TopPerformer {
  id: string;
  tag: string;
  tagClass: string;
  badge: string;
  badgeIcon: "trending" | "zap";
  badgeClass: string;
  title: string;
  desc: string;
  score: number;
  lift: string;
  gradient: string;
}

interface Variant {
  id: string;
  platform: string;
  format: string;
  score: number;
  title: string;
  ctr: string;
  engage: string;
  conv: string;
  convClass: string;
  gradient: string;
}

const TOP_PERFORMERS: TopPerformer[] = [
  {
    id: "tp-001",
    tag: "Meta Hero",
    tagClass: "bg-primary/10 text-primary",
    badge: "High Performance",
    badgeIcon: "trending",
    badgeClass: "text-orange-600",
    title: "The Architecture of Performance",
    desc: "Leveraging geometric depth and contrasting focus points to stop the scroll.",
    score: 98,
    lift: "+24%",
    gradient: "linear-gradient(135deg, #05345c 0%, #005bc4 60%, #3d618c 100%)",
  },
  {
    id: "tp-002",
    tag: "TikTok Wave",
    tagClass: "bg-surface-container-high text-foreground",
    badge: "Engagement Lead",
    badgeIcon: "zap",
    badgeClass: "text-primary",
    title: "Digital Pulse Dynamics",
    desc: "High-tempo transitions designed for shorter attention spans.",
    score: 95,
    lift: "+18%",
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  },
];

const VARIANTS: Variant[] = [
  {
    id: "v-001",
    platform: "META",
    format: "IMAGE",
    score: 89,
    title: "Streamlining Enterprise Execution at Scale",
    ctr: "3.8%",
    engage: "8.4",
    conv: "High",
    convClass: "text-orange-600",
    gradient: "linear-gradient(135deg, #005bc4 0%, #3d618c 100%)",
  },
  {
    id: "v-002",
    platform: "GOOGLE",
    format: "VIDEO",
    score: 82,
    title: "Visualizing The Future of Intelligence",
    ctr: "2.4%",
    engage: "6.1",
    conv: "Med",
    convClass: "text-muted-foreground",
    gradient: "linear-gradient(135deg, #05345c 0%, #1a5276 100%)",
  },
  {
    id: "v-003",
    platform: "TIKTOK",
    format: "UGC",
    score: 94,
    title: "Data-Driven Growth Strategies",
    ctr: "4.1%",
    engage: "9.2",
    conv: "High",
    convClass: "text-orange-600",
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #005bc4 100%)",
  },
];

const PERFORMANCE_METRICS = [
  { label: "Color Saturation", value: 88, barClass: "bg-primary" },
  { label: "Hook Strength",    value: 94, barClass: "bg-orange-500" },
  { label: "Visual Complexity",value: 62, barClass: "bg-blue-400"  },
];

const WINNING_ELEMENTS = ["Minimalist Typography", "Dark Mode UI", "Geometric Overlays", "Face Forward"];

const PLATFORMS: Platform[] = ["All Platforms", "Meta", "Google", "TikTok"];
const FORMATS: Format[]   = ["Format", "Video", "Image", "UGC"];

export default function CreativeResultsPage() {
  const [platform, setPlatform] = useState<Platform>("All Platforms");
  const [format, setFormat]     = useState<Format>("Format");
  const [selectMode, setSelectMode] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set(["v-001", "v-002", "v-003"]));
  const [pushing, setPushing]   = useState<Record<string, boolean>>({});
  const [pushed, setPushed]     = useState<Record<string, boolean>>({});

  function toggleSelect(id: string) {
    if (!selectMode) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handlePush(id: string) {
    if (pushed[id]) return;
    setPushing((s) => ({ ...s, [id]: true }));
    setTimeout(() => {
      setPushing((s) => ({ ...s, [id]: false }));
      setPushed((s) => ({ ...s, [id]: true }));
    }, 1200);
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Creative Results
          </h1>
          <p className="text-muted-foreground font-body">AI-generated variants — scored, ranked, and ready to deploy</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter cluster */}
          <div className="flex items-center gap-3 bg-surface-container-high rounded-full px-4 py-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground font-body">
              <Filter size={13} />
              Filters:
            </div>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="bg-transparent border-none text-xs font-medium focus:ring-0 cursor-pointer p-0 pr-4 text-foreground font-body"
            >
              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <div className="w-px h-3 bg-border" />
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
              className="bg-transparent border-none text-xs font-medium focus:ring-0 cursor-pointer p-0 pr-4 text-foreground font-body"
            >
              {FORMATS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>

          <button className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-full text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity font-body">
            <ArrowLeftRight size={13} />
            Compare Selected ({selected.size})
          </button>

          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-body">Sort by</span>
            <span className="text-xs font-bold text-primary font-body">Best Performing</span>
            <ChevronDown size={13} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-8 items-start">

        {/* Left: Content */}
        <div className="flex-1 space-y-12 min-w-0">

          {/* Section 1: Top Performers */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground font-sans">Top Performer Suggestions</h3>
              <button className="text-xs font-medium text-primary hover:underline font-body">View Performance Report</button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {TOP_PERFORMERS.map((tp) => (
                <div key={tp.id} className="relative overflow-hidden rounded-3xl bg-white shadow-sm flex h-72">
                  {/* Gradient image area */}
                  <div className="w-2/5 relative shrink-0">
                    <div className="absolute inset-0" style={{ background: tp.gradient }} />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white" />
                  </div>
                  {/* Content */}
                  <div className="w-3/5 p-7 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase font-body ${tp.tagClass}`}>
                          {tp.tag}
                        </span>
                        <div className={`flex items-center text-xs font-bold gap-1 font-body ${tp.badgeClass}`}>
                          {tp.badgeIcon === "trending" ? <TrendingUp size={13} /> : <Zap size={13} />}
                          {tp.badge}
                        </div>
                      </div>
                      <h4 className="text-xl font-extrabold text-foreground leading-tight mb-2 font-sans">{tp.title}</h4>
                      <p className="text-sm text-muted-foreground font-body line-clamp-2">{tp.desc}</p>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-primary font-sans">
                          {tp.score}
                          <span className="text-sm font-medium text-muted-foreground">/100</span>
                        </span>
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-tighter font-body">
                          Predicted Lift: {tp.lift}
                        </span>
                      </div>
                      <button className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Generated Variants */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground font-sans">Generated Variants</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full border border-border/30">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-body">
                    Select Mode
                  </span>
                  <button
                    onClick={() => setSelectMode((s) => !s)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${selectMode ? "bg-primary" : "bg-surface-container-high"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${selectMode ? "right-0.5" : "left-0.5"}`}
                    />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-xs font-bold text-muted-foreground bg-surface-container hover:bg-surface-container-high rounded-full transition-colors font-body">
                    Compare All
                  </button>
                  <button className="px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-full hover:bg-primary/5 transition-colors font-body">
                    Bulk Action
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {VARIANTS.map((v) => {
                const isSelected = selected.has(v.id);
                return (
                  <div key={v.id} className="flex flex-col">
                    <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-sm group">
                      {/* Animated gradient background */}
                      <div
                        className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
                        style={{ background: v.gradient }}
                      />

                      {/* Checkbox */}
                      {selectMode && (
                        <button onClick={() => toggleSelect(v.id)} className="absolute top-4 left-4 z-10">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shadow-lg border-2 transition-all ${
                              isSelected
                                ? "bg-primary border-white/50"
                                : "bg-white/40 border-white/60"
                            }`}
                          >
                            {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
                          </div>
                        </button>
                      )}

                      {/* Platform + format tags */}
                      <div className="absolute top-4 left-14 flex gap-2 z-10">
                        <span className="bg-white/90 backdrop-blur text-[10px] font-black px-2 py-1 rounded-lg shadow-sm text-foreground font-body">
                          {v.platform}
                        </span>
                        <span className="bg-white/90 backdrop-blur text-[10px] font-black px-2 py-1 rounded-lg shadow-sm text-foreground font-body">
                          {v.format}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1.5 rounded-full font-black text-xs shadow-lg font-body z-10">
                        {v.score}/100
                      </div>

                      {/* Title overlay */}
                      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-10">
                        <p className="text-white text-sm font-bold line-clamp-1 font-body">{v.title}</p>
                      </div>
                    </div>

                    {/* Card footer */}
                    <div className="mt-4 px-2 space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "CTR",    value: v.ctr,    cls: "text-foreground" },
                          { label: "ENGAGE", value: v.engage, cls: "text-foreground" },
                          { label: "CONV",   value: v.conv,   cls: v.convClass       },
                        ].map(({ label, value, cls }) => (
                          <div key={label} className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold font-body">
                              {label}
                            </span>
                            <span className={`text-sm font-black font-body ${cls}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        {pushed[v.id] ? (
                          <button
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-tighter font-body"
                            disabled
                          >
                            <Check size={11} strokeWidth={3} />
                            Pushed!
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePush(v.id)}
                            disabled={pushing[v.id]}
                            className="flex-1 flex items-center justify-center gap-1 bg-primary text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-tighter hover:opacity-90 transition-opacity font-body disabled:opacity-80"
                          >
                            {pushing[v.id] && (
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            )}
                            {pushing[v.id] ? "Pushing…" : "Push to Campaign"}
                          </button>
                        )}
                        <button className="p-2.5 rounded-xl border border-border hover:bg-surface-container-high transition-colors">
                          <MoreVertical size={14} className="text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: AI Insights */}
        <aside className="w-80 shrink-0 space-y-6 sticky top-6">
          {/* Main card */}
          <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/40 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles size={18} className="text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-foreground font-body">AI Strategic Insights</h4>
                <p className="text-[10px] font-bold text-primary uppercase font-body">Optimized for Conversion</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white p-4 rounded-2xl border border-primary/10">
                <p className="text-sm leading-relaxed text-muted-foreground italic font-body">
                  "High contrast + strong hook increases scroll stop rate by{" "}
                  <span className="text-primary font-bold">24%</span>{" "}
                  for this specific executive audience."
                </p>
              </div>

              {/* Performance matrix */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-body">
                  Performance Matrix
                </h5>
                <div className="space-y-3">
                  {PERFORMANCE_METRICS.map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-[10px] font-bold mb-1 font-body text-foreground">
                        <span>{m.label}</span>
                        <span>{m.value}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m.barClass}`}
                          style={{ width: `${m.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Winning elements */}
              <div className="pt-4 border-t border-border/30">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3 font-body">
                  Winning Elements
                </h5>
                <div className="flex flex-wrap gap-2">
                  {WINNING_ELEMENTS.map((el) => (
                    <span key={el} className="px-2 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded-lg font-body">
                      {el}
                    </span>
                  ))}
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 bg-foreground text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:opacity-90 transition-opacity font-body">
                <Download size={14} />
                Export Strategy Docs
              </button>
            </div>
          </div>

          {/* A/B Recommendation */}
          <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-orange-600" />
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 font-body">
                A/B Recommendation
              </span>
            </div>
            <p className="text-xs font-medium text-foreground font-body">
              Test <span className="font-bold">Variant 03</span> against your current champion. Expected win probability:{" "}
              <span className="font-black text-primary">72%</span>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
