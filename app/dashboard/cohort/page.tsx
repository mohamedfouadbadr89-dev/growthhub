"use client";

import { TrendingUp, TrendingDown, SlidersHorizontal, Download, ArrowRight, Lightbulb, Plus } from "lucide-react";

type CellStyle = "full" | "high" | "mid-high" | "mid" | "low" | "lowest" | "empty";

const COHORT_ROWS: { month: string; size: string; cells: (string | null)[]; cellStyles: CellStyle[] }[] = [
  {
    month: "Jan 2023", size: "4,281",
    cells: ["100%", "42%", "38%", "35%", "31%", "28%", "24%", "21%"],
    cellStyles: ["full", "high", "mid-high", "mid-high", "mid", "low", "lowest", "lowest"],
  },
  {
    month: "Feb 2023", size: "3,902",
    cells: ["100%", "45%", "41%", "37%", "34%", "29%", "26%", null],
    cellStyles: ["full", "high", "mid-high", "mid-high", "mid", "low", "lowest", "empty"],
  },
  {
    month: "Mar 2023", size: "4,550",
    cells: ["100%", "39%", "35%", "31%", "28%", "25%", null, null],
    cellStyles: ["full", "high", "mid-high", "mid-high", "mid", "low", "empty", "empty"],
  },
  {
    month: "Apr 2023", size: "4,120",
    cells: ["100%", "48%", "44%", "40%", "38%", null, null, null],
    cellStyles: ["full", "high", "mid-high", "mid-high", "mid", "empty", "empty", "empty"],
  },
  {
    month: "May 2023", size: "3,890",
    cells: ["100%", "51%", "47%", "42%", null, null, null, null],
    cellStyles: ["full", "high", "mid-high", "mid-high", "empty", "empty", "empty", "empty"],
  },
];

const CELL_CLASSES: Record<CellStyle, string> = {
  full:     "bg-primary text-white",
  high:     "bg-primary-container text-white",
  "mid-high": "bg-[#8bb5fc] text-foreground",
  mid:      "bg-[#c1d7fe] text-foreground",
  low:      "bg-surface-container-high text-foreground",
  lowest:   "bg-surface-container-low text-muted-foreground",
  empty:    "bg-background opacity-20 text-muted-foreground",
};

