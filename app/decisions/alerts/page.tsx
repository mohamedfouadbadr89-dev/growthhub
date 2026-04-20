"use client";

import { ChevronLeft, ChevronRight, Plus, Zap, ArrowRight } from "lucide-react";

const STATS = [
  { label: "Total Active",     value: "24", sub: "+4 new",  subColor: "text-error" },
  { label: "High Severity",    value: "08", valueColor: "text-error" },
  { label: "Avg. Resolution",  value: "42", unit: "min" },
  { label: "Channel Health",   value: null, bar: true, barPct: "92%", barColor: "bg-[#006329]", barLabel: "92%" },
];

const ALERTS = [
  {
    title: "CPC Surge: Summer Campaign",
    meta: "Detected 14 mins ago • Campaign ID: #8821",
    channel: "Meta",
    channelBg: "bg-blue-50",
    channelImg: "https://lh3.googleusercontent.com/aida-public/AB6AXuB6FbC-R5u9QEe4CgX8b1VgDrXz8GrLXd7IbLREtDV9KO78Q6E2zw_iOYAM7JIVuPY-rJobtkKCuay4ppOfrpGOHynovax6U4ZEKjUPBJunlTKHVDP1-7LgZn3ZR80vsEf401GeOOomQskw8DhxKjZP8hoTFUSB-Fxr_XwJ2vVqmY82tgq4JjRBhAszwi_9451iCP8Z-5-tDfxVCmhPKXIuX_Hp7kGxbY3KGLEDBL-Nj90nRAVZyUBEgXbM3MRg9viFG4Cg86X6H6s",
    impact: "-$1.2k/hr", impactColor: "text-error",
    severity: "High", severityStyle: "bg-[#ffdad6] text-error",
    status: "New", statusDot: "bg-primary", statusColor: "text-foreground",
  },
  {
    title: "Creative Fatigue Threshold",
    meta: "Detected 2 hours ago • Video Assets 04-12",
    channel: "TikTok",
    channelBg: "bg-slate-100",
    channelImg: "https://lh3.googleusercontent.com/aida-public/AB6AXuAb5nEz7CHxB2oWC_NJrgyhnRWuYY_-pDT3HqAv_cOXsdfvleCNKnEeJ1exokJHqq5cI-8QGbbrTFEJPEWfdLlvgC25nQC7y1jzq6a6y1m5H-XnvMkh-MMbA3a4T3C5fOA_fvtkoYZSbGnptu28kRBBg1cnSeKE2UsUuMBfvVRXo0YsS54B00NH9AHTpOMOnN6s3PEQSZRPNr4ACQtbisnQIOurzC5CSQp2xnmQQnR7mLArv0kANCdCaqdIpH7tA0OT_DxmIwMWYqE",
    impact: "-$340/hr", impactColor: "text-muted-foreground",
    severity: "Medium", severityStyle: "bg-[#d0e1fb] text-[#54647a]",
    status: "Viewed", statusDot: "bg-muted-foreground", statusColor: "text-muted-foreground",
  },
  {
    title: "Search Term Deviation",
    meta: "Detected 5 hours ago • Performance Max",
    channel: "Google",
    channelBg: "bg-red-50",
    channelImg: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkHfU6oeS4PHOqeHW9_eZUNTTzk18QE0fxI35z_jVlv_6AolUNNl4HU0szJC6M-sfkPtojf9IA4vTEuAE1KggGv3VNXgjdLLek0q3SxKC0eR8_u_xN5kVYoFfyXrtNYk-_MI_M2CUTAtthUBKGHUnASwCPDKFHu7aNANd0mB_Qzfv8AXwzVKj7xtAc9dKqxvs2WeTEjWcm9zvZT2zz7Qi9I3Kr5IDpfzpgJmutPdSGhcT1eRepFNIucd1aoKI30bP1_JZlFacNDI0",
    impact: "-$120/hr", impactColor: "text-muted-foreground",
    severity: "Low", severityStyle: "bg-surface-container-high text-muted-foreground",
    status: "New", statusDot: "bg-primary", statusColor: "text-foreground",
  },
  {
    title: "Abnormal Clickrate Spike",
    meta: "Detected 8 hours ago • Brand Search",
    channel: "Google",
    channelBg: "bg-red-50",
    channelImg: "https://lh3.googleusercontent.com/aida-public/AB6AXuCjLrYxNzS5F1eW2aXx9UodYLlk6YzfWIZxT5_Elb0znva6CLtYSt14LWA2PPqUxcptEi93wO8LgOIyug1BrWz_umAj7bwrpDz9mLsDDefLoRZ41W8-RkTyzvG93V-lWcOduQgbo-b7jFLMN8AXNphfULBlZMMz53GMbCGmR6po9dGwX9MCp-vQ4OcUkDFFJshf7jaPdUXUjPU6ltR8GLeZMoKAHyen6bC2lvwp8KJxMCFR6GOBB97fCJ6xWu7Qe_9baJ6587i59hQ",
    impact: "-$2.1k/hr", impactColor: "text-error",
    severity: "High", severityStyle: "bg-[#ffdad6] text-error",
    status: "Viewed", statusDot: "bg-muted-foreground", statusColor: "text-muted-foreground",
  },
];

