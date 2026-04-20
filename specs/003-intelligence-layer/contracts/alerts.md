# API Contract: Alerts

Base path: `/api/v1/alerts`

All endpoints require `Authorization: Bearer <clerk-token>` header. All responses are scoped to the authenticated user's `org_id`.

---

## GET /api/v1/alerts

List alerts for the authenticated org.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | `active` | `active` or `resolved` |
| `type` | string | — | `SPEND_EXCEEDED` or `ROAS_BELOW_THRESHOLD` |
| `platform` | string | — | `meta`, `google`, `shopify` |
| `limit` | integer | `50` | Max records (1–100) |
| `offset` | integer | `0` | Pagination offset |

### Response 200

```json
{
  "alerts": [
    {
      "id": "uuid",
      "type": "ROAS_BELOW_THRESHOLD",
      "severity": "critical",
      "platform": "google",
      "campaign_id": "987654321",
      "breached_value": 0.9,
      "threshold_value": 1.5,
      "status": "active",
      "created_at": "2026-04-20T03:00:00Z"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

---

## PATCH /api/v1/alerts/:id/dismiss

Dismiss (resolve) an active alert.

### Request Body

None required.

### Response 200

```json
{
  "id": "uuid",
  "status": "resolved",
  "resolved_at": "2026-04-20T10:30:00Z"
}
```

### Response 404

```json
{ "error": "Alert not found" }
```

### Response 409 (already resolved)

```json
{ "error": "Alert already resolved" }
```
