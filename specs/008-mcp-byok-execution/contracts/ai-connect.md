# API Contract: POST /api/v1/ai/connect + DELETE /api/v1/ai/connect

**Route file**: `backend/src/routes/v1/ai.ts`
**Auth**: Clerk JWT required; org admin role required

---

## POST /api/v1/ai/connect — Store Provider Key

### Request

```http
POST /api/v1/ai/connect
Authorization: Bearer <clerk_jwt>
Content-Type: application/json
```

```json
{
  "provider": "openai",
  "api_key": "sk-..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | `"openai" \| "anthropic" \| "openrouter"` | Yes | AI provider |
| `api_key` | string | Yes | The raw API key — stored encrypted, never returned |

### Response: 200 OK

```json
{ "connected": true, "provider": "openai" }
```

### Error Responses

| Status | Code | When |
|--------|------|------|
| 400 | `MISSING_FIELDS` | `provider` or `api_key` not provided |
| 400 | `INVALID_PROVIDER` | Provider not one of the three supported values |
| 400 | `EMPTY_KEY` | `api_key` is blank |
| 500 | `VAULT_ERROR` | Supabase Vault storage failed |

### Execution Flow

```
1. Validate provider + api_key
2. If org already has vault_byok_mcp_secret_id → deleteSecret(existing_id) first
3. createSecret(api_key) → new vault_secret_id
4. UPDATE organizations SET vault_byok_mcp_secret_id = new_id, vault_byok_mcp_provider = provider WHERE org_id = orgId
5. Return { connected: true, provider }
```

---

## DELETE /api/v1/ai/connect — Remove Provider Key

### Request

```http
DELETE /api/v1/ai/connect
Authorization: Bearer <clerk_jwt>
```

No body required.

### Response: 200 OK

```json
{ "disconnected": true }
```

### Execution Flow

```
1. Load vault_byok_mcp_secret_id from organizations
2. If NULL → return { disconnected: true } (idempotent)
3. deleteSecret(vault_byok_mcp_secret_id)
4. UPDATE organizations SET vault_byok_mcp_secret_id = NULL, vault_byok_mcp_provider = NULL WHERE org_id = orgId
5. Return { disconnected: true }
```

---

## GET /api/v1/ai/connect — Status Check

### Response: 200 OK

```json
{ "connected": true, "provider": "openai" }
```
or
```json
{ "connected": false, "provider": null }
```

**Note**: API key is NEVER returned in any GET response.
