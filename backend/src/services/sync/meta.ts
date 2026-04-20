import { supabaseAdmin } from '../../lib/supabase.js'
import { readSecret } from '../../lib/vault.js'

interface MetaInsightRow {
  campaign_id: string
  campaign_name: string
  date_start: string
  spend: string
  impressions: string
  clicks: string
  actions?: Array<{ action_type: string; value: string }>
  action_values?: Array<{ action_type: string; value: string }>
}

interface AdAccount {
  id: string
  platform_account_id: string
}

export async function syncMeta(integration: {
  id: string
  org_id: string
  vault_refresh_token_secret_id: string
}): Promise<number> {
  const token = await readSecret(integration.vault_refresh_token_secret_id)

  const { data: existingAccounts } = await supabaseAdmin
    .from('ad_accounts')
    .select('id, platform_account_id')
    .eq('integration_id', integration.id)

  let accounts: AdAccount[] = existingAccounts ?? []

  if (accounts.length === 0) {
    const acctRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,currency&access_token=${token}`
    )
    if (!acctRes.ok) throw new Error(`Meta ad accounts fetch failed: ${acctRes.status}`)
    const acctData = await acctRes.json() as {
      data: Array<{ id: string; name: string; currency?: string }>
    }

    for (const acct of acctData.data) {
      const { data: newAcct } = await supabaseAdmin
        .from('ad_accounts')
        .upsert(
          {
            org_id: integration.org_id,
            integration_id: integration.id,
            platform_account_id: acct.id,
            name: acct.name,
            currency: acct.currency ?? 'USD',
          },
          { onConflict: 'org_id,integration_id,platform_account_id' }
        )
        .select('id, platform_account_id')
        .single()
      if (newAcct) accounts.push(newAcct as AdAccount)
    }
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const until = new Date().toISOString().split('T')[0]
  let totalWritten = 0

  for (const account of accounts) {
    const url = new URL(`https://graph.facebook.com/v21.0/${account.platform_account_id}/insights`)
    url.searchParams.set('fields', 'campaign_id,campaign_name,spend,impressions,clicks,actions,action_values')
    url.searchParams.set('level', 'campaign')
    url.searchParams.set('time_range', JSON.stringify({ since, until }))
    url.searchParams.set('time_increment', '1')
    url.searchParams.set('access_token', token)

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Meta insights fetch failed: ${res.status}`)
    const data = await res.json() as { data: MetaInsightRow[] }

    const rows = data.data.map((row) => {
      const purchase = row.actions?.find((a) => a.action_type === 'purchase')
      const purchaseValue = row.action_values?.find((a) => a.action_type === 'purchase')
      return {
        org_id: integration.org_id,
        ad_account_id: account.id,
        date: row.date_start,
        platform: 'meta',
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        spend: parseFloat(row.spend ?? '0'),
        impressions: parseInt(row.impressions ?? '0', 10),
        clicks: parseInt(row.clicks ?? '0', 10),
        conversions: purchase ? parseInt(purchase.value, 10) : 0,
        revenue: purchaseValue ? parseFloat(purchaseValue.value) : 0,
      }
    })

    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from('campaign_metrics')
        .upsert(rows, { onConflict: 'org_id,ad_account_id,campaign_id,date', ignoreDuplicates: false })
      if (error) throw new Error(`Meta metrics upsert failed: ${error.message}`)
      totalWritten += rows.length
    }
  }

  return totalWritten
}
