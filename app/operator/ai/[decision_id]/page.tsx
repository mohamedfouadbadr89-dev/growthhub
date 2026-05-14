"use client";

// Continuation #119 (2026-05-14) — Phase β Layer 2/5 deep view per
// `specs/ai-operator-center.md`. Single AI decision detail + inline
// lifecycle trace + downstream automation_runs.
//
// Reuses (additive read-only):
//   - GET /api/v1/ai/decisions/:id  (this turn)
//   - GET /api/v1/ai/logs?trace_id= (this turn)
//   - GET /api/v1/automation/runs   (existing — filter client-side by ai_decision_id)
//
// Read-only. No mutations. No new endpoints beyond those already added.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowLeft, AlertCircle, Brain, Hash, Activity, CheckCircle2,
  XCircle, SkipForward, AlertTriangle, Sparkles,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

interface ReasoningStep { step: string; insight: string }

interface ApiAIDecision {
  id: string;
  org_id: string;
  type: "dashboard" | "insight" | "decision";
  result: unknown;
  confidence_score: number;
  status: "active" | "needs_review";
  reasoning_steps: ReasoningStep[];
  category: string | null;
  trace_id: string;
  created_at: string;
}

type AILogPhase =
  | "request" | "raw" | "validated" | "validation_error"
  | "transport_error" | "persisted" | "persistence_error";

interface ApiAILog {
  id: string;
  trace_id: string;
  phase: AILogPhase;
  model: string;
  latency_ms: number | null;
  validated_response: unknown;
  error: unknown;
  created_at: string;
}

interface ApiAutomationRun {
  id: string;
  org_id: string;
  automation_rule_id: string | null;
  ai_decision_id: string | null;
  action_template_id: string | null;
  status: "pending" | "success" | "failed" | "skipped";
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  executed_at: string | null;
  automation_rules?: { name: string } | null;
  actions_library?: { name: string; platform: string; action_type: string } | null;
}

function fmtConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

