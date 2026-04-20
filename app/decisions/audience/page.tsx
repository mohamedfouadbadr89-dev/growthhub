"use client";

import { TrendingUp, TrendingDown, Minus, LineChart, Activity, Brain, PlusCircle, XCircle, RefreshCcw } from "lucide-react";

const SEGMENTS = [
  { name: "Newsletter Subscribers", ctr: "3.45%", conv: "8.2%", roas: "4.5x", roasColor: "text-primary", TrendIcon: LineChart, trendColor: "text-[#006329]" },
  { name: "Recent Site Visitors",   ctr: "2.12%", conv: "4.5%", roas: "3.2x", roasColor: "text-primary", TrendIcon: Minus,     trendColor: "text-[#006329]" },
  { name: "Abandoned Cart (High Value)", ctr: "6.80%", conv: "18.4%", roas: "12.5x", roasColor: "text-primary", TrendIcon: Activity, trendColor: "text-[#006329]" },
  { name: "Facebook Engagers",      ctr: "1.05%", conv: "2.3%",  roas: "1.8x", roasColor: "text-muted-foreground", TrendIcon: TrendingDown, trendColor: "text-error" },
];

export default function AudiencePage() {
  return (
    <div className="space-y-12 pb-12">
      {/* Segment Performance Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* High Performing */}
        <div className="bg-white p-8 rounded-2xl relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#006329]/5 rounded-bl-full transition-all group-hover:scale-110" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] font-bold text-[#006329] uppercase tracking-widest mb-1 block font-body">
                High Performing
              </span>
              <h3 className="text-2xl font-bold text-foreground tracking-tight font-sans">
                Tech-Savvy Millenials
              </h3>
            </div>
            <div className="bg-[#7ffc97] text-[#002109] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 font-body">
              <TrendingUp size={14} /> +24%
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[{ label: "CTR", value: "4.2%" }, { label: "Conv. Rate", value: "12.8%" }, { label: "ROAS", value: "8.4x" }].map((m) => (
              <div key={m.label} className="flex flex-col">
                <span className="text-muted-foreground text-xs font-medium mb-1 font-body">{m.label}</span>
                <span className="text-lg font-bold text-primary font-sans">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Performing */}
        <div className="bg-white p-8 rounded-2xl relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-bl-full transition-all group-hover:scale-110" />
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] font-bold text-error uppercase tracking-widest mb-1 block font-body">
                Needs Optimization
              </span>
              <h3 className="text-2xl font-bold text-foreground tracking-tight font-sans">Window Shoppers</h3>
            </div>
            <div className="bg-[#ffdad6] text-[#93000a] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 font-body">
              <TrendingDown size={14} /> -12%
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[{ label: "CTR", value: "0.8%" }, { label: "Conv. Rate", value: "1.2%" }, { label: "ROAS", value: "1.1x" }].map((m) => (
              <div key={m.label} className="flex flex-col">
                <span className="text-muted-foreground text-xs font-medium mb-1 font-body">{m.label}</span>
                <span className="text-lg font-bold text-muted-foreground font-sans">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience Breakdown Table */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.2em] font-body">
            Audience Breakdown
          </h2>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-xs font-bold text-foreground bg-surface-container-high rounded-lg hover:bg-surface-container-highest transition-colors font-body">
              Export CSV
            </button>
            <button className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity font-body">
              Create Segment
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low border-b border-border">
                {["Segment", "CTR", "Conversion Rate", "ROAS", "Trend"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-8 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body ${i === 4 ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SEGMENTS.map((s) => (
                <tr key={s.name} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-8 py-6 font-bold text-foreground font-body">{s.name}</td>
                  <td className="px-8 py-6 text-sm text-muted-foreground font-medium font-body">{s.ctr}</td>
                  <td className="px-8 py-6 text-sm text-muted-foreground font-medium font-body">{s.conv}</td>
                  <td className={`px-8 py-6 font-bold font-body ${s.roasColor}`}>{s.roas}</td>
                  <td className="px-8 py-6 text-right">
                    <s.TrendIcon size={20} className={s.trendColor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* AI Suggestions */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Brain size={20} className="text-primary" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.2em] font-body">
            Precision Curator AI Suggestions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Expand */}
          <div className="bg-[#2563eb] p-6 rounded-2xl text-white flex flex-col justify-between min-h-[220px] shadow-lg shadow-blue-500/20">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle size={20} />
                <span className="text-xs font-bold uppercase tracking-widest font-body">Expand Strategy</span>
              </div>
              <h4 className="text-xl font-bold mb-3 tracking-tight font-sans">Scale "Newsletter Subscribers"</h4>
              <p className="text-sm text-white/80 font-medium font-body">
                Create a lookalike audience of 1% based on high-ROAS converters from this segment to capture similar intent.
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-xs font-bold transition-all font-body">
                Apply Insight
              </button>
            </div>
          </div>

          {/* Exclude */}
          <div className="bg-surface-container-high p-6 rounded-2xl flex flex-col justify-between min-h-[220px] border-l-4 border-error">
            <div>
              <div className="flex items-center gap-2 mb-4 text-error">
                <XCircle size={20} />
                <span className="text-xs font-bold uppercase tracking-widest font-body">Exclude Strategy</span>
              </div>
              <h4 className="text-xl font-bold mb-3 tracking-tight font-sans">Pause "Facebook Engagers"</h4>
              <p className="text-sm text-muted-foreground font-medium font-body">
                ROAS has dipped below the 2.0x target threshold. Shift budget to more performant retargeting clusters.
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <button className="bg-foreground text-white hover:opacity-90 px-4 py-2 rounded-lg text-xs font-bold transition-all font-body">
                Execute Pause
              </button>
            </div>
          </div>

          {/* Retarget */}
          <div className="bg-white p-6 rounded-2xl flex flex-col justify-between min-h-[220px] border border-border shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-4 text-primary">
                <RefreshCcw size={20} />
                <span className="text-xs font-bold uppercase tracking-widest font-body">Retarget Strategy</span>
              </div>
              <h4 className="text-xl font-bold mb-3 tracking-tight font-sans">Nurture "Window Shoppers"</h4>
              <p className="text-sm text-muted-foreground font-medium font-body">
                Deploy a dynamic catalog ad with a 10% discount code to re-engage users who viewed products in the last 48 hours.
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <button className="bg-primary text-white hover:opacity-90 px-4 py-2 rounded-lg text-xs font-bold transition-all font-body">
                Launch Ads
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-border flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body">
        <span>© 2024 Precision Curator Engine</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Privacy Architecture</a>
          <a href="#" className="hover:text-primary transition-colors">Data Protocol</a>
        </div>
      </footer>
    </div>
  );
}
