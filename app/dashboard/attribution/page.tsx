"use client";

import { useState } from "react";
import { TrendingUp, Search, Globe, Video, Mail, Download } from "lucide-react";

const ATTRIBUTION_MODELS = ["First Click", "Last Click", "Multi-Touch"];

const CHART_BARS = [
  { label: "Google", height: "85%", color: "bg-primary-container" },
  { label: "Meta",   height: "65%", color: "bg-primary" },
  { label: "TikTok", height: "40%", color: "bg-[#317bef]" },
  { label: "Email",  height: "25%", color: "bg-surface-container-high" },
];

const HEALTH_BARS = [
  { label: "Direct Traffic",       value: "72%", width: "72%", color: "bg-[#4388fd]" },
  { label: "Assisted Conversions", value: "28%", width: "28%", color: "bg-[#d6c0f0]" },
];

const TABLE_ROWS = [
  { Icon: Search,  name: "Google Search",       conversions: "1,240", value: "$58,280", roas: "5.2x", pct: "42%", barWidth: "42%" },
  { Icon: Globe,   name: "Meta Ads",            conversions: "890",   value: "$41,400", roas: "4.1x", pct: "28%", barWidth: "28%" },
  { Icon: Video,   name: "TikTok For Business", conversions: "512",   value: "$22,540", roas: "3.8x", pct: "18%", barWidth: "18%" },
  { Icon: Mail,    name: "Retention Email",     conversions: "340",   value: "$20,630", roas: "6.4x", pct: "12%", barWidth: "12%" },
];

export default function AttributionPage() {
  const [activeModel, setActiveModel] = useState("First Click");

  return (
    <div className="space-y-8">
      {/* Header & Model Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h3 className="font-sans font-extrabold text-3xl tracking-tight text-foreground">
            Attribution Dashboard
          </h3>
          <p className="text-muted-foreground mt-1 font-body text-sm">
            Analyze conversion paths and optimize channel performance.
          </p>
        </div>
        <div className="bg-surface-container-low p-1.5 rounded-xl flex gap-1">
          {ATTRIBUTION_MODELS.map((m) => (
            <button
              key={m}
              onClick={() => setActiveModel(m)}
              className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all font-body ${
                activeModel === m
                  ? "bg-white shadow-sm text-primary"
                  : "text-muted-foreground hover:bg-surface-container-high"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Channel Contribution Chart */}
        <div className="lg:col-span-8 bg-white rounded-xl p-8 border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="font-sans font-bold text-xl text-foreground">
                Channel Contribution
              </h4>
              <p className="text-sm text-muted-foreground font-body">
                Revenue distribution by source
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 font-body">
              <TrendingUp size={12} /> +12.4%
            </span>
          </div>

          <div className="flex items-end gap-4 h-64 w-full px-4">
            {CHART_BARS.map((bar) => (
              <div key={bar.label} className="flex-1 flex flex-col items-center gap-3">
                <div
                  className={`w-full ${bar.color} rounded-lg relative group`}
                  style={{ height: bar.height }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity font-body whitespace-nowrap">
                    {bar.label === "Google" ? "42%" : bar.label === "Meta" ? "28%" : bar.label === "TikTok" ? "18%" : "12%"}
                  </div>
                </div>
                <span className="text-xs font-bold text-muted-foreground font-body">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Total Conversion Value */}
          <div className="bg-primary p-8 rounded-xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-sm font-medium opacity-80 mb-1 font-body">
                Total Conversion Value
              </h4>
              <div className="text-4xl font-sans font-extrabold">$142,850</div>
              <div className="mt-4 flex items-center gap-2 text-sm font-body">
                <span className="bg-white/20 px-2 py-1 rounded">ROAS 4.8x</span>
                <span className="opacity-80">v.s. last period</span>
              </div>
            </div>
            <div className="absolute right-[-20%] bottom-[-20%] opacity-20 rotate-12 text-[120px] leading-none font-sans select-none">
              ◎
            </div>
          </div>

          {/* Conversion Health */}
          <div className="bg-surface-container-low p-6 rounded-xl border border-border">
            <h4 className="text-sm font-bold text-foreground mb-4 font-sans">
              Conversion Health
            </h4>
            <div className="space-y-4">
              {HEALTH_BARS.map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs font-bold mb-1.5 font-body text-foreground">
                    <span>{b.label}</span>
                    <span>{b.value}</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-1.5 rounded-full">
                    <div
                      className={`${b.color} h-full rounded-full`}
                      style={{ width: b.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Attribution Table */}
      <div className="bg-white rounded-xl overflow-hidden border border-border shadow-sm">
        <div className="px-8 py-6 border-b border-border flex items-center justify-between">
          <h4 className="font-sans font-bold text-lg text-foreground">
            Detailed Performance Matrix
          </h4>
          <button className="flex items-center gap-2 text-sm font-bold text-primary font-body hover:underline">
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                {["Channel", "Model Conversions", "Conversion Value", "ROAS", "Contribution %"].map((h) => (
                  <th
                    key={h}
                    className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest font-body"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TABLE_ROWS.map((row) => (
                <tr key={row.name} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-muted-foreground">
                        <row.Icon size={16} />
                      </div>
                      <span className="font-semibold text-sm text-foreground font-body">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium font-body text-foreground">
                    {row.conversions}
                  </td>
                  <td className="px-8 py-5 text-sm font-medium font-body text-foreground">
                    {row.value}
                  </td>
                  <td className="px-8 py-5 text-sm font-medium font-body text-foreground">
                    {row.roas}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-surface-container-high h-1.5 rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: row.barWidth }}
                        />
                      </div>
                      <span className="text-xs font-bold font-body text-foreground">
                        {row.pct}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
