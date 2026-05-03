# Feature Specification: Phase 2 — Data Ingestion

**Feature Branch**: `002-data-ingestion`
**Created**: 2026-04-20
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Connect an Ad Platform (Priority: P1)

A user with an active organization visits the Integrations page and connects their
Meta Ads, Google Ads, or Shopify account via a standard authorization flow. After
approving the connection, the platform appears as "Connected" and the first data
sync begins automatically.

**Why this priority**: Without at least one connected platform there is no data to
ingest. Everything else in Phase 2 depends on a successful connection existing first.

**Independent Test**: A user can navigate to Integrations, authorize a single
platform, and see it listed as Connected with a pending or completed sync status —
without any other platforms being connected.

**Acceptance Scenarios**:

1. **Given** an authenticated user with no integrations, **When** they click
   "Connect" on a supported platform and complete the authorization flow,
   **Then** the platform appears in their integration list with status "Connected"
   and an initial sync is queued.
2. **Given** a user on the authorization page, **When** they cancel or deny
   access, **Then** they are returned to the Integrations page with no integration
   created and a clear cancellation message.
3. **Given** a connected integration, **When** the user returns to the Integrations
   page, **Then** they see the platform name, connection status, and timestamp of
   the last successful sync.
4. **Given** a user who has already connected a platform, **When** they attempt to
   connect the same platform again, **Then** the system prevents a duplicate and
   surfaces a clear message.

---

### User Story 2 — Automatic Daily Data Sync (Priority: P2)

Once a platform is connected, the system automatically pulls the latest campaign
metrics and order/revenue data every day. The user does not need to take any action;
data stays fresh without manual intervention.

**Why this priority**: Automated sync is the core value of the integration. Without
it, users would need to manually trigger every update, making the product unusable
at scale.

**Independent Test**: After connecting a platform, wait or trigger a sync cycle and
confirm that campaign metrics and/or order data appear in the data store scoped to
the user's organization, without any manual action by the user.

**Acceptance Scenarios**:

1. **Given** a connected integration, **When** the scheduled sync window arrives,
   **Then** the system pulls new campaign metrics and/or order data and records a
   successful sync log entry with the record count and timestamp.
2. **Given** a sync job in progress, **When** the external platform returns an
   error, **Then** the sync is marked as failed, the error is recorded in the sync
   log, and the previously synced data remains intact.
3. **Given** a completed sync, **When** the user views the Integrations page,
   **Then** the "Last synced" timestamp is updated to reflect the most recent
   successful sync.

---

### User Story 3 — Manual Re-Sync Trigger (Priority: P3)

A user can force an immediate data sync for any connected integration without
waiting for the next scheduled cycle. This is useful after a campaign change or
when reviewing fresh data.

**Why this priority**: The daily schedule covers routine use; manual re-sync is an
explicit requirement and a quality-of-life feature that unblocks users who need
fresh data on demand.

**Independent Test**: A user clicks "Sync now" on a connected integration and
within a reasonable time sees the sync status update to "In progress" and then
"Completed" (or "Failed" if the platform is unreachable), and the last-synced
timestamp updates.

**Acceptance Scenarios**:

1. **Given** a connected integration, **When** the user clicks "Sync now",
   **Then** a sync job is queued immediately, the status changes to "Syncing", and
   the last-synced timestamp updates upon completion.
2. **Given** a sync already in progress, **When** the user clicks "Sync now"
   again, **Then** the duplicate request is rejected gracefully and the in-progress
   sync continues unaffected.
3. **Given** a failed manual sync, **When** the user views the integration detail,
   **Then** the error reason is visible so they can diagnose the problem.

---

### User Story 4 — Dashboard Shows Real Data (Priority: P4)

After at least one sync completes, the Dashboard Overview and Channels pages
display real campaign metrics (spend, impressions, clicks, ROAS) and revenue
figures pulled from the connected platforms, replacing any placeholder content.

**Why this priority**: This is the visible payoff for connecting integrations. It
completes the "connect → sync → see data" loop that validates the whole phase.

**Independent Test**: After completing US1 + US2, visit `/dashboard/overview` and
confirm at least one real numeric metric (spend or revenue) is rendered from synced
data, scoped to the authenticated organization.

**Acceptance Scenarios**:

1. **Given** a completed sync, **When** the user visits the Dashboard Overview,
   **Then** they see real aggregate metrics (total spend, total revenue, ROAS) for
   the connected platforms.
2. **Given** multiple platforms connected, **When** the user visits the Channels
   page, **Then** metrics are broken down per platform (Meta, Google, Shopify).
3. **Given** no integrations connected, **When** the user visits the Dashboard,
   **Then** a clear prompt to connect a platform is shown instead of empty or
   broken charts.

---

### Edge Cases