function PhaseLabel({ phase }: { phase: AILogPhase }) {
  const labels: Record<AILogPhase, string> = {
    request:           "Request sent",
    raw:               "Raw response",
    validated:         "Validated (AI Output Contract)",
    validation_error:  "Validation failed",
    transport_error:   "Transport failure",
    persisted:         "Persisted to ai_decisions",
    persistence_error: "Persistence failed",
  };
  const isErr = phase.endsWith("_error");
  const isOk = phase === "validated" || phase === "persisted";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-body ${
        isErr ? "bg-red-100 text-red-700" : isOk ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
      }`}
    >
      {labels[phase]}
    </span>
  );
}

export default function AIDecisionDeepView({ params }: { params: { decision_id: string } }) {
  const { getToken } = useAuth();
  const decisionId = params.decision_id;

  const [decision, setDecision] = useState<ApiAIDecision | null>(null);
  const [logs, setLogs] = useState<ApiAILog[]>([]);
  const [runs, setRuns] = useState<ApiAutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new ApiError(401, "Sign in required");

        // 1. Decision detail
        const decisionData = await apiClient<ApiAIDecision>(
          `/api/v1/ai/decisions/${decisionId}`,
          token,
        );
        if (cancelled) return;
        setDecision(decisionData);

        // 2. Lifecycle logs (by trace_id from the decision)
        // 3. Downstream automation runs (client-side filter on /runs since
        //    BE filter for ai_decision_id is not exposed)
        const [logsRes, runsRes] = await Promise.all([
          apiClient<{ logs: ApiAILog[]; total: number }>(
            `/api/v1/ai/logs?trace_id=${encodeURIComponent(decisionData.trace_id)}&limit=200`,
            token,
          ),
          // Continuation #122 (2026-05-14) — Phase Ω: use the new
          // server-side `?ai_decision_id=` filter (added this turn to
          // automation.ts:GET /runs). Pre-fix: this page fetched 100
          // recent runs and filtered client-side by ai_decision_id —
          // older AI decisions missed their downstream effects on orgs
          // with >100 runs in window. Now: server returns only the
          // runs that consumed THIS decision (typically 0 or 1).
          apiClient<{ runs: ApiAutomationRun[]; total: number }>(
            `/api/v1/automation/runs?ai_decision_id=${encodeURIComponent(decisionId)}&limit=100`,
            token,
          ),
        ]);
        if (cancelled) return;
        setLogs(logsRes.logs);
        // Server-side filter already applied; no client-side narrowing needed.
        setRuns(runsRes.runs);
      } catch (err) {
        if (!cancelled) setError(formatErrorMessage(err, "Failed to load AI decision"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken, decisionId]);

  const resultPreview = useMemo(() => {
    if (!decision) return null;
    try {
      return JSON.stringify(decision.result, null, 2);
    } catch {
      return String(decision.result);
    }
  }, [decision]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-container-low rounded animate-pulse" />
        <div className="h-32 bg-surface-container-low rounded-2xl animate-pulse" />
        <div className="h-64 bg-surface-container-low rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !decision) {
    return (
      <div className="space-y-6">
        <Link href="/operator/ai" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline font-body">
          <ArrowLeft size={14} /> Back to AI Operator Center
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body flex items-center gap-2">
          <AlertCircle size={16} />
          {error ?? "AI decision not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <Link href="/operator/ai" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline font-body">
        <ArrowLeft size={14} /> Back to AI Operator Center
      </Link>

      {/* Hero */}
      <div className="bg-foreground text-white rounded-2xl p-7 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="w-10 h-10 bg-primary/20 border border-white/10 rounded-full flex items-center justify-center">
              <Brain size={16} className="text-blue-200" />
            </div>
            {decision.category && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/10 border border-white/20 font-body">
                {decision.category}
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/10 border border-white/20 font-body">
              {decision.type}
            </span>
            {decision.status === "needs_review" ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-200 font-body">
                <AlertTriangle size={10} />
                Needs review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-200 font-body">
                <CheckCircle2 size={10} />
                Active
              </span>
            )}
          </div>
          <div className="flex items-end gap-6 mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 font-body">Confidence</p>
              <p className="text-5xl font-black font-sans leading-none">{fmtConfidence(decision.confidence_score)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 font-body">Created</p>
              <p className="text-sm font-bold font-body">{new Date(decision.created_at).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-[10px] font-body text-blue-200 mt-3 inline-flex items-center gap-1">
            <Hash size={10} />
            trace <code className="font-mono">{decision.trace_id}</code>
          </p>
        </div>
      </div>

      {/* AI Reasoning Steps */}
      <section className="bg-white border border-border/40 rounded-2xl p-6">
        <h2 className="font-sans font-bold text-foreground text-lg mb-4 flex items-center gap-2">
          <Brain size={18} className="text-primary" />
          Reasoning Steps
        </h2>
        {decision.reasoning_steps?.length ? (
          <ol className="space-y-3">
            {decision.reasoning_steps.map((rs, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center font-body">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-foreground font-body">{rs.step}</p>
                  <p className="text-sm text-muted-foreground font-body mt-0.5 leading-relaxed">{rs.insight}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground font-body italic">No reasoning steps recorded for this decision.</p>
        )}
      </section>

      {/* AI Output (raw result JSON) */}
      <section className="bg-white border border-border/40 rounded-2xl p-6">
        <h2 className="font-sans font-bold text-foreground text-lg mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          AI Output
        </h2>
        <pre className="bg-surface-container-low p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-72 text-foreground">
{resultPreview}
        </pre>
      </section>

      {/* Lifecycle trace */}
      <section className="bg-white border border-border/40 rounded-2xl p-6">
        <h2 className="font-sans font-bold text-foreground text-lg mb-4 flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          Lifecycle Trace
          <span className="text-[10px] font-body text-muted-foreground font-normal ml-2">
            {logs.length} phase{logs.length === 1 ? "" : "s"} recorded
          </span>
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body italic">No lifecycle log entries found for this trace.</p>
        ) : (
          <ol className="relative border-l-2 border-border/40 ml-2 space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="pl-4 -ml-px relative">
                <span
                  className={`absolute -left-[7px] top-2.5 w-3 h-3 rounded-full ring-4 ring-white ${
                    log.phase === "validated" || log.phase === "persisted"
                      ? "bg-emerald-500"
                      : log.phase.endsWith("_error")
                        ? "bg-red-500"
                        : "bg-slate-400"
                  }`}
                  aria-hidden="true"
                />
                <div className="bg-surface-container-low rounded-lg p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PhaseLabel phase={log.phase} />
                    <span className="text-[10px] font-body text-muted-foreground">
                      · {log.model}
                    </span>
                    {typeof log.latency_ms === "number" && (
                      <span className="text-[10px] font-body text-muted-foreground">· {log.latency_ms}ms</span>
                    )}
                    <span className="ml-auto text-[10px] font-body text-muted-foreground">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.error !== null && log.error !== undefined && (
                    <pre className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-[10px] font-mono overflow-x-auto max-h-28 text-red-800">
                      {JSON.stringify(log.error, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Downstream automation_runs */}
      <section className="bg-white border border-border/40 rounded-2xl p-6">
        <h2 className="font-sans font-bold text-foreground text-lg mb-4">
          Downstream Effects
          <span className="text-[10px] font-body text-muted-foreground font-normal ml-2">
            {runs.length} automation run{runs.length === 1 ? "" : "s"} consumed this decision
          </span>
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body italic">
            No automation rules fired on this decision. Either no rule matched the category,
            the approval gate blocked an auto-fire, or the AI confidence was below all rule thresholds.
          </p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => {
              const ts = (r.result_data as { trigger_source?: string } | null)?.trigger_source;
              return (
                <div key={r.id} className="bg-surface-container-low rounded-lg p-3 flex items-center gap-3">
                  {r.status === "success" && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                  {r.status === "failed" && <XCircle size={16} className="text-red-600 shrink-0" />}
                  {r.status === "skipped" && <SkipForward size={16} className="text-amber-600 shrink-0" />}
                  {r.status === "pending" && <Sparkles size={16} className="text-slate-400 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold font-body text-foreground truncate">
                      {r.actions_library?.name ?? "Action"} · <span className="font-normal text-muted-foreground">{r.status}</span>
                    </p>
                    <p className="text-[10px] font-body text-muted-foreground truncate">
                      Rule: {r.automation_rules?.name ?? "—"}
                      {ts && (
                        <span className="ml-2">· trigger_source <code className="font-mono">{ts}</code></span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/automation/history?rule_id=${r.automation_rule_id ?? ""}`}
                    className="text-[11px] font-bold text-primary hover:underline font-body shrink-0"
                  >
                    View →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
