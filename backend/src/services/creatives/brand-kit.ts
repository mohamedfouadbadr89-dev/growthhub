import { supabaseAdmin } from '../../lib/supabase.js'

export interface BrandKit {
  id: string
  org_id: string
  logo_url: string | null
  colors: string[]
  fonts: Record<string, string>
  tone_of_voice: string | null
  created_at: string
  updated_at: string
}

export async function getBrandKit(orgId: string): Promise<BrandKit | null> {
  const { data, error } = await supabaseAdmin
    .from('brand_kits')
    .select('*')
    .eq('org_id', orgId)
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw new Error(`getBrandKit failed: ${error.message}`)
  return data as BrandKit
}

export async function upsertBrandKit(
  orgId: string,
  patch: Partial<Pick<BrandKit, 'logo_url' | 'colors' | 'fonts' | 'tone_of_voice'>>
): Promise<BrandKit> {
  const now = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('brand_kits')
    .upsert(
      { org_id: orgId, ...patch, updated_at: now },
      { onConflict: 'org_id' }
    )
    .select('*')
    .single()

  if (error) throw new Error(`upsertBrandKit failed: ${error.message}`)
  return data as BrandKit
}
