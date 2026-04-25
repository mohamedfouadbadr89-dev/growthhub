"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  TriangleAlert,
  TrendingUp,
  Zap,
  Activity,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  PlayCircle,
  Eye,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";

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

interface RunStatus {
  id?: string;
  status?: "in_progress" | "completed" | "failed";
}

type ActiveFilter = "all" | "critical" | "high" | "quick";

const RISK_CONFIG = {
  ROAS_DROP:           { label: "High Risk",   color: "text-error",         bg: "bg-[#ffdad6]",    rootCause: "ROAS Decline",   applyLabel: "Apply Decision" },
  SPEND_SPIKE:         { label: "High Risk",   color: "text-error",         bg: "bg-[#ffdad6]",    rootCause: "Spend Spike",    applyLabel: "Apply Decision" },
  CONVERSION_DROP:     { label: "High Risk",   color: "text-error",         bg: "bg-[#ffdad6]",    rootCause: "Conv. Drop",     applyLabel: "Apply Decision" },
  SCALING_OPPORTUNITY: { label: "Opportunity", color: "text-emerald-700",   bg: "bg-emerald-100",  rootCause: "Growth Signal",  applyLabel: "Scale Campaign" },
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
  const { getToken } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [applying, setApplying] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [applyError, setApplyError] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchDecisions = useCallback(async (token: string) => {
    try {
      const data = await apiClient<{ decisions: Decision[] }>("/api/v1/decisions?limit=50", token);
      setDecisions(data.decisions ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load decisions");
    }
  }, []);

  const startPolling = useCallback(async (token: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await apiClient<RunStatus>("/api/v1/decisions/run-status", token);
        setRunStatus(status);
        if (status.status === "completed" || status.status === "failed") {
          stopPolling();
          setRefreshing(false);
          await fetchDecisions(token);
        }
      } catch {
        stopPolling();
        setRefreshing(false);
      }
    }, 3000);
  }, [stopPolling, fetchDecisions]);

  useEffect(() => {
    const init = async () => {
      const token = await getToken();
      if (!token) { setError("Your session expired — please sign in again"); setLoading(false); return; }
      try {
        const status = await apiClient<RunStatus>("/api/v1/decisions/run-status", token);
        if (status?.status === "in_progress") { setRefreshing(true); setRunStatus(status); startPolling(token); }
      } catch { /* ignore */ }
      await Promise.all([
        fetchDecisions(token),
        apiClient<Integration[]>("/api/v1/integrations", token)
          .then((data) => setIntegrations(data ?? []))
          .catch(() => {}),
      ]);
      setLoading(false);
    };
    init();
    return () => stopPolling();
  }, [getToken, fetchDecisions, startPolling, stopPolling]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const token = await getToken();
    if (!token) { setRefreshing(false); return; }
    try {
      const result = await apiClient<{ run_id: string }>("/api/v1/decisions/refresh", token, { method: "POST" });
      setRunStatus({ id: result.run_id, status: "in_progress" });
      startPolling(token);
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 409) {
        startPolling(token);
      } else {
        setRefreshing(false);
      }
    }
  };

  const handleApply = async (id: string) => {
    setApplying((s) => ({ ...s, [id]: true }));
    setApplyError((s) => { const n = { ...s }; delete n[id]; return n; });
    const token = await getToken();
    if (!token) { setApplying((s) => ({ ...s, [id]: false })); return; }
    try {
      await apiClient(`/api/v1/decisions/${id}/apply`, token, { method: "POST" });
      setApplied((s) => ({ ...s, [id]: true }));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to apply decision";
      setApplyError((s) => ({ ...s, [id]: msg }));
    } finally {
      setApplying((s) => ({ ...s, [id]: false }));
    }
  };

  const criticalDecisions = decisions.filter((d) => d.type !== "SCALING_OPPORTUNITY");
  const highDecisions = decisions.filter((d) => d.type === "SCALING_OPPORTUNITY");
  const quickDecisions = decisions.filter((d) => d.confidence_score >= 85);

  const filteredDecisions =
    activeFilter === "critical" ? criticalDecisions
    : activeFilter === "high" ? highDecisions
    : activeFilter === "quick" ? quickDecisions
    : decisions;

  const avgConfidence = decisions.length
    ? Math.round(decisions.reduce((s, d) => s + (d.confidence_score ?? 0), 0) / decisions.length)
    : 0;

  const connectedIntegrations = integrations.filter((i) => i.status === "connected");

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
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 font-body"
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {refreshing ? "Refreshing…" : "Refresh Decisions"}
          </button>
        </div>

        {/* Engine running banner */}
        {refreshing && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 text-primary px-5 py-3 rounded-xl text-sm font-body">
            <Loader2 size={16} className="animate-spin shrink-0" />
            Decision engine is running… This usually takes under 60 seconds.
            {runStatus?.id && <span className="text-xs opacity-60 font-mono ml-auto">{runStatus.id}</span>}
          </div>
        )}

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
              <p className="text-2xl font-extrabold text-foreground font-sans">{loading ? "—" : String(criticalDecisions.length).padStart(2, "0")}</p>
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
              <p className="text-2xl font-extrabold text-foreground font-sans">{loading ? "—" : String(highDecisions.length).padStart(2, "0")}</p>
              <p className="text-xs text-muted-foreground font-body leading-tight">Significant ROAS optimization.</p>
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
              <p className="text-2xl font-extrabold text-foreground font-sans">{loading ? "—" : String(quickDecisions.length).padStart(2, "0")}</p>
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
            {!loading && decisions.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary font-body">
                {decisions.length} Active
              </span>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-56 bg-surface-container-low rounded-2xl" />)}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="py-16 text-center space-y-4">
            <AlertCircle size={40} className="mx-auto text-red-300" />
            <p className="text-sm text-red-600 font-body">{error}</p>
            <button
              onClick={async () => {
                setLoading(true);
                const token = await getToken();
                if (token) await fetchDecisions(token);
                setLoading(false);
              }}
              className="px-5 py-2 text-sm font-bold border border-border rounded-xl hover:bg-surface-container-low transition-colors font-body"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredDecisions.length === 0 && (
          <div className="py-16 text-center bg-white rounded-2xl border border-border space-y-4">
            <Sparkles size={36} className="mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground font-body text-sm">
              {decisions.length === 0
                ? "No decisions generated yet. Connect a platform to start."
                : "No decisions match this filter."}
            </p>
            {decisions.length === 0 && (
              <Link href="/integrations" className="inline-block px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold font-body hover:opacity-90 transition-opacity">
                Connect a Platform
              </Link>
            )}
          </div>
        )}

        {/* Decision cards */}
        {!loading && !error && filteredDecisions.length > 0 && (
          <div className="space-y-6">
            {filteredDecisions.map((decision) => {
              const risk = RISK_CONFIG[decision.type] ?? RISK_CONFIG.ROAS_DROP;
              const isApplying = applying[decision.id];
              const isApplied = applied[decision.id];
              const applyErr = applyError[decision.id];
              const platform = PLATFORM_LABELS[decision.platform] ?? decision.platform;

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
                      { label: "Risk", value: decision.type === "SCALING_OPPORTUNITY" ? "Low" : "High", extra: decision.type === "SCALING_OPPORTUNITY" ? "text-emerald-600" : "text-error" },
                      { label: "Root Cause", value: risk.rootCause, extra: decision.type === "SCALING_OPPORTUNITY" ? "text-emerald-600" : "text-error" },
                      { label: "Urgency", value: getUrgency(decision.priority_score), extra: "" },
                      { label: "Status", value: decision.status || "New Signal", extra: "" },
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
                      {applyErr && <p className="text-xs text-error font-body max-w-[140px] text-right">{applyErr}</p>}
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
                  <p className="text-xl font-bold text-foreground font-sans">{loading ? "—" : decisions.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary font-sans">{loading ? "—" : `${avgConfidence}%`}</span>
                </div>
              </div>

              {/* Impact placeholder */}
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="text-[10px] font-bold text-muted-foreground uppercase font-body mb-2">Signal Summary</p>
                <p className="text-2xl font-black text-primary font-sans">
                  {loading ? "—" : `${criticalDecisions.length + highDecisions.length}`}
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
                  <span className="text-foreground">{loading ? "—" : `${avgConfidence}%`}</span>
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: loading ? "0%" : `${avgConfidence}%` }}
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
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-white/10 rounded-lg" />)}
              </div>
            ) : connectedIntegrations.length === 0 ? (
              <p className="text-sm text-white/50 font-body">No platforms connected yet.</p>
            ) : (
              <ul className="space-y-4">
                {connectedIntegrations.map((integration) => {
                  const lastSync = integration.lastSyncedAt
                    ? `Synced ${timeAgo(integration.lastSyncedAt)}`
                    : "Never synced";
                  return (
                    <li key={integration.id} className="flex items-start gap-3">
                      <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${integration.status === "connected" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <div>
                        <p className="text-xs font-bold font-body">{PLATFORM_LABELS[integration.platform] ?? integration.platform} Connected</p>
                        <p className="text-[10px] text-white/50 font-body">{lastSync}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
