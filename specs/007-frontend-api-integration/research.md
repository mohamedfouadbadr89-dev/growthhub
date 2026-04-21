# Research: Frontend → Backend Integration

**Feature**: 007-frontend-api-integration
**Date**: 2026-04-21

---

## Decision 1: API Client Environment Variable Name

**Decision**: Keep `NEXT_PUBLIC_BACKEND_URL` as the env var name (already used in `lib/api-client.ts` and consumed by existing pages).

**Rationale**: The spec mentions `NEXT_PUBLIC_API_URL` but the codebase already standardized on `NEXT_PUBLIC_BACKEND_URL`. Renaming would require touching every page file. The existing name is equally descriptive.

**Alternatives considered**: Rename to `NEXT_PUBLIC_API_URL` — rejected because it requires a bulk find-and-replace across ~15 page files for no functional gain.

---

## Decision 2: CORS Strategy

**Decision**: Add `hono/cors` middleware to `backend/src/index.ts` before any route handlers, allowing `http://localhost:3000` (dev) with credentials.

**Rationale**: The backend currently has no CORS headers. Browsers will block all cross-origin requests from the Next.js frontend (localhost:3000) to the backend (72.62.131.250:3001). `hono/cors` is the standard Hono middleware for this — zero new dependencies, already available in the Hono package.

**Alternatives considered**:
- Nginx CORS headers — rejected because the backend is on Railway, not behind the Nginx that handles the frontend VPS.
- Per-route CORS — rejected because every route needs it; global middleware is cleaner.

---

## Decision 3: Enhanced Error Messages in api-client.ts

**Decision**: Add status-code-specific error messages directly inside `apiClient` before throwing `ApiError`. The caller still catches `ApiError` and can use `e.status` for further branching.

**Rationale**: Most pages currently display `e.message` verbatim. If the messages are friendly at the source, no page-level changes are needed for error copy. This is a single-file change with maximum impact.

**Error message map**:
- 401 → "Your session expired — please sign in again"
- 403 → "Access Denied — contact your administrator"
- 404 → "Resource not found"
- 500/503 → "Server error — try again in a few moments"
- Network error (no response) → "Connection failed — check your internet connection"

**Alternatives considered**: Per-page error handling — rejected because it requires 15 separate changes and risks inconsistency.

---

## Decision 4: Dashboard Static Data Removal

**Decision**: Remove the `campaigns` hardcoded array from `app/dashboard/overview/page.tsx` and replace with a real API call to `GET /api/v1/campaigns?limit=5&status=active`. Remove `chartBars`/`days` and replace with data from `GET /api/v1/metrics/trend` or derive from the existing metrics summary response.

**Rationale**: The dashboard already calls `/api/v1/metrics/summary` for the KPI tiles. The campaigns table and chart bars are still static. The campaigns endpoint (Phase 6) already returns real data.

**For chart bars**: The metrics/summary endpoint doesn't return trend data. Use `GET /api/v1/metrics` with a `days=7` param if the route supports it, or show a static 7-day placeholder chart if trend data isn't available from the backend (this is acceptable — charts are decorative in this phase; the KPI tiles are the authoritative data).

**Alternatives considered**: Keep static chart — acceptable as a temporary measure but the campaigns table must be live.

---

## Decision 5: Pages Already Connected vs. Needs Work

**Survey results** (from codebase inspection):

| Page | Status | Action Needed |
|------|--------|---------------|
| `app/dashboard/overview/page.tsx` | Partial — KPIs live, campaigns/chart static | Remove hardcoded arrays, fetch campaigns from API |
| `app/decisions/page.tsx` | Connected | Verify 4 UI states present |
| `app/decisions/[id]/page.tsx` | Unknown | Verify API call and all 4 states |
| `app/decisions/alerts/page.tsx` | Unknown | Verify |
| `app/actions/page.tsx` | Connected | Verify 4 UI states |
| `app/actions/[id]/page.tsx` | Unknown | Verify |
| `app/actions/logs/page.tsx` | Unknown | Verify |
| `app/actions/automation/page.tsx` | Unknown | Verify |
| `app/automation/history/page.tsx` | Connected | Verify 4 UI states |
| `app/integrations/page.tsx` | Connected | Verify 4 UI states |
| `app/integrations/connect/page.tsx` | Unknown | Verify |
| `app/campaigns/page.tsx` | Connected (Phase 6) | No action needed |
| `app/campaigns/[id]/page.tsx` | Connected (Phase 6) | No action needed |
| `app/campaigns/create/page.tsx` | Connected (Phase 6) | No action needed |
| `app/creatives/page.tsx` | Phase 5 | Verify connected |
| `app/brand-kit/page.tsx` | Phase 5 | Verify connected |

---

## Decision 6: No New Backend Routes Required

**Decision**: All required backend endpoints already exist from Phases 1–6. This feature is purely frontend-side (plus CORS fix).

**Existing routes confirmed**:
- `GET /api/v1/metrics` — Phase 2/3
- `GET /api/v1/metrics/summary` — Phase 2/3
- `GET /api/v1/decisions` — Phase 3
- `GET /api/v1/decisions/:id` — Phase 3
- `GET /api/v1/alerts` — Phase 3
- `GET /api/v1/actions` — Phase 4
- `GET /api/v1/actions/:id` — Phase 4
- `POST /api/v1/actions/:id/execute` — Phase 4
- `GET /api/v1/actions/logs` — Phase 4 (under `/history` route)
- `GET /api/v1/automation` — Phase 4
- `GET /api/v1/history` — Phase 4
- `GET /api/v1/integrations` — Phase 2
- `POST /api/v1/integrations/connect/:provider` — Phase 2
- `GET /api/v1/brand-kit` — Phase 5
- `PUT /api/v1/brand-kit` — Phase 5
- `POST /api/v1/brand-kit/logo` — Phase 5
- `GET /api/v1/creatives` — Phase 5
- `POST /api/v1/creatives` — Phase 5
- `GET /api/v1/campaigns` — Phase 6
- `GET /api/v1/campaigns/:id` — Phase 6

**Alternatives considered**: None — routes exist.
