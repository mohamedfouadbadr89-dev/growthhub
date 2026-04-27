# Quickstart: MCP Execution Layer with BYOK Support

**Feature**: 008-mcp-byok-execution

---

## Scenario 1: Org admin connects an OpenRouter key

**Precondition**: Org has no AI key connected.

1. Admin navigates to `/integrations`.
2. The "AI Assistant (MCP)" card shows status "Not Connected" with a "Connect" button.
3. Admin clicks "Connect" → `<ByokModal>` opens.
4. Admin selects provider "OpenRouter" and enters their API key.
5. Modal submits `POST /api/v1/ai/connect` with `{ provider: "openrouter", api_key: "sk-or-..." }`.
6. Backend calls `createSecret(api_key)` → stores encrypted in Vault → updates `organizations` row.
7. Modal closes; card transitions to "Connected / OpenRouter" state.

**Test assertion**: `GET /api/v1/ai/connect` returns `{ connected: true, provider: "openrouter" }`.

---

## Scenario 2: Org member executes an AI prompt

**Precondition**: Org has OpenRouter key connected (Scenario 1 complete).

1. Client sends:
   ```json
   POST /api/v1/ai/execute
   { "provider": "openrouter", "model": "google/gemini-2.0-flash-001", "prompt": "Which campaigns should I scale?" }
   ```
2. Backend: rate-limit check passes, cache miss.
3. Backend: `readSecret(vault_byok_mcp_secret_id)` → API key retrieved.
4. Prompt builder constructs system prompt with rules + org context + 3 tool definitions.
5. AI client calls OpenRouter → model invokes `get_campaigns` tool.
6. Tool handler queries `campaigns` table scoped to `org_id`.
7. Tool result re-submitted to model → final text response generated.
8. Response cached. Return:
   ```json
   { "response": "Your top campaign is 'Summer...' at 4.6x ROAS...", "tool_calls": [...], "cached": false }
   ```

**Test assertion**: Response references real campaign names from the org's data.

---

## Scenario 3: Rate limit exceeded

**Precondition**: Org sends 61 requests within 60 seconds.

1. First 60 requests succeed normally.
2. 61st request: rate-limiter detects `count >= 60` within window.
3. Backend returns:
   ```json
   HTTP 429
   { "error": "RATE_LIMITED", "retryAfterMs": 34000 }
   ```

**Test assertion**: Response status is 429; `retryAfterMs` value is > 0 and ≤ 60000.

---

## Scenario 4: Cache hit on repeat prompt

**Precondition**: Scenario 2 has run successfully.

1. Client sends identical prompt, provider, and model.
2. Backend: rate-limit passes, cache key matches.
3. Cached response returned in < 200ms.
4. Response includes `"cached": true`.

**Test assertion**: `cached: true` in response; no Vault read occurs; provider not called.

---

## Scenario 5: Admin disconnects key

**Precondition**: Key is connected (Scenario 1).

1. Admin clicks "Manage" on the AI Assistant card → sees disconnect option.
2. Confirm disconnect → `DELETE /api/v1/ai/connect`.
3. Backend: `deleteSecret(existing_id)` → NULLs both columns in `organizations`.
4. Card returns to "Not Connected" state.

**Test assertion**: `GET /api/v1/ai/connect` returns `{ connected: false, provider: null }`. Subsequent execute calls return 402 `NO_AI_KEY`.

---

## Scenario 6: No key configured → blocked with clear message

**Precondition**: Org has never connected a key.

1. Client attempts `POST /api/v1/ai/execute`.
2. Backend: checks `vault_byok_mcp_secret_id` → `NULL`.
3. Returns:
   ```json
   HTTP 402
   { "error": "NO_AI_KEY" }
   ```

**Test assertion**: Status 402, no Vault lookup, no provider call.

---

## Scenario 7: System prompt enforcement

**Precondition**: Any execute request.

1. Prompt builder always prepends:
   - Rule: "You MUST NOT autonomously execute any actions."
   - Rule: "You MUST NOT fabricate data. Only reference data returned by tools."
2. These rules are present regardless of user prompt content.

**Test assertion**: System message in every provider request contains both enforcement rules.
