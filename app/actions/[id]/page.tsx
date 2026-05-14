"use client";

// Continuation #116 (2026-05-14) — Phase α Layer 4 (Action Catalog FE Wiring)
// per `specs/action-catalog-fe.md`. Replaces the prior 445-line Stitch
// mock detail page ("Scale ROAS Outliers" mock-action with fabricated
// platform targets, scope items, simulation, exec steps) with a real
// catalog-detail + parameter_schema-derived execute form wired to the
// canonical execution pipeline.
//
// Reuses:
//   - GET /api/v1/actions/:id              (template detail)
//   - POST /api/v1/actions/:id/execute     (canonical executor pipeline:
//                                            idempotency, rate limit,
//                                            LIVE flag gate, audit write)
//   - actions_library.parameter_schema     (form derivation; existing shape
//                                            { fields: [{name, type, required, label}] })
//   - crypto.randomUUID()                  (client-side execution_id mint)
//   - decision_history.id                  (returned by executor — operator
//                                            click-through to /actions/logs)
//   - canonical envelope error.code        (formatErrorMessage on failure)
//
// NO backend modification. NO schema change. Backend remains the single
// authority on idempotency, rate limit, audit, and LIVE flag gating.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowLeft, Zap, ShieldAlert, AlertCircle, CheckCircle2, XCircle,
  SkipForward, RefreshCw, Copy, Info,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

// Mirror of `automation-engine.ts:80-93`. See note in `app/actions/page.tsx`
// — single source of truth lives backend-side; this is display-only.
const APPROVAL_REQUIRED_TYPES = new Set<string>([
  "meta.increase_budget",
  "meta.create_campaign",
  "google.create_campaign",
]);

interface ApiActionTemplate {
  id: string;
  platform: string;
  action_type: string;
  name: string;
  description: string | null;
  parameter_schema: ParameterSchema | null;
  created_at: string;
}

interface ParameterSchemaField {
  name: string;
  type: "string" | "number" | "boolean" | string;
  required?: boolean;
  label?: string;
  description?: string;
}

interface ParameterSchema {
  fields?: ParameterSchemaField[];
  // Tolerant of additional keys (forward-compatible).
}

interface ExecuteResult {
  history_id: string;
  result: "success" | "failed" | "skipped";
  result_data: Record<string, unknown> | null;
  idempotent_replay?: true;
}

function platformDotColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case "meta":    return "#0668E1";
    case "google":  return "#4285F4";
    case "shopify": return "#5E8E3E";
    default:        return "#3d618c";
  }
}

// Defensive parameter_schema field extraction. The catalog migration
// (20260503130000) seeds the shape `{ fields: [...] }`; future templates
// could add new keys, so we tolerate missing/non-array gracefully.
function extractFields(schema: ParameterSchema | null | undefined): ParameterSchemaField[] {
  if (!schema || typeof schema !== "object") return [];
  const fields = (schema as ParameterSchema).fields;
  return Array.isArray(fields) ? fields : [];
}

