import { supabaseAdmin } from './supabase.js'

export async function createSecret(value: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('vault.create_secret', { secret: value })
  if (error) throw new Error(`Vault createSecret failed: ${error.message}`)
  return data as string
}

export async function readSecret(id: string): Promise<string> {
  // vault.decrypted_secrets is in the vault schema; cast to any to bypass type narrowing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', id)
    .single()
  if (error) throw new Error(`Vault readSecret failed: ${error.message}`)
  return (data as { decrypted_secret: string }).decrypted_secret
}

export async function deleteSecret(id: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('vault.delete_secret', { secret_id: id })
  if (error) throw new Error(`Vault deleteSecret failed: ${error.message}`)
}
