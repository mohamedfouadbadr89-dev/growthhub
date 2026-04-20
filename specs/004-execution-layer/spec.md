# Feature Specification: Execution Layer — Actions, Automation & Decision History

**Feature Branch**: `claude/init-growthhub-PaRUm`
**Created**: 2026-04-20
**Status**: Draft
**Input**: Phase 4 — Execution Layer

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse & Execute Actions from Actions Library (Priority: P1)

A user navigating the Actions Library can browse all available action templates (e.g., "Pause Campaign", "Increase Budget by 20%", "Send Alert Email"), view the details of a specific action (what it does, which platform it targets, what parameters it needs), and manually execute it from the Action Detail page. The result is immediately logged in Decision History.

**Why this priority**: Manual action execution is the core value of the Execution Layer — without it, decisions remain suggestions. This is the MVP: a user sees a decision, finds the matching action template, runs it, and sees the result.

**Independent Test**: With at least one action template seeded in the library, a user can navigate to the Actions Library, click an action, fill in required parameters, click "Execute", and verify the execution result appears in Decision History within 30 seconds.

**Acceptance Scenarios**:

1. **Given** the user is on the Actions Library page, **When** they load the page, **Then** they see a list of available action templates grouped by platform (Meta, Google, Shopify) with name, description, and action type badge.
2. **Given** the user clicks on an action template, **When** the Action Detail page loads, **Then** they see the action description, required parameters with input fields, and an "Execute" button.
3. **Given** the user fills in valid parameters and clicks "Execute", **When** execution completes, **Then** a success/failure message is shown and a new record appears in Decision History with result, timestamp, and action taken.
4. **Given** execution fails (e.g., platform API error), **When** the error occurs, **Then** the user sees a clear error message and the failure is still logged in Decision History with result = "failed" and an error description.

---

### User Story 2 — View Decision History (Memory System) (Priority: P2)

A user can view the full Decision History — the system's memory of every decision made, what triggered it, what action was taken, what data was used, the AI explanation, the confidence score, and the outcome. This is the learning loop: users can understand why each decision was made and what happened as a result.

**Why this priority**: Decision History is the most critical table in the system (per Phases.md). Without it, there is no memory, no learning loop, and no audit trail. It must be implemented before automation so automated executions are also captured.

**Independent Test**: After any manual action execution (from US1), navigate to Decision History and verify the record shows: decision label, action taken, trigger condition, data snapshot, AI explanation (or unavailable state), confidence score, result badge, and timestamp.

**Acceptance Scenarios**:

1. **Given** the user navigates to Decision History, **When** the page loads, **Then** they see a chronological list of all executions for their organization with key fields visible (decision, action, result badge, timestamp).
2. **Given** the list has many records, **When** the user scrolls or paginates, **Then** records remain sorted newest-first and load without full-page refresh.
3. **Given** the user clicks a history record, **When** the detail view opens, **Then** they can see the full data snapshot used at decision time, the AI explanation, confidence score, and the full recommended action that was taken.
4. **Given** an automated execution ran (from US3), **When** the user views Decision History, **Then** the automated run is also captured with trigger_condition = the rule that fired it.

---

### User Story 3 — Build & Manage Automation Rules (Priority: P3)

A user can create IF→THEN automation rules that connect a decision trigger condition (e.g., ROAS_DROP with confidence > 80) to an action template (e.g., pause_campaign). Rules can be enabled or disabled. When decisions are generated, active matching rules execute automatically and the result is logged in Decision History.

**Why this priority**: Automation is the "closed-loop" core of the product — decisions execute without human intervention. This turns GrowthHub from a dashboard into an autonomous system. But it requires US1 (action execution) and US2 (logging) to be solid first.

**Independent Test**: Create a rule "IF ROAS_DROP AND confidence ≥ 70 THEN pause_campaign", enable it, trigger a decision refresh that generates a ROAS_DROP decision with confidence ≥ 70, and verify: the rule fires, an automation_run record is created, and the Decision History contains the automated execution.

