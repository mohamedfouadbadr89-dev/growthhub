"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Plus, ToggleLeft, ToggleRight, Trash2, Zap, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface ActionTemplate {
  id: string;
  platform: string;
  name: string;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  min_confidence_threshold: number;
  action_template_id: string;
  action_params: Record<string, unknown>;
  enabled: boolean;
  run_count: number;
  last_fired_at: string | null;
  created_at: string;
  actions_library?: { platform: string; name: string } | Array<{ platform: string; name: string }>;
}

const TRIGGER_TYPES = ["ROAS_DROP", "SPEND_SPIKE", "CONVERSION_DROP", "SCALING_OPPORTUNITY"] as const;

export default function AutomationRulesPage() {
  const { getToken } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<ActionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger_type: "ROAS_DROP" as string,
    min_confidence_threshold: 70,
    action_template_id: "",
    action_params: "{}",
    enabled: true,
  });

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getToken();
    if (!token) { setError("Your session expired — please sign in again"); setLoading(false); return; }
    try {
      const [rulesData, templatesData] = await Promise.all([
        apiClient<{ rules: AutomationRule[] }>("/api/v1/automation/rules", token),
        apiClient<{ actions: ActionTemplate[] }>("/api/v1/actions", token),
      ]);
      setRules(rulesData.rules ?? []);
      setTemplates(templatesData.actions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load automation rules");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (rule: AutomationRule) => {
    const token = await getToken();
    if (!token) return;
    try {
      const updated = await apiClient<AutomationRule>(`/api/v1/automation/rules/${rule.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, ...updated } : r)));
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    const token = await getToken();
    if (!token) return;
    try {
      await apiClient(`/api/v1/automation/rules/${id}`, token, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) return;
      let parsedParams: Record<string, unknown> = {};
      try { parsedParams = JSON.parse(form.action_params); } catch {}
      const newRule = await apiClient<AutomationRule>("/api/v1/automation/rules", token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          trigger_type: form.trigger_type,
          min_confidence_threshold: form.min_confidence_threshold,
          action_template_id: form.action_template_id,
          action_params: parsedParams,
          enabled: form.enabled,
        }),
      });
      setRules((prev) => [newRule, ...prev]);
      setShowForm(false);
      setForm({ name: "", trigger_type: "ROAS_DROP", min_confidence_threshold: 70, action_template_id: "", action_params: "{}", enabled: true });
    } catch {} finally {
      setSaving(false);
    }
  };

  const getActionLib = (rule: AutomationRule) => {
    const lib = rule.actions_library;
    return Array.isArray(lib) ? lib[0] : lib;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Execution Engine
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Automation Rules</h2>
          <p className="text-muted-foreground mt-2 font-body">
            Define IF→THEN playbooks. Rules fire automatically after each intelligence run.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-[#2563eb] text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity font-body"
        >
          <Plus size={16} /> New Rule
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border space-y-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground font-body">New Automation Rule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 font-body">Rule Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Pause on ROAS Drop"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-body bg-surface-container-low focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 font-body">Trigger Type <span className="text-red-500">*</span></label>
              <select
                value={form.trigger_type}
                onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-body bg-surface-container-low focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 font-body">
                Min Confidence Threshold: <span className="text-primary">{form.min_confidence_threshold}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.min_confidence_threshold}
                onChange={(e) => setForm((f) => ({ ...f, min_confidence_threshold: Number(e.target.value) }))}
                className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 font-body">Action Template <span className="text-red-500">*</span></label>
              <select
                value={form.action_template_id}
                onChange={(e) => setForm((f) => ({ ...f, action_template_id: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-body bg-surface-container-low focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              >
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1.5 font-body">
                Action Params (JSON) — use <code className="text-primary">"campaign_id": "auto"</code> to resolve from decision
              </label>
              <textarea
                value={form.action_params}
                onChange={(e) => setForm((f) => ({ ...f, action_params: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-mono bg-surface-container-low focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleCreate}
              disabled={saving || !form.name || !form.action_template_id}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-body"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create Rule"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-muted-foreground hover:text-foreground font-body transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-container-low rounded-2xl" />)}
        </div>
      ) : error ? (
        <div className="py-20 text-center space-y-4">
          <AlertCircle size={40} className="mx-auto text-red-300" />
          <p className="text-sm text-red-600 font-body">{error}</p>
          <button onClick={load} className="px-4 py-2 text-sm font-bold border border-border rounded-xl hover:bg-surface-container-low transition-colors font-body">Try Again</button>
        </div>
      ) : rules.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground font-body text-sm">
          No automation rules yet. Create one to start automating decisions.
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const lib = getActionLib(rule);
            return (
              <div key={rule.id} className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-bold text-foreground font-body">{rule.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-body ${rule.enabled ? "bg-emerald-100 text-emerald-700" : "bg-surface-container-high text-muted-foreground"}`}>
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-body">
                    IF <span className="font-bold text-foreground">{rule.trigger_type.replace(/_/g, " ")}</span>
                    {" "}AND confidence ≥ <span className="font-bold text-foreground">{rule.min_confidence_threshold}%</span>
                    {lib && <> THEN <span className="font-bold text-foreground">{lib.name}</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase font-body">Runs</p>
                    <p className="text-sm font-bold text-foreground font-sans">{rule.run_count}</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <button
                    onClick={() => handleToggle(rule)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={rule.enabled ? "Disable rule" : "Enable rule"}
                  >
                    {rule.enabled
                      ? <ToggleRight size={28} className="text-primary" />
                      : <ToggleLeft size={28} />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-muted-foreground hover:text-error transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
