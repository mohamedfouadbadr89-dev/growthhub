import { syncMeta } from './meta.js'
import { syncGoogle } from './google.js'
import { syncShopify } from './shopify.js'

interface Integration {
  id: string
  org_id: string
  platform: string
  vault_refresh_token_secret_id: string
}

export async function dispatchSync(integration: Integration): Promise<number> {
  switch (integration.platform) {
    case 'meta':
      return syncMeta(integration)
    case 'google':
      return syncGoogle(integration)
    case 'shopify':
      return syncShopify(integration)
    default:
      throw new Error(`Unknown platform: ${integration.platform}`)
  }
}
