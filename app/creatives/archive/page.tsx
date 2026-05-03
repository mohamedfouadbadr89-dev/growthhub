"use client";

import { useState, useMemo } from "react";
import {
  Search, ChevronDown, RotateCcw, Copy, Edit2, Zap,
  AlertTriangle, X, CheckSquare, Square, Image, Video, Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform  = "All" | "Meta" | "Google" | "TikTok";
type Format    = "All" | "Image" | "Video" | "UGC";
type Status    = "All" | "active" | "paused" | "archived";
type Perf      = "All" | "High" | "Medium" | "Low";

interface CreativeArchive {
  id: string;
  name: string;
  thumbnail: string; // gradient css string
  tags: {
    platform: "Meta" | "Google" | "TikTok";
    format: "Image" | "Video" | "UGC";
  };
  performance_score: number;
  status: "active" | "paused" | "archived";
  ctr: string;
  roas: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CREATIVES: CreativeArchive[] = [
  {
    id: "c-001",
    name: "Summer Sale Hero — Meta",
    thumbnail: "linear-gradient(135deg, #005bc4 0%, #3d618c 100%)",
    tags: { platform: "Meta", format: "Image" },
    performance_score: 92,
    status: "active",
    ctr: "4.8%",
    roas: "4.2x",
  },
  {
    id: "c-002",
    name: "UGC Unboxing v3",
    thumbnail: "linear-gradient(135deg, #05345c 0%, #005bc4 100%)",
    tags: { platform: "TikTok", format: "UGC" },
    performance_score: 87,
    status: "active",
    ctr: "6.1%",
    roas: "3.9x",
  },
  {
    id: "c-003",
    name: "Google Display — Black Friday",
    thumbnail: "linear-gradient(135deg, #1a1a2e 0%, #3d618c 100%)",
    tags: { platform: "Google", format: "Image" },
    performance_score: 74,
    status: "paused",
    ctr: "2.3%",
    roas: "2.8x",
  },
  {
    id: "c-004",
    name: "Product Demo — 15s",
    thumbnail: "linear-gradient(135deg, #0f4c91 0%, #dce9ff 100%)",
    tags: { platform: "Meta", format: "Video" },
    performance_score: 61,
    status: "paused",
    ctr: "3.1%",
    roas: "2.1x",
  },
  {
    id: "c-005",
    name: "TikTok Hook — Pain Point",
    thumbnail: "linear-gradient(135deg, #005bc4 0%, #05345c 60%, #1a1a2e 100%)",
    tags: { platform: "TikTok", format: "Video" },
    performance_score: 95,
    status: "active",
    ctr: "7.4%",
    roas: "5.1x",
  },
  {
    id: "c-006",
    name: "Retargeting Static — Q3",
    thumbnail: "linear-gradient(135deg, #3d618c 0%, #91b4e4 100%)",
    tags: { platform: "Meta", format: "Image" },
    performance_score: 38,
    status: "archived",
    ctr: "1.2%",
    roas: "1.4x",
  },
  {
    id: "c-007",
    name: "Brand Awareness UGC",
    thumbnail: "linear-gradient(135deg, #05345c 0%, #91b4e4 100%)",
    tags: { platform: "TikTok", format: "UGC" },
    performance_score: 29,
    status: "archived",
    ctr: "0.9%",
    roas: "1.1x",
  },
  {
    id: "c-008",
    name: "Google PMax Creative Set",
    thumbnail: "linear-gradient(135deg, #1e3a5f 0%, #3d618c 50%, #005bc4 100%)",
    tags: { platform: "Google", format: "Video" },
    performance_score: 78,
    status: "active",
    ctr: "3.6%",
    roas: "3.3x",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function perfTier(score: number): "High" | "Medium" | "Low" {
  if (score >= 75) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

const PERF_STYLE: Record<string, string> = {
  High:   "text-emerald-700 bg-emerald-100",
  Medium: "text-amber-700 bg-amber-100",
  Low:    "text-red-600 bg-red-100",
};

const STATUS_STYLE: Record<string, string> = {
  active:   "text-emerald-700 bg-emerald-100",
  paused:   "text-amber-700 bg-amber-100",
  archived: "text-muted-foreground bg-surface-container-high",
};

const FORMAT_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Image: Image,
  Video: Video,
  UGC:   Users,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none bg-white border border-border rounded-xl pl-3 pr-8 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === "All" ? `${label}: All` : o}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreativeArchivePage() {
  const [search,   setSearch]   = useState("");
  const [platform, setPlatform] = useState<Platform>("All");
  const [format,   setFormat]   = useState<Format>("All");
  const [status,   setStatus]   = useState<Status>("All");
  const [perf,     setPerf]     = useState<Perf>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actioning, setActioning] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return MOCK_CREATIVES.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (platform !== "All" && c.tags.platform !== platform) return false;
      if (format   !== "All" && c.tags.format   !== format)   return false;
      if (status   !== "All" && c.status         !== status)   return false;
      if (perf !== "All" && perfTier(c.performance_score) !== perf) return false;
      return true;
    });
  }, [search, platform, format, status, perf]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() { setSelected(new Set()); }

  function clearFilters() {
    setSearch(""); setPlatform("All"); setFormat("All");
    setStatus("All"); setPerf("All");
  }

  function simulateAction(label: string) {
    setActioning(label);
    setTimeout(() => setActioning(null), 1200);
  }

  const hasFilters = search || platform !== "All" || format !== "All" || status !== "All" || perf !== "All";

  return (
    <div className="space-y-8 pb-12">

      {/* ── Header ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">Creatives</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Creative Archive</h1>
        <p className="text-muted-foreground mt-2 font-body">Manage, reuse, and relaunch high-performing creatives</p>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creatives…"
            className="w-full bg-surface-container-low border-none rounded-xl pl-9 pr-4 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="h-5 w-px bg-border" />
        <FilterSelect label="Platform"    value={platform} options={["All","Meta","Google","TikTok"]}           onChange={setPlatform} />
        <FilterSelect label="Format"      value={format}   options={["All","Image","Video","UGC"]}              onChange={setFormat} />
        <FilterSelect label="Status"      value={status}   options={["All","active","paused","archived"]}       onChange={setStatus} />
        <FilterSelect label="Performance" value={perf}     options={["All","High","Medium","Low"]}              onChange={setPerf} />
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors font-body ml-auto">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div className="bg-primary text-white rounded-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-bold font-body">{selected.size} selected</span>
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            {["Reuse Selected", "Duplicate", "Relaunch"].map((action) => (
              <button
                key={action}
                onClick={() => simulateAction(action)}
                disabled={actioning === action}
                className="px-4 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs font-bold font-body transition-colors disabled:opacity-60"
              >
                {actioning === action ? "…" : action}
              </button>
            ))}
          </div>
          <button onClick={clearSelection} className="ml-auto p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center space-y-3">
          <p className="text-foreground font-bold font-sans text-lg">No creatives found</p>
          <p className="text-sm text-muted-foreground font-body">Try adjusting your filters or search query.</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 px-5 py-2 rounded-xl border border-border text-sm font-bold font-body hover:bg-surface-container-low transition-colors">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((creative) => {
            const tier = perfTier(creative.performance_score);
            const isSelected = selected.has(creative.id);
            const FormatIcon = FORMAT_ICON[creative.tags.format];

            return (
              <div
                key={creative.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group ${
                  isSelected ? "border-primary/40 ring-2 ring-primary/20" : "border-border hover:border-primary/20"
                }`}
              >
                {/* Thumbnail */}
                <div
                  className="relative h-44 cursor-pointer"
                  style={{ background: creative.thumbnail }}
                  onClick={() => toggleSelect(creative.id)}
                >
                  {/* Selection checkbox */}
                  <div className={`absolute top-3 left-3 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    {isSelected
                      ? <CheckSquare size={20} className="text-white drop-shadow" />
                      : <Square size={20} className="text-white/80 drop-shadow" />
                    }
                  </div>

                  {/* Low performance warning */}
                  {tier === "Low" && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold font-body">
                      <AlertTriangle size={10} /> Low Perf
                    </div>
                  )}

                  {/* Format icon */}
                  <div className="absolute bottom-3 left-3 bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1.5">
                    <FormatIcon size={12} className="text-white" />
                    <span className="text-[10px] font-bold text-white font-body">{creative.tags.format}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Name + tags */}
                  <div>
                    <h3 className="font-bold text-foreground font-sans text-sm leading-tight line-clamp-1">{creative.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full font-body">
                        {creative.tags.platform}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-body ${STATUS_STYLE[creative.status]}`}>
                        {creative.status}
                      </span>
                    </div>
                  </div>

                  {/* Performance score */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-body">Performance</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full font-body ${PERF_STYLE[tier]}`}>
                        {tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            tier === "High" ? "bg-emerald-500" : tier === "Medium" ? "bg-amber-400" : "bg-red-400"
                          }`}
                          style={{ width: `${creative.performance_score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground font-sans w-12 text-right">
                        {creative.performance_score}/100
                      </span>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="flex items-center gap-3 py-2 border-t border-surface-container-low">
                    <div className="flex-1 text-center">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider font-body">CTR</p>
                      <p className="text-sm font-extrabold text-foreground font-sans">{creative.ctr}</p>
                    </div>
                    <div className="w-px h-6 bg-surface-container-low" />
                    <div className="flex-1 text-center">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider font-body">ROAS</p>
                      <p className="text-sm font-extrabold text-foreground font-sans">{creative.roas}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => simulateAction(`reuse-${creative.id}`)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold font-body transition-colors ${
                        creative.status === "archived"
                          ? "bg-primary text-white hover:bg-primary/90"
                          : "bg-surface-container-low text-foreground hover:bg-surface-container-high"
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <RotateCcw size={11} />
                        {actioning === `reuse-${creative.id}` ? "…" : "Reuse"}
                      </span>
                    </button>
                    <button
                      onClick={() => simulateAction(`dup-${creative.id}`)}
                      className="py-1.5 rounded-lg text-[11px] font-bold font-body bg-surface-container-low text-foreground hover:bg-surface-container-high transition-colors"
                    >
                      <span className="flex items-center justify-center gap-1">
                        <Copy size={11} />
                        {actioning === `dup-${creative.id}` ? "…" : "Duplicate"}
                      </span>
                    </button>
                    <button
                      onClick={() => simulateAction(`edit-${creative.id}`)}
                      className="py-1.5 rounded-lg text-[11px] font-bold font-body bg-surface-container-low text-foreground hover:bg-surface-container-high transition-colors"
                    >
                      <span className="flex items-center justify-center gap-1">
                        <Edit2 size={11} />
                        {actioning === `edit-${creative.id}` ? "…" : "Edit"}
                      </span>
                    </button>
                    <button
                      onClick={() => simulateAction(`launch-${creative.id}`)}
                      className="py-1.5 rounded-lg text-[11px] font-bold font-body bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <span className="flex items-center justify-center gap-1">
                        <Zap size={11} />
                        {actioning === `launch-${creative.id}` ? "…" : "Relaunch"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
