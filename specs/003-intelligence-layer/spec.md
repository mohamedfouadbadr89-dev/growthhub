# Feature Specification: Intelligence Layer — AI Decision Engine

**Feature Branch**: `claude/init-growthhub-PaRUm`
**Created**: 2026-04-20
**Status**: Draft
**Input**: Phase 3 — Intelligence Layer

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Automated Anomaly Detection & Decision Generation (Priority: P1)

A marketing manager opens the dashboard after the nightly sync completes. The system has automatically analyzed the latest campaign data and detected that a key campaign's ROAS dropped 35% below its 7-day average. The system generated a prioritized decision record explaining the anomaly, the data behind it, and a recommended action — all visible on the Decisions Overview page without the user having to do anything.

**Why this priority**: This is the core value proposition of the Intelligence Layer. Passive, automated analysis that surfaces problems before the user notices them is what differentiates this product. Everything else depends on decisions being generated.

**Independent Test**: Connect an integration from Phase 2, trigger the decision generation engine manually, and verify a decision record appears on the Decisions Overview page with a type, explanation, confidence score, and recommended action.

**Acceptance Scenarios**:

1. **Given** campaign metrics exist in the system, **When** the decision engine runs, **Then** the system generates at least one decision record per detected anomaly with a type (ROAS_DROP, SPEND_SPIKE, CONVERSION_DROP), an AI-generated explanation, a confidence score between 0–100, and a recommended action.
2. **Given** a decision has been generated, **When** the user opens the Decisions Overview page, **Then** decisions are displayed sorted by priority score (highest first), each showing the platform, campaign name, anomaly type, confidence score, and a summary of the recommended action.
3. **Given** no anomalies or opportunities are detected, **When** the decision engine runs, **Then** no spurious decisions are generated, and the Decisions Overview page shows a "no issues detected" state.
4. **Given** metrics are insufficient (fewer than 3 days of data), **When** the decision engine runs, **Then** the system skips anomaly detection for that integration and logs a reason without erroring.

---

### User Story 2 — Decision Detail & AI Reasoning (Priority: P2)

A performance marketer clicks on a decision card to understand exactly why the system flagged it. They see the full AI explanation, the raw data snapshot that triggered the decision (spend, ROAS, impressions over the relevant period), a confidence score with a plain-English rationale, and a clear recommended action they can take.

**Why this priority**: Without the detail view, decisions are opaque and unactionable. Transparency builds trust in the AI system and drives adoption. The detail page is the explainability layer and directly feeds Phase 4 (Execution).

**Independent Test**: Navigate to a decision detail page directly by ID. Verify the page renders the trigger condition, data snapshot, AI explanation, and recommended action without requiring any other pages to be built.

**Acceptance Scenarios**:

1. **Given** a decision exists, **When** the user navigates to its detail page, **Then** the page displays: the anomaly type, the campaign and platform it applies to, the trigger condition (e.g., "ROAS dropped from 4.2x to 2.1x over 3 days"), the data snapshot used to generate the decision, the full AI explanation, and the confidence score.
2. **Given** the user is viewing a decision detail, **When** they view the confidence score, **Then** the score is accompanied by a plain-English rationale (e.g., "High confidence — consistent decline over 5 days with no creative changes detected").
3. **Given** a decision belongs to a different organization, **When** any user attempts to access it by ID, **Then** the system returns a not-found state and the decision data is not exposed.

---

### User Story 3 — Alerts Center: Threshold-Based Triggers (Priority: P3)

A growth lead has configured alert thresholds — they want to be notified when any campaign's daily spend exceeds $5,000 or ROAS drops below 1.5x. The Alerts Center shows all threshold violations as alert records, timestamped, with the breached value shown alongside the configured threshold.

**Why this priority**: Alerts provide real-time guardrails and complement the AI decision engine. They are simpler (rule-based, not AI-generated) and can be built independently from the decision AI pipeline, making them a distinct P3 story.

**Independent Test**: Set a spend threshold of $0 (guaranteed to trigger) for any connected integration, run the engine, and verify an alert record appears on the Alerts Center page with the correct campaign, breached value, and threshold.

**Acceptance Scenarios**:

