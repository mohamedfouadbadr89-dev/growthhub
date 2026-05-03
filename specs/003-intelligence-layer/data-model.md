# Data Model: Intelligence Layer — AI Decision Engine

## New Tables

### `organizations` (ALTER — Phase 1 table)

Add `credits_balance` column to the existing `organizations` table.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `credits_balance` | `INTEGER` | `NOT NULL DEFAULT 1000` | Platform credits for AI usage. `ltd` orgs never consume credits — guard is enforced in business logic and atomic SQL |

---

### `decisions`

AI-generated insight records. Each row represents one detected anomaly or opportunity for a specific campaign at a point in time.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `org_id` | `TEXT` | `NOT NULL REFERENCES organizations(org_id)` | Multi-tenant isolation key |
| `integration_id` | `UUID` | `NOT NULL REFERENCES integrations(id)` | Source integration |
| `ad_account_id` | `UUID` | `REFERENCES ad_accounts(id)` | Nullable — some decisions are account-level |
| `campaign_id` | `TEXT` | `NOT NULL` | Platform campaign identifier (e.g. Meta campaign ID) |
| `platform` | `TEXT` | `NOT NULL CHECK (platform IN ('meta', 'google', 'shopify'))` | |
| `type` | `TEXT` | `NOT NULL CHECK (type IN ('ROAS_DROP', 'SPEND_SPIKE', 'CONVERSION_DROP', 'SCALING_OPPORTUNITY'))` | Anomaly classification |
| `status` | `TEXT` | `NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stale', 'dismissed'))` | `stale` = superseded by newer run |
| `trigger_condition` | `TEXT` | `NOT NULL` | Human-readable description: "ROAS dropped from 4.2x to 2.1x over 3 days" |
| `data_snapshot` | `JSONB` | `NOT NULL` | Metric values at trigger time: `{roas, spend, conversions, roas_avg_7d, date_range}` |
| `ai_explanation` | `TEXT` | | AI-generated explanation. NULL if credits exhausted or AI unavailable |
| `ai_status` | `TEXT` | `NOT NULL DEFAULT 'pending' CHECK (ai_status IN ('pending', 'completed', 'credits_exhausted', 'ai_unavailable'))` | Tracks explanation generation state |
| `confidence_score` | `INTEGER` | `CHECK (confidence_score BETWEEN 0 AND 100)` | Computed heuristic score |
| `confidence_rationale` | `TEXT` | | Plain-English rationale for the score |
| `recommended_action` | `TEXT` | `NOT NULL` | Actionable recommendation text |
| `priority_score` | `NUMERIC(6,2)` | `NOT NULL DEFAULT 0` | `severity_weight × (confidence_score / 100)` — used for sort order |
| `decision_run_id` | `UUID` | `NOT NULL REFERENCES decision_runs(id)` | Which engine run generated this |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Indexes**:
- `idx_decisions_org_id_status` ON `decisions(org_id, status)` WHERE `status = 'active'`
- `idx_decisions_org_id_created` ON `decisions(org_id, created_at DESC)`
- `idx_decisions_campaign_type` ON `decisions(org_id, campaign_id, type)`

**RLS**:
- `FOR ALL USING (org_id = auth.jwt()->>'org_id')`

---

### `alerts`

