"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  ArrowLeft, Bell, HelpCircle, Sparkles, TrendingUp,
  AlertTriangle, ChevronDown, ChevronRight, Plus, ArrowLeftRight,
  Check, Send,
} from "lucide-react"
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client"

// Phase 6 Sub-pass B (continuation #13, 2026-05-08): wired to canonical
// `GET /api/v1/campaigns/:id` (real metrics + 14d trend + decisions overlay),
// `POST /:id/ai-suggestions` (BYOK-aware AI targeting), and
// `POST /:id/push` (simulated-only — Sub-pass C will land real-mode handlers).
//
// Sections that remain MOCKED-DEFERRED:
//   - ACTIONS panel ("Increase Budget +20%", "Shift Budget Across") → recommendations layer deferred
//   - Active Ad Sets table → adsets table deferred
//   - Top Creatives row → cross-Phase-5 join deferred
//   - AI Strategic Insight panel → anomaly engine DEPRECATED
//   - Recommendations / Risk Analysis right-column → no recommendations/risk_scores tables
//   - KPI period-deltas (`+4.2%` etc.) → no period-comparison endpoint yet

// Continuation #75 — Revenue removed; backend trend_14d returns date/spend/roas only.
type TrendMetric = "spend" | "roas"

interface ApiCampaignMetrics {
  spend: number
  revenue: number
  roas: number
  conversions: number
  impressions: number
  trend_14d?: Array<{ date: string; spend: number; roas: number }>
}

interface ApiCampaignDetail {
  id: string
  name: string
  platform: string
  status: string
  daily_budget: number | null
  ad_account_id: string | null
  metrics: ApiCampaignMetrics
  decisions: Array<{ id: string; title: string; confidence_score: number; status: string; action_id: string | null }>
  ai_suggestions?: AiSuggestions | null
}

interface AiSuggestions {
  interests: string[]
  age_min: number
  age_max: number
  gender: string
  daily_budget_recommendation: number
  rationale: string
  generated_at: string
}

const CREATIVE_GRADIENTS = [
  { label: "V1_Video", roas: "6.1x", grad: "linear-gradient(135deg,#005bc4,#3b82f6)" },
  { label: "V2_Static", roas: "4.8x", grad: "linear-gradient(135deg,#7c3aed,#a855f7)" },
]

const AD_SETS = [
  {
    id: "as1",
    name: "USA_Broad_SummerVibe",
    created: "Created 12 days ago",
    status: "Active",
    budget: "$500.00/day",
    spend: "$4,102.20",
    roas: "5.2x",
    roasGood: true,
    cpa: "$12.40",
    expandedByDefault: true,
  },
  {
    id: "as2",
    name: "UK_Interests_Fashion_Lover",
    created: "Created 8 days ago",
    status: "Active",
    budget: "$250.00/day",
    spend: "$1,840.10",
    roas: "1.8x",
    roasGood: false,
    cpa: "$24.10",
    expandedByDefault: false,
  },
]

const ACTIONS = [
  {
    id: "act1",
    icon: <Plus className="w-5 h-5" />,
    iconBg: "bg-emerald-50 text-emerald-600",
    tag: "SAFE",
    title: "Increase Budget +20%",
    desc: "Triggered by: 48h ROAS > 4.5x.",
  },
  {
    id: "act2",
    icon: <ArrowLeftRight className="w-5 h-5" />,
    iconBg: "bg-blue-50 text-blue-600",
    tag: "STRATEGIC",
    title: "Shift Budget Across",
    desc: 'Move from "Fashion" to "Broad".',
  },
]

