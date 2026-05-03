"use client"

import { useState } from "react"
import {
  Search, Bell, Plus, Sparkles, ShieldCheck, SlidersHorizontal,
  ShieldAlert, Megaphone, Palette, Zap, Brain, Plug, Edit2,
  Copy, Trash2, TrendingUp, Check,
} from "lucide-react"

type PermRole = "Campaign Lead" | "Data Analyst" | "Content Creator"
type Module = "Campaigns" | "Creatives" | "Automations" | "Decisions" | "Integrations"
type Permission = "view" | "edit" | "execute" | "approver"

interface Role {
  id: string
  name: string
  desc: string
  users: number
  type: "System" | "Custom"
  iconBg: string
  icon: React.ReactNode
  locked?: boolean
}

const ROLES: Role[] = [
  {
    id: "super-admin",
    name: "Super Admin",
    desc: "Unrestricted access to all core platform functions and billing.",
    users: 2,
    type: "System",
    iconBg: "bg-primary",
    icon: <ShieldCheck className="w-4 h-4 text-white" />,
    locked: true,
  },
  {
    id: "campaign-lead",
    name: "Campaign Lead",
    desc: "Can manage campaigns, creative assets and execute automations.",
    users: 14,
    type: "Custom",
    iconBg: "bg-surface-container-high",
    icon: <Megaphone className="w-4 h-4 text-muted-foreground" />,
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    desc: "Read-only access to decisions and campaign reporting metrics.",
    users: 8,
    type: "Custom",
    iconBg: "bg-surface-container-high",
    icon: <Brain className="w-4 h-4 text-muted-foreground" />,
  },
]

const MODULE_ICONS: Record<Module, React.ReactNode> = {
  Campaigns: <Megaphone className="w-5 h-5 text-muted-foreground" />,
  Creatives: <Palette className="w-5 h-5 text-muted-foreground" />,
  Automations: <Zap className="w-5 h-5 text-muted-foreground" />,
  Decisions: <Brain className="w-5 h-5 text-muted-foreground" />,
  Integrations: <Plug className="w-5 h-5 text-muted-foreground" />,
}

const PERM_COLS: Permission[] = ["view", "edit", "execute", "approver"]

type MatrixState = Record<Module, Record<Permission, boolean>>

