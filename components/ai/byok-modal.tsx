"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { X, Loader2, Check, KeyRound, Unplug } from "lucide-react"
import { apiClient } from "@/lib/api-client"

type Provider = "openai" | "anthropic" | "openrouter"

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "openrouter", label: "OpenRouter" },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: (provider: string) => void
  currentProvider?: string | null
}

export function ByokModal({ isOpen, onClose, onSaved, currentProvider }: Props) {
  const { getToken } = useAuth()
  const [provider, setProvider] = useState<Provider>("openrouter")
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async () => {
    setError(null)
    if (!apiKey.trim()) { setError("API key cannot be empty."); return }
    setSaving(true)
    try {
      const token = await getToken()
      await apiClient("/api/v1/ai/connect", token!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: apiKey.trim() }),
      })
      onSaved(provider)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save key.")
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    setError(null)
    setDisconnecting(true)
    try {
      const token = await getToken()
      await apiClient("/api/v1/ai/connect", token!, { method: "DELETE" })
      onSaved("")
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to disconnect.")
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:bg-surface-container-low rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-foreground text-lg">AI Assistant (MCP)</h3>
            <p className="text-xs text-muted-foreground font-body">Bring your own provider key</p>
          </div>
        </div>

        {currentProvider && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Connected · {PROVIDERS.find(p => p.value === currentProvider)?.label ?? currentProvider}
              </span>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-60"
            >
              {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unplug className="w-3 h-3" />}
              {disconnecting ? "…" : "Disconnect"}
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Provider
            </label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value as Provider)}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-xl text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground font-body">
              Your key is encrypted and stored securely. It is never returned after saving.
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving…</span></> : "Save Key"}
          </button>
        </div>
      </div>
    </div>
  )
}
