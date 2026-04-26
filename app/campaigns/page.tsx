"use client";

import { useState } from "react";
import {
  Search, Plus, Calendar, MoreHorizontal, ChevronDown, ChevronRight,
  Pause, Play, Copy, TrendingUp, X, CheckCircle2, AlertCircle, Sparkles,
} from "lucide-react";

type PlatformFilter = "All" | "Meta" | "Google" | "TikTok";
type StatusFilter  = "All" | "Active" | "Learning" | "Paused";

interface Campaign {
  id: string;
  name: string;
  platform: PlatformFilter;
  platformDot: string;
  status: StatusFilter;
  budget: string;
  spend: string;
  revenue: string;
  roas: string;
  roasHighlight: boolean;
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "c-001",
    name: "Summer Collection Launch 2024",
    platform: "Meta",
    platformDot: "#1877F2",
    status: "Active",
    budget: "$25,000",
    spend: "$18,402",
    revenue: "$84,649",
    roas: "4.6x",
    roasHighlight: true,
  },
  {
    id: "c-002",
    name: "Black Friday Retargeting",
    platform: "Google",
    platformDot: "#4285F4",
    status: "Learning",
    budget: "$12,000",
    spend: "$3,120",
    revenue: "$9,510",
    roas: "3.1x",
    roasHighlight: false,
  },
  {
    id: "c-003",
    name: "Spring Clearance - EMEA",
    platform: "TikTok",
    platformDot: "#FE2C55",
    status: "Paused",
    budget: "$50,000",
    spend: "$48,910",
    revenue: "$152,001",
    roas: "3.1x",
    roasHighlight: false,
  },
];

const AD_SETS = [
  { name: "Broad Targeting - US",  spend: "$5,201", roas: "5.2x" },
  { name: "Lookalike 1% Buyers",   spend: "$8,420", roas: "4.1x" },
];

const CREATIVE_GRADIENTS = [
  "linear-gradient(135deg, #005bc4 0%, #3d618c 100%)",
  "linear-gradient(135deg, #05345c 0%, #1a5276 100%)",
];

const CREATIVE_CTR = ["3.2% CTR", "2.8% CTR"];

const STATUS_STYLES: Record<StatusFilter, { badge: string; dot: string }> = {
  All:      { badge: "",                                        dot: ""                  },
  Active:   { badge: "bg-green-100 text-green-700",            dot: "bg-green-500 animate-pulse"  },
  Learning: { badge: "bg-yellow-100 text-yellow-700",          dot: "bg-yellow-500"     },
  Paused:   { badge: "bg-surface-container-high text-muted-foreground", dot: "bg-border" },
};

const ALLOCATION = [
  { label: "Meta Ads",      pct: 62, barClass: "bg-blue-600" },
  { label: "Google Search", pct: 28, barClass: "bg-blue-400" },
  { label: "TikTok",        pct: 10, barClass: "bg-pink-500" },
];

