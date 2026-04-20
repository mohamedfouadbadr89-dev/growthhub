import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function getSecret(): string {
  const s = process.env.CLERK_SECRET_KEY
  if (!s) throw new Error('CLERK_SECRET_KEY is not set')
  return s
}

export function generateState(orgId: string, platform: string): string {
  const nonce = randomBytes(16).toString('hex')
  const expiresAt = Date.now() + STATE_TTL_MS
  const payload = Buffer.from(JSON.stringify({ orgId, platform, nonce, expiresAt })).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function validateState(token: string): { orgId: string; platform: string } {
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) throw new Error('Invalid state token format')

  const payload = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)

  const expectedSig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid state token signature')
  }

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
    orgId: string
    platform: string
    nonce: string
    expiresAt: number
  }

  if (data.expiresAt < Date.now()) throw new Error('State token expired')
  return { orgId: data.orgId, platform: data.platform }
}
