"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Rocket, ShoppingCart, Megaphone, Brain, Filter } from "lucide-react";

const LTV_METRICS = [
  {
    label: "30 Day LTV",
    value: "$124.50",
    trend: "+4.2%",
    barColor: "bg-primary",
    barWidth: "65%",
    glowColor: "bg-primary/5",
    border: "",
    labelColor: "text-muted-foreground",
  },
  {
    label: "60 Day LTV",
    value: "$210.15",
    trend: "+12.8%",
    barColor: "bg-[#5d4b74]",
    barWidth: "48%",
    glowColor: "bg-tertiary/5",
    border: "",
    labelColor: "text-muted-foreground",
  },
  {
    label: "90 Day LTV",
    value: "$345.90",
    trend: "+8.1%",
    barColor: "bg-[#dbe2f9]",
    barWidth: "72%",
    glowColor: "bg-[#575f72]/5",
    border: "",
    labelColor: "text-muted-foreground",
  },
  {
    label: "365 Day LTV (Projected)",
    value: "$1,420.00",
    trend: "+22.4%",
    barColor: "bg-[#4388fd]",
    barWidth: "88%",
    glowColor: "bg-primary/10",
    border: "border-2 border-primary/10",
    labelColor: "text-primary",
  },
];

const CHART_TABS = ["Daily", "Monthly", "Quarterly"];

const TABLE_ROWS = [
  {
    Icon: Rocket,
    iconBg: "bg-primary/10", iconColor: "text-primary",
    name: "Enterprise Growth", channel: "Direct Sales",
    ltv30: "$840.00", ltv90: "$2,100.00", ltv365: "$12,450.00",
    TrendIcon: TrendingUp, trendColor: "text-primary",
    rowBg: "",
  },
  {
    Icon: ShoppingCart,
    iconBg: "bg-[#e4ceff]/20", iconColor: "text-[#695781]",
    name: "E-commerce SMB", channel: "Paid Search",
    ltv30: "$124.00", ltv90: "$340.00", ltv365: "$1,105.00",
    TrendIcon: TrendingUp, trendColor: "text-primary",
    rowBg: "bg-surface-container-low/30",
  },
  {
    Icon: Megaphone,
    iconBg: "bg-[#dbe2f9]/20", iconColor: "text-[#575f72]",
    name: "Early Adopters", channel: "Referral",
    ltv30: "$45.00", ltv90: "$112.00", ltv365: "$560.00",
    TrendIcon: TrendingDown, trendColor: "text-error",
    rowBg: "",
  },
  {
    Icon: Brain,
    iconBg: "bg-primary/10", iconColor: "text-primary",
    name: "Data Science Labs", channel: "Organic",
    ltv30: "$310.00", ltv90: "$890.00", ltv365: "$4,200.00",
    TrendIcon: Minus, trendColor: "text-primary",
    rowBg: "bg-surface-container-low/30",
  },
];

