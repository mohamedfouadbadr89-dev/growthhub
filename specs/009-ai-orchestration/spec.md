# Feature Specification: AI Execution Orchestration Pipeline (Phase X)

**Feature Branch**: `009-ai-orchestration`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Phase X — single, centralized backend pipeline that ties together the Phase 3 AI components (validation, logging, persistence) so every AI interaction follows one strict, fail-loud, audit-complete flow."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A backend service generates a validated AI decision and persists it (Priority: P1)

A backend handler running inside an authenticated request needs to obtain a structured AI decision (for example, a recommendation or anomaly explanation) and have it stored along with a complete audit trail. Today this would require manually composing the validator, the logger, and the persistence layer in the right order — high risk of misordering, missing log lines, or writing unvalidated output. With the orchestration pipeline, the handler calls one function, hands it the prompt + the AI provider call, and receives a structured response. All audit, validation, and persistence happen automatically and in the correct order.

**Why this priority**: This is the entire point of Phase X. Without it, Phase 3 components stay disconnected and every future feature that touches AI has to re-derive the integration. This story alone delivers a usable Phase X (any other story below can be added later without breaking it).

**Independent Test**: Invoke the orchestrator with a stubbed provider that returns a contract-valid payload, verify (a) the function returns a structured result containing a trace id, a stored-decision id, and the validated response; (b) the audit trail records exactly the lifecycle of one AI call in correct order; (c) the validated response and stored decision id reference the same trace id.

**Acceptance Scenarios**:

1. **Given** an authenticated server-side request with a known org and user, a model identifier, a prompt, and a provider call that returns a contract-valid payload, **When** the orchestration entry point is invoked, **Then** the system records a "request" event, a "raw" event, a "validated" event, and a "persisted" event — all with the same trace id and in that order — and returns a structured result containing the trace id, the stored-decision id, and the validated response.
2. **Given** the same setup as above, **When** the call succeeds, **Then** the validated decision is persisted exactly once with the org id taken from the request context and not from the AI output.
3. **Given** a service that already has a validated AI response and tries to call persistence directly without going through the orchestrator, **When** the code is reviewed, **Then** the architecture forbids that path: the orchestrator is the only sanctioned producer of persistence inputs.

---

### User Story 2 — An AI provider call fails and the system records why (Priority: P1)

The AI provider is unreachable, returns a 5xx, or its client throws for any reason. The handler must be able to surface the failure cleanly, the audit log must contain a clear "transport_error" record, and no unvalidated or partial decision must be persisted.

**Why this priority**: Transport failures are routine in any external-API integration. If the system silently swallows them or persists half-states, the audit trail becomes untrustworthy and the Phase 3 contract is broken on day one. This is a tied-P1 with Story 1 because both must work for the pipeline to be usable.

**Independent Test**: Provide a stubbed provider whose call throws a known error, invoke the orchestrator, verify (a) a "request" event then a "transport_error" event with non-zero latency are recorded under the same trace id; (b) no "validated" or "persisted" event appears; (c) no decision row is written; (d) the orchestrator throws a typed error to the caller.

**Acceptance Scenarios**:

1. **Given** a provider call that throws a network-style error, **When** the orchestrator runs, **Then** the audit trail contains exactly one "request" event followed by exactly one "transport_error" event sharing one trace id, both events captured before the error reaches the caller.
2. **Given** the same scenario, **When** the orchestrator throws back to the caller, **Then** the thrown error is typed (the caller can distinguish it from validation or persistence errors) and the original cause is preserved.
3. **Given** the same scenario, **When** the audit trail is queried, **Then** there are no "raw", "validated", "validation_error", "persisted", or "persistence_error" events for that trace id.

---

### User Story 3 — A provider returns malformed AI output (Priority: P1)

The provider returns successfully but its payload does not match the AI Output Contract (wrong type enum, missing reasoning steps, confidence score out of range, etc.). The orchestrator must record both the raw payload AND the structured validation failure so future debugging can see exactly what the model produced and why it was rejected.

**Why this priority**: This is the contract-enforcement boundary. If validation failures are not faithfully recorded with the raw payload, the team cannot iterate on prompt design or detect model drift. Persistence must be unreachable on this path.

**Independent Test**: Provide a stubbed provider that returns a payload missing required contract fields, invoke the orchestrator, verify (a) the audit trail records a "request", a "raw" (with the original malformed payload), and a "validation_error" event under one trace id; (b) the validation_error event carries a structured detail naming the failing field and the value received; (c) no decision is persisted; (d) the orchestrator throws a typed validation error.

**Acceptance Scenarios**:

1. **Given** a provider call that returns a malformed payload, **When** the orchestrator runs, **Then** the audit trail contains a "request" event, a "raw" event with the unmodified payload, and a "validation_error" event with a structured detail (field path + reason + received value) — in that order, all under one trace id.
2. **Given** the same scenario, **When** the call ends, **Then** no decision row was written and the caller receives a typed validation error.
3. **Given** the validation error event, **When** an operator inspects the audit log, **Then** they can recover both the original raw payload and the precise validation reason without needing to reproduce the call.

