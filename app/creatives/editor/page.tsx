"use client";

import { useState } from "react";
import {
  ArrowLeft, Share2, Bell, Type, Image, Hexagon, MousePointer2,
  ZoomOut, ZoomIn, Smartphone, Tablet, Monitor, Download, Rocket,
  Wand2, Lock, ArrowRight, ChevronRight, Sparkles, Pencil, Check,
} from "lucide-react";

type ViewMode = "Original" | "Optimized";
type DeviceView = "mobile" | "tablet" | "desktop";

const AI_SUGGESTIONS = [
  {
    label: "Improve Headline",
    badge: "+12% CTR",
    badgeClass: "bg-green-50 text-green-600",
    text: '"Unlock Unprecedented Clarity with AI-Driven Decisions."',
    italic: true,
    newHeadline: "Unlock Unprecedented Clarity with AI-Driven Decisions.",
  },
  {
    label: "Add Urgency",
    badge: "+8% Conv.",
    badgeClass: "bg-green-50 text-green-600",
    text: 'Suggestion: Use "Limited Access" in subheader.',
    italic: false,
    newHeadline: null,
  },
];

const BRAND_COLORS = ["#004ac6", "#2563eb", "#ffffff", "#191c1e"];
const BAR_HEIGHTS = [40, 60, 50, 80, 95, 45];

