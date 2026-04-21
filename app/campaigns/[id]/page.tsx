"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Sparkles,
  Pause,
  Play,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
} from "lucide-react"
import { apiClient, ApiError } from "@/lib/api-client"

interface TrendPoint {
  date: string
  spend: number
  roas: number
}

interface Decision {
  id: string
  title: string
  confidence_score: number
  status: string
  action_id: string | null
}

interface CampaignDetail {
  id: string
  name: string
  platform: string
  status: string
  daily_budget: number | null
  targeting: Record<string, unknown>
  ai_suggestions: Record<string, unknown> | null
  metrics: {
    spend: number
    revenue: number
    roas: number
    conversions: number
    impressions: number
    trend_14d: TrendPoint[]
  }
  decisions: Decision[]
  created_at: string
  updated_at: string
}

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

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { getToken } = useAuth()
  const router = useRouter()

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patching, setPatching] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const data = await apiClient<CampaignDetail>(`/api/v1/campaigns/${id}`, token)
      setCampaign(data)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError("Campaign not found")
      } else {
        setError(e instanceof Error ? e.message : "Failed to load campaign")
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, id])

  useEffect(() => { load() }, [load])

  async function updateStatus(newStatus: string) {
    if (!campaign) return
    setPatching(true)
    setPatchError(null)
    try {
      const token = await getToken()
      if (!token) return
      const updated = await apiClient<CampaignDetail>(`/api/v1/campaigns/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      setCampaign(updated)
    } catch (e) {
      setPatchError(e instanceof Error ? e.message : "Update failed")
    } finally {
      setPatching(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-surface-container-low rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface-container-low rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-surface-container-low rounded-2xl" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertCircle size={48} className="mx-auto text-red-300" />
        <p className="font-bold text-foreground">{error ?? "Campaign not found"}</p>
        <button
          onClick={() => router.push("/campaigns")}
          className="text-primary text-sm font-bold hover:underline"
        >
          ← Back to Campaigns
        </button>
      </div>
    )
  }

  const trend = campaign.metrics.trend_14d ?? []
  const maxSpend = Math.max(...trend.map((t) => t.spend), 1)
  const nextStatus = campaign.status === "active" ? "paused" : campaign.status === "paused" ? "active" : null

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/campaigns">
          <button className="p-2 rounded-xl hover:bg-surface-container-low text-muted-foreground hover:text-primary transition-colors mt-0.5">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-foreground font-sans">{campaign.name}</h1>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide font-body ${
                STATUS_STYLES[campaign.status] ?? "bg-gray-100 text-gray-500"
              }`}
            >
              {campaign.status}
            </span>
            <span className="text-xs font-semibold capitalize px-2 py-1 bg-surface-container-low rounded-full text-muted-foreground font-body">
              {campaign.platform}
            </span>
          </div>
          {campaign.daily_budget && (
            <p className="text-sm text-muted-foreground font-body mt-1">
              Budget: ${campaign.daily_budget.toLocaleString()}/day
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {nextStatus && (
            <button
              disabled={patching}
              onClick={() => updateStatus(nextStatus)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-bold font-body hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              {nextStatus === "paused" ? <Pause size={14} /> : <Play size={14} />}
              {nextStatus === "paused" ? "Pause" : "Activate"}
            </button>
          )}
          <Link href={`/campaigns/${id}/push`}>
            <button className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold font-body shadow-md hover:opacity-90 transition-all">
              Push to Platform
            </button>
          </Link>
        </div>
      </div>

      {patchError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-body">
          {patchError}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Spend (30d)", value: fmtCurrency(campaign.metrics.spend), Icon: DollarSign, color: "text-foreground" },
          { label: "Revenue",     value: fmtCurrency(campaign.metrics.revenue), Icon: TrendingUp, color: "text-foreground" },
          { label: "ROAS",        value: `${campaign.metrics.roas.toFixed(2)}x`, Icon: TrendingUp,
            color: campaign.metrics.roas >= 3 ? "text-primary" : campaign.metrics.roas >= 1 ? "text-foreground" : "text-red-600" },
          { label: "Conversions", value: campaign.metrics.conversions.toLocaleString(), Icon: Users, color: "text-foreground" },
        ].map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-body">
              {card.label}
            </p>
            <p className={`text-3xl font-extrabold tracking-tight font-sans ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Trend + Decisions */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* 14-day trend */}
          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="text-base font-bold text-foreground font-sans mb-6">14-day Spend Trend</h3>
            {trend.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground font-body">
                No trend data available yet
              </div>
            ) : (
              <div className="h-40 flex items-end gap-1">
                {trend.map((t) => (
                  <div key={t.date} className="flex-1 flex flex-col items-center gap-1 justify-end h-full group">
                    <div
                      className="w-full bg-primary/20 group-hover:bg-primary/40 transition-colors rounded-t relative"
                      style={{ height: `${Math.max(4, (t.spend / maxSpend) * 100)}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-muted-foreground whitespace-nowrap hidden group-hover:block">
                        {fmtCurrency(t.spend)}
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-body">
                      {t.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decisions Overlay */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-surface-container-low flex items-center gap-3">
              <Sparkles size={18} className="text-primary" />
              <h3 className="text-base font-bold text-foreground font-sans">AI Decisions</h3>
              <span className="ml-auto text-xs font-semibold text-muted-foreground font-body">
                {campaign.decisions.length} active
              </span>
            </div>

            {campaign.decisions.length === 0 ? (
              <div className="p-12 text-center">
                <Eye size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-body">
                  No active decisions for this campaign.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-surface-container-low">
                {campaign.decisions.map((d) => (
                  <div key={d.id} className="p-5 flex items-start gap-4 hover:bg-surface-container-low transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground font-sans">{d.title}</p>
                      <p className="text-[11px] text-muted-foreground font-body mt-1">
                        Confidence: {d.confidence_score}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[11px] font-bold px-2 py-1 rounded-full font-body ${
                          d.confidence_score >= 80
                            ? "bg-emerald-100 text-emerald-700"
                            : d.confidence_score >= 60
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {d.confidence_score}%
                      </span>
                      {d.action_id && (
                        <Link href={`/actions/${d.action_id}`}>
                          <button className="text-xs font-bold text-primary hover:underline font-body whitespace-nowrap">
                            Execute →
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Suggestions + Targeting */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* AI Suggestions panel */}
          {campaign.ai_suggestions && (
            <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-primary" />
                <h4 className="text-sm font-bold text-foreground font-sans">AI Suggestions</h4>
              </div>
              <div className="space-y-3">
                {Array.isArray(campaign.ai_suggestions.interests) && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 font-body">
                      Interests
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(campaign.ai_suggestions.interests as string[]).map((i) => (
                        <span key={i} className="text-[11px] font-semibold px-2 py-0.5 bg-white border border-border rounded-full font-body">
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.ai_suggestions.age_min != null && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 font-body">
                      Age Range
                    </p>
                    <p className="text-sm font-semibold text-foreground font-body">
                      {campaign.ai_suggestions.age_min as number} – {campaign.ai_suggestions.age_max as number}
                    </p>
                  </div>
                )}
                {campaign.ai_suggestions.daily_budget_recommendation != null && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 font-body">
                      Recommended Budget
                    </p>
                    <p className="text-sm font-semibold text-foreground font-body">
                      ${(campaign.ai_suggestions.daily_budget_recommendation as number).toLocaleString()}/day
                    </p>
                  </div>
                )}
                {typeof campaign.ai_suggestions.rationale === "string" && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-body">
                    {campaign.ai_suggestions.rationale}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Targeting summary */}
          {Object.keys(campaign.targeting).length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
              <h4 className="text-sm font-bold text-foreground font-sans mb-4">Targeting</h4>
              <div className="space-y-2">
                {Object.entries(campaign.targeting).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="font-bold text-muted-foreground capitalize font-body">{key.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-foreground font-body">
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
