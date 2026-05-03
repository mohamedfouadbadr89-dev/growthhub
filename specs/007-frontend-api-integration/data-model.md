# Data Model: Frontend → Backend Integration

**Feature**: 007-frontend-api-integration
**Date**: 2026-04-21

---

This feature introduces no new database tables. It connects existing frontend pages to existing backend endpoints. The entities below describe the frontend-side data shapes consumed from the API.

---

## Entity: API Request

**What it is**: A single outbound fetch from the frontend to the backend.

**Attributes**:
- `path` — relative URL path (e.g., `/api/v1/metrics/summary`)
- `token` — Clerk JWT; attached as `Authorization: Bearer <token>`
- `method` — HTTP verb (GET, POST, PUT, PATCH); defaults to GET
- `body` — optional JSON payload for mutations
- `response` — typed JSON payload or `ApiError`

**Validation**:
- Token MUST be present before any request is sent; if absent, abort and show session-expired state
- Base URL MUST be set via `NEXT_PUBLIC_BACKEND_URL` environment variable

---

## Entity: UI State Machine

**What it is**: The four-state display contract every data-fetching page must implement.

**States**:

| State | Trigger | Required UI |
|-------|---------|-------------|
| `loading` | Fetch in flight | Skeleton placeholders (animate-pulse) matching content shape |
| `error` | Fetch threw any error | Error message (status-specific copy) + Retry button |
| `empty` | Fetch succeeded, zero records | Contextual empty state + call-to-action |
| `success` | Fetch succeeded, records present | Full page content rendered from API data |

**State transitions**:
```
idle → loading (on mount / retry)
loading → error (fetch throws)
loading → empty (response ok, length === 0)
loading → success (response ok, length > 0)
error → loading (user clicks Retry)
```

---

## Entity: ApiError

**What it is**: A typed error thrown by `apiClient` when the backend returns a non-2xx status or the network fails.

**Attributes**:
- `status` — HTTP status code (401, 403, 404, 500, 0 for network errors)
- `message` — User-friendly string derived from status code:
  - 401 → "Your session expired — please sign in again"
  - 403 → "Access Denied — contact your administrator"
  - 404 → "Resource not found"
  - 500 → "Server error — try again in a few moments"
  - 503 → "Server error — try again in a few moments"
  - network → "Connection failed — check your internet connection"

---

## Entity: MetricsSummary

**Source**: `GET /api/v1/metrics/summary`

**Shape**:
```typescript
{
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  dateRange: { from: string; to: string };
}
```

---

## Entity: Decision (list item)

**Source**: `GET /api/v1/decisions`

**Shape**:
```typescript
{
  id: string;
  title: string;
  type: string;
  confidence_score: number;
  status: string;
  created_at: string;
}
```

---

## Entity: Integration

**Source**: `GET /api/v1/integrations`

**Shape**:
```typescript
{
  id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync_at: string | null;
  account_name: string | null;
}
```

---

## Entity: ActionTemplate (list item)

**Source**: `GET /api/v1/actions`

**Shape**:
```typescript
{
  id: string;
  name: string;
  description: string;
  platform: string;
  action_type: string;
  parameter_schema: Record<string, unknown>;
}
```

---

## Entity: HistoryRecord

**Source**: `GET /api/v1/history`

**Shape**:
```typescript
{
  id: string;
  decision: string;
  action_taken: string;
  trigger_condition: string;
  data_used: Record<string, unknown>;
  result: 'success' | 'failed' | 'skipped';
  ai_explanation: string;
  confidence_score: number;
  created_at: string;
}
```
