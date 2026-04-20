# Backend API Contracts: Phase 1 — Foundation

Base URL: `NEXT_PUBLIC_BACKEND_URL` (env var)
All `/api/v1/` endpoints require `Authorization: Bearer <clerk_session_token>`.

---

## GET /health

Public endpoint — no authentication required.

**Response 200**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-04-20T08:00:00.000Z"
}
```

---

## POST /api/v1/auth/verify

Verify the caller's token and return their resolved identity. Used by the
frontend to confirm backend connectivity and identity on first dashboard load.

**Request headers**:
```
Authorization: Bearer <clerk_session_token>
```

**Response 200**:
```json
{
  "userId": "user_xxx",
  "orgId": "org_xxx",
  "email": "user@example.com",
  "role": "admin"
}
```

**Response 401** (missing/invalid token):
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

**Response 403** (valid token but no org — should never happen post-Phase 1):
```json
{
  "error": "Forbidden",
  "message": "User has no organization assigned"
}
```

---

## Authentication Middleware Contract

Every `/api/v1/` route (except `/health`) MUST:

1. Extract `Authorization: Bearer <token>` header.
2. Verify the token using Clerk's `verifyToken()` (Backend SDK).
3. Reject with 401 if token is missing, expired, or invalid.
4. Extract `orgId` from the verified token claims.
5. Reject with 403 if `orgId` is absent.
6. Attach `{ userId, orgId }` to the request context for downstream handlers.
7. Log the request outcome to `audit_logs` for sensitive operations.

---

## Webhook: POST /api/webhooks/clerk (Next.js route)

Receives Clerk events. Verified via Svix signature.

**Handled events**:

| Event | Action |
|-------|--------|
| `user.created` | Create Organization → Create user record → Create subscription (trialing) → Log to audit_logs |

**Response 200**: `{ "received": true }`
**Response 400**: `{ "error": "Invalid signature" }` (Svix verification failure)
**Response 500**: `{ "error": "Webhook processing failed" }` (log + alert)

**Security**: The `CLERK_WEBHOOK_SECRET` env var (Svix signing secret) MUST
be set. Requests without valid Svix headers must be rejected before any
business logic executes.