---

### User Story 4 — Operators can route every audit event to durable storage (Priority: P2)

The default audit trail goes to console output. For long-term audit, the team needs the option to also store every audit event in the database so the lifecycle of any AI call can be reconstructed weeks or months later from the same audit-log table that the persistence layer already owns. This routing is opt-in and can be configured at process startup; if the database route fails for any reason, the console route must still work and operators must see the failure.

**Why this priority**: Phase 3 already specifies "store: prompt, response, model, latency". Story 1 covers persisting the decision; this story covers persisting the surrounding lifecycle so the audit trail is complete. P2 because the system is already useful with console-only audit; durable audit is the next-level requirement.

**Independent Test**: Enable the database routing option at startup, run an end-to-end success scenario (Story 1) and a transport-error scenario (Story 2), then query the audit-log store; verify every emitted event appears as a row tagged with the correct trace id, phase, and org id; then simulate a database outage during routing and verify the console route still shows every event.

**Acceptance Scenarios**:

1. **Given** durable audit routing is enabled, **When** a successful pipeline run completes, **Then** every audit event from that run (request, raw, validated, persisted) appears both in the console output and in the durable audit store with the same trace id.
2. **Given** durable audit routing is enabled and the database is temporarily unavailable, **When** the pipeline runs, **Then** the console output still shows every audit event and a clear note describes that durable storage failed for that event; the pipeline result is unaffected.
3. **Given** durable audit routing is disabled (the default), **When** the pipeline runs, **Then** events appear only in console output and no audit-store rows are written; behavior of validation, decision persistence, and the returned result is unchanged.

---

### Edge Cases

- The provider call returns a partial payload (some contract fields present, others missing): treated as a validation failure — Story 3 path.
- The provider call returns a payload that violates the contract on the derived approval status (e.g., low confidence with an attempted high-status override): the validator overrides the status from the confidence score; the orchestrator persists the corrected status. The audit trail must show the raw payload faithfully and the validated payload with the corrected status.
- The decision persistence step fails (database unreachable, constraint violation): the audit trail records the validation success and a "persistence_error" event; the orchestrator throws a typed persistence error to the caller; no partial row is left behind.
- The caller passes an empty or non-string org id: the orchestrator refuses the call before any provider invocation, records the refusal in the audit trail, and throws.
- The caller does not provide an authenticated user id: the orchestrator runs the pipeline (user id is optional metadata) but every audit event still carries the org id.
- A configured durable-audit sink throws while the pipeline is running: the failure is reported once on the console and never silently swallowed; the in-pipeline result is unaffected.
- The provider takes a very long time to respond: the orchestrator measures and records latency at the terminal event; the request event has no latency (it is the start). Timeout handling is out of scope and is the caller's responsibility.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose exactly one orchestration entry point that runs the full AI execution pipeline; no other code path may combine validation and decision persistence directly.
- **FR-002**: The orchestration entry point MUST accept the org id and (when present) the user id from server-side authenticated request context only, never from the prompt body or the AI output.
- **FR-003**: The orchestration entry point MUST generate exactly one trace id per AI call and tag every audit event for that call with that trace id.
- **FR-004**: The orchestration entry point MUST emit a "request" audit event before invoking the AI provider.
- **FR-005**: The orchestration entry point MUST measure elapsed time from immediately before the provider call and attach it to every subsequent terminal audit event for that call.
- **FR-006**: On a successful AI provider response, the system MUST emit a "raw" audit event capturing the unmodified payload before any validation runs.
- **FR-007**: On a failed AI provider call (any thrown error), the system MUST emit a "transport_error" audit event with the captured error name and message, then propagate a typed error to the caller; no validation or persistence MUST run.
- **FR-008**: On a successful validation, the system MUST emit a "validated" audit event carrying the validated response.
- **FR-009**: On a contract violation during validation, the system MUST emit a "validation_error" audit event carrying the raw payload and the structured failure detail (field, reason, received value), then propagate a typed validation error to the caller; no decision persistence MUST run.
- **FR-010**: The system MUST persist the validated decision exactly once per successful pipeline run, and MUST do so only after the validated audit event has been emitted.
- **FR-011**: The persistence step MUST receive the org id directly from the orchestration entry point's caller-provided context, not from the AI response.
- **FR-012**: The persistence step's own success and failure audit events ("persisted" / "persistence_error") MUST NOT be duplicated by the orchestration layer.
- **FR-013**: The system MUST NOT allow any code path to construct or pass a "validated AI response" to the persistence step except via the validation step inside the orchestration entry point.
- **FR-014**: On any failure at any step, an audit event for that failure MUST be emitted before the error propagates to the caller, so the audit trail survives uncaught exceptions in caller code.
- **FR-015**: The system MUST provide an opt-in mechanism to also route every audit event to durable storage for long-term audit, in addition to the default console route.
- **FR-016**: When durable audit routing is enabled and a single event fails to reach durable storage, the console route for that event MUST still succeed and the failure MUST be reported once on the console; the in-pipeline result MUST be unaffected.
- **FR-017**: When durable audit routing is enabled, the durable storage path MUST be recursion-safe: a failure inside the routing step MUST NOT trigger another routing step that could re-fail.
- **FR-018**: Audit-event ordering for any single AI call MUST be: "request" first; then either ("transport_error") or ("raw" → ("validation_error" or "validated" → "persisted" / "persistence_error")). The system MUST NOT emit any other ordering for a single trace id.
- **FR-019**: The orchestration entry point MUST return a structured result on success containing the trace id, the stored decision id, and the validated response; it MUST NOT return on any failure path.
- **FR-020**: The orchestration entry point MUST be the only consumer that supplies inputs to the decision persistence step (single-source-of-callsite invariant).

