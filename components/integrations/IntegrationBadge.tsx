"use client";

// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B Step 5.
// Shared integration badge component used across:
//   - Templates marketplace cards (compact variant)
//   - Template detail page sidebar (row variant)
//   - Copilot draft preview (compact variant)
//
// Reads connection status from IntegrationStatusProvider (hydrated
// from /api/v1/integrations). NEVER shows a fake "Connected" — when
// the backend platform isn't yet registered for a provider (e.g.
// Slack, Sheets), the badge renders "Not connected" with a real link
// to /integrations.

import Link from "next/link";
import {
  Globe, MousePointerClick, ShoppingBag, Sparkles, Briefcase,
  BarChart2, Table2, Presentation, FolderOpen, Database,
  MessageSquare, Mail, Search, Brain, type LucideIcon,
} from "lucide-react";
import { INTEGRATION_PROVIDERS, type IntegrationProviderId } from "@/lib/workflow-templates";
import { useProviderStatus, type ConnectionStatus } from "@/lib/integration-status/context";

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  Globe, MousePointerClick, ShoppingBag, Sparkles, Briefcase,
  BarChart2, Table2, Presentation, FolderOpen, Database,
  MessageSquare, Mail, Search, Brain,
};

function iconFor(name: string): LucideIcon {
  return PROVIDER_ICONS[name] ?? Globe;
}

function statusToDot(status: ConnectionStatus): string {
  switch (status) {
    case "connected":    return "bg-emerald-500";
    case "disconnected": return "bg-slate-400";
    case "error":        return "bg-amber-500";
    case "unknown":      return "bg-slate-300";
  }
}

function statusToLabel(status: ConnectionStatus): string {
  switch (status) {
    case "connected":    return "Connected";
    case "disconnected": return "Not connected";
    case "error":        return "Connection error";
    case "unknown":      return "Available soon";
  }
}

export interface IntegrationBadgeProps {
  providerId: IntegrationProviderId;
  /** Visual variant — compact (chip) or row (with label) */
  variant?: "compact" | "row";
}

export function IntegrationBadge({ providerId, variant = "compact" }: IntegrationBadgeProps) {
  const meta = INTEGRATION_PROVIDERS[providerId];
  const status = useProviderStatus(meta.backend_platform_id);

  if (variant === "row") {
    return <IntegrationBadgeRow providerId={providerId} status={status} />;
  }
  return <IntegrationBadgeCompact providerId={providerId} status={status} />;
}

function IntegrationBadgeCompact({
  providerId,
  status,
}: {
  providerId: IntegrationProviderId;
  status: ConnectionStatus;
}) {
  const meta = INTEGRATION_PROVIDERS[providerId];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-container-low text-foreground text-[10px] font-bold font-body uppercase tracking-wider"
      title={`${meta.label} — ${statusToLabel(status)}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${statusToDot(status)}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function IntegrationBadgeRow({
  providerId,
  status,
}: {
  providerId: IntegrationProviderId;
  status: ConnectionStatus;
}) {
  const meta = INTEGRATION_PROVIDERS[providerId];
  const ProviderIcon = iconFor(meta.icon);
  const isConnected = status === "connected";
  const connectHref = meta.backend_platform_id
    ? `/integrations`
    : "/integrations";

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* eslint-disable-next-line react-hooks/static-components */}
        <ProviderIcon size={16} className="text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-foreground text-sm font-body truncate flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${statusToDot(status)}`} aria-hidden="true" />
            {meta.label}
          </p>
          <p className="text-[10px] font-body text-muted-foreground">
            {statusToLabel(status)}
          </p>
        </div>
      </div>
      <Link
        href={connectHref}
        className="text-[11px] font-bold text-primary hover:underline font-body shrink-0"
      >
        {isConnected ? "Manage →" : "Connect →"}
      </Link>
    </li>
  );
}
