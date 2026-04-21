import { Hono } from 'hono'
import { getBrandKit, upsertBrandKit } from '../../services/creatives/brand-kit.js'
import { uploadLogo } from '../../services/creatives/storage.js'

type Variables = { userId: string; orgId: string }

export const brandKitRouter = new Hono<{ Variables: Variables }>()

// GET /brand-kit — fetch org's brand kit
brandKitRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  try {
    const kit = await getBrandKit(orgId)
    return c.json(kit ?? { org_id: orgId, logo_url: null, colors: [], fonts: {}, tone_of_voice: null })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// PUT /brand-kit — upsert brand kit (colors, fonts, tone_of_voice)
brandKitRouter.put('/', async (c) => {
  const orgId = c.get('orgId')

  let body: { colors?: string[]; fonts?: Record<string, string>; tone_of_voice?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const patch: Parameters<typeof upsertBrandKit>[1] = {}
  if (Array.isArray(body.colors)) patch.colors = body.colors.slice(0, 10)
  if (body.fonts && typeof body.fonts === 'object') patch.fonts = body.fonts
  if (typeof body.tone_of_voice === 'string') patch.tone_of_voice = body.tone_of_voice.slice(0, 1000)

  try {
    const kit = await upsertBrandKit(orgId, patch)
    return c.json(kit)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// POST /brand-kit/logo — upload logo image (multipart)
brandKitRouter.post('/logo', async (c) => {
  const orgId = c.get('orgId')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Expected multipart/form-data' }, 400)
  }

  const file = formData.get('logo') as File | null
  if (!file) return c.json({ error: 'Missing logo field' }, 400)

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Logo must be PNG or JPEG' }, 400)
  }

  const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
  if (file.size > MAX_SIZE) {
    return c.json({ error: 'Logo must be under 5 MB' }, 400)
  }

  try {
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)
    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const logoUrl = await uploadLogo(orgId, buffer, `logo.${ext}`)
    const kit = await upsertBrandKit(orgId, { logo_url: logoUrl })
    return c.json({ logo_url: kit.logo_url })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})
