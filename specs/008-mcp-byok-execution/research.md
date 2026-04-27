# Research: MCP Execution Layer with BYOK Support

**Feature**: 008-mcp-byok-execution
**Date**: 2026-04-27

---

## Decision 1: BYOK Key Storage Mechanism

**Decision**: Add two additive columns to the existing `organizations` table via a new migration:
- `vault_byok_mcp_provider TEXT` — which provider (openai | anthropic | openrouter)
- `vault_byok_mcp_secret_id UUID` — Supabase Vault secret ID referencing the encrypted key

**Rationale**: The project already uses this exact pattern in migration `20260420000003_intelligence.sql` where `vault_byok_openrouter_secret_id UUID` was added to `organizations`. Reusing the same pattern is consistent, additive (no destructive changes), and leverages the existing `createSecret`/`readSecret`/`deleteSecret` vault utilities in `backend/src/lib/vault.ts`. No new tables, no new dependencies.

**Alternatives considered**:
- Repurposing `vault_byok_openrouter_secret_id`: Rejected — that column is semantically tied to the LTD/AppSumo plan_type BYOK flow; conflating the two use cases would break the billing separation principle.
- New table `ai_provider_keys`: Viable but heavier than needed; organization is already the correct unit of key ownership.
- Storing in `integrations` table with `platform = 'mcp_ai'`: Rejected — the `platform` column has a `CHECK` constraint (`meta | google | shopify`) that would require modification.

---

## Decision 2: AI Provider Unification Strategy

**Decision**: Create `backend/src/services/ai/ai-client.ts` that routes to three providers using only the existing `openai` SDK (v4, already installed):
- **OpenAI**: direct OpenAI SDK, no base URL override
- **OpenRouter**: OpenAI SDK with `baseURL: 'https://openrouter.ai/api/v1'` (same pattern as `openrouter.ts`)
- **Anthropic**: OpenAI-compatible endpoint via `https://api.anthropic.com/v1` using OpenAI SDK (Anthropic exposes an OpenAI-compatible interface)

**Rationale**: Zero new npm dependencies. The `openai` package is already in `backend/package.json`. All three providers support the OpenAI Chat Completions format. The existing `getOpenRouterClient()` in `openrouter.ts` already proves the OpenAI SDK can target non-OpenAI base URLs.

**Alternatives considered**:
- `@anthropic-ai/sdk`: Full Anthropic SDK would require adding a new package dependency. Rejected to preserve the "no modifications to existing files" constraint on `package.json`.
- Fetch-based implementation: Would work but adds boilerplate for each provider. The OpenAI SDK already handles retries, streaming, and type safety.

---

## Decision 3: Response Cache Implementation

**Decision**: Use a module-level `Map<string, { value: unknown; expiresAt: number }>` with a configurable TTL (default 5 minutes) as the cache backend, housed in a new `backend/src/lib/ai-cache.ts` file.

**Rationale**: Upstash Redis is in the tech stack (CLAUDE.md) but is not currently wired into the backend (no `@upstash/redis` in `backend/package.json`, no Redis env vars in `.env.example`). An in-process Map is sufficient for the initial layer and requires zero new infrastructure. The cache key is `${orgId}:${sha256(provider+model+prompt)}`. The module can be swapped to Redis in a follow-up without changing the consumer interface.

**Alternatives considered**:
- Upstash Redis: Ideal for multi-instance deployments. Deferred — requires adding the npm package and env vars, which touches existing files.
- No cache: Rejected — repeated identical prompts would always hit the provider, increasing latency and cost.

---

## Decision 4: Route Registration (Minimal Required Modification)

**Decision**: Add two lines to `backend/src/routes/v1/index.ts`:
```ts
import { aiRouter } from './ai.js'
v1.route('/ai', aiRouter)
```

**Rationale**: There is no mechanism in the Hono framework to dynamically load routes without touching the index. This is the minimal possible change — two lines, isolated, additive, does not alter any existing route or handler. All other existing routes remain untouched.

**Alternatives considered**:
- Standalone Hono server on a different port: Rejected — violates the single Backend API principle in the Constitution.
- Dynamic plugin loading: Not supported by current Hono setup and would require architectural changes.

---

## Decision 5: MCP Tool Handler Implementation

**Decision**: Each MCP tool handler (`get_campaigns`, `get_creatives`, `get_actions`) makes an authenticated internal Supabase query via `supabaseAdmin` scoped to `org_id`, mirroring the pattern used in all existing route handlers.

**Rationale**: Calling existing API endpoints over HTTP (localhost) would add latency and require managing auth tokens within the tool handler. Direct `supabaseAdmin` queries are already the established pattern for all backend services (`decisions.ts`, `campaigns.ts`, etc.) and run in the same process.

**Alternatives considered**:
- Call internal REST endpoints: Would need a service token or localhost URL. More network hops, more complexity.
- Import from existing service modules: Some services mix route and DB logic. Direct Supabase queries in the tool schema keep the MCP layer self-contained.

---

## Decision 6: Rate Limiting Implementation

**Decision**: Implement a sliding-window rate limiter using a module-level `Map<orgId, { count: number; windowStart: number }>` with a default of 60 requests per org per minute. Store in `backend/src/lib/rate-limiter.ts` (new file).

**Rationale**: No rate-limiting middleware currently exists in the backend. Using an in-process map keeps this self-contained and dependency-free. Default threshold is 60 req/min per org — conservative for AI workloads. The rate limiter module is reusable across future AI endpoints.

---

## Decision 7: Frontend BYOK Modal

**Decision**: Create `components/ai/byok-modal.tsx` as a pure React component receiving `onClose` and `onSaved` callbacks. It calls the new `POST /api/v1/ai/connect` endpoint via the existing `apiClient` utility in the frontend.

**Rationale**: Follows the existing component pattern. The integrations connect page (`app/integrations/connect/page.tsx`) will be updated minimally — a new card added to the existing `INTEGRATIONS` array and the modal imported. The card follows the exact same structure as the 6 existing integration cards.
