# Quickstart: Phase 2 — Data Ingestion

## Prerequisites

- Phase 1 complete and working (Clerk auth, Supabase schema, Hono backend)
- OAuth app credentials for each platform (see Platform Setup below)
- Inngest account created at inngest.com

---

## 1. Backend Environment (`backend/.env`)

Add to existing Phase 1 vars:

```env
# Inngest
INNGEST_EVENT_KEY=event_xxx
INNGEST_SIGNING_KEY=signkey-xxx

# Meta Ads API
META_APP_ID=xxx
META_APP_SECRET=xxx

# Google Ads API
GOOGLE_ADS_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=xxx
GOOGLE_ADS_DEVELOPER_TOKEN=xxx

# Shopify
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx

# OAuth redirect base (must match registered redirect URIs)
OAUTH_REDIRECT_BASE_URL=https://your-app.com
```

## 2. Frontend Environment (`.env.local`)

Add to existing Phase 1 vars:

```env
# No new public vars needed for Phase 2
# Backend URL is already set as NEXT_PUBLIC_BACKEND_URL
```

---

## 3. Apply Database Migrations

```bash
# From repo root
supabase db push
# Applies: 20260420000002_data_ingestion.sql
```

Verify tables exist in Supabase Studio:
- `integrations`
- `ad_accounts`
- `campaign_metrics` (check partitions: `campaign_metrics_2026_q1`, etc.)
- `sync_logs`

---

## 4. Platform Setup

### Meta Ads

1. Create a Meta App at [developers.facebook.com](https://developers.facebook.com)
2. Add the Marketing API product
3. Under OAuth Settings, add Valid OAuth Redirect URI:
   `https://your-app.com/api/integrations/callback/meta`
4. Copy App ID + App Secret → `META_APP_ID`, `META_APP_SECRET`
5. In your Meta Business Suite: create a System User, grant it access to Ad Accounts, generate a token

### Google Ads

1. Create OAuth2 credentials at [console.cloud.google.com](https://console.cloud.google.com)
2. Add Authorized Redirect URI: `https://your-app.com/api/integrations/callback/google`
3. Enable the Google Ads API
4. Copy Client ID + Secret → `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`
5. Obtain a Developer Token from your Google Ads account (Tools → API Center)

### Shopify

1. Create a Partner app at [partners.shopify.com](https://partners.shopify.com)
2. Add Allowed Redirect URL: `https://your-app.com/api/integrations/callback/shopify`
3. Set Required Scopes: `read_orders`
4. Copy API Key + Secret → `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`

---

## 5. Inngest Setup

```bash
# Install Inngest CLI for local development
npm install -g inngest-cli

# Start Inngest dev server (tunnels to your localhost backend)
inngest dev

# In a separate terminal, start the backend
cd backend && npm run dev
```

The Inngest dev server will automatically discover functions registered at
`http://localhost:3001/api/inngest`.

---

## 6. Run Frontend & Backend

```bash
# Terminal 1 — Frontend
npm run dev        # http://localhost:3000

# Terminal 2 — Backend
cd backend && npm run dev   # http://localhost:3001

# Terminal 3 — Inngest dev server
inngest dev
```

---

## Integration Test Scenarios

### Scenario 1: Connect Meta integration

1. Sign in and navigate to `/integrations`
2. Click "Connect" on Meta Ads
3. Complete the OAuth flow in the popup/redirect
4. Verify:
   - `integrations` table has a row: `platform='meta'`, `status='connected'` ✓
   - `vault.secrets` has a new entry (via Supabase Studio → Database → Vault) ✓
   - `/integrations` page shows Meta as "Connected" ✓

### Scenario 2: Automatic initial sync

1. After connecting (Scenario 1), wait for the sync job to complete (or trigger via Inngest dev UI)
2. Verify:
   - `ad_accounts` table has rows for the connected Meta ad accounts ✓
   - `campaign_metrics` table has rows for the last 30 days ✓
   - `sync_logs` table has a row: `status='success'`, `records_written > 0` ✓
   - `/integrations` page shows updated "Last synced" timestamp ✓

### Scenario 3: Manual re-sync

```bash
TOKEN="eyJ..."
INTEGRATION_ID="uuid-from-integrations-table"

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/integrations/$INTEGRATION_ID/sync

# Expected: 202 { "jobId": "...", "message": "Sync queued" }
```

### Scenario 4: Dashboard shows real data

1. After sync completes, navigate to `/dashboard/overview`
2. Verify real spend/revenue numbers are displayed (not zeros or placeholders) ✓

```bash
TOKEN="eyJ..."
FROM="2026-04-01"
TO="2026-04-20"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/metrics/summary?from=$FROM&to=$TO"

# Expected: 200 { spend, impressions, clicks, conversions, revenue, roas }
```

### Scenario 5: Org isolation (SC-002)

```bash
TOKEN_ORG_A="eyJ..."
TOKEN_ORG_B="eyJ..."

# Org A requests metrics
curl -H "Authorization: Bearer $TOKEN_ORG_A" \
  "http://localhost:3001/api/v1/integrations"

# Org B token MUST NOT return Org A's integrations
curl -H "Authorization: Bearer $TOKEN_ORG_B" \
  "http://localhost:3001/api/v1/integrations"
# Expected: [] (empty array — Org B sees only its own data)
```

### Scenario 6: Duplicate sync prevention (SC-006)

Trigger the same integration sync twice in sequence. Verify:
- `campaign_metrics` row count does not double ✓
- `sync_logs` has two entries; both `status='success'` ✓
- `records_written` is the same on both entries ✓
