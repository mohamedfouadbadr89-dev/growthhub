"use client";

// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B Step 5.
// Shared connection-status context for the integration-badge system.
// Hydrates from the EXISTING `GET /api/v1/integrations` endpoint once
// per session, exposes a `Map<platform_id, status>` to consumers.
//
// IMPORTANT: this is READ-ONLY observability. It does not mutate
// connection state — that flows through the existing /integrations
// page + canonical /connect/start route. The provider just caches
// the snapshot so template cards + detail pages + Copilot drafts
// can render real status without each page firing its own fetch.

import {
  createContext, useCallback, useContext, useEffect, useMemo,
  useState, type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "@/lib/api-client";

export type ConnectionStatus = "connected" | "disconnected" | "error" | "unknown";

interface BackendIntegration {
  id: string;
  platform: string; // 'meta' | 'google' | 'shopify' currently
  status: "connected" | "disconnected" | "error";
  lastSyncedAt: string | null;
  createdAt: string;
}

interface IntegrationStatusContextValue {
  /** Map keyed by backend `platform` id → current connection status */
  statusMap: Record<string, ConnectionStatus>;
  /** True while the first fetch is in flight */
  loading: boolean;
  /** True if the hydration fetch failed */
  errored: boolean;
  /** Manually trigger a refresh (e.g. after operator connects a new platform) */
  refresh: () => void;
}

const IntegrationStatusContext = createContext<IntegrationStatusContextValue>({
  statusMap: {},
  loading: true,
  errored: false,
  refresh: () => {},
});

// Re-hydrate at most every 5 minutes to keep the surface fresh
// without burning the backend. Manual `refresh()` bypasses this.
const REHYDRATE_MS = 5 * 60_000;

export function IntegrationStatusProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [statusMap, setStatusMap] = useState<Record<string, ConnectionStatus>>({});
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [lastFetched, setLastFetched] = useState<number>(0);

  // Trigger counter increments to request a refresh. Each effect reads
  // the counter and re-fires the fetch. Keeps state-setting logic out of
  // pure render and out of nested effect-state cycles.
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refresh = useCallback(() => {
    setFetchTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrored(false);
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = await apiClient<BackendIntegration[]>("/api/v1/integrations", token);
        const next: Record<string, ConnectionStatus> = {};
        for (const row of Array.isArray(data) ? data : []) {
          next[row.platform] = row.status === "connected"
            ? "connected"
            : row.status === "error"
              ? "error"
              : "disconnected";
        }
        if (!cancelled) {
          setStatusMap(next);
          setLastFetched(Date.now());
        }
      } catch {
        // Defensive: connection status is a hint, not a gate. Never block
        // template browsing on a hydration failure. Badges render as
        // "unknown" → operator still sees real provider metadata.
        if (!cancelled) setErrored(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken, fetchTrigger]);

  // Auto-refresh on visibility change if more than REHYDRATE_MS has
  // passed since the last successful fetch.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFetched > REHYDRATE_MS) {
        setFetchTrigger((n) => n + 1);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [lastFetched]);

  const value = useMemo<IntegrationStatusContextValue>(
    () => ({ statusMap, loading, errored, refresh }),
    [statusMap, loading, errored, refresh],
  );

  return (
    <IntegrationStatusContext.Provider value={value}>
      {children}
    </IntegrationStatusContext.Provider>
  );
}

export function useIntegrationStatus(): IntegrationStatusContextValue {
  return useContext(IntegrationStatusContext);
}

/**
 * Per-provider helper. Reads the canonical backend platform id from
 * the provider registry, returns the cached status. Provider with
 * `backend_platform_id === null` (Slack, Sheets, BigQuery, etc.)
 * always returns `'unknown'` until their backend lands — the badge
 * UI degrades gracefully.
 */
export function useProviderStatus(backendPlatformId: string | null): ConnectionStatus {
  const { statusMap } = useIntegrationStatus();
  if (!backendPlatformId) return "unknown";
  return statusMap[backendPlatformId] ?? "disconnected";
}
