"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface AutomationRun {
  id: string;
  org_id: string;
  automation_rule_id: string;
  decision_id: string | null;
  action_template_id: string;
  status: "pending" | "success" | "failed" | "skipped";
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  executed_at: string;
  automation_rules?: { name: string } | Array<{ name: string }>;
}

const STATUS_STYLE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed:  "bg-[#ffdad6] text-error",
  skipped: "bg-surface-container-high text-muted-foreground",
  pending: "bg-blue-100 text-blue-700",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "success") return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (status === "failed")  return <XCircle size={16} className="text-error" />;
  if (status === "pending") return <Clock size={16} className="text-blue-600" />;
  return <Clock size={16} className="text-muted-foreground" />;
};

export default function ExecutionLogsPage() {
  const { getToken } = useAuth();
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiClient<{ runs: AutomationRun[]; total: number }>("/api/v1/automation/runs?limit=100", token);
        setRuns(data.runs);
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken]);

  const getRuleName = (run: AutomationRun) => {
    const r = run.automation_rules;
    if (!r) return "—";
    return Array.isArray(r) ? (r[0]?.name ?? "—") : r.name;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Execution Engine
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Execution Logs</h2>
          <p className="text-muted-foreground mt-2 font-body">
            All automation rule runs — every action executed by the system.
          </p>
        </div>
        {!loading && (
          <span className="text-sm font-bold text-muted-foreground font-body">
            {total} total run{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground py-20 justify-center">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-body text-sm">Loading execution logs…</span>
        </div>
      ) : runs.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground font-body text-sm">
          No execution logs yet. Automation rules fire automatically after each intelligence run.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {["", "Rule", "Status", "Result Data", "Error", "Executed At"].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-5 py-4">
                      <StatusIcon status={run.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-foreground font-body">{getRuleName(run)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-body ${STATUS_STYLE[run.status]}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      {run.result_data && Object.keys(run.result_data).length > 0 ? (
                        <code className="text-xs font-mono text-muted-foreground line-clamp-1">
                          {JSON.stringify(run.result_data)}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground font-body">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      {run.error_message ? (
                        <span className="text-xs text-error font-body line-clamp-1">{run.error_message}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-body">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground font-body whitespace-nowrap">
                      {new Date(run.executed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
