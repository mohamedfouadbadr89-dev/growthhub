"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import {
  Search, Bell, History, ShoppingBag, BarChart2, Cloud,
  CloudOff, Loader2, Check, Sparkles,
} from "lucide-react"
import { ByokModal } from "@/components/ai/byok-modal"
import { apiClient } from "@/lib/api-client"

type Category = "All" | "Ads Platforms" | "Analytics" | "AI" | "Data" | "CRM"
type StatusFilter = "all" | "connected" | "not-connected"

interface Integration {
  id: string
  name: string
  desc: string
  category: Category
  connected: boolean
  entities: string[]
  iconBg: string
  iconColor: string
  icon: React.ReactNode
}

const INTEGRATIONS: Integration[] = [
  {
    id: "meta",
    name: "Meta Ads",
    desc: "Automate ad spend optimizations and creative rotations across FB and Instagram.",
    category: "Ads Platforms",
    connected: true,
    entities: ["Campaigns", "Creatives"],
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    id: "google-ads",
    name: "Google Ads",
    desc: "Execution for Search, Display, and Video campaigns based on real-time ROI.",
    category: "Ads Platforms",
    connected: true,
    entities: ["Campaigns", "Keywords"],
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    icon: <BarChart2 className="w-6 h-6" />,
  },
  {
    id: "tiktok",
    name: "TikTok Ads",
    desc: "Leverage high-velocity creative testing and automated bid management.",
    category: "Ads Platforms",
    connected: false,
    entities: ["Creatives", "Events"],
    iconBg: "bg-slate-900",
    iconColor: "text-white",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    id: "snapchat",
    name: "Snapchat Ads",
    desc: "Reach younger demographics with automated Snap-native creative execution.",
    category: "Ads Platforms",
    connected: false,
    entities: ["Campaigns"],
    iconBg: "bg-yellow-400",
    iconColor: "text-black",
    icon: <Cloud className="w-6 h-6" />,
  },
  {
    id: "shopify",
    name: "Shopify",
    desc: "Pull first-party order data to fuel precision AI optimization algorithms.",
    category: "Data",
    connected: true,
    entities: ["Orders", "Customers"],
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    icon: <ShoppingBag className="w-6 h-6" />,
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    desc: "Track events and user behavior to inform cross-channel execution decisions.",
    category: "Analytics",
    connected: true,
    entities: ["Events", "Audiences"],
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    icon: <BarChart2 className="w-6 h-6" />,
  },
  {
    id: "mcp-ai",
    name: "AI Assistant (MCP)",
    desc: "Connect your own AI provider key for BYOK execution with full org context.",
    category: "AI",
    connected: false,
    entities: ["Campaigns", "Creatives", "Actions"],
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    icon: <Sparkles className="w-6 h-6" />,
  },
]

const CATEGORIES: Category[] = ["All", "Ads Platforms", "Analytics", "AI", "Data", "CRM"]

const API_STATUS = [
  { label: "Meta Graph", status: "healthy", uptime: "99.9%", icon: <Cloud className="w-4 h-4 text-blue-600" /> },
  { label: "Google Ads", status: "delayed", uptime: "Delayed", icon: <Cloud className="w-4 h-4 text-amber-500" /> },
  { label: "TikTok API", status: "offline", uptime: "Offline", icon: <CloudOff className="w-4 h-4 text-muted-foreground" /> },
]

