# Quickstart & Integration Scenarios: Execution Layer

**Feature**: Phase 4 — Execution Layer
**Date**: 2026-04-20

---

## Scenario 1: Manual Action Execution (US1 MVP)

**Setup**: Org has Meta integration connected. Actions Library is seeded.

1. `GET /api/v1/actions?platform=meta` → returns 4 templates (pause, increase_budget, decrease_budget, send_alert_email)
2. `GET /api/v1/actions/00000000-0000-0000-0000-000000000001` → returns pause_campaign template with parameter_schema
3. `POST /api/v1/actions/00000000-0000-0000-0000-000000000001/execute` with `{ "params": { "campaign_id": "123456" } }`
4. Response: `{ "history_id": "uuid", "result": "success", "result_data": { "simulated": true } }`
5. `GET /api/v1/history` → new record appears with `executed_by: "manual"`, `result: "success"`

**Validates**: FR-001, FR-002, FR-003, FR-015, SC-001, SC-002

---

## Scenario 2: Execution with Platform Not Connected

**Setup**: Org has NO Google integration connected.

1. `POST /api/v1/actions/00000000-0000-0000-0000-000000000004/execute` (Google pause_campaign) with `{ "params": { "campaign_id": "abc" } }`
2. Response 422: `{ "error": "Platform google is not connected for this organization", "code": "INTEGRATION_NOT_CONNECTED" }`
3. `GET /api/v1/history` → NO new record (failed execution pre-checks do not create history records for validation failures)

**Validates**: FR-013, FR-014

---

## Scenario 3: Decision History — Full Memory Record (US2)

**Setup**: A ROAS_DROP decision exists in the `decisions` table with `id = "decision-uuid"`.

1. `POST /api/v1/actions/00000000-0000-0000-0000-000000000001/execute` with:
   ```json
   { "params": { "campaign_id": "123456" }, "decision_id": "decision-uuid" }
   ```
2. Response: `{ "history_id": "uuid", "result": "success" }`
3. `GET /api/v1/history/uuid` → full record includes:
   - `data_used`: decision's `data_snapshot` (roas, spend, etc.)
   - `ai_explanation`: decision's `ai_explanation`
   - `confidence_score`: decision's `confidence_score`
   - `decision_id`: "decision-uuid"
   - `executed_by`: "manual"

**Validates**: FR-003, FR-005, SC-004

---

## Scenario 4: Automation Rule Creates and Fires (US3)

**Setup**: Intelligence engine generates a ROAS_DROP decision with `confidence_score = 82`.

1. `POST /api/v1/automation/rules` with:
   ```json
   {
     "name": "Auto-pause on ROAS Drop",
     "trigger_type": "ROAS_DROP",
     "min_confidence_threshold": 70,
     "action_template_id": "00000000-0000-0000-0000-000000000001",
     "action_params": { "campaign_id": "auto" }
   }
   ```
2. Response 201: rule created with `enabled: true`
3. Decision refresh runs → `dispatchIntelligence` → `dispatchAutomation` fires
4. Rule matches ROAS_DROP decision (confidence 82 ≥ threshold 70)
5. `GET /api/v1/automation/runs` → new run with `status: "success"`
6. `GET /api/v1/history` → new record with `executed_by: "automation"`, `trigger_condition: "Rule: Auto-pause on ROAS Drop — ROAS dropped..."`
7. `GET /api/v1/automation/rules/:id` → `run_count: 1`, `last_fired_at` updated

**Validates**: FR-006, FR-007, FR-008, SC-003, SC-005

---

## Scenario 5: Disable Rule Prevents Firing

**Setup**: Automation rule exists with `enabled: true`.

1. `PATCH /api/v1/automation/rules/:id` with `{ "enabled": false }`
2. Response 200: `{ "enabled": false, ... }`
3. Decision refresh generates matching ROAS_DROP decision
4. `GET /api/v1/automation/runs` → NO new run for this rule
5. `GET /api/v1/history` → NO automated record for this rule

**Validates**: FR-009

---

## Scenario 6: Manual Execution from Decision Detail Page (US5)

**Setup**: Decision Detail page is open for decision `d-uuid` (ROAS_DROP, confidence 75).

1. User clicks "Execute Recommended Action" on `/decisions/d-uuid`
2. Frontend calls `POST /api/v1/actions/00000000-0000-0000-0000-000000000001/execute`:
   ```json
   { "params": { "campaign_id": "456789" }, "decision_id": "d-uuid" }
   ```
3. Response: `{ "history_id": "h-uuid", "result": "success" }`
4. `GET /api/v1/history/h-uuid` → `decision_id: "d-uuid"`, `executed_by: "manual"`, full data_used populated from decision

**Validates**: FR-012, SC-001

---

## Scenario 7: Multi-Tenant Isolation

**Setup**: Org A and Org B both have automation rules and history records.

1. Org A user calls `GET /api/v1/automation/rules` → only sees Org A's rules
2. Org A user calls `GET /api/v1/history` → only sees Org A's history
3. Org A user calls `GET /api/v1/history/:id` using a history_id belonging to Org B → 404
4. Org A user calls `PATCH /api/v1/automation/rules/:id` using Org B's rule_id → 404

**Validates**: FR-004, Constitution Principle II
