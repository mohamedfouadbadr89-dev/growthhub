"use client";

import { useState } from "react";
import {
  Box, Palette, Type, Shield, Mic, MousePointer2, FolderOpen, Plus,
  ImagePlus, Search, TrendingUp, Sparkles, Lightbulb, Clock,
  Check, ZoomIn, Upload, Trash2,
} from "lucide-react";

type Enforcement = "strict" | "flexible";
type Tone = "Professional" | "Casual" | "Bold";

const TONES: Tone[] = ["Professional", "Casual", "Bold"];

const ASSET_GRADIENTS = [
  "linear-gradient(135deg, #dce9ff 0%, #91b4e4 100%)",
  "linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)",
  "linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 100%)",
];

export default function BrandKitPage() {
  const [enforcement, setEnforcement] = useState<Enforcement>("strict");
  const [tones, setTones] = useState<Set<Tone>>(new Set(["Professional"]));
  const [brandVoice, setBrandVoice] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleTone(t: Tone) {
    setTones((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next.size === 0 ? prev : next;
    });
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 1000);
  }

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Brand Kit
          </h1>
          <p className="text-muted-foreground font-body">Maintain consistent branding across all creatives</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand assets…"
            className="pl-9 pr-4 py-2.5 bg-surface-container-high rounded-full border-none focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm w-64 font-body"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* Left Panel */}
        <div className="xl:col-span-7 space-y-6">

          {/* Logo */}
          <section className="bg-white rounded-3xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2 font-body">
              <Box size={13} />
              Logo
            </h3>
            <div className="flex items-center gap-8">
              <div className="w-32 h-32 bg-surface-container-low rounded-2xl flex items-center justify-center border-2 border-dashed border-border hover:bg-surface-container-high transition-colors cursor-pointer overflow-hidden group shrink-0">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Sparkles size={28} className="text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all font-body">
                    <Upload size={14} />
                    Upload New
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-foreground font-semibold rounded-xl text-sm hover:bg-surface-container-highest transition-all font-body">
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-body">
                  SVG, PNG or JPG (min. 512×512px).<br />
                  For best results, use a vector file on a transparent background.
                </p>
              </div>
            </div>
          </section>

          {/* Color Palette */}
          <section className="bg-white rounded-3xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2 font-body">
              <Palette size={13} />
              Color Palette
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "Primary Palette",   hex: "#005bc4", style: { backgroundColor: "#005bc4" } },
                { label: "Secondary Palette", hex: "#3d618c", style: { backgroundColor: "#3d618c" } },
              ].map((c) => (
                <div key={c.label} className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl shadow-inner shrink-0" style={c.style} />
                    <div>
                      <p className="text-xs font-bold text-foreground font-body">{c.label}</p>
                      <p className="text-sm font-mono text-muted-foreground">{c.hex}</p>
                    </div>
                  </div>
                  <button className="text-primary font-bold text-sm hover:underline font-body">Change</button>
                </div>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section className="bg-white rounded-3xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2 font-body">
              <Type size={13} />
              Typography
            </h3>
            <div className="space-y-4">
              {[
                { role: "Heading Font", name: "Inter Tight",   cls: "text-lg font-extrabold" },
                { role: "Body Font",    name: "Inter Regular", cls: "text-lg font-medium"    },
              ].map((f) => (
                <div key={f.role} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1 font-body">
                      {f.role}
                    </p>
                    <p className={`${f.cls} text-foreground font-sans`}>{f.name}</p>
                  </div>
                  <button className="px-4 py-2 bg-white rounded-lg text-xs font-bold shadow-sm border border-border/30 hover:bg-surface-container-high transition-colors font-body">
                    Select Font
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Brand Enforcement */}
          <section className="bg-white rounded-3xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2 font-body">
              <Shield size={13} />
              Brand Enforcement
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {([
                {
                  key: "strict" as Enforcement,
                  label: "Strict",
                  desc: "Lock fonts/colors entirely. Prevent overrides in the editor.",
                },
                {
                  key: "flexible" as Enforcement,
                  label: "Flexible",
                  desc: "Allow minor changes. Suggest improvements instead of enforcing rules.",
                },
              ]).map((opt) => {
                const active = enforcement === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setEnforcement(opt.key)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-surface-container-low hover:bg-surface-container-high"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold font-body ${active ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          active ? "bg-primary" : "border border-border"
                        }`}
                      >
                        {active && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed font-body">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Brand Voice + Default CTA */}
          <div className="grid grid-cols-2 gap-6">
            <section className="bg-white rounded-3xl p-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2 font-body">
                <Mic size={13} />
                Brand Voice
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground block mb-2 font-body">
                    Description
                  </label>
                  <textarea
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    placeholder="Describe your brand's personality and mission…"
                    rows={4}
                    className="w-full bg-surface-container-low rounded-xl border-none p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-foreground font-body"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground block mb-2 font-body">
                    Tone
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleTone(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors font-body ${
                          tones.has(t)
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-surface-container-high text-muted-foreground border-transparent hover:bg-surface-container-highest"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl p-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2 font-body">
                <MousePointer2 size={13} />
                Default CTA
              </h3>
              <div className="space-y-6">
                <div className="flex flex-col gap-3">
                  <button className="w-full py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 font-body">
                    Get Started Now
                  </button>
                  <button className="w-full py-3 bg-surface-container-high text-foreground rounded-2xl font-bold hover:bg-surface-container-highest transition-colors font-body">
                    Learn More
                  </button>
                </div>
                <p className="text-[10px] italic text-muted-foreground text-center font-body">
                  Messaging style: Result-oriented &amp; urgent
                </p>
              </div>
            </section>
          </div>

          {/* Asset Library */}
          <section className="bg-white rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-body">
                <FolderOpen size={13} />
                Asset Library
              </h3>
              <button className="text-primary font-bold text-xs flex items-center gap-1 font-body">
                <Plus size={13} />
                View All
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {ASSET_GRADIENTS.map((gradient, i) => (
                <div key={i} className="aspect-square bg-surface-container-low rounded-2xl overflow-hidden relative group cursor-pointer">
                  <div className="absolute inset-0" style={{ background: gradient }} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn size={20} className="text-white" />
                  </div>
                </div>
              ))}
              <button className="aspect-square bg-surface-container-low rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-surface-container-high transition-colors cursor-pointer">
                <ImagePlus size={22} />
                <span className="text-[10px] font-bold mt-1 font-body">Add</span>
              </button>
            </div>
          </section>
        </div>

        {/* Right Panel: Live Preview */}
        <div className="xl:col-span-5 sticky top-6 space-y-6">
          <section className="bg-white rounded-3xl shadow-2xl shadow-primary/5 overflow-hidden border border-border/10">
            <div className="p-6 bg-surface-container-high flex justify-between items-center">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground font-body">
                Live Brand Application
              </h4>
              <span className="px-2 py-1 bg-green-500/10 text-green-600 rounded text-[10px] font-black tracking-wider flex items-center gap-1 font-body">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                SYNCED
              </span>
            </div>

            <div className="p-8">
              {/* Ad Preview */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/5] shadow-2xl">
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(135deg, #05345c 0%, #005bc4 60%, #3d618c 100%)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Logo overlay */}
                <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg">
                  <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                    <Sparkles size={11} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black text-white uppercase tracking-tighter font-body">GrowthHub</span>
                </div>

                {/* Content overlay */}
                <div className="absolute bottom-10 left-8 right-8 space-y-4">
                  <h5 className="text-2xl font-extrabold text-white leading-tight font-sans">
                    Scale your executive decisions with AI accuracy.
                  </h5>
                  <p className="text-sm text-white/70 font-medium font-body">
                    Experience the next generation of business intelligence tailored to your brand voice.
                  </p>
                  <button className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform font-body">
                    Get Started Now
                  </button>
                </div>
              </div>

              {/* Performance confidence */}
              <div className="mt-6 bg-surface-container-low rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 font-body">
                    Performance Confidence
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-primary leading-none font-sans">94.2%</span>
                    <span className="text-[10px] font-bold text-green-600 mb-1 flex items-center gap-0.5 font-body">
                      <TrendingUp size={11} />
                      +2.4%
                    </span>
                  </div>
                </div>
                <div className="w-16 h-16 relative shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#dce9ff" strokeDasharray="100, 100" strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#005bc4" strokeDasharray="94, 100"
                      strokeLinecap="round" strokeWidth="3"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={16} className="text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* AI Recommendation */}
          <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <Lightbulb size={18} className="text-orange-600" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-orange-700 mb-1 font-sans">AI Recommendation</h5>
                <p className="text-xs text-muted-foreground leading-relaxed font-body">
                  Increasing the color contrast of your primary palette could improve ad accessibility by 12% across mobile placements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 right-0 left-0 md:left-[17rem] bg-white/80 backdrop-blur-xl px-8 py-5 flex justify-between items-center z-40 border-t border-border/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest font-body">Last synced 2 minutes ago</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-8 py-3 bg-surface-container-high text-foreground font-bold rounded-2xl hover:bg-surface-container-highest transition-all font-body">
            Discard changes
          </button>
          {saved ? (
            <button
              className="flex items-center gap-2 px-10 py-3 bg-emerald-600 text-white font-black rounded-2xl font-body"
              disabled
            >
              <Check size={15} />
              Saved!
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-10 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 active:scale-100 transition-all font-body disabled:opacity-80"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {saving ? "Saving…" : "Save Brand Kit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
