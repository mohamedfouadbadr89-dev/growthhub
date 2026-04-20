"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { TrendingUp, Sparkles, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Opportunity {
  id: string;
  type: string;
  platform: string;
  campaign_id: string;
  trigger_condition: string;
  confidence_score: number;
  recommended_action: string;
  priority_score: number;
  ai_status: string;
  created_at: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: "bg-blue-100 text-blue-700",
  google: "bg-orange-100 text-orange-700",
  shopify: "bg-green-100 text-green-700",
};

export default function OpportunitiesPage() {
  const { getToken } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiClient<{ decisions: Opportunity[] }>(
          "/api/v1/decisions?type=SCALING_OPPORTUNITY&status=active&limit=50",
          token
        );
        setOpportunities(data.decisions ?? []);
      } catch {
        /* empty on error */
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [getToken]);

  const avgConfidence = opportunities.length
    ? Math.round(opportunities.reduce((s, o) => s + (o.confidence_score ?? 0), 0) / opportunities.length)
    : 0;

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Stats Row */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 block font-body">Current Momentum</span>
            <h3 className="text-4xl font-extrabold text-foreground mb-2 font-sans">Scaling Opportunities</h3>
            <p className="text-muted-foreground max-w-md mb-8 font-body">
              Campaigns maintaining ROAS above 3.5× for 5+ consecutive days — ready to scale budget.
            </p>
            <div className="flex gap-10">
              <div>
                <p className="text-sm font-medium text-muted-foreground font-body">Opportunities Found</p>
                <p className={`text-3xl font-extrabold font-sans ${loading ? "animate-pulse text-muted-foreground" : "text-[#007f36]"}`}>
                  {loading ? "…" : opportunities.length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground font-body">Avg Confidence</p>
                <p className={`text-3xl font-extrabold font-sans ${loading ? "animate-pulse text-muted-foreground" : "text-foreground"}`}>
                  {loading ? "…" : opportunities.length ? `${avgConfidence}%` : "—"}
                </p>
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
            <h4 className="text-xl font-bold leading-tight font-sans">What is a Scaling Opportunity?</h4>
            <p className="text-white/80 text-sm mt-2 font-body">
              A campaign sustaining ROAS above 3.5× for at least 5 days. These campaigns have validated audience-offer fit and are ready for increased budget.
            </p>
          </div>
          <Link href="/decisions" className="bg-white text-primary px-6 py-3 rounded-lg font-bold text-sm w-full mt-6 hover:opacity-90 transition-opacity text-center block font-body">
            View All Decisions
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-muted-foreground py-8">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-body text-sm">Loading opportunities…</span>
        </div>
      )}

      {/* No opportunities */}
      {!loading && opportunities.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-border">
          <TrendingUp size={40} className="text-muted-foreground mx-auto mb-4" />
          <p className="font-bold text-foreground font-sans text-lg mb-1">No Scaling Opportunities Yet</p>
          <p className="text-muted-foreground font-body text-sm max-w-sm mx-auto">
            Opportunities appear when a campaign maintains ROAS above 3.5× for 5+ consecutive days. Keep running your campaigns and check back after the next sync.
          </p>
        </div>
      )}

      {/* Opportunities Grid */}
      {!loading && opportunities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {opportunities.map((opp) => {
            const plat = PLATFORM_COLORS[opp.platform] ?? "bg-surface-container-low text-foreground";
            return (
              <Link
                key={opp.id}
                href={`/decisions/${opp.id}`}
                className="bg-white p-6 rounded-2xl hover:shadow-xl transition-all duration-300 group flex flex-col shadow-sm"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest font-body ${plat}`}>
                    {opp.platform}
                  </span>
                  <div className="px-3 py-1 bg-[#007f36]/10 rounded-full">
                    <span className="text-[#007f36] text-xs font-bold font-body">{opp.confidence_score ?? "—"}% conf.</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-muted-foreground font-body mb-1">Campaign {opp.campaign_id}</p>
                <h5 className="text-base font-bold text-foreground mb-2 font-sans">{opp.trigger_condition}</h5>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8 font-body">{opp.recommended_action}</p>
                <div className="mt-auto pt-5 flex items-center justify-between border-t border-surface-container-low">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter font-body">
                    Priority: {Number(opp.priority_score).toFixed(1)}
                  </span>
                  <span className="text-primary font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all font-body">
                    View details <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Methodology Banner */}
      <div className="p-8 bg-surface-container-high border-2 border-dashed border-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner shrink-0">
            <ShieldCheck size={28} className="text-muted-foreground" />
          </div>
          <div>
            <h6 className="font-bold text-foreground font-sans">How opportunities are detected</h6>
            <p className="text-sm text-muted-foreground max-w-xl font-body">
              The AI engine analyzes your synced campaign metrics daily. A campaign qualifies as a scaling opportunity when it sustains ROAS above 3.5× for 5 or more consecutive days, indicating validated audience-offer fit.
            </p>
          </div>
        </div>
        <Link href="/decisions" className="px-8 py-3 bg-white text-muted-foreground border border-border rounded-full font-bold text-sm hover:bg-surface-container-low transition-colors shadow-sm shrink-0 font-body">
          Back to Decisions
        </Link>
      </div>
    </div>
  );
}
