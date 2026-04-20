"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ChevronRight, Zap, Lightbulb, Loader2, Sparkles, AlertTriangle, PlayCircle, CheckCircle2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";

const DECISION_ACTION_MAP: Record<string, Record<string, string>> = {
  ROAS_DROP:           { meta: "00000000-0000-0000-0000-000000000001", google: "00000000-0000-0000-0000-000000000004" },
  SPEND_SPIKE:         { meta: "00000000-0000-0000-0000-000000000003", google: "00000000-0000-0000-0000-000000000006" },
  CONVERSION_DROP:     { meta: "00000000-0000-0000-0000-000000000001", google: "00000000-0000-0000-0000-000000000004" },
  SCALING_OPPORTUNITY: { meta: "00000000-0000-0000-0000-000000000002", google: "00000000-0000-0000-0000-000000000005" },
};

interface DecisionDetail {
  id: string;
  type: "ROAS_DROP" | "SPEND_SPIKE" | "CONVERSION_DROP" | "SCALING_OPPORTUNITY";
  status: string;
  platform: string;
  campaign_id: string;
  trigger_condition: string;
  data_snapshot: Record<string, unknown>;
  ai_explanation: string | null;
  ai_status: "pending" | "completed" | "credits_exhausted" | "ai_unavailable";
  confidence_score: number;
  confidence_rationale: string | null;
  recommended_action: string;
  priority_score: number;
  created_at: string;
}

const TYPE_CONFIG = {
  ROAS_DROP:            { label: "ROAS Drop",           border: "border-red-500",   bg: "bg-red-50",    text: "text-red-700"    },
  SPEND_SPIKE:          { label: "Spend Spike",         border: "border-orange-500",bg: "bg-orange-50", text: "text-orange-700" },
  CONVERSION_DROP:      { label: "Conversion Drop",     border: "border-red-500",   bg: "bg-red-50",    text: "text-red-700"    },
  SCALING_OPPORTUNITY:  { label: "Scaling Opportunity", border: "border-green-500", bg: "bg-green-50",  text: "text-green-700"  },
} as const;

function DataRow({ label, value }: { label: string; value: unknown }) {
  const display = typeof value === "number" ? Number(value.toFixed(4)).toString() : String(value ?? "—");
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-container-low last:border-0">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">{label}</span>
      <span className="text-sm font-bold text-foreground font-sans">{display}</span>
    </div>
  );
}

