"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  TriangleAlert,
  TrendingUp,
  Zap,
  DollarSign,
  Sparkles,
  MoreHorizontal,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

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
  created_at: string;
}

interface RunStatus {
  id?: string;
  status?: "in_progress" | "completed" | "failed";
  decisions_generated?: number;
  alerts_generated?: number;
}

const TYPE_CONFIG = {
  ROAS_DROP:            { label: "ROAS Drop",           bg: "bg-red-100",    text: "text-red-700",    border: "border-red-500"   },
  SPEND_SPIKE:          { label: "Spend Spike",         bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-500"},
  CONVERSION_DROP:      { label: "Conversion Drop",     bg: "bg-red-100",    text: "text-red-700",    border: "border-red-500"   },
  SCALING_OPPORTUNITY:  { label: "Scaling Opportunity", bg: "bg-green-100",  text: "text-green-700",  border: "border-green-500" },
} as const;

export default function DecisionsPage() {
  const { getToken } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDecisions = useCallback(async (token: string) => {
    try {
      const data = await apiClient<{ decisions: Decision[] }>("/api/v1/decisions?limit=50", token);
      setDecisions(data.decisions ?? []);
      if ((data.decisions ?? []).length === 0) setNoData(true);
      else setNoData(false);
    } catch {
      setNoData(true);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
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
      if (!token) { setLoading(false); return; }
      // Check if a run is already in progress on mount
      try {
        const status = await apiClient<RunStatus>("/api/v1/decisions/run-status", token);
        if (status?.status === "in_progress") {
          setRefreshing(true);
          setRunStatus(status);
          startPolling(token);
        }
      } catch { /* ignore */ }
      await fetchDecisions(token);
      setLoading(false);
    };
    init();
    return () => stopPolling();
  }, [getToken, fetchDecisions, startPolling, stopPolling]);

  const handleRefresh = async () => {
    const token = await getToken();
    if (!token || refreshing) return;
    setRefreshing(true);
    try {
      const result = await apiClient<{ run_id: string }>("/api/v1/decisions/refresh", token, {
        method: "POST",
      });
      setRunStatus({ id: result.run_id, status: "in_progress" });
      startPolling(token);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        // Already in progress — just start polling
        const token2 = await getToken();
        if (token2) startPolling(token2);
      } else {
        setRefreshing(false);
      }
    }
  };

  const activeAlerts = decisions.filter((d) => d.type !== "SCALING_OPPORTUNITY").length;
  const opportunities = decisions.filter((d) => d.type === "SCALING_OPPORTUNITY").length;

  const SUMMARY_CARDS = [
    { label: "Active Alerts",    value: String(activeAlerts).padStart(2, "0"),  borderColor: "border-error",      badge: "Critical",    badgeColor: "text-error",        BadgeIcon: TriangleAlert },
    { label: "Opportunities",    value: String(opportunities).padStart(2, "0"), borderColor: "border-[#006329]",  badge: "High",        badgeColor: "text-[#006329]",    BadgeIcon: TrendingUp   },
    { label: "Recommendations",  value: String(decisions.length).padStart(2, "0"), borderColor: "border-primary", badge: "Auto",        badgeColor: "text-primary",      BadgeIcon: Zap          },
    { label: "Confidence Avg",   value: decisions.length ? Math.round(decisions.reduce((s, d) => s + (d.confidence_score ?? 0), 0) / decisions.length) + "%" : "—", borderColor: "border-foreground", badge: "AI Score", badgeColor: "text-muted-foreground", BadgeIcon: DollarSign },
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Decisions</h2>
          <p className="text-muted-foreground text-lg font-body">
            AI-powered insights and actions across your campaigns.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 font-body"
        >
          {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {refreshing ? "Refreshing…" : "Refresh Decisions"}
        </button>
      </div>

      {/* Run status banner */}
      {refreshing && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 text-primary px-5 py-3 rounded-xl text-sm font-body">
          <Loader2 size={16} className="animate-spin shrink-0" />
          Decision engine is running… This usually takes under 60 seconds.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {SUMMARY_CARDS.map((c) => (
          <div key={c.label} className={`bg-white p-6 rounded-xl border-t-4 ${c.borderColor} shadow-sm`}>
            <p className="text-[0.7rem] uppercase tracking-widest font-bold text-muted-foreground mb-2 font-body">{c.label}</p>
            <div className="flex items-end justify-between">
              <span className={`text-3xl font-black font-sans ${loading ? "animate-pulse text-muted-foreground" : "text-foreground"}`}>
                {loading ? "…" : c.value}
              </span>
              <span className={`font-bold flex items-center gap-1 text-sm font-body ${c.badgeColor}`}>
                <c.BadgeIcon size={14} /> {c.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight Panel */}
      <div className="relative overflow-hidden bg-foreground text-white rounded-2xl p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
        <div className="flex-1 space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-[#b4c5ff] border border-primary/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-body">
            <Sparkles size={12} /> AI Performance Insight
          </div>
          <h3 className="text-2xl font-bold font-sans">Intelligence Summary</h3>
          <p className="text-white/70 leading-relaxed text-lg font-body">
            {noData
              ? "No campaign data available. Connect a platform to start generating AI decisions."
              : decisions.length === 0
              ? "No anomalies detected in your current data. Your campaigns are performing within normal ranges."
              : `${decisions.length} decision${decisions.length === 1 ? "" : "s"} generated across your campaigns. ${activeAlerts} issue${activeAlerts === 1 ? "" : "s"} detected, ${opportunities} scaling opportunit${opportunities === 1 ? "y" : "ies"} identified.`}
          </p>
          {noData && (
            <Link href="/integrations" className="inline-block text-sm font-bold border-b border-[#b4c5ff] text-[#b4c5ff] hover:text-white transition-colors font-body">
              Connect a Platform →
            </Link>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 text-muted-foreground py-8">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-body text-sm">Loading decisions…</span>
        </div>
      )}

      {/* Decision Cards */}
      {!loading && decisions.length > 0 && (
        <div className="space-y-6">
          <h4 className="text-xs uppercase tracking-[0.2em] font-black text-muted-foreground font-body">
            Active Decisions — sorted by priority
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {decisions.map((d) => {
              const cfg = TYPE_CONFIG[d.type] ?? TYPE_CONFIG.ROAS_DROP;
              return (
                <Link
                  key={d.id}
                  href={`/decisions/${d.id}`}
                  className={`bg-white border border-border border-l-4 ${cfg.border} p-7 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text} font-body`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground font-body">
                      {d.platform.charAt(0).toUpperCase() + d.platform.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground font-sans mb-1">{d.trigger_condition}</p>
                    <p className="text-xs text-muted-foreground font-body line-clamp-2">{d.recommended_action}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-surface-container-low">
                    <span className="text-xs font-body text-muted-foreground">
                      Confidence: <span className="font-bold text-foreground">{d.confidence_score ?? "—"}%</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {d.ai_status === "completed" ? (
                        <span className="text-[10px] text-green-600 font-bold font-body flex items-center gap-1"><Sparkles size={10} /> AI Analysis Ready</span>
                      ) : d.ai_status === "credits_exhausted" ? (
                        <span className="text-[10px] text-orange-500 font-bold font-body">Add Credits</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-body capitalize">{d.ai_status}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* No data */}
      {!loading && noData && (
        <div className="bg-white rounded-2xl p-12 text-center border border-border">
          <p className="text-muted-foreground font-body mb-4">No decisions generated yet.</p>
          <Link href="/integrations" className="inline-block px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold font-body hover:opacity-90 transition-opacity">
            Connect a Platform
          </Link>
        </div>
      )}

      <div className="flex gap-6 text-xs font-body text-muted-foreground">
        <Link href="/decisions/alerts" className="hover:text-primary transition-colors font-bold">View All Alerts →</Link>
        <Link href="/decisions/opportunities" className="hover:text-primary transition-colors font-bold">View Opportunities →</Link>
      </div>
    </div>
  );
}
