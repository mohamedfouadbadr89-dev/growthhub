"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  TrendingUp, PauseCircle, AlertTriangle, Bell, Database,
  CheckCircle2, SkipForward, XCircle, ChevronUp, ChevronDown,
  Sparkles, Lightbulb, Download, Search, RefreshCw,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

// Phase 7 webhook hardening + Phase 6 frontend completion (continuation
// #22, 2026-05-09): wired to canonical `GET /api/v1/automation/runs`.
// Backend joins automation_runs ↔ automation_rules.name; this page maps
// the run's status (pending/success/failed/skipped) onto the existing
// UI Success/Failed/Skipped category.
//
// Sections that remain MOCKED-DEFERRED:
//   - Growth Suggestion card in AI Decision Insights aside (no per-run
//     recommendation endpoint; AI Output Contract is reasoning, not
//     prescriptive next-action)
//   - (RESOLVED #49) Quick Stats aside — was previously mocked with
//     fabricated "+12.4% Efficiency / 18h/wk" copy; now shows real
//     totals derived from loaded entries (Total Runs, Success Rate).
//   - (RESOLVED #49) Trend bar chart in Quick Stats — was hardcoded
//     [40,55,35,70,…]; now buckets loaded entries by day for last 12
//     days, heights normalized to busiest bucket.
//
// Sections WIRED (resolved from prior MOCKED-DEFERRED list):
//   - Confidence Score per entry → #34 (ai_decisions(confidence_score) JOIN)
//   - Detailed Explanation panel → #37 (ai_decisions(reasoning_steps) JOIN;
//     AI Output Contract guarantees at least one step on every persisted
//     ai_decisions row — see backend/src/utils/aiValidator.ts). Falls back
//     to the original ROAS-threshold mock copy when the active entry has
//     no linked ai_decision (manual run) or pre-contract rows.
//   - Action template name + platform shown in collapsed row badge AND in
//     the expanded section chip row → #38 (actions_library JOIN via the
//     non-nullable FK automation_runs.action_template_id).
//   - Category + Confidence signal chips in the expanded section → #38
//     (data was already in HistoryEntry post-#33/#34; this is the inline-
//     visibility render so operators see signals without glancing at the
//     aside panel).
//   - action_type technical-class label appended to action chip → #39
//     (already mapped post-#38; render only when distinct from name).
//   - result_data structured execution-provenance render in Result card →
//     #39 (data already returned by /automation/runs SELECT since Phase 4
//     P2; FE was dropping it). Only primitive top-level keys surfaced;
//     nested objects (e.g., upstream-API `body`) filtered defensively.

type ResultFilter = "All" | "Success" | "Failed" | "Skipped";

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
  // Joined: { name } via PostgREST nested-select on automation_rules
  automation_rules?: { name: string } | null;
  // Joined: { category, confidence_score, reasoning_steps } via PostgREST
  // nested-select on ai_decisions.
  //   - `category` from #24 Path F visibility bridge (consumed at #33).
  //   - `confidence_score` from #34 backend SELECT extension — closes the
  //     confidence-display gap explicitly tagged at #22 mocked-deferred
  //     preservation. NUMERIC 0–1 per Phase 3 schema; null for manual
  //     runs or runs without ai_decision linkage.
  //   - `reasoning_steps` from #37 backend SELECT extension — feeds the
  //     Detailed Explanation panel (also previously mocked-deferred at
  //     #22). AI Output Contract guarantees Array<{step, insight}> with
  //     min length 1 on every persisted row (aiValidator.ts). Null only
  //     for manual runs or runs without ai_decision linkage.
  ai_decisions?: {
    category: string | null;
    confidence_score: number | null;
    reasoning_steps: Array<{ step: string; insight: string }> | null;
  } | null;
  // Joined: { name, platform, action_type } via PostgREST nested-select on
  // actions_library (#38). FK automation_runs.action_template_id is NOT
  // NULL per the Phase 4 Part 2 migration, so this block is non-null on
  // every legitimate run row; defensive optionality only guards against
  // PostgREST relationship-detection failures or row-level RLS denial.
  actions_library?: {
    name: string;
    platform: string;
    action_type: string;
  } | null;
}

