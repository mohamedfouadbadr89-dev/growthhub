"use client";

import { ShoppingCart, TrendingUp, Eye, X, Sparkles, CheckCircle2, Zap, SlidersHorizontal, CloudUpload } from "lucide-react";

const OBJECTIVES = [
  { Icon: ShoppingCart, label: "Conversion", sub: "Drive sales and actions", active: true },
  { Icon: TrendingUp,   label: "Traffic",    sub: "Increase site visits",    active: false },
  { Icon: Eye,          label: "Awareness",  sub: "Reach more people",       active: false },
];

const PLATFORMS = [
  { label: "Meta",     iconBg: "bg-blue-50",    iconColor: "text-blue-600",   dot: "bg-[#1877F2]", checked: true },
  { label: "Google",   iconBg: "bg-red-50",     iconColor: "text-red-600",    dot: "bg-[#4285F4]", checked: true },
  { label: "TikTok",   iconBg: "bg-slate-900",  iconColor: "text-white",      dot: "bg-[#FE2C55]", checked: false },
  { label: "Snapchat", iconBg: "bg-yellow-400", iconColor: "text-white",      dot: "bg-[#FFFC00]", checked: false },
];

const CREATIVES = [
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuD3gjhT8cIqyNm-U6Ssvp8Q--rta1tS9PiQcg4qNJ6aNLOA6yyzOx9y7XsGSZH2tHD-wtiCArw7hpvEeiwVVVVTQmHp_E0ExKth9L21gNd7LIeMxbUbzyDdsnZIrHdyo8QL5pKMHvPxwgvLqPoAZbwCIfHa-mCMljt9AUwvPkIvSHnFhCqm0p1MpOdd52X5JW_u5bAlEQdbbfy5zmAh_JZd2JARRz_VN7zo6Y_kB5vHbwiBnXe-OXY1dAHKPIvZWeCv626zNFS5n3I",
    selected: true,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDypbgW8reuFjSzHAFpKUBOGpGV7h9deGnYLv-uvYE_zM0i_MmUI7BKbWOqlPt4VjSmEw2HZgENoNS4nH5KgNs-n-vi-JFM71k_cJdV3u-Cdf9w__0FlqLzMy0UmqANAfkRpBE8ZkS2d-38ncgWQo-0Z9zINQ9vPMRFYMgxwpnFhhZkT5F4MDlcsXNxa_X-0TH8UMgryvzDuqVZd0Q5ocQhmtyEqTNhUtbB6Mi22XMB97dJpGK0M0w7DqKPYJ-Cfz1m8NSftGFSz30",
    selected: false,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCieeKF1NAhe5M1HQdIGs6IDLLOl-MC8MxbnqY6qaSGXsCSIxtjZo8TuCRoK5GuInE0UrtbX81Ad4E3SFiBx6nt8Xlp46R2h4c1vkh25UDq7SC_3AoNc9WtWM8gnqmGaMwARmR6nYfyYx_v_D3EQ5bn8M47qkA77wYYTIePoY5Ip6NoELEDFv16JvtvQcGywt-UA3T09GvsJWNx-u8q5EHZ_Vx-wh6BixlYgJGuCWO-7vEWBzQai7v-87h5PBTd1o2JyhrCevfz4H4",
    selected: false,
  },
];

const STEPS = [
  { n: 1, label: "Campaign Objective" },
  { n: 2, label: "Platform Selection" },
  { n: 3, label: "Budget Setup" },
  { n: 4, label: "Audience Targeting" },
  { n: 5, label: "Creative Selection" },
  { n: 6, label: "Bidding Strategy" },
];

