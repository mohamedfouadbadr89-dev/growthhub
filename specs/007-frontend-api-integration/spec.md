# Feature Specification: Frontend → Backend Integration

**Feature Branch**: `007-frontend-api-integration`
**Created**: 2026-04-21
**Status**: Draft
**Input**: Full frontend API integration with Clerk JWT, centralized API client, and real backend data for all pages

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Dashboard Data (Priority: P1)

A logged-in user visits the Dashboard Overview and sees real-time performance metrics pulled from the backend — spend, revenue, ROAS, conversions — not placeholder numbers. The data reflects their organization's actual ad account activity.

**Why this priority**: The dashboard is the first page users land on after sign-in. If it shows static data, every other feature appears broken. Live data here proves the entire data pipeline is working end-to-end.

**Independent Test**: Navigate to Dashboard Overview after sign-in; the page shows a loading skeleton, then resolves to real metric numbers (or a clear empty state with a CTA if no data exists yet).

**Acceptance Scenarios**:

1. **Given** a signed-in user with connected integrations, **When** they open the Dashboard, **Then** real spend/revenue/ROAS figures appear within 3 seconds and match backend records.
2. **Given** a signed-in user with no integrations yet, **When** they open the Dashboard, **Then** an empty state with a "Connect Integration" prompt is shown — no broken UI or console errors.
3. **Given** a session that has expired, **When** the Dashboard tries to load data, **Then** a friendly "Your session expired — please sign in again" message appears with a sign-in link.
4. **Given** the backend is unreachable, **When** the Dashboard tries to load data, **Then** a "Connection failed — check your internet" message appears with a Retry button.

---

### User Story 2 - Brand Kit & Creatives Real Data (Priority: P1)

A user managing their brand kit can upload a logo, set colors, and update tone of voice — all persisted to the backend. A user generating creatives sees real generation results and can browse previously generated creatives, with each page reflecting the actual saved state.

**Why this priority**: Brand Kit and Creatives are core product features. Users cannot do meaningful work if the save button silently discards their input.

**Independent Test**: Open Brand Kit, update the tone of voice field, save — then refresh the page and confirm the new value persists. Open Creatives, trigger a generation, and see results load from the backend.

**Acceptance Scenarios**:

1. **Given** a user on Brand Kit, **When** they update any field and save, **Then** the saved values persist on refresh with no data loss.
2. **Given** a user on Brand Kit, **When** they upload a logo file, **Then** the logo appears after upload and persists on refresh.
3. **Given** a user on Creatives, **When** they submit a generation request, **Then** results appear from the backend (not mocked), including copy headlines and images.
4. **Given** a user on Creatives with no previous generations, **When** they open the page, **Then** an empty state with a "Generate your first creative" prompt is shown.

---

### User Story 3 - Decisions & Actions Live Data (Priority: P2)

A user navigating to Decisions sees AI-generated decisions for their organization. Clicking into a decision shows its full detail. The Actions library shows available automation templates, and the execution logs reflect real runs.

**Why this priority**: Decisions and Actions are the intelligence and execution layers. Without real data they are unusable, but they depend on P1 infrastructure being in place.

**Independent Test**: Open Decisions — see a list or empty state. Open an individual decision — see its detail or a 404 message. Open Actions — see the library or empty state.

**Acceptance Scenarios**:

1. **Given** a user on Decisions Overview, **When** the page loads, **Then** decisions for their org appear (or a clear empty state if none exist).
2. **Given** a user clicking a specific decision, **When** the detail page loads, **Then** the trigger, reasoning, and confidence score are shown.
3. **Given** a user on Actions Library, **When** the page loads, **Then** available action templates appear with their platform and type.
4. **Given** a user clicking "Execute" on an action, **When** execution completes, **Then** the result appears and the action log is updated.
5. **Given** a server error during any of the above, **When** the fetch fails with a 500, **Then** a "Server error — try again later" message with a Retry button appears.

---

### User Story 4 - Integrations & Automation History (Priority: P2)

A user on the Integrations page sees their connected platforms and their sync status. A user on Automation History can review the complete decision memory — every past decision with its trigger, data snapshot, result, and AI explanation.

**Why this priority**: Integrations drive all data; without real status, users cannot diagnose sync failures. History is the learning loop — must show real records to be useful.

**Independent Test**: Open Integrations — see connected/disconnected platform cards. Open Automation History — see a table of past decisions or an empty state.

**Acceptance Scenarios**:

1. **Given** a user on Integrations, **When** the page loads, **Then** each platform shows its connection status (connected/disconnected) and last sync time.
2. **Given** a user on Automation History, **When** the page loads, **Then** all past decision records are listed with result (success/failed/skipped), confidence score, and AI explanation.
3. **Given** a user on Automation History with no records yet, **When** the page loads, **Then** an empty state with contextual guidance is shown.