interface HistoryEntry {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  decision: string;
  timestamp: string;
  actionTaken: string;
  actionTag?: string;
  result: "Success" | "Failed" | "Skipped";
  trigger: string;
  // Category from ai_decisions JOIN (#33; consumes #24 visibility bridge).
  // Non-null when auto-fire chain matched a categorical rule trigger
  // (e.g., ROAS_DROP). Null for manual runs OR runs whose ai_decision
  // didn't emit a category at top level (Path F made it optional).
  category: string | null;
  dataUsed: string;
  resultDetail: string;
  confidence: number;
  // Reasoning steps from #37 ai_decisions(reasoning_steps) JOIN. Null when
  // run has no linked ai_decision (manual run) or for pre-contract rows;
  // Detailed Explanation panel falls back to mock copy in that case.
  reasoningSteps: Array<{ step: string; insight: string }> | null;
  // Action info from #38 actions_library(name, platform, action_type)
  // JOIN. Non-null on every legitimate run row (FK is NOT NULL); guarded
  // for the defensive PostgREST detection-failure / RLS-denial path.
  actionName: string | null;
  actionPlatform: string | null;
  actionType: string | null;
  // Continuation #39 — structured execution-provenance payload from the
  // action-executor (e.g., {mode, stage, http_status, token_source,
  // idempotent_replay, original_history_id}). Rendered defensively in
  // the Result card: only primitive top-level keys are surfaced (nested
  // objects like the upstream-API `body` are intentionally filtered out
  // to avoid leaking large or unstructured payloads to the operator UI).
  resultData: Record<string, unknown> | null;
  // Continuation #49 — raw ISO timestamp for Quick Stats time-bucketing
  // (the formatted `timestamp` field above is locale-string, not parsable
  // for histogram math).
  executedAt: string | null;
}

