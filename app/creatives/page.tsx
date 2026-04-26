"use client";

import { useState } from "react";
import {
  Sparkles, RefreshCw, Maximize2, Copy, Check,
  ChevronDown, Zap, Image, Video, Layers, Users,
} from "lucide-react";

type Objective = "Sales & Conversion" | "Lead Generation" | "Website Traffic" | "App Installs";
type Platform = "Meta" | "Google" | "TikTok" | "Snapchat";
type Format = "Image" | "Video" | "Carousel" | "UGC Style";
type StrategyType = "Direct Response" | "Branding" | "UGC";
type Angle = "Emotional" | "Urgency" | "Social Proof" | "Problem/Solution";

const OBJECTIVES: Objective[] = ["Sales & Conversion", "Lead Generation", "Website Traffic", "App Installs"];
const PLATFORMS: Platform[] = ["Meta", "Google", "TikTok", "Snapchat"];
const FORMATS: { label: Format; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { label: "Image",    Icon: Image  },
  { label: "Video",    Icon: Video  },
  { label: "Carousel", Icon: Layers },
  { label: "UGC Style", Icon: Users },
];
const STRATEGY_TYPES: StrategyType[] = ["Direct Response", "Branding", "UGC"];
const ANGLES: Angle[] = ["Emotional", "Urgency", "Social Proof", "Problem/Solution"];

const BRAND_COLORS = ["#005bc4", "#05345c", "#3d618c", "#dce9ff"];

const HOOKS = [
  "\"Stop overpaying for ads that don't convert. Here's what the top 1% of DTC brands do differently.\"",
  "\"Your competitors are scaling at 4x ROAS while you're stuck at 1.8x. This changes everything.\"",
];

const HEADLINES = [
  "Scale Your DTC Brand to 7-Figures with AI-Powered Ad Intelligence",
  "The Growth OS That Thinks, Decides, and Executes — So You Don't Have To",
];

