"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  ArrowLeft, Bell, HelpCircle, ShoppingCart, TrendingUp, Eye,
  Sparkles, CheckCircle2, Zap, Settings2, Check, X, Search, Cloud,
} from "lucide-react"
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client"

// Phase 6 Sub-pass B (continuation #13, 2026-05-08): wires "Save Draft" to
// `POST /api/v1/campaigns` (canonical envelope).
//
// Continuation #58 (2026-05-12) — operator-honesty pass applied here. The
// in-page "Launch Campaign" footer button used a setTimeout fake-success
// simulator (matched the pattern from #55/#56/#57). Even though Phase 6
// Sub-pass C closed the real-mode CREATE handlers (continuation #20), the
// proper Launch workflow is: Save Draft → routed to detail page → Push
// (handlePush at /campaigns/[id]/page.tsx wires `POST /:id/push`). A
// duplicate fake "Launch Campaign" affordance on the create page misled
// operators about whether a real push had occurred. Replaced with
// disabled-placeholder + tooltip pointing to the proper flow. Same fate
// for the "Apply AI Boost" button (no preview-estimation endpoint exists).
//
// Sections that remain UI-state only (deferred):
//   - Objective selector       → no `campaigns.objective` column in spec
//   - Bidding strategy          → ad-platform layer, not stored on campaigns row
//   - Creative selector         → cross-Phase-5 surface deferred
//   - TikTok / Snapchat platform → backend VALID_PLATFORMS = ['meta','google']
//                                  (selectable but ignored on save with warning)
//   - AI Boost / preview KPIs    → no preview-estimation endpoint
//   - Summary checklist           → presentational

type Objective = "conversion" | "traffic" | "awareness"
type Platform = "Meta" | "Google" | "TikTok" | "Snapchat"
type BudgetType = "daily" | "lifetime"
type BiddingStrategy = "auto" | "manual"

