# Data Model: Phase 6 — Campaigns

## New Entity: Campaign

Represents an organization's managed campaign record. Separate from `campaign_metrics` (which is sync-read data). One campaign record per unique campaign name + platform per org.

### Table: `campaigns`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `org_id` | TEXT | NOT NULL, FK → organizations.org_id | Tenant isolation |
| `name` | TEXT | NOT NULL | Campaign name (matches campaign_metrics.campaign_name for metric joins) |
| `platform` | TEXT | NOT NULL, CHECK IN ('meta','google') | Ad platform |
| `status` | TEXT | NOT NULL DEFAULT 'draft', CHECK IN ('draft','active','paused','completed','archived') | Campaign lifecycle state |
| `daily_budget` | NUMERIC(14,4) | NULL | Daily spend budget |
| `targeting` | JSONB | NOT NULL DEFAULT '{}' | `{interests: string[], age_min: int, age_max: int, gender: string}` |
| `ad_account_id` | UUID | NULL, FK → ad_accounts(id) ON DELETE SET NULL | Linked platform ad account |
| `platform_campaign_id` | TEXT | NULL | The campaign ID returned by the ad platform after push |
| `ai_suggestions` | JSONB | NULL | Last AI suggestions: `{interests, age_min, age_max, daily_budget_recommendation, generated_at}` |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Unique constraint**: `(org_id, name, platform)` — one record per campaign name + platform per org.

**RLS**: `org_id = auth.jwt()->>'org_id'` for all operations.

**Indexes**:
- `idx_campaigns_org_id` on `(org_id)`
- `idx_campaigns_org_status` on `(org_id, status)`
- `idx_campaigns_org_platform` on `(org_id, platform)`

### Status State Machine

```
draft → active → paused → active  (can cycle)
      ↓         ↓
   archived   completed → archived
```

- `draft`: created, not pushed to platform
- `active`: running on ad platform
- `paused`: temporarily stopped
- `completed`: campaign ended
- `archived`: soft-deleted (hidden from default list view, admin-only)

---

## Existing Entities Used (Read-Only from Phase 6)

### `campaign_metrics` (Phase 2)
Used for: aggregated 30-day metrics on campaign list and detail.
Join key: `campaigns.name = campaign_metrics.campaign_name AND campaigns.platform = LOWER(campaign_metrics.platform)`.

Query pattern (list):
```sql
SELECT campaign_name, platform, 
       SUM(spend) as spend, SUM(revenue) as revenue,
       SUM(conversions) as conversions, SUM(impressions) as impressions,
       CASE WHEN SUM(spend)>0 THEN SUM(revenue)/SUM(spend) ELSE 0 END as roas
FROM campaign_metrics
WHERE org_id = ? AND date >= NOW() - INTERVAL '30 days'
GROUP BY campaign_name, platform
```

### `decisions` (Phase 3)
Used for: AI decisions overlay on Campaign Detail.
Join key: `decisions.campaign_name ILIKE campaigns.name` (case-insensitive).

### `actions_library` (Phase 4)
Used for: push-to-platform via existing `create_campaign` action template.
New seeds added: `create_campaign` for Meta and Google.

### `ad_accounts` (Phase 2)
Used for: linking a campaign to a specific platform account.

---

## New Action Seeds (actions_library extension)

Two new rows added to `actions_library` in migration 007:

| id | platform | action_type | name |
|----|----------|-------------|------|
| `00000000-0000-0000-0000-000000000009` | meta | create_campaign | Create Campaign (Meta) |
| `00000000-0000-0000-0000-000000000010` | google | create_campaign | Create Campaign (Google) |

Parameter schema for `create_campaign`:
```json
{
  "fields": [
    {"name": "campaign_name", "type": "string", "required": true, "label": "Campaign Name"},
    {"name": "daily_budget", "type": "number", "required": true, "label": "Daily Budget ($)"},
    {"name": "targeting", "type": "object", "required": false, "label": "Targeting Parameters"}
  ]
}
```
