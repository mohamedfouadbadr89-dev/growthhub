"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  TrendingUp, PauseCircle, AlertTriangle, Bell, Database,
  CheckCircle2, SkipForward, XCircle, ChevronUp, ChevronDown,
  Sparkles, Lightbulb, Download, Search,
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
//   - Quick Stats aside (no monthly aggregation endpoint)
//   - Trend bar chart in Quick Stats
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
  };
}

const RESULT_BADGES: Record<string, { label: string; class: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  Success: { label: "Success", class: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  Failed:  { label: "Failed",  class: "bg-red-100 text-red-600",         Icon: XCircle      },
  Skipped: { label: "Skipped", class: "bg-surface-container-high text-muted-foreground", Icon: SkipForward },
};

const RESULT_FILTERS: ResultFilter[] = ["All", "Success", "Failed", "Skipped"];

export default function DecisionHistoryPage() {
  const { getToken } = useAuth();

  const [entries,    setEntries]    = useState<HistoryEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);

  const [resultFilter, setResultFilter] = useState<ResultFilter>("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const token = await getToken();
        if (!token) throw new ApiError(401, "Sign in required");
        const data = await apiClient<{ runs: ApiAutomationRun[]; total: number }>(
          "/api/v1/automation/runs",
          token,
        );
        if (!cancelled) {
          setEntries(data.runs.map(mapRunToEntry));
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
  }, [getToken]);

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
    return true;
  });

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
        <button className="inline-flex items-center gap-2 bg-surface-container-high text-foreground px-6 py-2.5 rounded-full font-bold text-sm hover:bg-surface-container-highest transition-all font-body self-start md:self-auto">
          <Download size={15} />
          Export Log
        </button>
      </div>

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

                <div className="bg-primary/20 p-4 rounded-xl border border-primary/30">
                  <div className="flex items-start gap-3">
                    <Lightbulb size={16} className="text-blue-200 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white uppercase font-body">Growth Suggestion</p>
                      <p className="text-sm text-slate-200 font-body">
                        Lower threshold to{" "}
                        <span className="text-white font-bold">2.5</span>{" "}
                        to capture higher volume during the current seasonal upswing.
                      </p>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-white text-foreground py-2 rounded-xl font-bold text-xs hover:bg-blue-50 transition-colors font-body active:scale-95">
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

          {/* Quick Stats */}
          <div className="bg-surface-container-high rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-sm text-foreground font-sans">Quick Stats</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body mb-1">Efficiency</p>
                <p className="text-xl font-bold text-primary font-sans">+12.4%</p>
              </div>
              <div className="bg-white p-4 rounded-xl">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-body mb-1">Time Saved</p>
                <p className="text-xl font-bold text-primary font-sans">18h/wk</p>
              </div>
            </div>
            <div className="h-24 bg-white rounded-xl flex items-end px-4 pb-3 pt-3 gap-1.5">
              {[40, 55, 35, 70, 60, 85, 75, 90, 65, 80, 95, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/20 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