export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [decision, setDecision] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{ result: string } | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiClient<DecisionDetail>(`/api/v1/decisions/${id}`, token);
        setDecision(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch();
  }, [id, getToken]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground py-20">
        <Loader2 size={20} className="animate-spin" />
        <span className="font-body text-sm">Loading decision…</span>
      </div>
    );
  }

  if (notFound || !decision) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-muted-foreground font-body">Decision not found.</p>
        <Link href="/decisions" className="text-primary font-bold text-sm font-body hover:underline">← Back to Decisions</Link>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[decision.type] ?? TYPE_CONFIG.ROAS_DROP;
  const snapshot = decision.data_snapshot ?? {};

  const recommendedTemplateId = DECISION_ACTION_MAP[decision.type]?.[decision.platform.toLowerCase()];

  const handleExecute = async () => {
    if (!recommendedTemplateId) return;
    setExecuting(true);
    setExecResult(null);
    setExecError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const campaignId = (snapshot.campaign_id as string | undefined) ?? decision.campaign_id;
      const result = await apiClient<{ history_id: string; result: string }>(`/api/v1/actions/${recommendedTemplateId}/execute`, token, {
        method: "POST",
        body: JSON.stringify({ params: { campaign_id: campaignId }, decision_id: decision.id }),
      });
      setExecResult(result);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err as Error).message ?? "Execution failed";
      setExecError(msg);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="pb-12 space-y-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[0.75rem] font-bold uppercase tracking-widest text-muted-foreground font-body">
        <Link href="/decisions" className="hover:text-primary transition-colors">Decisions</Link>
        <ChevronRight size={14} />
        <span className="text-foreground truncate max-w-xs">{decision.trigger_condition}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-[0.7rem] font-black uppercase tracking-tighter font-body ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
            <span className="text-xs font-bold text-muted-foreground font-body bg-surface-container-low px-3 py-1 rounded-full uppercase tracking-wider">
              {decision.platform}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans leading-tight">
            {decision.trigger_condition}
          </h1>
          <p className="text-sm text-muted-foreground font-body">Campaign: <span className="font-bold text-foreground">{decision.campaign_id}</span></p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* AI Explanation */}
        <section className={`col-span-12 lg:col-span-8 bg-white p-8 rounded-2xl shadow-sm border-t-[6px] ${cfg.border}`}>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={16} className="text-primary" />
            <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-muted-foreground font-body">
              AI Explanation
            </h3>
          </div>
          {decision.ai_status === "completed" && decision.ai_explanation ? (
            <p className="text-foreground leading-relaxed text-lg font-body">{decision.ai_explanation}</p>
          ) : decision.ai_status === "credits_exhausted" ? (
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-5">
              <AlertTriangle size={18} className="text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-orange-700 font-body text-sm">Credits Exhausted</p>
                <p className="text-orange-600 text-sm font-body mt-1">Add credits to your account to unlock AI analysis for this decision.</p>
              </div>
            </div>
          ) : decision.ai_status === "ai_unavailable" ? (
            <div className="flex items-start gap-3 bg-surface-container-low border border-border rounded-xl p-5">
              <AlertTriangle size={18} className="text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-muted-foreground text-sm font-body">{decision.recommended_action}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-body">
              <Loader2 size={14} className="animate-spin" /> Generating AI explanation…
            </div>
          )}

          {/* Data Snapshot */}
          <div className="mt-8">
            <h4 className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body">Data Snapshot</h4>
            <div className="bg-surface-container-low rounded-xl p-5">
              {Object.entries(snapshot)
                .filter(([k]) => !["date"].includes(k))
                .map(([k, v]) => (
                  <DataRow key={k} label={k.replace(/_/g, " ")} value={v} />
                ))}
              {snapshot.date && <DataRow label="date" value={snapshot.date} />}
            </div>
          </div>
        </section>

        {/* Confidence + Action */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Confidence */}
          <section className="bg-foreground text-white p-8 rounded-2xl flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[#62df7d]" />
              <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-white/50 font-body">Confidence Score</h3>
            </div>
            <div className="text-center">
              <p className="text-6xl font-black font-sans text-white">{decision.confidence_score ?? "—"}<span className="text-3xl text-white/50">%</span></p>
              <div className="mt-4 w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#62df7d] rounded-full transition-all" style={{ width: `${decision.confidence_score ?? 0}%` }} />
              </div>
            </div>
            {decision.confidence_rationale && (
              <p className="text-sm text-white/70 font-body leading-relaxed">{decision.confidence_rationale}</p>
            )}
          </section>

          {/* Recommended Action */}
          <section className="bg-primary text-white p-8 rounded-2xl flex flex-col gap-4 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <Lightbulb size={20} className="shrink-0" />
              <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-white/70 font-body">Recommended Action</h3>
            </div>
            <p className="text-xl font-bold font-sans leading-snug">{decision.recommended_action}</p>
            {recommendedTemplateId && (
              <button
                onClick={handleExecute}
                disabled={executing || !!execResult}
                className="mt-2 flex items-center justify-center gap-2 px-5 py-3 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body border border-white/20"
              >
                {executing
                  ? <><Loader2 size={16} className="animate-spin" /> Executing…</>
                  : execResult
                  ? <><CheckCircle2 size={16} /> Executed</>
                  : <><PlayCircle size={16} /> Execute Recommended Action</>
                }
              </button>
            )}
            {execError && (
              <div className="flex items-start gap-2 bg-white/10 rounded-xl p-3 border border-white/20">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p className="text-xs font-body text-white/80">{execError}</p>
              </div>
            )}
            {execResult && (
              <Link href="/automation/history" className="text-center text-xs text-white/70 hover:text-white font-body transition-colors">
                View in Decision History →
              </Link>
            )}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl" />
          </section>
        </div>
      </div>
    </div>
  );
}
