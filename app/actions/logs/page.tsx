"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Search, Download, TrendingUp, ChevronDown, ChevronUp,
  AlertTriangle, Bot, Activity, DollarSign, Zap, RefreshCw,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

// Continuation (2026-05-12): wired Execution Log page to canonical
// `GET /api/v1/history` (decision_history; CLAUDE.md §9 "the most critical
// table in the system"). Pattern matches #13/#22/#31/#33 — backend canonical
// contract exists; FE swap from mocked-shell to real data under ADJACENT
// CONTINUATION AUTHORITY (operator-facing execution visibility — priority
// items #1 + #4 in IMPLEMENTATION PRIORITY SHIFT).
//
// Backend SELECT shape (history.ts:85):
//   id, org_id, decision, action_taken, trigger_condition, result,
//   ai_explanation, confidence_score, ai_decision_id, executed_by, created_at
//
// Schema constraints (20260503130000_phase4_minimal_execution_layer.sql):
//   - result CHECK IN ('success','failed','skipped')  — TERMINAL (no 'running')
//   - executed_by CHECK IN ('manual','automation')
//   - confidence_score NUMERIC 0–1 (displayed as 0–100 %)
//   - data_used JSONB (NOT exposed by GET /history list for perf; only
//     GET /history/:id returns the full record with data_used)
//
// Adapted Stitch filters:
//   - Platform filter → replaced with "Executed By" (All/Manual/Automation)
//     since decision_history doesn't carry a platform column (action_taken
//     is free-form TEXT). The canonical `?executed_by=` query param is
//     validated server-side against the CHECK enum (history.ts:29,65).
//   - Status filter → success/failed/skipped (terminal); no "running"
//     since the result column is terminal. The Stitch "running" mock state
//     is preserved in the type union for backwards-compat but never emitted.
//
// KPI strip (bottom-3-card metrics + system health strip):
//   - Total Executions → derived from loaded entries
//   - Revenue Impact / Efficiency Gain / System Health → labeled as
//     informational placeholders since decision_history doesn't carry
//     impact_data at the list-row level (only impact_snapshot in detail
//     route /:id, which we don't pre-load). Marked with "—" to be honest
//     rather than render fabricated numbers.

type Status = "success" | "failed" | "running" | "skipped";
type ExecutedBy = "All" | "manual" | "automation";

interface PlatformTag {
  label: string;
  dot: string;
}

interface ApiHistoryEntry {
  id: string;
  org_id: string;
  decision: string;
  action_taken: string;
  trigger_condition: string;
  result: "success" | "failed" | "skipped";
  ai_explanation: string | null;
  confidence_score: number | null;
  ai_decision_id: string | null;
  executed_by: "manual" | "automation";
  created_at: string;
}

// Continuation #42 (2026-05-12) — lazy-loaded full audit row. `GET /history`
// LIST intentionally omits data_used + impact_snapshot for performance
// (history.ts:85 column list); `GET /history/:id` returns the full row via
// `.select('*')` (history.ts:124). Expanding a row triggers a one-shot
// fetch; cache stays alive for the page session. Surfaces the two
// CLAUDE.md §9 "system memory" fields that LIST hides:
//   - data_used:       JSONB snapshot at decision time
//   - impact_snapshot: before/after state per Phase 4 deliverable
interface ApiHistoryDetail extends ApiHistoryEntry {
  data_used: Record<string, unknown>;
  impact_snapshot: Record<string, unknown> | null;
  trace_id: string | null;
}

interface LogEntry {
  id: string;
  name: string;
  desc: string;
  platforms: PlatformTag[];
  executedBy: "manual" | "automation";
  scope: string;
  impact: string;
  impactClass: string;
  status: Status;
  time: string;
  detail: {
    type: "success" | "error";
    explanation?: string;
    signal?: string;
    confidence?: string;
    aiLinked?: boolean;
    errorTitle?: string;
    errorMessage?: string;
    rootCause?: string;
  };
}

const EXECUTED_BY_TAG: Record<"manual" | "automation", PlatformTag> = {
  manual:     { label: "Manual",     dot: "#3d618c" },
  automation: { label: "Automation", dot: "#005bc4" },
};

