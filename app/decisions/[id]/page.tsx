"use client";

import { ChevronRight, Zap, BarChart2, Timer, Globe, Lightbulb, DollarSign, ExternalLink } from "lucide-react";

const STAT_CARDS = [
  { Icon: BarChart2, color: "text-primary", label: "Affected Volume", value: "12.4k req/s" },
  { Icon: Timer,     color: "text-error",   label: "Avg Latency",    value: "4.8s" },
  { Icon: Globe,     color: "text-[#006329]", label: "Nodes Affected", value: "7/24" },
];

const CAMPAIGNS = [
  {
    name: "Summer Sale - EMEA Core",
    spend: "$45,200",
    roas: "1.2x",
    roasTarget: "3.5x",
    roasColor: "text-error",
    ctrDelta: "-12.4%",
    ctrColor: "text-error",
    badge: "Critical",
    badgeStyle: "bg-[#ffdad6] text-[#93000a]",
  },
  {
    name: "Retention Push - Nordics",
    spend: "$12,800",
    roas: "0.8x",
    roasTarget: "2.2x",
    roasColor: "text-error",
    ctrDelta: "-8.2%",
    ctrColor: "text-error",
    badge: "Critical",
    badgeStyle: "bg-[#ffdad6] text-[#93000a]",
  },
  {
    name: "Beta Launch - Stockholm",
    spend: "$8,400",
    roas: "1.8x",
    roasTarget: "2.0x",
    roasColor: "text-muted-foreground",
    ctrDelta: "-2.1%",
    ctrColor: "text-muted-foreground",
    badge: "Warning",
    badgeStyle: "bg-[#d0e1fb] text-[#54647a]",
  },
];

