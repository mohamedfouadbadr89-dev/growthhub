"use client";

// Continuation #120 (2026-05-14) — Phase γ Layer 7 (Approval Intelligence)
// per `specs/approval-intelligence.md`. Operator-facing queue of
// auto-fire-blocked rule attempts. Reads the EXISTING `/api/v1/automation/
// runs?status=skipped` endpoint — the approval-policy gate now persists
// each blocked attempt as a status='skipped' row with structured
// `result_data.skip_reason='approval_required'` (Phase γ BE extension in
// automation-engine.ts).
//
// "Approve & Fire" reuses the EXISTING manual-rule-execute endpoint
// (POST /api/v1/automation/rules/:id/execute) — that path bypasses the
// auto-fire approval gate by design (manual = implicit operator approval).
// NO new endpoint, NO new execution path, NO executor bypass.
//
// The centralized `actionRequiresApproval(action_type)` policy remains
// the SOLE source of truth. This page DISPLAYS the policy verdict only;
// it never independently determines approval eligibility.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  ShieldAlert, AlertCircle, RefreshCw, CheckCircle2, EyeOff, Brain,
  AlertTriangle, Filter, Search, ArrowRight, Clock,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

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

// Time-window presets (hours).
const HOUR_PRESETS = [24, 72, 168, 720] as const;
type HourPreset = (typeof HOUR_PRESETS)[number];

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

function platformDotColor(platform: string | null | undefined): string {
  switch (platform?.toLowerCase()) {
    case "meta":    return "#0668E1";
    case "google":  return "#4285F4";
    case "shopify": return "#5E8E3E";
    default:        return "#3d618c";
  }
}