// Map backend automation_run → display HistoryEntry. Pending status maps
// to "Skipped" badge (run hasn't completed; visually similar to "no
// action taken").
function mapRunToEntry(run: ApiAutomationRun): HistoryEntry {
  const decision = run.automation_rules?.name ?? "Automation rule";
  const ts = run.executed_at
    ? new Date(run.executed_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  let result: "Success" | "Failed" | "Skipped";
  let icon: React.ComponentType<{ size?: number; className?: string }>;
  let iconBg: string;
  let iconColor: string;
  let actionTaken: string;
  let resultDetail: string;

  if (run.status === "success") {
    result = "Success";
    icon = TrendingUp;
    iconBg = "bg-primary/10";
    iconColor = "text-primary";
    actionTaken = "Action executed";
    resultDetail = "Action Executed";
  } else if (run.status === "failed") {
    result = "Failed";
    icon = AlertTriangle;
    iconBg = "bg-red-100";
    iconColor = "text-red-500";
    actionTaken = "Execution failed";
    resultDetail = run.error_message ?? "Run failed";
  } else if (run.status === "pending") {
    result = "Skipped";
    icon = Bell;
    iconBg = "bg-surface-container-high";
    iconColor = "text-muted-foreground";
    actionTaken = "Pending";
    resultDetail = "Run pending";
  } else {
    result = "Skipped";
    icon = PauseCircle;
    iconBg = "bg-surface-container-high";
    iconColor = "text-muted-foreground";
    actionTaken = "No action taken";
    resultDetail = run.error_message ?? "Skipped";
  }

  // Category from #24 Path F visibility bridge (JOIN already returned
  // by backend; consumed here at #33). When category is non-null AND
  // trigger is rule-based, prepend it to the trigger display so operators
  // see the categorical signal that fired the rule at a glance:
  //   "ROAS_DROP · Rule abc12345…"
  // When category is null OR run is manual, keep the original format.
  const category = run.ai_decisions?.category ?? null;
  const ruleRef = run.automation_rule_id ? `Rule ${run.automation_rule_id.slice(0, 8)}…` : "Manual run";
  const trigger = category && run.automation_rule_id
    ? `${category} · ${ruleRef}`
    : ruleRef;

  // Confidence from #34 backend SELECT extension (closes #22 mocked-deferred
  // confidence gap). Backend stores NUMERIC 0–1; UI displays 0–100 percentage.
  // Null for manual runs / runs without ai_decision linkage → display 0.
  const confidenceRaw = run.ai_decisions?.confidence_score ?? null;
  const confidence = confidenceRaw !== null ? Math.round(confidenceRaw * 100) : 0;

  // Reasoning steps from #37 backend SELECT extension. Pass through
  // verbatim; rendering logic decides between live steps and mock fallback.
  const reasoningSteps = run.ai_decisions?.reasoning_steps ?? null;

  // Action info from #38 actions_library JOIN. Used by:
  //  - top-row actionTag (replaces nothing — was previously a hardcoded
  //    optional badge that was never populated by the API mapping);
  //  - expanded section action card (new render).
  const actionName = run.actions_library?.name ?? null;
  const actionPlatform = run.actions_library?.platform ?? null;
  const actionType = run.actions_library?.action_type ?? null;

  return {
    id: run.id,
    icon,
    iconBg,
    iconColor,
    decision,
    timestamp: ts,
    actionTaken,
    // Surface the action template name as the small badge under
    // "Action Taken" in the collapsed row. Falls back to undefined
    // (badge hidden) when the JOIN didn't return a row.
    actionTag: actionName ?? undefined,
    result,
    trigger,
    category,
    dataUsed: run.ai_decision_id ? `AI decision ${run.ai_decision_id.slice(0, 8)}…` : "—",
    resultDetail,
    confidence,
    reasoningSteps,
    actionName,
    actionPlatform,
    actionType,
    // #39 — passthrough; rendering logic filters to primitive top-level
    // keys at the JSX layer to keep mapRunToEntry shape-agnostic.
    resultData: run.result_data ?? null,
    // #49 — raw ISO for Quick Stats histogram bucketing.
    executedAt: run.executed_at ?? null,
  };
}

const RESULT_BADGES: Record<string, { label: string; class: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  Success: { label: "Success", class: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  Failed:  { label: "Failed",  class: "bg-red-100 text-red-600",         Icon: XCircle      },
  Skipped: { label: "Skipped", class: "bg-surface-container-high text-muted-foreground", Icon: SkipForward },
};

const RESULT_FILTERS: ResultFilter[] = ["All", "Success", "Failed", "Skipped"];

// Continuation #117 (2026-05-14) — Phase α Layer 1 (Automation Explainability)
// per `specs/automation-explainability.md`. Trigger-source filter is a
// pure client-side filter over the `entry.resultData.trigger_source` key
// already populated by the executor (action-executor.ts:526-540 + #103).
// "All" reads everything (default — zero behavior change for users who
// don't click). "Auto-fire" / "Manual fire" filter on the JSONB value.
type TriggerSourceFilter = "all" | "auto_fire" | "manual_rule_fire";
const TRIGGER_SOURCE_FILTERS: Array<{ value: TriggerSourceFilter; label: string }> = [
  { value: "all",              label: "All triggers" },
  { value: "auto_fire",        label: "Auto-fire" },
  { value: "manual_rule_fire", label: "Manual fire" },
];

export default function DecisionHistoryPage() {
  const { getToken } = useAuth();

  const [entries,    setEntries]    = useState<HistoryEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  // Continuation #73 (2026-05-12) — surface backend `total` so operators
  // see when more runs exist beyond the loaded page. Pre-fix Quick Stats
  // showed `entries.length` (limited to 50 by MAX_LIMIT) misrepresenting
  // it as the org's full count when 100+ runs may exist.
  const [totalRunsBackend, setTotalRunsBackend] = useState<number>(0);

  const [resultFilter, setResultFilter] = useState<ResultFilter>("All");
  // Continuation #117 — trigger_source filter (Layer 1). Default "all" =
  // current behavior; flipping to auto/manual narrows the visible runs.
  const [triggerSourceFilter, setTriggerSourceFilter] = useState<TriggerSourceFilter>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Continuation #45 (2026-05-12) — server-side rule_id filter. Reads
  // `?rule_id=<UUID>` from the URL on mount and passes it as a backend
  // query param (`/automation/runs?rule_id=...`), validated server-side
  // against UUID_LIKE per automation.ts:392. Enables operator drill-down
  // from rule cards on `/actions/automation` to a rule-filtered history
  // view — coherent cockpit chain (success target item #1). UUID
  // validated client-side before sending to avoid a 400 round-trip.
  const UUID_LIKE_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
  const initialRuleId = typeof window !== "undefined"
    ? (() => {
        const v = new URLSearchParams(window.location.search).get("rule_id");
        return v && UUID_LIKE_RE.test(v) ? v : null;
      })()
    : null;
  const [ruleFilter, setRuleFilter] = useState<string | null>(initialRuleId);

  function clearRuleFilter() {
    setRuleFilter(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/automation/history");
    }
  }

  // Continuation #47 — extracted fetch into a reusable callback so the
  // header refresh button can re-fire it without re-triggering useEffect
  // dependency churn. `cancelled` flag preserved in useEffect for unmount
  // races; refresh button just re-calls fetchRuns() without one.
  const [refreshing, setRefreshing] = useState(false);

  // Continuation #91 (2026-05-12) — data-freshness indicator mirroring
  // the #90 pattern from dashboard/overview. Especially important on
  // the history page since it's the CLAUDE.md §9 "system memory" surface;
  // operators need to know if displayed runs are current or stale.
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

  async function fetchRuns() {
    setRefreshing(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const query = ruleFilter ? `?rule_id=${encodeURIComponent(ruleFilter)}` : "";
      const data = await apiClient<{ runs: ApiAutomationRun[]; total: number }>(
        `/api/v1/automation/runs${query}`,
        token,
      );
      setEntries(data.runs.map(mapRunToEntry));
      setTotalRunsBackend(data.total);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      // Continuation #36: formatErrorMessage surfaces ApiError.requestId.
      setLoadError(formatErrorMessage(err, "Failed to load automation history"));
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
        const query = ruleFilter ? `?rule_id=${encodeURIComponent(ruleFilter)}` : "";
        const data = await apiClient<{ runs: ApiAutomationRun[]; total: number }>(
          `/api/v1/automation/runs${query}`,
          token,
        );
        if (!cancelled) {
          setEntries(data.runs.map(mapRunToEntry));
          setTotalRunsBackend(data.total);
          setLastUpdatedAt(Date.now());
        }
      } catch (err) {
        if (!cancelled) {
          // Continuation #36: formatErrorMessage surfaces ApiError.requestId.
          setLoadError(formatErrorMessage(err, "Failed to load automation history"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken, ruleFilter]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = entries.filter((h) => {
    if (resultFilter !== "All" && h.result !== resultFilter) return false;
    if (search && !h.decision.toLowerCase().includes(search.toLowerCase())) return false;
    // Continuation #117 — trigger_source narrowing. Reads from the JSONB
    // primitive key already in the row (#39 renderer respected). Manual
    // /actions/:id/execute runs (`executed_by='manual'`) skip the
    // automation engine, so they carry no trigger_source key → hidden
    // when filtering by auto/manual (correct: they're a separate path).
    if (triggerSourceFilter !== "all") {
      const ts = h.resultData?.trigger_source;
      if (ts !== triggerSourceFilter) return false;
    }
    return true;
  });

  // Continuation #49 — Quick Stats derived from loaded entries. Replaces
  // the prior fabricated "+12.4% Efficiency / 18h/wk Time Saved" mock
  // numbers with honest counts. Trend bar chart buckets entries by day
  // for the last 12 days; bar heights normalized to the busiest bucket.
  const totalRuns = entries.length;
  const successCountStats = entries.filter((e) => e.result === "Success").length;
  const successRateStatsPct = totalRuns === 0
    ? 0
    : Math.round((successCountStats / totalRuns) * 100);
  const trendBuckets = (() => {
    const buckets = new Array(12).fill(0);
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    for (const e of entries) {
      if (!e.executedAt) continue;
      const t = new Date(e.executedAt).getTime();
      if (Number.isNaN(t)) continue;
      const daysAgo = Math.floor((now - t) / DAY);
      if (daysAgo < 0 || daysAgo > 11) continue;
      // bucket 0 = oldest (11 days ago), bucket 11 = today
      buckets[11 - daysAgo] += 1;
    }
    return buckets;
  })();
  const maxBucket = Math.max(1, ...trendBuckets);

  // Active entry powers the right-aside AI Decision Insights panel:
  //   - Confidence Score bar (wired #34)
  //   - Detailed Explanation (wired #37 — reads activeEntry.reasoningSteps)
  // Prefer the expanded entry; fall back to entries[0]; finally fall back
  // to a safe stub so the aside never crashes on empty state. The stub
  // carries reasoningSteps:null so the panel renders its mock copy.
  const activeEntry: Pick<HistoryEntry, "confidence" | "reasoningSteps"> =
    entries.find((h) => expanded.has(h.id))
      ?? entries[0]
      ?? { confidence: 0, reasoningSteps: null };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">Automation</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Decision History
          </h1>
          <p className="text-muted-foreground font-body">Full memory — every decision, trigger, data snapshot, and outcome</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          {lastUpdatedAt !== null && (
            <span className="text-[11px] text-muted-foreground font-body">
              Updated <span className="font-bold text-foreground">{relUpdated()}</span>
            </span>
          )}
          <button
            onClick={() => void fetchRuns()}
            disabled={refreshing || loading}
            title="Refresh — fetch latest runs"
            className="inline-flex items-center gap-2 bg-surface-container-high text-foreground px-4 py-2.5 rounded-full font-bold text-sm hover:bg-surface-container-highest transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            disabled
            title="Export pending"
            className="inline-flex items-center gap-2 bg-surface-container-high text-muted-foreground px-6 py-2.5 rounded-full font-bold text-sm font-body opacity-50 cursor-not-allowed"
          >
            <Download size={15} />
            Export Log
          </button>
        </div>
      </div>

      {/* Continuation #45 — server-side rule filter chip. Continuation #47
          polishes the chip to surface the rule's friendly name when entries
          are loaded: `decision` field on HistoryEntry already carries the
          joined automation_rules.name (mapRunToEntry line 131), so when all
          filtered rows share a rule_id they share a name — pluck from
          entries[0]. Falls back to UUID prefix when no rows match yet. */}
      {ruleFilter && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-sm font-body">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Filtered</span>
            <span className="text-foreground font-medium truncate">
              {entries[0]?.decision
                ? <>Showing runs for <span className="font-bold">{entries[0].decision}</span></>
                : <>Showing runs for rule <span className="font-mono text-xs">{ruleFilter.slice(0, 8)}…</span></>}
            </span>
          </div>
          <button
            onClick={clearRuleFilter}
            className="text-xs font-bold text-primary hover:underline shrink-0"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions…"
            className="bg-white border border-border/40 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body w-52"
          />
        </div>

        <div className="h-5 w-px bg-border" />

        <div className="flex gap-2">
          {RESULT_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setResultFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all font-body ${
                resultFilter === f
                  ? "bg-primary text-white"
                  : "bg-surface-container-high text-foreground hover:bg-surface-container-highest"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Continuation #117 — trigger_source filter (Layer 1).
            Renders alongside the existing Result filter so operators can
            independently narrow by outcome AND by trigger source. */}
        <div className="h-5 w-px bg-border" />
        <div className="flex gap-2">
          {TRIGGER_SOURCE_FILTERS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTriggerSourceFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all font-body ${
                triggerSourceFilter === opt.value
                  ? opt.value === "auto_fire"
                    ? "bg-violet-600 text-white"
                    : opt.value === "manual_rule_fire"
                      ? "bg-slate-700 text-white"
                      : "bg-foreground text-white"
                  : "bg-surface-container-high text-foreground hover:bg-surface-container-highest"
              }`}
              title={
                opt.value === "auto_fire"
                  ? "Runs triggered automatically by the AI-decision stream"
                  : opt.value === "manual_rule_fire"
                    ? "Runs fired by an operator via the manual rule-execute path"
                    : "All runs regardless of trigger source"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* LEFT — Automation Feed */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-foreground font-sans">Automation Feed</h3>
            <p className="text-xs text-muted-foreground font-body">Showing {filtered.length} decisions</p>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-surface-container-low rounded-2xl p-12 text-center">
              <p className="text-muted-foreground font-body">No decisions match the selected filters.</p>
            </div>
          ) : (
            filtered.map((entry) => {
              const isExpanded = expanded.has(entry.id);
              const badge = RESULT_BADGES[entry.result];
              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl overflow-hidden shadow-sm transition-all ${
                    isExpanded
                      ? "border-2 border-primary/10 bg-surface-container-high"
                      : "bg-surface-container-low hover:bg-surface-container border border-transparent"
                  }`}
                >
                  {/* Row */}
                  <div className="p-5 flex items-start gap-4">
                    <div className={`w-12 h-12 ${entry.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                      <entry.icon size={20} className={entry.iconColor} />
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body">Decision</p>
                        <h4 className="font-bold text-foreground font-sans text-sm">{entry.decision}</h4>
                        <p className="text-xs text-muted-foreground font-body">{entry.timestamp}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body">Action Taken</p>
                        <p className="text-sm font-semibold text-foreground font-body">{entry.actionTaken}</p>
                        {entry.actionTag && (
                          <span className="text-[10px] bg-surface-container-high text-foreground px-2 py-0.5 rounded-full inline-block font-body font-bold">
                            {entry.actionTag}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-2">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-body ${badge.class}`}>
                          <badge.Icon size={12} />
                          {badge.label}
                        </span>
                        {/* Continuation #110 (2026-05-14) — promote the
                            `trigger_source` audit signal (#103) from the
                            expanded `result_data` key-value list to a
                            distinct collapsed-row chip beside the Result
                            badge. Operators can now scan history at a
                            glance to see which executions were AI-driven
                            auto-fires vs operator-approved manual rule
                            fires. Reads from `resultData.trigger_source`
                            which the action-executor populates on every
                            run (success + failure paths). Renders only
                            when present (manual non-rule action runs from
                            /actions/:id/execute won't have it). */}
                        {(() => {
                          const ts = entry.resultData?.trigger_source;
                          if (ts !== "auto_fire" && ts !== "manual_rule_fire") return null;
                          const isAuto = ts === "auto_fire";
                          return (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-body uppercase tracking-wider ${
                                isAuto
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                              title={isAuto
                                ? "Fired automatically by the AI-decision stream"
                                : "Fired by an operator via the manual rule-execute path"}
                            >
                              {isAuto ? "Auto-fire" : "Manual fire"}
                            </span>
                          );
                        })()}
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="bg-surface-container-low p-6 border-t border-primary/5 space-y-5">
                      {/* Continuation #38 — AI-derived signal chip row.
                          Each chip only renders when its data is non-null
                          so manual runs / pre-contract rows degrade
                          gracefully (whole row hidden if all three absent).
                          Mirrors the data already shown in the aside
                          panel + collapsed trigger string, surfacing it
                          inline so operators don't have to glance away. */}
                      {(entry.category || entry.confidence > 0 || entry.actionName) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.actionName && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-body bg-primary/10 text-primary">
                              <Sparkles size={11} />
                              {entry.actionName}
                              {entry.actionPlatform && (
                                <span className="text-primary/60 font-semibold">
                                  · {entry.actionPlatform}
                                </span>
                              )}
                              {/* #39: render action_type (technical class
                                  label, e.g., pause_underperforming_ad)
                                  in monospace as a secondary signal. Only
                                  shown when distinct from the friendly
                                  name to avoid redundancy. */}
                              {entry.actionType && entry.actionType !== entry.actionName && (
                                <span className="text-primary/50 font-mono font-normal text-[10px]">
                                  · {entry.actionType}
                                </span>
                              )}
                            </span>
                          )}
                          {entry.category && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-body bg-surface-container-high text-foreground">
                              <Lightbulb size={11} />
                              {entry.category}
                            </span>
                          )}
                          {entry.confidence > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-body bg-emerald-50 text-emerald-700">
                              <CheckCircle2 size={11} />
                              {entry.confidence}% confidence
                            </span>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-primary" />
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-widest font-body">Trigger Condition</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl text-sm border-l-4 border-primary font-body text-foreground">
                            {entry.trigger}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Database size={15} className="text-primary" />
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-widest font-body">Data Used</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl text-sm font-body text-foreground">
                            {entry.dataUsed}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-primary" />
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-widest font-body">Result</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl text-sm font-body text-foreground">
                            <p>{entry.resultDetail}</p>
                            {/* #39: structured execution-provenance render.
                                Only primitive top-level keys are surfaced —
                                nested objects (e.g., upstream-API `body`)
                                are intentionally filtered to avoid leaking
                                large or unstructured payloads. Values are
                                stringified + truncated to 80 chars
                                defensively. Renders only on success runs
                                that carry non-empty primitive payload. */}
                            {entry.result === "Success" && entry.resultData && (() => {
                              const primitives = Object.entries(entry.resultData)
                                .filter(([, v]) =>
                                  v !== null &&
                                  v !== undefined &&
                                  typeof v !== "object",
                                )
                                .slice(0, 6); // hard cap on chip count
                              if (primitives.length === 0) return null;
                              return (
                                <dl className="mt-2 pt-2 border-t border-border/40 space-y-1">
                                  {primitives.map(([k, v]) => {
                                    const str = String(v);
                                    const display = str.length > 80
                                      ? str.slice(0, 77) + "…"
                                      : str;
                                    return (
                                      <div key={k} className="flex gap-2 text-[11px]">
                                        <dt className="text-muted-foreground font-semibold shrink-0">
                                          {k}:
                                        </dt>
                                        <dd className="text-foreground font-mono break-all">
                                          {display}
                                        </dd>
                                      </div>
                                    );
                                  })}
                                </dl>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT — AI Insights + Quick Stats */}
        <aside className="xl:col-span-4 flex flex-col gap-6 xl:sticky xl:top-6">

          {/* AI Decision Insights */}
          <div className="bg-foreground text-white rounded-2xl p-7 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 border border-white/10 rounded-full flex items-center justify-center">
                  <Sparkles size={16} className="text-blue-200" />
                </div>
                <h3 className="font-bold text-lg font-sans">AI Decision Insights</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-2 font-body">Detailed Explanation</p>
                  {/* Continuation #37: render AI reasoning_steps from the
                      ai_decisions JOIN when present. Each step is rendered
                      as `step: insight`. AI Output Contract guarantees a
                      non-empty array (validated upstream in aiValidator.ts)
                      so when reasoningSteps is non-null it is also non-empty.
                      Falls back to the original ROAS-threshold mock copy
                      when activeEntry has no linked ai_decision (manual run)
                      or for pre-contract rows. */}
                  {activeEntry.reasoningSteps && activeEntry.reasoningSteps.length > 0 ? (
                    <ol className="space-y-2 text-sm text-slate-300 leading-relaxed font-body">
                      {activeEntry.reasoningSteps.map((rs, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-blue-200 font-bold shrink-0">{i + 1}.</span>
                          <span>
                            <span className="text-white font-semibold">{rs.step}:</span>{" "}
                            {rs.insight}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-slate-300 leading-relaxed italic font-body">
                      "This rule triggered because the{" "}
                      <span className="text-white font-semibold underline decoration-primary decoration-2 underline-offset-4">
                        ROAS threshold
                      </span>{" "}
                      was consistently met. Your target of 3.5 was exceeded at 3.8 over the 72h window — a reliable signal."
                    </p>
                  )}
                </div>

                {/* Growth Suggestion — explicitly MOCKED-DEFERRED per the
                    page header comment ("no per-run recommendation
                    endpoint; AI Output Contract is reasoning, not
                    prescriptive next-action"). Continuation #89
                    (2026-05-12) — added Sample marker + opacity-70 +
                    disabled the Apply Adjustment button (no recommendation
                    apply endpoint). Matches the cockpit Sample-marker
                    pattern from #76/#78/#79/#80/#81. */}
                <div className="bg-primary/20 p-4 rounded-xl border border-primary/30 opacity-70">
                  <div className="flex items-start gap-3">
                    <Lightbulb size={16} className="text-blue-200 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-white uppercase font-body">Growth Suggestion</p>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
                      </div>
                      <p className="text-sm text-slate-200 font-body">
                        Lower threshold to{" "}
                        <span className="text-white font-bold">2.5</span>{" "}
                        to capture higher volume during the current seasonal upswing.
                      </p>
                    </div>
                  </div>
                  <button
                    disabled
                    title="Recommendation apply pipeline pending"
                    className="w-full mt-4 bg-white/40 text-foreground/60 py-2 rounded-xl font-bold text-xs font-body cursor-not-allowed"
                  >
                    Apply Adjustment
                  </button>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-body">
                  <span>Confidence Score</span>
                  <span className="text-white font-bold">{activeEntry.confidence}%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${activeEntry.confidence}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Continuation #49 — Quick Stats derived from loaded entries.
              Replaces fabricated mock numbers ("+12.4% Efficiency",
              "18h/wk Time Saved", arbitrary bar heights) with honest counts.
              Bar chart buckets entries by day for last 12 days; heights
              normalized to busiest bucket. Closes the explicit MOCKED-DEFERRED
              comment at line 22-23 of the page header. */}
          <div className="bg-surface-container-high rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-sm text-foreground font-sans">Quick Stats</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body mb-1">Total Runs</p>
                {/* Continuation #73 — backend `total` count surfaced when it
                    exceeds the loaded page (default limit=50). Honest
                    distinction between "what we fetched" and "what exists". */}
                <p className="text-xl font-bold text-primary font-sans">
                  {totalRunsBackend > totalRuns
                    ? <>{totalRunsBackend}<span className="text-[10px] text-muted-foreground font-normal ml-1">(showing {totalRuns})</span></>
                    : totalRuns}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body mb-1">Success Rate</p>
                <p className="text-xl font-bold text-primary font-sans">
                  {totalRuns === 0 ? "—" : `${successRateStatsPct}%`}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body mb-2">Last 12 Days</p>
              <div className="h-24 bg-white rounded-xl flex items-end px-4 pb-3 pt-3 gap-1.5" title={`Busiest day: ${maxBucket} run${maxBucket === 1 ? "" : "s"}`}>
                {trendBuckets.map((count, i) => {
                  const pct = (count / maxBucket) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/20 rounded-t"
                      style={{ height: `${Math.max(pct, count > 0 ? 8 : 2)}%` }}
                      title={`${count} run${count === 1 ? "" : "s"}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