**Acceptance Scenarios**:

1. **Given** the user is on the Automation Status page, **When** they click "New Rule", **Then** they can select a trigger type (ROAS_DROP, SPEND_SPIKE, CONVERSION_DROP, SCALING_OPPORTUNITY), set a minimum confidence threshold, select a target action template, and save the rule.
2. **Given** a rule exists, **When** decisions are generated and a decision matches the rule's trigger type and confidence threshold, **Then** the matching action executes automatically and an automation_run record is created.
3. **Given** multiple rules match a single decision, **When** the automation engine runs, **Then** all matching rules execute and each creates a separate automation_run and Decision History record.
4. **Given** a rule is disabled by the user, **When** a matching decision is generated, **Then** the rule does NOT fire and no automation_run is created.
5. **Given** automated execution fails, **When** the failure occurs, **Then** the automation_run is marked "failed", Decision History records result = "failed", and the rule remains enabled for future triggers.

---

### User Story 4 — View Execution Logs (Priority: P4)

A user can view a dedicated Execution Logs page showing every automation run — which rule fired, which campaign it targeted, the execution result (success/failed/skipped), and the timestamp. This is the operational health view for the automation system.

**Why this priority**: Visibility into what the automation system is doing is essential for trust and debugging. Users need to know if rules are firing correctly before they can rely on the system.

**Independent Test**: After at least one automation rule fires, navigate to Execution Logs and verify the record shows: rule name, trigger condition, campaign, action taken, result, and timestamp.

**Acceptance Scenarios**:

1. **Given** the user navigates to Execution Logs, **When** the page loads, **Then** they see a list of all automation runs sorted newest-first with result badges (success/failed/skipped).
2. **Given** an execution failed, **When** the user views the log entry, **Then** they can see the error reason (e.g., "Platform API returned 403 — token expired").
3. **Given** no executions have occurred, **When** the page loads, **Then** an empty state is shown explaining that logs will appear once automation rules are active and decisions are generated.

---

### User Story 5 — Manual Execution from Decision Detail Page (Priority: P5)

A user viewing a specific decision on the Decision Detail page can manually trigger execution of a recommended action directly from that page, without navigating to the Actions Library separately. The execution is logged in Decision History tied to that specific decision.

**Why this priority**: The Decision Detail page is where users spend the most time reviewing AI reasoning. Adding a one-click "Execute" action there closes the loop without requiring navigation to a separate page. This is a UX polish story on top of US1.

**Independent Test**: Navigate to a Decision Detail page (`/decisions/:id`), verify an "Execute Action" button or recommended action card with an execute option is present, click it, confirm parameters, and verify Decision History has a new record linked to that decision_id.

**Acceptance Scenarios**:

1. **Given** the user is on a Decision Detail page with `recommended_action` populated, **When** they click "Execute Recommended Action", **Then** a confirmation dialog shows the action name and parameters before execution.
2. **Given** the user confirms execution, **When** execution completes, **Then** they see a success/failure toast and Decision History records the result linked to the original decision.

---

### Edge Cases