export default function AlertsPage() {
  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            System Monitoring
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Alerts</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {["Severity: All", "Channel: Meta", "Status: New"].map((f) => (
            <button
              key={f}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors font-body"
            >
              {f} <ChevronRight size={14} />
            </button>
          ))}
          <button className="p-2 bg-foreground text-white rounded-xl hover:opacity-90 transition-opacity">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-4 font-body">
              {s.label}
            </p>
            {s.bar ? (
              <div className="flex items-center gap-1">
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className={`h-full ${s.barColor} rounded-full`} style={{ width: s.barPct }} />
                </div>
                <span className="text-xs font-bold ml-2 text-[#006329] font-body">{s.barLabel}</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold font-sans ${s.valueColor ?? "text-foreground"}`}>
                  {s.value}
                  {s.unit && (
                    <span className="text-lg font-medium ml-1 text-muted-foreground font-body">{s.unit}</span>
                  )}
                </span>
                {s.sub && (
                  <span className={`text-xs font-bold font-body ${s.subColor}`}>{s.sub}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-4xl shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                {["Alert Title", "Channel", "Impact", "Severity", "Status", "Action"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-5 text-[11px] font-black tracking-widest uppercase text-muted-foreground font-body ${i === 5 ? "px-8 text-right" : i === 0 ? "px-8" : "px-6"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {ALERTS.map((a) => (
                <tr key={a.title} className="group hover:bg-surface-container-low transition-all cursor-pointer">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors font-body">
                        {a.title}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 font-body">{a.meta}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 ${a.channelBg} rounded-lg flex items-center justify-center`}>
                        <img src={a.channelImg} alt={a.channel} className="w-4 h-4 rounded-sm" />
                      </span>
                      <span className="text-sm font-medium font-body text-foreground">{a.channel}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`text-sm font-bold font-body ${a.impactColor}`}>{a.impact}</span>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest font-body ${a.severityStyle}`}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`flex items-center gap-2 text-sm font-medium font-body ${a.statusColor}`}>
                      <span className={`w-2 h-2 rounded-full ${a.statusDot}`} />
                      {a.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="px-4 py-2 bg-surface-container-high text-foreground rounded-xl text-xs font-bold hover:bg-surface-container-highest transition-all group-hover:scale-105 active:scale-95 font-body">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-8 py-4 bg-surface-container-low/30 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium font-body">Showing 4 of 24 alerts</p>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors text-muted-foreground">
              <ChevronLeft size={16} />
            </button>
            <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold text-xs font-body">1</button>
            <button className="px-4 py-2 hover:bg-surface-container-high rounded-lg font-bold text-xs text-muted-foreground transition-colors font-body">2</button>
            <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors text-muted-foreground">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Insight Card */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-2xl font-extrabold mb-4 text-foreground font-sans">
              Urgent Optimization Required
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-6 max-w-lg font-body">
              Our intelligence engine has detected a consistent CPC increase across all Google Search
              campaigns. Adjusting bid strategy to{" "}
              <span className="text-primary font-bold">Target ROAS</span> could save an estimated{" "}
              <span className="text-[#006329] font-bold">$1.4k per day</span>.
            </p>
            <div className="flex gap-3">
              <button className="px-6 py-3 bg-gradient-to-br from-primary to-[#2563eb] text-white rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all font-body">
                Apply Optimization
              </button>
              <button className="px-6 py-3 bg-background text-foreground rounded-xl font-bold border border-border hover:bg-surface-container-high transition-all font-body">
                Dismiss
              </button>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-[#dbe1ff]/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute top-4 right-8">
            <Zap size={64} className="text-primary/10" />
          </div>
        </div>

        {/* Automated Rules Card */}
        <div className="bg-foreground p-8 rounded-3xl text-white flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="text-[#62df7d] mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold mb-2 font-sans">Automated Rules</h4>
            <p className="text-sm text-white/60 font-body">
              3 rules active in the background suppressing low-impact anomalies.
            </p>
          </div>
          <button className="mt-8 text-sm font-extrabold tracking-widest uppercase flex items-center gap-2 hover:gap-4 transition-all text-white font-body">
            Manage Rules <ArrowRight size={14} />
          </button>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#007f36]/10 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  );
}
