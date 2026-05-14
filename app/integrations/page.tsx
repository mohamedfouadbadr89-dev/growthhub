"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";
import {
  Globe,
  MousePointerClick,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Integration {
  id: string;
  platform: "meta" | "google" | "shopify";
  status: "connected" | "disconnected" | "error";
  lastSyncedAt: string | null;
  createdAt: string;
}

// Continuation #44 (2026-05-12) — sync_logs runtime surface. Backend
// `GET /api/v1/integrations/:id/sync-logs` returns `sync_logs` rows
// (integrations.ts:112-145) mapped to camelCase via the route's response
// transformer. Adding execution visibility on per-integration sync
// history closes a Phase 2 operator-cockpit gap (priority items #1 + #4 —
// operator-facing workflow completion + execution visibility). No schema
// change; lazy-loaded on first expand; cached per integration session.
interface SyncLog {
  id: string;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  recordsWritten: number | null;
  errorMessage: string | null;
}

const PLATFORM_META = {
  meta: {
    Icon: Globe,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    label: "Meta Ads",
    desc: "Automate ad spend optimizations and creative rotations across Facebook and Instagram.",
    tags: ["Campaigns", "Creatives"],
  },
  google: {
    Icon: MousePointerClick,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    label: "Google Ads",
    desc: "Execution for Search, Display, and Video campaigns based on real-time ROI.",
    tags: ["Campaigns", "Keywords"],
  },
  shopify: {
    Icon: ShoppingBag,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    label: "Shopify",
    desc: "Pull first-party order data to fuel precision AI optimization algorithms.",
    tags: ["Orders", "Customers"],
  },
} as const;

const PLATFORMS: Array<keyof typeof PLATFORM_META> = ["meta", "google", "shopify"];

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IntegrationsPage() {
  const { getToken } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Continuation #94 (2026-05-12) — data-freshness indicator extended to
  // the integrations page (fifth volatility-sensitive cockpit surface
  // after #90/#91/#92/#93). Sync state changes asynchronously when
  // Inngest background jobs complete; freshness signal helps operators
  // judge whether a recently-queued sync has run yet.
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  function relUpdated(): string {
    if (lastUpdatedAt === null) return "—";
    const ms = nowTick - lastUpdatedAt;
    if (ms < 60_000) return "just now";
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // Continuation #44 — sync-history lazy-load state.
  const [historyOpen,    setHistoryOpen]    = useState<Set<string>>(new Set());
  const [historyData,    setHistoryData]    = useState<Record<string, SyncLog[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Set<string>>(new Set());
  const [historyError,   setHistoryError]   = useState<Record<string, string>>({});

  // Continuation #64 (2026-05-12) — `force` parameter added so post-sync
  // refresh from handleSync can bypass the cache-hit early return; default
  // behavior (lazy first-load) preserved when no force flag passed.
  async function fetchSyncHistory(integrationId: string, force = false) {
    if (!force && (historyData[integrationId] || historyLoading.has(integrationId))) return;
    setHistoryLoading((prev) => new Set(prev).add(integrationId));
    setHistoryError((prev) => {
      const next = { ...prev };
      delete next[integrationId];
      return next;
    });
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const data = await apiClient<SyncLog[]>(
        `/api/v1/integrations/${integrationId}/sync-logs?limit=10`,
        token,
      );
      setHistoryData((prev) => ({ ...prev, [integrationId]: data ?? [] }));
    } catch (err) {
      setHistoryError((prev) => ({
        ...prev,
        [integrationId]: formatErrorMessage(err, "Failed to load sync history"),
      }));
    } finally {
      setHistoryLoading((prev) => {
        const next = new Set(prev);
        next.delete(integrationId);
        return next;
      });
    }
  }

  function toggleHistory(integrationId: string) {
    setHistoryOpen((prev) => {
      const next = new Set(prev);
      if (next.has(integrationId)) {
        next.delete(integrationId);
      } else {
        next.add(integrationId);
        void fetchSyncHistory(integrationId);
      }
      return next;
    });
  }

  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const connectedParam = searchParams?.get("connected");
  const errorParam = searchParams?.get("error");

  useEffect(() => {
    if (connectedParam) {
      setToast({ msg: `${PLATFORM_META[connectedParam as keyof typeof PLATFORM_META]?.label ?? connectedParam} connected successfully!`, type: "success" });
      window.history.replaceState({}, "", "/integrations");
    } else if (errorParam) {
      const msg = errorParam === "oauth_cancelled" ? "Authorization was cancelled." : "OAuth connection failed. Please try again.";
      setToast({ msg, type: "error" });
      window.history.replaceState({}, "", "/integrations");
    }
  }, [connectedParam, errorParam]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const token = await getToken();
    if (!token) { setLoadError("Your session expired — please sign in again"); setLoading(false); return; }
    try {
      const data = await apiClient<Integration[]>("/api/v1/integrations", token);
      setIntegrations(data ?? []);
      setLastUpdatedAt(Date.now());
    } catch (e) {
      // Continuation #36: formatErrorMessage surfaces ApiError.requestId.
      setLoadError(formatErrorMessage(e, "Failed to load integrations"));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnect = async (platform: keyof typeof PLATFORM_META) => {
    const token = await getToken();
    if (!token) return;
    try {
      const body: Record<string, string> = { platform };
      if (platform === "shopify") {
        const shop = window.prompt("Enter your Shopify store URL (e.g. mystore.myshopify.com):");
        if (!shop) return;
        body.shop = shop;
      }
      const { authUrl } = await apiClient<{ authUrl: string; state: string }>(
        "/api/v1/integrations/connect/start",
        token,
        { method: "POST", body: JSON.stringify(body) }
      );
      window.location.href = authUrl;
    } catch (err) {
      // Continuation #36: formatErrorMessage surfaces ApiError.requestId.
      setToast({ msg: formatErrorMessage(err, "Failed to start connection"), type: "error" });
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!window.confirm("Disconnect this integration? Historical data will be preserved.")) return;
    const token = await getToken();
    if (!token) return;
    try {
      await apiClient(`/api/v1/integrations/${id}`, token, { method: "DELETE" });
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      setToast({ msg: "Integration disconnected.", type: "success" });
    } catch (err) {
      // Continuation #62 — surface actionable canonical message via #59
      // code-honor; pre-fix swallowed every error as "Failed to disconnect"
      // even when the real cause was 401 / 503 / etc.
      setToast({
        msg: formatErrorMessage(err, "Failed to disconnect. Please try again."),
        type: "error",
      });
    }
  };

  const handleSync = async (id: string) => {
    const token = await getToken();
    if (!token) return;
    setSyncing((s) => ({ ...s, [id]: true }));
    try {
      await apiClient(`/api/v1/integrations/${id}/sync`, token, { method: "POST" });
      setToast({ msg: "Sync queued! Data will update shortly.", type: "success" });
      setTimeout(fetchIntegrations, 3000);
      // Continuation #64 — if the Recent Syncs panel is open for this
      // integration, force-refresh it so the new in_progress sync_log row
      // appears immediately (server-side it's already inserted by the
      // Inngest queue handler). Without this, operators clicking Sync Now
      // with the panel open had to manually re-open the panel to see the
      // new entry.
      if (historyOpen.has(id)) {
        void fetchSyncHistory(id, true);
      }
    } catch (err) {
      // Continuation #60 (2026-05-12) — the special-case 409 friendly-text
      // workaround from #36 is no longer needed. Backend emits `code:
      // 'SYNC_IN_PROGRESS'` with the canonical message ("A sync is already
      // in progress for this integration", integrations.ts:100); with the
      // #59 apiClient code-honor fix, formatErrorMessage now surfaces that
      // canonical wording directly. Consolidates onto the uniform
      // formatErrorMessage path that every other FE catch site uses.
      setToast({
        msg: formatErrorMessage(err, "Failed to queue sync. Please try again."),
        type: "error",
      });
    } finally {
      setSyncing((s) => ({ ...s, [id]: false }));
    }
  };

  const getIntegration = (platform: string) =>
    integrations.find((i) => i.platform === platform && i.status !== "disconnected");

  return (
    <div className="flex gap-8 pb-12">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold font-body transition-all ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
              Data Ecosystem
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Integrations</h2>
            <p className="text-muted-foreground mt-2 font-body">Connect and manage your AI data ecosystem.</p>
          </div>
          {/* Continuation #68 (2026-05-12) — explicit Refresh button on the
              page header. Pre-fix the integrations page had no header-level
              Refresh affordance — `fetchIntegrations` only auto-fired
              after sync queue (via the 3s setTimeout in handleSync).
              Operators wanting to manually re-poll the connection state
              had to nudge a sync to force the refetch. Now the explicit
              button matches the cockpit-wide #47/#48/#65/#66/#67 pattern. */}
          <div className="flex items-center gap-3 shrink-0 mt-2">
            {lastUpdatedAt !== null && (
              <span className="text-[11px] text-muted-foreground font-body">
                Updated <span className="font-bold text-foreground">{relUpdated()}</span>
              </span>
            )}
            <button
              onClick={() => void fetchIntegrations()}
              disabled={loading}
              title="Refresh — re-poll integrations list"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-surface-container-low text-foreground hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Integrations Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-surface-container-low rounded-2xl" />)}
          </div>
        ) : loadError ? (
          <div className="py-20 text-center space-y-4">
            <AlertCircle size={40} className="mx-auto text-red-300" />
            <p className="text-sm text-red-600 font-body">{loadError}</p>
            <button onClick={fetchIntegrations} className="px-4 py-2 text-sm font-bold border border-border rounded-xl hover:bg-surface-container-low transition-colors font-body">Try Again</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORMS.map((platform) => {
              const meta = PLATFORM_META[platform];
              const integration = getIntegration(platform);
              const connected = integration?.status === "connected";
              const hasError = integration?.status === "error";
              const isSyncing = syncing[integration?.id ?? ""];

              return (
                <div
                  key={platform}
                  className="bg-white p-6 rounded-2xl transition-all hover:shadow-xl border border-transparent hover:border-primary/5 group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
                      <meta.Icon size={24} className={meta.iconColor} />
                    </div>
                    {connected ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest font-body">
                        Connected
                      </span>
                    ) : hasError ? (
                      <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest font-body">
                        Error
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-surface-container-high text-muted-foreground text-[10px] font-black uppercase tracking-widest font-body">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-foreground font-sans">{meta.label}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed font-body">{meta.desc}</p>

                  {/* Last synced */}
                  {integration && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-body">
                      <Clock size={12} />
                      <span>Last synced: {formatDate(integration.lastSyncedAt)}</span>
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-muted-foreground font-body">
                        {connected ? "Synced Entities" : "Available Entities"}
                      </span>
                      <div className={`flex gap-1.5 ${!connected ? "opacity-50" : ""}`}>
                        {meta.tags.map((tag) => (
                          <span key={tag} className="bg-surface-container-high px-2 py-0.5 rounded text-muted-foreground font-body text-[11px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    {connected ? (
                      <>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSync(integration!.id)}
                            disabled={isSyncing}
                            className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 font-body flex items-center justify-center gap-2"
                          >
                            {isSyncing ? (
                              <><Loader2 size={14} className="animate-spin" /> Syncing…</>
                            ) : (
                              <><RefreshCw size={14} /> Sync Now</>
                            )}
                          </button>
                          <button
                            onClick={() => handleDisconnect(integration!.id)}
                            className="px-3 py-2 rounded-xl text-red-600 text-sm font-medium hover:bg-red-50 transition-colors font-body"
                          >
                            Disconnect
                          </button>
                        </div>

                        {/* Continuation #44 — Recent Syncs lazy panel */}
                        <button
                          onClick={() => toggleHistory(integration!.id)}
                          className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-surface-container-low transition-colors font-body"
                        >
                          <span>Recent Syncs</span>
                          {historyOpen.has(integration!.id)
                            ? <ChevronUp size={14} />
                            : <ChevronDown size={14} />}
                        </button>
                        {historyOpen.has(integration!.id) && (
                          <div className="mt-2 border-t border-surface-container-low pt-3">
                            {historyLoading.has(integration!.id) && (
                              <p className="text-xs text-muted-foreground font-body italic">Loading…</p>
                            )}
                            {historyError[integration!.id] && (
                              <p className="text-xs text-red-600 font-body">{historyError[integration!.id]}</p>
                            )}
                            {historyData[integration!.id] && historyData[integration!.id].length === 0 && (
                              <p className="text-xs text-muted-foreground font-body italic">No syncs yet</p>
                            )}
                            {historyData[integration!.id] && historyData[integration!.id].length > 0 && (
                              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                {historyData[integration!.id].map((log) => {
                                  const ok      = log.status === "success" || log.status === "completed";
                                  const inProg  = log.status === "in_progress" || log.status === "pending";
                                  const dot     = ok ? "bg-emerald-500" : inProg ? "bg-amber-400 animate-pulse" : "bg-red-500";
                                  return (
                                    <li key={log.id} className="flex items-center justify-between gap-2 text-[11px] font-body">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                        <span className="text-foreground font-medium truncate">
                                          {log.status}
                                          {log.recordsWritten !== null && log.recordsWritten > 0
                                            ? ` · ${log.recordsWritten} rows`
                                            : ""}
                                        </span>
                                      </div>
                                      <span className="text-muted-foreground shrink-0">
                                        {formatDate(log.startedAt)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        )}
                      </>
                    ) : hasError ? (
                      <button
                        onClick={() => handleConnect(platform)}
                        className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:opacity-90 transition-all font-body flex items-center justify-center gap-2"
                      >
                        <AlertCircle size={14} /> Reconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform)}
                        className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all font-body"
                      >
                        Connect {meta.label.split(" ")[0]}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer className="pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center uppercase tracking-[0.2em] font-bold font-body">
            All integrations power the execution system in real-time
          </p>
        </footer>
      </div>

      {/* Right Panel: Sync Health */}
      <aside className="w-80 shrink-0">
        <div className="sticky top-24 space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground font-body">
            Connection Health
          </h4>

          <div className="bg-white p-5 rounded-2xl border border-primary/10 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-2 h-2 rounded-full ${integrations.some((i) => i.status === "connected") ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
              <span className="text-sm font-bold text-foreground font-body">Sync Status</span>
            </div>
            {integrations.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground font-body">No platforms connected yet.</p>
            ) : (
              <div className="space-y-3">
                {PLATFORMS.map((platform) => {
                  const integration = getIntegration(platform);
                  if (!integration) return null;
                  const meta = PLATFORM_META[platform];
                  return (
                    <div key={platform} className="flex items-center justify-between p-3 bg-surface-container-high rounded-xl">
                      <div className="flex items-center gap-2">
                        <meta.Icon size={15} className={meta.iconColor} />
                        <span className="text-xs font-bold text-foreground font-body">{meta.label}</span>
                      </div>
                      {integration.status === "connected" ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <AlertCircle size={14} className="text-amber-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {integrations.filter((i) => i.status === "connected").length === 0 && !loading && (
            <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
              <p className="text-xs font-medium text-foreground leading-relaxed font-body">
                Connect at least one platform to start syncing campaign metrics and revenue data to your dashboard.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
