# API Contract: Decisions

Base path: `/api/v1/decisions`

All endpoints require `Authorization: Bearer <clerk-token>` header. All responses are scoped to the authenticated user's `org_id`.

---

## GET /api/v1/decisions

List active decisions for the authenticated org, sorted by `priority_score DESC`.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | — | Filter by type: `ROAS_DROP`, `SPEND_SPIKE`, `CONVERSION_DROP`, `SCALING_OPPORTUNITY` |
| `platform` | string | — | Filter by platform: `meta`, `google`, `shopify` |
| `status` | string | `active` | `active` or `stale` |
| `limit` | integer | `20` | Max records (1–100) |
| `offset` | integer | `0` | Pagination offset |

### Response 200

```json
{
  "decisions": [
    {
      "id": "uuid",
      "type": "ROAS_DROP",
      "status": "active",
      "platform": "meta",
      "campaign_id": "12345678",
      "trigger_condition": "ROAS dropped from 4.2x to 2.1x over 3 days",
      "confidence_score": 82,
      "recommended_action": "Pause campaign and review creative assets",
      "priority_score": 73.8,
      "ai_status": "completed",
      "created_at": "2026-04-20T02:15:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

## GET /api/v1/decisions/:id

Get full detail for a single decision.

### Response 200

```json
{
  "id": "uuid",
  "type": "ROAS_DROP",
  "status": "active",
  "platform": "meta",
  "campaign_id": "12345678",
  "trigger_condition": "ROAS dropped from 4.2x to 2.1x over 3 days",
  "data_snapshot": {
    "roas": 2.1,
    "roas_avg_7d": 4.2,
    "spend": 1200.00,
    "conversions": 8,
    "date_range": { "from": "2026-04-13", "to": "2026-04-20" }
  },
  "ai_explanation": "This campaign has experienced a consistent ROAS decline over the past 3 days, falling 50% below its 7-day baseline. The drop correlates with no changes to budget, suggesting creative fatigue or audience saturation.",
  "ai_status": "completed",
  "confidence_score": 82,
  "confidence_rationale": "High confidence — consistent decline over 3 days with stable spend levels",
  "recommended_action": "Pause campaign and refresh creative assets or expand audience targeting",
  "priority_score": 73.8,
  "created_at": "2026-04-20T02:15:00Z"
}
```

### Response 404

```json
{ "error": "Decision not found" }
```

---

## POST /api/v1/decisions/refresh

Manually trigger decision generation for the authenticated org.

### Request Body

None required.

### Response 202

```json
{
  "run_id": "uuid",
  "status": "in_progress",
  "message": "Decision generation started"
}
```

### Response 409 (run already in progress)

```json
{
  "error": "Decision generation already in progress",
  "run_id": "uuid"
}
```

---

## GET /api/v1/decisions/run-status

Check the status of the most recent decision run.

### Response 200

```json
{
  "run_id": "uuid",
  "status": "completed",
  "trigger": "manual",
  "decisions_generated": 3,
  "alerts_generated": 1,
  "started_at": "2026-04-20T02:00:00Z",
  "completed_at": "2026-04-20T02:00:45Z"
}
```

Returns `null` run_id if no runs exist yet.
