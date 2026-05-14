"use client";

// Continuation #118 (2026-05-14) — Phase α Layer 6 (Execution Timeline)
// per `specs/execution-timeline.md`. Interleaves two existing event streams
// chronologically:
//   1. /api/v1/automation/runs   (rule fires — auto + manual)
//   2. /api/v1/history           (decision_history audit rows incl. manual
//                                 /actions/:id/execute and rule-fired executions)
//
// AI decision events (Layer 2/5) are intentionally NOT fetched in this phase —
// `/api/v1/ai/decisions` ships in Phase β. The page degrades gracefully:
// when that endpoint lands, a third fetch can be added without changing the
// merge logic.
//
// NO new backend endpoint. NO new types beyond local mappers. Pure FE
// additive. Org isolation preserved (every fetch is server-side org-scoped
// via existing endpoints).

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Activity, AlertCircle, RefreshCw, CheckCircle2, XCircle, SkipForward,
  Sparkles, Zap, History as HistoryIcon, User, Bot, Filter, Search,
  ShieldAlert as ShieldAlertIconTimeline,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

// ─── Local event types ────────────────────────────────────────────────
// Normalized event shape (FE-only). Each source stream maps into this.
// Continuation #119 (2026-05-14) — Phase β enrichment. AI decision events
// added as a third stream now that /api/v1/ai/decisions has landed. Per
// `specs/execution-timeline.md` rollout note: "Page degrades gracefully
// if Layer 2/5 endpoints not yet shipped (just hides AI decision events)"
// — endpoint now exists, so we fetch it.
type EventKind = "automation_run" | "decision_history" | "ai_decision";

interface TimelineEvent {
  kind: EventKind;
  id: string;
  occurredAt: string;       // ISO; sort key
  title: string;            // primary line (action / rule / decision summary)
  subtitle: string;         // secondary line
  status: "success" | "failed" | "skipped" | "pending" | "manual" | "ai_active" | "ai_review" | "approval_blocked" | null;
  triggerSource: "auto_fire" | "manual_rule_fire" | "manual" | null;
  // Phase β additions for AI decisions enrichment
  category?: string | null;
  confidenceScore?: number | null;
  reasoningPreview?: string | null;
  traceId?: string | null;
  raw: Record<string, unknown>;  // original row for drill-down (kept opaque)
}

interface ApiAIDecisionTimeline {
  id: string;
  org_id: string;
  type: "dashboard" | "insight" | "decision";
  confidence_score: number;
  status: "active" | "needs_review";
  reasoning_steps: Array<{ step: string; insight: string }>;
  category: string | null;
  trace_id: string;
  created_at: string;
}

// ─── Source-stream shapes (subset of canonical responses) ─────────────
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
  ai_decisions?: {
    category: string | null;
    confidence_score: number | null;
    reasoning_steps: Array<{ step: string; insight: string }> | null;
  } | null;
  actions_library?: { name: string; platform: string; action_type: string } | null;
}

interface ApiHistoryRow {
  id: string;
  org_id: string;
  decision: string;
  action_taken: string;
  trigger_condition: string | null;
  result: "success" | "failed" | "skipped";
  ai_explanation: string | null;
  confidence_score: number | null;
  ai_decision_id: string | null;
  executed_by: "manual" | "automation";
  created_at: string;
}

// ─── Filter state ─────────────────────────────────────────────────────
type EventTypeFilter = "all" | "runs" | "history";
type TriggerFilter = "all" | "auto_fire" | "manual_rule_fire" | "manual";

type EventTypeFilterExt = EventTypeFilter | "ai" | "approval_blocked";

const EVENT_TYPE_OPTIONS: Array<{ value: EventTypeFilterExt; label: string }> = [
  { value: "all",               label: "All events" },
  { value: "ai",                label: "AI decisions" },
  { value: "runs",              label: "Automation runs" },
  { value: "approval_blocked",  label: "Approval-blocked" },
  { value: "history",           label: "Audit rows" },
];

const TRIGGER_OPTIONS: Array<{ value: TriggerFilter; label: string }> = [
  { value: "all",              label: "All triggers" },
  { value: "auto_fire",        label: "Auto-fire" },
  { value: "manual_rule_fire", label: "Manual rule fire" },
  { value: "manual",           label: "Manual action" },
];

// Inclusive last-N-hours preset list. Defaults to 24h.
const HOUR_PRESETS = [1, 6, 24, 72, 168] as const;

