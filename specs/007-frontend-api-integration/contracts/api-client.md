# UI Contract: API Client & Page State

**Feature**: 007-frontend-api-integration
**Date**: 2026-04-21

---

## Contract 1: `apiClient` Function

**File**: `lib/api-client.ts`

### Signature
```typescript
apiClient<T = unknown>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T>
```

### Behaviour Contract

| Scenario | Expected behaviour |
|----------|--------------------|
| Token present, backend returns 2xx | Resolve with parsed JSON as `T` |
| Token present, backend returns 401 | Throw `ApiError(401, "Your session expired — please sign in again")` |
| Token present, backend returns 403 | Throw `ApiError(403, "Access Denied — contact your administrator")` |
| Token present, backend returns 404 | Throw `ApiError(404, "Resource not found")` |
| Token present, backend returns 500/503 | Throw `ApiError(500, "Server error — try again in a few moments")` |
| Network unreachable (fetch throws) | Throw `ApiError(0, "Connection failed — check your internet connection")` |
| `NEXT_PUBLIC_BACKEND_URL` not set | Throw `Error("NEXT_PUBLIC_BACKEND_URL is not set")` |
| Content-Type not in options | Automatically add `Content-Type: application/json` |
| Authorization header | Always `Bearer <token>` |

### CORS Requirement (Backend)

The backend MUST respond with these headers for requests from `http://localhost:3000`:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Contract 2: Page UI State Machine

Every page that calls `apiClient` MUST implement all four states.

### Loading State
- Rendered immediately on mount while fetch is in flight
- Uses `animate-pulse` skeleton elements that match the shape of the success state
- No spinner-only; skeleton must resemble the actual content layout

### Error State
- Triggered when `apiClient` throws for any reason
- MUST display the `error.message` string (which is already user-friendly from `apiClient`)
- MUST include a "Try Again" / "Retry" button that re-triggers the fetch
- For 401 errors: MUST additionally show a sign-in link

### Empty State
- Triggered when the backend returns a successful response with zero records
- MUST include a contextual call-to-action (e.g., "Connect an integration to see data")
- MUST NOT show a blank white page

### Success State
- Triggered when the backend returns records
- Data is rendered from the API response — no hardcoded fallback values

---

## Contract 3: No Direct Database Access

The frontend MUST NOT:
- Import or call any Supabase client library
- Store or read `SUPABASE_SERVICE_ROLE_KEY`
- Include any database credentials in client-side code or environment variables prefixed with `NEXT_PUBLIC_`

All data access MUST go through `apiClient` → backend API → Supabase (server-side only).

---

## Contract 4: Token Handling

```typescript
// Client Component pattern (ONLY valid approach in browser)
const { getToken } = useAuth();                    // from @clerk/nextjs
const token = await getToken();
if (!token) { /* show session expired state */ return; }
await apiClient('/api/v1/some-endpoint', token);
```

Server Component pattern uses `auth()` from `@clerk/nextjs/server` — but all current pages are Client Components (`"use client"`), so the `useAuth()` pattern applies throughout.

---

## Contract 5: Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | YES | Base URL for all API calls (e.g., `http://72.62.131.250:3001`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | YES | Clerk token issuance |

The `.env.local` file MUST define `NEXT_PUBLIC_BACKEND_URL`. If absent, `apiClient` throws immediately with a descriptive error.