export default function IntegrationsConnectPage() {
  const { getToken } = useAuth()
  const [category, setCategory] = useState<Category>("All")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [connected, setConnected] = useState<Set<string>>(
    new Set(INTEGRATIONS.filter(i => i.connected).map(i => i.id))
  )
  const [connecting, setConnecting] = useState<Set<string>>(new Set())
  const [disconnecting, setDisconnecting] = useState<Set<string>>(new Set())
  const [showByokModal, setShowByokModal] = useState(false)
  const [aiProvider, setAiProvider] = useState<string | null>(null)

  useEffect(() => {
    getToken().then(token => {
      if (!token) return
      apiClient<{ connected: boolean; provider: string | null }>("/api/v1/ai/connect", token)
        .then(res => {
          if (res.connected && res.provider) {
            setAiProvider(res.provider)
            setConnected(prev => new Set(prev).add("mcp-ai"))
          }
        })
        .catch(() => { /* non-critical — card stays Not Connected */ })
    })
  }, [getToken])

  const handleConnect = (id: string) => {
    setConnecting(prev => new Set(prev).add(id))
    setTimeout(() => {
      setConnecting(prev => { const n = new Set(prev); n.delete(id); return n })
      setConnected(prev => new Set(prev).add(id))
    }, 1300)
  }

  const handleDisconnect = (id: string) => {
    setDisconnecting(prev => new Set(prev).add(id))
    setTimeout(() => {
      setDisconnecting(prev => { const n = new Set(prev); n.delete(id); return n })
      setConnected(prev => { const n = new Set(prev); n.delete(id); return n })
    }, 1000)
  }

  const filtered = INTEGRATIONS.filter(i => {
    const matchCat = category === "All" || i.category === category
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "connected" && connected.has(i.id)) ||
      (statusFilter === "not-connected" && !connected.has(i.id))
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchStatus && matchSearch
  })

  return (
    <div className="flex min-h-full -mx-6 -mt-6">
      {/* Center Content */}
      <div className="flex-1 p-8 space-y-8 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-sans font-extrabold text-foreground text-3xl tracking-tight">Integrations</h2>
            <p className="font-body text-muted-foreground mt-1">Connect and manage your AI data ecosystem.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search integrations…"
                className="pl-9 pr-4 py-2 bg-surface-container-high border-none rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 w-52"
              />
            </div>
            <button className="p-2 text-muted-foreground hover:bg-surface-container-low rounded-full transition-colors"><Bell className="w-5 h-5" /></button>
            <button className="p-2 text-muted-foreground hover:bg-surface-container-low rounded-full transition-colors"><History className="w-5 h-5" /></button>
            <button className="bg-primary text-white px-5 py-2 rounded-full font-bold text-sm hover:shadow-lg transition-all active:scale-95">
              Connect New Integration
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex bg-surface-container-low rounded-xl p-1 gap-1">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${category === c ? "bg-white text-primary font-bold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Status:</span>
            {(["all", "connected", "not-connected"] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 text-sm rounded-full transition-colors border ${statusFilter === s ? "font-semibold text-primary border-primary/20 bg-primary/5" : "font-medium text-muted-foreground border-transparent hover:bg-surface-container-low"}`}
              >
                {s === "all" ? "All" : s === "connected" ? "Connected" : "Not Connected"}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(integ => {
            const isConnected = connected.has(integ.id)
            const isConnecting = connecting.has(integ.id)
            const isDisconnecting = disconnecting.has(integ.id)
            return (
              <div
                key={integ.id}
                className="bg-white p-6 rounded-xl border border-border hover:shadow-lg hover:border-primary/10 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-xl ${integ.iconBg} ${integ.iconColor} flex items-center justify-center`}>
                    {integ.icon}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isConnected ? "bg-emerald-100 text-emerald-700" : "bg-surface-container-low text-muted-foreground"}`}>
                    {isConnected ? "Connected" : "Not Connected"}
                  </span>
                </div>
                <h3 className="font-sans font-bold text-foreground text-lg">{integ.name}</h3>
                <p className="font-body text-sm text-muted-foreground mt-2 leading-relaxed">{integ.desc}</p>
                <div className="mt-6">
                  <div className={`flex items-center justify-between text-xs font-medium ${!isConnected ? "opacity-50" : ""}`}>
                    <span className="text-muted-foreground">{isConnected ? "Synced Entities" : "Available Entities"}</span>
                    <div className="flex gap-1.5">
                      {integ.entities.map(e => (
                        <span key={e} className="bg-surface-container-low px-2 py-0.5 rounded text-muted-foreground">{e}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  {integ.id === "mcp-ai" ? (
                    isConnected ? (
                      <button
                        onClick={() => setShowByokModal(true)}
                        className="flex-1 py-2 rounded-lg bg-surface-container-low text-foreground text-sm font-bold hover:bg-surface-container-high transition-colors"
                      >
                        Manage
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowByokModal(true)}
                        className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                      >
                        Connect AI Key
                      </button>
                    )
                  ) : isConnected ? (
                    <>
                      <button className="flex-1 py-2 rounded-lg bg-surface-container-low text-foreground text-sm font-bold hover:bg-surface-container-high transition-colors">
                        Manage
                      </button>
                      <button
                        onClick={() => handleDisconnect(integ.id)}
                        disabled={isDisconnecting}
                        className="px-3 py-2 rounded-lg text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {isDisconnecting ? "…" : "Disconnect"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(integ.id)}
                      disabled={isConnecting}
                      className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {isConnecting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Connecting…</span></>
                      ) : (
                        `Connect ${integ.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 py-20 text-center text-muted-foreground font-body text-sm">
              No integrations match your filters.
            </div>
          )}
        </div>

        <footer className="pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center uppercase tracking-[0.2em] font-bold">
            All integrations power the execution system in real-time
          </p>
        </footer>
      </div>

      {/* Right Panel */}
      <aside className="w-80 shrink-0 bg-surface-container-low border-l border-border p-6 space-y-6">
        <h4 className="font-sans font-black text-foreground text-sm uppercase tracking-widest">Data Pipeline Health</h4>

        {/* Sync Health */}
        <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-sans font-bold text-foreground text-sm">Overall Sync Status</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sync State</p>
              <p className="font-sans font-black text-emerald-600 text-lg">Healthy</p>
            </div>
            <p className="text-[10px] text-muted-foreground font-body">Last sync: 2m ago</p>
          </div>
        </div>

        {/* API Monitor */}
        <div>
          <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Live API Monitor</h5>
          <div className="space-y-3">
            {API_STATUS.map(api => (
              <div key={api.label} className={`flex items-center justify-between p-3 bg-surface-container-low rounded-lg ${api.status === "offline" ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2">
                  {api.icon}
                  <span className="font-body font-bold text-foreground text-xs">{api.label}</span>
                </div>
                <span className={`text-[10px] font-black ${api.status === "healthy" ? "text-emerald-600" : api.status === "delayed" ? "text-amber-600" : "text-muted-foreground"}`}>
                  {api.uptime}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Data throughput */}
        <div className="bg-primary/10 p-5 rounded-xl border border-primary/20">
          <p className="font-body text-xs text-primary/80 leading-relaxed">
            System is currently processing <span className="font-black text-primary">1.2GB</span> of execution data per hour.
          </p>
          <button className="mt-4 w-full py-2 bg-white text-primary text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-surface-container-low transition-colors">
            View Logs
          </button>
        </div>

        {/* Connected count */}
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans font-bold text-foreground text-sm">Connected</span>
            <span className="font-sans font-bold text-primary text-xl">{connected.size}</span>
          </div>
          <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(connected.size / INTEGRATIONS.length) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-body mt-2">{connected.size} of {INTEGRATIONS.length} integrations active</p>
        </div>
      </aside>

      <ByokModal
        isOpen={showByokModal}
        onClose={() => setShowByokModal(false)}
        currentProvider={aiProvider}
        onSaved={(provider) => {
          if (provider) {
            setAiProvider(provider)
            setConnected(prev => new Set(prev).add("mcp-ai"))
          } else {
            setAiProvider(null)
            setConnected(prev => { const n = new Set(prev); n.delete("mcp-ai"); return n })
          }
        }}
      />
    </div>
  )
}