export default function CohortPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-primary text-xs font-bold uppercase tracking-widest font-body">
            Retention Performance
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans mt-1">
            Cohort Analysis
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-xl font-medium leading-relaxed font-body">
            Understand user longevity by tracking behavioral patterns over time. The heatmap visualizes
            the percentage of recurring active users relative to their signup month.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary text-sm font-bold shadow-sm border border-border hover:bg-surface-container-low transition-all font-body">
            <SlidersHorizontal size={16} /> Configure Segments
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all font-body">
            <Download size={16} /> Download CSV
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Heatmap */}
        <section className="col-span-12 lg:col-span-8 bg-white rounded-3xl p-8 shadow-[0_16px_32px_-12px_rgba(5,52,92,0.06)] border border-border">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold font-sans text-foreground">User Retention Heatmap</h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 font-body">
                Segment: All Paid Users (N=24,802)
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-surface-container-low text-[10px] font-bold text-muted-foreground border border-border font-body">
                MONTHLY VIEW
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-container-low text-[10px] font-bold text-muted-foreground border border-border font-body">
                PERCENTAGE %
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-1">
              <thead>
                <tr className="text-[11px] font-bold text-muted-foreground tracking-wider">
                  <th className="pb-4 pr-4 uppercase font-body">Cohort Month</th>
                  <th className="pb-4 text-center uppercase min-w-[80px] font-body">Size</th>
                  {["M0","M1","M2","M3","M4","M5","M6","M7"].map((h) => (
                    <th key={h} className="pb-4 text-center uppercase min-w-[50px] font-body">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs font-semibold">
                {COHORT_ROWS.map((row) => (
                  <tr key={row.month}>
                    <td className="py-3 pr-4 font-bold text-foreground font-body">{row.month}</td>
                    <td className="py-3 text-center bg-surface-container-low rounded-lg text-muted-foreground font-body">
                      {row.size}
                    </td>
                    {row.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={`py-3 text-center rounded-lg font-body ${CELL_CLASSES[row.cellStyles[i]]}`}
                      >
                        {cell ?? "--"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Retention Curve */}
        <section className="col-span-12 lg:col-span-4 bg-white rounded-3xl p-8 shadow-[0_16px_32px_-12px_rgba(5,52,92,0.06)] border border-border flex flex-col">
          <div className="mb-8">
            <h3 className="text-xl font-bold font-sans text-foreground">Retention Curve</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5 font-body">
              Average Lifetime Value over 12 Months
            </p>
          </div>

          <div className="flex-1 min-h-[240px] relative mt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="retentionGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#005bc4" stopOpacity="1" />
                  <stop offset="100%" stopColor="#005bc4" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 50, 100, 150, 200].map((y) => (
                <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#91b4e4" strokeOpacity="0.1" strokeWidth="1" />
              ))}
              <path
                d="M0,0 C50,120 100,140 150,150 S250,165 400,175"
                fill="none"
                stroke="#005bc4"
                strokeLinecap="round"
                strokeWidth="3"
              />
              <path
                d="M0,0 C50,120 100,140 150,150 S250,165 400,175 L400,200 L0,200 Z"
                fill="url(#retentionGrad)"
                fillOpacity="0.1"
              />
              {[[0,0],[100,140],[200,158],[400,175]].map(([cx,cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="4" fill="#005bc4" />
              ))}
            </svg>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-container-low rounded-2xl border border-border">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground font-body">Day 30</span>
              <div className="text-2xl font-extrabold text-foreground font-sans mt-1">42.8%</div>
              <div className="text-[10px] text-primary font-bold flex items-center gap-0.5 mt-0.5 font-body">
                <TrendingUp size={12} /> 2.1% vs avg
              </div>
            </div>
            <div className="p-4 bg-surface-container-low rounded-2xl border border-border">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground font-body">Day 180</span>
              <div className="text-2xl font-extrabold text-foreground font-sans mt-1">21.5%</div>
              <div className="text-[10px] text-error font-bold flex items-center gap-0.5 mt-0.5 font-body">
                <TrendingDown size={12} /> 0.4% vs avg
              </div>
            </div>
          </div>
        </section>

        {/* Insight Card */}
        <section className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container-high/50 rounded-3xl p-8 border border-border flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm shrink-0">
            <Lightbulb size={28} />
          </div>
          <div>
            <h4 className="font-bold text-foreground font-sans">Power Cohort Detected</h4>
            <p className="text-sm text-muted-foreground leading-relaxed font-body">
              May 2023 shows a 24% higher retention rate in M1 than the yearly average.
            </p>
          </div>
        </section>

        {/* Segment Breakdown */}
        <section className="col-span-12 md:col-span-6 lg:col-span-8 bg-surface-container rounded-3xl p-8 border border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-foreground font-sans">Active Segment Breakdown</h4>
            <button className="text-xs font-bold text-primary flex items-center gap-1 font-body hover:underline">
              View Details <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex gap-4 mt-6">
            <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden flex">
              <div className="h-full bg-primary" style={{ width: "65%" }} />
              <div className="h-full bg-primary-container" style={{ width: "25%" }} />
              <div className="h-full bg-border" style={{ width: "10%" }} />
            </div>
          </div>
          <div className="flex justify-between mt-3 text-[11px] font-bold uppercase tracking-tight text-muted-foreground font-body">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" /> Desktop (65%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-container" /> Mobile (25%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-border" /> Other (10%)
            </span>
          </div>
        </section>
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50">
        <Plus size={22} />
      </button>
    </div>
  );
}
