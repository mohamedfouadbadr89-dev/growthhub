"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  MousePointerClick,
  Film,
  Store,
  BarChart3,
  Focus,
  Lock,
  Key,
  CheckCircle2,
  Zap,
  Clock,
  CalendarDays,
  Eye,
  Users,
  Image,
  Info,
  Network,
  ChevronsRight,
} from "lucide-react";

const PLATFORMS = [
  { key: "meta",     Icon: Globe,           iconColor: "text-primary",    label: "Meta Ads",      sub: "Facebook & Instagram" },
  { key: "google",   Icon: MousePointerClick, iconColor: "text-red-500",  label: "Google Ads",    sub: "Search & Display" },
  { key: "tiktok",   Icon: Film,            iconColor: "text-foreground", label: "TikTok Ads",    sub: "Short-form Video" },
  { key: "shopify",  Icon: Store,           iconColor: "text-green-600",  label: "Shopify",       sub: "E-commerce Data" },
  { key: "ga4",      Icon: BarChart3,       iconColor: "text-orange-500", label: "GA4",           sub: "Web Analytics" },
  { key: "snapchat", Icon: Focus,           iconColor: "text-yellow-500", label: "Snapchat Ads",  sub: "Visual Messaging" },
];

const PERMISSIONS = [
  { label: "Campaign data",        sub: "Read access to structures and settings" },
  { label: "Ad performance",       sub: "Real-time delivery and spend metrics" },
  { label: "Conversion tracking",  sub: "Pixel and event measurement data" },
];

const SYNC_OPTIONS = [
  { key: "realtime", Icon: Zap,          label: "Real-time", sub: "Instant sync for dynamic scaling and budget adjustments." },
  { key: "hourly",   Icon: Clock,        label: "Hourly",    sub: "Balanced frequency for standard monitoring." },
  { key: "daily",    Icon: CalendarDays, label: "Daily",     sub: "Lowest resource usage for long-term reporting." },
];

const ENTITIES = [
  { Icon: MousePointerClick, label: "Ad Campaigns",    count: "142" },
  { Icon: Users,             label: "Audiences",       count: "38" },
  { Icon: Image,             label: "Creative Assets", count: "1,024" },
];

export default function ConnectIntegrationPage() {
  const [selectedPlatform, setSelectedPlatform] = useState("meta");
  const [selectedSync, setSelectedSync] = useState("realtime");

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
        {/* Left: Step Flow */}
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
                    onClick={() => setSelectedPlatform(p.key)}
                    className={`p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center text-center gap-4 border-2 ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-surface-container-low hover:bg-white hover:shadow-md"
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
                <h4 className="font-bold text-foreground font-body">Connect Meta Business Account</h4>
                <p className="text-sm text-muted-foreground font-body">
                  Grant the Execution Engine secure access to your ad accounts and creative assets.
                </p>
              </div>
              <button className="px-8 py-3 bg-white border border-border hover:border-primary text-foreground font-bold rounded-xl transition-all shadow-sm font-body whitespace-nowrap">
                Connect Account
              </button>
            </div>
          </section>

          {/* Step 03 + 04: Permissions & Data Selection */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-border">
            <div className="grid grid-cols-2 gap-12">
              {/* Permissions */}
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] font-body">Step 03</span>
                <h3 className="text-2xl font-extrabold text-foreground mt-2 mb-6 font-sans">Permissions</h3>
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
              </div>

              {/* Data Selection */}
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] font-body">Step 04</span>
                <h3 className="text-2xl font-extrabold text-foreground mt-2 mb-6 font-sans">Data Selection</h3>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2 font-body">
                      Select Ad Account
                    </span>
                    <select className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 font-body">
                      <option>Aether Global - Primary (834-221-002)</option>
                      <option>Aether Testing (112-990-231)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2 font-body">
                      Creative Assets Scope
                    </span>
                    <select className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-primary/20 font-body">
                      <option>All Business Manager Assets</option>
                      <option>Selected Folders Only</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Step 05: Sync Settings */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-border">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] font-body">Step 05</span>
            <h3 className="text-2xl font-extrabold text-foreground mt-2 mb-8 font-sans">Sync Settings</h3>
            <div className="grid grid-cols-3 gap-6">
              {SYNC_OPTIONS.map((opt) => {
                const active = selectedSync === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedSync(opt.key)}
                    className={`p-6 rounded-2xl cursor-pointer text-left transition-all border-2 ${
                      active
                        ? "bg-primary/5 border-primary/20"
                        : "bg-surface-container-low border-transparent hover:bg-white hover:shadow-md"
                    }`}
                  >
                    <opt.Icon size={22} className={`mb-3 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <h4 className="font-bold text-sm text-foreground font-body">{opt.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1 font-body">{opt.sub}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 py-4">
            <Link href="/integrations">
              <button className="px-8 py-4 text-muted-foreground font-bold hover:text-foreground transition-colors font-body">
                Cancel
              </button>
            </Link>
            <button className="px-12 py-4 bg-gradient-to-br from-primary to-[#2563eb] text-white rounded-2xl font-bold shadow-xl shadow-primary/30 flex items-center gap-3 active:scale-95 transition-transform font-body">
              Confirm &amp; Connect
              <ChevronsRight size={20} />
            </button>
          </div>
        </div>

        {/* Right: Connection Preview */}
        <aside className="col-span-4 sticky top-24 flex flex-col gap-6 h-fit">
          {/* Connection Preview */}
          <div className="bg-surface-container-high p-8 rounded-3xl">
            <h4 className="text-lg font-extrabold text-foreground mb-6 flex items-center gap-2 font-sans">
              <Eye size={18} className="text-primary" /> Connection Preview
            </h4>
            <div className="space-y-6">
              {/* Data Volume */}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-body">Est. Data Volume</p>
                  <p className="text-3xl font-black text-foreground mt-1 font-sans">
                    2.4<span className="text-sm font-medium text-muted-foreground ml-1">GB/mo</span>
                  </p>
                </div>
                <div className="h-10 w-24 bg-white/50 rounded-lg flex items-end p-2 gap-1">
                  <div className="flex-1 bg-primary/20 h-4 rounded-sm" />
                  <div className="flex-1 bg-primary/40 h-6 rounded-sm" />
                  <div className="flex-1 bg-primary/60 h-5 rounded-sm" />
                  <div className="flex-1 bg-primary h-8 rounded-sm" />
                </div>
              </div>

              <div className="h-px bg-border/30" />

              {/* Available Entities */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 font-body">
                  Available Entities
                </p>
                <div className="space-y-3">
                  {ENTITIES.map((e) => (
                    <div key={e.label} className="flex items-center justify-between bg-white/50 p-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <e.Icon size={16} className="text-primary" />
                        <span className="text-sm font-medium text-foreground font-body">{e.label}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground font-body">{e.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-amber-50 rounded-2xl p-4 flex gap-3">
                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 font-medium leading-relaxed font-body">
                  Historical data up to 24 months will be imported during the initial synchronization.
                </p>
              </div>
            </div>
          </div>

          {/* Platform Status */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Network size={80} className="text-foreground" />
            </div>
            <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 font-body">
              Platform Health
            </h5>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-foreground font-body">Meta API v18.0 — Stable</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-body">
              No service disruptions reported. Latency is currently within optimal parameters (&lt; 140ms).
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
