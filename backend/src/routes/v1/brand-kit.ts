import { Hono } from 'hono'
import { getBrandKit, upsertBrandKit } from '../../services/creatives/brand-kit.js'
import { uploadLogo, getSignedUrl } from '../../services/creatives/storage.js'

type Variables = { userId: string; orgId: string }

export const brandKitRouter = new Hono<{ Variables: Variables }>()

const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg'])
const MAX_LOGO_BYTES = 5 * 1024 * 1024  // 5 MB

// GET /brand-kit — fetch org's brand kit with a fresh signed URL for the logo
brandKitRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  try {
    const kit = await getBrandKit(orgId)
    if (!kit) {
      return c.json({ org_id: orgId, logo_url: null, colors: [], fonts: {}, tone_of_voice: null })
    }

    // Generate a signed URL for the logo path (1 hour)
    let logoUrl = kit.logo_url
    if (logoUrl && !logoUrl.startsWith('http')) {
      logoUrl = await getSignedUrl(logoUrl, 3600).catch(() => null)
    }

    return c.json({ ...kit, logo_url: logoUrl })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// PUT /brand-kit — upsert colors, fonts, tone_of_voice
brandKitRouter.put('/', async (c) => {
  const orgId = c.get('orgId')

  let body: { colors?: unknown; fonts?: unknown; tone_of_voice?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const patch: Parameters<typeof upsertBrandKit>[1] = {}

  if (body.colors !== undefined) {
    if (!Array.isArray(body.colors)) return c.json({ error: 'colors must be an array' }, 400)
    const colors = (body.colors as unknown[])
      .filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c as string))
      .slice(0, 10) as string[]
    patch.colors = colors
  }

  if (body.fonts !== undefined) {
    if (typeof body.fonts !== 'object' || Array.isArray(body.fonts)) {
      return c.json({ error: 'fonts must be an object' }, 400)
    }
    patch.fonts = body.fonts as Record<string, string>
  }

  if (body.tone_of_voice !== undefined) {
    if (typeof body.tone_of_voice !== 'string') return c.json({ error: 'tone_of_voice must be a string' }, 400)
    patch.tone_of_voice = body.tone_of_voice.slice(0, 1000)
  }

  try {
    const kit = await upsertBrandKit(orgId, patch)
    return c.json(kit)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// POST /brand-kit/logo — upload logo image (multipart/form-data)
brandKitRouter.post('/logo', async (c) => {
  const orgId = c.get('orgId')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Expected multipart/form-data' }, 400)
  }

  const file = formData.get('logo') as File | null
  if (!file) return c.json({ error: 'Missing logo field in form data' }, 400)

  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return c.json({ error: 'Logo must be PNG or JPEG' }, 400)
  }

  if (file.size > MAX_LOGO_BYTES) {
    return c.json({ error: 'Logo must be under 5 MB' }, 400)
  }

  if (file.size === 0) {
    return c.json({ error: 'Logo file is empty' }, 400)
  }

  try {
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)
    const ext = file.type === 'image/png' ? 'png' : 'jpg'

    // uploadLogo now returns the storage path
    const logoPath = await uploadLogo(orgId, buffer, `logo.${ext}`)

    // Persist path in brand_kit, then return a signed URL for immediate display
    const kit = await upsertBrandKit(orgId, { logo_url: logoPath })
    const signedUrl = await getSignedUrl(logoPath, 3600).catch(() => null)

    return c.json({ logo_url: signedUrl ?? kit.logo_url })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})