export default function CreativeEditorPage() {
  const [headline, setHeadline] = useState("The Future of Intelligence is Autonomous.");
  const [body, setBody] = useState("Streamline your executive decision-making with GrowthHub AI. Real-time insights, zero friction.");
  const [cta, setCta] = useState("Start Free Trial");
  const [viewMode, setViewMode] = useState<ViewMode>("Optimized");
  const [deviceView, setDeviceView] = useState<DeviceView>("tablet");
  const [zoom, setZoom] = useState(85);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [applying, setApplying] = useState<Record<number, boolean>>({});
  const [applied, setApplied] = useState<Record<number, boolean>>({});

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 900);
  }

  function handlePublish() {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      setPublished(true);
    }, 1200);
  }

  function handlePush() {
    setPushing(true);
    setTimeout(() => {
      setPushing(false);
      setPushed(true);
    }, 1200);
  }

  function handleApply(idx: number) {
    if (applied[idx]) return;
    setApplying((s) => ({ ...s, [idx]: true }));
    setTimeout(() => {
      setApplying((s) => ({ ...s, [idx]: false }));
      setApplied((s) => ({ ...s, [idx]: true }));
      const suggestion = AI_SUGGESTIONS[idx];
      if (suggestion.newHeadline) setHeadline(suggestion.newHeadline);
    }, 900);
  }

  return (
    <div className="space-y-0 -mx-6 -mt-6 flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>

      {/* Editor Topbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md border-b border-border/40 shrink-0">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium font-body">
            <ArrowLeft size={15} />
            Results
          </button>
          <div className="h-5 w-px bg-border/40" />
          <h2 className="text-base font-black tracking-tight text-foreground font-sans">Creative Editor</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
            <Share2 size={16} />
          </button>
          <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
            <Bell size={16} />
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-foreground font-semibold text-sm hover:bg-surface-container-high transition-all font-body"
          >
            {saved ? "Saved!" : saving ? "Saving…" : "Save"}
          </button>
          {published ? (
            <button
              className="flex items-center gap-2 px-7 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm font-body"
              disabled
            >
              <Check size={14} />
              Published
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-2 px-7 py-2 rounded-xl bg-gradient-to-r from-primary to-[#2563eb] text-white font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all font-body"
            >
              {publishing && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {publishing ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 min-h-0">

        {/* Left Panel: Toolbox + Inputs */}
        <section className="w-72 bg-surface-container-low border-r border-border/20 flex flex-col overflow-y-auto shrink-0">
          {/* Toolbox */}
          <div className="p-5 grid grid-cols-4 gap-2 border-b border-border/20">
            {[
              { Icon: Type,           label: "Text"  },
              { Icon: Image,          label: "Media" },
              { Icon: Hexagon,        label: "Logo"  },
              { Icon: MousePointer2,  label: "CTA"   },
            ].map(({ Icon, label }) => (
              <button
                key={label}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white hover:bg-surface-container-high transition-all shadow-sm group"
              >
                <Icon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] mt-1 font-semibold text-muted-foreground font-body">{label}</span>
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="p-5 flex flex-col gap-5">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Headline</label>
              <textarea
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Enter headline…"
                rows={3}
                className="w-full bg-surface-container-high border-none rounded-xl p-3 text-sm font-semibold text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Body Description</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter description…"
                rows={4}
                className="w-full bg-surface-container-high border-none rounded-xl p-3 text-sm text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">CTA Label</label>
              <div className="relative">
                <input
                  type="text"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-bold text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary/30 pr-9"
                />
                <Pencil size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="h-px bg-border/20" />

            <div className="space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Background Media</label>
              <div
                className="relative group rounded-2xl overflow-hidden aspect-video cursor-pointer"
                style={{ background: "linear-gradient(135deg, #05345c 0%, #005bc4 60%, #3d618c 100%)" }}
              >
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <span className="text-white font-bold text-xs font-body">Replace Image</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Center: Canvas */}
        <section className="flex-1 flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "#f2f4f6" }}>

          {/* Canvas Controls */}
          <div className="absolute top-5 flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-border/20 shadow-sm z-10">
            <div className="flex p-1 bg-surface-container-high rounded-lg mr-2">
              {(["Original", "Optimized"] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all font-body ${
                    viewMode === m
                      ? "bg-white text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-border/40 mr-2" />
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-bold text-foreground px-1 font-body">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-4 bg-border/40 mx-2" />
            {([
              { key: "mobile"  as DeviceView, Icon: Smartphone },
              { key: "tablet"  as DeviceView, Icon: Tablet     },
              { key: "desktop" as DeviceView, Icon: Monitor    },
            ]).map(({ key, Icon }) => (
              <button
                key={key}
                onClick={() => setDeviceView(key)}
                className={`transition-colors ${deviceView === key ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          {/* Ad Canvas */}
          <div
            className="relative rounded-[2rem] overflow-hidden border border-white/60 shadow-2xl"
            style={{
              width: 380,
              height: 475,
              transform: `scale(${zoom / 100})`,
              transition: "transform 0.2s ease",
            }}
          >
            {/* Gradient background */}
            <div
              className="absolute inset-0 z-0"
              style={{ background: "linear-gradient(135deg, #05345c 0%, #005bc4 50%, #3d618c 100%)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-0" />

            {/* Ad content */}
            <div className="relative z-10 h-full flex flex-col p-8 justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase opacity-70 font-body">GrowthHub</span>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-3xl font-black leading-tight tracking-tight font-sans">{headline}</h3>
                <p className="text-sm opacity-80 leading-relaxed font-body max-w-[90%]">{body}</p>
                <div className="mt-2">
                  <button className="bg-white text-primary px-6 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 font-body">
                    {cta}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Active element border */}
            <div className="absolute inset-0 border-[3px] border-primary/60 rounded-[2rem] pointer-events-none">
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white rounded text-[8px] font-bold uppercase tracking-tighter font-body">
                Active Element
              </div>
            </div>
          </div>

          {/* Bottom floating actions */}
          <div className="absolute bottom-7 flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-foreground font-bold text-sm shadow-lg hover:bg-surface-container-low transition-all font-body">
              <Download size={16} />
              Export
            </button>
            {pushed ? (
              <button
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm font-body"
                disabled
              >
                <Check size={16} />
                Pushed!
              </button>
            ) : (
              <button
                onClick={handlePush}
                disabled={pushing}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-foreground text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all font-body"
              >
                {pushing ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Rocket size={16} />
                )}
                {pushing ? "Pushing…" : "Push to Campaign"}
              </button>
            )}
          </div>
        </section>

        {/* Right Panel: AI + Analytics */}
        <section className="bg-surface-container-high border-l border-border/20 flex flex-col p-6 gap-7 overflow-y-auto shrink-0" style={{ width: "22rem" }}>

          {/* AI Creative Advisor */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wand2 size={15} className="text-primary" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground font-body">AI Creative Advisor</h4>
            </div>
            <div className="space-y-3">
              {AI_SUGGESTIONS.map((s, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-border/20 hover:border-primary/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-xs font-bold text-primary font-body">{s.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-body ${s.badgeClass}`}>
                      {s.badge}
                    </span>
                  </div>
                  <p className={`text-xs text-muted-foreground font-body leading-relaxed ${s.italic ? "italic" : ""}`}>
                    {s.text}
                  </p>
                  <button
                    onClick={() => handleApply(idx)}
                    className="mt-3 flex items-center gap-1"
                  >
                    {applied[idx] ? (
                      <span className="text-[10px] font-bold uppercase text-emerald-600 font-body flex items-center gap-1">
                        <Check size={10} />
                        Applied
                      </span>
                    ) : applying[idx] ? (
                      <span className="text-[10px] font-bold uppercase text-primary font-body">Applying…</span>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground hover:text-primary font-body transition-colors">
                          Apply Change
                        </span>
                        <ChevronRight size={12} className="text-muted-foreground" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Predicted Impact */}
          <div className="p-5 rounded-3xl bg-white shadow-sm flex flex-col gap-5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground font-body">Predicted Impact</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] font-bold text-primary mb-1 font-body">CTR% Change</p>
                <div className="flex items-end gap-0.5">
                  <span className="text-2xl font-black text-primary font-sans">+4.2</span>
                  <span className="text-xs font-bold text-primary mb-0.5 font-body">%</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                <p className="text-[10px] font-bold text-orange-600 mb-1 font-body">Engagement</p>
                <div className="flex items-end gap-0.5">
                  <span className="text-2xl font-black text-orange-600 font-sans">+18</span>
                  <span className="text-xs font-bold text-orange-600 mb-0.5 font-body">%</span>
                </div>
              </div>
            </div>
            {/* Bar chart */}
            <div className="relative h-20 flex items-end gap-1 px-1">
              {BAR_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-md ${i === 4 ? "bg-primary relative" : "bg-surface-container-high"}`}
                  style={{ height: `${h}%` }}
                >
                  {i === 4 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-primary font-body whitespace-nowrap">
                      BEST
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Brand Kit Locked */}
          <div className="p-5 rounded-3xl bg-foreground text-white flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60 font-body">Brand Kit Locked</h4>
              <Lock size={14} className="text-primary" />
            </div>
            <div className="flex gap-2">
              {BRAND_COLORS.map((c) => (
                <div
                  key={c}
                  className="w-8 h-8 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold font-body">Primary Font: Inter</p>
              <p className="text-[10px] text-white/50 font-body">Locked by Admin: Brand Identity V2.0</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