export default function CreativesPage() {
  const [objective, setObjective] = useState<Objective>("Sales & Conversion");
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(["Meta"]));
  const [format, setFormat] = useState<Format>("Image");
  const [strategyType, setStrategyType] = useState<StrategyType>("Direct Response");
  const [angles, setAngles] = useState<Set<Angle>>(new Set(["Emotional"]));
  const [audience, setAudience] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next.size === 0 ? prev : next;
    });
  }

  function toggleAngle(a: Angle) {
    setAngles((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next.size === 0 ? prev : next;
    });
  }

  function handleGenerate() {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 1400);
  }

  function handleCopy(idx: number) {
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
          Creative Generator
        </h1>
        <p className="text-muted-foreground font-body">
          AI-powered creative strategy — hooks, headlines, and ad concepts built for performance
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* Left: Campaign Strategy */}
        <div className="xl:col-span-7 bg-surface-container-low rounded-2xl overflow-hidden">
          <div className="p-7 space-y-7">
            <div>
              <h2 className="text-lg font-bold text-foreground font-sans mb-1">Campaign Strategy</h2>
              <p className="text-xs text-muted-foreground font-body">Configure your creative brief and let AI build the strategy.</p>
            </div>

            {/* Primary Objective */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Primary Objective</label>
              <div className="relative">
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as Objective)}
                  className="w-full bg-white border border-border/40 rounded-xl px-4 py-3 text-sm font-semibold text-foreground font-body appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer pr-9"
                >
                  {OBJECTIVES.map((o) => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all font-body ${
                      platforms.has(p)
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "bg-white border border-border/40 text-foreground hover:border-primary/40"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Creative Format */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Creative Format</label>
              <div className="grid grid-cols-4 gap-3">
                {FORMATS.map(({ label, Icon }) => (
                  <button
                    key={label}
                    onClick={() => setFormat(label)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      format === label
                        ? "border-primary bg-primary/5"
                        : "border-border/30 bg-white hover:border-primary/30"
                    }`}
                  >
                    <Icon size={20} className={format === label ? "text-primary" : "text-muted-foreground"} />
                    <span className={`text-[11px] font-bold font-body ${format === label ? "text-primary" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Creative Strategy Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Creative Strategy Type</label>
              <div className="flex flex-wrap gap-2">
                {STRATEGY_TYPES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStrategyType(s)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all font-body ${
                      strategyType === s
                        ? "bg-primary/10 text-primary"
                        : "bg-white border border-border/30 text-foreground hover:border-primary/30"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience Context */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Audience Context</label>
              <textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Describe your target audience — demographics, psychographics, pain points, aspirations…"
                rows={3}
                className="w-full bg-white border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground"
              />
            </div>

            {/* Product / Offer Details */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Product / Offer Details</label>
              <textarea
                value={productDetails}
                onChange={(e) => setProductDetails(e.target.value)}
                placeholder="What are you promoting? Key features, pricing, USPs, offer mechanics…"
                rows={3}
                className="w-full bg-white border border-border/40 rounded-xl px-4 py-3 text-sm text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground"
              />
            </div>

            {/* Strategic Angle */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Strategic Angle</label>
              <div className="flex flex-wrap gap-2">
                {ANGLES.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleAngle(a)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all font-body ${
                      angles.has(a)
                        ? "bg-primary text-white"
                        : "bg-white border border-border/30 text-foreground hover:border-primary/30"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Assets */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Brand Assets</label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-surface-container-high rounded-xl flex items-center justify-center border border-border/30">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  {BRAND_COLORS.map((c) => (
                    <div key={c} className="w-8 h-8 rounded-lg border border-border/20 shadow-sm" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground font-body">Inter</span>
              </div>
            </div>
          </div>

          {/* Generate CTA */}
          <div className="bg-gradient-to-r from-primary to-[#2563eb] p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold font-sans text-base">Ready to generate</p>
              <p className="text-white/70 text-sm font-body mt-0.5">12 creative variations across your selected platforms</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-white text-primary px-7 py-3 rounded-xl font-bold hover:bg-blue-50 active:scale-95 transition-all font-body shrink-0 disabled:opacity-80"
            >
              {generating ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Zap size={15} />
              )}
              {generating ? "Generating…" : "Generate Creatives"}
            </button>
          </div>
        </div>

        {/* Right: AI Concept Preview */}
        <aside className="xl:col-span-5 flex flex-col gap-6">
          {/* Preview Card */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border/20 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground font-sans">AI Concept Preview</h3>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  {generated ? "Your creative concept is ready" : "Configure and generate to see your concept"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="w-8 h-8 bg-white border border-border/30 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors">
                  <RefreshCw size={13} className="text-muted-foreground" />
                </button>
                <button className="w-8 h-8 bg-white border border-border/30 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors">
                  <Maximize2 size={13} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Ad Mockup */}
            <div
              className="relative h-64 flex items-end p-5"
              style={{
                background: "linear-gradient(135deg, #05345c 0%, #005bc4 60%, #3d618c 100%)",
              }}
            >
              {/* Decorative blobs */}
              <div className="absolute top-4 right-4 w-28 h-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <div className="absolute bottom-8 left-8 w-20 h-20 rounded-full bg-primary/20 blur-xl pointer-events-none" />

              {generated ? (
                <div className="relative z-10 w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 font-body">Sponsored</p>
                  <h4 className="text-white font-bold font-sans text-base leading-snug mb-1">
                    Scale to 7-Figures with AI Ad Intelligence
                  </h4>
                  <p className="text-white/70 text-xs font-body mb-4">
                    The growth OS that thinks, decides, and executes — so you don't have to.
                  </p>
                  <button className="bg-white text-primary px-4 py-1.5 rounded-lg text-xs font-bold font-body">
                    Get Started Free →
                  </button>
                </div>
              ) : (
                <div className="relative z-10 w-full flex items-center justify-center py-8">
                  <div className="text-center">
                    <Sparkles size={32} className="text-white/30 mx-auto mb-3" />
                    <p className="text-white/40 text-sm font-body">Generate to preview your concept</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generated Hooks */}
          {generated && (
            <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                <h4 className="font-bold text-sm text-foreground font-sans uppercase tracking-wider">Generated Hooks</h4>
              </div>
              <div className="space-y-3">
                {HOOKS.map((hook, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border-l-4 border-primary">
                    <p className="text-sm text-foreground font-body italic leading-relaxed">{hook}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viral Headlines */}
          {generated && (
            <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <h4 className="font-bold text-sm text-foreground font-sans uppercase tracking-wider">Viral Headlines</h4>
              </div>
              <div className="space-y-3">
                {HEADLINES.map((headline, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground font-body font-semibold leading-snug">{headline}</p>
                    <button
                      onClick={() => handleCopy(i)}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors"
                    >
                      {copiedIdx === i ? (
                        <Check size={13} className="text-emerald-500" />
                      ) : (
                        <Copy size={13} className="text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategy Intelligence */}
          <div className="bg-foreground rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/20 border border-white/10 rounded-full flex items-center justify-center">
                  <Sparkles size={14} className="text-blue-200" />
                </div>
                <h4 className="text-white font-bold font-sans">Strategy Intelligence</h4>
              </div>

              <div className="space-y-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1.5 font-body">Why This Works</p>
                  <p className="text-sm text-slate-300 leading-relaxed font-body">
                    Direct Response creatives with an Emotional angle consistently outperform on Meta for conversion-focused campaigns — especially in saturated verticals.
                  </p>
                </div>

                <div className="bg-primary/20 border border-primary/30 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-1.5 font-body">Predicted CTR Lift</p>
                  <p className="text-2xl font-black text-white font-sans">+34%</p>
                  <p className="text-xs text-slate-300 font-body mt-1">vs. your current creative baseline</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
