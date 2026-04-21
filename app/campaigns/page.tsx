"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { Plus, TrendingUp, Pause, Play } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface CampaignMetrics {
  spend: number
  revenue: number
  roas: number
  conversions: number
  impressions: number
}

interface Campaign {
  id: string
  name: string
  platform: string
  status: string
  daily_budget: number | null
  metrics: CampaignMetrics
  created_at: string
}

const STATUS_FILTERS = ["all", "active", "paused", "draft", "completed"]

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700",
  paused:    "bg-yellow-100 text-yellow-700",
  draft:     "bg-surface-container-high text-muted-foreground",
  completed: "bg-blue-100 text-blue-700",
  archived:  "bg-gray-100 text-gray-500",
}

function fmtCurrency(v: number) {
  return v >= 1000
    ? `$${(v / 1000).toFixed(1)}k`
    : `$${v.toFixed(0)}`
}

function fmtRoas(v: number) {
  return `${v.toFixed(2)}x`
}

export default function CampaignsPage() {
  const { getToken } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()
        if (!token) return
        const params = new URLSearchParams({ limit: "50", offset: "0" })
        if (status !== "all") params.set("status", status)
        const data = await apiClient<{ campaigns: Campaign[]; total: number }>(
          `/api/v1/campaigns?${params.toString()}`,
          token
        )
        setCampaigns(data.campaigns ?? [])
        setTotal(data.total ?? 0)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load campaigns")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken, status])

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground font-sans">Campaigns</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {loading ? "Loading…" : `${total} campaign${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/campaigns/create">
          <button className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity font-body">
            <Plus size={16} /> New Campaign
          </button>
        </Link>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-colors font-body ${
              status === s
                ? "bg-primary text-white"
                : "bg-surface-container-low text-muted-foreground hover:bg-surface-container-high"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-body">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-container-low rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && campaigns.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <TrendingUp size={48} className="mx-auto text-muted-foreground/30" />
          <div>
            <p className="font-bold text-foreground font-sans">No campaigns yet</p>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Connect an integration and sync campaign data, or create your first campaign.
            </p>
          </div>
          <Link href="/campaigns/create">
            <button className="mt-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold font-body">
              Create Campaign
            </button>
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && campaigns.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-[11px] uppercase tracking-wider text-muted-foreground font-bold font-body">
                <th className="px-6 py-4">Campaign</th>
                <th className="px-4 py-4">Platform</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Spend (30d)</th>
                <th className="px-4 py-4 text-right">Revenue</th>
                <th className="px-4 py-4 text-right">ROAS</th>
                <th className="px-4 py-4 text-right">Conversions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {campaigns.map((c) => (
                <Link key={c.id} href={`/campaigns/${c.id}`} legacyBehavior>
                  <tr className="hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground font-sans text-sm group-hover:text-primary transition-colors">
                        {c.name}
                      </p>
                      {c.daily_budget && (
                        <p className="text-[11px] text-muted-foreground font-body mt-0.5">
                          Budget {fmtCurrency(c.daily_budget)}/day
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold capitalize text-muted-foreground font-body">
                        {c.platform}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide font-body ${
                          STATUS_STYLES[c.status] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-foreground font-body">
                      {fmtCurrency(c.metrics.spend)}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-foreground font-body">
                      {fmtCurrency(c.metrics.revenue)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className={`text-sm font-bold font-body ${
                          c.metrics.roas >= 3 ? "text-primary" : c.metrics.roas >= 1 ? "text-foreground" : "text-red-600"
                        }`}
                      >
                        {fmtRoas(c.metrics.roas)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-foreground font-body">
                      {c.metrics.conversions.toLocaleString()}
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick actions legend */}
      {!loading && campaigns.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
          <span className="flex items-center gap-1"><Pause size={12} /> Pause</span>
          <span className="flex items-center gap-1"><Play size={12} /> Activate</span>
          <span>Click any row to view details</span>
        </div>
      )}
    </div>
  )
}
