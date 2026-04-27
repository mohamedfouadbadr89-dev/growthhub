# Tasks: MCP Execution Layer with BYOK Support

**Input**: Design documents from `/specs/008-mcp-byok-execution/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story (P1 → P2 → P3) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration — additive only, no schema changes to existing tables

- [X] T001 Create Supabase migration `supabase/migrations/20260427000008_mcp_byok.sql` — ADD COLUMN IF NOT EXISTS `vault_byok_mcp_provider TEXT CHECK(vault_byok_mcp_provider IN ('openai','anthropic','openrouter'))` and `vault_byok_mcp_secret_id UUID` on `organizations` table

**Checkpoint**: Migration file ready — no existing schema is touched

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend infrastructure that all user stories depend on — cache, rate limiter, and unified AI client

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Create `backend/src/lib/ai-cache.ts` — Map-based in-process TTL cache with `get(key)`, `set(key, value, ttlMs)`, `has(key)` methods; auto-evicts on read if expired; default TTL 5 minutes
- [X] T003 [P] Create `backend/src/lib/rate-limiter.ts` — Sliding-window per-org rate limiter with `check(orgId): boolean` and `retryAfterMs(orgId): number`; default 60 req/60s per org; window configurable via env
- [X] T004 [P] Create `backend/src/services/ai/ai-client.ts` — `createAiClient(provider, apiKey)` returning an OpenAI SDK instance; routes `openai` → `https://api.openai.com/v1`, `anthropic` → `https://api.anthropic.com/v1`, `openrouter` → `https://openrouter.ai/api/v1`; throws on unknown provider

**Checkpoint**: Foundation ready — lib and service infrastructure in place; user story implementation can now begin

---

## Phase 3: User Story 1 — Connect a Personal AI Provider Key (Priority: P1) 🎯 MVP

**Goal**: Org admin can open the Integrations page, click "Connect" on the AI Assistant (MCP) card, enter a provider + API key, save it encrypted in Supabase Vault, and see the card reflect "Connected" state. Disconnect removes the key.

**Independent Test**: Navigate to `/integrations`, open the AI Assistant (MCP) card modal, submit a provider + key, confirm `GET /api/v1/ai/connect` returns `{ connected: true, provider: "openrouter" }`.

### Implementation for User Story 1

- [X] T005 [US1] Create `backend/src/routes/v1/ai.ts` with a Hono router — implement `GET /connect` (status check from `organizations.vault_byok_mcp_provider`), `POST /connect` (validate provider + api_key, deleteSecret if existing secret present, createSecret, UPDATE organizations), `DELETE /connect` (deleteSecret, NULL columns); all routes require Clerk JWT auth; admin-only for POST/DELETE; use `supabaseAdmin` for all DB ops
- [X] T006 [P] [US1] Create `components/ai/byok-modal.tsx` — React component with props `{ isOpen: boolean; onClose: () => void; onSaved: (provider: string) => void }`; provider dropdown (OpenAI / Anthropic / OpenRouter); API key input (type=password); submits `POST /api/v1/ai/connect` via `apiClient`; shows disconnect button with `DELETE /api/v1/ai/connect` when already connected; closes and calls `onSaved(provider)` on success
- [X] T007 [US1] Update `app/integrations/connect/page.tsx` — add `aiConnected` and `aiProvider` state (loaded on mount via `GET /api/v1/ai/connect`), add `showByokModal` state, add entry to `INTEGRATIONS` array with id `"mcp-ai"` / name `"AI Assistant (MCP)"` / Sparkles icon / bg-violet-50 / text-violet-600 / entities `["Campaigns","Creatives","Actions"]`, override Connect/Manage button for `mcp-ai` to open `ByokModal` instead of calling `handleConnect`

**Checkpoint**: User Story 1 fully functional — org admin can connect, view, and disconnect an AI key end-to-end

---

## Phase 4: User Story 2 — Execute an AI Prompt via the MCP Layer (Priority: P2)

**Goal**: Authenticated org member submits `POST /api/v1/ai/execute` with provider, model, and prompt. System rate-checks, cache-checks, vault-fetches the stored key, builds prompt package, calls provider, caches result, returns structured response. Repeat identical prompt returns cached response.

