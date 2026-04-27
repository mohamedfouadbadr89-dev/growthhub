"use client"

import { useState, useMemo } from "react"
import {
  Brain, Zap, Shield, Activity, TrendingUp, TrendingDown,
  Clock, CheckCircle2, AlertTriangle, Loader2, RefreshCw,
  ChevronRight, Filter, Layers, BarChart2,
} from "lucide-react"

// ─── Type Definitions (mirrors API: GET /api/v1/automation/decision-center) ───

type RiskLevel = "low" | "medium" | "high"
type AutomationMode = "autonomous" | "manual"
type StreamType = "budget" | "creative" | "bidding" | "audience"
type StreamStatus = "active" | "learning" | "paused"
type FeedType = "scale" | "pause" | "reallocate" | "test"
type ClusterStatus = "healthy" | "unstable" | "declining"

interface DecisionStream {
  id: string
  name: string
  type: StreamType
  status: StreamStatus
  confidence: number
  last_decision: {
    action: string
    impact: number
    timestamp: string
  }
  impact_score: number
}

interface DecisionFeedItem {
  id: string
  type: FeedType
  message: string
  trigger_reason: string
  recommended_action: string
  timestamp: string
}

interface StrategyCluster {
  name: string
  automations_count: number
  performance_score: number
  status: ClusterStatus
}

interface AutomationDecisionCenter {
  summary: {
    system_health: number
    active_strategies: number
    risk_level: RiskLevel
    mode: AutomationMode
    generated_at: string
  }
  decision_streams: DecisionStream[]
  decision_feed: DecisionFeedItem[]
  clusters: StrategyCluster[]
}

// ─── Mock Data (shape matches API response — replace with apiClient call) ─────
// API: GET /api/v1/automation/decision-center

const MOCK: AutomationDecisionCenter = {
  summary: {
    system_health: 87,
    active_strategies: 12,
    risk_level: "medium",
    mode: "autonomous",
    generated_at: "2026-04-27T10:30:00Z",
  },
  decision_streams: [
    {
      id: "ds-001",
      name: "Meta Budget Optimizer",
      type: "budget",
      status: "active",
      confidence: 91,
      last_decision: { action: "Increase daily budget +15%", impact: 8.2, timestamp: "2026-04-27T10:25:00Z" },
      impact_score: 8.2,
    },
    {
      id: "ds-002",
      name: "Creative Refresh Detector",
      type: "creative",
      status: "active",
      confidence: 76,
      last_decision: { action: "Flag 3 fatigued creatives", impact: 6.1, timestamp: "2026-04-27T10:20:00Z" },
      impact_score: 6.1,
    },
    {
      id: "ds-003",
      name: "Google Bid Strategy",
      type: "bidding",
      status: "learning",
      confidence: 58,
      last_decision: { action: "Switch to Target CPA", impact: 4.5, timestamp: "2026-04-27T09:55:00Z" },
      impact_score: 4.5,
    },
    {
      id: "ds-004",
      name: "Lookalike Audience Expansion",
      type: "audience",
      status: "active",
      confidence: 84,
      last_decision: { action: "Expand 1% → 2% LAL", impact: 7.0, timestamp: "2026-04-27T09:40:00Z" },
      impact_score: 7.0,
    },
    {
      id: "ds-005",
      name: "TikTok Budget Realloc",
      type: "budget",
      status: "paused",
      confidence: 43,
      last_decision: { action: "Awaiting more data", impact: 2.1, timestamp: "2026-04-27T08:00:00Z" },
      impact_score: 2.1,
    },
  ],
  decision_feed: [
    {
      id: "feed-001",
      type: "scale",
      message: "Summer Collection campaign ROAS at 4.6x — above 3x threshold.",
      trigger_reason: "ROAS exceeded scale threshold for 3 consecutive days.",
      recommended_action: "Increase budget by 20% on Meta campaign #4421.",
      timestamp: "2026-04-27T10:28:00Z",
    },
    {
      id: "feed-002",
      type: "reallocate",
      message: "Google Display underperforming vs Search — CPA 2.4x higher.",
      trigger_reason: "CPA disparity detected across campaign types.",
      recommended_action: "Reallocate 30% of Display budget to Search.",
      timestamp: "2026-04-27T10:15:00Z",
    },
    {
      id: "feed-003",
      type: "test",
      message: "Creative frequency above 3.8 on Retargeting — fatigue detected.",
      trigger_reason: "High frequency + declining CTR signal creative fatigue.",
      recommended_action: "Rotate in 2 new ad creatives from brand kit.",
      timestamp: "2026-04-27T09:50:00Z",
    },
    {
      id: "feed-004",
      type: "pause",
      message: "TikTok campaign stuck in learning phase after 7 days.",
      trigger_reason: "Insufficient conversions to exit learning phase.",
      recommended_action: "Pause and restructure with broader audience.",
      timestamp: "2026-04-27T09:30:00Z",
    },
  ],
  clusters: [
    { name: "Top-of-Funnel Growth", automations_count: 4, performance_score: 88, status: "healthy" },
    { name: "Retargeting Engine", automations_count: 3, performance_score: 72, status: "unstable" },
    { name: "LTV Maximisation", automations_count: 3, performance_score: 91, status: "healthy" },
    { name: "Creative Testing Loop", automations_count: 2, performance_score: 45, status: "declining" },
  ],
}