export default function DecisionDetailPage() {
  return (
    <div className="pb-12 space-y-10">
      {/* Breadcrumb + Header */}
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-[0.75rem] font-bold uppercase tracking-widest text-muted-foreground font-body">
          <a href="/decisions" className="hover:text-primary transition-colors">Decisions</a>
          <ChevronRight size={14} />
          <span className="text-foreground">Detail</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-[#007f36] text-[#c7ffca] px-3 py-1 rounded-full text-[0.7rem] font-black uppercase tracking-tighter font-body">
                New
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">
                API Timeout Overload
              </h1>
            </div>
            <p className="text-lg text-muted-foreground flex items-center gap-2 font-body">
              <span className="text-error font-bold tracking-tighter">-$1.2k/hr</span>
              <span className="text-border">|</span>
              <span>Northern European region latency spike</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-6 py-3 rounded-xl border border-border font-bold text-sm text-muted-foreground hover:bg-surface-container-high transition-all font-body">
              Save for later
            </button>
            <button className="px-6 py-3 rounded-xl bg-surface-container-high font-bold text-sm text-foreground hover:bg-surface-container transition-all font-body">
              Ignore
            </button>
            <button className="px-8 py-3 rounded-xl bg-gradient-to-br from-primary to-[#2563eb] text-white font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 transition-all font-body">
              Apply Action
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Problem Explanation */}
        <section className="col-span-12 lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm border-t-[6px] border-primary">
          <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 font-body">
            Critical Latency Incident
          </h3>
          <p className="text-foreground leading-relaxed text-lg mb-4 font-body">
            Our monitoring systems have flagged a{" "}
            <strong className="text-primary">recursive latency cycle</strong> impacting the checkout
            completion funnel within the Northern European region. This bottleneck has led to a 24%
            drop in successful transactions over the last 90 minutes.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-8">
            {STAT_CARDS.map((s) => (
              <div key={s.label} className="bg-surface-container-low p-4 rounded-xl">
                <s.Icon size={20} className={`${s.color} mb-2`} />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-body">
                  {s.label}
                </p>
                <p className="text-xl font-black text-foreground font-sans">{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AI Diagnostic */}
        <section className="col-span-12 lg:col-span-4 bg-foreground text-white p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Zap size={18} className="text-[#62df7d]" />
              <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-white/50 font-body">
                AI Diagnostic
              </h3>
            </div>
            <p className="text-xl font-light leading-snug text-white font-body">
              The bottleneck originated at the{" "}
              <code className="bg-white/10 px-2 py-0.5 rounded text-sm font-mono">
                v1/transaction-processor
              </code>{" "}
              endpoint. A recursive logic loop in the validation middleware is causing a stack
              overflow on Node #042, triggering cascade failures.
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#2563eb] flex items-center justify-center shrink-0">
              <Lightbulb size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white font-body">Confidence Score</p>
              <p className="text-xs text-white/50 font-body">98.2% Accuracy</p>
            </div>
          </div>
        </section>

        {/* Affected Campaigns Table */}
        <section className="col-span-12 bg-white p-8 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-muted-foreground font-body">
              High-Impact Affected Campaigns
            </h3>
            <button className="text-primary text-sm font-bold flex items-center gap-1 hover:underline font-body">
              View Full Log <ExternalLink size={14} />
            </button>
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[0.65rem] font-black text-muted-foreground uppercase tracking-widest font-body">
                  {["Campaign Name", "Spend (24h)", "Current ROAS", "CTR Delta", "Status"].map((h) => (
                    <th key={h} className="pb-2 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAMPAIGNS.map((c) => (
                  <tr
                    key={c.name}
                    className="bg-surface-container-low rounded-xl hover:scale-[1.005] transition-transform"
                  >
                    <td className="py-4 px-4 font-bold text-sm rounded-l-xl text-foreground font-body">
                      {c.name}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-foreground font-body">{c.spend}</td>
                    <td className={`py-4 px-4 text-sm font-bold font-body ${c.roasColor}`}>
                      {c.roas}{" "}
                      <span className="text-[0.6rem] font-normal text-muted-foreground">
                        (Target {c.roasTarget})
                      </span>
                    </td>
                    <td className={`py-4 px-4 text-sm font-medium font-body ${c.ctrColor}`}>
                      {c.ctrDelta}
                    </td>
                    <td className="py-4 px-4 rounded-r-xl">
                      <span className={`px-3 py-1 rounded-full text-[0.6rem] font-black uppercase font-body ${c.badgeStyle}`}>
                        {c.badge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Prescriptive Recommendation */}
        <section className="col-span-12 lg:col-span-7 bg-[#2563eb] text-white p-10 rounded-2xl rounded-tr-[4rem] relative overflow-hidden shadow-2xl shadow-primary/30">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <Lightbulb size={36} />
              <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-white/70 font-body">
                Prescriptive Recommendation
              </h3>
            </div>
            <p className="text-3xl font-black tracking-tight mb-4 font-sans">
              Scale up Enterprise Cluster &amp; Restart Node #042
            </p>
            <p className="text-white/80 text-lg max-w-lg mb-10 font-body">
              Automatically provisioning 4 additional server instances in the{" "}
              <span className="font-bold text-white">eu-north-1</span> region and executing a
              soft-restart on the failing node will clear the current request queue.
            </p>
            <button className="bg-white text-primary px-10 py-4 rounded-full font-black text-sm uppercase tracking-widest shadow-xl hover:opacity-90 transition-all font-body">
              Execute Now
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#006329]/20 rounded-full -mr-10 -mb-10 blur-2xl" />
        </section>

        {/* Impact Forecast */}
        <section className="col-span-12 lg:col-span-5 bg-surface-container-high p-8 rounded-2xl flex flex-col justify-center">
          <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-muted-foreground mb-10 text-center font-body">
            Expected Impact Forecast
          </h3>
          <div className="flex items-center justify-around gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#007f36]/10 flex items-center justify-center text-[#006329] mb-3">
                <Timer size={28} />
              </div>
              <p className="text-2xl font-black text-foreground font-sans">14 mins</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter font-body">
                Est. Recovery
              </p>
            </div>
            <div className="w-px h-16 bg-border" />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <DollarSign size={28} />
              </div>
              <p className="text-2xl font-black text-foreground font-sans">$8.4k</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter font-body">
                Daily Savings
              </p>
            </div>
          </div>
          <div className="mt-10 px-6 py-4 bg-white rounded-xl">
            <p className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">
              Network Health Post-Action
            </p>
            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-[#006329] rounded-full" style={{ width: "94%" }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[0.6rem] font-bold text-muted-foreground font-body">Current: 76%</span>
              <span className="text-[0.6rem] font-bold text-[#006329] font-body">Projected: 94%</span>
            </div>
          </div>
        </section>
      </div>

      {/* Spatial Visualization Footer */}
      <div className="mt-12 rounded-3xl overflow-hidden relative h-[300px] shadow-lg group">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBksZjwvSwgYoWoe9tHKinzHhzlCL2hBMqgWkFll2HQDWExHHMxwNiNa0U6-39bd39vpPlGrK-yo_HLQ5FADFSB_pZCNTEZLPSX2Crn52qdV7YRy58n1pF2KL2YMyUWU9Ify3Kdl1xikIhJkdkYdPTxclVZW3ODgQwYA3fQDvB6HCjTpHKbqujIIEtntjnsE3WXZK9QXu05HnK-kBpcN6Y"
          alt="Infrastructure Visualization"
          className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-8 left-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 bg-error rounded-full animate-pulse" />
            <p className="text-[0.7rem] font-black uppercase tracking-widest text-foreground font-body">
              Node Failure: Oslo-Central-042
            </p>
          </div>
          <h4 className="text-2xl font-bold text-foreground font-sans">Spatial Latency Visualization</h4>
        </div>
        <div className="absolute top-8 right-8">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4">
            <div className="text-right">
              <p className="text-[0.6rem] font-black text-muted-foreground uppercase font-body">Active Users</p>
              <p className="text-lg font-black text-foreground font-sans">2,482</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-right">
              <p className="text-[0.6rem] font-black text-muted-foreground uppercase font-body">Peak Delay</p>
              <p className="text-lg font-black text-error font-sans">5.2s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
