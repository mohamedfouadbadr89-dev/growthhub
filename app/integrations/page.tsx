"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  Globe,
  MousePointerClick,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";

interface Integration {
  id: string;
  platform: "meta" | "google" | "shopify";
  status: "connected" | "disconnected" | "error";
  lastSyncedAt: string | null;
  createdAt: string;
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
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

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
    const token = await getToken();
    if (!token) return;
    try {
      const data = await apiClient<Integration[]>("/api/v1/integrations", token);
      setIntegrations(data);
    } catch {
      // ignore on background refresh
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
      const msg = err instanceof ApiError ? err.message : "Failed to start connection";
      setToast({ msg, type: "error" });
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
    } catch {
      setToast({ msg: "Failed to disconnect. Please try again.", type: "error" });
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
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 409
        ? "A sync is already in progress."
        : "Failed to queue sync. Please try again.";
      setToast({ msg, type: "error" });
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
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Data Ecosystem
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Integrations</h2>
          <p className="text-muted-foreground mt-2 font-body">Connect and manage your AI data ecosystem.</p>
        </div>

        {/* Integrations Grid */}
        {loading ? (
          <div className="flex items-center gap-3 text-muted-foreground py-12">
            <Loader2 size={20} className="animate-spin" />
            <span className="font-body text-sm">Loading integrations…</span>
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
