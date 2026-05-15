"use client";

// Continuation #119 (2026-05-14) — Phase β Layer 2/5 AI Operator Center
// per `specs/ai-operator-center.md`. Operator-facing console for the
// canonical `ai_decisions` table + `ai_logs` lifecycle stream.
//
// Reuses:
//   - GET /api/v1/ai/decisions    (additive read-only, this turn)
//   - GET /api/v1/ai/logs         (additive read-only, this turn)
//
// NO writes anywhere. Backend remains single source of truth on
// validation + persistence. This page is observation-only.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Sparkles, AlertCircle, RefreshCw, Search, Filter, Brain, Activity,
  CheckCircle2, AlertTriangle, ArrowRight, Hash,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

type AIDecisionType = "dashboard" | "insight" | "decision";
type AIDecisionStatus = "active" | "needs_review";

interface ReasoningStep {
  step: string;
  insight: string;
}

interface ApiAIDecision {
  id: string;
  org_id: string;
  type: AIDecisionType;
  result: unknown;
  confidence_score: number;
  status: AIDecisionStatus;
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

type Tab = "decisions" | "logs";

const TYPE_FILTERS: Array<{ value: "" | AIDecisionType; label: string }> = [
  { value: "",          label: "All types" },
  { value: "decision",  label: "Decision" },
  { value: "insight",   label: "Insight" },
  { value: "dashboard", label: "Dashboard" },
];

const STATUS_FILTERS: Array<{ value: "" | AIDecisionStatus; label: string }> = [
  { value: "",             label: "All statuses" },
  { value: "active",       label: "Active" },
  { value: "needs_review", label: "Needs review" },
];

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

function PhaseBadge({ phase }: { phase: AILogPhase }) {
  const map: Record<AILogPhase, { label: string; cls: string }> = {
    request:           { label: "Request",      cls: "bg-slate-100 text-slate-700"      },
    raw:               { label: "Raw response", cls: "bg-slate-100 text-slate-700"      },
    validated:         { label: "Validated",    cls: "bg-emerald-100 text-emerald-700"  },
    validation_error:  { label: "Validation",   cls: "bg-red-100 text-red-700"          },
    transport_error:   { label: "Transport",    cls: "bg-red-100 text-red-700"          },
    persisted:         { label: "Persisted",    cls: "bg-blue-100 text-blue-700"        },
    persistence_error: { label: "Persistence",  cls: "bg-red-100 text-red-700"          },
  };
  const v = map[phase];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-body ${v.cls}`}>
      {v.label}
    </span>
  );
}

export default function AIOperatorPage() {
  const { getToken } = useAuth();

  const [tab, setTab] = useState<Tab>("decisions");

  // Decisions tab
  const [decisions, setDecisions] = useState<ApiAIDecision[]>([]);
  const [decisionsLoading, setDecisionsLoading] = useState(true);
  const [decisionsError, setDecisionsError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"" | AIDecisionType>("");
  const [statusFilter, setStatusFilter] = useState<"" | AIDecisionStatus>("");
  const [search, setSearch] = useState("");

  // Logs tab
  const [logsTraceId, setLogsTraceId] = useState("");
  const [logsTraceInput, setLogsTraceInput] = useState("");
  const [logs, setLogs] = useState<ApiAILog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Continuation #123 (2026-05-14) — Phase Ω.2 empty-state vs error split.
  // /ai/decisions list endpoint returns 200 + empty array for orgs with no
  // decisions. A 404 here would only fire if the route isn't mounted on
  // the running backend (stale build / pre-PR#15). In that case the
  // operator should see the friendly empty state, not a red error banner.
  function isNotFound(err: unknown): boolean {
    return err instanceof ApiError && err.status === 404;
  }

  async function fetchDecisions() {
    setDecisionsLoading(true);
    setDecisionsError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const params = new URLSearchParams({ limit: "50" });
      if (typeFilter)   params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const data = await apiClient<{ decisions: ApiAIDecision[]; total: number }>(
        `/api/v1/ai/decisions?${params.toString()}`,
        token,
      );
      setDecisions(data.decisions);
    } catch (err) {
      if (isNotFound(err)) {
        setDecisions([]); // empty state, no error banner
      } else {
        setDecisionsError(formatErrorMessage(err, "Failed to load AI decisions"));
      }
    } finally {
      setDecisionsLoading(false);
    }
  }

  useEffect(() => {
    // Inline the fetch (rather than calling fetchDecisions()) so the
    // react-hooks/set-state-in-effect rule is satisfied. The external
    // `fetchDecisions` is kept for the manual Refresh button path.
    let cancelled = false;
    (async () => {
      setDecisionsLoading(true);
      setDecisionsError(null);
      try {
        const token = await getToken();
        if (!token) throw new ApiError(401, "Sign in required");
        const params = new URLSearchParams({ limit: "50" });
        if (typeFilter)   params.set("type", typeFilter);
        if (statusFilter) params.set("status", statusFilter);
        const data = await apiClient<{ decisions: ApiAIDecision[]; total: number }>(
          `/api/v1/ai/decisions?${params.toString()}`,
          token,
        );
        if (!cancelled) setDecisions(data.decisions);
      } catch (err) {
        if (!cancelled) {
          if (isNotFound(err)) {
            setDecisions([]); // empty state, no error banner (see isNotFound note)
          } else {
            setDecisionsError(formatErrorMessage(err, "Failed to load AI decisions"));
          }
        }
      } finally {
        if (!cancelled) setDecisionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [typeFilter, statusFilter, getToken]);

  async function loadLogs(traceId: string) {
    setLogs([]);
    setLogsError(null);
    if (!traceId) return;
    setLogsLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const data = await apiClient<{ logs: ApiAILog[]; total: number }>(
        `/api/v1/ai/logs?trace_id=${encodeURIComponent(traceId)}&limit=200`,
        token,
      );
      setLogs(data.logs);
    } catch (err) {
      setLogsError(formatErrorMessage(err, "Failed to load AI logs"));
    } finally {
      setLogsLoading(false);
    }
  }

  function handleLogsSearch(e: React.FormEvent) {
    e.preventDefault();
    setLogsTraceId(logsTraceInput.trim());
    void loadLogs(logsTraceInput.trim());
  }

  const filteredDecisions = useMemo(() => {
    if (!search.trim()) return decisions;
    const q = search.toLowerCase();
    return decisions.filter((d) => {
      const hay = `${d.category ?? ""} ${d.type} ${d.status} ${d.trace_id} ${d.id}`.toLowerCase();
      if (hay.includes(q)) return true;
      // Search reasoning steps content
      for (const rs of d.reasoning_steps ?? []) {
        if (`${rs.step} ${rs.insight}`.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [decisions, search]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Insights
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            AI Insights
          </h1>
          <p className="text-muted-foreground font-body mt-2">
            Review every AI decision, the reasoning behind it, and trace each call end-to-end.
            Use this to validate outcomes, debug a specific run, or audit confidence trends over time.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/40">
        <button
          onClick={() => setTab("decisions")}
          className={`px-4 py-2 text-sm font-bold font-body transition-all border-b-2 -mb-px ${
            tab === "decisions"
              ? "text-primary border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          <Brain size={14} className="inline mr-2 -mt-0.5" />
          Decisions
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-2 text-sm font-bold font-body transition-all border-b-2 -mb-px ${
            tab === "logs"
              ? "text-primary border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          <Activity size={14} className="inline mr-2 -mt-0.5" />
          Lifecycle Logs
        </button>
      </div>

      {/* Decisions tab */}
      {tab === "decisions" && (
        <div className="space-y-5">
          {/* Filter bar */}
          <div className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search decisions, reasoning, or trace ID…"
                className="bg-white border border-border/40 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body w-64"
              />
            </div>
            <div className="h-5 w-px bg-border" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "" | AIDecisionType)}
              className="bg-white border border-border rounded-xl text-xs font-bold text-foreground py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body cursor-pointer"
            >
              {TYPE_FILTERS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | AIDecisionStatus)}
              className="bg-white border border-border rounded-xl text-xs font-bold text-foreground py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body cursor-pointer"
            >
              {STATUS_FILTERS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
            <button
              onClick={() => void fetchDecisions()}
              disabled={decisionsLoading}
              className="ml-auto inline-flex items-center gap-2 bg-surface-container-high text-foreground px-4 py-2 rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-all font-body disabled:opacity-50"
            >
              <RefreshCw size={12} className={decisionsLoading ? "animate-spin" : ""} />
              Refresh
            </button>
            <div className="text-[11px] font-body text-muted-foreground flex items-center gap-1">
              <Filter size={12} />
              <span><span className="font-bold text-foreground">{filteredDecisions.length}</span> of {decisions.length}</span>
            </div>
          </div>

          {decisionsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body flex items-center gap-2">
              <AlertCircle size={16} />
              {decisionsError}
            </div>
          )}

          {decisionsLoading && decisions.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-surface-container-low rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredDecisions.length === 0 ? (
            <div className="bg-surface-container-low rounded-2xl p-12 text-center">
              <Sparkles size={28} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-body mb-1">
                {decisions.length === 0
                  ? "No AI decisions have been emitted for this org yet."
                  : "No decisions match the selected filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDecisions.map((d) => {
                const firstReasoning = d.reasoning_steps?.[0];
                return (
                  <Link
                    key={d.id}
                    href={`/operator/ai/${d.id}`}
                    className="group block bg-white border border-border/40 rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Confidence ring */}
                      <div className="shrink-0 w-14 h-14 relative">
                        <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-container-high" />
                          <circle
                            cx="20" cy="20" r="16" fill="none" strokeWidth="3" strokeLinecap="round"
                            stroke="currentColor"
                            className={
                              d.confidence_score >= 0.8 ? "text-emerald-500"
                              : d.confidence_score >= 0.5 ? "text-primary"
                              : "text-amber-500"
                            }
                            strokeDasharray={`${d.confidence_score * 100.5} 100.5`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-foreground font-body">
                          {fmtConfidence(d.confidence_score)}
                        </div>
                      </div>
                      {/* Body */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {d.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary font-body">
                              {d.category}
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container-high text-muted-foreground font-body">
                            {d.type}
                          </span>
                          {d.status === "needs_review" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 font-body">
                              <AlertTriangle size={10} />
                              Needs review
                            </span>
                          )}
                          {d.status === "active" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 font-body">
                              <CheckCircle2 size={10} />
                              Active
                            </span>
                          )}
                          <span className="ml-auto text-[10px] font-body text-muted-foreground">
                            {relTime(d.created_at)}
                          </span>
                        </div>
                        {firstReasoning ? (
                          <p className="text-sm font-body text-foreground line-clamp-2">
                            <span className="font-bold">{firstReasoning.step}:</span>{" "}
                            <span className="text-muted-foreground">{firstReasoning.insight}</span>
                          </p>
                        ) : (
                          <p className="text-sm font-body text-muted-foreground italic">
                            No reasoning steps (legacy or pre-contract row)
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-[10px] font-body text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Hash size={10} />
                            <code className="font-mono">{d.trace_id.slice(0, 8)}</code>
                          </span>
                          {d.reasoning_steps?.length > 1 && (
                            <span>+{d.reasoning_steps.length - 1} more step{d.reasoning_steps.length - 1 === 1 ? "" : "s"}</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-muted-foreground shrink-0 mt-2 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Logs tab */}
      {tab === "logs" && (
        <div className="space-y-5">
          <form onSubmit={handleLogsSearch} className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-64">
              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={logsTraceInput}
                onChange={(e) => setLogsTraceInput(e.target.value)}
                placeholder="Paste a trace ID — e.g. from a customer report or audit row"
                className="w-full bg-white border border-border/40 rounded-xl py-2.5 pl-9 pr-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
              />
            </div>
            <button
              type="submit"
              disabled={logsLoading || logsTraceInput.trim() === ""}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-primary/90 transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search size={12} />
              Inspect trace
            </button>
          </form>

          {logsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body flex items-center gap-2">
              <AlertCircle size={16} />
              {logsError}
            </div>
          )}

          {logsTraceId === "" && !logsLoading ? (
            <div className="bg-surface-container-low rounded-2xl p-12 text-center">
              <Activity size={28} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-body mb-1">
                Enter a trace ID to view a decision&apos;s full lifecycle.
              </p>
              <p className="text-[11px] text-muted-foreground font-body opacity-70">
                Every AI call leaves a step-by-step trail — from the request to the validated decision.
                The trace ID lets you follow any single decision end-to-end through the audit log.
              </p>
            </div>
          ) : logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-surface-container-low rounded-xl animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-surface-container-low rounded-2xl p-12 text-center">
              <p className="text-muted-foreground font-body">
                No log entries for this trace.
              </p>
            </div>
          ) : (
            <ol className="relative border-l-2 border-border/40 ml-2 space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="pl-4 -ml-px relative">
                  <span
                    className={`absolute -left-[7px] top-3 w-3 h-3 rounded-full ring-4 ring-background ${
                      log.phase === "validated" || log.phase === "persisted"
                        ? "bg-emerald-500"
                        : log.phase.endsWith("_error")
                          ? "bg-red-500"
                          : "bg-slate-400"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="bg-white border border-border/40 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <PhaseBadge phase={log.phase} />
                      <span className="text-[11px] font-body text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      <span className="text-[11px] font-body text-muted-foreground">
                        · {log.model}
                      </span>
                      {typeof log.latency_ms === "number" && (
                        <span className="text-[11px] font-body text-muted-foreground">
                          · {log.latency_ms}ms
                        </span>
                      )}
                    </div>
                    {log.error !== null && log.error !== undefined && (
                      <pre className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-[10px] font-mono overflow-x-auto max-h-32 text-red-800">
                        {JSON.stringify(log.error, null, 2)}
                      </pre>
                    )}
                    {log.phase === "validated" && log.validated_response !== null && log.validated_response !== undefined && (
                      <pre className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-[10px] font-mono overflow-x-auto max-h-32 text-emerald-900">
                        {JSON.stringify(log.validated_response, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
