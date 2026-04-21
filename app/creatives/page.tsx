"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Wand2, Loader2, ImageIcon, FileText } from "lucide-react"
import { apiClient, ApiError } from "@/lib/api-client"

interface Integration {
  id: string
  platform: string
  platform_account_name: string | null
  status: string
}

export default function CreativesPage() {
  const { getToken } = useAuth()
  const router = useRouter()

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [generationType, setGenerationType] = useState<"copy" | "image">("copy")
  const [campaignInput, setCampaignInput] = useState("")
  const [loadingIntegrations, setLoadingIntegrations] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        if (!token) return
        const data = await apiClient<{ integrations: Integration[] }>("/api/v1/integrations", token)
        setIntegrations((data.integrations ?? []).filter((i) => i.status === "connected"))
      } catch {
        // Non-fatal
      } finally {
        setLoadingIntegrations(false)
      }
    }
    load()
  }, [getToken])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("Not authenticated")

      const body: Record<string, unknown> = { generation_type: generationType }
      if (campaignInput.trim()) body.campaign_name = campaignInput.trim()

      const data = await apiClient<{ generation_id: string }>("/api/v1/creatives/generate", token, {
        method: "POST",
        body: JSON.stringify(body),
      })

      router.push(`/creatives/results?generation_id=${data.generation_id}`)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Generation failed"
      if (msg.toLowerCase().includes("byok") || msg.toLowerCase().includes("key")) {
        setError("AI key not configured. Go to Settings → API Keys to add your OpenRouter key.")
      } else if (msg.toLowerCase().includes("credit")) {
        setError("Insufficient credits. Please upgrade your plan.")
      } else {
        setError(msg)
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-sans font-semibold text-foreground">Creative Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate AI-powered ads using your brand kit and campaign performance data
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Generation Type */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-sans font-semibold text-foreground">What do you want to generate?</h2>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { type: "copy" as const, label: "Ad Copy", desc: "Headlines, body text, and CTAs", Icon: FileText },
              { type: "image" as const, label: "Ad Image", desc: "Visuals styled with your brand", Icon: ImageIcon },
            ] as const
          ).map(({ type, label, desc, Icon }) => (
            <button
              key={type}
              onClick={() => setGenerationType(type)}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all ${
                generationType === type
                  ? "border-primary bg-surface-container-low"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${generationType === type ? "text-primary" : "text-muted-foreground"}`}
              />
              <span
                className={`font-medium text-sm ${generationType === type ? "text-primary" : "text-foreground"}`}
              >
                {label}
              </span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {generationType === "copy" ? "Uses 2 credits" : "Uses 10 credits"}
        </p>
      </div>

      {/* Campaign Context */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-sans font-semibold text-foreground">Campaign Context</h2>
        <p className="text-sm text-muted-foreground">
          Enter a campaign name to score creatives by its ROAS performance.
        </p>

        {loadingIntegrations ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : integrations.length === 0 ? (
          <div className="bg-surface-container-low rounded-lg p-4 text-sm text-muted-foreground">
            No connected integrations. Connect Meta, Google, or Shopify first to use campaign context.
          </div>
        ) : (
          <input
            type="text"
            value={campaignInput}
            onChange={(e) => setCampaignInput(e.target.value)}
            placeholder="Campaign name (optional)"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Queuing generation…
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" /> Generate {generationType === "copy" ? "Ad Copy" : "Ad Images"}
          </>
        )}
      </button>
    </div>
  )
}