### Key Entities *(include if feature involves data)*

- **AI execution call**: One end-to-end attempt to obtain a validated AI decision. Identified by a single trace id. Carries: model identifier, kind label, prompt, org id, user id (optional), start timestamp, total elapsed time at terminal event.
- **Audit event**: One record in the lifecycle of an AI execution call. Carries: trace id, phase (request | raw | validated | validation_error | transport_error | persisted | persistence_error), level (info | warn | error), timestamp, org id, user id, model, plus phase-specific payload fields (prompt, raw response, validated response, latency, error detail).
- **Validated AI decision**: The output of a successful pipeline run. Carries: trace id, type, result, confidence score, derived approval status, reasoning steps, org id. Constructed only by the validation step; consumed only by the persistence step inside the orchestrator.
- **Pipeline result**: What the orchestration entry point returns on success. Carries: trace id, stored decision id, validated AI decision.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every successful AI execution call, the audit trail contains exactly one event per lifecycle phase (request, raw, validated, persisted) and zero spurious events; ordering is request → raw → validated → persisted.
- **SC-002**: For every failed AI execution call, the audit trail contains the "request" event and exactly one terminal failure event (transport_error, validation_error, or persistence_error), with no "validated" or "persisted" event present.
- **SC-003**: 100% of decision rows produced by the system carry the org id supplied by the authenticated request context; zero rows carry an org id sourced from the AI provider output.
- **SC-004**: 100% of decision rows are produced by the orchestration entry point; zero are produced by any other call site (verified by code review and structural search of the codebase).
- **SC-005**: When the AI provider call throws, no decision row is created and no "validated" audit event is emitted; verified across at least three distinct simulated provider failure modes (network error, non-2xx response, malformed-JSON response).
- **SC-006**: When the AI provider returns a payload that violates the contract, no decision row is created and the operator can recover both the raw payload and the structured failure detail from the audit trail without reproducing the call.
- **SC-007**: With durable audit routing enabled, every emitted audit event also appears in the durable audit store within a time window short enough that the next pipeline run's events are clearly separable; verified by trace id grouping.
- **SC-008**: With durable audit routing enabled and the durable store unavailable, every audit event still appears on the console; the pipeline result returned to the caller is identical to the console-only configuration.
- **SC-009**: A new backend developer can add a feature that needs an AI decision by calling the orchestration entry point and the persistence layer alone; they do not need to learn the validation or logging modules to integrate correctly.
- **SC-010**: An auditor can reconstruct the lifecycle of any AI execution call from a single trace id by querying the audit store; the events tell a complete story (what was sent, what came back, was it valid, was it stored).

## Assumptions

- Phase 3 components — validation, logging, decision persistence, audit-log persistence — are present, stable, and conform to their existing contracts (the validator throws structured errors; the logger is passive; the decision persistence layer requires an already-validated response and emits its own success/failure audit events).
- The org id and user id are extracted by the existing authentication middleware before any orchestration code runs, and are available on the server-side request context at the moment the orchestration entry point is invoked.
- The AI provider call is presented to the orchestrator as a thunk (a deferred async function) so the orchestrator can time it, surround it with audit events, and substitute mocks in tests; the orchestrator does not itself construct provider clients.
- Provider calls are single-shot for this iteration; retry, exponential backoff, and streaming responses are explicitly out of scope.
- Wiring the orchestration entry point into a Hono route is out of scope for this spec; the pipeline is built and verified standalone first.
- Tool-governance and MCP routing concerns described elsewhere in the project specs (mcp-orchestration.md, mcp-integration.md) are deferred to a later orchestration iteration.
- Durable audit routing reuses the existing audit-log persistence layer; no new audit-log table is introduced for this feature.
- The system-control document's lock condition for Phase X is treated as non-blocking for this iteration; any necessary correction to that document is a separate atomic change outside this spec's scope.
