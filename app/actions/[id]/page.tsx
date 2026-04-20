"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, PlayCircle, Loader2, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";

interface ActionTemplate {
  id: string;
  platform: string;
  action_type: string;
  name: string;
  description: string;
  parameter_schema: { fields: Array<{ name: string; type: string; required: boolean; label: string }> };
  created_at: string;
}

interface ExecuteResult {
  history_id: string;
  result: "success" | "failed";
  result_data: Record<string, unknown>;
}

const PLATFORM_LABEL: Record<string, string> = {
  meta:   "Meta Ads",
  google: "Google Ads",
  shopify:"Shopify",
};

export default function ActionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [template, setTemplate] = useState<ActionTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [params, setParams] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiClient<ActionTemplate>(`/api/v1/actions/${id}`, token);
        setTemplate(data);
        const initial: Record<string, string> = {};
        for (const f of data.parameter_schema?.fields ?? []) {
          initial[f.name] = "";
        }
        setParams(initial);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id, getToken]);

  const handleExecute = async () => {
    if (!template) return;
    setExecuting(true);
    setExecResult(null);
    setExecError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const result = await apiClient<ExecuteResult>(`/api/v1/actions/${id}/execute`, token, {
        method: "POST",
        body: JSON.stringify({ params }),
      });
      setExecResult(result);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err as Error).message ?? "Execution failed";
      setExecError(msg);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground py-20 justify-center">
        <Loader2 size={20} className="animate-spin" />
        <span className="font-body text-sm">Loading action…</span>
      </div>
    );
  }

  if (notFound || !template) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-muted-foreground font-body">Action not found.</p>
        <Link href="/actions" className="text-primary font-bold text-sm font-body hover:underline">← Back to Actions Library</Link>
      </div>
    );
  }

  const fields = template.parameter_schema?.fields ?? [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/actions" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm font-medium">
            <ArrowLeft size={18} /> Back to Actions
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground font-sans">{template.name}</h1>
              <p className="text-xs text-muted-foreground font-body">{PLATFORM_LABEL[template.platform] ?? template.platform} · {template.action_type.replace(/_/g, " ")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left — description + parameters */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Description */}
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 font-body">About this action</h2>
            <p className="text-base text-foreground leading-relaxed font-body">{template.description}</p>
          </section>

          {/* Parameters form */}
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 font-body">Parameters</h2>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body">No parameters required.</p>
            ) : (
              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-bold text-foreground mb-1.5 font-body">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      value={params[field.name] ?? ""}
                      onChange={(e) => setParams((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-body bg-surface-container-low focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Result / Error */}
          {execResult && (
            <div className={`rounded-2xl p-6 flex items-start gap-4 ${execResult.result === "success" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              {execResult.result === "success"
                ? <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                : <AlertTriangle size={22} className="text-red-500 shrink-0 mt-0.5" />
              }
              <div>
                <p className={`font-bold font-body text-sm ${execResult.result === "success" ? "text-emerald-700" : "text-red-700"}`}>
                  {execResult.result === "success" ? "Action executed successfully" : "Execution failed"}
                </p>
                <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(execResult.result_data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {execError && (
            <div className="rounded-2xl p-6 flex items-start gap-4 bg-red-50 border border-red-200">
              <AlertTriangle size={22} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold font-body text-sm text-red-700">Error</p>
                <p className="mt-1 text-xs font-body text-red-600">{execError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right — execute */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <section className="bg-foreground text-white rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/50 mb-2 font-body">Manual Execution</h2>
              <p className="text-xs text-white/60 font-body leading-relaxed">
                Fill in the parameters on the left, then click Execute to run this action immediately. The result will be logged to Decision History.
              </p>
            </div>
            <button
              onClick={handleExecute}
              disabled={executing}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-br from-primary to-[#2563eb] text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-body"
            >
              {executing
                ? <><Loader2 size={18} className="animate-spin" /> Executing…</>
                : <><PlayCircle size={18} /> Execute Now</>
              }
            </button>
            {execResult && (
              <Link href="/automation/history" className="block text-center text-xs text-white/60 hover:text-white font-body transition-colors">
                View in Decision History →
              </Link>
            )}
          </section>

          {/* Schema summary */}
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 font-body">API Mapping</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground font-body">Platform</span>
                <span className="text-xs font-bold text-foreground font-body">{PLATFORM_LABEL[template.platform] ?? template.platform}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground font-body">Action Type</span>
                <span className="text-xs font-bold text-foreground font-body">{template.action_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground font-body">Parameters</span>
                <span className="text-xs font-bold text-foreground font-body">{fields.length} fields</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
