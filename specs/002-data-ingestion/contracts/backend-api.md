# Backend API Contracts: Phase 2 — Data Ingestion

Base URL: `NEXT_PUBLIC_BACKEND_URL`
All `/api/v1/` endpoints require `Authorization: Bearer <clerk_session_token>`.
All responses are scoped to the authenticated user's `org_id` (enforced by auth middleware).

---

## Integrations

### GET /api/v1/integrations

List all integrations for the authenticated organization.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "platform": "meta",
    "status": "connected",
    "lastSyncedAt": "2026-04-20T02:05:00.000Z",
    "createdAt": "2026-04-01T10:00:00.000Z"
  }
]
```

---

### POST /api/v1/integrations/connect/start

Generate the platform OAuth authorization URL. The backend creates a signed
`state` token (stored in DB for validation) and returns the full redirect URL.

**Request body**:
```json
{ "platform": "meta" | "google" | "shopify" }
```

**Response 200**:
```json
{
  "authUrl": "https://www.facebook.com/dialog/oauth?client_id=...&state=...",
  "state": "signed-state-token"
}
```

**Response 400** (platform already connected):
```json
{ "error": "Conflict", "message": "Platform already connected for this organization" }
```

---

### POST /api/v1/integrations/connect/complete

Exchange authorization code for tokens, store in Supabase Vault, create the
integration record. Called by the Next.js OAuth callback route
(`/api/integrations/callback/[platform]`) server-side.

**Request body**:
```json
{
  "platform": "meta",
  "code": "auth-code-from-platform",
  "state": "signed-state-token"
}
```

**Response 200**:
```json
{ "integrationId": "uuid", "platform": "meta", "status": "connected" }
```

**Response 400** (invalid/expired state):
```json
{ "error": "Bad Request", "message": "Invalid or expired OAuth state" }
```

**Response 500** (token exchange failed):
```json
{ "error": "Internal Server Error", "message": "OAuth token exchange failed" }
```

---

### DELETE /api/v1/integrations/:id

Disconnect an integration. Sets status to `'disconnected'`, deletes the Vault
secret. Historical synced data is preserved.

**Response 204**: No content.

**Response 404**: Integration not found or does not belong to the organization.

---

### POST /api/v1/integrations/:id/sync

Trigger an immediate manual sync for the specified integration.

**Response 202**:
```json
{ "jobId": "inngest-event-id", "message": "Sync queued" }
```

**Response 409** (sync already in progress):
```json
{ "error": "Conflict", "message": "A sync is already in progress for this integration" }
```

**Response 404**: Integration not found or not connected.

---

### GET /api/v1/integrations/:id/sync-logs

Retrieve sync history for a specific integration, most recent first.

**Query parameters**: `?limit=20&offset=0`

**Response 200**:
```json
[
  {
    "id": "uuid",
    "startedAt": "2026-04-20T02:00:00.000Z",
    "completedAt": "2026-04-20T02:04:30.000Z",
    "status": "success",
    "recordsWritten": 1420,
    "errorMessage": null
  }
]
```

---

## Metrics

### GET /api/v1/metrics/summary

Return aggregate metrics across all connected platforms for the org.

**Query parameters**: `?from=2026-04-01&to=2026-04-20` (ISO date, both required)

**Response 200**:
```json
{
  "spend": 15234.50,
  "impressions": 4820000,
  "clicks": 48200,
  "conversions": 963,
  "revenue": 48100.00,
  "roas": 3.16,
  "dateRange": { "from": "2026-04-01", "to": "2026-04-20" }
}
```

**Response 400** (invalid date range):
```json
{ "error": "Bad Request", "message": "from and to query parameters are required (YYYY-MM-DD)" }
```

---

### GET /api/v1/metrics/channels

Return metrics broken down by platform. Same date range parameters as `/metrics/summary`.

**Query parameters**: `?from=2026-04-01&to=2026-04-20`

**Response 200**:
```json
[
  {
    "platform": "meta",
    "spend": 9000.00,
    "impressions": 3000000,
    "clicks": 30000,
    "conversions": 600,
    "revenue": 30000.00,
    "roas": 3.33
  },
  {
    "platform": "google",
    "spend": 4234.50,
    "impressions": 1500000,
    "clicks": 15000,
    "conversions": 300,
    "revenue": 15000.00,
    "roas": 3.54
  },
  {
    "platform": "shopify",
    "spend": 2000.00,
    "impressions": 320000,
    "clicks": 3200,
    "conversions": 63,
    "revenue": 3100.00,
    "roas": 1.55
  }
]
```

---

## Inngest (Internal)

### POST /api/inngest

Inngest function registration and event handler endpoint. Registered via
`serve({ client: inngest, functions })` — handled by the Inngest SDK, not
manually implemented.

**Inngest functions registered**:

| Function ID | Trigger | Purpose |
|-------------|---------|---------|
| `daily-sync-all` | `cron: "0 2 * * *"` | Fan out one `integration/sync.requested` event per active integration |
| `sync-integration` | `integration/sync.requested` | Pull platform data, upsert campaign_metrics, write sync_log |

**Event: `integration/sync.requested`**:
```json
{ "name": "integration/sync.requested", "data": { "integrationId": "uuid", "orgId": "org_xxx" } }
```

---

## Frontend: OAuth Callback Route (Next.js)

### GET /api/integrations/callback/[platform]

Server-side Next.js route that receives the OAuth redirect from the platform.
Validates `state`, calls backend `POST /api/v1/integrations/connect/complete`,
then redirects the user.

**Query parameters** (from platform redirect): `?code=xxx&state=xxx`

**On success**: Redirects to `/integrations?connected=<platform>`

**On failure**: Redirects to `/integrations?error=oauth_failed`

**Security**: The `state` parameter is validated server-side before any token
exchange. Requests missing `state` or `code` are rejected immediately.