1. **Given** default alert thresholds are active, **When** any campaign's daily spend or ROAS crosses a threshold, **Then** an alert record is created with: the alert type (SPEND_EXCEEDED, ROAS_BELOW_THRESHOLD), the campaign identifier, the breached value, the configured threshold, and a timestamp.
2. **Given** alerts exist, **When** the user opens the Alerts Center, **Then** alerts are displayed newest-first, grouped by severity (critical, warning), and each shows the platform, campaign name, breach detail, and time elapsed since the alert fired.
3. **Given** an alert has been reviewed, **When** the user dismisses it, **Then** the alert is marked as resolved and removed from the active view, but remains accessible in the alert history.

---

### User Story 4 — Opportunities Page: Growth Signal Detection (Priority: P4)

A media buyer wants to identify which campaigns are showing positive scaling signals — consistent ROAS above 3.5x with remaining budget headroom. The Opportunities page surfaces these as opportunity records with a recommended action (e.g., "Increase daily budget by 20%").

**Why this priority**: Opportunities are the positive complement to anomalies. They are less urgent than anomaly detection and alerts, but complete the intelligence loop by helping users act on growth signals — not just problems.

**Independent Test**: Seed campaign_metrics rows with a ROAS of 4.0x for 5 consecutive days and verify an opportunity record is generated and visible on the Opportunities page.

**Acceptance Scenarios**:

1. **Given** a campaign has maintained a ROAS above 3.5x for 5 or more consecutive days, **When** the decision engine runs, **Then** an opportunity record is generated with type SCALING_OPPORTUNITY, the campaign details, the average ROAS, and a recommended budget increase percentage.
2. **Given** opportunities exist, **When** the user opens the Opportunities page, **Then** opportunities are displayed sorted by potential impact (highest ROAS first), each showing the platform, campaign name, signal type, and recommended action.
3. **Given** a campaign's ROAS drops below 3.5x after an opportunity was generated, **When** the engine next runs, **Then** no new opportunity is created for that campaign and the existing opportunity is marked as stale.

---

### User Story 5 — Manual Decision Refresh (Priority: P5)

A user who has just connected a new platform and completed a manual sync wants to immediately generate decisions without waiting for the next scheduled run. They click "Refresh Decisions" and within a short wait see the Decisions Overview populated with fresh analysis.

**Why this priority**: Manual refresh is a usability requirement that completes the on-demand data flow. It is last because it adds convenience, not new capability — the automated engine must work first.

**Independent Test**: Call the manual refresh endpoint directly and verify a new decision generation job is queued and new decision records appear within 60 seconds for an org with existing metrics data.

**Acceptance Scenarios**:

1. **Given** the user is on the Decisions Overview page, **When** they click "Refresh Decisions", **Then** the system queues a fresh decision generation run for their organization and shows a loading indicator.
2. **Given** a refresh is already in progress, **When** the user clicks "Refresh Decisions" again, **Then** the system shows a "refresh in progress" state and does not queue a duplicate run.
3. **Given** the refresh completes, **When** new decisions are generated, **Then** the page updates to show the latest decisions, including any new ones, without requiring a full page reload.

---

### Edge Cases

- What happens when a campaign has only 1 day of metrics (insufficient baseline for anomaly detection)? → System skips that campaign and logs a reason; no false decisions generated.
- What happens when the AI provider is unavailable during decision generation? → The system saves rule-based anomaly data (type, trigger, data snapshot) and marks the AI explanation as "pending"; the decision record is still created.
- What happens when an LTD user triggers decision generation but has no BYOK key configured? → The decision generation step is blocked; user sees a prompt to add their AI key in settings; rule-based detection still runs.
- What happens when a subscription user has zero credits remaining? → Decision generation is blocked with a clear low-credits message; rule-based detection still runs.
- What happens when metrics data contains outliers (e.g., a one-day spend spike due to testing)? → The anomaly detection algorithm uses a 7-day rolling average to smooth single-day outliers; a single spike does not trigger a SPEND_SPIKE alert unless it exceeds 3x the average.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST automatically analyze campaign metrics after each nightly sync completes and generate decision records for all detected anomalies and opportunities within the organization's data.
- **FR-002**: The system MUST detect ROAS drops where the latest day's ROAS is more than 30% below the 7-day rolling average for a campaign with at least 3 days of data.
- **FR-003**: The system MUST detect spend spikes where a single day's spend exceeds 3x the 7-day rolling average for that campaign.
- **FR-004**: The system MUST detect conversion drops where daily conversions fall more than 40% below the 7-day rolling average.
- **FR-005**: The system MUST detect scaling opportunities where a campaign maintains a ROAS above 3.5x for 5 or more consecutive days.
- **FR-006**: Every decision record MUST include: anomaly type, platform, campaign identifier, trigger condition description, data snapshot (the metric values that caused the trigger), AI-generated explanation, confidence score (0–100), recommended action, and a priority score for sorting.
- **FR-007**: The system MUST use the organization's BYOK AI key for decision generation when the organization's plan type is `ltd`; the platform AI key MUST never be used for `ltd` plan organizations.
- **FR-008**: The system MUST deduct 1 credit per decision generated for `subscription` plan organizations and MUST block AI explanation generation (not rule detection) when credits reach zero.
- **FR-009**: Users MUST be able to manually trigger a decision refresh for their organization from the Decisions Overview page; the system MUST prevent duplicate concurrent refresh jobs.
- **FR-010**: The Decisions Overview page MUST display all active decisions sorted by priority score, each showing platform, campaign name, anomaly type, confidence score, and recommended action summary.
- **FR-011**: The Decision Detail page MUST display the full trigger condition, data snapshot, AI explanation, confidence rationale, and recommended action for a single decision.
- **FR-012**: The Alerts Center MUST display threshold-based alerts (SPEND_EXCEEDED, ROAS_BELOW_THRESHOLD) with breach details, and users MUST be able to dismiss individual alerts.
- **FR-013**: The Opportunities page MUST display active scaling opportunity records sorted by potential impact.
- **FR-014**: All decision, alert, and opportunity records MUST be scoped to the organization's `org_id`; users MUST never see records belonging to another organization.
- **FR-015**: Decision generation MUST be triggered automatically after each integration sync completes (event-driven), in addition to the manual refresh trigger.

