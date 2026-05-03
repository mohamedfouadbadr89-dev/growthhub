"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TriangleAlert,
  TrendingUp,
  Zap,
  Activity,
  Loader2,
  CheckCircle2,
  Sparkles,
  PlayCircle,
  Eye,
  RefreshCw,
} from "lucide-react";

interface Decision {
  id: string;
  type: "ROAS_DROP" | "SPEND_SPIKE" | "CONVERSION_DROP" | "SCALING_OPPORTUNITY";
  status: string;
  platform: string;
  campaign_id: string;
  trigger_condition: string;
  confidence_score: number;
  recommended_action: string;
  priority_score: number;
  ai_status: string;
  ai_explanation: string | null;
  created_at: string;
}

interface Integration {
  id: string;
  platform: "meta" | "google" | "shopify";
  status: "connected" | "disconnected" | "error";
  lastSyncedAt: string | null;
}

type ActiveFilter = "all" | "critical" | "high" | "quick";

const MOCK_DECISIONS: Decision[] = [
  {
    id: "d-001",
    type: "ROAS_DROP",
    status: "new",
    platform: "meta",
    campaign_id: "23856789012",
    trigger_condition: "Meta Ads ROAS dropped below 1.5x threshold — 7-day average now at 0.9x",
    confidence_score: 92,
    recommended_action: "Reduce daily budget by 25% on underperforming ad sets and pause bottom 3 creatives",
    priority_score: 94,
    ai_status: "completed",
    ai_explanation:
      "ROAS has been declining steadily over the past 7 days. The drop correlates with creative fatigue in your top 3 ad sets. Historical data shows pausing these creatives recovers ROAS within 48–72 hours.",
    created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  },
  {
    id: "d-002",
    type: "SCALING_OPPORTUNITY",
    status: "new",
    platform: "google",
    campaign_id: "98765432109",
    trigger_condition: "Google Search campaign exceeding ROAS target by 2.3x with available budget headroom",
    confidence_score: 88,
    recommended_action: "Increase daily budget by 30% and expand match types to capture additional demand",
    priority_score: 78,
    ai_status: "completed",
    ai_explanation:
      "This campaign has maintained 4.6x ROAS for the past 10 days, well above the 2.0x target. Search impression share is only 62%, indicating significant untapped demand. Scaling now will maximise Q4 momentum.",
    created_at: new Date(Date.now() - 5 * 3_600_000).toISOString(),
  },
  {
    id: "d-003",
    type: "SPEND_SPIKE",
    status: "new",
    platform: "meta",
    campaign_id: "23812345678",
    trigger_condition: "Unexpected 43% spend increase detected on Meta Lookalike 1% audience",
    confidence_score: 86,
    recommended_action: "Review bid caps and set a daily spend limit to prevent further budget overrun",
    priority_score: 88,
    ai_status: "completed",
    ai_explanation:
      "Spend spiked 43% in the last 24 hours without a corresponding performance improvement. CPM increased by 18%, suggesting an auction pressure event. Immediate bid-cap review is recommended.",
    created_at: new Date(Date.now() - 8 * 3_600_000).toISOString(),
  },
  {
    id: "d-004",
    type: "CONVERSION_DROP",
    status: "new",
    platform: "google",
    campaign_id: "98709876543",
    trigger_condition: "Checkout conversion rate dropped 31% over 48 hours — landing page issue suspected",
    confidence_score: 79,
    recommended_action: "Investigate landing page load speed and checkout funnel for technical regressions",
    priority_score: 82,
    ai_status: "completed",
    ai_explanation:
      "Conversion rate dropped from 3.2% to 2.2% over 48 hours. Click-through rates remain stable, pointing to a post-click issue consistent with a landing page or checkout flow degradation.",
    created_at: new Date(Date.now() - 14 * 3_600_000).toISOString(),
  },
];

const MOCK_INTEGRATIONS: Integration[] = [
  { id: "int-001", platform: "meta",    status: "connected", lastSyncedAt: new Date(Date.now() - 30 * 60_000).toISOString() },
  { id: "int-002", platform: "google",  status: "connected", lastSyncedAt: new Date(Date.now() - 45 * 60_000).toISOString() },
  { id: "int-003", platform: "shopify", status: "connected", lastSyncedAt: new Date(Date.now() - 2 * 3_600_000).toISOString() },
];

const RISK_CONFIG = {
  ROAS_DROP:           { label: "High Risk",   color: "text-error",       bg: "bg-[#ffdad6]",   rootCause: "ROAS Decline",  applyLabel: "Apply Decision" },
  SPEND_SPIKE:         { label: "High Risk",   color: "text-error",       bg: "bg-[#ffdad6]",   rootCause: "Spend Spike",   applyLabel: "Apply Decision" },
  CONVERSION_DROP:     { label: "High Risk",   color: "text-error",       bg: "bg-[#ffdad6]",   rootCause: "Conv. Drop",    applyLabel: "Apply Decision" },
  SCALING_OPPORTUNITY: { label: "Opportunity", color: "text-emerald-700", bg: "bg-emerald-100", rootCause: "Growth Signal", applyLabel: "Scale Campaign" },
} as const;

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  shopify: "Shopify",
};