interface StepHeaderProps { num: number; active?: boolean; label: string }
function StepHeader({ num, active = true, label }: StepHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${active ? "bg-primary text-white" : "bg-surface-container-high text-muted-foreground"}`}>
        {num}
      </div>
      <h2 className="font-sans font-semibold text-foreground text-base">{label}</h2>
    </div>
  )
}

const OBJECTIVES: { key: Objective; icon: React.ReactNode; label: string; desc: string }[] = [
  { key: "conversion", icon: <ShoppingCart className="w-5 h-5" />, label: "Conversion", desc: "Drive purchases & sign-ups" },
  { key: "traffic", icon: <TrendingUp className="w-5 h-5" />, label: "Traffic", desc: "Send visitors to your site" },
  { key: "awareness", icon: <Eye className="w-5 h-5" />, label: "Awareness", desc: "Reach new audiences" },
]

const ALL_PLATFORMS: Platform[] = ["Meta", "Google", "TikTok", "Snapchat"]

const CREATIVE_GRADIENTS = [
  "linear-gradient(135deg,#005bc4,#3b82f6)",
  "linear-gradient(135deg,#7c3aed,#a855f7)",
  "linear-gradient(135deg,#059669,#10b981)",
]

const CREATIVE_LABELS = ["Summer Flash Sale", "Brand Awareness Reel", "New Arrivals Showcase"]

export default function CreateCampaignPage() {
  const router = useRouter()
  const { getToken } = useAuth()

  const [campaignName, setCampaignName] = useState("")
  const [objective, setObjective] = useState<Objective>("conversion")
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(["Meta", "Google"]))
  const [budgetType, setBudgetType] = useState<BudgetType>("daily")
  const [budgetAmount, setBudgetAmount] = useState(500)
  const [locations, setLocations] = useState(["United States", "Canada"])
  const [locationInput, setLocationInput] = useState("")
  const [ageMin, setAgeMin] = useState(25)
  const [ageMax, setAgeMax] = useState(44)
  const [interests, setInterests] = useState("Fashion, Lifestyle, Online Shopping")
  const [selectedCreative, setSelectedCreative] = useState(0)
  const [biddingStrategy, setBiddingStrategy] = useState<BiddingStrategy>("auto")
  // launching/launched + applyingBoost/boostApplied state removed at #58 —
  // the duplicate "Launch Campaign" footer button and the "Apply AI Boost"
  // sidebar button both used setTimeout fake-success simulators. Replaced
  // with disabled-placeholders; proper Launch flow is Save Draft →
  // /campaigns/[id] → handlePush (already wired in Phase 6 Sub-pass C).
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const togglePlatform = (p: Platform) =>
    setPlatforms(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })

  const addLocation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && locationInput.trim()) {
      setLocations(prev => [...prev, locationInput.trim()])
      setLocationInput("")
    }
  }

  const removeLocation = (loc: string) => setLocations(prev => prev.filter(l => l !== loc))

  // handleLaunch removed at #58 — fake setTimeout simulator deleted with
  // the disabled-placeholder UI swap.

  async function handleSaveDraft() {
    if (savingDraft || draftSaved) return
    setDraftError(null)

    const trimmedName = campaignName.trim()
    if (!trimmedName) {
      setDraftError("Campaign name is required")
      return
    }

    // Backend VALID_PLATFORMS = ['meta', 'google']. TikTok/Snapchat are
    // selectable in the UI (deferred for forward-compat) but skipped here.
    // Pick the first selected platform that maps to a backend-supported one.
    const supportedPlatform = (() => {
      if (platforms.has("Meta")) return "meta"
      if (platforms.has("Google")) return "google"
      return null
    })()

    if (!supportedPlatform) {
      setDraftError("Select Meta or Google as a platform (TikTok / Snapchat support is coming soon)")
      return
    }

    setSavingDraft(true)
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, "Sign in required")

      const created = await apiClient<{ id: string; name: string; platform: string }>(
        "/api/v1/campaigns",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name: trimmedName,
            platform: supportedPlatform,
            daily_budget: budgetType === "daily" ? budgetAmount : undefined,
            targeting: {
              objective,
              locations,
              age_min: ageMin,
              age_max: ageMax,
              interests,
              budget_type: budgetType,
              bidding_strategy: biddingStrategy,
            },
          }),
        },
      )
      setDraftSaved(true)
      // Brief success affordance before navigating to the new campaign's detail page.
      setTimeout(() => { router.push(`/campaigns/${created.id}`) }, 700)
    } catch (err) {
      // Continuation #36: formatErrorMessage surfaces ApiError.requestId.
      setDraftError(formatErrorMessage(err, "Failed to save draft"))
    } finally {
      setSavingDraft(false)
    }
  }

  // handleApplyBoost removed at #58 — fake setTimeout simulator deleted
  // with the disabled-placeholder UI swap.

  const estReach = platforms.size * 18 + budgetAmount * 0.6
  const estCPA = biddingStrategy === "auto" ? 4.2 : 5.8
  const estROAS = biddingStrategy === "auto" ? 4.1 : 3.3

  return (
    <div
      className="-mx-6 -mt-6 flex flex-col bg-background"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* Topbar */}
      <div className="shrink-0 h-14 border-b border-border bg-white flex items-center gap-3 px-6">
        <Link href="/campaigns" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="w-px h-5 bg-border" />
        <span className="font-sans font-semibold text-foreground text-sm">Create Campaign</span>
        <div className="flex-1" />
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface-container-low text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-48"
            placeholder="Search creatives…"
          />
        </div>
        <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground"><Bell className="w-4 h-4" /></button>
        <button className="p-2 rounded-lg hover:bg-surface-container-low text-muted-foreground"><HelpCircle className="w-4 h-4" /></button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Step 0 — Campaign Details (required by POST /api/v1/campaigns) */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <StepHeader num={0} label="Campaign Details" />
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="e.g. Summer Collection Launch 2026"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Step 1 — Objective */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <StepHeader num={1} label="Campaign Objective" />
              <div className="grid grid-cols-3 gap-3">
                {OBJECTIVES.map(obj => (
                  <button
                    key={obj.key}
                    onClick={() => setObjective(obj.key)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${objective === obj.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <div className={`p-2 rounded-lg ${objective === obj.key ? "bg-primary text-white" : "bg-surface-container-low text-muted-foreground"}`}>
                      {obj.icon}
                    </div>
                    <div>
                      <div className="font-sans font-semibold text-foreground text-sm">{obj.label}</div>
                      <div className="font-body text-xs text-muted-foreground mt-0.5">{obj.desc}</div>
                    </div>
                    {objective === obj.key && <Check className="w-4 h-4 text-primary absolute top-3 right-3" style={{ position: "absolute" }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Platforms */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <StepHeader num={2} label="Platform Selection" />
              {/* Continuation #71 (2026-05-12) — proactive "Soon" badge on
                  forward-compat platforms (TikTok / Snapchat). Backend
                  VALID_PLATFORMS = ['meta', 'google'] per campaigns.ts:97;
                  the page already returns a friendly error post-save if only
                  unsupported platforms are selected (line 122-125), but that
                  surfaces the constraint AFTER operators commit a flow. The
                  Soon badge surfaces the constraint upfront. Box still
                  toggleable (forward-compat preserved). */}
              <div className="grid grid-cols-2 gap-3">
                {ALL_PLATFORMS.map(p => {
                  const isSupported = p === "Meta" || p === "Google";
                  return (
                    <label key={p} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${platforms.has(p) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${platforms.has(p) ? "border-primary bg-primary" : "border-border"}`}>
                        {platforms.has(p) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input type="checkbox" className="sr-only" checked={platforms.has(p)} onChange={() => togglePlatform(p)} />
                      <span className="font-body text-sm font-medium text-foreground">{p}</span>
                      {!isSupported && (
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-body">
                          Soon
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 3 — Budget */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <StepHeader num={3} label="Budget Setup" />
              <div className="flex gap-2 mb-4">
                {(["daily", "lifetime"] as BudgetType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setBudgetType(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${budgetType === t ? "bg-primary text-white" : "bg-surface-container-low text-muted-foreground hover:text-foreground"}`}
                  >
                    {t === "daily" ? "Daily Budget" : "Lifetime Budget"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground font-sans font-semibold text-lg">$</span>
                <input
                  type="number"
                  value={budgetAmount}
                  onChange={e => setBudgetAmount(Number(e.target.value))}
                  className="w-40 px-4 py-3 rounded-xl border border-border bg-surface-container-low text-foreground font-sans font-bold text-xl focus:outline-none focus:border-primary"
                />
                <span className="text-muted-foreground text-sm font-body">per {budgetType === "daily" ? "day" : "campaign"}</span>
              </div>
            </div>

            {/* Step 4 — Audience */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <StepHeader num={4} label="Audience Targeting" />
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Locations</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {locations.map(loc => (
                      <span key={loc} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {loc}
                        <button onClick={() => removeLocation(loc)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <input
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    onKeyDown={addLocation}
                    placeholder="Type a location and press Enter…"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Age Min</label>
                    <input type="number" value={ageMin} onChange={e => setAgeMin(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Age Max</label>
                    <input type="number" value={ageMax} onChange={e => setAgeMax(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Interests</label>
                  <textarea
                    value={interests}
                    onChange={e => setInterests(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-container-low text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 5 — Creatives. Continuation #83 (2026-05-12) — the
                creative tiles are hardcoded gradient placeholders with
                copy-only labels ("Summer Flash Sale" etc.); selected
                value isn't included in handleSaveDraft targeting payload
                (cross-Phase-5 surface deferred per page header comment).
                Sample marker added on Step header + opacity-70 wrapper +
                "Generate New AI Creative" CTA disabled (no creative
                generation flow wired from this entry point). */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <StepHeader num={5} label="Creative Selection" />
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body ml-auto">Sample</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4 opacity-70">
                {CREATIVE_GRADIENTS.map((grad, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCreative(i)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${selectedCreative === i ? "border-primary" : "border-transparent"}`}
                  >
                    <div className="aspect-square" style={{ background: grad }} />
                    <div className="p-2 text-left">
                      <div className="text-xs font-medium text-foreground truncate">{CREATIVE_LABELS[i]}</div>
                    </div>
                    {selectedCreative === i && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button
                disabled
                title="Creative generation from campaign-create flow pending — use /creatives generator directly"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground text-sm font-medium w-full justify-center opacity-50 cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Generate New AI Creative
              </button>
            </div>

            {/* Step 6 — Bidding */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <StepHeader num={6} label="Bidding Strategy" />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBiddingStrategy("auto")}
                  className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${biddingStrategy === "auto" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className={`p-2 rounded-lg ${biddingStrategy === "auto" ? "bg-primary text-white" : "bg-surface-container-low text-muted-foreground"}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-sans font-semibold text-foreground text-sm">Auto-Optimized</div>
                    <div className="font-body text-xs text-muted-foreground mt-0.5">AI adjusts bids for best ROAS</div>
                  </div>
                </button>
                <button
                  onClick={() => setBiddingStrategy("manual")}
                  className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${biddingStrategy === "manual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className={`p-2 rounded-lg ${biddingStrategy === "manual" ? "bg-primary text-white" : "bg-surface-container-low text-muted-foreground"}`}>
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-sans font-semibold text-foreground text-sm">Manual</div>
                    <div className="font-body text-xs text-muted-foreground mt-0.5">You control max bid amounts</div>
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right panel */}
        <div className="w-96 shrink-0 border-l border-border bg-white overflow-y-auto">
          <div className="p-5 space-y-5">
            <h3 className="font-sans font-semibold text-foreground text-sm">Campaign Preview</h3>

            {/* Est Reach */}
            <div className="bg-surface-container-low rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-body">Est. Daily Reach</span>
                <span className="font-sans font-bold text-foreground">{Math.round(estReach).toLocaleString()}</span>
              </div>
              <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (platforms.size / 4) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 font-body">{platforms.size} platform{platforms.size !== 1 ? "s" : ""} selected</div>
            </div>

            {/* CPA / ROAS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground font-body mb-1">Est. CPA</div>
                <div className="font-sans font-bold text-foreground text-lg">${estCPA}</div>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 text-center">
                <div className="text-xs text-muted-foreground font-body mb-1">Est. ROAS</div>
                <div className="font-sans font-bold text-primary text-lg">{estROAS}x</div>
              </div>
            </div>

            {/* Funnel Allocation */}
            <div>
              <div className="text-xs text-muted-foreground font-body mb-2">Funnel Allocation</div>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                <div className="bg-primary" style={{ width: "50%" }} />
                <div className="bg-blue-400" style={{ width: "30%" }} />
                <div className="bg-blue-200" style={{ width: "20%" }} />
              </div>
              <div className="flex gap-4 mt-2">
                {[["Conversion", "50%", "bg-primary"], ["Traffic", "30%", "bg-blue-400"], ["Awareness", "20%", "bg-blue-200"]].map(([label, pct, bg]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${bg}`} />
                    <span className="text-xs text-muted-foreground font-body">{label} {pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div
              className="rounded-xl p-4"
              style={{ background: "linear-gradient(135deg,#05345c,#005bc4)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-300" />
                <span className="text-white text-xs font-sans font-semibold">AI Recommendation</span>
              </div>
              <p className="text-blue-100 text-xs font-body leading-relaxed mb-3">
                {biddingStrategy === "auto"
                  ? "Your auto-bid setup looks strong. Consider adding TikTok for +22% reach at minimal CPA increase."
                  : "Manual bidding detected. Switch to Auto-Optimized to save ~18% on CPA while maintaining ROAS targets."}
              </p>
              {/* Continuation #58 — AI Boost button had no backend; the
                  preview-estimation pipeline isn't in any current phase. */}
              <button
                disabled
                title="AI Boost pipeline pending"
                className="w-full py-2 rounded-lg bg-white/10 text-white/60 text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Zap className="w-3 h-3" /><span>Apply AI Boost</span>
              </button>
            </div>

            {/* Summary checklist */}
            <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
              <div className="text-xs font-medium text-foreground font-sans mb-3">Ready to Launch?</div>
              {[
                ["Objective set", true],
                [`${platforms.size} platform${platforms.size !== 1 ? "s" : ""} selected`, platforms.size > 0],
                ["Budget configured", budgetAmount > 0],
                ["Audience defined", locations.length > 0],
                ["Creative selected", true],
                ["Bidding strategy set", true],
              ].map(([label, ok]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-emerald-500" : "bg-surface-container-high"}`}>
                    {ok && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`text-xs font-body ${ok ? "text-foreground" : "text-muted-foreground"}`}>{label as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 h-14 border-t border-border bg-white flex items-center gap-3 px-6">
        {draftError ? (
          <div className="flex items-center gap-2 text-xs text-red-600 font-body">
            <X className="w-3.5 h-3.5" />
            {draftError}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
            <Cloud className="w-3.5 h-3.5" />
            Changes saved automatically
          </div>
        )}
        <div className="flex-1" />
        {/* Continuation #72 (2026-05-12) — proactive client-side validation
            on Save Draft. Pre-fix the button was always clickable; operators
            with an empty campaign name or only TikTok/Snapchat selected
            saw the canonical error only AFTER clicking. Now the predicate
            disables the button upfront with explanatory tooltip. The server-
            side validation in handleSaveDraft remains as the authoritative
            gate (defense-in-depth — never trust client). */}
        {(() => {
          const hasName = campaignName.trim().length > 0;
          const hasSupportedPlatform = platforms.has("Meta") || platforms.has("Google");
          const canSave = hasName && hasSupportedPlatform;
          const tooltip = !hasName
            ? "Enter a campaign name first"
            : !hasSupportedPlatform
              ? "Select Meta or Google as a platform"
              : "Save campaign as draft";
          return (
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || !canSave}
              title={tooltip}
              className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface-container-low transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingDraft ? (
                <><span className="w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /><span>Saving…</span></>
              ) : draftSaved ? (
                <><Check className="w-3.5 h-3.5 text-emerald-500" /><span>Draft Saved</span></>
              ) : "Save Draft"}
            </button>
          );
        })()}
        {/* Continuation #58 — Launch Campaign button removed from fake-action
            state and disabled. Proper Launch flow: Save Draft → routed to
            /campaigns/[id] detail page → handlePush (already wired in
            Phase 6 Sub-pass C, continuation #20). Surfacing a duplicate
            Launch affordance here would mislead operators about whether a
            real platform push has occurred. */}
        <button
          disabled
          title="Save Draft first, then Launch from the campaign detail page"
          className="px-6 py-2 rounded-lg text-sm font-semibold text-muted-foreground bg-surface-container-high flex items-center gap-2 opacity-50 cursor-not-allowed"
        >
          <Zap className="w-3.5 h-3.5" /><span>Launch Campaign</span>
        </button>
      </div>
    </div>
  )
}
