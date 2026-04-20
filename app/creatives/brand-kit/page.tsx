"use client";

import { useState } from "react";
import { Plus, Upload, Copy, CheckCircle2, Pencil, Trash2, Type, Palette, Image, Sparkles } from "lucide-react";

const BRAND_COLORS = [
  { name: "Primary Blue",    hex: "#005BC4", usage: "CTAs, Headlines" },
  { name: "Deep Navy",       hex: "#05345C", usage: "Body text, Backgrounds" },
  { name: "Sky Accent",      hex: "#2563EB", usage: "Gradients, Highlights" },
  { name: "Surface Light",   hex: "#EFF4FF", usage: "Card backgrounds" },
  { name: "Success Green",   hex: "#10B981", usage: "Positive signals" },
  { name: "Alert Amber",     hex: "#F59E0B", usage: "Warnings, badges" },
];

const TYPOGRAPHY = [
  { name: "Manrope",  role: "Display / Headings", weights: ["800 ExtraBold", "700 Bold", "600 SemiBold"], preview: "Aa" },
  { name: "Inter",    role: "Body / UI",           weights: ["500 Medium", "400 Regular", "300 Light"],    preview: "Aa" },
];

const LOGOS = [
  { name: "Primary Logo (Light)",  bg: "bg-primary",             text: "text-white" },
  { name: "Primary Logo (Dark)",   bg: "bg-foreground",          text: "text-white" },
  { name: "Monochrome",            bg: "bg-surface-container-high", text: "text-foreground" },
  { name: "Favicon / Icon",        bg: "bg-primary",             text: "text-white", icon: true },
];

const ASSETS = [
  { label: "Pattern Set A",   type: "SVG",  size: "24KB",  color: "bg-blue-50" },
  { label: "Product Photos",  type: "ZIP",  size: "142MB", color: "bg-emerald-50" },
  { label: "Icon Library",    type: "SVG",  size: "8KB",   color: "bg-amber-50" },
  { label: "Social Templates",type: "PSD",  size: "56MB",  color: "bg-rose-50" },
];

export default function BrandKitPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">Creatives</p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Brand Kit</h2>
          <p className="text-muted-foreground mt-2 font-body">Your brand's visual identity — colours, fonts, logos, and assets.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-primary to-[#2563eb] text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all font-body">
          <Sparkles size={15} /> AI Brand Refresh
        </button>
      </div>

      {/* Colours */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Palette size={16} className="text-primary" />
            </div>
            <h3 className="text-lg font-extrabold text-foreground font-sans">Brand Colours</h3>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline font-body">
            <Plus size={14} /> Add Colour
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {BRAND_COLORS.map((c) => (
            <div key={c.hex} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden group">
              <div className="h-20 w-full" style={{ background: c.hex }} />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground font-body">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground font-body">{c.usage}</p>
                </div>
                <button
                  onClick={() => copy(c.hex)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-low rounded-lg text-xs font-mono font-bold text-muted-foreground hover:text-primary transition-colors"
                >
                  {copied === c.hex ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {c.hex}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
            <Type size={16} className="text-primary" />
          </div>
          <h3 className="text-lg font-extrabold text-foreground font-sans">Typography</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TYPOGRAPHY.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 font-body">{t.role}</p>
                  <h4 className="text-xl font-extrabold text-foreground font-sans">{t.name}</h4>
                </div>
                <span className="text-5xl font-black text-primary/10 font-sans">{t.preview}</span>
              </div>
              <div className="space-y-2">
                {t.weights.map((w) => {
                  const [weight] = w.split(" ");
                  return (
                    <div key={w} className="flex items-center justify-between py-2 border-b border-surface-container-low last:border-none">
                      <span className="text-sm text-foreground font-body" style={{ fontWeight: parseInt(weight) }}>
                        The quick brown fox
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground font-body">{w}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Logos */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Image size={16} className="text-primary" />
            </div>
            <h3 className="text-lg font-extrabold text-foreground font-sans">Logo Variants</h3>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline font-body">
            <Upload size={14} /> Upload Logo
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LOGOS.map((l) => (
            <div key={l.name} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden group">
              <div className={`${l.bg} h-28 flex items-center justify-center`}>
                {l.icon ? (
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className={`text-lg font-black ${l.text}`}>P</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center`}>
                      <span className={`text-sm font-black ${l.text}`}>P</span>
                    </div>
                    <span className={`text-sm font-black uppercase tracking-widest ${l.text}`}>Precision</span>
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <p className="text-[11px] font-bold text-foreground font-body truncate">{l.name}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 hover:bg-surface-container-low rounded-lg text-muted-foreground hover:text-primary transition-colors"><Pencil size={11} /></button>
                  <button className="p-1 hover:bg-surface-container-low rounded-lg text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Assets Library */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-foreground font-sans">Asset Library</h3>
          <button className="flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-colors font-body">
            <Upload size={14} /> Upload Assets
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ASSETS.map((a) => (
            <div key={a.label} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3 group hover:shadow-md transition-all">
              <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center`}>
                <span className="text-[10px] font-black text-foreground font-body">{a.type}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground font-body">{a.label}</p>
                <p className="text-[11px] text-muted-foreground font-body">{a.size}</p>
              </div>
              <button className="mt-auto w-full py-2 bg-surface-container-low text-xs font-bold text-foreground rounded-xl hover:bg-primary hover:text-white transition-colors font-body">
                Download
              </button>
            </div>
          ))}
          {/* Upload placeholder */}
          <button className="bg-surface-container-low rounded-2xl border-2 border-dashed border-border p-5 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
              <Plus size={18} className="text-muted-foreground group-hover:text-white" />
            </div>
            <span className="text-xs font-bold text-muted-foreground font-body">Add Asset</span>
          </button>
        </div>
      </section>
    </div>
  );
}
