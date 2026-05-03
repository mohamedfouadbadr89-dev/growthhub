import { supabaseAdmin } from '../../lib/supabase.js'

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'creatives'

// Upload and return the storage PATH (not a URL).
// Callers must use getSignedUrl() to produce a time-limited access URL.
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
  return path
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
  return path
}

// Generate a signed URL valid for `expiresIn` seconds (default 3600 = 1 hour).
// Only the backend (service_role key) can call this — never expose to frontend.
export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL for ${path}: ${error?.message ?? 'unknown'}`)
  }
  return data.signedUrl
}

// Batch-generate signed URLs.  Returns a map of path → signed URL.
// Paths that fail are omitted (logged but not thrown).
export async function getSignedUrls(
  paths: string[],
  expiresIn = 3600
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrls(paths, expiresIn)

  if (error) {
    console.error('[storage] createSignedUrls error:', error.message)
    return {}
  }

  const result: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) result[item.path] = item.signedUrl
  }
  return result
}
