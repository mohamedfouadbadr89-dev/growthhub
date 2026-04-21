# Feature Specification: Phase 6 — Campaigns

**Feature Branch**: `claude/init-growthhub-PaRUm`
**Created**: 2026-04-21
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse Campaigns (Priority: P1)

A marketer opens the Campaigns section and sees a list of all their organization's campaigns across connected platforms, each showing aggregated performance metrics for the last 30 days — spend, ROAS, conversions, and revenue. They can filter by campaign status to focus on what's currently active.

**Why this priority**: The Campaigns List is the entry point to the entire campaign management workflow. It delivers standalone value — real performance visibility — even without Create or AI features. It also depends only on Phase 2 sync data (campaign_metrics) already in place.

**Independent Test**: With at least one connected integration and synced campaign_metrics, navigate to `/campaigns`. Verify the list shows at least one campaign row with real spend, ROAS, and conversion data pulled from the last 30 days. Use the status filter to show only "active" campaigns; confirm the list updates without a page reload.

**Acceptance Scenarios**:

1. **Given** an org with synced campaign metrics, **When** the user opens the Campaigns List, **Then** all campaigns for that org are displayed with spend, revenue, ROAS, and conversions aggregated from the last 30 days.
2. **Given** a campaigns list, **When** the user selects the "Active" status filter, **Then** only active campaigns are shown.
3. **Given** an org with no synced data, **When** the user opens Campaigns, **Then** an empty state is shown with a prompt to connect an integration.
4. **Given** a user from a different organization, **When** they view Campaigns, **Then** they see only their own organization's campaigns — no cross-org leakage.

---

### User Story 2 — Campaign Detail with AI Decisions Overlay (Priority: P2)

A marketer clicks into a specific campaign and sees its full performance history alongside any AI-generated decisions that target that campaign. Each decision shows the trigger condition, recommended action, and a direct link to execute the action.

**Why this priority**: The detail view closes the loop between data visibility and decision execution — the core product value. It depends on P1 (campaigns list) and Phase 3 (decisions) being in place.

**Independent Test**: With a campaign in the list and at least one AI decision referencing that campaign name, click the campaign row. Verify the detail page shows a performance summary and a Decisions section listing any matching AI decisions with their confidence scores. Click a decision's "Execute Action" link and verify it opens the correct Action Detail page.

**Acceptance Scenarios**:

1. **Given** a campaign with 14 days of metrics, **When** the user opens Campaign Detail, **Then** they see spend, ROAS, impressions, and conversions for the last 30 days plus a 14-day trend.
2. **Given** an AI decision referencing this campaign by name, **When** the user opens Campaign Detail, **Then** the decision appears in the Decisions section with its confidence score, trigger, and a link to the action.
3. **Given** a campaign with no AI decisions, **When** the user opens Campaign Detail, **Then** the Decisions section shows an empty state — "No active decisions for this campaign."
4. **Given** a campaign detail page, **When** the user clicks "Pause Campaign", **Then** the campaign status is updated to "paused" and the status badge updates immediately without a full reload.

---

### User Story 3 — Create Campaign with AI Assistance (Priority: P3)

A marketer starts a new campaign, enters the campaign name, platform, and budget, and receives AI-generated targeting suggestions (audience interests, demographics, age ranges) and a budget recommendation based on the organization's historical ROAS data. They review and adjust the suggestions, then push the campaign to Meta or Google via the execution layer.

**Why this priority**: Creation with AI assistance is the most complex story — it depends on P1 (campaigns list), Phase 3 (AI/OpenRouter), Phase 4 (actions_library for push execution), and Phase 2 (ROAS history). It delivers the highest unique value but has the most dependencies.

**Independent Test**: Navigate to `/campaigns/create`, fill in a campaign name, select Meta as the platform, and enter a daily budget. Click "Get AI Suggestions". Within 30 seconds verify that targeting suggestions appear (at least one interest and one age range). Adjust the budget, save the campaign, and verify it appears in the Campaigns List with status "draft". Click "Push to Meta" and verify the corresponding action is triggered.

**Acceptance Scenarios**:

1. **Given** an org with historical ROAS data, **When** the user enters a campaign name and platform on the Create page, **Then** within 30 seconds AI targeting suggestions appear including audience interests, recommended age range, and a budget recommendation.
2. **Given** an org with no historical data, **When** the user requests AI suggestions, **Then** generic industry-standard suggestions are returned with a note that they are not personalized.
3. **Given** a campaign saved in draft, **When** the user clicks "Push to Meta", **Then** the corresponding create_campaign action from the actions library is triggered for the Meta platform, and the user is taken to the Execution Logs page.
4. **Given** the Meta integration is not connected, **When** the user tries to push to Meta, **Then** they see an error "Meta integration not connected" with a link to the Integrations page.
5. **Given** a completed campaign form, **When** the user saves without pushing, **Then** the campaign is saved as "draft" and appears in the Campaigns List.

