interface WindowEntry {
  count: number
  windowStart: number
}

const LIMIT = parseInt(process.env.AI_RATE_LIMIT ?? '60', 10)
const WINDOW_MS = parseInt(process.env.AI_RATE_WINDOW_MS ?? '60000', 10)

const windows = new Map<string, WindowEntry>()

export function check(orgId: string): boolean {
  const now = Date.now()
  const entry = windows.get(orgId)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    windows.set(orgId, { count: 1, windowStart: now })
    return true
  }

  if (entry.count >= LIMIT) return false

  entry.count++
  return true
}

export function retryAfterMs(orgId: string): number {
  const entry = windows.get(orgId)
  if (!entry) return 0
  const elapsed = Date.now() - entry.windowStart
  return Math.max(0, WINDOW_MS - elapsed)
}