export default function ApprovalsPage() {
  const { getToken } = useAuth();

  const [runs, setRuns] = useState<ApiAutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [hours, setHours] = useState<HourPreset>(168);
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  // Track which rows have been approved/fired or dismissed during this
  // session. Approval calls the existing manual-fire endpoint which
  // creates a NEW automation_runs row (status=success or failed); the
  // original skipped row stays in the audit history. Dismiss is purely
  // client-side hide (no persistence — re-appears next page load).
  const [firingId, setFiringId] = useState<string | null>(null);
  const [firedKeys, setFiredKeys] = useState<Set<string>>(new Set());
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [fireMessage, setFireMessage] = useState<
    | { kind: "success"; text: string }
    | { kind: "error";   text: string }
    | null
  >(null);

  // `nowTick` advances every 30s for the sliding window — react-hooks/
  // purity rule forbids Date.now() in render.
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function fetchSkipped() {
    setRefreshing(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const data = await apiClient<{ runs: ApiAutomationRun[]; total: number }>(
        "/api/v1/automation/runs?status=skipped&limit=100",
        token,
      );
      setRuns(data.runs);
    } catch (err) {
      setLoadError(formatErrorMessage(err, "Failed to load pending approvals"));
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
        const data = await apiClient<{ runs: ApiAutomationRun[]; total: number }>(
          "/api/v1/automation/runs?status=skipped&limit=100",
          token,
        );
        if (!cancelled) setRuns(data.runs);
      } catch (err) {
        if (!cancelled) setLoadError(formatErrorMessage(err, "Failed to load pending approvals"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  async function approveAndFire(run: ApiAutomationRun) {
    if (!run.automation_rule_id) {
      setFireMessage({ kind: "error", text: "Rule id missing — cannot fire" });
      return;
    }
    setFiringId(run.id);
    setFireMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      // EXISTING endpoint — manual fire bypasses the auto-fire approval
      // gate by design (operator triggering = implicit approval). NO
      // new endpoint, NO new execution path. Pass ai_decision_id so
      // the new run links to the originating AI signal for audit.
      const body: Record<string, unknown> = {};
      if (run.ai_decision_id) body.ai_decision_id = run.ai_decision_id;
      const result = await apiClient<{ rules_fired: number; run_ids: string[] }>(
        `/api/v1/automation/rules/${run.automation_rule_id}/execute`,
        token,
        { method: "POST", body: JSON.stringify(body) },
      );
      setFireMessage({
        kind: "success",
        text: `Approved & fired "${run.automation_rules?.name ?? "rule"}" — ${result.rules_fired} run${result.rules_fired === 1 ? "" : "s"} created`,
      });
      setFiredKeys((prev) => {
        const next = new Set(prev);
        next.add(run.id);
        return next;
      });
      // Refresh the pending queue so newly-cleared items disappear if
      // backend dedupe leaves the original skipped row in place
      // (current implementation keeps it as audit history).
      void fetchSkipped();
    } catch (err) {
      setFireMessage({ kind: "error", text: formatErrorMessage(err, "Approval execution failed") });
    } finally {
      setFiringId(null);
    }
  }

  function dismiss(run: ApiAutomationRun) {
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(run.id);
      return next;
    });
  }

  // Filter (action_type from result_data, time window, search)
  const filtered = useMemo(() => {
    const cutoff = nowTick - hours * 60 * 60 * 1000;
    return runs.filter((r) => {
      if (firedKeys.has(r.id) || dismissedKeys.has(r.id)) return false;
      // Skip-reason scope — by design the queue is approval_required only,
      // but a future status='skipped' might exist for other reasons.
      const skipReason = (r.result_data as { skip_reason?: string } | null)?.skip_reason;
      if (skipReason !== "approval_required") return false;
      // Action type filter (read from result_data.action_type).
      if (actionTypeFilter) {
        const at = (r.result_data as { action_type?: string } | null)?.action_type;
        if (at !== actionTypeFilter) return false;
      }
      // Time window
      const ts = r.executed_at ? new Date(r.executed_at).getTime() : 0;
      if (!Number.isFinite(ts) || ts < cutoff) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.automation_rules?.name ?? ""} ${r.actions_library?.name ?? ""} ${r.ai_decisions?.category ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [runs, hours, actionTypeFilter, search, firedKeys, dismissedKeys, nowTick]);

  // Build the action_type filter options dynamically from loaded data —
  // single source of truth remains the centralized backend policy; we
  // just show which protected types appear in the queue.
  const actionTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      const at = (r.result_data as { action_type?: string } | null)?.action_type;
      if (at) set.add(at);
    }
    return Array.from(set).sort();
  }, [runs]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-600 font-body">
            Approval Intelligence
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Pending Approvals
          </h1>
          <p className="text-muted-foreground font-body mt-2 max-w-2xl">
            Auto-fire attempts blocked by the centralized approval policy. Each row is a
            spend-increasing or launch-capable action that the AI wanted to fire but requires
            your explicit approval to execute.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <span className="text-[11px] text-muted-foreground font-body">
            <span className="font-bold text-foreground">{filtered.length}</span> pending in window
          </span>
          <button
            onClick={() => void fetchSkipped()}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 bg-surface-container-high text-foreground px-4 py-2 rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-all font-body disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Policy reference banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm font-body min-w-0">
          <p className="font-bold text-amber-800 mb-1">Centralized approval policy</p>
          <p className="text-amber-700 leading-relaxed">
            Spend-increasing (e.g. <code className="text-amber-900">meta.increase_budget</code>) and launch-capable
            (e.g. <code className="text-amber-900">meta.create_campaign</code>, <code className="text-amber-900">google.create_campaign</code>)
            action types are gated from auto-firing. Single source of truth lives in
            <code className="text-amber-900 mx-1">automation-engine.ts:actionRequiresApproval</code>.
            Manual approval via this page calls the existing
            <code className="text-amber-900 mx-1">POST /api/v1/automation/rules/:id/execute</code>
            endpoint — implicit operator approval, full audit chain preserved.
          </p>
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
            placeholder="Search rule, action, category…"
            className="bg-white border border-border/40 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body w-64"
          />
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex bg-surface-container-high p-1 rounded-xl gap-0.5">
          {HOUR_PRESETS.map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all font-body ${
                hours === h ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {h < 168 ? `${h / 24}d` : h === 168 ? "7d" : "30d"}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-border" />
        <select
          value={actionTypeFilter}
          onChange={(e) => setActionTypeFilter(e.target.value)}
          className="bg-white border border-border rounded-xl text-xs font-bold text-foreground py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body cursor-pointer"
        >
          <option value="">All action types</option>
          {actionTypeOptions.map((at) => (
            <option key={at} value={at}>{at}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2 text-[11px] font-body text-muted-foreground">
          <Filter size={12} />
          <span><span className="font-bold text-foreground">{filtered.length}</span> of {runs.length}</span>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body flex items-center gap-2">
          <AlertCircle size={16} />
          {loadError}
        </div>
      )}

      {fireMessage && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-body flex items-center gap-2 ${
            fireMessage.kind === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {fireMessage.kind === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {fireMessage.text}
        </div>
      )}

      {/* Queue */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-surface-container-low rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-12 text-center">
          <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-3" />
          <p className="text-foreground font-body font-bold mb-1">No pending approvals</p>
          <p className="text-[11px] text-muted-foreground font-body opacity-70">
            The approval policy hasn&apos;t blocked any auto-fire attempts in this window.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const ruleName = r.automation_rules?.name ?? "Unknown rule";
            const actionName = r.actions_library?.name ?? "Action";
            const actionType = (r.result_data as { action_type?: string } | null)?.action_type ?? r.actions_library?.action_type ?? null;
            const platform = r.actions_library?.platform ?? null;
            const dotColor = platformDotColor(platform);
            const category = r.ai_decisions?.category;
            const confidence = r.ai_decisions?.confidence_score;
            const firstReasoning = r.ai_decisions?.reasoning_steps?.[0];
            const isFiring = firingId === r.id;
            return (
              <div
                key={r.id}
                className="bg-white border border-border/40 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {platform && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container-high text-foreground font-body"
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                          {platform}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 font-body"
                        title="Auto-fire blocked by centralized approval policy"
                      >
                        <ShieldAlert size={10} />
                        Approval required
                      </span>
                      {category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary font-body">
                          {category}
                        </span>
                      )}
                      <span className="text-[10px] font-body text-muted-foreground inline-flex items-center gap-1">
                        <Clock size={10} />
                        {relTime(r.executed_at)}
                      </span>
                    </div>
                    <h3 className="font-sans font-bold text-foreground text-base mb-0.5">
                      {ruleName}
                    </h3>
                    <p className="text-sm font-body text-muted-foreground">
                      <span className="text-foreground font-bold">{actionName}</span>
                      {actionType && (
                        <code className="ml-2 text-[10px] font-mono">{actionType}</code>
                      )}
                    </p>
                  </div>
                  {typeof confidence === "number" && (
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                        AI confidence
                      </p>
                      <p
                        className={`text-2xl font-black font-sans ${
                          confidence >= 0.8 ? "text-emerald-600"
                          : confidence >= 0.5 ? "text-primary"
                          : "text-amber-600"
                        }`}
                      >
                        {Math.round(confidence * 100)}%
                      </p>
                    </div>
                  )}
                </div>

                {firstReasoning && (
                  <div className="bg-surface-container-low rounded-lg p-3 mb-3 flex items-start gap-2">
                    <Brain size={14} className="text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-body text-foreground">
                        <span className="font-bold">{firstReasoning.step}:</span>{" "}
                        <span className="text-muted-foreground">{firstReasoning.insight}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/30">
                  {r.ai_decision_id && (
                    <Link
                      href={`/operator/ai/${r.ai_decision_id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline font-body"
                    >
                      Review decision <ArrowRight size={11} />
                    </Link>
                  )}
                  <button
                    onClick={() => dismiss(r)}
                    disabled={isFiring}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors font-body disabled:opacity-50"
                    title="Hide for the rest of this session"
                  >
                    <EyeOff size={11} />
                    Dismiss
                  </button>
                  <button
                    onClick={() => void approveAndFire(r)}
                    disabled={isFiring || !r.automation_rule_id}
                    className="inline-flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed"
                    title={r.automation_rule_id ? "Approve and execute via the canonical manual-fire path" : "Rule id missing — cannot fire"}
                  >
                    {isFiring ? (
                      <>
                        <RefreshCw size={11} className="animate-spin" />
                        Firing…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={11} />
                        Approve &amp; Fire
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      <div className="pt-4 border-t border-border/30 text-[11px] font-body text-muted-foreground">
        <AlertTriangle size={10} className="inline mr-1.5 -mt-0.5" />
        Approving via this page reuses the canonical manual-rule-execute endpoint.
        The original skipped row stays in the audit history for accountability.
      </div>
    </div>
  );
}
