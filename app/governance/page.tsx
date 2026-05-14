"use client";

// Continuation #121 (2026-05-14) — Phase δ Layer 8 (Governance Dashboard)
// per `specs/governance-dashboard.md`. Single-page operator view of
// governance health across the org. Reads `GET /api/v1/governance/summary`
// (additive aggregate endpoint added this phase) and renders 8 sections
// per the spec architecture.
//
// READ-ONLY. No mutations. No policy controls. No execution triggers.
//
// Reuses (via the summary aggregate):
//   - automation_rules, automation_runs, decision_history, ai_decisions
//   - actionRequiresApproval policy (server-computed `requires_approval`)
//   - LIVE flag matrix (env-driven, secrets-redacted)
//   - SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES snapshot (server-side
//     exported as data — single source of truth remains backend)

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  ShieldCheck, ShieldAlert, RefreshCw, AlertCircle, CheckCircle2, XCircle,
  SkipForward, Sparkles, TrendingUp, Activity, Brain, Users, Zap,
  Lock, Unlock, Gauge, Cpu, Eye,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

interface GovernanceSummary {
  generated_at: string;
  window: {
    runs_history_ai_window_days: number;
    rate_limit_window_hours: number;
  };
  rules: {
    total: number;
    enabled: number;
    disabled: number;
    requires_approval: number;
  };
  runs_last_7d: {
    total: number;
    by_status: { success: number; failed: number; skipped: number; pending: number };
    skipped_approval_required: number;
    trigger_auto_fire: number;
    trigger_manual_rule_fire: number;
    idempotent_replays: number;
  };
  audit_last_7d: {
    decision_history_rows: number;
    executed_by_manual: number;
    executed_by_automation: number;
  };
  ai_last_7d: {
    decisions: number;
    active: number;
    needs_review: number;
    avg_confidence: number | null;
    by_category: Array<{ category: string; count: number }>;
  };
  rate_limit: {
    max_per_minute: number;
    peak_observed_last_24h: number;
  };
  live_flags: {
    any_live_enabled: boolean;
    matrix: Array<{
      action_type: string;
      flag_env_var: string;
      is_live: boolean;
      allowlist_env_var: string | null;
      allowlist_configured: boolean;
    }>;
  };
  approval_policy: {
    protected_action_types: string[];
  };
  top_action_types: Array<{ action_type: string; count: number }>;
  top_trigger_types: Array<{ trigger_type: string; count: number }>;
}

// Inline bar — pure SVG-free bar, no chart lib. Shows N stacked segments with
// optional label per segment. `total` may be > sum(values) — surfaces
// "unaccounted" residual as muted color so the bar always renders full
// width and operators can spot data gaps.
function StackBar({
  segments,
  total,
  height = 12,
}: {
  segments: Array<{ value: number; color: string; label?: string }>;
  total: number;
  height?: number;
}) {
  const sum = segments.reduce((a, b) => a + b.value, 0);
  const denom = Math.max(total, sum, 1);
  return (
    <div
      className="w-full rounded-full overflow-hidden bg-surface-container-low flex"
      style={{ height }}
      role="img"
      aria-label="Distribution bar"
    >
      {segments.map((s, i) =>
        s.value > 0 ? (
          <div
            key={i}
            className={s.color}
            style={{ width: `${(s.value / denom) * 100}%` }}
            title={`${s.label ?? ""}: ${s.value}`}
          />
        ) : null,
      )}
    </div>
  );
}

