# Feature Specification: MCP Execution Layer with BYOK Support

**Feature Branch**: `008-mcp-byok-execution`
**Created**: 2026-04-27
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Connect a Personal AI Provider Key (Priority: P1)

An org admin wants to use their own AI provider account (OpenAI, Anthropic, or OpenRouter) inside the platform, so that AI features run against their own quota and billing without sharing a platform key.

**Why this priority**: Without a connected key, BYOK users cannot access any AI features. This is the entry point for everything else in the feature.

**Independent Test**: Can be fully tested by navigating to Integrations, adding an AI Assistant (MCP) integration, entering a provider + key, saving, and confirming the card shows "Connected".

**Acceptance Scenarios**:

1. **Given** an org admin is on the Integrations page, **When** they click the "Connect" button on the AI Assistant (MCP) card, **Then** a modal opens with a provider dropdown and an API key input field.
2. **Given** the modal is open, **When** the admin selects a provider and enters a valid API key then submits, **Then** the key is stored securely and the card transitions to "Connected" state.
3. **Given** the admin submits with an empty key, **When** the form validates, **Then** an error is shown and the key is not saved.
4. **Given** the card is in "Connected" state, **When** the admin clicks "Manage", **Then** they can update or remove the stored key.

---

### User Story 2 — Execute an AI Prompt via the MCP Layer (Priority: P2)

An authenticated org member wants to send a prompt to the AI layer and receive a structured response that includes tool-aware context (campaigns, creatives, actions) so that AI responses are grounded in real org data.

**Why this priority**: This is the core execution loop — connecting user intent to AI response enriched with org context.

**Independent Test**: Can be tested by submitting a prompt through the execute endpoint and confirming the response contains an AI answer with tool schema attached and org context injected.

**Acceptance Scenarios**:

1. **Given** a valid org session, **When** a prompt is submitted specifying a provider, model, and message, **Then** the system fetches the stored key, calls the provider, and returns a structured response within 30 seconds.
2. **Given** a repeated identical prompt within the cache window, **When** submitted again, **Then** the cached response is returned without calling the provider again.
3. **Given** an org with no connected AI key, **When** a prompt is submitted, **Then** the request is rejected with a clear "no AI key configured" message.
4. **Given** an org that has exceeded the rate limit, **When** a prompt is submitted, **Then** the request is rejected with a rate-limit error and retry guidance.

---

### User Story 3 — AI Responses Use Org-Specific Tool Context (Priority: P3)

An org member wants AI responses to reference their actual campaigns, creatives, and actions rather than generic knowledge, so that recommendations are actionable and specific to their account.

**Why this priority**: Tool context enrichment is what differentiates this AI layer from a plain chat API — it closes the loop between AI reasoning and platform data.

**Independent Test**: Can be tested by sending a prompt that asks about campaigns and verifying the response references real campaign names or statuses from the org's data.

**Acceptance Scenarios**:

1. **Given** an org with active campaigns, **When** a prompt is executed, **Then** the system injects available tool definitions (get_campaigns, get_creatives, get_actions) into the AI context.
2. **Given** the AI chooses to use a tool, **When** it calls get_campaigns, **Then** the tool handler fetches live campaign data scoped to the org and returns it to the AI.
3. **Given** the prompt builder is active, **When** constructing any request, **Then** system rules preventing auto-execution and hallucinated data are always injected regardless of user input.

---

### Edge Cases

