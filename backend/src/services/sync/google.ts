import { supabaseAdmin } from '../../lib/supabase.js'
import { readSecret } from '../../lib/vault.js'

interface AdAccount {
  id: string
  platform_account_id: string
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function syncGoogle(integration: {
  id: string
  org_id: string
  vault_refresh_token_secret_id: string
}): Promise<number> {
  const refreshToken = await readSecret(integration.vault_refresh_token_secret_id)
  const accessToken = await refreshAccessToken(refreshToken)

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type': 'application/json',
  }

  const { data: existingAccounts } = await supabaseAdmin
    .from('ad_accounts')
    .select('id, platform_account_id')
    .eq('integration_id', integration.id)

  let accounts: AdAccount[] = existingAccounts ?? []

  if (accounts.length === 0) {
    const cusRes = await fetch(
      'https://googleads.googleapis.com/v19/customers:listAccessibleCustomers',
      { headers }
    )
    if (!cusRes.ok) throw new Error(`Google Ads customers fetch failed: ${cusRes.status}`)
    const cusData = await cusRes.json() as { resourceNames?: string[] }

    for (const resourceName of cusData.resourceNames ?? []) {
      const customerId = resourceName.replace('customers/', '')
      const { data: newAcct } = await supabaseAdmin
        .from('ad_accounts')
        .upsert(
          {
            org_id: integration.org_id,
            integration_id: integration.id,
            platform_account_id: customerId,
            name: `Google Ads ${customerId}`,
            currency: 'USD',
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
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        segments.date
      FROM campaign
      WHERE segments.date BETWEEN '${since}' AND '${until}'
        AND campaign.status != 'REMOVED'
    `.trim()

    const res = await fetch(
      `https://googleads.googleapis.com/v19/customers/${account.platform_account_id}/googleAds:searchStream`,
      { method: 'POST', headers, body: JSON.stringify({ query }) }
    )
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Google Ads searchStream failed: ${res.status} ${errText}`)
    }

    const text = await res.text()
    const rows: Array<{
      org_id: string
      ad_account_id: string
      date: string
      platform: string
      campaign_id: string
      campaign_name: string
      spend: number
      impressions: number
      clicks: number
      conversions: number
      revenue: number
    }> = []

    for (const line of text.split('\n').filter((l) => l.trim())) {
      try {
        const batch = JSON.parse(line) as {
          results?: Array<{
            campaign: { id: string; name: string }
            metrics: {
              impressions: string
              clicks: string
              costMicros: string
              conversions: string
              conversionsValue: string
            }
            segments: { date: string }
          }>
        }
        for (const result of batch.results ?? []) {
          rows.push({
            org_id: integration.org_id,
            ad_account_id: account.id,
            date: result.segments.date,
            platform: 'google',
            campaign_id: result.campaign.id,
            campaign_name: result.campaign.name,
            spend: parseInt(result.metrics.costMicros ?? '0', 10) / 1_000_000,
            impressions: parseInt(result.metrics.impressions ?? '0', 10),
            clicks: parseInt(result.metrics.clicks ?? '0', 10),
            conversions: parseInt(result.metrics.conversions ?? '0', 10),
            revenue: parseFloat(result.metrics.conversionsValue ?? '0'),
          })
        }
      } catch {
        // Skip malformed NDJSON lines
      }
    }

    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from('campaign_metrics')
        .upsert(rows, { onConflict: 'org_id,ad_account_id,campaign_id,date', ignoreDuplicates: false })
      if (error) throw new Error(`Google metrics upsert failed: ${error.message}`)
      totalWritten += rows.length
    }
  }

  return totalWritten
}