const DEFAULT_MATRIX: Record<PermRole, MatrixState> = {
  "Campaign Lead": {
    Campaigns:    { view: true,  edit: true,  execute: false, approver: false },
    Creatives:    { view: true,  edit: true,  execute: true,  approver: false },
    Automations:  { view: true,  edit: true,  execute: true,  approver: true  },
    Decisions:    { view: true,  edit: false, execute: false, approver: false },
    Integrations: { view: true,  edit: true,  execute: false, approver: false },
  },
  "Data Analyst": {
    Campaigns:    { view: true,  edit: false, execute: false, approver: false },
    Creatives:    { view: true,  edit: false, execute: false, approver: false },
    Automations:  { view: true,  edit: false, execute: false, approver: false },
    Decisions:    { view: true,  edit: false, execute: false, approver: false },
    Integrations: { view: false, edit: false, execute: false, approver: false },
  },
  "Content Creator": {
    Campaigns:    { view: true,  edit: false, execute: false, approver: false },
    Creatives:    { view: true,  edit: true,  execute: true,  approver: false },
    Automations:  { view: false, edit: false, execute: false, approver: false },
    Decisions:    { view: false, edit: false, execute: false, approver: false },
    Integrations: { view: false, edit: false, execute: false, approver: false },
  },
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? "bg-primary" : "bg-slate-200"}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [selectedRole, setSelectedRole] = useState<PermRole>("Campaign Lead")
  const [matrix, setMatrix] = useState<Record<PermRole, MatrixState>>(
    JSON.parse(JSON.stringify(DEFAULT_MATRIX))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [aiSuggested, setAiSuggested] = useState(false)

  const toggle = (module: Module, perm: Permission) => {
    setSaved(false)
    setMatrix(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [module]: {
          ...prev[selectedRole][module],
          [perm]: !prev[selectedRole][module][perm],
        },
      },
    }))
  }

  const handleSave = () => {
    if (saved) return
    setSaving(true)
    setTimeout(() => { setSaving(false); setSaved(true) }, 1000)
  }

  const handleDiscard = () => {
    setMatrix(JSON.parse(JSON.stringify(DEFAULT_MATRIX)))
    setSaved(false)
  }

  const handleAiSuggest = () => {
    if (aiSuggested) return
    setAiSuggesting(true)
    setTimeout(() => { setAiSuggesting(false); setAiSuggested(true) }, 1300)
  }

  const modules = Object.keys(MODULE_ICONS) as Module[]

  return (
    <div className="space-y-8">
      {/* Page topbar */}
      <div className="flex items-center justify-between -mx-6 -mt-6 px-6 h-14 border-b border-border bg-white sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <h2 className="font-sans font-bold text-primary text-lg tracking-tight">Permissions &amp; Roles</h2>
          <div className="relative w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Search roles or users…"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAiSuggest}
            disabled={aiSuggesting}
            className="flex items-center gap-2 bg-surface-container-low text-foreground font-semibold text-sm px-4 py-2 rounded-full hover:bg-surface-container-high transition-all active:scale-95 disabled:opacity-60"
          >
            {aiSuggesting ? (
              <><span className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /><span>Suggesting…</span></>
            ) : aiSuggested ? (
              <><Check className="w-4 h-4 text-emerald-500" /><span>AI Suggested</span></>
            ) : (
              <><Sparkles className="w-4 h-4" /><span>AI Suggest Permissions</span></>
            )}
          </button>
          <button className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-2 rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            Create Role
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-container-low transition-all">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        {[
          {
            label: "Total Roles",
            value: "12",
            sub: "2 added this month",
            subColor: "text-emerald-600",
            subIcon: <TrendingUp className="w-3.5 h-3.5" />,
            iconBg: "bg-blue-50 text-blue-600",
            icon: <ShieldCheck className="w-7 h-7" />,
          },
          {
            label: "Custom Roles",
            value: "8",
            sub: "66% of infrastructure",
            subColor: "text-muted-foreground",
            subIcon: null,
            iconBg: "bg-purple-50 text-purple-600",
            icon: <SlidersHorizontal className="w-7 h-7" />,
          },
          {
            label: "Admin Users",
            value: "4",
            sub: "High priority access",
            subColor: "text-red-500",
            subIcon: <ShieldAlert className="w-3.5 h-3.5" />,
            iconBg: "bg-orange-50 text-orange-600",
            icon: <ShieldAlert className="w-7 h-7" />,
          },
        ].map(card => (
          <div key={card.label} className="bg-white p-6 rounded-3xl shadow-sm border border-border flex items-center justify-between group hover:border-primary/20 transition-colors">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{card.label}</p>
              <h3 className="font-sans font-black text-foreground text-3xl mt-1">{card.value}</h3>
              <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${card.subColor}`}>
                {card.subIcon}{card.sub}
              </p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${card.iconBg}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
        <div className="px-8 py-6 border-b border-border flex justify-between items-center">
          <h3 className="font-sans font-bold text-foreground">Available User Roles</h3>
          <div className="flex gap-2">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors"><SlidersHorizontal className="w-4 h-4" /></button>
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/50 text-[11px] uppercase font-bold text-muted-foreground tracking-widest">
              <th className="px-8 py-4">Role Name</th>
              <th className="px-8 py-4">Description</th>
              <th className="px-8 py-4 text-center">Users</th>
              <th className="px-8 py-4">Type</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROLES.map(role => (
              <tr key={role.id} className="group hover:bg-surface-container-low/80 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role.iconBg}`}>
                      {role.icon}
                    </div>
                    <span className="font-sans font-bold text-foreground">{role.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 font-body text-sm text-muted-foreground">{role.desc}</td>
                <td className="px-8 py-5 text-center">
                  <span className="font-bold text-foreground bg-surface-container-low px-3 py-1 rounded-full text-xs">{role.users}</span>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${role.type === "System" ? "bg-slate-800 text-white" : "bg-primary/10 text-primary"}`}>
                    {role.type}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  {role.locked ? (
                    <span className="text-xs font-semibold text-muted-foreground italic">Locked</span>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-muted-foreground hover:text-primary transition-all"><Edit2 className="w-4 h-4" /></button>
                      <button className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-muted-foreground hover:text-foreground transition-all"><Copy className="w-4 h-4" /></button>
                      <button className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-muted-foreground hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
        <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-surface-container-low/30">
          <div>
            <h3 className="font-sans font-bold text-foreground">Global Permissions Matrix</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-body">Define granular access control across platform modules</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Selected Role:</span>
            <select
              value={selectedRole}
              onChange={e => { setSelectedRole(e.target.value as PermRole); setSaved(false) }}
              className="bg-white border border-border rounded-lg text-sm font-semibold px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {(["Campaign Lead", "Data Analyst", "Content Creator"] as PermRole[]).map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6">
          {/* Column headers */}
          <div className="grid grid-cols-5 text-center mb-4 px-4">
            <div className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Module</div>
            {PERM_COLS.map(p => (
              <div key={p} className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest capitalize">{p}</div>
            ))}
          </div>

          {/* Module rows */}
          <div className="space-y-2">
            {modules.map(mod => (
              <div key={mod} className="grid grid-cols-5 items-center bg-surface-container-low/50 rounded-2xl py-4 px-4 hover:bg-surface-container-high/50 transition-colors">
                <div className="flex items-center gap-3">
                  {MODULE_ICONS[mod]}
                  <span className="font-sans font-bold text-foreground text-sm">{mod}</span>
                </div>
                {PERM_COLS.map(perm => (
                  <div key={perm} className="flex justify-center">
                    <Toggle
                      checked={matrix[selectedRole][mod][perm]}
                      onChange={() => toggle(mod, perm)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-low/50 px-8 py-6 flex justify-end gap-3 border-t border-border">
          <button
            onClick={handleDiscard}
            className="px-6 py-2 rounded-xl text-muted-foreground font-bold text-sm hover:bg-surface-container-high transition-all"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Saving…</span></>
            ) : saved ? (
              <><Check className="w-3.5 h-3.5" /><span>Saved!</span></>
            ) : "Save Matrix Configuration"}
          </button>
        </div>
      </div>
    </div>
  )
}
