"use client";

import { useState } from "react";
import { Wand2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Sparkles, BookOpen } from "lucide-react";

type PlatformFilter = "All" | "Meta" | "Google" | "TikTok";
type TypeFilter = "All Types" | "Lookalike" | "Broad" | "Retargeting";

interface AudienceCard {
  id: string;
  platform: string;
  platformColor: string;
  platformFilter: PlatformFilter;
  type: string;
  typeFilter: TypeFilter;
  critical: boolean;
  criticalLabel?: string;
  title: string;
  size: string;
  metric: string;
  metricLabel: string;
  trend: string;
  trendUp: boolean;
  rec: { variant: "blue" | "amber"; title: string; text: string };
  overlapLabel: string;
  overlapLabelClass: string;
  overlapBars: { color: string; height: string }[];
  overlapDesc: string;
  satBars: { color: string; height: string }[];
  satDesc: string;
  thirdLabel: string;
  thirdValue: string;
  thirdValueClass: string;
  thirdNote: string;
  thirdNoteClass: string;
  primaryLabel: string;
  primaryClass: string;
  secondaryLabel: string;
  secondaryClass: string;
  canDismiss: boolean;
}

const MOCK_AUDIENCES: AudienceCard[] = [
  {
    id: "a-001",
    platform: "Meta Ads",
    platformColor: "text-blue-600",
    platformFilter: "Meta",
    type: "Lookalike",
    typeFilter: "Lookalike",
    critical: false,
    title: "High LTV Lookalike 1%",
    size: "2.4M reach",
    metric: "4.2x ROAS",
    metricLabel: "ROAS",
    trend: "+12.4%",
    trendUp: true,
    rec: {
      variant: "blue",
      title: "AI Recommendation",
      text: "Expand lookalike to 2% to capture an estimated 40% more qualified reach while maintaining ROAS above 3.5x. Current saturation is within healthy bounds.",
    },
    overlapLabel: "Moderate Overlap",
    overlapLabelClass: "text-blue-600 bg-blue-50",
    overlapBars: [
      { color: "bg-blue-500", height: "h-4" },
      { color: "bg-blue-500", height: "h-6" },
      { color: "bg-blue-400", height: "h-8" },
      { color: "bg-blue-300", height: "h-5" },
      { color: "bg-blue-200", height: "h-3" },
    ],
    overlapDesc: "Increasing",
    satBars: [
      { color: "bg-blue-200", height: "h-4" },
      { color: "bg-blue-300", height: "h-6" },
      { color: "bg-blue-400", height: "h-5" },
      { color: "bg-blue-500", height: "h-8" },
      { color: "bg-blue-400", height: "h-7" },
    ],
    satDesc: "Saturation: Moderate & Rising",
    thirdLabel: "Frequency",
    thirdValue: "2.1x",
    thirdValueClass: "text-foreground font-bold",
    thirdNote: "Healthy range",
    thirdNoteClass: "text-emerald-600 text-xs",
    primaryLabel: "Apply Audience Change",
    primaryClass: "bg-primary text-white hover:opacity-90",
    secondaryLabel: "Push to Campaign",
    secondaryClass: "border border-border text-foreground hover:bg-surface-container-high",
    canDismiss: false,
  },
  {
    id: "a-002",
    platform: "TikTok Ads",
    platformColor: "text-pink-600",
    platformFilter: "TikTok",
    type: "Broad Interest",
    typeFilter: "Broad",
    critical: true,
    criticalLabel: "CRITICAL SATURATION",
    title: "Broad Interest: Fitness",
    size: "8.1M reach",
    metric: "$12.40 CPA",
    metricLabel: "CPA",
    trend: "-8.0%",
    trendUp: false,
    rec: {
      variant: "amber",
      title: "Action Required",
      text: "This broad audience is heavily saturated. CPA has risen 28% in 14 days. Narrow targeting to Interest: Fitness + Supplement buyers or introduce a 14-day exclusion window immediately.",
    },
    overlapLabel: "Low Overlap",
    overlapLabelClass: "text-amber-600 bg-amber-50",
    overlapBars: [
      { color: "bg-amber-400", height: "h-10" },
      { color: "bg-amber-500", height: "h-10" },
      { color: "bg-amber-500", height: "h-10" },
      { color: "bg-amber-600", height: "h-10" },
      { color: "bg-amber-600", height: "h-10" },
    ],
    overlapDesc: "Saturated",
    satBars: [
      { color: "bg-amber-500", height: "h-10" },
      { color: "bg-amber-500", height: "h-10" },
      { color: "bg-amber-600", height: "h-10" },
      { color: "bg-amber-600", height: "h-10" },
      { color: "bg-amber-700", height: "h-10" },
    ],
    satDesc: "Saturation: Critical",
    thirdLabel: "Conversion",
    thirdValue: "Down 12%",
    thirdValueClass: "text-red-500 font-bold",
    thirdNote: "14-day decline",
    thirdNoteClass: "text-red-400 text-xs",
    primaryLabel: "Action Required: Refine Audience",
    primaryClass: "bg-amber-500 text-white hover:opacity-90",
    secondaryLabel: "Dismiss",
    secondaryClass: "border border-border text-muted-foreground hover:bg-surface-container-high",
    canDismiss: true,
  },
];