// ─── Helpers ──────────────────────────────────────────────────────────
function relTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function dayBucketLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - eventDay) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Mappers: source rows → normalized TimelineEvent ─────────────────
function mapRunToEvent(r: ApiAutomationRun): TimelineEvent | null {
  if (!r.executed_at) return null;
  const action = r.actions_library?.name ?? "Action";
  const ruleName = r.automation_rules?.name ?? "—";
  const ts = (r.result_data as { trigger_source?: string } | null)?.trigger_source ?? null;
  const triggerSource =
    ts === "auto_fire" ? "auto_fire" :
    ts === "manual_rule_fire" ? "manual_rule_fire" :
    null;
  // Continuation #120 (2026-05-14) — Phase γ approval-block detection.
  // Rows with status='skipped' + result_data.skip_reason='approval_required'
  // are the audit-visible blocks persisted by automation-engine.ts. Map
  // them to a distinct status="approval_blocked" so the timeline can
  // render an amber shield rather than a generic skip chip.
  const skipReason = (r.result_data as { skip_reason?: string } | null)?.skip_reason ?? null;
  const isApprovalBlock = r.status === "skipped" && skipReason === "approval_required";
  const displayStatus = isApprovalBlock ? "approval_blocked" : r.status;
  const displayTitle = isApprovalBlock
    ? `${action} · blocked by approval policy`
    : `${action} · ${r.status}`;
  const displaySubtitle = isApprovalBlock
    ? `Rule: ${ruleName} — operator approval required`
    : ruleName === "—" ? "Manual rule fire" : `Rule: ${ruleName}`;
  return {
    kind: "automation_run",
    id: r.id,
    occurredAt: r.executed_at,
    title: displayTitle,
    subtitle: displaySubtitle,
    status: displayStatus,
    triggerSource,
    raw: r as unknown as Record<string, unknown>,
  };
}

function mapHistoryToEvent(h: ApiHistoryRow): TimelineEvent {
  return {
    kind: "decision_history",
    id: h.id,
    occurredAt: h.created_at,
    title: h.decision,
    subtitle: h.action_taken,
    status: h.result,
    triggerSource: h.executed_by === "manual" ? "manual" : null,
    raw: h as unknown as Record<string, unknown>,
  };
}

