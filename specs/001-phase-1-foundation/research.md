# Research: Phase 1 — Foundation

## 1. Backend Framework

**Decision**: Hono on Node.js (Railway)

**Rationale**: Hono is TypeScript-first, ~14KB, runs natively on Node.js/Bun/Deno,
and has built-in middleware ecosystem (bearer auth, CORS, logger, Sentry).
It outperforms Express in benchmarks and has zero config overhead for a
Railway deployment. Express would work but adds unnecessary weight and
requires more manual TypeScript wiring.

**Alternatives considered**:
- Express: Battle-tested but verbose TS setup, heavier, older middleware patterns.
- Fastify: Good but higher learning curve and less ergonomic for rapid iteration.
- Elysia: Bun-only, not suitable for Railway's Node.js environment.

---

## 2. Clerk Organization Auto-Creation

**Decision**: Clerk Webhooks (`user.created` event) + Clerk Backend SDK to
create an Organization and add the user as Admin immediately after sign-up.

**Rationale**: Clerk fires `user.created` webhooks synchronously after the
auth event completes. The webhook handler (Next.js API route) uses the Clerk
Backend SDK to call `organizations.createOrganization()` and
`organizationMemberships.createOrganizationMembership()`. This is the
officially recommended Clerk pattern for enforcing organization membership.

**Webhook endpoint**: `POST /api/webhooks/clerk` (Next.js App Router route)
**Svix signature verification**: Required — use `svix` npm package.

**Alternatives considered**:
- Clerk's built-in org creation flow: Too user-facing (requires extra UI step).
- Server Action on first dashboard load: Race-condition prone; user could land
  on dashboard before org exists.

---

## 3. Supabase RLS with Clerk JWT

**Decision**: Use Supabase's JWT verification with a custom Clerk JWT template
that injects `org_id` as a claim, then reference it in RLS policies via
`auth.jwt()->>'org_id'`.

**Rationale**: Clerk supports custom JWT templates. Adding `org_id` from
`org.id` (Clerk Organization ID) allows Supabase RLS policies to enforce
tenant isolation without a backend round-trip. The `service_role_key`
bypasses RLS — it must only be used on the backend, never the frontend.

**RLS policy pattern**:
```sql
CREATE POLICY "org_isolation" ON <table>
  USING (org_id = auth.jwt()->>'org_id');
```

**Alternatives considered**:
- App-level filtering only (no RLS): Rejected — violates Constitution Principle II.
- Supabase Auth instead of Clerk: Rejected — Clerk is already chosen for
  multi-tenancy and is superior for B2B org management.

---

## 4. Frontend → Backend API Communication

**Decision**: Fetch utility using `NEXT_PUBLIC_BACKEND_URL` env var +
Clerk's `getToken()` method to attach a Bearer token on every request.

**Rationale**: Standard pattern for Next.js + Clerk + external backend.
The Clerk session token is a short-lived JWT — `useAuth().getToken()` in
client components and `auth().getToken()` in server components/actions.
All backend requests include `Authorization: Bearer <token>` header.

**Backend URL env var**: `NEXT_PUBLIC_BACKEND_URL` (Railway URL in production,
`http://localhost:3001` locally).

**Alternatives considered**:
- Next.js API routes as a proxy: Adds latency and complexity; Railway backend
  is the authoritative source per the architecture rules.
- tRPC: Overhead not justified for Phase 1.

---

## 5. Backend Project Structure (Railway)

**Decision**: Separate `backend/` directory in the monorepo root with its
own `package.json`. Railway deploys from `backend/` using a custom root
directory setting.

**Rationale**: Keeps frontend and backend codebases cleanly separated in
the same git repository. Railway supports specifying a custom root directory
per service. Avoids a separate repo for a single-team project at this stage.

**Entry point**: `backend/src/index.ts` → compiled to `backend/dist/index.js`
**Start command** (Railway): `node dist/index.js`

---

## 6. Database Migrations

**Decision**: Plain SQL migration files in `supabase/migrations/` managed
via Supabase CLI (`supabase db push`).

**Rationale**: The Supabase CLI is the standard tool for schema management.
Plain SQL gives full visibility into RLS policies, indexes, and constraints
which is critical for the security audit requirement.

**Alternatives considered**:
- Prisma migrations: Adds ORM overhead; Supabase CLI is sufficient and
  purpose-built.
- Drizzle: Good but adds a dependency layer; plain SQL is more auditable.
