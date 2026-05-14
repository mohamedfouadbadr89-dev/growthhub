"use client";

// Continuation #54 — approval queue FE consumer.
// Wires the #50/#51 BE chain to operator-facing UI:
//   - GET  /api/v1/approvals?state=pending  (#50 list)
//   - POST /api/v1/approvals/:id/approve    (#50 approve → dispatch)
//   - POST /api/v1/approvals/:id/reject     (#50 reject + optional note)
//
// Authorized under the operator's broad autonomous-continuation grant
// (operator-facing functionality + approval workflow UX priorities).
// Sits at /automation/approvals as a sibling to /automation/history
// (already-wired surface), inheriting /app/automation/layout.tsx.
//
// NOT TOUCHED:
//   - /app/dashboard/automation/decision-center/page.tsx — operator-
//     authored Stitch mock with different UX paradigm (streams/feed/
//     clusters); preserving operator design choice.
//   - The 4 HARD-LOCK Phase 6 shells (NEXT ACTION line 344) — not
//     touched.
//   - Existing /app/automation/page.tsx redirect (preserved verbatim).

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Sparkles,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Loader2,
  Inbox,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

// Shape mirrors backend SELECT at routes/v1/approvals.ts:78–86 (#50 list
// handler). Nested JOINs from approval_queue → ai_decisions + actions_library
// (FK to actions_library nullable; null when notification-only approval
// per #51 enqueue rule's default action_template_id=NULL).
interface ApprovalListEntry {
  id: string;
  ai_decision_id: string;
  action_template_id: string | null;
  action_params: Record<string, unknown>;
  state: "pending" | "approved" | "rejected" | "expired" | "executed";
  operator_note: string | null;
  operator_user_id: string | null;
  created_at: string;
  updated_at: string;
  ai_decisions: {
    category: string | null;
    confidence_score: number | null;
    reasoning_steps: Array<{ step: string; insight: string }> | null;
  } | null;
  actions_library: {
    name: string;
    platform: string;
    action_type: string;
  } | null;
}

interface ApprovalListResponse {
  approvals: ApprovalListEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface ApproveResponse {
  id: string;
  new_state: "approved" | "executed";
  history_id?: string;
}

interface RejectResponse {
  id: string;
  new_state: "rejected";
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApprovalsPage() {
  const { getToken } = useAuth();

  const [entries, setEntries] = useState<ApprovalListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Per-row in-flight state — keyed by approval id so multiple rows can
  // be acted on concurrently without UI confusion. Value is the action
  // ("approve"|"reject") currently in flight for that row.
  const [inFlight, setInFlight] = useState<Record<string, "approve" | "reject">>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});