export default function ActionDetailPage({ params }: { params: { id: string } }) {
  const { getToken } = useAuth();
  const actionId = params.id;

  const [template, setTemplate] = useState<ApiActionTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state — keyed by parameter name. Initialized empty; backend
  // re-validates required fields and rejects with code='MISSING_PARAMETER'.
  const [formValues, setFormValues] = useState<Record<string, string | number | boolean>>({});

  // Execution_id is minted client-side for idempotency. Generated on first
  // execute (lazy) — avoids SSR hydration mismatch (different UUIDs on
  // server vs client) and avoids the react-hooks/set-state-in-effect
  // lint rule. Once minted, the SAME id persists across error retries so
  // a duplicate submit replays the prior result instead of creating a
  // duplicate side effect. The regenerate button mints a fresh id.
  const [executionId, setExecutionId] = useState<string>("");
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const token = await getToken();
        if (!token) throw new ApiError(401, "Sign in required");
        const data = await apiClient<ApiActionTemplate>(
          `/api/v1/actions/${actionId}`,
          token,
        );
        if (!cancelled) setTemplate(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(formatErrorMessage(err, "Failed to load action template"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken, actionId]);

  const fields = useMemo(
    () => extractFields(template?.parameter_schema),
    [template?.parameter_schema],
  );
  const requiresApproval = template
    ? APPROVAL_REQUIRED_TYPES.has(template.action_type)
    : false;

  function updateField(name: string, type: string, raw: string | boolean) {
    setFormValues((prev) => {
      const next = { ...prev };
      if (type === "number") {
        // Preserve raw string while typing so partial inputs (e.g., "1.") don't snap.
        if (typeof raw !== "string" || raw === "") {
          delete next[name];
        } else {
          const n = Number(raw);
          if (Number.isFinite(n)) next[name] = n;
          else delete next[name];
        }
      } else if (type === "boolean") {
        next[name] = Boolean(raw);
      } else {
        if (typeof raw !== "string" || raw === "") {
          delete next[name];
        } else {
          next[name] = raw;
        }
      }
      return next;
    });
  }

  async function handleExecute(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;
    setExecuting(true);
    setExecuteError(null);
    setExecuteResult(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      // Client-side check for missing required fields — gives a fast
      // diagnostic before the round-trip. Backend re-validates against
      // the canonical parameter_schema (`action-executor.ts`) and would
      // reject with MISSING_PARAMETER; this duplication is purely UX.
      const missing = fields
        .filter((f) => f.required && (formValues[f.name] === undefined || formValues[f.name] === ""))
        .map((f) => f.label || f.name);
      if (missing.length > 0) {
        throw new ApiError(400, `Missing required ${missing.length === 1 ? "field" : "fields"}: ${missing.join(", ")}`);
      }

      // Lazy-mint the execution_id on first submit. Subsequent submits
      // reuse the same id (idempotent replay path). Regenerate button
      // resets to "" to force a new id on next submit.
      const idToUse = executionId === "" ? crypto.randomUUID() : executionId;
      if (idToUse !== executionId) setExecutionId(idToUse);

      const result = await apiClient<ExecuteResult>(
        `/api/v1/actions/${template.id}/execute`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            params: formValues,
            execution_id: idToUse,
          }),
        },
      );
      setExecuteResult(result);
    } catch (err) {
      setExecuteError(formatErrorMessage(err, "Execution failed"));
    } finally {
      setExecuting(false);
    }
  }

  function regenerateExecutionId() {
    // Reset to empty — the next submit lazy-mints a fresh UUID.
    setExecutionId("");
    setExecuteResult(null);
    setExecuteError(null);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-container-low rounded animate-pulse" />
        <div className="h-32 bg-surface-container-low rounded-2xl animate-pulse" />
        <div className="h-64 bg-surface-container-low rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (loadError || !template) {
    return (
      <div className="space-y-6">
        <Link href="/actions" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline font-body">
          <ArrowLeft size={14} /> Back to Action Library
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-body flex items-center gap-2">
          <AlertCircle size={16} />
          {loadError ?? "Action template not found"}
        </div>
      </div>
    );
  }

  const dotColor = platformDotColor(template.platform);

  return (
    <div className="space-y-8 pb-12">
      {/* Back link */}
      <Link
        href="/actions"
        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline font-body"
      >
        <ArrowLeft size={14} /> Back to Action Library
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: dotColor }}
              aria-label={`Platform ${template.platform}`}
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-body">
              {template.platform}
            </span>
            {requiresApproval && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 font-body"
                title="Auto-fire blocked by centralized approval policy. Manual fire here is an implicit operator approval."
              >
                <ShieldAlert size={10} />
                Approval-Required
              </span>
            )}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-sans leading-none mb-2">
            {template.name}
          </h1>
          <code className="text-xs text-muted-foreground font-mono break-all">
            {template.action_type}
          </code>
        </div>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-foreground font-body text-base leading-relaxed max-w-3xl">
          {template.description}
        </p>
      )}

      {/* Approval notice (informational) */}
      {requiresApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 max-w-3xl">
          <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-bold text-amber-800 mb-1">Approval-required action</p>
            <p className="text-amber-700">
              Automation rules pointing at this template will not auto-fire on AI-decision streams.
              Manual execution from this page is treated as implicit operator approval and runs
              through the canonical executor pipeline (idempotency, rate limit, audit trail preserved).
            </p>
          </div>
        </div>
      )}

      {/* Execute form */}
      <form
        onSubmit={handleExecute}
        className="bg-white border border-border/40 rounded-2xl p-6 max-w-3xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-sans font-bold text-foreground text-xl">Manual Execute</h2>
          <span className="text-[10px] font-body text-muted-foreground uppercase tracking-widest font-bold">
            Phase 4 · canonical executor
          </span>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body italic">
            This template defines no parameters.
          </p>
        ) : (
          <div className="space-y-4">
            {fields.map((f) => {
              const label = f.label || f.name;
              const required = f.required === true;
              const value = formValues[f.name];
              if (f.type === "boolean") {
                return (
                  <label key={f.name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => updateField(f.name, "boolean", e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-body text-foreground">
                      {label}
                      {required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  </label>
                );
              }
              return (
                <div key={f.name} className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-body">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                    <code className="ml-2 text-muted-foreground font-mono normal-case font-normal">
                      {f.name} · {f.type}
                    </code>
                  </label>
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    step={f.type === "number" ? "any" : undefined}
                    value={value === undefined ? "" : String(value)}
                    onChange={(e) => updateField(f.name, f.type, e.target.value)}
                    placeholder={f.description ?? ""}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
                    required={required}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Idempotency key (advanced — collapsed by default to reduce noise) */}
        <details className="text-xs font-body">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <Info size={11} />
            Idempotency key
          </summary>
          <div className="mt-2 pl-5 space-y-2">
            <p className="text-muted-foreground leading-relaxed">
              A unique <code className="text-foreground">execution_id</code> is minted client-side
              on first execute. Re-submitting (or hitting the same id from another tool) returns
              the original result instead of producing a duplicate side effect.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1 bg-surface-container-low rounded text-[10px] font-mono break-all text-foreground">
                {executionId === "" ? "auto-generated on execute" : executionId}
              </code>
              <button
                type="button"
                disabled={executionId === ""}
                onClick={() => {
                  if (executionId) navigator.clipboard?.writeText(executionId).catch(() => undefined);
                }}
                className="p-1.5 hover:bg-surface-container-low rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Copy execution_id"
              >
                <Copy size={11} className="text-muted-foreground" />
              </button>
              <button
                type="button"
                disabled={executionId === ""}
                onClick={regenerateExecutionId}
                className="p-1.5 hover:bg-surface-container-low rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Discard the current id — next execute will mint a fresh one"
              >
                <RefreshCw size={11} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </details>

        {executeError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-body flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{executeError}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
          <button
            type="submit"
            disabled={executing}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-primary/90 transition-all font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={12} />
            {executing ? "Executing…" : "Execute"}
          </button>
        </div>
      </form>

      {/* Result panel */}
      {executeResult && (
        <div
          className={`rounded-2xl p-6 max-w-3xl border ${
            executeResult.result === "success"
              ? "bg-emerald-50 border-emerald-200"
              : executeResult.result === "failed"
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {executeResult.result === "success" ? (
              <CheckCircle2 size={22} className="text-emerald-600" />
            ) : executeResult.result === "failed" ? (
              <XCircle size={22} className="text-red-600" />
            ) : (
              <SkipForward size={22} className="text-amber-600" />
            )}
            <h3 className="font-sans font-bold text-foreground text-lg">
              Execution {executeResult.result}
            </h3>
            {executeResult.idempotent_replay && (
              <span
                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 font-body"
                title="This execution_id matched an existing row — the original result was returned. No duplicate side effect."
              >
                <RefreshCw size={10} />
                Idempotent replay
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs font-body">
            <div className="flex gap-2">
              <span className="text-muted-foreground font-bold w-32 shrink-0">decision_history</span>
              <code className="text-foreground font-mono break-all">{executeResult.history_id}</code>
            </div>
            {executeResult.result_data && Object.entries(executeResult.result_data)
              .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
              .slice(0, 8)
              .map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground font-bold w-32 shrink-0">{k}</span>
                  <code className="text-foreground font-mono break-all">{String(v)}</code>
                </div>
              ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-3">
            <Link
              href="/actions/logs"
              className="text-xs font-bold text-primary hover:underline font-body"
            >
              View in execution log →
            </Link>
            <button
              type="button"
              onClick={regenerateExecutionId}
              className="text-xs font-bold text-muted-foreground hover:text-foreground font-body"
              title="Mint a fresh execution_id and clear the result panel"
            >
              Run another →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
