import { supabaseAdmin } from '../../lib/supabase.js'

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'creatives'

export async function uploadImage(
  orgId: string,
  generationId: string,
  imageBuffer: Buffer,
  fileName: string
): Promise<string> {
  const path = `${orgId}/${generationId}/${fileName}`

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, imageBuffer, { contentType: 'image/png', upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadLogo(
  orgId: string,
  imageBuffer: Buffer,
  fileName: string
): Promise<string> {
  const path = `${orgId}/brand-kit/${fileName}`

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, imageBuffer, { contentType: 'image/png', upsert: true })

  if (error) throw new Error(`Logo upload failed: ${error.message}`)

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