  // Per-row expand for the reject-with-note flow.
  const [rejectExpanded, setRejectExpanded] = useState<Record<string, boolean>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  // Per-row expand for the reasoning_steps section (collapsed by default
  // when array length > 2, expanded inline otherwise).
  const [reasoningExpanded, setReasoningExpanded] = useState<Record<string, boolean>>({});

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const data = await apiClient<ApprovalListResponse>(
        "/api/v1/approvals?state=pending&limit=50",
        token,
      );
      setEntries(data.approvals ?? []);
    } catch (err) {
      setLoadError(formatErrorMessage(err, "Failed to load approvals"));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  function clearRowError(id: string) {
    setRowError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleApprove(id: string) {
    if (inFlight[id]) return;
    clearRowError(id);
    setInFlight((prev) => ({ ...prev, [id]: "approve" }));
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const result = await apiClient<ApproveResponse>(
        `/api/v1/approvals/${id}/approve`,
        token,
        { method: "POST" },
      );
      // Optimistic removal from the pending list; the next fetch will
      // confirm. On dispatch failure the BE leaves state='approved'
      // (per dispatcher #50) — caller still sees row gone from
      // ?state=pending list, which is correct.
      setEntries((prev) => prev.filter((e) => e.id !== id));
      // Soft signal in console for operator debugging — execution rows
      // also appear in /automation/history once decision_history writes
      // complete via executeAction.
      // eslint-disable-next-line no-console
      console.log(
        `[approvals] approved ${id} → new_state=${result.new_state}` +
          (result.history_id ? ` history_id=${result.history_id}` : ""),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Race: someone else (or operator) already acted on this row.
        // Refresh to reflect current truth.
        setRowError((prev) => ({
          ...prev,
          [id]: "Already actioned by another operator — refreshing.",
        }));
        await fetchApprovals();
      } else {
        setRowError((prev) => ({
          ...prev,
          [id]: formatErrorMessage(err, "Approve failed"),
        }));
      }
    } finally {
      setInFlight((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function handleReject(id: string) {
    if (inFlight[id]) return;
    clearRowError(id);
    const note = (rejectNotes[id] ?? "").trim();
    setInFlight((prev) => ({ ...prev, [id]: "reject" }));
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const body = note.length > 0 ? JSON.stringify({ note }) : undefined;
      const result = await apiClient<RejectResponse>(
        `/api/v1/approvals/${id}/reject`,
        token,
        {
          method: "POST",
          ...(body ? { body } : {}),
        },
      );
      setEntries((prev) => prev.filter((e) => e.id !== id));
      // eslint-disable-next-line no-console
      console.log(`[approvals] rejected ${id} → new_state=${result.new_state}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setRowError((prev) => ({
          ...prev,
          [id]: "Already actioned by another operator — refreshing.",
        }));
        await fetchApprovals();
      } else {
        setRowError((prev) => ({
          ...prev,
          [id]: formatErrorMessage(err, "Reject failed"),
        }));
      }
    } finally {
      setInFlight((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Automation
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-1">
            Approval Queue
          </h1>
          <p className="text-muted-foreground font-body">
            AI suggestions awaiting operator approval before dispatch
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-surface-container-high text-foreground px-6 py-2.5 rounded-full font-bold text-sm hover:bg-surface-container-highest transition-all font-body self-start md:self-auto disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Load error */}
      {loadError && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-body rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-surface-container-low rounded-2xl p-6 animate-pulse h-32"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadError && entries.length === 0 && (
        <div className="bg-surface-container-low rounded-2xl p-16 text-center space-y-3">
          <Inbox size={36} className="mx-auto text-muted-foreground" />
          <h3 className="text-lg font-bold text-foreground font-sans">
            No pending approvals
          </h3>
          <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
            AI decisions matching the operator-configured approval policy will
            appear here for review. Set <span className="font-mono">APPROVAL_REQUIRED_CATEGORIES</span> in backend env to activate the enqueue rule.
          </p>
        </div>
      )}

      {/* Approval list */}
      {!loading && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => {
            const action = inFlight[entry.id];
            const isExpanded = !!reasoningExpanded[entry.id];
            const isRejectOpen = !!rejectExpanded[entry.id];
            const err = rowError[entry.id];
            const category = entry.ai_decisions?.category ?? null;
            const confidenceRaw = entry.ai_decisions?.confidence_score ?? null;
            const confidence = confidenceRaw !== null ? Math.round(confidenceRaw * 100) : null;
            const reasoning = entry.ai_decisions?.reasoning_steps ?? [];
            const visibleReasoning = isExpanded ? reasoning : reasoning.slice(0, 2);

            return (
              <div
                key={entry.id}
                className="bg-white border border-border rounded-2xl p-6 space-y-4 shadow-sm"
              >
                {/* Top row: signal chips + timestamp */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {category && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-body bg-primary/10 text-primary">
                        <Lightbulb size={11} />
                        {category}
                      </span>
                    )}
                    {confidence !== null && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-body bg-emerald-50 text-emerald-700">
                        <CheckCircle2 size={11} />
                        {confidence}% confidence
                      </span>
                    )}
                    {entry.actions_library && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-body bg-surface-container-high text-foreground">
                        <Sparkles size={11} />
                        {entry.actions_library.name}
                        <span className="text-muted-foreground font-semibold">
                          · {entry.actions_library.platform}
                        </span>
                      </span>
                    )}
                    {!entry.action_template_id && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-body bg-amber-50 text-amber-700 uppercase tracking-wider">
                        Notification-only
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-body shrink-0">
                    <Clock size={12} />
                    {formatTimestamp(entry.created_at)}
                  </div>
                </div>

                {/* Reasoning steps (collapsible when > 2) */}
                {reasoning.length > 0 && (
                  <div className="bg-surface-container-low rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 font-body">
                      AI Reasoning
                    </p>
                    <ol className="space-y-2 text-sm text-foreground leading-relaxed font-body">
                      {visibleReasoning.map((rs, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary font-bold shrink-0">
                            {i + 1}.
                          </span>
                          <span>
                            <span className="font-semibold">{rs.step}:</span>{" "}
                            {rs.insight}
                          </span>
                        </li>
                      ))}
                    </ol>
                    {reasoning.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setReasoningExpanded((prev) => ({
                            ...prev,
                            [entry.id]: !prev[entry.id],
                          }))
                        }
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline font-body"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={12} /> Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown size={12} /> Show {reasoning.length - 2} more step
                            {reasoning.length - 2 === 1 ? "" : "s"}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Action params preview (only when present) */}
                {entry.action_params &&
                  Object.keys(entry.action_params).length > 0 && (
                    <div className="bg-surface-container-low rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 font-body">
                        Action Parameters
                      </p>
                      <pre className="text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(entry.action_params, null, 2)}
                      </pre>
                    </div>
                  )}

                {/* Row-level error (per-row, post-click) */}
                {err && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-body rounded-lg px-3 py-2 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                )}

                {/* Reject note (when expanded) */}
                {isRejectOpen && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                      Reason (optional)
                    </label>
                    <textarea
                      value={rejectNotes[entry.id] ?? ""}
                      onChange={(e) =>
                        setRejectNotes((prev) => ({
                          ...prev,
                          [entry.id]: e.target.value,
                        }))
                      }
                      maxLength={1000}
                      rows={2}
                      placeholder="Why is this being rejected? (Optional; 1000 char max.)"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-container-low text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-body"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleApprove(entry.id)}
                    disabled={!!action}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-body"
                  >
                    {action === "approve" ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Approving…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Approve
                      </>
                    )}
                  </button>

                  {!isRejectOpen ? (
                    <button
                      onClick={() =>
                        setRejectExpanded((prev) => ({
                          ...prev,
                          [entry.id]: true,
                        }))
                      }
                      disabled={!!action}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60 font-body"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleReject(entry.id)}
                        disabled={!!action}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-body"
                      >
                        {action === "reject" ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Rejecting…
                          </>
                        ) : (
                          <>
                            <XCircle size={14} />
                            Confirm reject
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setRejectExpanded((prev) => {
                            const next = { ...prev };
                            delete next[entry.id];
                            return next;
                          });
                          setRejectNotes((prev) => {
                            const next = { ...prev };
                            delete next[entry.id];
                            return next;
                          });
                        }}
                        disabled={!!action}
                        className="inline-flex items-center px-4 py-2 rounded-xl text-muted-foreground text-sm font-medium hover:bg-surface-container-low transition-colors disabled:opacity-60 font-body"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                    {entry.id.slice(0, 8)}…
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