### Key Entities

- **Decision**: Represents an AI-generated insight about a specific campaign. Contains the anomaly/opportunity type, the data snapshot that triggered it, an AI-generated explanation, a confidence score, a recommended action, and a priority score. Scoped to `org_id`.
- **Alert**: Represents a threshold violation for a specific campaign metric. Contains the alert type, the campaign and platform, the breached value, the configured threshold, severity level, and resolved/active status. Scoped to `org_id`.
- **Alert Threshold**: Represents an organization-level configuration for what constitutes a threshold breach (e.g., ROAS below 1.5x, daily spend above $5,000). Has system-level defaults that apply when no custom threshold is configured.
- **Decision Run**: Represents a single execution of the decision engine for an organization. Tracks status (pending, in_progress, completed, failed), number of decisions generated, and timestamps. Prevents duplicate concurrent runs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Decision generation completes within 60 seconds of being triggered for an organization with up to 10 connected integrations and 90 days of campaign history.
- **SC-002**: The Decisions Overview page loads and displays the first page of decisions within 2 seconds under normal conditions.
- **SC-003**: Zero decisions or alerts belonging to Organization A are ever visible to users from Organization B (multi-tenant isolation verified).
- **SC-004**: BYOK plan users can successfully generate decisions using their own AI key with zero calls made to the platform AI key, verifiable via request logs.
- **SC-005**: Subscription users who exhaust their credits see a clear, actionable message within the decision generation flow — not a generic error.
- **SC-006**: At least 80% of anomalies that represent genuine campaign degradation (verified manually against raw data) are detected and surfaced as decisions within one engine run cycle.
- **SC-007**: The manual refresh trigger successfully queues a new decision run on first click and correctly rejects duplicate trigger attempts with an appropriate user-facing message.

## Assumptions

- Campaign metrics data from Phase 2 is the sole data source for anomaly and opportunity detection; no external data sources are required for Phase 3.
- Default alert thresholds (ROAS below 1.5x, daily spend above $10,000) are system-wide defaults applied when an organization has not configured custom thresholds; custom threshold management UI is out of scope for Phase 3.
- The decision engine runs automatically after each integration sync event (event-driven, triggered by Phase 2's sync completion) and on the manual refresh trigger; a separate scheduled cron for decisions is not required in Phase 3.
- Decision records are not editable by users; they are system-generated and read-only. User can only dismiss alerts.
- The "recommended action" field in a decision is a text description (e.g., "Pause campaign and review creative assets"); actual one-click execution of actions is Phase 4 scope.
- Credit deduction applies to the AI explanation generation step only; rule-based anomaly detection (computing whether thresholds are breached) consumes no credits.
- The AI explanation is generated per decision record; batch generation in a single AI call is an implementation detail left to planning.
- Decisions older than 30 days are considered stale and excluded from the active Decisions Overview by default; full history is accessible with a filter.
