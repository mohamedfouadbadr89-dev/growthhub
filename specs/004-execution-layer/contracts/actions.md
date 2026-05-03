# API Contract: Actions

**Base path**: `/api/v1/actions`
**Auth**: Clerk JWT required on all endpoints (Bearer token)

---

## GET /api/v1/actions

List all action templates from the actions_library (system-global, not org-scoped).

**Query params**:
- `platform` (optional): filter by `meta` | `google` | `shopify`
- `action_type` (optional): filter by action_type string

**Response 200**:
```json
{
  "actions": [
    {
      "id": "uuid",
      "platform": "meta",
      "action_type": "pause_campaign",
      "name": "Pause Campaign (Meta)",
      "description": "Pauses an active Meta Ads campaign immediately.",
      "parameter_schema": {
        "fields": [
          { "name": "campaign_id", "type": "string", "required": true, "label": "Campaign ID" },
          { "name": "reason", "type": "string", "required": false, "label": "Reason" }
        ]
      },
      "created_at": "2026-04-20T00:00:00Z"
    }
  ],
  "total": 8
}
```

---

## GET /api/v1/actions/:id

Get a single action template by ID.

**Response 200**:
```json
{
  "id": "uuid",
  "platform": "meta",
  "action_type": "pause_campaign",
  "name": "Pause Campaign (Meta)",
  "description": "Pauses an active Meta Ads campaign immediately.",
  "parameter_schema": { "fields": [...] },
  "created_at": "2026-04-20T00:00:00Z"
}
```

**Response 404**:
```json
{ "error": "Action not found" }
```

---

## POST /api/v1/actions/:id/execute

Execute an action template manually. Optionally link to an existing decision.

**Request body**:
```json
{
  "params": {
    "campaign_id": "123456",
    "reason": "ROAS below threshold"
  },
  "decision_id": "uuid-optional"
}
```

**Response 200**:
```json
{
  "history_id": "uuid",
  "result": "success",
  "result_data": {
    "simulated": true,
    "action_type": "pause_campaign",
    "campaign_id": "123456"
  }
}
```

**Response 422** (platform not connected):
```json
{
  "error": "Platform meta is not connected for this organization",
  "code": "INTEGRATION_NOT_CONNECTED"
}
```

**Response 400** (missing required parameter):
```json
{
  "error": "Missing required parameter: campaign_id",
  "code": "MISSING_PARAMETER"
}
```

**Response 404** (action template not found):
```json
{ "error": "Action not found" }
```
