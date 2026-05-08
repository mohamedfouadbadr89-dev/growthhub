import { Hono } from 'hono'
import { getBrandKit, upsertBrandKit } from '../../services/creatives/brand-kit.js'
import { uploadLogo, getSignedUrl } from '../../services/creatives/storage.js'
import { ok, fail } from '../../utils/response.js'

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
      return ok(c, { org_id: orgId, logo_url: null, colors: [], fonts: {}, tone_of_voice: null })
    }

    // Generate a signed URL for the logo path (1 hour)
    let logoUrl = kit.logo_url
    if (logoUrl && !logoUrl.startsWith('http')) {
      logoUrl = await getSignedUrl(logoUrl, 3600).catch(() => null)
    }

    return ok(c, { ...kit, logo_url: logoUrl })
  } catch (err) {
    return fail(c, (err as Error).message, 500, { code: 'INTERNAL' })
  }
})

// PUT /brand-kit — upsert colors, fonts, tone_of_voice
brandKitRouter.put('/', async (c) => {
  const orgId = c.get('orgId')

  let body: { colors?: unknown; fonts?: unknown; tone_of_voice?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return fail(c, 'Invalid JSON body', 400, { code: 'INVALID_JSON' })
  }

  const patch: Parameters<typeof upsertBrandKit>[1] = {}

  if (body.colors !== undefined) {
    if (!Array.isArray(body.colors)) return fail(c, 'colors must be an array', 400, { code: 'INVALID_TYPE', field: 'colors' })
    const colors = (body.colors as unknown[])
      .filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c as string))
      .slice(0, 10) as string[]
    patch.colors = colors
  }

  if (body.fonts !== undefined) {
    if (typeof body.fonts !== 'object' || Array.isArray(body.fonts)) {
      return fail(c, 'fonts must be an object', 400, { code: 'INVALID_TYPE', field: 'fonts' })
    }
    patch.fonts = body.fonts as Record<string, string>
  }

  if (body.tone_of_voice !== undefined) {
    if (typeof body.tone_of_voice !== 'string') return fail(c, 'tone_of_voice must be a string', 400, { code: 'INVALID_TYPE', field: 'tone_of_voice' })
    patch.tone_of_voice = body.tone_of_voice.slice(0, 1000)
  }

  try {
    const kit = await upsertBrandKit(orgId, patch)
    return ok(c, kit)
  } catch (err) {
    return fail(c, (err as Error).message, 500, { code: 'INTERNAL' })
  }
})

// POST /brand-kit/logo — upload logo image (multipart/form-data)
brandKitRouter.post('/logo', async (c) => {
  const orgId = c.get('orgId')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return fail(c, 'Expected multipart/form-data', 400, { code: 'INVALID_BODY' })
  }

  const file = formData.get('logo') as File | null
  if (!file) return fail(c, 'Missing logo field in form data', 400, { code: 'MISSING_PARAMETER', field: 'logo' })

  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return fail(c, 'Logo must be PNG or JPEG', 400, { code: 'INVALID_TYPE', field: 'logo' })
  }

  if (file.size > MAX_LOGO_BYTES) {
    return fail(c, 'Logo must be under 5 MB', 400, { code: 'PAYLOAD_TOO_LARGE', field: 'logo' })
  }

  if (file.size === 0) {
    return fail(c, 'Logo file is empty', 400, { code: 'INVALID_BODY', field: 'logo' })
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

    return ok(c, { logo_url: signedUrl ?? kit.logo_url })
  } catch (err) {
    return fail(c, (err as Error).message, 500, { code: 'INTERNAL' })
  }
})
