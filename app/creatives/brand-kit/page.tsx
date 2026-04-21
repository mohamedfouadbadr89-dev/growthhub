"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { Upload, Plus, X, Save, Loader2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/api-client"

interface BrandKit {
  org_id: string
  logo_url: string | null
  colors: string[]
  fonts: Record<string, string>
  tone_of_voice: string | null
}

export default function BrandKitPage() {
  const { getToken } = useAuth()

  const [colors, setColors] = useState<string[]>(["#005bc4", "#05345c"])
  const [toneOfVoice, setToneOfVoice] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        if (!token) return
        const data = await apiClient<BrandKit>("/api/v1/brand-kit", token)
        setColors(data.colors?.length ? data.colors : ["#005bc4", "#05345c"])
        setToneOfVoice(data.tone_of_voice ?? "")
        setLogoUrl(data.logo_url)
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load brand kit")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("Not authenticated")
      await apiClient<BrandKit>("/api/v1/brand-kit", token, {
        method: "PUT",
        body: JSON.stringify({ colors, tone_of_voice: toneOfVoice }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("Not authenticated")
      const form = new FormData()
      form.append("logo", file)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/brand-kit/logo`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? "Upload failed")
      }
      const data = (await res.json()) as { logo_url: string }
      setLogoUrl(data.logo_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logo upload failed")
    } finally {
      setUploadingLogo(false)
    }
  }

  function addColor() {
    if (colors.length < 10) setColors([...colors, "#ffffff"])
  }

  function removeColor(i: number) {
    setColors(colors.filter((_, idx) => idx !== i))
  }

  function updateColor(i: number, val: string) {
    setColors(colors.map((c, idx) => (idx === i ? val : c)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-foreground">Brand Kit</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define your visual identity — used in all AI-generated creatives
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Brand Kit"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Logo */}
      <div className="bg-white border border-border rounded-xl p-6">
        <h2 className="font-sans font-semibold text-foreground mb-4">Logo</h2>
        <div className="flex items-center gap-6">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Brand logo"
              className="w-20 h-20 object-contain rounded-lg border border-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-surface-container-low">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm hover:bg-surface-container-low disabled:opacity-50"
            >
              {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingLogo ? "Uploading…" : logoUrl ? "Replace Logo" : "Upload Logo"}
            </button>
            <p className="text-xs text-muted-foreground mt-1">PNG or JPEG, max 5 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleLogoUpload(f)
              e.target.value = ""
            }}
          />
        </div>
      </div>

      {/* Colors */}
      <div className="bg-white border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sans font-semibold text-foreground">Brand Colors</h2>
          <button
            onClick={addColor}
            disabled={colors.length >= 10}
            className="flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Add color
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {colors.map((color, i) => (
            <div
              key={i}
              className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-surface-container-low"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(i, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-sm font-mono text-muted-foreground">{color}</span>
              {colors.length > 1 && (
                <button onClick={() => removeColor(i)} className="text-muted-foreground hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tone of Voice */}
      <div className="bg-white border border-border rounded-xl p-6">
        <h2 className="font-sans font-semibold text-foreground mb-4">Tone of Voice</h2>
        <textarea
          value={toneOfVoice}
          onChange={(e) => setToneOfVoice(e.target.value)}
          placeholder="Describe your brand's voice — e.g. 'Bold and direct. We speak to performance marketers who hate fluff. Short sentences. Data-driven.'"
          className="w-full h-32 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{toneOfVoice.length}/1000</p>
      </div>
    </div>
  )
}
