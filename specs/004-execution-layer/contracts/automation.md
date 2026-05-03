# API Contract: Automation Rules & Runs

**Base path**: `/api/v1/automation`
**Auth**: Clerk JWT required on all endpoints

---

## GET /api/v1/automation/rules

List all automation rules for the authenticated organization.

**Response 200**:
```json
{
  "rules": [
    {
      "id": "uuid",
      "name": "Pause on ROAS Drop",
      "trigger_type": "ROAS_DROP",
      "min_confidence_threshold": 70,
      "action_template_id": "uuid",
      "action_template_name": "Pause Campaign (Meta)",
      "action_params": { "campaign_id": "auto" },
      "enabled": true,
      "run_count": 3,
      "last_fired_at": "2026-04-20T10:00:00Z",
      "created_at": "2026-04-20T00:00:00Z"
    }
  ],
  "total": 1
}
```

---

## POST /api/v1/automation/rules

Create a new automation rule.

**Request body**:
```json
{
  "name": "Pause on ROAS Drop",
  "trigger_type": "ROAS_DROP",
  "min_confidence_threshold": 70,
  "action_template_id": "uuid",
  "action_params": { "campaign_id": "auto" }
}
```

**Validation**:
- `trigger_type` must be one of: `ROAS_DROP`, `SPEND_SPIKE`, `CONVERSION_DROP`, `SCALING_OPPORTUNITY`
- `min_confidence_threshold` must be 0–100
- `action_template_id` must reference a valid actions_library entry

**Response 201**:
```json
{
  "id": "uuid",
  "name": "Pause on ROAS Drop",
  "trigger_type": "ROAS_DROP",
  "min_confidence_threshold": 70,
  "action_template_id": "uuid",
  "action_params": { "campaign_id": "auto" },
  "enabled": true,
  "run_count": 0,
  "created_at": "2026-04-20T00:00:00Z"
}
```

**Response 400**: Invalid trigger_type, threshold out of range, or missing fields.

---

## PATCH /api/v1/automation/rules/:id

Update a rule — enable/disable or change threshold/params.

**Request body** (all fields optional):
```json
{
  "enabled": false,
  "min_confidence_threshold": 80,
  "action_params": { "campaign_id": "auto" }
}
```

**Response 200**: Updated rule object (same shape as POST 201).

**Response 404**: Rule not found or belongs to another org.

---

## DELETE /api/v1/automation/rules/:id

Delete an automation rule permanently.

**Response 200**:
```json
{ "deleted": true }
```

**Response 404**: Rule not found or belongs to another org.

---

## GET /api/v1/automation/runs

List automation run logs for the authenticated organization.

**Query params**:
- `limit` (default: 50, max: 100)
- `offset` (default: 0)
- `status`: filter by `success` | `failed` | `skipped`
- `rule_id`: filter by automation rule

**Response 200**:
```json
{
  "runs": [
    {
      "id": "uuid",
      "automation_rule_id": "uuid",
      "rule_name": "Pause on ROAS Drop",
      "decision_id": "uuid",
      "action_template_id": "uuid",
      "action_name": "Pause Campaign (Meta)",
      "status": "success",
      "result_data": { "simulated": true, "campaign_id": "123456" },
      "error_message": null,
      "executed_at": "2026-04-20T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```
