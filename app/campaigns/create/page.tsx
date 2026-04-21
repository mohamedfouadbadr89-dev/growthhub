"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles, Loader2, Send, Save } from "lucide-react"
import { apiClient, ApiError } from "@/lib/api-client"

interface AiSuggestions {
  interests: string[]
  age_min: number
  age_max: number
  gender: string
  daily_budget_recommendation: number
  rationale: string
  generated_at: string
}

const PLATFORMS = ["meta", "google"] as const
type Platform = (typeof PLATFORMS)[number]

export default function CreateCampaignPage() {
  const { getToken } = useAuth()
  const router = useRouter()

  const [name, setName]              = useState("")
  const [platform, setPlatform]      = useState<Platform>("meta")
  const [dailyBudget, setDailyBudget] = useState<string>("")
  const [interests, setInterests]    = useState("")
  const [ageMin, setAgeMin]          = useState("25")
  const [ageMax, setAgeMax]          = useState("44")
  const [gender, setGender]          = useState("all")

  const [campaignId, setCampaignId]   = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AiSuggestions | null>(null)

  const [saving, setSaving]            = useState(false)
  const [gettingAI, setGettingAI]      = useState(false)
  const [pushing, setPushing]          = useState(false)

  const [error, setError]             = useState<string | null>(null)
  const [aiError, setAiError]         = useState<string | null>(null)
  const [pushError, setPushError]      = useState<string | null>(null)

  function buildTargeting() {
    const t: Record<string, unknown> = { gender }
    if (ageMin) t.age_min = parseInt(ageMin, 10)
    if (ageMax) t.age_max = parseInt(ageMax, 10)
    if (interests.trim()) {
      t.interests = interests.split(",").map((s) => s.trim()).filter(Boolean)
    }
    return t
  }

  async function saveDraft(): Promise<string | null> {
    if (!name.trim()) { setError("Campaign name is required"); return null }
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return null
      const body: Record<string, unknown> = {
        name:     name.trim(),
        platform,
        targeting: buildTargeting(),
      }
      if (dailyBudget) body.daily_budget = parseFloat(dailyBudget)

      const data = await apiClient<{ id: string }>("/api/v1/campaigns", token, {
        method: "POST",
        body:   JSON.stringify(body),
      })
      setCampaignId(data.id)
      return data.id
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Save failed"
      setError(msg)
      return null
    } finally {
      setSaving(false)
    }
  }

  async function handleGetAI() {
    setAiError(null)
    let id = campaignId
    if (!id) {
      id = await saveDraft()
      if (!id) return
    }
    setGettingAI(true)
    try {
      const token = await getToken()
      if (!token) return
      const data = await apiClient<{ suggestions: AiSuggestions }>(
        `/api/v1/campaigns/${id}/ai-suggestions`,
        token,
        { method: "POST", body: JSON.stringify({}) }
      )
      setSuggestions(data.suggestions)
      // Apply suggestions to form fields
      if (data.suggestions.interests?.length) {
        setInterests(data.suggestions.interests.join(", "))
      }
      if (data.suggestions.age_min) setAgeMin(String(data.suggestions.age_min))
      if (data.suggestions.age_max) setAgeMax(String(data.suggestions.age_max))
      if (data.suggestions.gender)  setGender(data.suggestions.gender)
      if (data.suggestions.daily_budget_recommendation) {
        setDailyBudget(String(data.suggestions.daily_budget_recommendation))
      }
    } catch (e) {
      const err = e instanceof ApiError ? e : null
      if (err?.status === 402) {
        setAiError("AI suggestions require a BYOK OpenRouter key. Add yours in Settings.")
      } else {
        setAiError(e instanceof Error ? e.message : "AI suggestion failed")
      }
    } finally {
      setGettingAI(false)
    }
  }

  async function handleSaveDraft() {
    const id = await saveDraft()
    if (id) router.push("/campaigns")
  }

  async function handlePush() {
    setPushError(null)
    let id = campaignId
    if (!id) {
      id = await saveDraft()
      if (!id) return
    }
    setPushing(true)
    try {
      const token = await getToken()
      if (!token) return
      await apiClient<{ history_id: string }>(
        `/api/v1/campaigns/${id}/push`,
        token,
        { method: "POST", body: JSON.stringify({ platform }) }
      )
      router.push("/actions/logs")
    } catch (e) {
      const err = e instanceof ApiError ? e : null
      if (err?.status === 422) {
        setPushError(`${platform.charAt(0).toUpperCase() + platform.slice(1)} integration not connected. Connect it in Integrations.`)
      } else if (err?.status === 400) {
        setPushError("Campaign must be in draft or paused status to push.")
      } else {
        setPushError(e instanceof Error ? e.message : "Push failed")
      }
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/campaigns">
          <button className="p-2 rounded-xl hover:bg-surface-container-low text-muted-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-2xl font-extrabold text-foreground font-sans">New Campaign</h1>
        {campaignId && (
          <span className="ml-auto text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-body">
            Saved as draft
          </span>
        )}
      </div>

      {/* Main form card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">
            Campaign Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 Growth Push"
            className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 ring-primary/20 font-body"
          />
        </div>

        {/* Platform */}
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">
            Platform *
          </label>
          <div className="flex gap-3">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold capitalize transition-colors font-body ${
                  platform === p
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-muted-foreground hover:bg-surface-container-high"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Budget */}
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 font-body">
            Daily Budget (USD)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">$</span>
            <input
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              placeholder="500"
              min="1"
              className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-8 pr-4 text-sm focus:ring-2 ring-primary/20 font-body"
            />
          </div>
          {suggestions?.daily_budget_recommendation && (
            <p className="mt-1 text-[11px] text-primary font-semibold font-body">
              AI recommends: ${suggestions.daily_budget_recommendation.toLocaleString()}/day
            </p>
          )}
        </div>

        {/* Targeting */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-body">Targeting</p>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1 font-body">
              Interests (comma-separated)
            </label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="fitness, nutrition, wellness"
              className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 ring-primary/20 font-body"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 font-body">Age Min</label>
              <input
                type="number"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 ring-primary/20 font-body"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 font-body">Age Max</label>
              <input
                type="number"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 ring-primary/20 font-body"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 font-body">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 ring-primary/20 font-body"
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-body">
            {error}
          </div>
        )}
      </div>

      {/* AI Suggestions panel */}
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground font-sans">AI Targeting Suggestions</h3>
          </div>
          <button
            onClick={handleGetAI}
            disabled={gettingAI || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold font-body hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {gettingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {gettingAI ? "Generating…" : "Get AI Suggestions"}
          </button>
        </div>

        {aiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-body">
            {aiError}
            {aiError.includes("BYOK") && (
              <Link href="/settings" className="ml-2 underline font-bold">
                Go to Settings →
              </Link>
            )}
          </div>
        )}

        {suggestions ? (
          <div className="space-y-3">
            <p className="text-[11px] text-primary font-bold font-body uppercase tracking-wide">
              Suggestions applied to form
            </p>
            {suggestions.rationale && (
              <p className="text-xs text-muted-foreground leading-relaxed font-body">
                {suggestions.rationale}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {suggestions.interests.map((i) => (
                <span key={i} className="text-[11px] font-semibold px-2 py-0.5 bg-white border border-primary/20 rounded-full text-primary font-body">
                  {i}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-body">
            Enter a campaign name and click "Get AI Suggestions" to receive personalized targeting recommendations based on your historical ROAS data.
          </p>
        )}
      </div>

      {/* Push error */}
      {pushError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-body">
          {pushError}
          {pushError.includes("integration not connected") && (
            <Link href="/integrations" className="ml-2 underline font-bold">
              Connect Integration →
            </Link>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 justify-end">
        <button
          onClick={handleSaveDraft}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-bold font-body hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Draft
        </button>
        <button
          onClick={handlePush}
          disabled={pushing || saving || !name.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold font-body shadow-md hover:opacity-90 transition-all disabled:opacity-50"
        >
          {pushing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {pushing ? "Pushing…" : `Push to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
        </button>
      </div>
    </div>
  )
}
