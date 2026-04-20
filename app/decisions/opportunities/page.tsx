"use client";

import { TrendingUp, Sparkles, MousePointerClick, Globe, Network, Zap, Brain, ArrowRight, ShieldCheck } from "lucide-react";

const OPPORTUNITY_CARDS = [
  {
    Icon: MousePointerClick,
    uplift: "+15.2%",
    title: "Optimize Search Bidding",
    desc: "Current performance indicates a 15% efficiency gap in EMEA campaigns. Structural keyword recalibration recommended.",
    confidence: "92% Confidence",
  },
  {
    Icon: Globe,
    uplift: "+12.5%",
    title: "Expand to New Markets",
    desc: "LATAM market signals high intent for Precision tier tools. Localized landing pages could drive significant volume.",
    confidence: "85% Confidence",
  },
  {
    Icon: Network,
    uplift: "+8.4%",
    title: "Retargeting Alignment",
    desc: "Sync retargeting pixel data with CRM segment logic to reduce acquisition costs on lapsed users.",
    confidence: "96% Confidence",
  },
  {
    Icon: Zap,
    uplift: "+21.0%",
    title: "Load Speed Optimization",
    desc: "Core Web Vitals for checkout flow are below target. Image compression and script deferral will improve conversion.",
    confidence: "78% Confidence",
  },
  {
    Icon: Brain,
    uplift: "+5.5%",
    title: "Churn Prediction Model",
    desc: "Integrate behavioral signals into your dashboard to proactively identify and save high-value accounts.",
    confidence: "91% Confidence",
  },
];

export default function OpportunitiesPage() {
  return (
    <div className="space-y-10 pb-12">
      {/* Hero Stats Row */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 block font-body">
              Current Momentum
            </span>
            <h3 className="text-4xl font-extrabold text-foreground mb-2 font-sans">
              Potential Growth Yield
            </h3>
            <p className="text-muted-foreground max-w-md mb-8 font-body">
              We've identified 6 critical zones where architectural adjustments could unlock significant revenue pipelines.
            </p>
            <div className="flex gap-10">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-body">Total Projected Uplift</p>
                <p className="text-3xl font-extrabold text-[#007f36] font-sans">+24.8%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground font-body">Confidence Interval</p>
                <p className="text-3xl font-extrabold text-foreground font-sans">88.4%</p>
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-primary/5 to-transparent flex items-center justify-center">
            <TrendingUp size={120} className="text-primary/10 select-none" />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-[#2563eb] p-8 rounded-2xl shadow-lg shadow-blue-500/20 text-white flex flex-col justify-between">
          <div>
            <Sparkles size={32} className="mb-4" />
            <h4 className="text-xl font-bold leading-tight font-sans">Priority AI Insight</h4>
            <p className="text-white/80 text-sm mt-2 font-body">
              EMEA campaigns show a recurring search gap. Activating suggested bidding could recover $12k/mo.
            </p>
          </div>
          <button className="bg-white text-primary px-6 py-3 rounded-lg font-bold text-sm w-full mt-6 hover:opacity-90 transition-opacity active:scale-[0.98] font-body">
            Launch Auto-Fix
          </button>
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {OPPORTUNITY_CARDS.map((card) => (
          <div
            key={card.title}
            className="bg-white p-6 rounded-2xl hover:shadow-xl transition-all duration-300 group flex flex-col shadow-sm"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-surface-container-low rounded-xl flex items-center justify-center text-primary group-hover:bg-[#2563eb] group-hover:text-white transition-colors">
                <card.Icon size={22} />
              </div>
              <div className="px-3 py-1 bg-[#007f36]/10 rounded-full">
                <span className="text-[#007f36] text-xs font-bold font-body">{card.uplift}</span>
              </div>
            </div>
            <h5 className="text-lg font-bold text-foreground mb-2 font-sans">{card.title}</h5>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8 font-body">{card.desc}</p>
            <div className="mt-auto pt-6 flex items-center justify-between border-t border-surface-container-low">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter font-body">
                  Confidence
                </span>
                <span className="text-sm font-bold text-foreground font-body">{card.confidence}</span>
              </div>
              <button className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all active:opacity-80 font-body">
                View details <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Image Card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col relative min-h-[320px]">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10" />
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCC242XQedkY-bDz81_6Spx48JV7os9NzsDkuq0CiNa0_SgtpNfinA_aBUiN5DodGH2VByAfb7PqwkrJOwJraLLxTqJTjT1lvt0BUMfL510owLhSNX-lNGfr9oFcgwFN86JmOggeApaCfGEYzSRJDPPWAL4CbrpBXFXjst6HJSiOl5_aRwHfmd4fgwY34tQHj_27dvPayRHq-Q--5HYAC_ERexfdIvK-NahG97Orhssf901qemhIevd28w6svlOrGRO8UEAcdv1Mfs"
              alt="Data Visualization"
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
            />
          </div>
          <div className="relative z-20 mt-auto p-6 text-white">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#dbe1ff] font-body">
                Custom Strategy
              </span>
              <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-white font-body">
                Expert Audit
              </span>
            </div>
            <h5 className="text-xl font-bold mb-2 font-sans">Architectural Review</h5>
            <p className="text-white/70 text-xs mb-6 font-body">
              Get a personalized deep-dive audit from our expert precision curators.
            </p>
            <button className="w-full bg-white text-foreground py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity active:scale-[0.98] font-body">
              Request Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Methodology Banner */}
      <div className="p-8 bg-surface-container-high border-2 border-dashed border-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner shrink-0">
            <ShieldCheck size={28} className="text-muted-foreground" />
          </div>
          <div>
            <h6 className="font-bold text-foreground font-sans">How we calculate opportunities</h6>
            <p className="text-sm text-muted-foreground max-w-xl font-body">
              Our analysis engine cross-references your current KPIs against industry benchmarks and historical
              regression models. We only display opportunities with a confidence score above 75%.
            </p>
          </div>
        </div>
        <button className="px-8 py-3 bg-white text-muted-foreground border border-border rounded-full font-bold text-sm hover:bg-surface-container-low transition-colors shadow-sm shrink-0 font-body">
          Learn Methodology
        </button>
      </div>
    </div>
  );
}
