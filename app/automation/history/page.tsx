"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Bot, CheckCircle2, XCircle, SkipForward } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface HistoryRecord {
  id: string;
  decision: string;
  action_taken: string;
  trigger_condition: string;
  result: "success" | "failed" | "skipped";
  ai_explanation: string | null;
  confidence_score: number | null;
  executed_by: "manual" | "automation";
  created_at: string;
}

interface HistoryDetail extends HistoryRecord {
  data_used: Record<string, unknown>;
}

const RESULT_STYLE: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  failed:  "bg-[#ffdad6] text-error",
  skipped: "bg-surface-container-high text-muted-foreground",
};

const ResultIcon = ({ result }: { result: string }) => {
  if (result === "success") return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (result === "failed")  return <XCircle size={16} className="text-error" />;
  return <SkipForward size={16} className="text-muted-foreground" />;
};

export default function DecisionHistoryPage() {
  const { getToken } = useAuth();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiClient<{ history: HistoryRecord[] }>("/api/v1/history?limit=100", token);
        setHistory(data.history);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken]);

  const handleExpand = async (record: HistoryRecord) => {
    if (expanded === record.id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(record.id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await apiClient<HistoryDetail>(`/api/v1/history/${record.id}`, token);
      setDetail(data);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
          Automation
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Decision History</h2>
        <p className="text-muted-foreground mt-2 font-body">
          Every decision, action, trigger, and result — the system memory and explainability layer.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground py-20 justify-center">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-body text-sm">Loading history…</span>
        </div>
      ) : history.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground font-body text-sm">
          No decision history yet. Execute an action or run the intelligence engine to create records.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {["", "Decision", "Action Taken", "Trigger", "By", "Confidence", "Result", "Time"].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-body whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {history.map((record) => (
                  <>
                    <tr
                      key={record.id}
                      onClick={() => handleExpand(record)}
                      className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <ResultIcon result={record.result} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-foreground font-body line-clamp-1 max-w-[180px] block">{record.decision}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-muted-foreground font-body line-clamp-1 max-w-[180px] block">{record.action_taken}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-muted-foreground font-body line-clamp-1 max-w-[160px] block">{record.trigger_condition}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-body ${record.executed_by === "manual" ? "bg-surface-container-high text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                          {record.executed_by}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-foreground font-sans">
                          {record.confidence_score != null ? `${record.confidence_score}%` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-body ${RESULT_STYLE[record.result]}`}>
                          {record.result}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground font-body whitespace-nowrap">
                        {new Date(record.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>

                    {expanded === record.id && (
                      <tr key={`${record.id}-detail`} className="bg-surface-container-low/30">
                        <td colSpan={8} className="px-8 py-6">
                          {detailLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm font-body">
                              <Loader2 size={14} className="animate-spin" /> Loading details…
                            </div>
                          ) : detail ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* AI Explanation */}
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <Bot size={16} className="text-primary" />
                                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground font-body">AI Explanation</h4>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed font-body">
                                  {detail.ai_explanation ?? "No AI explanation recorded for this entry."}
                                </p>
                              </div>
                              {/* Data Used */}
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 font-body">Data Used</h4>
                                <div className="bg-white rounded-xl p-4 space-y-2">
                                  {Object.keys(detail.data_used).length === 0 ? (
                                    <p className="text-xs text-muted-foreground font-body">No data snapshot recorded.</p>
                                  ) : (
                                    Object.entries(detail.data_used).map(([k, v]) => (
                                      <div key={k} className="flex items-center justify-between py-1 border-b border-surface-container-low last:border-0">
                                        <span className="text-xs font-bold text-muted-foreground uppercase font-body">{k.replace(/_/g, " ")}</span>
                                        <span className="text-xs font-bold text-foreground font-sans">{String(v ?? "—")}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