const fmtCurrency = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const fmtRoas = (n: number) => `${n.toFixed(1)}x`

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params?.id as string
  const { getToken } = useAuth()

  const [campaign,    setCampaign]    = useState<ApiCampaignDetail | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)

  const [trendMetric, setTrendMetric] = useState<TrendMetric>("spend")
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set(["as1"]))
  // executing/executed state removed at #57 — the Direct Execution Layer
  // section (line 387) is MOCKED-DEFERRED (no recommendations-action
  // endpoint); fake setTimeout simulator replaced with disabled placeholder.

  const [auditRunning, setAuditRunning] = useState(false)
  const [auditError,   setAuditError]   = useState<string | null>(null)
  const [suggestions,  setSuggestions]  = useState<AiSuggestions | null>(null)

  const [pushing,     setPushing]     = useState(false)
  const [pushed,      setPushed]      = useState(false)
  const [pushError,   setPushError]   = useState<string | null>(null)

  // applyingAll/appliedAll state removed at #57 — the right-sidebar
  // Recommendations APPLY ALL button is MOCKED-DEFERRED; same swap.

  // Continuation #63 (2026-05-12) — extracted load into a reusable callback
  // so handlePush can refresh the campaign data after a successful push
  // (the campaign's status transitions e.g. draft → active server-side; the
  // FE previously left the status badge stale until full page reload).
  // useEffect retains the cancellation guard for unmount races; refresh
  // call from handlePush goes through the same fetch logic.
  async function refreshCampaign() {
    if (!campaignId) return
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, "Sign in required")
      const data = await apiClient<ApiCampaignDetail>(`/api/v1/campaigns/${campaignId}`, token)
      setCampaign(data)
      if (data.ai_suggestions) setSuggestions(data.ai_suggestions)
    } catch {
      // Best-effort refresh; failure leaves the existing campaign state in
      // place rather than wiping it. The original error already surfaced
      // via handlePush's catch.
    }
  }

  useEffect(() => {
    if (!campaignId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const token = await getToken()
        if (!token) throw new ApiError(401, "Sign in required")
        const data = await apiClient<ApiCampaignDetail>(`/api/v1/campaigns/${campaignId}`, token)
        if (!cancelled) {
          setCampaign(data)
          if (data.ai_suggestions) setSuggestions(data.ai_suggestions)
        }
      } catch (err) {
        if (!cancelled) {
          // Continuation #36: formatErrorMessage surfaces ApiError.requestId.
          setLoadError(formatErrorMessage(err, "Failed to load campaign"))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [campaignId, getToken])

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // handleExecute removed at #57 — fake setTimeout simulator deleted with
  // the disabled-placeholder UI swap on the Direct Execution Layer cards.

  async function handleAudit() {
    if (!campaignId || auditRunning) return
    setAuditRunning(true)
    setAuditError(null)
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, "Sign in required")
      const result = await apiClient<{ suggestions: AiSuggestions }>(
        `/api/v1/campaigns/${campaignId}/ai-suggestions`,
        token,
        { method: "POST" },
      )
      setSuggestions(result.suggestions)
    } catch (err) {
      // Continuation #36: formatErrorMessage surfaces ApiError.requestId.
      setAuditError(formatErrorMessage(err, "Audit failed"))
    } finally {
      setAuditRunning(false)
    }
  }

  async function handlePush() {
    if (!campaign || pushing || pushed) return
    setPushing(true)
    setPushError(null)
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, "Sign in required")
      await apiClient<{ history_id: string; action_id: string; status: string }>(
        `/api/v1/campaigns/${campaign.id}/push`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ platform: campaign.platform }),
        },
      )
      setPushed(true)
      // Continuation #63 — refresh campaign data so the status badge
      // reflects the server-side transition (e.g. draft → active after a
      // successful push). Fire-and-forget; doesn't block the success UI.
      void refreshCampaign()
    } catch (err) {
      // Continuation #36: formatErrorMessage surfaces ApiError.requestId.
      setPushError(formatErrorMessage(err, "Push failed"))
    } finally {
      setPushing(false)
    }
  }

  // handleApplyAll removed at #57 — fake setTimeout simulator deleted
  // with the disabled-placeholder swap on the right-sidebar APPLY ALL.

  // Map backend trend_14d into bar-chart heights normalized to max value.
  // Continuation #75 — revenueH dropped; "Revenue" tab removed (backend
  // trend_14d doesn't carry revenue separately — see services/campaigns/
  // campaigns.ts:277-281). Type narrowed to {spendH, roasH}.
  const trendBars = (() => {
    const t = campaign?.metrics.trend_14d ?? []
    if (t.length === 0) return [] as Array<{ key: string; spendH: number; roasH: number }>
    const maxSpend = Math.max(1, ...t.map(d => d.spend))
    const maxRoas  = Math.max(1, ...t.map(d => d.roas))
    return t.map(d => ({
      key: d.date,
      spendH: Math.round((d.spend / maxSpend) * 100),
      roasH:  Math.round((d.roas  / maxRoas)  * 100),
    }))
  })()

  const barKey = (b: { spendH: number; roasH: number }) =>
    trendMetric === "spend" ? b.spendH : b.roasH

  if (loading) {
    return <div className="p-12 text-center text-sm text-muted-foreground font-body">Loading campaign…</div>
  }
  if (loadError || !campaign) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-red-600 font-body">{loadError ?? "Campaign not found"}</p>
        <Link href="/campaigns" className="text-primary text-sm font-semibold hover:underline">← Back to Campaigns</Link>
      </div>
    )
  }

  const platformLabel = campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)
  const statusLabel   = campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)
  const canPush       = campaign.status === "draft" || campaign.status === "paused"
  // Continuation #69 (2026-05-12) — status badge color matches actual status
  // instead of hardcoded emerald. Pre-fix paused/draft/archived campaigns
  // all rendered with the same green styling as active, misleading operators
  // about live state. Mirrors the STATUS_STYLES discrimination already in
  // app/campaigns/page.tsx (#13/#55).
  const statusBadgeClass =
    campaign.status === "active"     ? "bg-emerald-100 text-emerald-700" :
    campaign.status === "paused"     ? "bg-amber-100 text-amber-700"     :
    campaign.status === "draft"      ? "bg-primary/10 text-primary"      :
    /* completed | archived | other */ "bg-surface-container-high text-muted-foreground"

  return (
    <div className="space-y-8">
      {/* Topbar */}
      <div className="flex items-center justify-between -mx-6 -mt-6 px-6 h-14 border-b border-border bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="p-1.5 rounded-lg hover:bg-surface-container-low text-muted-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-3">
            <h1 className="font-sans font-bold text-foreground text-sm">{campaign.name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${statusBadgeClass}`}>
              {statusLabel}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low text-muted-foreground text-[10px] font-semibold">
              {platformLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Continuation #87 (2026-05-12) — Export + Duplicate topbar buttons
              had no onClick handlers; no campaign-export endpoint and no
              duplicate endpoint exist. Replaced with disabled-placeholder
              treatment matching the cockpit-wide honesty pattern. */}
          <button
            disabled
            title="Campaign export pending"
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground rounded-lg opacity-50 cursor-not-allowed"
          >
            Export
          </button>
          <button
            disabled
            title="Campaign duplication pending"
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground rounded-lg opacity-50 cursor-not-allowed"
          >
            Duplicate
          </button>
          {canPush && (
            <button
              onClick={handlePush}
              disabled={pushing || pushed}
              className="px-3 py-1.5 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all disabled:opacity-70"
              style={{ background: pushed ? "#059669" : "#05345c" }}
            >
              {pushing ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Pushing…</span></>
              ) : pushed ? (
                <><Check className="w-3.5 h-3.5" /><span>Pushed</span></>
              ) : (
                <><Send className="w-3.5 h-3.5" /><span>Push</span></>
              )}
            </button>
          )}
          <button
            onClick={handleAudit}
            disabled={auditRunning}
            className="px-4 py-1.5 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all disabled:opacity-70"
            style={{ background: suggestions ? "#059669" : "linear-gradient(135deg,#005bc4,#3b82f6)" }}
          >
            {auditRunning ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Running…</span></>
            ) : suggestions ? (
              <><Check className="w-3.5 h-3.5" /><span>Audit Done</span></>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /><span>Launch AI Audit</span></>
            )}
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground"><Bell className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground"><HelpCircle className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Push / Audit feedback band */}
      {(pushError || auditError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-body rounded-lg px-4 py-2">
          {pushError ?? auditError}
        </div>
      )}
      {pushed && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-body rounded-lg px-4 py-2">
          Campaign queued for {platformLabel} platform — execution running in simulated mode (real-mode handlers land in Phase 6 Sub-pass C).
        </div>
      )}

      {/* Body grid */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-8 space-y-8">

          {/* KPI Cards — values from backend; deltas remain placeholders (no period-compare endpoint) */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Spend", value: fmtCurrency(campaign.metrics.spend),   color: "text-foreground" },
              { label: "Revenue",     value: fmtCurrency(campaign.metrics.revenue), color: "text-foreground" },
              { label: "ROAS",        value: fmtRoas(campaign.metrics.roas),         color: "text-primary"     },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-border p-6 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{k.label}</p>
                <div className="flex items-baseline gap-2">
                  <h2 className={`text-3xl font-extrabold tracking-tight font-sans ${k.color}`}>{k.value}</h2>
                </div>
              </div>
            ))}
          </div>

          {/* AI Audit Suggestions panel — populated by POST /:id/ai-suggestions */}
          {suggestions && (
            <section className="bg-white rounded-xl border border-primary/20 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-sans font-bold text-foreground text-sm uppercase tracking-widest">AI Targeting Suggestions</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm font-body">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Interests</p>
                  <p className="text-foreground font-medium">{suggestions.interests.join(", ")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Age Range</p>
                  <p className="text-foreground font-medium">{suggestions.age_min}–{suggestions.age_max}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gender</p>
                  <p className="text-foreground font-medium">{suggestions.gender}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recommended Daily Budget</p>
                  <p className="text-foreground font-bold">{fmtCurrency(suggestions.daily_budget_recommendation)}</p>
                </div>
              </div>
              {suggestions.rationale && (
                <p className="mt-4 text-xs text-muted-foreground font-body leading-relaxed">{suggestions.rationale}</p>
              )}
            </section>
          )}

          {/* Direct Execution Layer — MOCKED-DEFERRED (recommendations
              layer). Continuation #79 (2026-05-12) — added "Sample" badge
              matching the #76/#78 honesty pattern on the section header.
              Buttons inside were already disabled at #57; the section as a
              whole now also flags its illustrative nature. */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <h3 className="font-sans font-extrabold text-foreground text-lg whitespace-nowrap">Direct Execution Layer</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body shrink-0">Sample</span>
              <div className="h-px flex-1 bg-surface-container-high" />
              <span className="text-[11px] text-muted-foreground font-body shrink-0">Recommendations layer pending</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
              {ACTIONS.map(act => (
                <div key={act.id} className="group bg-white p-5 rounded-xl border border-border shadow-sm transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg ${act.iconBg} transition-colors`}>{act.icon}</div>
                    <span className="text-[9px] font-bold text-muted-foreground bg-surface-container-low px-2 py-0.5 rounded">{act.tag}</span>
                  </div>
                  <h4 className="font-sans font-bold text-foreground text-sm mb-1">{act.title}</h4>
                  <p className="font-body text-[10px] text-muted-foreground leading-relaxed mb-4">{act.desc}</p>
                  {/* Continuation #57 — Execute Action button had no
                      backend handler; only a setTimeout simulator that
                      flashed "Executed!" with no real action. The entire
                      Direct Execution Layer is MOCKED-DEFERRED. Replaced
                      with disabled-placeholder matching #55/#56 pattern. */}
                  <button
                    disabled
                    title="Recommendations execution pipeline pending"
                    className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 bg-surface-container-high text-muted-foreground opacity-50 cursor-not-allowed"
                  >
                    Execute Action
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Trend Analysis — bars from backend metrics.trend_14d */}
          <div className="bg-white rounded-xl border border-border p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-sans font-bold text-foreground text-lg">Trend Analysis</h3>
              {/* Continuation #75 (2026-05-12) — "Revenue" toggle removed
                  from the trend metric tabs. Pre-fix the Revenue tab showed
                  the same data as Spend because backend `trend_14d` doesn't
                  carry revenue separately (campaigns service returns
                  date/spend/roas only — vals.revenue is dropped at line
                  277-281 of services/campaigns/campaigns.ts). The dishonest
                  "Revenue" toggle misled operators who expected revenue
                  trends. Tabs narrowed to Spend / ROAS — the two metrics
                  the backend actually returns. When backend extends
                  trend_14d to include revenue, just add "revenue" back
                  here and remove the line 258 revenueH-from-spend hack. */}
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
                {(["spend", "roas"] as TrendMetric[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setTrendMetric(m)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all capitalize ${trendMetric === m ? "bg-white text-primary shadow-sm border border-border" : "text-muted-foreground hover:bg-white/50"}`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {trendBars.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body text-center py-8">No trend data available yet.</p>
            ) : (
              <div className="h-64 flex items-end justify-between gap-2 px-2">
                {trendBars.map(b => (
                  <div key={b.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{ height: `${barKey(b)}%`, background: "linear-gradient(to top,#005bc4,#3b82f6)" }}
                    />
                    <span className="text-[10px] text-muted-foreground font-body mt-2">{b.key.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Ad Sets — MOCKED-DEFERRED (adsets table). Continuation
              #78 (2026-05-12) — added "Sample" badge + de-emphasized opacity
              to honestly mark the section as illustrative until the adsets
              schema/endpoint lands in a future phase. Matches the same
              pattern from #76 on the Channel Correlation chart. */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-foreground text-lg">Active Ad Sets</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-body">
                Ad set tracking pending — schema not yet deployed.
              </p>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border">
                  <th className="px-6 py-4">Ad Set Name</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Budget</th>
                  <th className="px-4 py-4">Spend</th>
                  <th className="px-4 py-4">ROAS</th>
                  <th className="px-4 py-4">CPA</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border opacity-60">
                {AD_SETS.map(as => (
                  <>
                    <tr
                      key={as.id}
                      onClick={() => toggleExpand(as.id)}
                      className="group hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <div className="font-sans font-bold text-foreground text-sm">{as.name}</div>
                        <div className="text-[11px] text-muted-foreground font-body">{as.created}</div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-foreground">{as.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm font-medium text-foreground">{as.budget}</td>
                      <td className="px-4 py-5 text-sm font-medium text-foreground">{as.spend}</td>
                      <td className={`px-4 py-5 text-sm font-bold ${as.roasGood ? "text-primary" : "text-red-500"}`}>{as.roas}</td>
                      <td className="px-4 py-5 text-sm font-medium text-foreground">{as.cpa}</td>
                      <td className="px-4 py-5 text-right text-muted-foreground">
                        {expanded.has(as.id) ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
                      </td>
                    </tr>
                    {expanded.has(as.id) && (
                      <tr key={`${as.id}-exp`} className="bg-surface-container-low/40">
                        <td colSpan={7} className="px-6 py-6">
                          <div className="flex gap-4 overflow-x-auto">
                            {CREATIVE_GRADIENTS.map(c => (
                              <div key={c.label} className="shrink-0 w-32 space-y-2">
                                <div
                                  className="h-40 rounded-lg"
                                  style={{ background: c.grad }}
                                />
                                <div className="flex justify-between px-1">
                                  <span className="text-[10px] font-bold text-foreground">{c.label}</span>
                                  <span className="text-[10px] font-bold text-primary">{c.roas}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — MOCKED-DEFERRED (anomaly engine + recommendations +
            risk_scores). Continuation #79 (2026-05-12) — entire right
            sidebar marked Sample. AI Strategic Insight + Recommendations
            cards display hardcoded copy that references fabricated numbers
            ("12% drop in 48h", "+24% CPA"); operators viewing the detail
            page see these as real anomaly findings, but the anomaly engine
            is Phase 3 DEPRECATED+DEFERRED. The wrapper-level opacity
            applies to all sub-cards inside. */}
        <div className="col-span-12 lg:col-span-4 sticky top-20 space-y-6 h-fit opacity-70">

          {/* AI Strategic Insight */}
          <section className="bg-primary/5 p-6 rounded-xl border border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-16 h-16 text-primary" />
            </div>
            <div className="flex items-center gap-2 mb-3 justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-widest">AI Strategic Insight</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
            </div>
            <h4 className="font-sans font-bold text-foreground text-base mb-2">Performance alert detected</h4>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Global campaign performance dropped 12% in the last 48 hours due to a significant{" "}
              <span className="font-bold text-foreground">CPA increase (+24%)</span> in 2 specific ad sets.
            </p>
            <p className="font-body text-[10px] text-muted-foreground italic mt-3">
              Illustrative — anomaly engine pending Phase 3 unlock.
            </p>
          </section>

          {/* Recommendations */}
          <section className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Recommendations</h3>
              {/* Continuation #57 — APPLY ALL had no backend; setTimeout
                  simulator only. Right-sidebar Recommendations section is
                  MOCKED-DEFERRED (anomaly + recommendations layer). */}
              <button
                disabled
                title="Bulk apply pipeline pending"
                className="text-[10px] font-bold text-muted-foreground opacity-50 cursor-not-allowed"
              >
                APPLY ALL
              </button>
            </div>
            <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
              <div className="flex gap-4 p-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer">
                <div className="bg-white p-2 h-fit rounded shadow-sm">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h5 className="font-sans font-bold text-foreground text-sm">Reallocate budget</h5>
                  <p className="font-body text-xs text-muted-foreground mt-1 leading-snug">Move $150/day from UK to USA_Broad.</p>
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">Impact High</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 self-center" />
              </div>
            </div>
          </section>

          {/* Risk Analysis */}
          <section
            className="p-6 rounded-xl relative overflow-hidden shadow-xl"
            style={{ background: "linear-gradient(135deg,#05345c,#0f172a)" }}
          >
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-3xl" style={{ background: "#005bc433" }} />
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Execution Risk</span>
            </div>
            <div className="space-y-4">
              <div>
                <h5 className="font-sans font-bold text-white text-sm mb-1">Learning Phase Reset</h5>
                <p className="font-body text-xs text-slate-400 leading-relaxed">
                  Current AI model suggests a{" "}
                  <span className="text-white font-bold">84% risk</span> of re-entering learning phase.
                </p>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: "84%" }} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