export default function CampaignsPage() {
  const [search,         setSearch]         = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("All");
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("All");
  const [expandedId,     setExpandedId]     = useState<string | null>("c-001");
  const [selected,       setSelected]       = useState<Set<string>>(new Set(["c-001"]));
  const [applying,       setApplying]       = useState(false);
  const [applied,        setApplied]        = useState(false);
  const [quickActions,   setQuickActions]   = useState<Record<string, string>>({});

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleApply() {
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      setApplied(true);
    }, 1200);
  }

  function handleQuickAction(id: string, action: string) {
    setQuickActions((s) => ({ ...s, [id]: action }));
    setTimeout(() => setQuickActions((s) => ({ ...s, [id]: "" })), 1500);
  }

  const filtered = MOCK_CAMPAIGNS.filter((c) => {
    if (platformFilter !== "All" && c.platform !== platformFilter) return false;
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
          Campaigns
        </h1>
        <p className="text-muted-foreground font-body">Manage, monitor, and control all campaigns across platforms</p>
      </div>

      {/* Filter / Control Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-border/20 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns…"
            className="w-full bg-surface-container-low border-none rounded-lg py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-body"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {([
            { value: platformFilter, onChange: (v: string) => setPlatformFilter(v as PlatformFilter), options: ["All", "Meta", "Google", "TikTok"], prefix: "Platform:" },
            { value: statusFilter,   onChange: (v: string) => setStatusFilter(v as StatusFilter),     options: ["All", "Active", "Learning", "Paused"], prefix: "Status:" },
          ]).map((sel, i) => (
            <select
              key={i}
              value={sel.value}
              onChange={(e) => sel.onChange(e.target.value)}
              className="bg-surface-container-low border-none rounded-lg text-xs font-semibold py-2 px-3 focus:ring-0 cursor-pointer font-body text-foreground"
            >
              {sel.options.map((o) => (
                <option key={o} value={o}>{i === 0 ? `Platform: ${o}` : `Status: ${o}`}</option>
              ))}
            </select>
          ))}
          <select className="bg-surface-container-low border-none rounded-lg text-xs font-semibold py-2 px-3 focus:ring-0 cursor-pointer font-body text-foreground">
            <option>Objective</option>
            <option>Conversion</option>
            <option>Traffic</option>
          </select>
          <button className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-lg text-xs font-semibold hover:bg-surface-container-high transition-colors font-body">
            <Calendar size={13} />
            Last 7d
          </button>
        </div>

        <button className="flex items-center gap-2 bg-gradient-to-br from-primary to-[#2563eb] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform font-body">
          <Plus size={16} />
          Create Campaign
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg">
              <CheckCircle2 size={14} />
              <span className="text-xs font-bold font-body">{selected.size} Selected</span>
            </div>
            <div className="h-4 w-px bg-blue-200" />
            <p className="text-[11px] font-medium text-blue-800 uppercase tracking-wider font-body">Bulk Actions</p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { Icon: Pause,     label: "Pause"           },
              { Icon: Play,      label: "Activate"        },
              { Icon: Copy,      label: "Duplicate"       },
              { Icon: TrendingUp,label: "Increase Budget" },
            ].map(({ Icon, label }) => (
              <button
                key={label}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm font-body ${
                  label === "Activate"
                    ? "bg-primary text-white hover:opacity-90"
                    : "bg-white border border-border text-foreground hover:bg-surface-container-low"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
            <button
              onClick={() => setSelected(new Set())}
              className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex gap-8 items-start">

        {/* Table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-border/20 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded border-border text-primary focus:ring-primary/20"
                    />
                  </th>
                  {["Campaign Name", "Platform", "Status", "Budget", "Spend", "Revenue", "ROAS", "Actions"].map((h) => (
                    <th key={h} className="p-4 text-[11px] uppercase tracking-wider font-bold text-muted-foreground font-body whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((c) => {
                  const isExpanded = expandedId === c.id;
                  const isSelected = selected.has(c.id);
                  const st = STATUS_STYLES[c.status];
                  const qa = quickActions[c.id];

                  return (
                    <>
                      <tr
                        key={c.id}
                        className={`group transition-colors ${isExpanded ? "bg-blue-50/30" : "hover:bg-surface-container-low/50"}`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded border-border text-primary focus:ring-primary/20"
                          />
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => toggleExpand(c.id)}
                            className="flex items-center gap-2 text-left"
                          >
                            {isExpanded
                              ? <ChevronDown size={14} className="text-primary shrink-0" />
                              : <ChevronRight size={14} className="text-border shrink-0" />
                            }
                            <span className="font-bold text-foreground font-body text-sm">{c.name}</span>
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-full w-fit">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.platformDot }} />
                            <span className="text-xs font-bold text-foreground font-body">{c.platform}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight font-body w-fit ${st.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-semibold text-foreground font-body whitespace-nowrap">{c.budget}</td>
                        <td className="p-4 text-sm font-medium text-muted-foreground font-body whitespace-nowrap">{c.spend}</td>
                        <td className="p-4 text-sm font-bold text-foreground font-body whitespace-nowrap">{c.revenue}</td>
                        <td className="p-4">
                          <div className={`px-2 py-1 text-[11px] font-bold rounded-md w-fit font-body ${c.roasHighlight ? "bg-primary text-white" : "bg-surface-container-high text-foreground"}`}>
                            {c.roas}
                          </div>
                        </td>
                        <td className="p-4">
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${c.id}-detail`} className="bg-blue-50/20">
                          <td colSpan={9} className="p-0">
                            <div className="px-12 py-6 grid grid-cols-12 gap-8 border-t border-blue-100/50">
                              {/* Top Ad Sets */}
                              <div className="col-span-4 space-y-4">
                                <h4 className="text-[11px] uppercase font-bold text-muted-foreground font-body">Top Ad Sets</h4>
                                <div className="space-y-2">
                                  {AD_SETS.map((as) => (
                                    <div key={as.name} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                                      <div>
                                        <p className="text-xs font-bold text-foreground font-body">{as.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-body">{as.spend} Spend</p>
                                      </div>
                                      <span className="text-xs font-black text-green-600 font-body">{as.roas}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Top Creatives */}
                              <div className="col-span-4 space-y-4">
                                <h4 className="text-[11px] uppercase font-bold text-muted-foreground font-body">Top Creatives</h4>
                                <div className="flex gap-3">
                                  {CREATIVE_GRADIENTS.map((gradient, i) => (
                                    <div key={i} className="relative w-20 h-28 rounded-lg overflow-hidden shrink-0">
                                      <div className="absolute inset-0" style={{ background: gradient }} />
                                      <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1.5 text-center">
                                        <p className="text-[10px] font-bold text-white font-body">{CREATIVE_CTR[i]}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* AI Insight + Quick Actions */}
                              <div className="col-span-4 space-y-4">
                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3">
                                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[11px] font-black text-red-900 uppercase font-body">AI Insight</p>
                                    <p className="text-xs text-red-700 mt-1 leading-relaxed font-body">
                                      ROAS decreased by 12% in last 24h due to rising CPA in Broad Targeting.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { label: "+10% Budget", primary: true  },
                                    { label: "+20% Budget", primary: true  },
                                    { label: "Pause",       primary: false },
                                    { label: "Duplicate",   primary: false },
                                  ].map(({ label, primary }) => (
                                    <button
                                      key={label}
                                      onClick={() => handleQuickAction(c.id, label)}
                                      className={`px-3 py-2 rounded-lg text-xs font-bold font-body transition-all ${
                                        qa === label
                                          ? "bg-emerald-600 text-white"
                                          : primary
                                          ? "bg-[#2563eb] text-white hover:opacity-90"
                                          : "bg-surface-container-high text-foreground hover:bg-surface-container-highest"
                                      }`}
                                    >
                                      {qa === label ? "Done!" : label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 shrink-0 sticky top-6 space-y-6">

          {/* Account Snapshot */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/20">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 font-body">
              Account Snapshot
            </h3>
            <div className="space-y-4">
              {[
                { label: "Total Spend",   value: "$74,209.50",   highlight: false },
                { label: "Total Revenue", value: "$284,192.10",  highlight: false },
                { label: "Avg. ROAS",     value: "3.83x",        highlight: true  },
              ].map((kpi) => (
                <div key={kpi.label}>
                  <p className="text-xs text-muted-foreground font-body">{kpi.label}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-black tracking-tight font-sans ${kpi.highlight ? "text-primary" : "text-foreground"}`}>
                      {kpi.value}
                    </p>
                    {kpi.highlight && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md font-body">
                        +4.2%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Strategy */}
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <h3 className="text-sm font-black text-foreground uppercase font-body">AI Strategy</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-xl border border-primary/10 shadow-sm">
                <p className="text-xs font-bold text-foreground font-body">Efficiency Alert</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed font-body">
                  Budget inefficiency detected in 3 active campaigns. Learning phase prolonged.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-primary/10 shadow-sm">
                <p className="text-xs font-bold text-foreground font-body">Recommendation</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed font-body">
                  Shift{" "}
                  <span className="font-bold text-primary">$2,400</span>{" "}
                  budget from{" "}
                  <span className="italic text-muted-foreground line-through">Spring Clearance</span>{" "}
                  to{" "}
                  <span className="font-bold text-foreground">Summer Collection</span>.
                </p>
                {applied ? (
                  <button className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg font-body" disabled>
                    <CheckCircle2 size={11} />
                    Applied!
                  </button>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm active:scale-95 transition-transform font-body disabled:opacity-80"
                  >
                    {applying && (
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {applying ? "Applying…" : "Apply Optimization"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Platform Allocation */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/20">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 font-body">
              Allocation
            </h3>
            <div className="space-y-3">
              {ALLOCATION.map((a) => (
                <div key={a.label}>
                  <div className="flex justify-between text-[11px] font-bold mb-1 text-foreground font-body">
                    <span>{a.label}</span>
                    <span>{a.pct}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div className={`${a.barClass} h-full rounded-full`} style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