- What happens when the OAuth token expires after initial connection?
  → The system must detect expired tokens and surface a "Reconnect" action to the
  user rather than silently failing syncs.
- What happens if a platform's API rate limit is hit during sync?
  → The sync pauses, logs the rate-limit event, and retries after the rate-limit
  window without data loss or duplication.
- What if a sync partially completes before failing?
  → Already-written records are retained; the sync log records the failure point so
  the next sync can attempt to fill the gap.
- What happens if two organizations connect to the same external ad account?
  → Each organization's data is stored and queried independently under its own
  `org_id`; no cross-organization data leakage is permitted.
- What if the user disconnects a platform?
  → Historical synced data is retained for that organization; only future syncs
  stop. The integration record is marked "Disconnected".

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST allow users to connect Meta Ads, Google Ads, and
  Shopify accounts via a standard delegated authorization flow.
- **FR-002**: The system MUST store connected integration credentials securely,
  scoped to the user's organization; no credentials may be exposed to the browser.
- **FR-003**: The system MUST automatically sync campaign metrics and order/revenue
  data on a daily schedule for every active integration.
- **FR-004**: Users MUST be able to manually trigger an immediate sync for any
  connected integration from the Integrations page.
- **FR-005**: The system MUST record a sync log entry for every sync attempt,
  capturing status (success/failed), record count, duration, and error details
  where applicable.
- **FR-006**: The system MUST scope all synced data to the organization that owns
  the integration; data from one organization MUST NOT be accessible to another.
- **FR-007**: The system MUST surface connection status and last-sync timestamp for
  each integration on the Integrations List page.
- **FR-008**: The system MUST prevent duplicate integrations for the same platform
  within the same organization.
- **FR-009**: The system MUST display real aggregate metrics on the Dashboard
  Overview once at least one sync has completed successfully.
- **FR-010**: The system MUST handle expired or revoked platform credentials by
  surfacing a "Reconnect" prompt rather than silently failing.
- **FR-011**: The system MUST retain all previously synced data when a sync fails;
  partial failures MUST NOT corrupt existing records.
- **FR-012**: The system MUST partition campaign metrics data by date to support
  efficient time-range queries as data volume grows.

### Key Entities

- **Integration**: A single authorized connection between an organization and an
  external platform. Fields: `org_id`, `platform` (meta/google/shopify), `status`
  (connected/disconnected/error), `last_synced_at`, `created_at`.
- **Ad Account**: An advertising account discovered from a connected integration.
  Fields: `org_id`, `integration_id`, `platform_account_id`, `name`, `currency`.
- **Campaign Metrics**: Daily performance snapshot per ad account. Fields: `org_id`,
  `ad_account_id`, `date`, `platform`, `spend`, `impressions`, `clicks`,
  `conversions`, `revenue`. Partitioned by date.
- **Sync Log**: Immutable record of every sync attempt. Fields: `org_id`,
  `integration_id`, `started_at`, `completed_at`, `status`, `records_written`,
  `error_message`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can complete the full connect-to-data-visible flow (connect
  platform → first sync completes → dashboard shows real metrics) in under 5
  minutes.
- **SC-002**: 100% of synced records are scoped to the correct organization —
  verified by querying with a different organization's credentials and confirming
  zero records returned.
- **SC-003**: Scheduled daily syncs complete within 10 minutes for an account with
  up to 500 campaigns, without user intervention.
- **SC-004**: A manual re-sync triggered by the user begins within 5 seconds of
  the request.
- **SC-005**: Sync failures are surfaced to the user within one page view — the
  Integrations page shows a failure status and error summary without requiring the
  user to check logs.
- **SC-006**: Zero data duplication — re-running a sync for the same date range
  produces identical records, not additional copies.

---

## Assumptions

- Phase 1 is complete: every user belongs to an organization, all requests carry a
  verified `org_id`, and the backend API is operational.
- OAuth credentials (client IDs, secrets) for Meta, Google, and Shopify are
  configured in the backend environment before Phase 2 goes live; obtaining them is
  an ops task, not in scope for this spec.
- Shopify data ingestion covers orders and revenue; it does not cover ad campaigns
  (Shopify does not have a native ads API equivalent to Meta/Google).
- Historical backfill on first connect covers the previous 30 days of data; data
  older than 30 days is not fetched on initial sync.
- Multi-account support (one org connecting multiple ad accounts per platform) is
  in scope; team-member-level access control within an org is out of scope for
  Phase 2.
- The Integrations List (`app/integrations/page.tsx`) and Connect flow
  (`app/integrations/connect/page.tsx`) pages already exist as empty shells from
  Phase 1 scaffolding.
- Dashboard data display (SC-001 / US4) targets the Overview and Channels pages
  only; LTV, Cohort, Attribution, and Segment pages remain as shells until Phase 3.
