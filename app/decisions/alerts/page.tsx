"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Zap, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Alert {
  id: string;
  type: "SPEND_EXCEEDED" | "ROAS_BELOW_THRESHOLD";
  severity: "warning" | "critical";
  platform: string;
  campaign_id: string;
  breached_value: number;
  threshold_value: number;
  status: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  SPEND_EXCEEDED: "Spend Exceeded",
  ROAS_BELOW_THRESHOLD: "ROAS Below Threshold",
};

const PLATFORM_COLORS: Record<string, string> = {
  meta: "bg-blue-100 text-blue-700",
  google: "bg-orange-100 text-orange-700",
  shopify: "bg-green-100 text-green-700",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsPage() {
  const { getToken } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiClient<{ alerts: Alert[] }>("/api/v1/alerts?limit=50", token);
        setAlerts(data.alerts ?? []);
      } catch {
        /* empty on error */
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [getToken]);

  const handleDismiss = async (alertId: string) => {
    const token = await getToken();
    if (!token) return;
    setDismissing(alertId);
    try {
      await apiClient(`/api/v1/alerts/${alertId}/dismiss`, token, { method: "PATCH" });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      /* ignore */
    } finally {
      setDismissing(null);
    }
  };

  const critical = alerts.filter((a) => a.severity === "critical");
  const warnings = alerts.filter((a) => a.severity === "warning");

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">System Monitoring</p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Alerts</h2>
        </div>
        <Link href="/decisions" className="text-sm font-bold text-primary hover:underline font-body">← Back to Decisions</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Active", value: String(alerts.length).padStart(2, "0"), valueColor: "text-foreground" },
          { label: "Critical", value: String(critical.length).padStart(2, "0"), valueColor: "text-red-600" },
          { label: "Warnings", value: String(warnings.length).padStart(2, "0"), valueColor: "text-orange-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-4 font-body">{s.label}</p>
            <span className={`text-3xl font-extrabold font-sans ${loading ? "animate-pulse text-muted-foreground" : s.valueColor}`}>
              {loading ? "…" : s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-muted-foreground py-8">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-body text-sm">Loading alerts…</span>
        </div>
      )}

      {/* No alerts */}
      {!loading && alerts.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-border">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
          <p className="font-bold text-foreground font-sans text-lg mb-1">No Active Alerts</p>
          <p className="text-muted-foreground font-body text-sm">Your campaigns are within normal threshold ranges.</p>
        </div>
      )}

      {/* Critical alerts */}
      {!loading && critical.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-[0.2em] font-black text-red-600 font-body">Critical Alerts</h4>
          {critical.map((a) => (
            <AlertRow key={a.id} alert={a} onDismiss={handleDismiss} dismissing={dismissing} />
          ))}
        </div>
      )}

      {/* Warning alerts */}
      {!loading && warnings.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-[0.2em] font-black text-orange-500 font-body">Warnings</h4>
          {warnings.map((a) => (
            <AlertRow key={a.id} alert={a} onDismiss={handleDismiss} dismissing={dismissing} />
          ))}
        </div>
      )}

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-2xl font-extrabold mb-4 text-foreground font-sans">Threshold Configuration</h3>
            <p className="text-foreground/70 leading-relaxed mb-6 max-w-lg font-body">
              Default thresholds: ROAS below <span className="font-bold text-foreground">1.5×</span> and daily spend above{" "}
              <span className="font-bold text-foreground">$10,000</span>. Custom threshold management is coming in a future release.
            </p>
          </div>
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-[#dbe1ff]/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute top-4 right-8"><Zap size={64} className="text-primary/10" /></div>
        </div>
        <div className="bg-foreground p-8 rounded-3xl text-white flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="text-[#62df7d] mb-4">
              <Zap size={28} />
            </div>
            <h4 className="text-xl font-bold mb-2 font-sans">Decision Engine</h4>
            <p className="text-sm text-white/60 font-body">Alerts are generated automatically after each sync and on-demand refresh.</p>
          </div>
          <Link href="/decisions" className="mt-8 text-sm font-extrabold tracking-widest uppercase flex items-center gap-2 hover:gap-4 transition-all text-white font-body">
            View Decisions <ArrowRight size={14} />
          </Link>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#007f36]/10 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  );
}

function AlertRow({
  alert,
  onDismiss,
  dismissing,
}: {
  alert: Alert;
  onDismiss: (id: string) => void;
  dismissing: string | null;
}) {
  const plat = PLATFORM_COLORS[alert.platform] ?? "bg-surface-container-low text-foreground";
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex items-center justify-between gap-4">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 ${
          alert.severity === "critical" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
        } font-body`}>
          {alert.severity}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-foreground font-body">{TYPE_LABELS[alert.type] ?? alert.type}</p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            Campaign <span className="font-bold">{alert.campaign_id}</span> ·{" "}
            <span className={`px-1.5 py-0.5 rounded font-bold ${plat}`}>{alert.platform}</span> ·{" "}
            {timeAgo(alert.created_at)}
          </p>
          <p className="text-xs text-muted-foreground font-body mt-1">
            Breached: <span className="font-bold text-foreground">{Number(alert.breached_value).toFixed(2)}</span>
            {" "}(threshold: {Number(alert.threshold_value).toFixed(2)})
          </p>
        </div>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        disabled={dismissing === alert.id}
        className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:bg-surface-container-low transition-colors disabled:opacity-50 font-body"
      >
        {dismissing === alert.id ? <Loader2 size={14} className="animate-spin" /> : "Dismiss"}
      </button>
    </div>
  );
}
