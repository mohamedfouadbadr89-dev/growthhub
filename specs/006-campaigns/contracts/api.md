# API Contracts: Phase 6 — Campaigns

All endpoints are under `/api/v1/campaigns`. Auth required (Clerk JWT). All queries are scoped to `org_id` from the token.

---

## GET /campaigns

List all campaigns for the org with 30-day aggregated metrics.

**Query params**:
- `status` (optional): `draft|active|paused|completed|archived|all` (default: excludes archived)
- `platform` (optional): `meta|google`
- `limit` (optional): integer 1–100 (default 50)
- `offset` (optional): integer ≥ 0 (default 0)

**Response 200**:
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "name": "Summer ROAS Push",
      "platform": "meta",
      "status": "active",
      "daily_budget": 500.00,
      "ad_account_id": "uuid|null",
      "metrics": {
        "spend": 14200.00,
        "revenue": 62480.00,
        "roas": 4.40,
        "conversions": 312,
        "impressions": 182000
      },
      "created_at": "2026-04-01T00:00:00Z",
      "updated_at": "2026-04-20T00:00:00Z"
    }
  ],
  "total": 12
}
```

---

## POST /campaigns

Create a new campaign record.

**Body**:
```json
{
  "name": "Summer ROAS Push",
  "platform": "meta",
  "daily_budget": 500.00,
  "ad_account_id": "uuid",
  "targeting": {
    "interests": ["fitness", "nutrition"],
    "age_min": 25,
    "age_max": 44,
    "gender": "all"
  }
}
```

**Required fields**: `name`, `platform`

**Response 201**:
```json
{
  "id": "uuid",
  "name": "Summer ROAS Push",
  "platform": "meta",
  "status": "draft",
  "daily_budget": 500.00,
  "targeting": { "interests": ["fitness","nutrition"], "age_min": 25, "age_max": 44, "gender": "all" },
  "ai_suggestions": null,
  "created_at": "2026-04-21T00:00:00Z",
  "updated_at": "2026-04-21T00:00:00Z"
}
```

**Errors**: `400` invalid platform; `409` campaign with same name+platform already exists.

---

## GET /campaigns/:id

Fetch single campaign with 30-day metrics and matched AI decisions.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Summer ROAS Push",
  "platform": "meta",
  "status": "active",
  "daily_budget": 500.00,
  "targeting": { "interests": ["fitness"], "age_min": 25, "age_max": 44, "gender": "all" },
  "ai_suggestions": { "interests": ["fitness","wellness"], "age_min": 25, "age_max": 44, "daily_budget_recommendation": 620, "generated_at": "2026-04-20T10:00:00Z" },
  "metrics": {
    "spend": 14200.00,
    "revenue": 62480.00,
    "roas": 4.40,
    "conversions": 312,
    "impressions": 182000,
    "trend_14d": [
      { "date": "2026-04-07", "spend": 480.00, "roas": 4.1 }
    ]
  },
  "decisions": [
    {
      "id": "uuid",
      "title": "Scale budget — ROAS exceeds 4×",
      "confidence_score": 87,
      "status": "active",
      "action_id": "uuid"
    }
  ],
  "ad_account_id": "uuid|null",
  "created_at": "...",
  "updated_at": "..."
}
```

**Errors**: `404` not found or wrong org.

---

## PATCH /campaigns/:id

Update campaign fields or status.

**Body** (all fields optional):
```json
{
  "status": "paused",
  "daily_budget": 600.00,
  "targeting": { "age_min": 28 },
  "name": "New Name"
}
```

**Validation**: `status` must be valid enum value; `archived` status restricted to admin role.

**Response 200**: Updated campaign object (same shape as GET /campaigns/:id minus decisions/metrics).

**Errors**: `400` invalid fields; `403` non-admin trying to archive; `404` not found.

---

## POST /campaigns/:id/ai-suggestions

Generate AI targeting suggestions for this campaign using org's ROAS history.

**Body**: empty `{}`

**Response 200**:
```json
{
  "suggestions": {
    "interests": ["fitness", "wellness", "nutrition", "activewear"],
    "age_min": 25,
    "age_max": 44,
    "gender": "all",
    "daily_budget_recommendation": 620,
    "rationale": "Based on your top 3 campaigns (avg ROAS 4.2×), fitness/wellness audiences convert best at $18-22 CPA."
  }
}
```

**Errors**: `402` BYOK_REQUIRED (LTD users without configured key); `402` INSUFFICIENT_CREDITS; `404` campaign not found.

---

## POST /campaigns/:id/push

Push campaign to the ad platform via the actions library.

**Body**:
```json
{
  "platform": "meta"
}
```

**Response 202**:
```json
{
  "history_id": "uuid",
  "action_id": "uuid",
  "status": "executed"
}
```

**Errors**: `404` campaign not found; `422` integration not connected for platform; `400` campaign not in draft or paused status.
