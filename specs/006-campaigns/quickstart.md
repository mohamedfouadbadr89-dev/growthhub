# Quickstart & Integration Scenarios: Phase 6 — Campaigns

## Prerequisites

- Phase 2 complete: at least one Meta or Google integration connected, campaign_metrics synced
- Phase 3 complete: decisions table has rows referencing campaign names
- Phase 4 complete: actions_library seeded (including new create_campaign seeds from migration 007)

---

## Scenario 1: View Campaigns List (P1)

**Setup**: org has synced campaign_metrics for 2+ campaigns.

```
GET /api/v1/campaigns
Authorization: Bearer <clerk-token>
```

**Expected**: 200 with campaigns array, each row has `metrics.spend`, `metrics.roas`, `metrics.conversions`.

**Test: org isolation**:
```
GET /api/v1/campaigns
Authorization: Bearer <token-for-different-org>
```
**Expected**: 200 with empty campaigns array (zero cross-org leakage).

**Test: status filter**:
```
GET /api/v1/campaigns?status=active
```
**Expected**: only campaigns with status="active" returned.

---

## Scenario 2: Campaign Detail with Decisions Overlay (P2)

**Setup**: campaign with `name="Summer ROAS Push"` exists, decision in decisions table has `campaign_name ILIKE 'Summer ROAS Push'`.

```
GET /api/v1/campaigns/<id>
```

**Expected**: response includes `decisions` array with at least 1 item, each with `confidence_score`, `title`, `action_id`.

**Test: no decisions case**:
Create campaign with unique name that no decision references.
```
GET /api/v1/campaigns/<new-id>
```
**Expected**: `"decisions": []`

**Test: status update**:
```
PATCH /api/v1/campaigns/<id>
Body: {"status": "paused"}
```
**Expected**: 200 with updated campaign, status="paused".

---

## Scenario 3: Create Campaign + AI Suggestions + Push (P3)

**Step 1 — Create**:
```
POST /api/v1/campaigns
Body: {"name": "Q3 Growth Push", "platform": "meta", "daily_budget": 500}
```
**Expected**: 201, status="draft", id returned.

**Step 2 — Get AI suggestions** (requires OpenRouter key configured):
```
POST /api/v1/campaigns/<id>/ai-suggestions
Body: {}
```
**Expected**: 200 with suggestions object containing interests, age range, budget recommendation. Campaign record updated with ai_suggestions.

**Test: LTD user without BYOK**:
```
POST /api/v1/campaigns/<id>/ai-suggestions  (LTD org, no BYOK key)
```
**Expected**: 402 `{"error": "...", "code": "BYOK_REQUIRED"}`

**Step 3 — Push to Meta**:
```
POST /api/v1/campaigns/<id>/push
Body: {"platform": "meta"}
```
**Expected**: 202 with `history_id` (decision_history record created, action logged).

**Test: integration not connected**:
Remove Meta integration, retry push.
**Expected**: 422 `{"error": "Meta integration not connected", "code": "INTEGRATION_NOT_CONNECTED"}`

---

## Scenario 4: Pagination + Limits

```
GET /api/v1/campaigns?limit=2&offset=0
GET /api/v1/campaigns?limit=2&offset=2
```
**Expected**: paginated results, `total` field reflects full count.

```
GET /api/v1/campaigns?limit=999
```
**Expected**: clamped to 100 max results.