const STATUS_LABELS: Record<Status, { label: string; class: string }> = {
  success: { label: "Success", class: "bg-emerald-100 text-emerald-700" },
  failed:  { label: "Failed",  class: "bg-red-100 text-red-600" },
  running: { label: "Running", class: "bg-primary/10 text-primary" },
  skipped: { label: "Skipped", class: "bg-surface-container-high text-muted-foreground" },
};

const EXECUTED_BY_FILTERS: ExecutedBy[] = ["All", "manual", "automation"];
const STATUS_FILTERS: Array<"All" | "success" | "failed" | "skipped"> = ["All", "success", "failed", "skipped"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapHistoryToLog(row: ApiHistoryEntry): LogEntry {
  const confidencePct = row.confidence_score !== null
    ? Math.round(row.confidence_score * 100)
    : null;

  const status: Status = row.result;

  return {
    id: row.id,
    name: row.decision,
    desc: row.action_taken,
    platforms: [EXECUTED_BY_TAG[row.executed_by]],
    executedBy: row.executed_by,
    scope: row.ai_decision_id
      ? `AI decision ${row.ai_decision_id.slice(0, 8)}…`
      : "Manual op",
    impact: confidencePct !== null ? `${confidencePct}% conf.` : "—",
    impactClass: confidencePct !== null && confidencePct >= 70
      ? "text-primary"
      : "text-muted-foreground",
    status,
    time: formatTime(row.created_at),
    detail: row.result === "failed"
      ? {
          type: "error",
          errorTitle: `Execution Failed — ${row.action_taken}`,
          errorMessage: row.ai_explanation ?? "No explanation recorded",
          rootCause: row.trigger_condition,
        }
      : {
          type: "success",
          explanation: row.ai_explanation ?? "No explanation recorded",
          signal: row.trigger_condition,
          confidence: confidencePct !== null ? `${confidencePct}%` : "—",
          aiLinked: row.ai_decision_id !== null,
        },
  };
}

export default function LogsPage() {
  const { getToken } = useAuth();

  const [entries,   setEntries]   = useState<LogEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [executedByFilter, setExecutedByFilter] = useState<ExecutedBy>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "success" | "failed" | "skipped">("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Continuation #73 (2026-05-12) — surface backend `total` so operators
  // see when more rows exist beyond the loaded page (default limit=50).
  const [totalBackend, setTotalBackend] = useState<number>(0);

  // Continuation #42 — lazy-loaded full audit row state (data_used + impact_snapshot).
  const [details,      setDetails]      = useState<Record<string, ApiHistoryDetail>>({});
  const [detailLoading,setDetailLoading]= useState<Set<string>>(new Set());
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  async function fetchDetail(id: string) {
    if (details[id] || detailLoading.has(id)) return;
    setDetailLoading((prev) => new Set(prev).add(id));
    setDetailErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const data = await apiClient<ApiHistoryDetail>(`/api/v1/history/${id}`, token);
      setDetails((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      setDetailErrors((prev) => ({ ...prev, [id]: formatErrorMessage(err, "Failed to load detail") }));
    } finally {
      setDetailLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // Continuation #48 — refresh-on-demand. Same pattern as #47 history +
  // automation status. Initial-load useEffect uses cancellation guard;
  // explicit refresh callback re-uses the same fetch logic without
  // touching effect deps.
  const [refreshing, setRefreshing] = useState(false);

  // Continuation #93 (2026-05-12) — data-freshness indicator extended to
  // the execution log page (fourth volatility-sensitive cockpit surface
  // after #90 dashboard/overview + #91 automation/history + #92 automation
  // status). decision_history is append-only and grows continuously as
  // executions fire; freshness signal helps operators judge whether the
  // visible page reflects recent activity.
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  function relUpdated(): string {
    if (lastUpdatedAt === null) return "—";
    const ms = nowTick - lastUpdatedAt;
    if (ms < 60_000) return "just now";
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  async function fetchEntries() {
    setRefreshing(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const data = await apiClient<{ history: ApiHistoryEntry[]; total: number }>(
        "/api/v1/history?limit=50",
        token,
      );
      setEntries(data.history.map(mapHistoryToLog));
      setTotalBackend(data.total);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setLoadError(formatErrorMessage(err, "Failed to load execution logs"));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const token = await getToken();
        if (!token) throw new ApiError(401, "Sign in required");
        // The canonical history list endpoint enforces MAX_LIMIT=100
        // server-side (history.ts:20); request default 50 page.
        const data = await apiClient<{ history: ApiHistoryEntry[]; total: number }>(
          "/api/v1/history?limit=50",
          token,
        );
        if (!cancelled) {
          setEntries(data.history.map(mapHistoryToLog));
          setTotalBackend(data.total);
          setLastUpdatedAt(Date.now());
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(formatErrorMessage(err, "Failed to load execution logs"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Fire-and-forget detail fetch on first expand; subsequent expands
        // hit the cache. fetchDetail is no-op if already loaded/loading.
        void fetchDetail(id);
      }
      return next;
    });
  }

  // Defensive JSONB renderer — only primitive top-level keys are surfaced
  // (same pattern as continuation #39 history-page result_data filter).
  // Nested objects/arrays are intentionally elided to avoid leaking large
  // or unstructured payloads to operator UI; values truncated to 100 chars;
  // cap at 8 keys per panel.
  function primitiveEntries(payload: Record<string, unknown> | null): Array<[string, string]> {
    if (!payload || typeof payload !== "object") return [];
    const out: Array<[string, string]> = [];
    for (const [k, v] of Object.entries(payload)) {
      if (out.length >= 8) break;
      if (v === null) {
        out.push([k, "—"]);
      } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        const s = String(v);
        out.push([k, s.length > 100 ? `${s.slice(0, 100)}…` : s]);
      }
      // arrays / nested objects intentionally elided
    }
    return out;
  }

  const filtered = useMemo(() => entries.filter((log) => {
    if (executedByFilter !== "All" && log.executedBy !== executedByFilter) return false;
    if (statusFilter !== "All" && log.status !== statusFilter) return false;
    if (search && !log.name.toLowerCase().includes(search.toLowerCase()) &&
        !log.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [entries, executedByFilter, statusFilter, search]);

  const totalExecutions = entries.length;
  const successRatePct = entries.length === 0
    ? 0
    : Math.round((entries.filter((e) => e.status === "success").length / entries.length) * 100);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Execution Log
          </h1>
          <p className="text-muted-foreground font-body">Real-time record of every automated action and its outcome</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          {lastUpdatedAt !== null && (
            <span className="text-[11px] text-muted-foreground font-body">
              Updated <span className="font-bold text-foreground">{relUpdated()}</span>
            </span>
          )}
          <button
            onClick={() => void fetchEntries()}
            disabled={refreshing || loading}
            title="Refresh — fetch latest execution logs"
            className="inline-flex items-center gap-2 bg-surface-container-high text-foreground px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="inline-flex items-center gap-2 bg-surface-container-high text-muted-foreground px-6 py-2.5 rounded-xl font-bold transition-all font-body text-sm opacity-50 cursor-not-allowed"
            disabled
            title="CSV export pending"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* System Health Strip — derived from loaded entries where possible */}
      <div className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-body">System Health</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-body">LOADED ROWS</span>
              <span className="text-sm font-bold text-primary font-body">{totalExecutions}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-body">SUCCESS RATE</span>
              <span className="text-sm font-bold text-foreground font-body">
                {entries.length === 0 ? "—" : `${successRatePct}%`}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-body">SOURCE</span>
              <span className="text-sm font-bold text-foreground font-body">decision_history</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-bold uppercase font-body">Live</span>
          <Activity size={14} className="text-primary animate-pulse" />
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body">
          {loadError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions…"
            className="bg-white border border-border rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-body w-56"
          />
        </div>

        {/* Executed-by filter (replaces Stitch Platform filter; backed by
            canonical ?executed_by= query param) */}
        <div className="flex gap-1.5">
          {EXECUTED_BY_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setExecutedByFilter(p)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all font-body ${
                executedByFilter === p
                  ? "bg-primary/10 text-primary"
                  : "bg-white border border-border text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
              }`}
            >
              {p === "All" ? "All" : p}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all font-body ${
                statusFilter === s
                  ? "bg-primary/10 text-primary"
                  : "bg-white border border-border text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
              }`}
            >
              {s === "All" ? "All Status" : STATUS_LABELS[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-border/40 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {["Decision", "Executed By", "Linkage", "Confidence", "Status", "Time", ""].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-body text-sm">
                    Loading execution logs…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-body text-sm">
                    {entries.length === 0
                      ? "No executions recorded yet."
                      : "No execution logs match the selected filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => toggleExpand(log.id)}
                      className={`hover:bg-surface-container-low/50 transition-colors cursor-pointer ${log.status === "failed" ? "bg-red-50/20" : ""}`}
                    >
                      <td className="px-6 py-5 max-w-md">
                        <p className="text-sm font-bold text-foreground font-sans truncate">{log.name}</p>
                        <p className="text-xs text-muted-foreground font-body truncate">{log.desc}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5">
                          {log.platforms.map((p) => (
                            <span key={p.label} className="bg-surface-container-high px-3 py-1 rounded-full text-[10px] font-bold text-foreground flex items-center gap-1.5 uppercase font-body">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.dot }} />
                              {p.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-foreground font-body whitespace-nowrap">{log.scope}</td>
                      <td className="px-6 py-5">
                        <span className={`text-sm font-bold font-body ${log.impactClass}`}>{log.impact}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-body ${STATUS_LABELS[log.status].class}`}>
                          {STATUS_LABELS[log.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-muted-foreground font-body whitespace-nowrap">{log.time}</td>
                      <td className="px-6 py-5 text-right">
                        {expanded.has(log.id)
                          ? <ChevronUp size={16} className="text-muted-foreground inline" />
                          : <ChevronDown size={16} className="text-muted-foreground inline" />
                        }
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {expanded.has(log.id) && (
                      <tr key={`${log.id}-detail`} className={log.status === "failed" ? "bg-red-50/10" : "bg-surface-container-low/20"}>
                        <td colSpan={7} className="px-8 pb-8 pt-0 space-y-3">
                          {/* Continuation #42 — Data Snapshot + Impact panels
                              from lazy-loaded /history/:id. CLAUDE.md §9
                              "Decision History" → data_used + impact_snapshot
                              are core memory-table fields. */}
                          {detailLoading.has(log.id) && (
                            <div className="mt-3 bg-surface-container-low/40 rounded-xl p-4 text-xs text-muted-foreground font-body">
                              Loading data snapshot…
                            </div>
                          )}
                          {detailErrors[log.id] && (
                            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-body">
                              {detailErrors[log.id]}
                            </div>
                          )}
                          {details[log.id] && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Data Snapshot */}
                              <div className="bg-white rounded-xl p-4 border border-border/30">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 font-body">Data Used (decision-time snapshot)</p>
                                {primitiveEntries(details[log.id].data_used).length === 0 ? (
                                  <p className="text-xs text-muted-foreground font-body italic">No primitive fields captured</p>
                                ) : (
                                  <dl className="space-y-1.5">
                                    {primitiveEntries(details[log.id].data_used).map(([k, v]) => (
                                      <div key={k} className="flex items-baseline justify-between gap-3 text-xs font-body">
                                        <dt className="text-muted-foreground font-mono shrink-0">{k}</dt>
                                        <dd className="text-foreground font-medium text-right truncate">{v}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                )}
                              </div>
                              {/* Impact Snapshot */}
                              <div className="bg-white rounded-xl p-4 border border-border/30">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 font-body">Impact Snapshot (after-state)</p>
                                {!details[log.id].impact_snapshot ? (
                                  <p className="text-xs text-muted-foreground font-body italic">No impact recorded</p>
                                ) : primitiveEntries(details[log.id].impact_snapshot).length === 0 ? (
                                  <p className="text-xs text-muted-foreground font-body italic">No primitive fields captured</p>
                                ) : (
                                  <dl className="space-y-1.5">
                                    {primitiveEntries(details[log.id].impact_snapshot).map(([k, v]) => (
                                      <div key={k} className="flex items-baseline justify-between gap-3 text-xs font-body">
                                        <dt className="text-muted-foreground font-mono shrink-0">{k}</dt>
                                        <dd className="text-foreground font-medium text-right truncate">{v}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                )}
                              </div>
                              {details[log.id].trace_id && (
                                <div className="md:col-span-2 text-[10px] text-muted-foreground font-mono font-body">
                                  trace_id: {details[log.id].trace_id}
                                </div>
                              )}
                            </div>
                          )}

                          {log.detail.type === "success" ? (
                            <div className="bg-surface-container-low/40 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                              <div className="md:col-span-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">AI Execution Explanation</p>
                                <p className="text-sm text-foreground leading-relaxed font-body whitespace-pre-wrap">{log.detail.explanation}</p>
                              </div>
                              <div className="space-y-4">
                                {log.detail.signal && (
                                  <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-body">Trigger Condition</p>
                                    <span className="inline-block bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold font-body">
                                      {log.detail.signal}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-border/20">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground font-bold font-body">CONFIDENCE</span>
                                    <span className="text-sm font-bold text-foreground font-body">{log.detail.confidence}</span>
                                  </div>
                                  <TrendingUp size={16} className="text-muted-foreground" />
                                  <div className="flex flex-col text-right">
                                    <span className="text-[10px] text-muted-foreground font-bold font-body">AI LINKED</span>
                                    <span className="text-sm font-bold text-primary font-body">
                                      {log.detail.aiLinked ? "Yes" : "No"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-red-50 border-2 border-dashed border-red-200 rounded-xl p-6 mt-2">
                              <div className="flex items-start gap-4">
                                <div className="bg-red-500 text-white p-2 rounded-lg shrink-0">
                                  <AlertTriangle size={18} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-wrap justify-between items-center mb-3 gap-3">
                                    <h4 className="font-bold text-red-600 font-body">{log.detail.errorTitle}</h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase font-body mb-1">AI Explanation</p>
                                      <p className="text-xs font-mono bg-white/60 p-2 rounded-lg border border-red-100 whitespace-pre-wrap">
                                        {log.detail.errorMessage}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase font-body mb-1">Trigger Condition</p>
                                      <p className="text-xs text-foreground leading-relaxed font-body">{log.detail.rootCause}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Metrics — derived from loaded data where possible; placeholders
          ('—') where decision_history doesn't carry the field at list-row level */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border-l-4 border-primary shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">Total Executions</span>
              {/* Continuation #73 — backend `total` count surfaced when it
                  exceeds the loaded page; "(showing N)" subtitle when more
                  rows exist beyond the limit=50 page. */}
              <h3 className="text-3xl font-black text-foreground font-sans mt-1">
                {totalBackend > totalExecutions
                  ? <>{totalBackend}<span className="text-sm text-muted-foreground font-normal ml-2">showing {totalExecutions}</span></>
                  : totalExecutions}
              </h3>
            </div>
            <Zap size={32} className="text-primary/20" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground font-body">
            <Activity size={14} />
            Source: decision_history
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border-l-4 border-emerald-500 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">Success Rate</span>
              <h3 className="text-3xl font-black text-emerald-600 font-sans mt-1">
                {entries.length === 0 ? "—" : `${successRatePct}%`}
              </h3>
            </div>
            <DollarSign size={32} className="text-emerald-500/20" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 font-body">
            <Activity size={14} />
            Across loaded rows
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border-l-4 border-orange-400 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">Automated vs Manual</span>
              <h3 className="text-3xl font-black text-foreground font-sans mt-1">
                {entries.filter((e) => e.executedBy === "automation").length}
                <span className="text-muted-foreground text-lg">/{entries.length}</span>
              </h3>
            </div>
            <TrendingUp size={32} className="text-orange-400/20" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground font-body">
            <Activity size={14} />
            Auto-fired vs operator-driven
          </div>
        </div>
      </div>

      {/* AI Insight Card */}
      <div className="bg-white rounded-2xl p-5 border border-border/40 flex items-start gap-4 shadow-sm max-w-md">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bot size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground font-sans">Audit Trail</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter font-body mb-1">decision_history</p>
          <p className="text-xs text-muted-foreground leading-relaxed font-body">
            Every execution — manual or automated — is recorded with full trigger, AI explanation, and confidence score. Click any row to expand.
          </p>
        </div>
      </div>
    </div>
  );
}