**Independent Test**: Submit `POST /api/v1/ai/execute` with a valid prompt; confirm response contains `{ response, tool_calls, cached: false, provider, model }`. Submit again; confirm `cached: true` returned under 200ms.

### Implementation for User Story 2

- [X] T008 [P] [US2] Create `backend/src/services/ai/prompt-builder.ts` — export `buildPrompt({ userPrompt, orgId, context? }): { system: string; userMessage: string }`; system section always includes "You MUST NOT autonomously execute any actions." and "You MUST NOT fabricate data. Only reference data returned by tools."; injects org ID and optional page context; attaches MCP tool definitions from mcp-tools.ts
- [X] T009 [P] [US2] Create `backend/src/services/ai/mcp-tools.ts` — export `MCP_TOOLS: ChatCompletionTool[]` array with 3 tool definitions (get_campaigns, get_creatives, get_actions) matching the schemas in `specs/008-mcp-byok-execution/contracts/mcp-tools.md`; export stub `callTool(name, params, orgId): Promise<unknown>` dispatcher (stubs return `[]` — real handlers added in Phase 5)
- [X] T010 [US2] Add `POST /execute` handler to `backend/src/routes/v1/ai.ts` — full 12-step flow per `specs/008-mcp-byok-execution/contracts/ai-execute.md`: validate fields → rate-limit check (429) → cache check (200 cached=true) → load vault_byok_mcp_secret_id from org (402 if null) → readSecret → buildPrompt → createAiClient → call provider with MCP_TOOLS → resolve tool calls via callTool loop → cache result → return 200 with response+tool_calls+cached=false+provider+model
- [X] T011 [US2] Add route registration to `backend/src/routes/v1/index.ts` — add exactly 2 lines: `import { aiRouter } from './ai.js'` and `v1.route('/ai', aiRouter)`

**Checkpoint**: User Stories 1 + 2 functional — end-to-end execute flow works with stub tool handlers returning empty arrays

---

## Phase 5: User Story 3 — AI Responses Use Org-Specific Tool Context (Priority: P3)

**Goal**: When the AI calls a tool (get_campaigns, get_creatives, or get_actions), the handler queries the real Supabase tables scoped to the org and returns live data. AI response references actual campaign names / creative records / actions.

**Independent Test**: Send prompt "Which campaigns should I scale?" with an org that has active campaigns — confirm response references real campaign names from `campaigns` table; confirm `tool_calls` array in response contains the get_campaigns entry with real data.

### Implementation for User Story 3

- [X] T012 [US3] Implement `get_campaigns` handler in `backend/src/services/ai/mcp-tools.ts` — queries `campaigns` table via `supabaseAdmin` scoped to `orgId`; optional `status` filter (active/paused/learning/all); `limit` param (default 10, max 50); returns array of `{ id, name, status, platform, budget, spend, roas }` only; returns `[]` if no data; throws on timeout >5s
- [X] T013 [P] [US3] Implement `get_creatives` handler in `backend/src/services/ai/mcp-tools.ts` — queries `creatives` table via `supabaseAdmin` scoped to `orgId`; optional `campaign_id` filter; `limit` param (default 10, max 50); returns array of `{ id, headline, body, cta, score, status, campaign_id }` only; returns `[]` if no data; throws on timeout >5s
- [X] T014 [P] [US3] Implement `get_actions` handler in `backend/src/services/ai/mcp-tools.ts` — queries `actions_library` table via `supabaseAdmin` scoped to `orgId`; optional `platform` filter (meta/google/tiktok/all); optional `action_type` filter; returns array of `{ id, name, platform, action_type, description }` only; returns `[]` if no data; throws on timeout >5s
- [X] T015 [US3] Wire `callTool` dispatcher in `backend/src/services/ai/mcp-tools.ts` to route `get_campaigns` → T012 handler, `get_creatives` → T013 handler, `get_actions` → T014 handler; throw `unknown tool` error for unrecognized names

**Checkpoint**: All 3 user stories fully functional — AI responses grounded in live org data

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate against quickstart scenarios and ensure all edge cases are handled

