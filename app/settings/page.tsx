"use client";

import { useState } from "react";
import { User, Globe, Bell, AlertTriangle, BarChart3, ChevronDown, Clock } from "lucide-react";

export default function AccountSettingsPage() {
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [periodicReports, setPeriodicReports] = useState(false);

  return (
    <div className="max-w-4xl space-y-8 pb-32">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
          Configuration
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-sans mb-2">Settings</h2>
        <p className="text-muted-foreground max-w-2xl font-body">
          Configure your AI execution parameters and account preferences. These settings apply globally to your execution instance.
        </p>
      </div>

      {/* Section 1: Account Info */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-border">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-foreground font-sans">Account Info</h3>
            <p className="text-sm text-muted-foreground font-body">Manage your primary identification and enterprise links.</p>
          </div>
          <User size={20} className="text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 font-body">
              Full Name
            </label>
            <input
              type="text"
              defaultValue="Alexander Vance"
              className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 focus:ring-2 ring-primary/10 transition-all font-body text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 font-body">
              Email Address
            </label>
            <input
              type="email"
              defaultValue="alexander@cognitive-core.ai"
              className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 focus:ring-2 ring-primary/10 transition-all font-body text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 font-body">
              Company Name
            </label>
            <input
              type="text"
              defaultValue="Aether Logical Systems"
              className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 focus:ring-2 ring-primary/10 transition-all font-body text-sm"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Preferences */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-border">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-foreground font-sans">Preferences</h3>
            <p className="text-sm text-muted-foreground font-body">Set the localization for data exports and live metrics.</p>
          </div>
          <Globe size={20} className="text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 font-body">
              Operating Currency
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-surface-container-high border-none rounded-xl px-4 py-3 focus:ring-2 ring-primary/10 transition-all cursor-pointer font-body text-sm">
                <option>USD - United States Dollar</option>
                <option>EUR - Euro</option>
                <option>GBP - British Pound</option>
                <option>JPY - Japanese Yen</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 font-body">
              Primary Timezone
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-surface-container-high border-none rounded-xl px-4 py-3 focus:ring-2 ring-primary/10 transition-all cursor-pointer font-body text-sm">
                <option>(GMT-05:00) Eastern Time (US &amp; Canada)</option>
                <option>(GMT-08:00) Pacific Time (US &amp; Canada)</option>
                <option>(GMT+00:00) London</option>
                <option>(GMT+01:00) Paris / Berlin</option>
              </select>
              <Clock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Notifications */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-border">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-foreground font-sans">Notifications</h3>
            <p className="text-sm text-muted-foreground font-body">Control how the system communicates critical execution states.</p>
          </div>
          <Bell size={20} className="text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {/* System Alerts */}
          <div className="flex items-center justify-between p-4 bg-background rounded-xl hover:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-primary shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground font-body">System Alerts</h4>
                <p className="text-xs text-muted-foreground font-body">
                  Immediate push notifications for execution failures or bottlenecks.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSystemAlerts(!systemAlerts)}
              className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors ${
                systemAlerts ? "bg-primary" : "bg-surface-container-high"
              }`}
            >
              <span
                className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  systemAlerts ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Periodic Reports */}
          <div className="flex items-center justify-between p-4 bg-background rounded-xl hover:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-muted-foreground shrink-0">
                <BarChart3 size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground font-body">Periodic Reports</h4>
                <p className="text-xs text-muted-foreground font-body">
                  Daily and weekly performance summaries delivered to your inbox.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPeriodicReports(!periodicReports)}
              className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors ${
                periodicReports ? "bg-primary" : "bg-surface-container-high"
              }`}
            >
              <span
                className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  periodicReports ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-72 right-0 bg-white/80 backdrop-blur-xl p-6 border-t border-border flex justify-end gap-4 z-40">
        <button className="px-8 py-3 rounded-xl font-semibold text-muted-foreground hover:bg-surface-container-high transition-colors font-body">
          Discard changes
        </button>
        <button className="px-10 py-3 bg-gradient-to-br from-primary to-[#2563eb] text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition-all font-body">
          Save Changes
        </button>
      </div>
    </div>
  );
}