export default function LTVPage() {
  const [activeTab, setActiveTab] = useState("Monthly");

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* LTV Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {LTV_METRICS.map((m) => (
          <div
            key={m.label}
            className={`bg-white p-6 rounded-xl shadow-[0_16px_32px_0_rgba(5,52,92,0.06)] relative overflow-hidden group ${m.border}`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 ${m.glowColor} rounded-full blur-2xl`} />
            <p className={`text-xs font-bold uppercase tracking-widest mb-1 font-body ${m.labelColor}`}>
              {m.label}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-foreground font-sans">{m.value}</h3>
              <span className="text-xs font-bold text-primary font-body">{m.trend}</span>
            </div>
            <div className="mt-4 h-1 w-full bg-surface-container-low rounded-full overflow-hidden">
              <div className={`h-full ${m.barColor} rounded-full`} style={{ width: m.barWidth }} />
            </div>
          </div>
        ))}
      </div>

      {/* LTV Trend Chart */}
      <div className="bg-white rounded-2xl shadow-[0_16px_32px_0_rgba(5,52,92,0.06)] p-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground font-sans">
              Customer Lifetime Value Trend
            </h2>
            <p className="text-muted-foreground text-sm mt-1 font-body">
              Visualizing cumulative LTV growth over the last 12 months
            </p>
          </div>
          <div className="flex gap-2">
            {CHART_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors font-body ${
                  activeTab === t
                    ? "bg-primary text-white"
                    : "bg-surface-container-high text-muted-foreground hover:bg-surface-container-high"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="relative h-80 w-full bg-surface-container-low rounded-xl overflow-hidden group">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between py-8 px-12 opacity-30">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-px w-full bg-border" />
            ))}
          </div>

          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 1200 320"
          >
            <defs>
              <linearGradient id="ltvGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#005bc4" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#005bc4" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,200 Q150,180 300,140 T600,100 T900,40 T1200,60"
              fill="transparent"
              stroke="#005bc4"
              strokeLinecap="round"
              strokeWidth="4"
            />
            <path
              d="M0,200 Q150,180 300,140 T600,100 T900,40 T1200,60 L1200,320 L0,320 Z"
              fill="url(#ltvGradient)"
            />
            <circle cx="900" cy="40" r="6" fill="#005bc4" className="animate-pulse" />
          </svg>

          <div className="absolute top-12 left-[75%] bg-foreground text-white p-3 rounded-lg text-xs shadow-xl opacity-0 group-hover:opacity-100 transition-opacity font-body">
            <p className="font-bold">September 2023</p>
            <p className="opacity-80">Avg. LTV: $1,240.12</p>
          </div>
        </div>

        <div className="flex justify-between px-12 mt-4 text-[10px] font-bold text-muted-foreground tracking-widest uppercase font-body">
          {["Oct 22", "Jan 23", "Apr 23", "Jul 23", "Oct 23"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>

      {/* Cohort Performance Table */}
      <div className="bg-white rounded-2xl shadow-[0_16px_32px_0_rgba(5,52,92,0.06)] overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground font-sans">
            Cohort Performance Analysis
          </h2>
          <button className="flex items-center gap-2 text-primary font-bold text-sm px-4 py-2 hover:bg-surface-container-low rounded-lg transition-all font-body">
            <Filter size={14} /> Filter Rows
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
                {["Customer Segment", "Acquisition Channel", "30d LTV", "90d LTV", "365d LTV", "Trend"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-4 font-body ${
                      i === 0 ? "px-8" : i === 5 ? "px-8 text-center" : i >= 2 ? "px-4 text-right" : "px-4"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {TABLE_ROWS.map((row) => (
                <tr
                  key={row.name}
                  className={`group hover:bg-surface-container-high transition-colors ${row.rowBg}`}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${row.iconBg} flex items-center justify-center ${row.iconColor}`}>
                        <row.Icon size={14} />
                      </div>
                      <span className="font-bold text-foreground font-body">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-6">
                    <span className="px-3 py-1 bg-surface-container-high text-muted-foreground rounded-full text-xs font-medium font-body">
                      {row.channel}
                    </span>
                  </td>
                  <td className="px-4 py-6 text-right font-medium font-body text-foreground">{row.ltv30}</td>
                  <td className="px-4 py-6 text-right font-medium font-body text-foreground">{row.ltv90}</td>
                  <td className="px-4 py-6 text-right font-bold text-foreground font-body">{row.ltv365}</td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <row.TrendIcon size={20} className={row.trendColor} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex justify-between items-center text-xs font-bold text-muted-foreground font-body">
          <span>Showing 4 of 28 segments</span>
          <div className="flex gap-4 items-center">
            <button className="hover:text-primary transition-colors">Previous</button>
            <div className="flex gap-2">
              <span className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center">1</span>
              <span className="w-6 h-6 rounded hover:bg-surface-container-high flex items-center justify-center cursor-pointer transition-colors">2</span>
              <span className="w-6 h-6 rounded hover:bg-surface-container-high flex items-center justify-center cursor-pointer transition-colors">3</span>
            </div>
            <button className="hover:text-primary transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
