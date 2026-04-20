"use client";

import { CalendarDays, Plus, CheckCircle2, Pause, Play, Copy, TrendingUp, X, ChevronDown, ChevronRight, MoreHorizontal, AlertCircle, Sparkles } from "lucide-react";

const CAMPAIGNS = [
  {
    name: "Summer Collection Launch 2024",
    platform: "Meta", platformColor: "text-blue-600",
    status: "Active", statusStyle: "bg-green-100 text-green-700", dotStyle: "bg-green-500 animate-pulse",
    budget: "$25,000", spend: "$18,402", revenue: "$84,649",
    roas: "4.6x", roasStyle: "bg-primary text-white",
    expanded: true,
  },
  {
    name: "Black Friday Retargeting",
    platform: "Google", platformColor: "text-blue-500",
    status: "Learning", statusStyle: "bg-yellow-100 text-yellow-700", dotStyle: "bg-yellow-500",
    budget: "$12,000", spend: "$3,120", revenue: "$9,510",
    roas: "3.1x", roasStyle: "bg-surface-container-high text-foreground",
    expanded: false,
  },
  {
    name: "Spring Clearance - EMEA",
    platform: "TikTok", platformColor: "text-pink-500",
    status: "Paused", statusStyle: "bg-surface-container-low text-muted-foreground", dotStyle: "bg-muted-foreground",
    budget: "$50,000", spend: "$48,910", revenue: "$152,001",
    roas: "3.1x", roasStyle: "bg-surface-container-high text-foreground",
    expanded: false,
  },
];

const ALLOCATION = [
  { label: "Meta Ads",      pct: "62%", width: "w-[62%]", color: "bg-blue-600" },
  { label: "Google Search", pct: "28%", width: "w-[28%]", color: "bg-blue-400" },
  { label: "TikTok",        pct: "10%", width: "w-[10%]", color: "bg-pink-500" },
];

