# FRONTEND → BACKEND INTEGRATION SPEC

**Status:** ❌ NOT CONNECTED — Frontend is static, no API calls

**Priority:** BLOCKING — Must complete before Phase 6

**Timeline:** ~17 hours (realistic estimate)

---

## TASK BREAKDOWN

### Task 1: API Client Setup (1 hour)
**Goal:** Create centralized fetch wrapper with Clerk auth (Client & Server Components)

Files to create:
- `lib/api-client.ts` — API client with JWT header injection
- `lib/api-errors.ts` — Error handling utilities

Requirements:
- ✅ Centralized base URL (`NEXT_PUBLIC_API_URL`)
- ✅ Clerk JWT automatically attached (Client & Server Components)
- ✅ Detailed error handling (401, 403, 500, network, CORS)
- ✅ Typed responses

**Clerk JWT Handling:**
```typescript
// For Client Components
import { useAuth } from '@clerk/nextjs';
const { getToken } = useAuth();
const token = await getToken();

// For Server Components
import { auth } from '@clerk/nextjs/server';
const { getToken } = auth();
const token = await getToken();
```

**Error Handling:**
```
401 → "Your session expired — please sign in again"
403 → "Access Denied — contact admin"
404 → "Resource not found"
500 → "Server error — try again later" + retry button
Network → "Connection failed — check your internet" + retry
CORS → "Configuration error — contact support"
```

**Backend CORS Requirement:**
```typescript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

**Success Criteria:**
- ✅ Backend returns 200 OK on `/api/v1/health`
- ✅ CORS headers present in response
- ✅ JWT present in Authorization header

---

### Task 2: Remove Static Data (2 hours)
**Goal:** Delete all mock data, update components to use API

**Verification:**
```bash
grep -r "mockData\|hardcoded\|fake" app/ lib/
# Should return 0 results
```

---

### Task 3: Connect Priority 1 Pages (10 hours)
**Goal:** Brand Kit, Creatives, Dashboard use real backend data

**Pattern for each page:**
```typescript
// 1. Fetch on mount
useEffect(() => {
  const fetch = async () => {
    try {
      const data = await apiCall('/endpoint');
      setData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetch();
}, []);

// 2. Render 4 states
if (loading) return <LoadingSpinner />;
if (error) return <ErrorAlert message={error} onRetry={refetch} />;
if (!data) return <EmptyState />;
return <PageContent data={data} />;
```

**Pages:**
1. Brand Kit → GET/PUT `/brand-kit`, POST `/brand-kit/logo`
2. Creatives → POST `/creatives`, GET `/creatives`, GET `/generations/:id`
3. Dashboard → GET `/metrics`, GET `/metrics/channels`

---

### Task 4: Implement Error States (3 hours)
**Goal:** Every page has loading/error/empty/success feedback

**User-friendly messages:**
- ✅ "Server error — try again in a few moments"
- ✅ "Your session expired — please sign in again"
- ✅ "Configuration error — contact support"

**Retry buttons on all errors**

---

### Task 5: Verify Network Traffic (1 hour)
**Goal:** Confirm all requests hit backend with proper JWT

**Checklist:**
- ✅ Requests to `72.62.131.250:3001` (not localhost)
- ✅ Status 200 (not errors)
- ✅ Authorization header present
- ✅ CORS headers present
- ✅ No "Failed to fetch" in console

---

### Task 6: Connect Priority 2-4 Pages (4 hours)
**Same pattern as Priority 1**

---

## ENVIRONMENT

### .env.local
```
NEXT_PUBLIC_API_URL=http://72.62.131.250:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---

## IMPORTANT NOTES

### Supabase Vault
- ✅ Backend uses Supabase Vault for API keys
- ❌ Frontend MUST NOT access Vault
- ✅ All sensitive operations in Backend only

### Data Persistence
- ✅ Data loads from backend on every mount
- ✅ Refresh gets fresh data
- ❌ Do NOT use hardcoded/mock data

---

## FINAL SUCCESS CRITERIA

1. ✅ No mock data anywhere
2. ✅ All API calls visible in Network tab (72.62.131.250:3001)
3. ✅ JWT in Authorization headers
4. ✅ Loading/error/empty states on all pages
5. ✅ Data persists on refresh
6. ✅ No console errors
7. ✅ CORS enabled on backend

---

## NEXT STEPS FOR CLAUDE CODE

Read:
- CLAUDE.md (section 13)
- PHASES.md
- CONSTITUTION.md
- FRONTEND_INTEGRATION_SPEC.md

Execute:
1. Create `lib/api-client.ts` with Clerk JWT (Client + Server)
2. Verify Backend CORS enabled
3. Remove all mock data
4. Connect Priority 1 pages
5. Implement error states
6. Test Network tab (72.62.131.250:3001 calls)
7. Continue Priority 2-4
8. Run integration tests

Start now.