function getUrgency(score: number): string {
  if (score >= 90) return "Critical";
  if (score >= 75) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

function timeAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DecisionsPage() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [applying, setApplying] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState<Record<string, boolean>>({});

  function handleApply(id: string) {
    setApplying((s) => ({ ...s, [id]: true }));
    setTimeout(() => {
      setApplying((s) => ({ ...s, [id]: false }));
      setApplied((s) => ({ ...s, [id]: true }));
    }, 1000);
  }

  const criticalDecisions = MOCK_DECISIONS.filter((d) => d.type !== "SCALING_OPPORTUNITY");
  const highDecisions     = MOCK_DECISIONS.filter((d) => d.type === "SCALING_OPPORTUNITY");
  const quickDecisions    = MOCK_DECISIONS.filter((d) => d.confidence_score >= 85);

  const filteredDecisions =
    activeFilter === "critical" ? criticalDecisions
    : activeFilter === "high"   ? highDecisions
    : activeFilter === "quick"  ? quickDecisions
    : MOCK_DECISIONS;

  const avgConfidence = Math.round(
    MOCK_DECISIONS.reduce((s, d) => s + d.confidence_score, 0) / MOCK_DECISIONS.length
  );

  return (
    <div className="flex gap-8 pb-12">
      {/* Main Feed */}
      <div className="flex-1 min-w-0 space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">Intelligence Center</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Decisions</h2>
            <p className="text-muted-foreground mt-2 font-body">AI-powered insights and actions across your campaigns.</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity font-body">
            <RefreshCw size={16} />
            Refresh Decisions
          </button>
        </div>

        {/* Priority Filter Tabs */}
        <section className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setActiveFilter(activeFilter === "critical" ? "all" : "critical")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              activeFilter === "critical"
                ? "bg-red-50 border-error ring-2 ring-error/20"
                : "bg-white border-border hover:border-error/50 hover:bg-red-50"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-error font-body">Critical Decisions</span>
              <TriangleAlert size={18} className="text-error" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold text-foreground font-sans">{String(criticalDecisions.length).padStart(2, "0")}</p>
              <p className="text-xs text-muted-foreground font-body leading-tight">Immediate intervention required.</p>
            </div>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === "high" ? "all" : "high")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              activeFilter === "high"
                ? "bg-blue-50 border-primary ring-2 ring-primary/20"
                : "bg-white border-border hover:border-primary/50 hover:bg-blue-50"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary font-body">High Impact</span>
              <TrendingUp size={18} className="text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold text-foreground font-sans">{String(highDecisions.length).padStart(2, "0")}</p>
              <p className="text-xs text-muted-foreground font-body leading-tight">Significant ROAS optimisation.</p>
            </div>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === "quick" ? "all" : "quick")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              activeFilter === "quick"
                ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                : "bg-white border-border hover:border-emerald-500/50 hover:bg-emerald-50"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 font-body">Quick Wins</span>
              <Zap size={18} className="text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold text-foreground font-sans">{String(quickDecisions.length).padStart(2, "0")}</p>
              <p className="text-xs text-muted-foreground font-body leading-tight">Low-effort, high confidence.</p>
            </div>
          </button>
        </section>

        {/* Feed header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-foreground font-sans">Intelligence Feed</h3>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-surface-container-high text-xs font-semibold text-muted-foreground font-body">
              All Platforms
            </span>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary font-body">
              {MOCK_DECISIONS.length} Active
            </span>
          </div>
        </div>

        {/* Empty state for filter */}
        {filteredDecisions.length === 0 && (
          <div className="py-16 text-center bg-white rounded-2xl border border-border space-y-4">
            <Sparkles size={36} className="mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground font-body text-sm">No decisions match this filter.</p>
          </div>
        )}

        {/* Decision cards */}
        {filteredDecisions.length > 0 && (
          <div className="space-y-6">
            {filteredDecisions.map((decision) => {
              const risk      = RISK_CONFIG[decision.type] ?? RISK_CONFIG.ROAS_DROP;
              const isApplying = applying[decision.id];
              const isApplied  = applied[decision.id];
              const platform   = PLATFORM_LABELS[decision.platform] ?? decision.platform;

              return (
                <article
                  key={decision.id}
                  className="bg-white p-6 rounded-2xl border border-border hover:border-border hover:shadow-md shadow-sm transition-all"
                >
                  {/* Card header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1 flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${risk.bg} ${risk.color} font-body`}>
                          {risk.label}
                        </span>
                        <span className="text-xs text-muted-foreground font-body">
                          {platform} • {decision.campaign_id}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-foreground font-sans">{decision.trigger_condition}</h4>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-extrabold text-emerald-600 font-sans">{decision.confidence_score}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter font-body">Confidence</div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-5 gap-3 mb-5">
                    {[
                      { label: "Confidence", value: `${decision.confidence_score}%`, extra: "" },
                      { label: "Risk",       value: decision.type === "SCALING_OPPORTUNITY" ? "Low" : "High", extra: decision.type === "SCALING_OPPORTUNITY" ? "text-emerald-600" : "text-error" },
                      { label: "Root Cause", value: risk.rootCause, extra: decision.type === "SCALING_OPPORTUNITY" ? "text-emerald-600" : "text-error" },
                      { label: "Urgency",    value: getUrgency(decision.priority_score), extra: "" },
                      { label: "Status",     value: decision.status || "New Signal", extra: "" },
                    ].map(({ label, value, extra }) => (
                      <div key={label} className="bg-surface-container-low p-3 rounded-xl">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 font-body">{label}</p>
                        <p className={`text-sm font-bold font-sans ${extra || "text-foreground"}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* AI Reasoning + Recommended Action */}
                  <div className="flex gap-5 items-start mb-5">
                    {decision.ai_explanation && (
                      <div className="flex-1">
                        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 font-body">AI Reasoning</h5>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 font-body">{decision.ai_explanation}</p>
                      </div>
                    )}
                    <div className="flex-1">
                      <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 font-body">Recommended Action</h5>
                      <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                        <p className="text-sm font-medium text-primary line-clamp-2 font-body">{decision.recommended_action}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-body italic">
                        {decision.ai_status === "completed" ? "AI Analysis Ready" : "Recommended by System Intelligence"}
                      </span>
                      <span className="text-xs text-muted-foreground font-body">{timeAgo(decision.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/decisions/${decision.id}`}
                        className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors font-body flex items-center gap-1.5"
                      >
                        <Eye size={14} />
                        View Details
                      </Link>
                      <button
                        onClick={() => handleApply(decision.id)}
                        disabled={isApplying || isApplied}
                        className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 font-body shadow-sm shadow-primary/20"
                      >
                        {isApplying ? (
                          <><Loader2 size={14} className="animate-spin" /> Applying…</>
                        ) : isApplied ? (
                          <><CheckCircle2 size={14} /> Applied</>
                        ) : (
                          <><PlayCircle size={14} /> {risk.applyLabel}</>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Nav links */}
        <div className="flex gap-6 text-xs font-body text-muted-foreground pt-2">
          <Link href="/decisions/alerts" className="hover:text-primary transition-colors font-bold">View All Alerts →</Link>
          <Link href="/decisions/opportunities" className="hover:text-primary transition-colors font-bold">View Opportunities →</Link>
        </div>
      </div>

      {/* System Pulse Sidebar */}
      <aside className="w-80 shrink-0">
        <div className="sticky top-24 space-y-6">
          {/* Pulse Panel */}
          <section className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl border border-border/50 shadow-xl shadow-blue-900/5">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={14} className="text-primary" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground font-body">System Pulse</h4>
            </div>

            <div className="space-y-6">
              {/* Active decisions */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-body font-medium">Active Decisions</p>
                  <p className="text-xl font-bold text-foreground font-sans">{MOCK_DECISIONS.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary font-sans">{avgConfidence}%</span>
                </div>
              </div>

              {/* Signal Summary */}
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="text-[10px] font-bold text-muted-foreground uppercase font-body mb-2">Signal Summary</p>
                <p className="text-2xl font-black text-primary font-sans">
                  {criticalDecisions.length + highDecisions.length}
                </p>
                <p className="text-xs text-emerald-600 font-body font-medium mt-1 flex items-center gap-1">
                  <TrendingUp size={10} />
                  {criticalDecisions.length} critical · {highDecisions.length} opportunity
                </p>
              </div>

              {/* Avg Confidence */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2 font-body">
                  <span className="text-muted-foreground">Avg. Confidence</span>
                  <span className="text-foreground">{avgConfidence}%</span>
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${avgConfidence}%` }}
                  />
                </div>
              </div>

              {/* AI Reliability */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2 font-body">
                  <span className="text-muted-foreground">AI Reliability</span>
                  <span className="text-foreground">Stable</span>
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "98%" }} />
                </div>
              </div>
            </div>
          </section>

          {/* Operational Status */}
          <section className="bg-foreground text-white p-6 rounded-2xl">
            <h4 className="text-sm font-bold mb-5 font-sans">Operational Status</h4>
            <ul className="space-y-4">
              {MOCK_INTEGRATIONS.map((integration) => {
                const lastSync = integration.lastSyncedAt
                  ? `Synced ${timeAgo(integration.lastSyncedAt)}`
                  : "Never synced";
                return (
                  <li key={integration.id} className="flex items-start gap-3">
                    <span className="w-2 h-2 mt-1.5 rounded-full shrink-0 bg-emerald-500" />
                    <div>
                      <p className="text-xs font-bold font-body">{PLATFORM_LABELS[integration.platform] ?? integration.platform} Connected</p>
                      <p className="text-[10px] text-white/50 font-body">{lastSync}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
