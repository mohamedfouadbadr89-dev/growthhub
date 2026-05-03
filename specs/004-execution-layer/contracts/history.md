# API Contract: Decision History

**Base path**: `/api/v1/history`
**Auth**: Clerk JWT required on all endpoints

---

## GET /api/v1/history

List decision history records for the authenticated organization, sorted newest-first.

**Query params**:
- `limit` (default: 50, max: 100)
- `offset` (default: 0)
- `executed_by`: filter by `manual` | `automation`
- `result`: filter by `success` | `failed` | `skipped`
- `decision_id`: filter by linked decision

**Response 200**:
```json
{
  "history": [
    {
      "id": "uuid",
      "decision": "ROAS dropped 35% below 7-day average on Meta campaign 123456",
      "action_taken": "Pause Campaign (Meta) — campaign_id: 123456",
      "trigger_condition": "Rule: Pause on ROAS Drop — ROAS dropped 35% below average",
      "result": "success",
      "confidence_score": 82,
      "executed_by": "automation",
      "decision_id": "uuid",
      "automation_rule_id": "uuid",
      "created_at": "2026-04-20T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

## GET /api/v1/history/:id

Get a single decision history record with full detail including `data_used` snapshot and `ai_explanation`.

**Response 200**:
```json
{
  "id": "uuid",
  "org_id": "org_xxx",
  "decision": "ROAS dropped 35% below 7-day average on Meta campaign 123456",
  "action_taken": "Pause Campaign (Meta) — campaign_id: 123456",
  "trigger_condition": "Rule: Pause on ROAS Drop — ROAS dropped 35% below average",
  "data_used": {
    "roas": 1.2,
    "avg_roas_7d": 3.8,
    "spend": 450.00,
    "conversions": 12,
    "date": "2026-04-19"
  },
  "result": "success",
  "ai_explanation": "The campaign's ROAS of 1.2x is significantly below the 7-day average of 3.8x, indicating audience fatigue or increased competition. Pausing prevents further budget waste.",
  "confidence_score": 82,
  "executed_by": "automation",
  "decision_id": "uuid",
  "automation_rule_id": "uuid",
  "automation_run_id": "uuid",
  "created_at": "2026-04-20T10:00:00Z"
}
```

**Response 404**: Record not found or belongs to another org.
