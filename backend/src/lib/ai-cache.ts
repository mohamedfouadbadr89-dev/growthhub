import { createHash } from 'crypto'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

const store = new Map<string, CacheEntry<unknown>>()

export function cacheKey(provider: string, model: string, prompt: string, orgId: string): string {
  const hash = createHash('sha256').update(provider + model + prompt).digest('hex')
  return `${orgId}:${hash}`
}

export function has(key: string): boolean {
  const entry = store.get(key)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return false
  }
  return true
}

export function get<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return undefined
  }
  return entry.value as T
}

export function set<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}
