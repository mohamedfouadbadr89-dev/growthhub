import { supabaseAdmin } from '../../lib/supabase.js'
import { readSecret } from '../../lib/vault.js'

interface ShopifyOrderEdge {
  node: {
    id: string
    createdAt: string
    totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  }
}

export async function syncShopify(integration: {
  id: string
  org_id: string
  vault_refresh_token_secret_id: string
}): Promise<number> {
  const token = await readSecret(integration.vault_refresh_token_secret_id)

  // The ad_account was created during connect/complete with platform_account_id = shop domain
  const { data: adAccount } = await supabaseAdmin
    .from('ad_accounts')
    .select('id, platform_account_id, integration_id')
    .eq('integration_id', integration.id)
    .single()

  if (!adAccount) throw new Error('No ad account found for Shopify integration')
  const shopDomain = adAccount.platform_account_id

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const rows: Array<{
    org_id: string
    ad_account_id: string
    integration_id: string
    date: string
    platform: string
    campaign_id: string
    campaign_name: null
    spend: number
    impressions: number
    clicks: number
    conversions: number
    revenue: number
  }> = []

  let cursor: string | null = null
  let hasNextPage = true

  while (hasNextPage) {
    const afterClause = cursor ? `, after: "${cursor}"` : ''
    const query = `
      query {
        orders(first: 250${afterClause}, query: "created_at:>=${since}") {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              createdAt
              totalPriceSet { shopMoney { amount currencyCode } }
            }
          }
        }
      }
    `

    const res = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!res.ok) throw new Error(`Shopify GraphQL request failed: ${res.status}`)
    const data = await res.json() as {
      data: {
        orders: {
          pageInfo: { hasNextPage: boolean; endCursor: string }
          edges: ShopifyOrderEdge[]
        }
      }
    }

    const { edges, pageInfo } = data.data.orders
    hasNextPage = pageInfo.hasNextPage
    cursor = pageInfo.endCursor

    for (const edge of edges) {
      const order = edge.node
      const orderId = order.id.replace('gid://shopify/Order/', '')
      const date = order.createdAt.split('T')[0]
      const revenue = parseFloat(order.totalPriceSet.shopMoney.amount)

      rows.push({
        org_id: integration.org_id,
        ad_account_id: adAccount.id as string,
        integration_id: adAccount.integration_id as string,
        date,
        platform: 'shopify',
        campaign_id: orderId,
        campaign_name: null,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 1,
        revenue,
      })
    }
  }

  if (rows.length > 0) {
    const { error } = await supabaseAdmin
      .from('campaign_metrics')
      .upsert(rows, { onConflict: 'org_id,ad_account_id,campaign_id,date', ignoreDuplicates: false })
    if (error) throw new Error(`Shopify metrics upsert failed: ${error.message}`)
  }

  return rows.length
}