- [ ] T016 [P] Validate Scenario 1 (connect key) from `specs/008-mcp-byok-execution/quickstart.md` — confirm `GET /api/v1/ai/connect` returns `{ connected: true, provider }` after POST
- [ ] T017 [P] Validate Scenario 2 (execute prompt with tool calls) — confirm response references real campaign names from org data; tool_calls array non-empty
- [ ] T018 [P] Validate Scenario 3 (rate limit 429) — confirm 61st request in 60s returns HTTP 429 `{ error: "RATE_LIMITED", retryAfterMs: N }`
- [ ] T019 [P] Validate Scenario 4 (cache hit) — confirm repeat identical prompt returns `cached: true` in < 200ms without vault read
- [ ] T020 [P] Validate Scenario 5 (disconnect) — confirm `GET /api/v1/ai/connect` returns `{ connected: false, provider: null }` after DELETE; confirm execute returns 402
- [ ] T021 [P] Validate Scenario 6 (no key → 402) — confirm org with no key gets `{ error: "NO_AI_KEY" }` on execute
- [ ] T022 [P] Validate Scenario 7 (system prompt enforcement) — confirm every execute request includes both enforcement rules in system message

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — can start after Foundational
- **Phase 4 (US2)**: Depends on Phase 3 (requires T005 ai.ts to extend) and Phase 2
- **Phase 5 (US3)**: Depends on Phase 4 (extends mcp-tools.ts stubs from T009)
- **Phase 6 (Polish)**: Depends on all implementation phases complete

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete — no inter-story dependencies
- **US2 (P2)**: Requires US1 complete (T005 ai.ts file must exist to add execute handler) + Phase 2
- **US3 (P3)**: Requires US2 complete (T009 mcp-tools.ts stubs must exist to replace handlers)

### Within Each Phase

- T002, T003, T004 in Phase 2: all [P] — create different files, run in parallel
- T005, T006 in Phase 3: T006 [P] — different files, T005 must complete before T007 (integrations page needs byok-modal import)
- T008, T009 in Phase 4: both [P] — different files, run before T010 which depends on both
- T010 depends on T008 + T009; T011 depends on T010
- T012, T013, T014 in Phase 5: T013 and T014 are [P]; T012 must complete first (dispatcher uses all three)
- Phase 6 tasks all [P] — independent validation scenarios

---

## Parallel Execution Examples

```bash
# Phase 2 — all 3 foundational files in parallel:
Task T002: backend/src/lib/ai-cache.ts
Task T003: backend/src/lib/rate-limiter.ts
Task T004: backend/src/services/ai/ai-client.ts

# Phase 3 — modal and route handler in parallel (different files):
Task T005: backend/src/routes/v1/ai.ts (connect endpoints)
Task T006: components/ai/byok-modal.tsx

# Phase 4 — prompt builder and tool schema in parallel:
Task T008: backend/src/services/ai/prompt-builder.ts
Task T009: backend/src/services/ai/mcp-tools.ts (stubs)

# Phase 5 — creatives and actions handlers in parallel (after campaigns handler):
Task T013: get_creatives handler
Task T014: get_actions handler
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Migration file
2. Complete Phase 2: ai-cache.ts + rate-limiter.ts + ai-client.ts
3. Complete Phase 3: ai.ts connect routes + byok-modal.tsx + integrations page
4. **STOP and VALIDATE**: GET /api/v1/ai/connect returns connected state after POST
5. Org admin can connect and disconnect a key end-to-end

### Incremental Delivery

1. Phase 1 + 2 → Infrastructure ready
2. Phase 3 → Key management works (US1 MVP complete)
3. Phase 4 → Execute endpoint works with stub tools (US2 complete — stubs return `[]`)
4. Phase 5 → Real tool data wired (US3 complete — AI responses reference real org data)
5. Phase 6 → Validated against all quickstart scenarios

---

## Notes

- Zero new npm dependencies — uses existing openai SDK v4 for all 3 providers via baseURL override
- Only 2 lines added to existing file (index.ts route registration) — all other changes are new files
- integrations/connect/page.tsx change is additive (new card + modal state only; existing cards/handlers unchanged)
- Cache key format: `${orgId}:${sha256hex(provider + model + prompt)}`
- Rate limiter default: 60 req / 60s per org (env-configurable)
- All tool handlers MUST return `[]` not throw when no data found
- API keys NEVER returned in GET responses or logs