// ─── Filter Options (driven by spec: platform / decision_type / confidence / impact) ─

const STREAM_TYPE_OPTIONS: { value: StreamType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "budget", label: "Budget" },
  { value: "creative", label: "Creative" },
  { value: "bidding", label: "Bidding" },
  { value: "audience", label: "Audience" },
]

const FEED_TYPE_OPTIONS: { value: FeedType | "all"; label: string }[] = [
  { value: "all", label: "All Decisions" },
  { value: "scale", label: "Scale" },
  { value: "pause", label: "Pause" },
  { value: "reallocate", label: "Reallocate" },
  { value: "test", label: "Test" },
]

const CONFIDENCE_OPTIONS: { value: "all" | "high" | "medium" | "low"; label: string }[] = [
  { value: "all", label: "All Confidence" },
  { value: "high", label: "High (≥80)" },
  { value: "medium", label: "Medium (50–79)" },
  { value: "low", label: "Low (<50)" },
]

// ─── Display Helpers ──────────────────────────────────────────────────────────

const STREAM_TYPE_STYLE: Record<StreamType, string> = {
  budget: "bg-blue-50 text-blue-700",
  creative: "bg-violet-50 text-violet-700",
  bidding: "bg-amber-50 text-amber-700",
  audience: "bg-emerald-50 text-emerald-700",
}

const STREAM_STATUS_STYLE: Record<StreamStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  learning: "bg-amber-100 text-amber-700",
  paused: "bg-surface-container-high text-muted-foreground",
}

const STREAM_STATUS_DOT: Record<StreamStatus, string> = {
  active: "bg-emerald-500 animate-pulse",
  learning: "bg-amber-400",
  paused: "bg-muted-foreground/30",
}

const FEED_TYPE_STYLE: Record<FeedType, { badge: string; icon: string }> = {
  scale: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "text-emerald-600" },
  pause: { badge: "bg-red-50 text-red-700 border-red-200", icon: "text-red-500" },
  reallocate: { badge: "bg-blue-50 text-blue-700 border-blue-200", icon: "text-blue-600" },
  test: { badge: "bg-violet-50 text-violet-700 border-violet-200", icon: "text-violet-600" },
}

const CLUSTER_STATUS_STYLE: Record<ClusterStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-700",
  unstable: "bg-amber-100 text-amber-700",
  declining: "bg-red-100 text-red-700",
}

const RISK_STYLE: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
}