export default function CampaignsPage() {
  return (
    <div className="flex gap-8 pb-12">
      {/* Left: Campaigns Management */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Control Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-border flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {["Platform: All", "Status: All", "Objective"].map((f) => (
              <select key={f} className="bg-surface-container-low border-none rounded-lg text-xs font-semibold py-2 px-3 focus:ring-0 cursor-pointer font-body">
                <option>{f}</option>
              </select>
            ))}
            <button className="bg-surface-container-low px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-surface-container-high transition-colors font-body">
              <CalendarDays size={14} /> Last 7d
            </button>
          </div>
          <button className="bg-gradient-to-br from-primary to-[#2563eb] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform font-body ml-auto">
            <Plus size={16} /> Create Campaign
          </button>
        </div>

        {/* Bulk Actions Bar */}
        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg">
              <CheckCircle2 size={14} />
              <span className="text-xs font-bold font-body">1 Selected</span>
            </div>
            <div className="h-4 w-px bg-blue-200" />
            <p className="text-[11px] font-medium text-blue-800 uppercase tracking-wider font-body">Bulk Actions</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: "Pause", Icon: Pause },
              { label: "Activate", Icon: Play, primary: true },
              { label: "Duplicate", Icon: Copy },
              { label: "Increase Budget", Icon: TrendingUp },
            ].map(({ label, Icon, primary }) => (
              <button
                key={label}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm font-body ${
                  primary
                    ? "bg-primary text-white hover:opacity-90"
                    : "bg-white border border-border text-foreground hover:bg-surface-container-low"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
            <button className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="p-4 w-10"><input type="checkbox" className="rounded border-border text-primary focus:ring-primary/20" /></th>
                {["Campaign Name", "Platform", "Status", "Budget", "Spend", "Revenue", "ROAS", "Actions"].map((h) => (
                  <th key={h} className="p-4 text-[11px] uppercase tracking-wider font-bold text-muted-foreground font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {CAMPAIGNS.map((c) => (
                <>
                  <tr key={c.name} className={`group transition-colors ${c.expanded ? "bg-blue-50/30" : "hover:bg-surface-container-low"}`}>
                    <td className="p-4">
                      <input type="checkbox" defaultChecked={c.expanded} className="rounded border-border text-primary focus:ring-primary/20" />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {c.expanded
                          ? <ChevronDown size={16} className="text-primary" />
                          : <ChevronRight size={16} className="text-muted-foreground/40" />}
                        <span className="font-bold text-foreground font-body">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 bg-surface-container-low px-2 py-1 rounded-full w-fit">
                        <span className={`text-xs font-bold font-body ${c.platformColor}`}>{c.platform}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight w-fit font-body ${c.statusStyle}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dotStyle}`} /> {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-semibold text-foreground font-body">{c.budget}</td>
                    <td className="p-4 text-sm font-medium text-muted-foreground font-body">{c.spend}</td>
                    <td className="p-4 text-sm font-bold text-foreground font-body">{c.revenue}</td>
                    <td className="p-4">
                      <div className={`px-2 py-1 text-[11px] font-bold rounded-md w-fit font-body ${c.roasStyle}`}>{c.roas}</div>
                    </td>
                    <td className="p-4">
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>

                  {c.expanded && (
                    <tr key={`${c.name}-expanded`} className="bg-blue-50/20">
                      <td colSpan={9} className="p-0 border-none">
                        <div className="px-12 py-6 grid grid-cols-12 gap-8 border-t border-blue-100/50">
                          {/* Ad Sets */}
                          <div className="col-span-4 space-y-4">
                            <h4 className="text-[11px] uppercase font-bold text-muted-foreground font-body">Top Ad Sets</h4>
                            <div className="space-y-2">
                              {[
                                { name: "Broad Targeting - US",  spend: "$5,201 Spend", roas: "5.2x" },
                                { name: "Lookalike 1% Buyers",   spend: "$8,420 Spend", roas: "4.1x" },
                              ].map((s) => (
                                <div key={s.name} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                                  <div>
                                    <p className="text-xs font-bold text-foreground font-body">{s.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-body">{s.spend}</p>
                                  </div>
                                  <span className="text-xs font-black text-emerald-600 font-body">{s.roas}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Creatives */}
                          <div className="col-span-4 space-y-4">
                            <h4 className="text-[11px] uppercase font-bold text-muted-foreground font-body">Top Creatives</h4>
                            <div className="flex gap-3">
                              {[
                                { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuB_NHfkoyaARua7QukD1sUbqjvzmZF1BWqgyVT-RfTykNtk1AmKtHtMA5Cui4o-h6m8S5XlcWPO3bj5tFHqEB4CpUYFrFF6jBL1Sa573fBW2KEHA63SCpG197tnl-r5qPKqrj6v-e4UCx26ZyBFsjYfXmQ4xNzPWXjEk_uQlS8YeTjKzIwLNgAmW1sklkcZKWRwseYlT1BhjmdP2veJGFrIEd8iDoay5cUqf7w0s3_6VZi6RWSeqpeUc4H6lefP_XJge9yKiaTaTXg", ctr: "3.2% CTR" },
                                { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCRxm2M46GpxKrby4s8UO3inw_7hLUhebnB-ODTKC7CeKFqziezy3d4rY4X4f1etQEcgOeD-jiWVVJRFcICBWXlKzRDcZKsOD4lJ4crSce1-SyN8RHe-s6bYC72KX1Q72LarNRt4UaumzoCLLijzGBfipOTu3oIAPdv5Ihu0dX9dA8Ur_4KfCO8GJxgSyiLBfCxB7zmsgmeyhmGZXXUGQw24F1APahbqBnmvpZVW6X4Pu25TnibCUOLJjedf8cZkCKxdIbsEzd74Pk", ctr: "2.8% CTR" },
                              ].map((img) => (
                                <div key={img.ctr} className="relative w-20 h-28 rounded-lg overflow-hidden">
                                  <img src={img.src} alt="Ad Creative" className="w-full h-full object-cover" />
                                  <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1.5 text-center">
                                    <p className="text-[10px] font-bold text-white font-body">{img.ctr}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* AI Insight + Actions */}
                          <div className="col-span-4 space-y-4">
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3">
                              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[11px] font-black text-red-900 uppercase font-body">AI Insight</p>
                                <p className="text-xs text-red-700 mt-1 font-body">
                                  ROAS decreased by 12% in last 24h due to rising CPA in Broad Targeting.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {["+10% Budget", "+20% Budget"].map((a) => (
                                <button key={a} className="px-3 py-2 bg-[#2563eb] text-white rounded-lg text-xs font-bold font-body hover:opacity-90 transition-opacity">
                                  {a}
                                </button>
                              ))}
                              {["Pause", "Duplicate"].map((a) => (
                                <button key={a} className="px-3 py-2 bg-surface-container-high text-foreground rounded-lg text-xs font-bold font-body hover:bg-surface-container-highest transition-colors">
                                  {a}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Sticky Summary Panel */}
      <div className="w-80 shrink-0">
        <div className="sticky top-24 space-y-6">
          {/* Account Snapshot */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 font-body">
              Account Snapshot
            </h3>
            <div className="space-y-4">
              {[
                { label: "Total Spend",   value: "$74,209.50",  color: "text-foreground" },
                { label: "Total Revenue", value: "$284,192.10", color: "text-foreground" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-muted-foreground font-body">{s.label}</p>
                  <p className={`text-2xl font-black tracking-tight font-sans ${s.color}`}>{s.value}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-muted-foreground font-body">Avg. ROAS</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-primary tracking-tight font-sans">3.83x</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-body">+4.2%</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Strategy */}
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-primary" />
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
                  Shift <span className="font-bold text-primary">$2,400</span> budget from{" "}
                  <span className="italic text-muted-foreground line-through">Spring Clearance</span> to{" "}
                  <span className="font-bold">Summer Collection</span>.
                </p>
                <button className="mt-3 w-full py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm active:scale-95 transition-transform font-body">
                  Apply Optimization
                </button>
              </div>
            </div>
          </div>

          {/* Platform Allocation */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 font-body">
              Allocation
            </h3>
            <div className="space-y-3">
              {ALLOCATION.map((a) => (
                <div key={a.label}>
                  <div className="flex justify-between text-[11px] font-bold mb-1 font-body">
                    <span>{a.label}</span><span>{a.pct}</span>
                  </div>
                  <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                    <div className={`${a.color} h-full ${a.width} rounded-full`} />
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