- What happens when the stored API key has been revoked by the provider? → System returns a clear "invalid key" error; the org admin is prompted to update the key.
- What happens if the selected provider is temporarily unavailable? → System returns a provider error; the cached result (if any) is served if still valid.
- What happens if the prompt is extremely long and exceeds the provider's token limit? → System truncates context and notifies the user that context was trimmed.
- What happens if two concurrent requests from the same org hit the rate limit simultaneously? → Both are queued; only the number within the limit are processed, the rest receive rate-limit errors.
- What happens when an admin disconnects a key that is actively in use? → In-flight requests complete; subsequent requests receive "no key configured" error.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a UI card on the Integrations page for "AI Assistant (MCP)" with Connected and Not Connected states.
- **FR-002**: The system MUST present a modal allowing org admins to select a provider (OpenAI, Anthropic, OpenRouter) and enter an API key.
- **FR-003**: The system MUST store the API key encrypted and scoped to the org, never exposing it to the frontend after submission.
- **FR-004**: The system MUST provide an endpoint that accepts a prompt, provider, model, and org context and returns an AI-generated response.
- **FR-005**: The system MUST fetch the org's stored API key server-side before calling the AI provider; keys must never transit through the client.
- **FR-006**: The system MUST inject system-level rules into every prompt — specifically: no autonomous execution of actions, no fabricated data.
- **FR-007**: The system MUST attach MCP tool definitions (get_campaigns, get_creatives, get_actions) to every AI request so the model can request org data.
- **FR-008**: Each MCP tool handler MUST return data scoped exclusively to the requesting org.
- **FR-009**: The system MUST cache AI responses keyed by org and a hash of the prompt content, serving cached responses for identical repeat requests.
- **FR-010**: The system MUST enforce a per-org rate limit on AI execution requests.
- **FR-011**: The system MUST reject all AI execution requests from orgs that have no connected provider key.
- **FR-012**: The system MUST support routing requests to OpenAI, Anthropic, and OpenRouter through a unified interface without the caller specifying provider-specific SDK details.
- **FR-013**: Org admins MUST be able to update or remove a stored API key via the Integrations UI.
- **FR-014**: The system MUST log each AI execution event (provider, model, org, timestamp, cache hit/miss, success/failure) without logging the prompt content or key.

### Key Entities

- **AI Provider Key**: An encrypted credential stored per org, associated with a specific provider (OpenAI, Anthropic, OpenRouter). Has a connected/disconnected state.
- **MCP Execution Request**: A prompt submission carrying provider, model, org context, and the user message. Resolved server-side against the org's stored key.
- **MCP Tool**: A named capability (get_campaigns, get_creatives, get_actions) with an input schema; called by the AI model during a response and fulfilled by the platform.
- **Prompt Package**: The final constructed payload sent to the provider — includes system rules, org context, tool definitions, and user prompt.
- **Execution Cache Entry**: A stored response keyed by org ID and prompt hash, used to avoid redundant provider calls.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Org admins can connect an AI provider key in under 60 seconds from first opening the Integrations page.
- **SC-002**: 100% of AI execution requests use org-scoped keys; zero requests use any shared platform key for BYOK orgs.
- **SC-003**: Identical repeat prompts are served from cache within 200ms; no provider call is made for cache hits.
- **SC-004**: System rules (no auto-execution, no hallucinated data) are present in 100% of prompts sent to any provider.
- **SC-005**: API keys are never present in any frontend payload, log line, or network response after the initial submission.
- **SC-006**: Tool-enriched responses correctly reference org-specific data in at least 95% of prompts that request campaign, creative, or action information.
- **SC-007**: Rate limiting prevents any single org from exceeding the defined request threshold; excess requests receive a structured error within 100ms.

---

## Assumptions

- The existing Supabase Vault infrastructure (used for OAuth tokens) will be reused for storing AI provider keys — no new vault system is needed.
- All AI execution happens server-side; the frontend never holds or transmits a key after the initial save modal.
- The MCP tool handlers call existing internal API endpoints rather than querying the database directly, preserving the existing data access layer.
- Rate limit thresholds will be configured at the infrastructure level; the spec does not prescribe exact numbers (reasonable default: 60 requests/org/minute).
- No changes to existing database schema are required; the org's key reference can be stored in the existing organizations table's vault column pattern.
- The "AI Assistant (MCP)" integration card is additive to the Integrations page — it does not replace or modify any existing integration cards.
- The cache TTL is set to a reasonable default (e.g., 5 minutes) and is configurable without a code change.
- Only org admins (not regular members) can add, update, or remove AI provider keys.