function confidenceBand(c: number): "high" | "medium" | "low" {
  if (c >= 80) return "high"
  if (c >= 50) return "medium"
  return "low"
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecisionCenterPage() {
  // ── Data state (swap MOCK → apiClient response for API integration) ──────
  const [data] = useState<AutomationDecisionCenter>(MOCK)
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  // ── Filter state ─────────────────────────────────────────────────────────
  const [streamTypeFilter, setStreamTypeFilter] = useState<StreamType | "all">("all")
  const [feedTypeFilter, setFeedTypeFilter] = useState<FeedType | "all">("all")
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "medium" | "low">("all")

  // ── Derived filtered lists ────────────────────────────────────────────────
  const filteredStreams = useMemo(() => {
    return data.decision_streams.filter(s => {
      const typeOk = streamTypeFilter === "all" || s.type === streamTypeFilter
      const confOk = confidenceFilter === "all" || confidenceBand(s.confidence) === confidenceFilter
      return typeOk && confOk
    })
  }, [data.decision_streams, streamTypeFilter, confidenceFilter])

  const filteredFeed = useMemo(() => {
    return data.decision_feed.filter(f => {
      return feedTypeFilter === "all" || f.type === feedTypeFilter
    })
  }, [data.decision_feed, feedTypeFilter])

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-sm text-muted-foreground font-body">{error}</p>
        <button className="px-4 py-2 text-xs font-bold rounded-lg border border-border hover:bg-surface-container-low transition-colors flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  const { summary } = data

  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-sans font-extrabold text-foreground text-2xl tracking-tight">Decision Center</h1>
            <p className="font-body text-muted-foreground text-sm mt-0.5">
              The brain — detects signals, generates decisions, routes to execution.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Updated {relativeTime(summary.generated_at)}
          </span>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-surface-container-low transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Summary KPIs (mapped from summary.*) ────────────────────────── */}
      <section className="grid grid-cols-4 gap-4">
        {/* system_health */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-primary w-5 h-5" />
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${summary.system_health >= 80 ? "bg-emerald-100 text-emerald-700" : summary.system_health >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
              {summary.system_health >= 80 ? "Optimal" : summary.system_health >= 60 ? "Degraded" : "Critical"}
            </span>
          </div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">System Health</p>
          <p className="font-sans font-extrabold text-3xl text-foreground">{summary.system_health}<span className="text-lg text-muted-foreground font-normal">%</span></p>
          <div className="mt-3 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${summary.system_health}%` }} />
          </div>
        </div>

        {/* active_strategies */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-violet-600" />
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Active Strategies</p>
          <p className="font-sans font-extrabold text-3xl text-foreground">{summary.active_strategies}</p>
          <p className="text-[11px] font-body text-muted-foreground mt-3">running across all streams</p>
        </div>

        {/* risk_level */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${RISK_STYLE[summary.risk_level]}`}>
              {summary.risk_level}
            </span>
          </div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Risk Level</p>
          <p className="font-sans font-extrabold text-3xl text-foreground capitalize">{summary.risk_level}</p>
          <p className="text-[11px] font-body text-muted-foreground mt-3">overall portfolio exposure</p>
        </div>

        {/* mode */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${summary.mode === "autonomous" ? "bg-primary/10" : "bg-surface-container-high"}`}>
              <Brain className={`w-5 h-5 ${summary.mode === "autonomous" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${summary.mode === "autonomous" ? "bg-primary/10 text-primary" : "bg-surface-container-high text-muted-foreground"}`}>
              {summary.mode}
            </span>
          </div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Automation Mode</p>
          <p className="font-sans font-extrabold text-3xl text-foreground capitalize">{summary.mode}</p>
          <p className="text-[11px] font-body text-muted-foreground mt-3">
            {summary.mode === "autonomous" ? "Decisions queue automatically" : "Manual approval required"}
          </p>
        </div>
      </section>

      {/* ── Filter Bar (platform / decision_type / confidence / impact) ─── */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" /> Filters
        </div>
        <div className="w-px h-5 bg-border" />

        {/* Stream type filter */}
        <div className="flex bg-surface-container-low rounded-xl p-1 gap-0.5">
          {STREAM_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStreamTypeFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${streamTypeFilter === opt.value ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Confidence filter */}
        <div className="flex bg-surface-container-low rounded-xl p-1 gap-0.5">
          {CONFIDENCE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setConfidenceFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${confidenceFilter === opt.value ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Main Grid: Decision Streams + Live Feed ──────────────────────── */}
      <section className="grid grid-cols-12 gap-6">

        {/* Decision Streams (left, 7 cols) — mapped from decision_streams[] */}
        <div className="col-span-7 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-sans font-bold text-foreground text-base">Decision Streams</h3>
              <p className="text-[11px] font-body text-muted-foreground">Core automation engine · {filteredStreams.length} streams</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {filteredStreams.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground font-body text-sm">
              No streams match the current filters.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredStreams.map(stream => (
                <div key={stream.id} className="px-6 py-5 hover:bg-surface-container-low/40 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${STREAM_STATUS_DOT[stream.status]}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-sans font-bold text-foreground text-sm">{stream.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STREAM_TYPE_STYLE[stream.type]}`}>
                            {stream.type}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STREAM_STATUS_STYLE[stream.status]}`}>
                            {stream.status}
                          </span>
                        </div>
                        <p className="text-xs font-body text-muted-foreground mt-1 truncate">
                          Last: {stream.last_decision.action}
                        </p>
                        <p className="text-[10px] font-body text-muted-foreground/60 mt-0.5">
                          {relativeTime(stream.last_decision.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {/* confidence */}
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confidence</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-16 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${stream.confidence >= 80 ? "bg-emerald-500" : stream.confidence >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                              style={{ width: `${stream.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-foreground">{stream.confidence}%</span>
                        </div>
                      </div>

                      {/* impact */}
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Impact</p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          {stream.impact_score >= 6 ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          <span className="text-xs font-bold text-foreground">{stream.impact_score.toFixed(1)}</span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Decision Feed (right, 5 cols) — mapped from decision_feed[] */}
        <div className="col-span-5 bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-sans font-bold text-foreground text-base">Live Decision Feed</h3>
                <p className="text-[11px] font-body text-muted-foreground">Recommendations only — no auto-execution</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            {/* Feed type filter */}
            <div className="flex gap-1 flex-wrap">
              {FEED_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFeedTypeFilter(opt.value)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors border ${feedTypeFilter === opt.value ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-surface-container-low"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filteredFeed.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground font-body text-sm">
                No decisions match this filter.
              </div>
            ) : (
              filteredFeed.map(item => (
                <div key={item.id} className="p-5 hover:bg-surface-container-low/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shrink-0 mt-0.5 ${FEED_TYPE_STYLE[item.type].badge}`}>
                      {item.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">{item.message}</p>
                      <p className="text-[11px] font-body text-muted-foreground mt-1.5 leading-relaxed">
                        <span className="font-bold text-foreground/70">Why: </span>{item.trigger_reason}
                      </p>
                      <div className="mt-2.5 px-3 py-2 bg-surface-container-low rounded-lg">
                        <p className="text-[11px] font-body text-foreground/80 leading-relaxed">
                          <span className="font-bold text-primary">→ </span>{item.recommended_action}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 mt-2.5 text-[10px] text-muted-foreground/60 font-body">
                        <Clock className="w-3 h-3" />
                        <span>{relativeTime(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Strategy Clusters — mapped from clusters[] ───────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-sans font-bold text-foreground text-base">Strategy Clusters</h3>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {data.clusters.length} clusters
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {data.clusters.map(cluster => (
            <div
              key={cluster.name}
              className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/10 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center">
                  <BarChart2 className="w-4.5 h-4.5 text-foreground/60 w-5 h-5" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${CLUSTER_STATUS_STYLE[cluster.status]}`}>
                  {cluster.status}
                </span>
              </div>
              <h4 className="font-sans font-bold text-foreground text-sm leading-tight">{cluster.name}</h4>
              <p className="text-[11px] font-body text-muted-foreground mt-1">{cluster.automations_count} automations</p>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Performance</span>
                  <span className="text-xs font-bold text-foreground">{cluster.performance_score}%</span>
                </div>
                <div className="h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${cluster.performance_score >= 80 ? "bg-emerald-500" : cluster.performance_score >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${cluster.performance_score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
