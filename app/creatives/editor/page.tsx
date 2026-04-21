"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, Loader2, Download } from "lucide-react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/api-client"

interface Creative {
  id: string
  type: "copy" | "image"
  content_url: string | null
  content_text: { headline: string; body: string; cta: string } | null
  performance_score: number
  generation_id: string
  created_at: string
  updated_at: string
}

export default function CreativeEditorPage() {
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")

  const [creative, setCreative] = useState<Creative | null>(null)
  const [headline, setHeadline] = useState("")
  const [body, setBody] = useState("")
  const [cta, setCta] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError("No creative ID provided")
      setLoading(false)
      return
    }

    async function load() {
      try {
        const token = await getToken()
        if (!token) return
        const data = await apiClient<Creative>(`/api/v1/creatives/${id}`, token)
        setCreative(data)
        if (data.content_text) {
          setHeadline(data.content_text.headline ?? "")
          setBody(data.content_text.body ?? "")
          setCta(data.content_text.cta ?? "")
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load creative")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, getToken])

  async function handleSave() {
    if (!creative || !id) return
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("Not authenticated")
      const updated = await apiClient<Creative>(`/api/v1/creatives/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ content_text: { headline, body, cta } }),
      })
      setCreative(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function handleDownload() {
    const content = `Headline: ${headline}\n\nBody: ${body}\n\nCTA: ${cta}`
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `creative-${id?.slice(0, 8) ?? "export"}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !creative) {
    return (
      <div className="space-y-4">
        <Link href="/creatives/results" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Results
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      </div>
    )
  }

  const isImage = creative?.type === "image"

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link
          href="/creatives/results"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Results
        </Link>
        <h1 className="text-xl font-sans font-semibold text-foreground flex-1">
          {isImage ? "Image Creative" : "Edit Copy Creative"}
        </h1>
        {creative && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
            Score: {creative.performance_score}/100
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {isImage && creative?.content_url ? (
        <div className="bg-white border border-border rounded-xl p-6 space-y-4">
          <img
            src={creative.content_url}
            alt="Generated ad"
            className="w-full max-h-96 object-contain rounded-lg border border-border"
          />
          <button
            onClick={() => window.open(creative.content_url!, "_blank")}
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm hover:bg-surface-container-low"
          >
            <Download className="w-4 h-4" /> Download Image
          </button>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={100}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground text-right">{headline.length}/100</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={300}
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground text-right">{body.length}/300</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">CTA</label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              maxLength={50}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : "Save Changes"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm hover:bg-surface-container-low"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
