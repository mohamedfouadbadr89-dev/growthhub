"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useSearchParams, useRouter } from "next/navigation"
import { Download, Loader2, RefreshCw, ImageIcon, FileText, ArrowLeft, Pencil } from "lucide-react"
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
}

interface GenerationJob {
  id: string
  generation_type: "copy" | "image"
  status: "pending" | "processing" | "completed" | "failed"
  campaign_name: string | null
  source_roas: number | null
  error_message: string | null
}

function scoreColor(score: number) {
  if (score >= 70) return "text-green-600 bg-green-50"
  if (score >= 40) return "text-yellow-600 bg-yellow-50"
  return "text-red-600 bg-red-50"
}

function downloadText(creative: Creative) {
  const text = creative.content_text
  if (!text) return
  const content = `Headline: ${text.headline}\n\nBody: ${text.body}\n\nCTA: ${text.cta}`
  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `creative-${creative.id.slice(0, 8)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ResultsPage() {
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const generationId = searchParams.get("generation_id")

  const [job, setJob] = useState<GenerationJob | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchAll(token: string) {
    const [creativesData, jobData] = await Promise.all([
      apiClient<{ creatives: Creative[]; total: number }>("/api/v1/creatives?limit=100", token),
      generationId
        ? apiClient<GenerationJob>(`/api/v1/creatives/generations/${generationId}`, token)
        : Promise.resolve(null),
    ])
    setCreatives(creativesData.creatives ?? [])
    if (jobData) setJob(jobData)
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const token = await getToken()
        if (!token || !mounted) return
        await fetchAll(token)
      } catch (e) {
        if (mounted) setError(e instanceof ApiError ? e.message : "Failed to load")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    // Poll job status if generation_id is present and job is in-progress
    if (generationId) {
      pollRef.current = setInterval(async () => {
        try {
          const token = await getToken()
          if (!token || !mounted) return
          const jobData = await apiClient<GenerationJob>(
            `/api/v1/creatives/generations/${generationId}`,
            token
          )
          if (!mounted) return
          setJob(jobData)
          if (jobData.status === "completed" || jobData.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current)
            // Refresh creatives list
            const token2 = await getToken()
            if (token2 && mounted) {
              const data = await apiClient<{ creatives: Creative[] }>("/api/v1/creatives?limit=100", token2)
              setCreatives(data.creatives ?? [])
            }
          }
        } catch {
          // ignore poll errors
        }
      }, 3000)
    }

    return () => {
      mounted = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [generationId, getToken])

  async function handleRetry() {
    if (!job || !generationId) return
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      await apiClient<{ generation_id: string }>("/api/v1/creatives/generate", token, {
        method: "POST",
        body: JSON.stringify({ generation_type: job.generation_type, campaign_name: job.campaign_name }),
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Retry failed")
    }
  }

  const pendingOrProcessing = job && (job.status === "pending" || job.status === "processing")
  const jobFailed = job?.status === "failed"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/creatives"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Generator
        </Link>
        <div className="flex-1" />
        <h1 className="text-xl font-sans font-semibold text-foreground">Creative Results</h1>
      </div>

      {/* Job Status Banner */}
      {job && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            pendingOrProcessing
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : jobFailed
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {pendingOrProcessing && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
          <span>
            {pendingOrProcessing
              ? `Generating ${job.generation_type === "copy" ? "ad copy" : "ad images"}…`
              : jobFailed
                ? `Generation failed: ${job.error_message ?? "Unknown error"}`
                : `Generation complete — ${creatives.filter((c) => c.generation_id === generationId).length} creatives ready`}
          </span>
          {jobFailed && (
            <button
              onClick={handleRetry}
              className="ml-auto flex items-center gap-1 font-medium hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : creatives.length === 0 && !pendingOrProcessing ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No creatives yet.</p>
          <Link href="/creatives" className="text-primary text-sm mt-2 inline-block hover:underline">
            Generate your first creative →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {creatives.map((creative) => (
            <div
              key={creative.id}
              className="bg-white border border-border rounded-xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  {creative.type === "image" ? (
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {creative.type}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor(creative.performance_score)}`}
                >
                  {creative.performance_score}/100
                </span>
              </div>

              {/* Content */}
              <div className="px-4 pb-4 flex-1">
                {creative.type === "image" && creative.content_url ? (
                  <img
                    src={creative.content_url}
                    alt="Generated ad"
                    className="w-full h-48 object-cover rounded-lg border border-border"
                  />
                ) : creative.content_text ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-sm text-foreground">{creative.content_text.headline}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{creative.content_text.body}</p>
                    <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
                      {creative.content_text.cta}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              <div className="border-t border-border px-4 py-3 flex items-center gap-2">
                {creative.type === "copy" && (
                  <Link
                    href={`/creatives/editor?id=${creative.id}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Link>
                )}
                <button
                  onClick={() => {
                    if (creative.type === "copy") downloadText(creative)
                    else if (creative.content_url) window.open(creative.content_url, "_blank")
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