// Continuation #119 (2026-05-14) — Phase β AI decision mapper.
// Surfaces category, confidence, and reasoning preview without exposing
// the full `result` payload (kept opaque; operators drill via the
// /operator/ai/:id deep view).
function mapAIDecisionToEvent(d: ApiAIDecisionTimeline): TimelineEvent {
  const firstStep = d.reasoning_steps?.[0];
  const reasoningPreview = firstStep
    ? `${firstStep.step}: ${firstStep.insight}`
    : null;
  return {
    kind: "ai_decision",
    id: d.id,
    occurredAt: d.created_at,
    title: d.category
      ? `${d.category} · AI ${d.type}`
      : `AI ${d.type}`,
    subtitle: reasoningPreview ?? "No reasoning steps recorded",
    status: d.status === "active" ? "ai_active" : "ai_review",
    triggerSource: null,
    category: d.category,
    confidenceScore: d.confidence_score,
    reasoningPreview,
    traceId: d.trace_id,
    raw: d as unknown as Record<string, unknown>,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function ExecutionTimelinePage() {
  const { getToken } = useAuth();

  const [runs, setRuns] = useState<ApiAutomationRun[]>([]);
  const [history, setHistory] = useState<ApiHistoryRow[]>([]);
  // Continuation #119 — Phase β AI stream
  const [aiDecisions, setAiDecisions] = useState<ApiAIDecisionTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [hours, setHours] = useState<(typeof HOUR_PRESETS)[number]>(24);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilterExt>("all");
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const [search, setSearch] = useState("");

  // `nowTick` advances every 30s so the time-window cutoff slides forward
  // without operator interaction. Required because the react-hooks/purity
  // rule forbids `Date.now()` directly inside render (useMemo) — pattern
  // borrowed from `app/actions/automation/page.tsx:163-167`.
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function fetchAll() {
    setRefreshing(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const [runsRes, historyRes, aiRes] = await Promise.all([
        apiClient<{ runs: ApiAutomationRun[]; total: number }>(
          "/api/v1/automation/runs?limit=100",
          token,
        ),
        apiClient<{ history: ApiHistoryRow[]; total: number }>(
          "/api/v1/history?limit=100",
          token,
        ),
        apiClient<{ decisions: ApiAIDecisionTimeline[]; total: number }>(
          "/api/v1/ai/decisions?limit=100",
          token,
        ),
      ]);
      setRuns(runsRes.runs);
      setHistory(historyRes.history);
      setAiDecisions(aiRes.decisions);
    } catch (err) {
      setLoadError(formatErrorMessage(err, "Failed to load execution timeline"));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new ApiError(401, "Sign in required");
        const [runsRes, historyRes, aiRes] = await Promise.all([
          apiClient<{ runs: ApiAutomationRun[]; total: number }>(
            "/api/v1/automation/runs?limit=100",
            token,
          ),
          apiClient<{ history: ApiHistoryRow[]; total: number }>(
            "/api/v1/history?limit=100",
            token,
          ),
          apiClient<{ decisions: ApiAIDecisionTimeline[]; total: number }>(
            "/api/v1/ai/decisions?limit=100",
            token,
          ),
        ]);
        if (!cancelled) {
          setRuns(runsRes.runs);
          setHistory(historyRes.history);
          setAiDecisions(aiRes.decisions);
        }
      } catch (err) {
        if (!cancelled) setLoadError(formatErrorMessage(err, "Failed to load execution timeline"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  // Merge + sort + filter. Pure derived state — `nowTick` is the time
  // reference (sliding window). Recomputes on every 30s tick.
  const eventsByDay = useMemo(() => {
    const cutoff = nowTick - hours * 60 * 60 * 1000;

    const runEvents = runs
      .map(mapRunToEvent)
      .filter((e): e is TimelineEvent => e !== null);
    const historyEvents = history.map(mapHistoryToEvent);
    const aiEvents = aiDecisions.map(mapAIDecisionToEvent);

    let merged: TimelineEvent[] = [...runEvents, ...historyEvents, ...aiEvents];

    // Time window
    merged = merged.filter((e) => {
      const t = new Date(e.occurredAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });

    // Event type
    if (eventTypeFilter === "runs") {
      merged = merged.filter((e) => e.kind === "automation_run");
    } else if (eventTypeFilter === "history") {
      merged = merged.filter((e) => e.kind === "decision_history");
    } else if (eventTypeFilter === "ai") {
      merged = merged.filter((e) => e.kind === "ai_decision");
    } else if (eventTypeFilter === "approval_blocked") {
      merged = merged.filter((e) => e.status === "approval_blocked");
    }

    // Trigger source
    if (triggerFilter !== "all") {
      merged = merged.filter((e) => e.triggerSource === triggerFilter);
    }

    // Search (substring on title + subtitle)
    if (search.trim()) {
      const q = search.toLowerCase();
      merged = merged.filter((e) =>
        `${e.title} ${e.subtitle}`.toLowerCase().includes(q),
      );
    }

    // Sort DESC by timestamp
    merged.sort((a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    // Group by day-bucket label (preserves sort order within each bucket)
    const grouped: Array<{ label: string; events: TimelineEvent[] }> = [];
    for (const e of merged) {
      const label = dayBucketLabel(e.occurredAt);
      const last = grouped[grouped.length - 1];
      if (last && last.label === label) {
        last.events.push(e);
      } else {
        grouped.push({ label, events: [e] });
      }
    }
    return grouped;
  }, [runs, history, aiDecisions, hours, eventTypeFilter, triggerFilter, search, nowTick]);

  const totalVisible = eventsByDay.reduce((acc, g) => acc + g.events.length, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Automation
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Execution Timeline
          </h1>
          <p className="text-muted-foreground font-body mt-2">
            Chronological view of automation runs and audit rows across the org.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <span className="text-[11px] text-muted-foreground font-body">
            <span className="font-bold text-foreground">{totalVisible}</span> event{totalVisible === 1 ? "" : "s"} in window
          </span>
          <button
            onClick={() => void fetchAll()}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 bg-surface-container-high text-foreground px-4 py-2 rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="bg-white border border-border/40 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body w-56"
          />
        </div>

        <div className="h-5 w-px bg-border" />

        <div className="flex bg-surface-container-high p-1 rounded-xl gap-0.5">
          {HOUR_PRESETS.map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all font-body ${
                hours === h
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {h < 24 ? `${h}h` : `${h / 24}d`}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value as EventTypeFilter)}
          className="bg-white border border-border rounded-xl text-xs font-bold text-foreground py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body cursor-pointer"
        >
          {EVENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value as TriggerFilter)}
          className="bg-white border border-border rounded-xl text-xs font-bold text-foreground py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body cursor-pointer"
        >
          {TRIGGER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2 text-[11px] font-body text-muted-foreground">
          <Filter size={12} />
          <span>Last <span className="font-bold text-foreground">{hours < 24 ? `${hours}h` : `${hours / 24}d`}</span></span>
        </div>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body flex items-center gap-2">
          <AlertCircle size={16} />
          {loadError}
        </div>
      )}

      {/* Timeline body */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-container-low rounded-xl animate-pulse" />
          ))}
        </div>
      ) : eventsByDay.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-12 text-center">
          <Activity size={28} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-body">
            No events in the selected window.
          </p>
          <p className="text-[11px] text-muted-foreground font-body opacity-70 mt-1">
            Try widening the time range or clearing filters.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {eventsByDay.map((group) => (
            <section key={group.label}>
              <h2 className="font-sans font-bold text-foreground text-sm uppercase tracking-widest mb-3 sticky top-0 bg-background py-2 z-10">
                {group.label}
                <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                  · {group.events.length} event{group.events.length === 1 ? "" : "s"}
                </span>
              </h2>
              <ol className="relative border-l-2 border-border/40 ml-2 space-y-3">
                {group.events.map((e) => (
                  <li key={`${e.kind}-${e.id}`} className="pl-4 -ml-px relative">
                    <span
                      className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ring-4 ring-background ${
                        e.status === "success"
                          ? "bg-emerald-500"
                          : e.status === "failed"
                            ? "bg-red-500"
                            : e.status === "skipped"
                              ? "bg-amber-500"
                              : e.status === "pending"
                                ? "bg-slate-400"
                                : e.status === "ai_active"
                                  ? "bg-blue-500"
                                  : e.status === "ai_review"
                                    ? "bg-amber-400"
                                    : e.status === "approval_blocked"
                                      ? "bg-amber-600"
                                      : "bg-primary"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="bg-white border border-border/40 rounded-xl p-4 hover:border-primary/20 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                              {e.kind === "automation_run" ? (
                                <span className="inline-flex items-center gap-1"><Zap size={10} /> Run</span>
                              ) : e.kind === "ai_decision" ? (
                                <span className="inline-flex items-center gap-1 text-primary"><Sparkles size={10} /> AI</span>
                              ) : (
                                <span className="inline-flex items-center gap-1"><HistoryIcon size={10} /> Audit</span>
                              )}
                            </span>
                            {/* Phase β AI enrichment chips */}
                            {e.kind === "ai_decision" && e.category && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary font-body">
                                {e.category}
                              </span>
                            )}
                            {e.kind === "ai_decision" && typeof e.confidenceScore === "number" && (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-body ${
                                  e.confidenceScore >= 0.8
                                    ? "bg-emerald-100 text-emerald-700"
                                    : e.confidenceScore >= 0.5
                                      ? "bg-slate-100 text-slate-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {Math.round(e.confidenceScore * 100)}% conf
                              </span>
                            )}
                            {/* Phase γ approval-blocked chip */}
                            {e.status === "approval_blocked" && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 font-body"
                                title="Auto-fire blocked by the centralized approval policy"
                              >
                                <ShieldAlertIconTimeline size={10} />
                                Approval blocked
                              </span>
                            )}
                            {e.triggerSource && (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-body ${
                                  e.triggerSource === "auto_fire"
                                    ? "bg-violet-100 text-violet-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {e.triggerSource === "auto_fire" ? <Bot size={10} /> : <User size={10} />}
                                {e.triggerSource === "auto_fire"
                                  ? "Auto-fire"
                                  : e.triggerSource === "manual_rule_fire"
                                    ? "Manual rule fire"
                                    : "Manual action"}
                              </span>
                            )}
                            <span className="text-[10px] font-body text-muted-foreground">
                              {fmtClock(e.occurredAt)} · {relTime(e.occurredAt)}
                            </span>
                          </div>
                          <p className="text-sm font-bold font-body text-foreground truncate">
                            {e.title}
                          </p>
                          <p className="text-xs font-body text-muted-foreground mt-0.5 truncate">
                            {e.subtitle}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {e.status === "success" && <CheckCircle2 size={16} className="text-emerald-600" />}
                          {e.status === "failed" && <XCircle size={16} className="text-red-600" />}
                          {e.status === "skipped" && <SkipForward size={16} className="text-amber-600" />}
                          {e.status === "pending" && <Sparkles size={16} className="text-slate-400" />}
                          {e.status === "manual" && <User size={16} className="text-primary" />}
                          {e.status === "ai_active" && <Sparkles size={16} className="text-blue-500" />}
                          {e.status === "ai_review" && <Sparkles size={16} className="text-amber-500" />}
                          {e.status === "approval_blocked" && <ShieldAlertIconTimeline size={16} className="text-amber-600" />}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border/30 flex items-center gap-3 text-[11px] font-body">
                        {e.status === "approval_blocked" ? (
                          <Link
                            href="/automation/approvals"
                            className="text-amber-700 hover:underline font-bold"
                          >
                            Review in approvals →
                          </Link>
                        ) : e.kind === "automation_run" ? (
                          <Link
                            href={`/automation/history?rule_id=${
                              (e.raw as unknown as ApiAutomationRun).automation_rule_id ?? ""
                            }`}
                            className="text-primary hover:underline font-bold"
                          >
                            View run in history →
                          </Link>
                        ) : e.kind === "ai_decision" ? (
                          <Link
                            href={`/operator/ai/${e.id}`}
                            className="text-primary hover:underline font-bold"
                          >
                            View AI decision →
                          </Link>
                        ) : (
                          <Link
                            href="/actions/logs"
                            className="text-primary hover:underline font-bold"
                          >
                            View in audit log →
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