export default function CreateCampaignPage() {
  return (
    <div className="flex gap-0 -m-8 lg:-m-12 min-h-[calc(100vh-4rem)]">
      {/* Left: Workflow Stepper */}
      <section className="flex-1 overflow-y-auto p-10 pb-28 space-y-12">
        {/* Step 1: Objective */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm font-sans">1</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Campaign Objective</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {OBJECTIVES.map((o) => (
              <button
                key={o.label}
                className={`flex flex-col items-center p-6 bg-white rounded-xl shadow-sm text-center transition-colors ${
                  o.active
                    ? "border-2 border-primary ring-4 ring-primary/5"
                    : "border border-border hover:border-primary/50"
                }`}
              >
                <o.Icon size={32} className={`mb-3 ${o.active ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-bold text-sm mb-1 font-body">{o.label}</span>
                <span className="text-xs text-muted-foreground font-body">{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Platform */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center font-bold text-sm font-sans">2</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Platform Selection</h3>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {PLATFORMS.map((p) => (
              <div key={p.label} className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-border">
                <div className={`w-8 h-8 ${p.iconBg} rounded flex items-center justify-center shrink-0`}>
                  <span className={`w-4 h-4 rounded-full ${p.dot}`} />
                </div>
                <span className="font-semibold text-sm font-body">{p.label}</span>
                <input defaultChecked={p.checked} type="checkbox" className="ml-auto rounded text-primary focus:ring-primary/20" />
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Budget */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center font-bold text-sm font-sans">3</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Budget Setup</h3>
          </div>
          <div className="p-8 bg-white rounded-xl shadow-sm space-y-6">
            <div className="flex bg-surface-container-low p-1 rounded-lg w-fit">
              <button className="px-6 py-2 bg-white rounded-md shadow-sm text-sm font-bold font-body">Daily</button>
              <button className="px-6 py-2 text-muted-foreground text-sm font-medium font-body">Lifetime</button>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                <input
                  type="number"
                  defaultValue="500"
                  className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-8 pr-4 text-2xl font-bold focus:ring-2 ring-primary/20 font-sans"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground font-body">Average spend per day. Actual spend may vary by 10%.</p>
            </div>
          </div>
        </div>

        {/* Step 4: Audience */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center font-bold text-sm font-sans">4</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Audience Targeting</h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-xl shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">Location</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["United States", "Canada"].map((loc) => (
                    <span key={loc} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold font-body">
                      {loc} <X size={12} className="cursor-pointer" />
                    </span>
                  ))}
                </div>
                <input type="text" placeholder="Add location..." className="w-full border-none bg-surface-container-low rounded-lg text-sm focus:ring-2 ring-primary/20 font-body" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">Age Range</label>
                <div className="flex items-center gap-4">
                  <input type="number" defaultValue="18" className="w-20 border-none bg-surface-container-low rounded-lg text-sm focus:ring-2 ring-primary/20 font-body" />
                  <span className="text-muted-foreground">—</span>
                  <input type="number" defaultValue="45" className="w-20 border-none bg-surface-container-low rounded-lg text-sm focus:ring-2 ring-primary/20 font-body" />
                </div>
              </div>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">Interests</label>
                <textarea
                  rows={4}
                  placeholder="E.g. Digital Marketing, SaaS, Luxury Travel..."
                  className="w-full border-none bg-surface-container-low rounded-lg text-sm focus:ring-2 ring-primary/20 resize-none font-body"
                />
                <p className="mt-2 text-xs text-muted-foreground font-body">Our AI will broaden this based on conversion performance.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Creatives */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center font-bold text-sm font-sans">5</span>
              <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Creative Selection</h3>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-foreground text-white rounded-lg text-sm font-bold hover:opacity-90 transition-colors font-body">
              <Sparkles size={16} /> Generate New AI
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {CREATIVES.map((c, i) => (
              <div
                key={i}
                className={`relative aspect-square rounded-xl overflow-hidden group cursor-pointer ${
                  c.selected ? "border-4 border-primary ring-4 ring-primary/5" : "border border-transparent hover:border-border"
                }`}
              >
                <img src={c.src} alt="Ad Creative" className="w-full h-full object-cover" />
                {c.selected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <span className="bg-white rounded-full p-1">
                      <CheckCircle2 size={20} className="text-primary fill-primary" />
                    </span>
                  </div>
                )}
                {!c.selected && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 6: Bidding */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center font-bold text-sm font-sans">6</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Bidding Strategy</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-blue-50/50 rounded-xl border-2 border-primary ring-4 ring-primary/5">
              <div className="flex items-center gap-3 mb-2">
                <Zap size={20} className="text-primary" />
                <span className="font-bold font-body">Auto-Optimized (AI)</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-body">
                AI will dynamically adjust bids every 15 minutes based on real-time conversion probability.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-border hover:border-muted-foreground cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <SlidersHorizontal size={20} className="text-muted-foreground" />
                <span className="font-bold font-body">Manual Bidding</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-body">
                Set fixed bid limits for each action. Recommended only for veteran media buyers.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-72 right-0 h-20 bg-white/80 backdrop-blur-xl border-t border-border px-10 flex items-center justify-between z-50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CloudUpload size={16} />
            <span className="text-xs font-medium font-body">Changes saved automatically</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-6 py-2.5 text-muted-foreground font-bold text-sm rounded-xl hover:bg-surface-container-low transition-colors font-body">
              Save Draft
            </button>
            <button className="px-8 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/25 hover:opacity-90 transition-all active:scale-95 font-body">
              Launch Campaign
            </button>
          </div>
        </div>
      </section>

      {/* Right: Preview Panel */}
      <aside className="w-96 bg-surface-container-low border-l border-border flex flex-col p-8 overflow-y-auto shrink-0">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 font-body">
          Live Campaign Preview
        </h4>
        <div className="space-y-6">
          {/* Metrics Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-8">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-muted-foreground font-body">Est. Daily Reach</span>
                <span className="text-xl font-bold text-foreground font-sans">12k – 45k</span>
              </div>
              <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "65%" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1 font-body">Est. CPA</p>
                <p className="text-2xl font-extrabold text-foreground font-sans">$14.20</p>
                <span className="text-[10px] text-[#2563eb] font-bold font-body">+12% vs Market</span>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1 font-body">Est. ROAS</p>
                <p className="text-2xl font-extrabold text-foreground font-sans">4.2x</p>
                <span className="text-[10px] text-[#bc4800] font-bold font-body">AI-Optimized</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-4 font-body">Funnel Allocation</p>
              <div className="flex h-12 w-full rounded-lg overflow-hidden gap-1">
                <div className="bg-primary flex-1 opacity-100 rounded-l-lg" title="Awareness (40%)" />
                <div className="bg-primary flex-1 opacity-60" title="Consideration (35%)" />
                <div className="bg-primary rounded-r-lg" style={{ flex: 0.7 }} title="Conversion (25%)" />
              </div>
              <div className="mt-3 flex justify-between text-[10px] font-bold text-muted-foreground font-body">
                <span>AWARENESS</span>
                <span>CONVERSION</span>
              </div>
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="p-6 bg-foreground rounded-2xl text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles size={18} className="text-blue-400" />
              <span className="text-sm font-bold font-body">AI Recommendation</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed font-body">
              Based on your objective and creatives, we recommend increasing the budget by{" "}
              <span className="text-white font-bold">$150</span> to capture high-intent traffic from Google
              Search during peak hours.
            </p>
            <button className="mt-4 w-full py-2 bg-blue-600 rounded-lg text-xs font-bold hover:opacity-90 transition-colors font-body">
              Apply Boost
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