Threshold-based rule violations. Simpler than decisions — no AI generation required.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `org_id` | `TEXT` | `NOT NULL REFERENCES organizations(org_id)` | |
| `integration_id` | `UUID` | `NOT NULL REFERENCES integrations(id)` | |
| `campaign_id` | `TEXT` | `NOT NULL` | Platform campaign identifier |
| `platform` | `TEXT` | `NOT NULL CHECK (platform IN ('meta', 'google', 'shopify'))` | |
| `type` | `TEXT` | `NOT NULL CHECK (type IN ('SPEND_EXCEEDED', 'ROAS_BELOW_THRESHOLD'))` | |
| `severity` | `TEXT` | `NOT NULL CHECK (severity IN ('warning', 'critical'))` | critical: 2× threshold breach; warning: ≤2× |
| `breached_value` | `NUMERIC(15,4)` | `NOT NULL` | The actual metric value that triggered the alert |
| `threshold_value` | `NUMERIC(15,4)` | `NOT NULL` | The configured threshold that was breached |
| `status` | `TEXT` | `NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved'))` | |
| `resolved_at` | `TIMESTAMPTZ` | | Set when user dismisses |
| `decision_run_id` | `UUID` | `NOT NULL REFERENCES decision_runs(id)` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Indexes**:
- `idx_alerts_org_id_status` ON `alerts(org_id, status)` WHERE `status = 'active'`
- `idx_alerts_org_id_created` ON `alerts(org_id, created_at DESC)`

**RLS**:
- `FOR ALL USING (org_id = auth.jwt()->>'org_id')`

**Deduplication**: Before inserting an alert, check for an existing `active` alert with the same `(org_id, campaign_id, type)` within the last 24 hours. If found, skip — no duplicate alerts for the same breach.

---

### `alert_thresholds`

Per-org configurable thresholds. Rows are optional — system defaults apply when absent.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `org_id` | `TEXT` | `NOT NULL REFERENCES organizations(org_id)` | |
| `type` | `TEXT` | `NOT NULL CHECK (type IN ('SPEND_EXCEEDED', 'ROAS_BELOW_THRESHOLD'))` | |
| `threshold_value` | `NUMERIC(15,4)` | `NOT NULL` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Unique constraint**: `UNIQUE (org_id, type)` — one threshold per type per org.

**System defaults** (applied in backend when no row exists):
- `SPEND_EXCEEDED`: `10000.00` (USD per day)
- `ROAS_BELOW_THRESHOLD`: `1.50`

**RLS**:
- `FOR ALL USING (org_id = auth.jwt()->>'org_id')`

---

### `decision_runs`

Tracks each execution of the decision engine. Used for deduplication and audit.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `org_id` | `TEXT` | `NOT NULL REFERENCES organizations(org_id)` | |
| `trigger` | `TEXT` | `NOT NULL CHECK (trigger IN ('sync_complete', 'manual'))` | What initiated this run |
| `status` | `TEXT` | `NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed'))` | |
| `decisions_generated` | `INTEGER` | `DEFAULT 0` | |
| `alerts_generated` | `INTEGER` | `DEFAULT 0` | |
| `error_message` | `TEXT` | | Set on failure |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `completed_at` | `TIMESTAMPTZ` | | |

**Partial unique index** (prevents concurrent runs):
```sql
CREATE UNIQUE INDEX idx_decision_runs_one_active
  ON decision_runs(org_id)
  WHERE status = 'in_progress';
```

**RLS**:
- `FOR SELECT USING (org_id = auth.jwt()->>'org_id')` (read-only for users)

---

## Relationships

```
organizations (1) ──── (N) decisions
organizations (1) ──── (N) alerts
organizations (1) ──── (N) alert_thresholds
organizations (1) ──── (N) decision_runs

decision_runs  (1) ──── (N) decisions
decision_runs  (1) ──── (N) alerts

integrations   (1) ──── (N) decisions
integrations   (1) ──── (N) alerts
```

## State Transitions

### Decision Status
```
active ──→ stale      (superseded by newer run for same campaign+type)
active ──→ dismissed  (user action — future Phase 4 feature)
```

### Alert Status
```
active ──→ resolved   (user dismisses via PATCH /alerts/:id/dismiss)
```

### Decision Run Status
```
in_progress ──→ completed  (all campaigns processed)
in_progress ──→ failed     (unrecoverable error)
```

### AI Status (on decisions)
```
pending ──→ completed          (AI explanation generated successfully)
pending ──→ credits_exhausted  (subscription org has 0 credits)
pending ──→ ai_unavailable     (OpenRouter unreachable)
```
