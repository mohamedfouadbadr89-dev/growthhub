# Data Model: MCP Execution Layer with BYOK Support

**Feature**: 008-mcp-byok-execution
**Date**: 2026-04-27

---

## Entities

### 1. AI Provider Key (extends existing `organizations` table)

Two new columns added via additive migration. No new table required.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `vault_byok_mcp_provider` | TEXT | YES | `'openai'`, `'anthropic'`, or `'openrouter'` |
| `vault_byok_mcp_secret_id` | UUID | YES | Supabase Vault secret ID; `NULL` = no key connected |

**Constraints**:
- `vault_byok_mcp_provider CHECK (vault_byok_mcp_provider IN ('openai', 'anthropic', 'openrouter'))`
- No RLS change needed — existing `org_isolation` policy on `organizations` already restricts reads to own org

**State transitions**:
```
NULL (not connected)
  → POST /api/v1/ai/connect → Connected (secret_id set, provider set)
  → DELETE /api/v1/ai/connect → NULL (secret deleted from vault, columns NULLed)
  → POST /api/v1/ai/connect (update) → Connected (old secret deleted, new one stored)
```

---

### 2. Execution Cache Entry (in-process, not persisted to DB)

Managed by `backend/src/lib/ai-cache.ts`. Not stored in Supabase.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | `${orgId}:${sha256(provider + model + normalizedPrompt)}` |
| `value` | object | Full AI response payload |
| `expiresAt` | number | Unix timestamp (ms); entries past this are evicted |

**TTL**: 5 minutes (configurable via `AI_CACHE_TTL_MS` env var, defaults to `300000`)

---

### 3. Rate Limiter State (in-process, not persisted to DB)

Managed by `backend/src/lib/rate-limiter.ts`.

| Field | Type | Description |
|-------|------|-------------|
| `orgId` | string (key) | Organization identifier |
| `count` | number | Requests in current window |
| `windowStart` | number | Unix timestamp (ms) when current window began |

**Limit**: 60 requests/org/minute (configurable via `AI_RATE_LIMIT` env var, defaults to `60`)
**Window**: 60 seconds, sliding

---

### 4. MCP Tool Definition (in-memory schema, not persisted)

Defined in `backend/src/services/ai/mcp-tools.ts`.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Tool identifier (`get_campaigns`, `get_creatives`, `get_actions`) |
| `description` | string | Human-readable purpose |
| `input_schema` | object | JSON Schema for tool parameters |
| `handler` | function | `(params, orgId) => Promise<unknown>` |

---

### 5. Prompt Package (ephemeral, never stored)

Assembled by `backend/src/services/ai/prompt-builder.ts` per request.

| Field | Type | Description |
|-------|------|-------------|
| `system` | string | System rules + org context injected |
| `messages` | array | User message(s) |
| `tools` | array | MCP tool definitions in provider format |
| `model` | string | Provider-specific model identifier |

---

## Relationships

```
organizations (1)
  ↓ has at most one
AI Provider Key (vault_byok_mcp_secret_id)
  ↓ referenced by
POST /api/v1/ai/execute (fetches key → calls provider)
  ↓ passes to
Prompt Package (built per request)
  ↓ submitted to
AI Provider (OpenAI / Anthropic / OpenRouter)
  ↓ response cached in
Execution Cache Entry (keyed by org + prompt hash)
```

---

## Migration File

**New file**: `supabase/migrations/20260427000008_mcp_byok.sql`

```sql
-- Additive only — adds MCP BYOK columns to organizations
-- Follows the same pattern as migration 20260420000003_intelligence.sql

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS vault_byok_mcp_provider TEXT
    CHECK (vault_byok_mcp_provider IN ('openai', 'anthropic', 'openrouter')),
  ADD COLUMN IF NOT EXISTS vault_byok_mcp_secret_id UUID;
```

No RLS changes required. No new tables. No index needed (lookup is always by `org_id` via the existing primary key).
