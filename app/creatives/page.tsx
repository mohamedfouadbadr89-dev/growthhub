"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, Wand2, Globe, ImageIcon, Monitor, Film,
  ArrowRight, Sliders, RefreshCw, Download,
} from "lucide-react";

const FORMATS = [
  { key: "story",   label: "Story",   sub: "9:16",   Icon: ImageIcon },
  { key: "feed",    label: "Feed",    sub: "1:1",    Icon: Globe },
  { key: "banner",  label: "Banner",  sub: "16:9",   Icon: Monitor },
  { key: "video",   label: "Video",   sub: "MP4",    Icon: Film },
];

const STYLES = ["Minimalist", "Bold & Vibrant", "Luxury", "Playful", "Corporate"];

const PLATFORMS = [
  { label: "Meta",    dot: "bg-blue-600" },
  { label: "Google",  dot: "bg-red-500" },
  { label: "TikTok",  dot: "bg-slate-900" },
];

const PREVIEWS = [
  { label: "V1 — Summer Glow",  score: "9.2", badge: "Top Pick",  badgeStyle: "bg-primary text-white" },
  { label: "V2 — Bold Contrast", score: "8.7", badge: "High CTR",  badgeStyle: "bg-emerald-100 text-emerald-700" },
  { label: "V3 — Minimal Clean", score: "8.1", badge: null,        badgeStyle: "" },
  { label: "V4 — Warm Tones",   score: "7.9", badge: null,        badgeStyle: "" },
];

const COLORS = [
  ["bg-blue-500","bg-indigo-400","bg-sky-300"],
  ["bg-emerald-500","bg-teal-400","bg-green-300"],
  ["bg-orange-500","bg-amber-400","bg-yellow-300"],
  ["bg-rose-500","bg-pink-400","bg-fuchsia-300"],
];

export default function CreativeGeneratorPage() {
  const [format, setFormat] = useState("story");
  const [style, setStyle] = useState("Minimalist");
  const [platform, setPlatform] = useState("Meta");
  const [prompt, setPrompt] = useState("");

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">AI Engine</p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Creative Generator</h2>
          <p className="text-muted-foreground mt-2 font-body">Describe your campaign and let AI produce platform-ready creatives.</p>
        </div>
        <Link href="/creatives/results">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-foreground rounded-xl font-semibold text-sm hover:bg-surface-container-high/80 transition-colors font-body">
            View Results <ArrowRight size={16} />
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left: Controls */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Prompt */}
          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-body">AI Prompt</h3>
            </div>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g. Summer fashion campaign for women 25–40, bold colours, product-forward, with a lifestyle feel..."
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 ring-primary/20 font-body placeholder:text-muted-foreground/60"
            />
            <div className="flex flex-wrap gap-2">
              {["Summer sale", "Luxury feel", "Product focus", "Lifestyle"].map((t) => (
                <button
                  key={t}
                  onClick={() => setPrompt((p) => (p ? p + ", " + t : t))}
                  className="px-3 py-1 bg-primary/5 text-primary text-xs font-semibold rounded-full hover:bg-primary/10 transition-colors font-body"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-body">Format</h3>
            <div className="grid grid-cols-4 gap-3">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    format === f.key
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-surface-container-low hover:border-border"
                  }`}
                >
                  <f.Icon size={18} className={format === f.key ? "text-primary" : "text-muted-foreground"} />
                  <span className={`text-[11px] font-bold font-body ${format === f.key ? "text-primary" : "text-foreground"}`}>{f.label}</span>
                  <span className="text-[9px] text-muted-foreground font-body">{f.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-body">Platform</h3>
            <div className="flex gap-3 flex-wrap">
              {PLATFORMS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPlatform(p.label)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all font-body ${
                    platform === p.label
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-transparent bg-surface-container-low text-foreground hover:border-border"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-body">Style</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all font-body ${
                    style === s
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-surface-container-high text-foreground hover:bg-surface-container-high/80"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <Link href="/creatives/results">
            <button className="w-full py-4 bg-gradient-to-br from-primary to-[#2563eb] text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/25 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 font-body">
              <Sparkles size={18} /> Generate Creatives
            </button>
          </Link>
        </div>

        {/* Right: Preview Grid */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground font-body">Preview</h3>
            <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors font-body">
              <RefreshCw size={13} /> Regenerate
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {PREVIEWS.map((p, i) => (
              <div key={p.label} className="group cursor-pointer">
                <div className={`rounded-2xl overflow-hidden aspect-[9/16] relative ${COLORS[i][0]} bg-gradient-to-br ${COLORS[i][0]} to-${COLORS[i][2]}`}>
                  {/* Mock creative canvas */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                    <div className={`w-16 h-16 rounded-2xl bg-white/20 backdrop-blur`} />
                    <div className="w-3/4 h-3 bg-white/40 rounded-full" />
                    <div className="w-1/2 h-2 bg-white/30 rounded-full" />
                    <div className="mt-4 w-2/3 h-8 bg-white/20 rounded-xl" />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-end p-4">
                    <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-2 w-full">
                      <Link href="/creatives/editor" className="flex-1">
                        <button className="w-full py-2 bg-white text-foreground text-xs font-bold rounded-xl hover:bg-primary hover:text-white transition-colors font-body">
                          Edit
                        </button>
                      </Link>
                      <button className="p-2 bg-white rounded-xl text-foreground hover:text-primary transition-colors">
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                  {p.badge && (
                    <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${p.badgeStyle} font-body`}>
                      {p.badge}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-foreground font-body">{p.label}</span>
                  <div className="flex items-center gap-1">
                    <Sparkles size={10} className="text-primary" />
                    <span className="text-xs font-black text-primary font-body">{p.score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
