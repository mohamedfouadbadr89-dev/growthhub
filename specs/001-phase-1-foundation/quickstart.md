# Quickstart: Phase 1 — Foundation

## Local Development Setup

### Prerequisites
- Node.js 20+
- Supabase CLI (`npm install -g supabase`)
- Clerk account with Organization feature enabled
- A Supabase project (production-isolated)

---

### 1. Frontend (.env.local)

Create `/home/user/growthhub/.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/overview
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/overview

# Clerk Webhooks (Svix signing secret from Clerk dashboard)
CLERK_WEBHOOK_SECRET=whsec_xxx

# Supabase (anon key — public, safe for frontend)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# Backend (Railway URL — localhost for dev)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 2. Backend (backend/.env)

Create `/home/user/growthhub/backend/.env`:

```env
PORT=3001

# Clerk
CLERK_SECRET_KEY=sk_test_xxx
CLERK_PUBLISHABLE_KEY=pk_test_xxx

# Supabase (service_role key — NEVER expose to frontend)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 3. Apply Database Migrations

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. Configure Clerk

- Enable **Organizations** in Clerk dashboard → Settings → Organizations.
- Add webhook endpoint: `https://<your-ngrok-url>/api/webhooks/clerk`
- Subscribe to event: `user.created`
- Copy the **Signing Secret** → set as `CLERK_WEBHOOK_SECRET` in `.env.local`

### 5. Run Frontend

```bash
npm run dev   # starts on http://localhost:3000
```

### 6. Run Backend

```bash
cd backend
npm install
npm run dev   # starts on http://localhost:3001
```

---

## Integration Test Scenarios

### Scenario 1: New user sign-up creates organization

1. Open `http://localhost:3000/sign-up`
2. Register with a new email
3. Verify:
   - Redirected to `/dashboard/overview` ✓
   - `organizations` table has a new row with the correct `org_id` ✓
   - `users` table has the user record ✓
   - `subscriptions` table has `status = 'trialing'` ✓
   - `audit_logs` table has `action = 'user.created'` and `action = 'org.created'` ✓

### Scenario 2: Unauthenticated access is blocked

1. Open `http://localhost:3000/dashboard/overview` without signing in
2. Verify: Redirected to `/sign-in` ✓

### Scenario 3: Backend token verification works

```bash
# Get token from Clerk (or browser devtools → Application → Cookies)
TOKEN="eyJ..."

# Valid request
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/auth/verify
# Expected: 200 with userId, orgId, email, role

# Invalid request
curl http://localhost:3001/api/v1/auth/verify
# Expected: 401

# Health check (no token needed)
curl http://localhost:3001/health
# Expected: 200 { "status": "ok" }
```

### Scenario 4: Cross-org isolation (SC-006)

```bash
TOKEN_ORG_A="eyJ..."
TOKEN_ORG_B="eyJ..."

# This MUST return only Org A's data, never Org B's
curl -H "Authorization: Bearer $TOKEN_ORG_A" \
  http://localhost:3001/api/v1/auth/verify
```