---

### Edge Cases

- What happens when a Clerk token is missing or expired before a fetch? → Show session-expired message with sign-in link; do not send request without token.
- What happens when a user's organization has no data yet? → Every page shows a purposeful empty state with a CTA (not blank or broken).
- What happens when the backend returns an unexpected error format (non-JSON body)? → Fall back to a generic "Something went wrong" message without crashing.
- What happens when a network request takes more than 10 seconds? → Show the loading state until response arrives; if browser times out, show connection-failed message.
- What happens if the user's account is on an LTD plan without a BYOK key? → AI features show a specific "Add your API key in Settings" prompt (not a generic error).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a single centralized request function that attaches the authenticated user's identity token to every backend call.
- **FR-002**: The centralized request function MUST work in both interactive browser pages and server-rendered page contexts without duplication.
- **FR-003**: Every page that fetches data MUST display a loading skeleton while the request is in flight.
- **FR-004**: Every page that fetches data MUST display an error message with a Retry button when the request fails.
- **FR-005**: Every page that fetches data MUST display a purposeful empty state with a contextual call-to-action when the backend returns zero records.
- **FR-006**: Error messages MUST be user-friendly and specific per error type: session expiry (401), access denied (403), not found (404), server error (500), and network failure.
- **FR-007**: The backend MUST accept requests from the local development origin without blocking them.
- **FR-008**: All mock and hardcoded data arrays MUST be removed from the frontend codebase before this feature is considered complete.
- **FR-009**: Dashboard Overview MUST fetch real spend, revenue, ROAS, conversions, and channel breakdown data from the backend.
- **FR-010**: Brand Kit MUST persist logo, colors, and tone-of-voice settings to the backend and reload them on page mount.
- **FR-011**: Creatives MUST submit generation requests to the backend and display returned results; previously generated creatives MUST load from the backend.
- **FR-012**: Decisions pages MUST fetch decision records and individual decision details from the backend.
- **FR-013**: Actions pages MUST fetch the action library, individual action details, execution logs, and automation rule status from the backend.
- **FR-014**: Integrations page MUST display each platform's real connection status, last sync time, and account details from the backend.
- **FR-015**: Automation History MUST fetch and display all past decision records including trigger, data snapshot, result, AI explanation, and confidence score.
- **FR-016**: All backend requests MUST include the authenticated user's identity token in the request authorization header.
- **FR-017**: The frontend MUST never access the database directly or include any database credentials.

### Key Entities

- **API Request**: An outbound call from the frontend to the backend, carrying the user's session token, targeting a specific resource endpoint, and returning typed data or an error.
- **UI State**: One of four display modes each data-fetching page must support — loading (skeleton), error (message + retry), empty (CTA), success (data rendered).
- **Session Token**: A short-lived credential issued by the authentication provider, attached to every request to prove the user's identity to the backend.
- **Error Response**: A structured failure from the backend (or network layer) translated into a user-facing message categorized by type (auth, access, not-found, server, network).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero hardcoded data arrays remain anywhere in the frontend codebase after implementation.
- **SC-002**: Every data-fetching page displays all four UI states (loading, error, empty, success) when each condition is triggered.
- **SC-003**: All outbound requests from the frontend carry an authorization token — verifiable by inspecting network traffic.
- **SC-004**: All outbound requests target the production backend host — no requests go to localhost or any other address.
- **SC-005**: The backend accepts requests from the development origin without returning CORS errors — verifiable by checking response headers.
- **SC-006**: Users can complete the full Brand Kit → save → refresh → see persisted data flow with no data loss.
- **SC-007**: Users can trigger a creative generation and see real results appear within the expected generation time.
- **SC-008**: The Decisions, Actions, Integrations, and Automation History pages all render real records or a purposeful empty state — never a broken/blank page.
- **SC-009**: No unhandled promise rejections or uncaught errors appear in the browser console during normal operation.
- **SC-010**: Session expiry produces a readable "Your session expired" message — not a raw error code or blank screen.

## Assumptions

- The backend at the production host is running and healthy before frontend integration begins.
- All backend API endpoints referenced in this spec already exist and return the expected response shapes (built in previous phases).
- The Campaigns pages were connected in Phase 6 and are excluded from this feature's scope — they are already live.
- The authentication system's token issuance is already configured and working — this feature only consumes tokens, not manages them.
- Only the two user-facing roles (regular subscription user, LTD AppSumo user) need to be handled; internal admin roles are out of scope.
- Mobile-specific optimizations (touch interactions, offline caching) are out of scope for this integration phase.
- The backend CORS configuration is a one-line change; if the backend already allows the necessary origins, this task is a verification step only.
- All sensitive credentials (database keys, AI API keys) remain exclusively on the backend — the frontend spec makes no assumptions about how they are stored.