- What happens when an action template requires a platform integration that is not connected? → Show a clear error "Platform not connected — go to Integrations to connect Meta/Google/Shopify" and block execution.
- What if a user tries to execute the same action twice in quick succession? → The second execution is allowed but both are logged separately in Decision History.
- What if an automation rule fires but the targeted campaign no longer exists on the platform? → Execution is logged as "failed" with reason "Campaign not found on platform".
- What if the organization has zero credits (subscription plan) when an automated action runs? → The action still executes (action execution does not consume AI credits — only AI explanation generation does); the execution is logged normally.
- What if two automation rules target the same campaign at the same time? → Both execute independently; each creates its own automation_run and Decision History record.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a browsable catalog of action templates, each with a name, description, target platform, action type, and parameter schema.
- **FR-002**: Users MUST be able to view an Action Detail page showing the action's description, required parameters with input validation, and an "Execute" button.
- **FR-003**: The system MUST execute actions and immediately log the result (success/failed/skipped) in Decision History with: decision label, action taken, trigger condition, data snapshot used, AI explanation (if available), confidence score, result, and timestamp.
- **FR-004**: All Decision History records MUST be scoped to the user's organization (`org_id`) — cross-organization data access is strictly prohibited.
- **FR-005**: Users MUST be able to view a Decision History page listing all executions for their organization, sorted newest-first, with pagination.
- **FR-006**: Users MUST be able to create automation rules specifying: a trigger type (decision type), a minimum confidence threshold (0–100), and a target action template.
- **FR-007**: Automation rules MUST execute automatically after each decision generation run — matching active rules fire against newly generated decisions.
- **FR-008**: Each automation rule execution MUST create an `automation_run` record and a corresponding `decision_history` record.
- **FR-009**: Users MUST be able to enable or disable individual automation rules without deleting them.
- **FR-010**: The Automation Status page MUST show all rules with their enabled/disabled state, last fired timestamp, and total run count.
- **FR-011**: The Execution Logs page MUST show all automation runs with result badge, rule name, campaign targeted, and timestamp.
- **FR-012**: Users MUST be able to manually execute an action directly from the Decision Detail page without navigating away.
- **FR-013**: If execution fails because a required platform integration is not connected, the system MUST surface a clear actionable error message.
- **FR-014**: The system MUST prevent action execution against platforms the organization has not connected.
- **FR-015**: All automation runs and manual executions MUST be logged in Decision History regardless of outcome (success, failed, or skipped).

### Key Entities

- **ActionTemplate**: A reusable blueprint for a platform action. Has a name, description, platform (meta/google/shopify), action_type (pause_campaign, increase_budget, decrease_budget, send_alert), and a parameter schema defining what inputs are required.
- **AutomationRule**: An IF→THEN rule linking a trigger condition to an action template. Has trigger_type (decision type), min_confidence_threshold, target action template, enabled flag, and belongs to an organization.
- **AutomationRun**: A single execution record for an automation rule. Links to the rule that fired, the decision that triggered it, execution result, error message (if failed), and timestamp.
- **DecisionHistory**: The system memory record for every execution (manual or automated). Contains: decision (label/summary), action_taken, trigger_condition, data_snapshot (JSONB), result (success/failed/skipped), ai_explanation, confidence_score, and the originating decision_id.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can browse the Actions Library, select an action, and complete a manual execution in under 2 minutes from a cold start.
- **SC-002**: Every execution (manual or automated) appears in Decision History within 5 seconds of completion.
- **SC-003**: Automation rules fire within 30 seconds of a matching decision being generated.
- **SC-004**: Decision History retains a complete, queryable record of 100% of executions — no executions are lost, even on failure.
- **SC-005**: Users can create an automation rule in under 60 seconds from the Automation Status page.
- **SC-006**: The Execution Logs page loads the most recent 50 records in under 3 seconds.
- **SC-007**: 100% of failed executions surface a human-readable error reason in both the UI toast and the Decision History record.

---

## Assumptions

- Action templates are seeded by the system (not user-created in Phase 4); the initial set covers pause_campaign, increase_budget_20pct, decrease_budget_20pct, and send_alert_email for Meta and Google platforms. Shopify actions are out of scope for Phase 4.
- Actual platform API calls (e.g., calling Meta Graph API to pause a campaign) are simulated/mocked in Phase 4 — the execution pipeline, logging, and UI are fully built, but live API write operations are deferred to Phase 6 (Campaigns). The execution always completes and returns a realistic result.
- Automation rules fire synchronously after the intelligence engine completes a decision run — they are triggered by the same background job that generates decisions (Inngest).
- The `decision_history` table is distinct from the `decisions` table: `decisions` = AI-generated signals; `decision_history` = executed actions with outcomes. They are linked by `decision_id`.
- Users are assumed to be organization admins or members — no role-based access control within an organization is implemented in Phase 4 (all org members can create rules and execute actions).
- Pagination for Decision History and Execution Logs defaults to 50 records per page.
