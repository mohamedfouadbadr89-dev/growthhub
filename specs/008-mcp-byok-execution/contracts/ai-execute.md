# API Contract: POST /api/v1/ai/execute

**Route file**: `backend/src/routes/v1/ai.ts`
**Auth**: Clerk JWT required (same middleware as all other v1 routes)

---

## Request

```http
POST /api/v1/ai/execute
Authorization: Bearer <clerk_jwt>
Content-Type: application/json
```

```json
{
  "provider": "openrouter",
  "model": "google/gemini-2.0-flash-001",
  "prompt": "Which of my campaigns have the best ROAS this week?",
  "context": {
    "page": "decisions",
    "selectedCampaignId": null
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | `"openai" \| "anthropic" \| "openrouter"` | Yes | Which provider to route to |
| `model` | string | Yes | Provider-specific model name |
| `prompt` | string | Yes | User message |
| `context` | object | No | Optional caller context injected into prompt |

---

## Response: 200 OK

```json
{
  "response": "Your top performing campaign is 'Summer Collection 2024' with a ROAS of 4.6x...",
  "tool_calls": [
    {
      "tool": "get_campaigns",
      "result": { "campaigns": [ { "name": "Summer Collection 2024", "roas": 4.6 } ] }
    }
  ],
  "cached": false,
  "provider": "openrouter",
  "model": "google/gemini-2.0-flash-001"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | Final AI text response |
| `tool_calls` | array | Tools invoked during generation (empty if none) |
| `cached` | boolean | `true` if served from cache |
| `provider` | string | Provider that handled the request |
| `model` | string | Model used |

---

## Error Responses

| Status | Code | When |
|--------|------|------|
| 400 | `MISSING_FIELDS` | `provider`, `model`, or `prompt` not provided |
| 400 | `INVALID_PROVIDER` | Provider not one of the three supported values |
| 402 | `NO_AI_KEY` | Org has no connected AI provider key |
| 429 | `RATE_LIMITED` | Org has exceeded 60 req/min; `retryAfterMs` included |
| 500 | `PROVIDER_ERROR` | Provider API call failed |

```json
{ "error": "RATE_LIMITED", "retryAfterMs": 42000 }
```

---

## Execution Flow

```
1. Validate request fields
2. Check org rate limit → 429 if exceeded
3. Check cache (org_id + hash(provider+model+prompt)) → return 200 cached=true if hit
4. Load org's vault_byok_mcp_secret_id + vault_byok_mcp_provider from organizations
5. If no key → 402 NO_AI_KEY
6. readSecret(vault_byok_mcp_secret_id) → raw API key
7. Build prompt package (system rules + org context + MCP tools + user prompt)
8. Instantiate AI client for provider
9. Call provider API (with tool schema)
10. Resolve any tool calls (get_campaigns, get_creatives, get_actions) → re-submit with tool results
11. Store result in cache
12. Return 200 with response + tool_calls + cached=false
```