---

### Edge Cases

- What happens when a campaign name in the system matches multiple entries in campaign_metrics (e.g., same name across different platforms)? All matching rows are aggregated together; the platform column disambiguates in Campaign Detail.
- What happens when AI suggestion generation fails? A clear error message is shown with a "Try again" option; the user can still create the campaign manually without suggestions.
- What happens when the user edits a pushed campaign? Status stays as-is; re-pushing creates a new action execution without duplicating the campaign record.
- What happens when metrics data spans more than 30 days? Only the last 30 days are shown in the list; the detail page offers a date range selector.
- What happens if the budget recommendation exceeds the org's credit balance? The suggestion is shown as-is; budget validation only happens at push time on the ad platform.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all campaigns for the organization in a list view, with each campaign showing its name, platform, status, and 30-day aggregated metrics (spend, revenue, ROAS, conversions).
- **FR-002**: System MUST allow filtering the campaigns list by status: all, active, paused, draft, completed.
- **FR-003**: System MUST link each campaign to any AI decisions from the intelligence layer that reference the same campaign name, and display them on the Campaign Detail page.
- **FR-004**: System MUST display a campaign's 14-day performance trend (spend and ROAS) on the Campaign Detail page.
- **FR-005**: System MUST allow users to update a campaign's status (pause, activate, archive) from the Campaign Detail page.
- **FR-006**: System MUST allow creating a new campaign record with: name, platform (Meta or Google), daily budget, targeting parameters (interests, age range, gender).
- **FR-007**: System MUST generate AI targeting suggestions (audience interests, age range, gender split) and a budget recommendation when the user provides a campaign name and platform, using the organization's historical ROAS data.
- **FR-008**: System MUST allow pushing a campaign to Meta or Google by triggering the corresponding action from the actions library with the campaign parameters pre-filled.
- **FR-009**: System MUST scope all campaign records and metrics to `org_id` — no cross-organization data access.
- **FR-010**: System MUST persist the AI suggestions alongside the campaign record so they can be reviewed after the session.

### Key Entities

- **Campaign**: Organization's campaign record — name, platform (meta/google), status (draft/active/paused/completed/archived), daily_budget, targeting (JSONB: interests, age_min, age_max, gender), ad_account_id (nullable — links to the platform account), ai_suggestions (JSONB: last AI recommendations), one per campaign per org.
- **CampaignMetrics** (existing from Phase 2): Aggregated by campaign_name for list and detail views.
- **Decision** (existing from Phase 3): Joined by campaign_name to surface relevant AI decisions on the detail page.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Campaigns list loads with real aggregated metrics visible within 3 seconds on standard broadband.
- **SC-002**: Campaign detail page shows AI decisions overlay within 2 seconds of opening.
- **SC-003**: AI targeting suggestions are returned within 30 seconds of the user requesting them.
- **SC-004**: A new campaign can be created, reviewed, and pushed to Meta or Google within 5 minutes of starting the create flow.
- **SC-005**: 100% of campaign data is scoped to the correct organization — cross-org data exposure results in immediate test failure.
- **SC-006**: Status filter updates the campaign list without a full page reload.
- **SC-007**: Budget recommendation accuracy: when the org has ROAS ≥ 2×, the recommended budget is at least 20% higher than the default for an org with no ROAS history.

---

## Assumptions

- Phase 2 (Data Ingestion) is a prerequisite: at least one integration must be connected and campaign_metrics must have synced rows for the list to show real data.
- Phase 3 (Intelligence Layer) is a prerequisite for the AI decisions overlay on Campaign Detail.
- Phase 4 (Execution Layer) is a prerequisite for the "push to platform" action on Create Campaign; the actions_library must contain `create_campaign` actions for Meta and Google.
- Campaign records in the new `campaigns` table are organization-managed records; they are separate from the campaign rows synced via campaign_metrics (which are read-only sync data). A campaign can exist in the system without a corresponding ad platform campaign and vice versa.
- Targeting parameters (interests, age range, gender) are stored as JSONB — the exact schema is implementation detail. The spec only requires these fields are capturable and passable to the push action.
- AI targeting suggestions use the OpenRouter AI gateway; the BYOK gate from Phase 5 applies here too (LTD users must have their own key to use AI suggestions).
- "Push to platform" does not guarantee the campaign is created on the platform — it triggers the action execution and the user is directed to Execution Logs for status tracking.
- Campaign status changes (pause/activate) are local state changes in the `campaigns` table; they do not automatically trigger platform API calls (users must use action execution for that).
- All org members (admin and member roles) can view and create campaigns; only admins can archive.