export default function GovernanceDashboardPage() {
  const { getToken } = useAuth();

  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSummary() {
    setRefreshing(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const data = await apiClient<GovernanceSummary>("/api/v1/governance/summary", token);
      setSummary(data);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load governance summary"));
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
        const data = await apiClient<GovernanceSummary>("/api/v1/governance/summary", token);
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) setError(formatErrorMessage(err, "Failed to load governance summary"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 bg-surface-container-low rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface-container-low rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-surface-container-low rounded-2xl animate-pulse" />
        <div className="h-48 bg-surface-container-low rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold text-foreground font-sans">Governance</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body flex items-center gap-2">
          <AlertCircle size={16} />
          {error ?? "Summary unavailable"}
        </div>
      </div>
    );
  }

  const s = summary;
  const successRatePct = s.runs_last_7d.total === 0
    ? null
    : Math.round((s.runs_last_7d.by_status.success / s.runs_last_7d.total) * 100);
  const rateLimitUtilPct = Math.min(100, Math.round((s.rate_limit.peak_observed_last_24h / s.rate_limit.max_per_minute) * 100));
  const peakHigh = rateLimitUtilPct >= 80;
  const peakModerate = rateLimitUtilPct >= 50 && rateLimitUtilPct < 80;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body inline-flex items-center gap-1.5">
            <ShieldCheck size={11} /> Governance
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Org Health
          </h1>
          <p className="text-muted-foreground font-body mt-2 max-w-2xl">
            Read-only observability over the centralized governance architecture.
            Rules, runs, audit completeness, AI activity, rate-limit headroom, LIVE-flag posture,
            and approval-policy register — all derived from existing system state.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <span className="text-[11px] text-muted-foreground font-body">
            Snapshot · {new Date(s.generated_at).toLocaleString()}
          </span>
          <button
            onClick={() => void fetchSummary()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 bg-surface-container-high text-foreground px-4 py-2 rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-all font-body disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Section 1 — Governance Overview KPIs */}
      <section>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 font-body">
          Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-border/40">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Rules</span>
              <Cpu size={16} className="text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground font-sans leading-none">{s.rules.total}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-body">
              {s.rules.enabled} enabled · {s.rules.disabled} dormant
            </p>
            <div className="mt-3">
              <StackBar
                total={Math.max(s.rules.total, 1)}
                segments={[
                  { value: s.rules.enabled,  color: "bg-emerald-500",        label: "enabled" },
                  { value: s.rules.disabled, color: "bg-surface-container-high", label: "disabled" },
                ]}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-border/40">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Approval-required</span>
              <ShieldAlert size={16} className={s.rules.requires_approval > 0 ? "text-amber-600" : "text-muted-foreground"} />
            </div>
            <p className={`text-3xl font-black font-sans leading-none ${s.rules.requires_approval > 0 ? "text-amber-600" : "text-foreground"}`}>
              {s.rules.requires_approval}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-body">
              of {s.rules.total} {s.rules.total === 1 ? "rule" : "rules"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-border/40">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Runs (7d)</span>
              <Activity size={16} className="text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground font-sans leading-none">{s.runs_last_7d.total}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-body">
              {successRatePct === null ? "—" : `${successRatePct}% success rate`}
            </p>
          </div>

          <Link
            href="/automation/approvals"
            className={`block bg-white rounded-2xl p-5 transition-all border ${
              s.runs_last_7d.skipped_approval_required > 0
                ? "border-amber-300 ring-2 ring-amber-100 hover:shadow-md"
                : "border-border/40 hover:shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Pending Approvals</span>
              <ShieldAlert size={16} className={s.runs_last_7d.skipped_approval_required > 0 ? "text-amber-600" : "text-muted-foreground"} />
            </div>
            <p className={`text-3xl font-black font-sans leading-none ${s.runs_last_7d.skipped_approval_required > 0 ? "text-amber-600" : "text-foreground"}`}>
              {s.runs_last_7d.skipped_approval_required}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-body">
              {s.runs_last_7d.skipped_approval_required > 0 ? "blocked auto-fires · review →" : "no blocks in window"}
            </p>
          </Link>
        </div>
      </section>

      {/* Section 2 — Automation Health */}
      <section className="bg-white rounded-2xl border border-border/40 p-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body inline-flex items-center gap-1.5">
          <ShieldCheck size={11} /> Automation Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-body text-foreground">Run outcome distribution (7d)</span>
              <span className="text-[11px] font-body text-muted-foreground">{s.runs_last_7d.total} total</span>
            </div>
            <StackBar
              total={Math.max(s.runs_last_7d.total, 1)}
              segments={[
                { value: s.runs_last_7d.by_status.success, color: "bg-emerald-500", label: "success" },
                { value: s.runs_last_7d.by_status.failed,  color: "bg-red-500",     label: "failed" },
                { value: s.runs_last_7d.by_status.skipped, color: "bg-amber-500",   label: "skipped" },
                { value: s.runs_last_7d.by_status.pending, color: "bg-slate-400",   label: "pending" },
              ]}
              height={14}
            />
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-body">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Success {s.runs_last_7d.by_status.success}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed {s.runs_last_7d.by_status.failed}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Skipped {s.runs_last_7d.by_status.skipped}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Pending {s.runs_last_7d.by_status.pending}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-body text-foreground">Trigger source (7d)</span>
              <span className="text-[11px] font-body text-muted-foreground">
                {s.runs_last_7d.trigger_auto_fire + s.runs_last_7d.trigger_manual_rule_fire} attributed
              </span>
            </div>
            <StackBar
              total={Math.max(s.runs_last_7d.trigger_auto_fire + s.runs_last_7d.trigger_manual_rule_fire, 1)}
              segments={[
                { value: s.runs_last_7d.trigger_auto_fire,       color: "bg-violet-500", label: "auto-fire" },
                { value: s.runs_last_7d.trigger_manual_rule_fire, color: "bg-slate-600", label: "manual rule fire" },
              ]}
              height={14}
            />
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-body">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" /> Auto-fire {s.runs_last_7d.trigger_auto_fire}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" /> Manual rule fire {s.runs_last_7d.trigger_manual_rule_fire}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/30">
          <KpiTile label="Success" value={s.runs_last_7d.by_status.success} icon={<CheckCircle2 size={14} className="text-emerald-600" />} />
          <KpiTile label="Failed" value={s.runs_last_7d.by_status.failed} icon={<XCircle size={14} className="text-red-600" />} />
          <KpiTile label="Idempotent replays" value={s.runs_last_7d.idempotent_replays} icon={<RefreshCw size={14} className="text-slate-600" />} hint="Duplicates absorbed by execution_id" />
          <KpiTile label="Pending" value={s.runs_last_7d.by_status.pending} icon={<Sparkles size={14} className="text-slate-400" />} />
        </div>
      </section>

      {/* Section 3 — Approval Pressure */}
      <section className="bg-white rounded-2xl border border-border/40 p-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body inline-flex items-center gap-1.5">
          <ShieldAlert size={11} /> Approval Pressure
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <KpiTile
            label="Rules requiring approval"
            value={s.rules.requires_approval}
            icon={<ShieldAlert size={14} className="text-amber-600" />}
            valueClass={s.rules.requires_approval > 0 ? "text-amber-600" : ""}
          />
          <KpiTile
            label="Auto-fires blocked (7d)"
            value={s.runs_last_7d.skipped_approval_required}
            icon={<ShieldAlert size={14} className="text-amber-600" />}
            valueClass={s.runs_last_7d.skipped_approval_required > 0 ? "text-amber-600" : ""}
          />
          <Link href="/automation/approvals" className="bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100/60 transition-colors block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 font-body">Open queue</p>
            <p className="text-sm font-bold font-body text-amber-900 mt-1">
              Review pending approvals →
            </p>
          </Link>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body mb-2">
            Approval-policy register
          </p>
          <p className="text-[11px] text-muted-foreground font-body mb-3">
            The centralized <code className="text-foreground">actionRequiresApproval()</code> policy blocks the following
            action types from auto-firing. Operator must approve manually via the queue.
          </p>
          <div className="flex flex-wrap gap-2">
            {s.approval_policy.protected_action_types.length === 0 ? (
              <span className="text-[11px] font-body text-muted-foreground italic">No protected types registered.</span>
            ) : (
              s.approval_policy.protected_action_types.map((at) => (
                <span
                  key={at}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-50 text-amber-800 border border-amber-200"
                >
                  <ShieldAlert size={10} />
                  {at}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Section 4 — AI Decision Activity */}
      <section className="bg-white rounded-2xl border border-border/40 p-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body inline-flex items-center gap-1.5">
          <Brain size={11} /> AI Decision Activity (7d)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiTile label="Decisions" value={s.ai_last_7d.decisions} icon={<Brain size={14} className="text-primary" />} />
          <KpiTile label="Active" value={s.ai_last_7d.active} icon={<CheckCircle2 size={14} className="text-emerald-600" />} />
          <KpiTile label="Needs review" value={s.ai_last_7d.needs_review} icon={<ShieldAlert size={14} className="text-amber-600" />} valueClass={s.ai_last_7d.needs_review > 0 ? "text-amber-600" : ""} />
          <KpiTile
            label="Avg confidence"
            value={s.ai_last_7d.avg_confidence === null ? "—" : `${Math.round(s.ai_last_7d.avg_confidence * 100)}%`}
            icon={<Gauge size={14} className="text-primary" />}
          />
        </div>
        {s.ai_last_7d.by_category.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground font-body italic">No AI decisions in the last 7 days.</p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body mb-3">
              By category
            </p>
            <div className="space-y-2">
              {s.ai_last_7d.by_category.map((row) => {
                const pct = Math.round((row.count / s.ai_last_7d.decisions) * 100);
                return (
                  <div key={row.category} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-foreground font-body w-32 shrink-0 truncate">{row.category}</span>
                    <div className="flex-1">
                      <StackBar
                        total={s.ai_last_7d.decisions}
                        segments={[{ value: row.count, color: "bg-primary", label: row.category }]}
                        height={8}
                      />
                    </div>
                    <span className="text-[11px] font-body text-muted-foreground w-20 text-right shrink-0">
                      {row.count} · {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-5 pt-4 border-t border-border/30">
          <Link href="/operator/ai" className="text-[11px] font-bold text-primary hover:underline font-body">
            View AI Operator Center →
          </Link>
        </div>
      </section>

      {/* Section 5 — Execution Reliability / Audit Completeness */}
      <section className="bg-white rounded-2xl border border-border/40 p-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body inline-flex items-center gap-1.5">
          <Eye size={11} /> Audit Completeness (7d)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiTile label="decision_history rows" value={s.audit_last_7d.decision_history_rows} icon={<Activity size={14} className="text-primary" />} />
          <KpiTile label="Executed by automation" value={s.audit_last_7d.executed_by_automation} icon={<Cpu size={14} className="text-violet-600" />} />
          <KpiTile label="Executed by operator" value={s.audit_last_7d.executed_by_manual} icon={<Users size={14} className="text-slate-600" />} />
        </div>
        <p className="text-[11px] text-muted-foreground font-body mt-4 leading-relaxed">
          Every successful execution writes one immutable row to <code className="text-foreground">decision_history</code>{" "}
          via the canonical <code className="text-foreground">executeAction</code> single-writer.
          <Link href="/actions/logs" className="text-primary hover:underline font-bold ml-1">
            Inspect logs →
          </Link>
        </p>
      </section>

      {/* Section 6 — Rate-limit headroom */}
      <section className="bg-white rounded-2xl border border-border/40 p-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body inline-flex items-center gap-1.5">
          <Gauge size={11} /> Rate-limit Headroom (24h)
        </h2>
        <div className="flex items-end gap-6 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Peak observed</p>
            <p className={`text-4xl font-black font-sans leading-none ${peakHigh ? "text-amber-600" : peakModerate ? "text-primary" : "text-foreground"}`}>
              {s.rate_limit.peak_observed_last_24h}<span className="text-base text-muted-foreground"> /min</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Configured cap</p>
            <p className="text-2xl font-bold font-sans text-foreground leading-none">
              {s.rate_limit.max_per_minute}<span className="text-base text-muted-foreground"> /min</span>
            </p>
            <p className="text-[10px] text-muted-foreground font-body mt-1">via <code className="text-foreground">ACTION_EXECUTION_MAX_PER_MINUTE</code></p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">Utilization</p>
            <p className={`text-2xl font-bold font-sans leading-none ${peakHigh ? "text-amber-600" : "text-foreground"}`}>
              {rateLimitUtilPct}%
            </p>
          </div>
        </div>
        <div className="w-full bg-surface-container-low rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all ${peakHigh ? "bg-amber-500" : peakModerate ? "bg-primary" : "bg-emerald-500"}`}
            style={{ width: `${Math.max(2, rateLimitUtilPct)}%` }}
          />
        </div>
        {peakHigh && (
          <p className="text-[11px] font-body text-amber-700 mt-3 inline-flex items-start gap-1.5">
            <ShieldAlert size={11} className="mt-0.5" />
            Peak exceeded 80% of cap — consider raising <code className="text-foreground">ACTION_EXECUTION_MAX_PER_MINUTE</code> after reviewing downstream provider quotas.
          </p>
        )}
      </section>

      {/* Section 7 — LIVE-flag matrix */}
      <section className="bg-white rounded-2xl border border-border/40 p-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body inline-flex items-center gap-1.5">
          {s.live_flags.any_live_enabled ? <Unlock size={11} className="text-amber-600" /> : <Lock size={11} />} LIVE-flag Matrix
        </h2>
        <p className="text-[11px] text-muted-foreground font-body mb-4 leading-relaxed">
          Per-handler real-mode flags + allowlist configuration. Simulated mode is the safe default — no real provider calls.
          Secrets and tokens are NEVER serialized into this surface.
        </p>
        <div className="overflow-hidden rounded-xl border border-border/40">
          <table className="w-full text-sm font-body">
            <thead className="bg-surface-container-low text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest">Action</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest">Flag</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest">Mode</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest">Allowlist</th>
              </tr>
            </thead>
            <tbody>
              {s.live_flags.matrix.map((row) => (
                <tr key={row.action_type} className="border-t border-border/30">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-foreground">{row.action_type}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{row.flag_env_var}</td>
                  <td className="px-4 py-2.5">
                    {row.is_live ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                        <Unlock size={10} /> Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        <Lock size={10} /> Simulated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.allowlist_env_var === null ? (
                      <span className="text-[10px] text-muted-foreground">n/a</span>
                    ) : row.allowlist_configured ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 size={10} /> Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                        <SkipForward size={10} /> Empty / all-orgs
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 8 — Recent Governance Events / Top distributions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border/40 p-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body inline-flex items-center gap-1.5">
            <Zap size={11} /> Top action types (7d)
          </h2>
          {s.top_action_types.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body italic">No runs in the last 7 days.</p>
          ) : (
            <ul className="space-y-2">
              {s.top_action_types.map((row) => (
                <li key={row.action_type} className="flex items-center justify-between text-sm font-body">
                  <code className="text-foreground font-mono text-[11px]">{row.action_type}</code>
                  <span className="font-bold text-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-border/40 p-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body inline-flex items-center gap-1.5">
            <TrendingUp size={11} /> Top trigger types (rules)
          </h2>
          {s.top_trigger_types.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body italic">No rules defined.</p>
          ) : (
            <ul className="space-y-2">
              {s.top_trigger_types.map((row) => (
                <li key={row.trigger_type} className="flex items-center justify-between text-sm font-body">
                  <code className="text-foreground font-mono text-[11px]">{row.trigger_type}</code>
                  <span className="font-bold text-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Cross-links */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CrossLink href="/automation/history" label="History" subtitle="audit ledger" icon={<Activity size={14} />} />
        <CrossLink href="/automation/timeline" label="Timeline" subtitle="chronological events" icon={<TrendingUp size={14} />} />
        <CrossLink href="/automation/approvals" label="Approvals" subtitle="blocked queue" icon={<ShieldAlert size={14} />} />
        <CrossLink href="/operator/ai" label="AI Operator" subtitle="reasoning + lifecycle" icon={<Brain size={14} />} />
      </section>

      {/* Footer — read-only honesty */}
      <div className="pt-4 border-t border-border/30 text-[11px] font-body text-muted-foreground inline-flex items-start gap-1.5">
        <Eye size={10} className="mt-0.5" />
        <span>
          Read-only observability. This page surfaces governance state — it does not mutate policy,
          override approval gates, or change automation behavior. Configuration changes go through env vars
          and the canonical Create/Toggle/Fire endpoints under <code className="text-foreground">/automation/rules</code>.
        </span>
      </div>
    </div>
  );
}

// ─── Small components ────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  icon,
  hint,
  valueClass,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-surface-container-low rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-black font-sans leading-none ${valueClass ?? "text-foreground"}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1.5 font-body">{hint}</p>}
    </div>
  );
}

function CrossLink({
  href,
  label,
  subtitle,
  icon,
}: {
  href: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-border/40 rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest font-body">{label}</span>
      </div>
      <p className="text-xs text-foreground font-body">{subtitle} →</p>
    </Link>
  );
}
