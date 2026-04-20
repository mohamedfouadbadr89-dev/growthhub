# Tasks: Phase 1 — Foundation

**Input**: Design documents from `specs/001-phase-1-foundation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1 or US2)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the backend project and directory structure. Frontend already scaffolded — no setup needed there.

- [x] T001 Create `backend/` directory structure: `src/middleware/`, `src/routes/v1/`, `src/lib/`
- [x] T002 Create `backend/package.json` with dependencies: `hono`, `@hono/node-server`, `@clerk/backend`, `@supabase/supabase-js`, `svix`, `@sentry/node`, `dotenv` and dev dependencies: `typescript`, `tsx`, `@types/node`
- [x] T003 [P] Create `backend/tsconfig.json` with `target: ES2022`, `module: Node16`, `moduleResolution: Node16`, `outDir: dist`, `rootDir: src`, `strict: true`
- [x] T004 [P] Create `supabase/migrations/` directory if it does not exist

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story implementation can begin.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create `supabase/migrations/20260420000001_foundation.sql` with all 4 tables (`organizations`, `users`, `subscriptions`, `audit_logs`) plus their RLS policies and indexes exactly as defined in `specs/001-phase-1-foundation/data-model.md`
- [x] T006 Create `backend/src/index.ts`: initialize Hono app, load `dotenv/config`, wire the Sentry error middleware from `src/middleware/error.ts`, register health route at `GET /health`, register the v1 router at `/api/v1`, start `@hono/node-server` on `process.env.PORT ?? 3001`
- [x] T007 [P] Create `backend/src/middleware/error.ts`: global Hono `onError` handler that initializes Sentry (`Sentry.init({ dsn: process.env.SENTRY_DSN })`), calls `Sentry.captureException(err)`, and returns `{ error: 'Internal Server Error' }` with status 500
- [x] T008 [P] Create `backend/src/lib/supabase.ts`: export a `supabaseAdmin` client created with `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` — reads from `process.env`; no frontend exposure
- [x] T009 [P] Create `backend/src/lib/clerk.ts`: export a `clerkClient` instance created with `createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })`

**Checkpoint**: Foundation ready — backend boots, DB migration applied, shared clients available. User story work can now begin.

---

## Phase 3: User Story 1 — New User Sign-Up & Organization Creation (Priority: P1) 🎯 MVP

**Goal**: When a user signs up, a Clerk Organization is automatically created and the full tenant record set (`organizations`, `users`, `subscriptions`, `audit_logs`) is inserted into Supabase.

**Independent Test**: Register a new email on `/sign-up`, verify redirect to `/dashboard/overview`, confirm Supabase Studio shows rows in all 4 tables for the correct `org_id`.

- [x] T010 [US1] Create `app/api/webhooks/clerk/route.ts`: export `POST` handler that (1) reads raw body as `string`, (2) verifies Svix signature using `new Webhook(process.env.CLERK_WEBHOOK_SECRET)` and Svix headers — returns `{ error: 'Invalid signature' }` with status 400 on failure, (3) routes `user.created` event to the org-creation handler, (4) returns `{ received: true }` with status 200 on success, `{ error: 'Webhook processing failed' }` with status 500 on unhandled error
- [x] T011 [US1] In `app/api/webhooks/clerk/route.ts` implement the `handleUserCreated(data)` function: call `clerkClient.organizations.createOrganization({ name: \`\${data.first_name}'s Organization\` })`, call `clerkClient.organizationMemberships.createOrganizationMembership({ organizationId, userId: data.id, role: 'org:admin' })`, then call the backend endpoint `POST /api/v1/internal/provision` with the new `orgId` and user details — or insert directly via `supabaseAdmin` if keeping it frontend-only: insert into `organizations`, `users`, `subscriptions` (status `'trialing'`), `audit_logs` (action `'user.created'`), `audit_logs` (action `'org.created'`)
- [x] T012 [US1] Add atomic error handling to `handleUserCreated`: if Clerk org creation succeeds but Supabase insert fails, call `clerkClient.organizations.deleteOrganization(orgId)` to roll back, then throw so the webhook returns 500 — prevents partial tenant state per edge-case requirement in spec.md

**Checkpoint**: A new sign-up triggers the webhook, creates the Clerk org, inserts all 4 DB rows. Org isolation is in place. User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 — Authenticated Backend Communication (Priority: P2)

**Goal**: The Hono backend verifies Clerk JWTs, rejects unauthenticated calls with 401, scopes all operations to `org_id`, and provides the frontend with a type-safe fetch utility.

**Independent Test**: `curl http://localhost:3001/health` → 200 `{ status: 'ok' }`; `curl http://localhost:3001/api/v1/auth/verify` (no token) → 401; `curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/auth/verify` → 200 with `userId`, `orgId`, `email`, `role`.

- [x] T013 [US2] Create `backend/src/middleware/auth.ts`: export `authMiddleware` Hono middleware that (1) extracts `Authorization: Bearer <token>` header — returns 401 `{ error: 'Unauthorized', message: 'Missing or invalid authentication token' }` if absent, (2) calls `verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })` from `@clerk/backend` — returns 401 on failure, (3) extracts `sub` as `userId` and `org_id` from JWT claims — returns 403 `{ error: 'Forbidden', message: 'User has no organization assigned' }` if `org_id` absent, (4) sets `c.set('userId', userId)` and `c.set('orgId', orgId)` then calls `next()`
- [x] T014 [P] [US2] Create `backend/src/routes/health.ts`: export Hono router with `GET /` handler returning `{ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }` with status 200 — no auth required, mount in `index.ts` at `/health`
- [x] T015 [US2] Create `backend/src/routes/v1/auth.ts`: export Hono router with `POST /verify` handler that reads `userId` and `orgId` from context (set by auth middleware), queries `supabaseAdmin` for the user row matching `clerk_id = userId`, returns `{ userId, orgId, email: user.email, role: user.role }` with status 200
- [x] T016 [US2] Create `backend/src/routes/v1/index.ts`: export Hono v1 router, apply `authMiddleware` to all routes via `router.use('/*', authMiddleware)`, mount `auth.ts` at `/auth`
- [x] T017 [P] [US2] Create `lib/api-client.ts` in the Next.js frontend: export `apiClient` function that accepts `(path: string, options?: RequestInit)`, gets token via `(await import('@clerk/nextjs/server')).auth().then(a => a.getToken())` for server context or accepts a pre-fetched token, constructs full URL from `process.env.NEXT_PUBLIC_BACKEND_URL + path`, adds `Authorization: Bearer <token>` header, merges with `options`, calls `fetch`, throws a typed error if response is not ok, returns parsed JSON

**Checkpoint**: All auth scenarios from spec.md acceptance criteria pass via curl. User Story 2 fully functional and independently testable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Environment configuration, startup validation, and operational readiness.

- [x] T018 [P] Create `backend/.env.example` with all required keys documented: `PORT`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN` (values as `xxx` placeholders — never commit real values)
- [x] T019 [P] Create `.env.local.example` in the Next.js root with all required frontend keys from `specs/001-phase-1-foundation/quickstart.md` (values as `xxx` placeholders)
- [x] T020 Add startup env validation to `backend/src/index.ts`: check `CLERK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are defined before calling `serve()` — throw a descriptive error and exit with code 1 if any are missing
- [x] T021 [P] Add `scripts` to `backend/package.json`: `"dev": "tsx watch src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`
- [ ] T022 Run the four integration test scenarios from `specs/001-phase-1-foundation/quickstart.md` manually (sign-up flow, unauthenticated redirect, token verification, cross-org isolation) and confirm all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion; does NOT depend on US2
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion; does NOT depend on US1
- **Polish (Phase 5)**: Depends on Phase 3 + Phase 4 completion

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2 — independently testable after T012
- **US2 (P2)**: Depends only on Phase 2 — independently testable after T017

### Within Each Phase

- Models/clients before services (T008, T009 before T010)
- Entry point (T006) wires together routes after they exist
- Auth middleware (T013) before routes that require it (T015, T016)

### Parallel Opportunities

- T003, T004 can run in parallel with T002 (Phase 1)
- T007, T008, T009 can run in parallel (Phase 2, all different files)
- T014, T017 can run in parallel (Phase 4, different files)
- T018, T019, T021 can run in parallel (Phase 5)
- US1 and US2 phases can be worked on in parallel by different developers after Phase 2

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T005 (migration) and T006 (index.ts) complete:
# These three can run simultaneously:
Task T007: "Create backend/src/middleware/error.ts"
Task T008: "Create backend/src/lib/supabase.ts"
Task T009: "Create backend/src/lib/clerk.ts"
```

## Parallel Example: Phase 4 (User Story 2)

```bash
# After T013 (auth middleware) is done:
Task T014: "Create backend/src/routes/health.ts"     # parallel
Task T017: "Create lib/api-client.ts"                # parallel
# Then sequentially:
Task T015: "Create backend/src/routes/v1/auth.ts"
Task T016: "Create backend/src/routes/v1/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T009)
3. Complete Phase 3: User Story 1 (T010–T012)
4. **STOP and VALIDATE**: Sign up with a new email, confirm all 4 DB tables populated
5. Demo-ready for sign-up flow

### Incremental Delivery

1. Phase 1 + Phase 2 → Backend boots, DB schema applied
2. Phase 3 (US1) → Sign-up creates org and all DB records (MVP!)
3. Phase 4 (US2) → Backend auth verified, frontend has API client
4. Phase 5 → Env validation, examples, integration test sign-off

---

## Notes

- No tests generated — none requested in spec.md
- [P] tasks = different files, no shared file dependencies within the same phase
- Apply Supabase migration (`supabase db push`) before running any US1 tests
- The existing frontend scaffolding (ClerkProvider, middleware, sign-in/sign-up pages, dashboard layout) is complete — do NOT re-create
- `service_role_key` is backend-only; never pass it to the frontend or Next.js public env vars
- Commit after each phase checkpoint