const SATURATION_RISKS = [
  { label: "High Frequency: UK Lookalike", color: "bg-amber-400", textColor: "text-amber-700", bgColor: "bg-amber-50" },
  { label: "CPA Drift: US Retargeting", color: "bg-blue-400", textColor: "text-blue-700", bgColor: "bg-blue-50" },
];

export default function AudiencePage() {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("All");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All Types");
  const [executing, setExecuting] = useState<Record<string, boolean>>({});
  const [executed, setExecuted] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const filtered = MOCK_AUDIENCES.filter((a) => {
    if (platformFilter !== "All" && a.platformFilter !== platformFilter) return false;
    if (typeFilter !== "All Types" && a.typeFilter !== typeFilter) return false;
    if (dismissed.has(a.id)) return false;
    return true;
  });

  function handleAction(id: string) {
    setExecuting((s) => ({ ...s, [id]: true }));
    setTimeout(() => {
      setExecuting((s) => ({ ...s, [id]: false }));
      setExecuted((s) => ({ ...s, [id]: true }));
    }, 1200);
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  const PLATFORM_PILLS: PlatformFilter[] = ["All", "Meta", "Google", "TikTok"];
  const TYPE_PILLS: TypeFilter[] = ["All Types", "Lookalike", "Broad", "Retargeting"];

  // Donut chart values
  const score = 88;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Audience Recommendations
          </h1>
          <p className="text-muted-foreground font-body">AI-generated audience insights optimized for your active campaigns</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all font-body text-sm self-start md:self-auto">
          <Wand2 size={16} />
          Bulk Apply Insights
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          {PLATFORM_PILLS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all font-body ${
                platformFilter === p
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {TYPE_PILLS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all font-body ${
                typeFilter === t
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left — Audience Cards */}
        <div className="lg:col-span-8 space-y-6">
          {filtered.length === 0 ? (
            <div className="bg-surface-container-low rounded-2xl p-12 text-center">
              <p className="text-muted-foreground font-body">No audience recommendations match the selected filters.</p>
            </div>
          ) : (
            filtered.map((card) => (
              <div key={card.id} className="bg-surface-container-low rounded-2xl overflow-hidden border border-transparent hover:border-border transition-all">
                {/* Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-bold font-body ${card.platformColor}`}>{card.platform}</span>
                        <span className="text-border">·</span>
                        <span className="text-xs text-muted-foreground font-body">{card.type}</span>
                        <span className="text-border">·</span>
                        <span className="text-xs text-muted-foreground font-body">{card.size}</span>
                        {card.critical && (
                          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600 uppercase tracking-widest font-body">
                            {card.criticalLabel}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-foreground font-sans">{card.title}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-extrabold text-foreground font-sans">{card.metric}</div>
                      <div className={`flex items-center gap-1 justify-end text-sm font-semibold font-body ${card.trendUp ? "text-emerald-600" : "text-red-500"}`}>
                        {card.trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {card.trend}
                      </div>
                    </div>
                  </div>

                  {/* AI Rec Banner */}
                  <div className={`mt-4 rounded-xl p-4 flex gap-3 ${card.rec.variant === "blue" ? "bg-primary/5 border border-primary/20" : "bg-amber-50 border border-amber-200"}`}>
                    {card.rec.variant === "blue" ? (
                      <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`text-xs font-bold mb-1 font-body ${card.rec.variant === "blue" ? "text-primary" : "text-amber-600"}`}>
                        {card.rec.title}
                      </p>
                      <p className="text-xs text-foreground leading-relaxed font-body">{card.rec.text}</p>
                    </div>
                  </div>
                </div>

                {/* Analysis Row */}
                <div className="px-6 pb-4 grid grid-cols-3 gap-4">
                  {/* Overlap */}
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-2 font-body">Audience Overlap</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-body ${card.overlapLabelClass}`}>
                      {card.overlapLabel}
                    </span>
                    <div className="flex items-end gap-1 mt-3 h-10">
                      {card.overlapBars.map((b, i) => (
                        <div key={i} className={`flex-1 rounded-t ${b.color} ${b.height}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-body">{card.overlapDesc}</p>
                  </div>

                  {/* Saturation */}
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-3 font-body">Saturation Level</p>
                    <div className="flex items-end gap-1 h-10">
                      {card.satBars.map((b, i) => (
                        <div key={i} className={`flex-1 rounded-t ${b.color} ${b.height}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-body">{card.satDesc}</p>
                  </div>

                  {/* Third metric */}
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-2 font-body">{card.thirdLabel}</p>
                    <p className={`text-xl font-body ${card.thirdValueClass}`}>{card.thirdValue}</p>
                    <p className={card.thirdNoteClass}>{card.thirdNote}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                  {executed[card.id] ? (
                    <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-100 text-emerald-700 font-body" disabled>
                      <CheckCircle size={15} />
                      Applied
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(card.id)}
                      disabled={executing[card.id]}
                      className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 font-body flex items-center gap-2 ${card.primaryClass}`}
                    >
                      {executing[card.id] && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      {executing[card.id] ? "Applying…" : card.primaryLabel}
                    </button>
                  )}
                  <button
                    onClick={() => card.canDismiss ? handleDismiss(card.id) : undefined}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 font-body ${card.secondaryClass}`}
                  >
                    {card.secondaryLabel}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Audience Health Donut */}
          <div className="bg-surface-container-low rounded-2xl p-6">
            <p className="text-sm font-bold text-foreground mb-4 font-sans">Overall Audience Health</p>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="#dce9ff" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#005bc4"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-foreground font-sans">{score}</span>
                  <span className="text-[10px] text-muted-foreground font-body">/ 100</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-600 font-body">Healthy Scaling Phase</p>
                <p className="text-xs text-muted-foreground mt-1 font-body">2 audiences need attention. Overall performance is strong.</p>
              </div>
            </div>
          </div>

          {/* Saturation Risks */}
          <div className="bg-surface-container-low rounded-2xl p-6">
            <p className="text-sm font-bold text-foreground mb-3 font-sans">Saturation Risks</p>
            <div className="space-y-2">
              {SATURATION_RISKS.map((r) => (
                <div key={r.label} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${r.bgColor}`}>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${r.color}`} />
                  <p className={`text-xs font-semibold font-body ${r.textColor}`}>{r.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="bg-surface-container-low rounded-2xl p-6">
            <p className="text-sm font-bold text-foreground mb-3 font-sans">Quick Insights</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-body mb-1">Avg. ROAS</p>
                <p className="text-lg font-extrabold text-foreground font-sans">3.82x</p>
                <p className="text-[10px] text-emerald-600 font-body">+5.2% WoW</p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-body mb-1">New Reach</p>
                <p className="text-lg font-extrabold text-foreground font-sans">+12%</p>
                <p className="text-[10px] text-emerald-600 font-body">vs last period</p>
              </div>
            </div>
          </div>

          {/* Knowledge Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#05345c] to-[#0a2540] p-6">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-widest mb-4 font-body">
                <BookOpen size={10} />
                Curator Academy
              </div>
              <h4 className="text-white font-bold font-sans mb-2">Why audience refresh matters</h4>
              <p className="text-white/70 text-xs leading-relaxed font-body">
                Saturated audiences drive up CPM by 30–60%. Rotating lookalikes every 30 days keeps acquisition costs predictable and conversion rates stable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
