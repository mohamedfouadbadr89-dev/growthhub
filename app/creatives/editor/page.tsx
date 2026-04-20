"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Type, Image, Square, Layers, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Sparkles, Download, Undo2, Redo2, ZoomIn, ZoomOut,
  Palette, Move,
} from "lucide-react";

const LAYERS = [
  { label: "Background", type: "bg",   locked: false },
  { label: "Hero Image",  type: "img",  locked: false },
  { label: "Headline",    type: "text", locked: false },
  { label: "Body Copy",   type: "text", locked: false },
  { label: "CTA Button",  type: "btn",  locked: false },
  { label: "Brand Logo",  type: "img",  locked: true  },
];

const FONTS = ["Inter", "Manrope", "Playfair Display", "Montserrat", "DM Sans"];
const FONT_SIZES = ["12", "14", "16", "20", "24", "32", "48", "64"];

const SWATCH_COLORS = [
  "#005bc4", "#2563eb", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#191c1e",
  "#ffffff", "#f8f9ff",
];

export default function CreativeEditorPage() {
  const [selectedLayer, setSelectedLayer] = useState(2);
  const [font, setFont] = useState("Inter");
  const [fontSize, setFontSize] = useState("48");
  const [align, setAlign] = useState("center");
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [color, setColor] = useState("#005bc4");

  return (
    <div className="-m-8 lg:-m-12 min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Editor Topbar */}
      <div className="h-14 bg-white border-b border-border flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/creatives">
            <button className="p-1.5 rounded-lg hover:bg-surface-container-low text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-bold text-foreground font-body">V1 — Summer Glow</span>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider font-body">Editing</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground transition-colors"><Undo2 size={15} /></button>
          <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground transition-colors"><Redo2 size={15} /></button>
          <div className="h-4 w-px bg-border mx-1" />
          <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground transition-colors"><ZoomOut size={15} /></button>
          <span className="text-xs font-bold text-muted-foreground font-body w-10 text-center">100%</span>
          <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground transition-colors"><ZoomIn size={15} /></button>
          <div className="h-4 w-px bg-border mx-1" />
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-foreground rounded-lg text-xs font-bold hover:bg-surface-container-high transition-colors font-body">
            <Download size={13} /> Export
          </button>
          <Link href="/creatives/results">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-colors font-body">
              <Sparkles size={13} /> Save & Analyse
            </button>
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Tools + Layers */}
        <div className="w-56 bg-white border-r border-border flex flex-col shrink-0">
          {/* Tool Icons */}
          <div className="p-3 border-b border-border flex gap-1 flex-wrap">
            {[
              { Icon: Move,   label: "Select" },
              { Icon: Type,   label: "Text" },
              { Icon: Image,  label: "Image" },
              { Icon: Square, label: "Shape" },
              { Icon: Palette,label: "Fill" },
            ].map(({ Icon, label }) => (
              <button key={label} title={label} className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground hover:text-primary transition-colors">
                <Icon size={16} />
              </button>
            ))}
          </div>

          {/* Layers */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 px-1 font-body">Layers</p>
            <div className="space-y-1">
              {LAYERS.map((layer, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedLayer(i)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedLayer === i
                      ? "bg-primary/5 text-primary"
                      : "hover:bg-surface-container-low text-foreground"
                  }`}
                >
                  {layer.type === "text" && <Type size={12} className="shrink-0" />}
                  {layer.type === "img"  && <Image size={12} className="shrink-0" />}
                  {layer.type === "bg"   && <Square size={12} className="shrink-0" />}
                  {layer.type === "btn"  && <Square size={12} className="shrink-0 fill-current" />}
                  <span className="text-xs font-semibold truncate font-body">{layer.label}</span>
                  {layer.locked && <span className="ml-auto text-[9px] text-muted-foreground font-body">🔒</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 bg-surface-container-low flex items-center justify-center overflow-auto p-8">
          <div className="relative shadow-2xl rounded-2xl overflow-hidden" style={{ width: 280, height: 497 }}>
            {/* Simulated creative canvas */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl backdrop-blur-sm" />
              <div className="space-y-2 w-full">
                <div className="text-2xl font-black leading-tight">Summer Collection 2024</div>
                <div className="text-sm text-white/80">Shop the season's hottest styles.</div>
              </div>
              <div className="mt-4 w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm">
                Shop Now →
              </div>
            </div>
            {/* Selection border on selected layer hint */}
            <div className="absolute inset-0 border-2 border-transparent pointer-events-none" />
          </div>
        </div>

        {/* Right Panel: Properties */}
        <div className="w-64 bg-white border-l border-border flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground font-body">Properties</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-body">{LAYERS[selectedLayer]?.label}</p>
          </div>

          <div className="p-4 space-y-6">
            {/* Typography */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground font-body">Typography</p>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 ring-primary/20 font-body"
              >
                {FONTS.map((f) => <option key={f}>{f}</option>)}
              </select>
              <div className="flex gap-2">
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="flex-1 bg-surface-container-low border-none rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 ring-primary/20 font-body"
                >
                  {FONT_SIZES.map((s) => <option key={s}>{s}px</option>)}
                </select>
                <div className="flex gap-1">
                  {[
                    { Icon: AlignLeft,   key: "left" },
                    { Icon: AlignCenter, key: "center" },
                    { Icon: AlignRight,  key: "right" },
                  ].map(({ Icon, key }) => (
                    <button
                      key={key}
                      onClick={() => setAlign(key)}
                      className={`p-1.5 rounded-lg transition-colors ${align === key ? "bg-primary text-white" : "bg-surface-container-low text-muted-foreground"}`}
                    >
                      <Icon size={12} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { Icon: Bold,      active: bold,      set: setBold },
                  { Icon: Italic,    active: italic,    set: setItalic },
                  { Icon: Underline, active: underline, set: setUnderline },
                ].map(({ Icon, active, set }, i) => (
                  <button
                    key={i}
                    onClick={() => set(!active)}
                    className={`flex-1 py-1.5 rounded-lg transition-colors ${active ? "bg-primary text-white" : "bg-surface-container-low text-muted-foreground"}`}
                  >
                    <Icon size={13} className="mx-auto" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground font-body">Color</p>
              <div className="grid grid-cols-5 gap-2">
                {SWATCH_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c ? "border-primary scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2">
                <div className="w-5 h-5 rounded" style={{ background: color }} />
                <span className="text-xs font-mono text-foreground">{color.toUpperCase()}</span>
              </div>
            </div>

            {/* Position */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground font-body">Position & Size</p>
              <div className="grid grid-cols-2 gap-2">
                {[["X", "140"], ["Y", "220"], ["W", "240"], ["H", "60"]].map(([l, v]) => (
                  <div key={l} className="bg-surface-container-low rounded-xl px-3 py-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground font-body">{l}</span>
                    <span className="text-xs font-semibold text-foreground font-body">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
