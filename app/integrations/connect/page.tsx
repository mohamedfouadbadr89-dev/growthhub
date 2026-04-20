"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  ArrowLeft,
  Globe,
  MousePointerClick,
  Store,
  Lock,
  Key,
  CheckCircle2,
  Zap,
  Clock,
  CalendarDays,
  ChevronsRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

const PLATFORMS = [
  { key: "meta",    Icon: Globe,             iconColor: "text-primary",   label: "Meta Ads",   sub: "Facebook & Instagram" },
  { key: "google",  Icon: MousePointerClick, iconColor: "text-red-500",   label: "Google Ads", sub: "Search & Display" },
  { key: "shopify", Icon: Store,             iconColor: "text-green-600", label: "Shopify",    sub: "E-commerce Data" },
] as const;

type Platform = typeof PLATFORMS[number]["key"];

const PERMISSIONS = [
  { label: "Campaign data",       sub: "Read access to structures and settings" },
  { label: "Ad performance",      sub: "Real-time delivery and spend metrics" },
  { label: "Conversion tracking", sub: "Pixel and event measurement data" },
];

const SYNC_OPTIONS = [
  { key: "daily",    Icon: CalendarDays, label: "Daily",    sub: "Automated daily sync at 2am UTC." },
  { key: "manual",   Icon: Zap,          label: "+ Manual", sub: "Trigger on-demand from the Integrations page." },
  { key: "backfill", Icon: Clock,        label: "30-day",   sub: "Historical backfill covers the last 30 days." },
];

export default function ConnectIntegrationPage() {
  const { getToken } = useAuth();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("meta");
  const [shopDomain, setShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);

    if (selectedPlatform === "shopify" && !shopDomain.trim()) {
      setError("Please enter your Shopify store URL.");
      return;
    }

    setConnecting(true);
    const token = await getToken();
    if (!token) { setConnecting(false); return; }

    try {
      const body: Record<string, string> = { platform: selectedPlatform };
      if (selectedPlatform === "shopify") body.shop = shopDomain.trim();

      const { authUrl } = await apiClient<{ authUrl: string; state: string }>(
        "/api/v1/integrations/connect/start",
        token,
        { method: "POST", body: JSON.stringify(body) }
      );
      window.location.href = authUrl;
    } catch (err) {
      setConnecting(false);
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError("Failed to start the connection. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-0 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <Link href="/integrations" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium text-sm font-body">
          <ArrowLeft size={16} /> Back to Integrations
        </Link>
        <div className="h-4 w-px bg-border" />
        <h2 className="text-xl font-bold text-foreground tracking-tight font-sans">Connect Integration</h2>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-8 flex flex-col gap-8">

          {/* Step 01: Select Platform */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-border">
            <div className="mb-8">
              <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] font-body">Step 01</span>
              <h3 className="text-2xl font-extrabold text-foreground mt-2 font-sans">Select Platform</h3>
              <p className="text-muted-foreground text-sm mt-1 font-body">
                Choose the data source you want to synchronize with the Execution Engine.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {PLATFORMS.map((p) => {
                const active = selectedPlatform === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => { setSelectedPlatform(p.key); setError(null); }}
                    className={`p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center text-center gap-4 border-2 ${
                      active ? "border-primary bg-primary/5" : "border-transparent bg-surface-container-low hover:bg-white hover:shadow-md"
                    }`}
                  >
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                      <p.Icon size={24} className={p.iconColor} />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground font-body">{p.label}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 font-body">{p.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 02: Authentication */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] font-body">Step 02</span>
                <h3 className="text-2xl font-extrabold text-foreground mt-2 font-sans">Authentication</h3>
              </div>
              <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-2 font-body">
                <Lock size={14} /> Secure OAuth 2.0
              </div>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-6 flex items-center gap-6">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                <Key size={32} className="text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground font-body">
                  Connect {PLATFORMS.find((p) => p.key === selectedPlatform)?.label} Account
                </h4>
                <p className="text-sm text-muted-foreground font-body">
                  You&apos;ll be redirected to authorize GrowthHub to read your campaign data securely.
                  No write permissions are requested.
                </p>
              </div>
            </div>

            {/* Shopify store URL input */}
            {selectedPlatform === "shopify" && (
              <div className="mt-6">
                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2 font-body">
                    Shopify Store URL
                  </span>
                  <input
                    type="text"
                    placeholder="mystore.myshopify.com"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-primary/20 font-body"
                  />
                </label>
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 font-body">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </section>

          {/* Step 03: Permissions */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-border">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] font-body">Step 03</span>
            <h3 className="text-2xl font-extrabold text-foreground mt-2 mb-6 font-sans">Permissions Requested</h3>
            <div className="space-y-4">
              {PERMISSIONS.map((perm) => (
                <div key={perm.label} className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary fill-primary/10 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-foreground font-body">{perm.label}</p>
                    <p className="text-xs text-muted-foreground font-body">{perm.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Step 04: Sync Schedule */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-border">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] font-body">Step 04</span>
            <h3 className="text-2xl font-extrabold text-foreground mt-2 mb-8 font-sans">Sync Schedule</h3>
            <div className="grid grid-cols-3 gap-6">
              {SYNC_OPTIONS.map((opt) => (
                <div key={opt.key} className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 text-left">
                  <opt.Icon size={22} className="mb-3 text-primary" />
                  <h4 className="font-bold text-sm text-foreground font-body">{opt.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1 font-body">{opt.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 py-4">
            <Link href="/integrations">
              <button className="px-8 py-4 text-muted-foreground font-bold hover:text-foreground transition-colors font-body">
                Cancel
              </button>
            </Link>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-12 py-4 bg-gradient-to-br from-primary to-[#2563eb] text-white rounded-2xl font-bold shadow-xl shadow-primary/30 flex items-center gap-3 active:scale-95 transition-transform disabled:opacity-60 font-body"
            >
              {connecting ? (
                <><Loader2 size={18} className="animate-spin" /> Connecting…</>
              ) : (
                <>Authorize &amp; Connect <ChevronsRight size={20} /></>
              )}
            </button>
          </div>
        </div>

        {/* Right: Info Panel */}
        <aside className="col-span-4 sticky top-24 flex flex-col gap-6 h-fit">
          <div className="bg-surface-container-high p-8 rounded-3xl">
            <h4 className="text-lg font-extrabold text-foreground mb-4 font-sans">What happens next?</h4>
            <ol className="space-y-4">
              {[
                "You authorize GrowthHub via the platform's secure OAuth page.",
                "Your token is encrypted and stored in Supabase Vault — never exposed to the browser.",
                "An initial 30-day backfill runs automatically.",
                "Daily syncs keep your dashboard data fresh.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 font-body">
                    {i + 1}
                  </span>
                  <p className="text-sm text-muted-foreground font-body">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 font-body">Security</p>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              Credentials are encrypted at rest using Supabase Vault (pgsodium). GrowthHub only requests
              read permissions — no ability to modify your campaigns.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
